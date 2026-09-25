#!/usr/bin/env python3
"""Un paso de copia desde la fuente vendorizada: sobrescribir archivos del
árbol con su par de la fuente, quedándose sólo con las copias que no aportan
ningún diagnóstico nuevo.

Es hermano de `tsc_zero_step.py` y comparte su esqueleto —aplicar un lote,
UNA pasada de `tsc`, revertir lo que no se sostiene, bisecar lo que no se
puede atribuir— pero no su criterio. Aquel acepta una propuesta cuando bajan
sus objetivos; una copia no persigue objetivos sino fidelidad a la fuente, así
que aquí se acepta cuando **no aporta nada nuevo**: ni en su archivo ni en
sus consumidores. Una copia que además quita diagnósticos previos también se
acepta; la que revierte una corrección del árbol vuelve a traer su
diagnóstico, y se rechaza.

Veredictos por archivo, añadidos al registro:
  identical          el destino ya es la fuente (con el alias reescrito)
  copied             la copia se queda
  rejected-own       la copia trae diagnósticos nuevos a su propio archivo
  rejected-consumer  la copia rompe otro archivo; la bisección la señaló

Ciega a: una regresión de conducta que tsc no ve. El paso mide tipos, no
comportamiento; las pruebas del paquete se corren aparte sobre lo copiado.

Salidas del CLI: 0 algo decidido · 3 nada pendiente · 2 medición rota.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC
from verify.batch_verification import _new_diagnostics


def _count(lines: list[str]) -> int:
    return sum(1 for line in lines if DIAGNOSTIC.match(line))


def run_tsc(cwd: Path, command: list[str], log: Path) -> list[str]:
    """Una pasada del verificador. Salir distinto de 0 sin diagnósticos
    legibles no es un cero: es una medición rota."""
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(result.stdout + result.stderr)
    lines = (result.stdout + result.stderr).splitlines()
    if result.returncode != 0 and _count(lines) == 0:
        raise RuntimeError(f"tsc salió {result.returncode} sin diagnósticos legibles: medición rota ({log})")
    return lines


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def source_text(source: Path, rel: str, rewrites: list[tuple[str, str]]) -> str:
    text = (source / rel).read_text()
    for old, new in rewrites:
        text = text.replace(old, new)
    return text


def decided_files(ledger: Path) -> set[str]:
    if not ledger.exists():
        return set()
    return {json.loads(line)["file"] for line in ledger.read_text().splitlines() if line.strip()}


_IMPORT = re.compile(r"""(?:from|import)\s*\(?\s*['"]([^'"]+)['"]""")


def imported_copies(cwd: Path, consumers: set[str], applied: set[str], dest: Path) -> set[str]:
    """Las copias aplicadas que algún consumidor afectado importa, por el nombre
    del módulo (sin extensión): basta para culpar, no para resolver rutas."""
    stems = {}
    for rel in applied:
        stems.setdefault(Path(rel).with_suffix("").name, set()).add(rel)
    found: set[str] = set()
    for consumer in consumers:
        path = cwd / consumer
        if not path.is_file():
            continue
        for spec in _IMPORT.findall(path.read_text(errors="ignore")):
            name = Path(spec).name
            for suffix in (".js", ".ts", ".tsx", ".mjs"):
                name = name.removesuffix(suffix)
            found |= stems.get(name, set())
    return found


class _Tree:
    """Las copias aplicadas sobre el destino, con los originales para revertir."""

    def __init__(self, dest: Path, copies: dict[str, str]):
        self.dest = dest
        self.copies = copies
        self.originals = {rel: (dest / rel).read_text() for rel in copies}

    def show(self, applied: set[str]) -> None:
        for rel in self.copies:
            (self.dest / rel).write_text(self.copies[rel] if rel in applied else self.originals[rel])


def run_copy_step(dest: Path, source: Path, files: list[str], before_lines: list[str],
                  command: list[str], ledger: Path, bench: Path,
                  rewrites: list[tuple[str, str]], batch: int, cwd: Path | None = None) -> dict:
    cwd = cwd or dest
    bench.mkdir(parents=True, exist_ok=True)
    done = decided_files(ledger)
    pending = [rel for rel in files if rel not in done][:batch]
    outcomes: dict[str, str] = {}
    copies: dict[str, str] = {}
    for rel in pending:
        text = source_text(source, rel, rewrites)
        if (dest / rel).read_text() == text:
            outcomes[rel] = "identical"
        else:
            copies[rel] = text
    runs = 0

    def display(rel: str) -> str:
        return str((dest / rel).resolve().relative_to(cwd.resolve()))

    def measure(tree: _Tree, applied: set[str], name: str) -> list[str]:
        nonlocal runs
        tree.show(applied)
        runs += 1
        return run_tsc(cwd, command, bench / f"{name}.log")

    final = list(before_lines)
    if copies:
        tree = _Tree(dest, copies)
        applied = set(copies)
        after = measure(tree, applied, "batch")
        new, by_file = _new_diagnostics(before_lines, after)
        own = {rel for rel in applied if by_file.get(display(rel))}
        for rel in own:
            outcomes[rel] = "rejected-own"
        applied -= own
        if own:
            after = measure(tree, applied, "confirm")
            new, _ = _new_diagnostics(before_lines, after)

        def culprits(group: list[str]) -> list[str]:
            lines = measure(tree, set(group), f"bisect-{runs}")
            if not _new_diagnostics(before_lines, lines)[0]:
                return []
            if len(group) == 1:
                return group
            half = len(group) // 2
            return culprits(group[:half]) + culprits(group[half:])

        # Primero el grafo de imports: el consumidor que recibe un diagnóstico
        # nuevo casi siempre importa la copia que lo rompió. Culparla directo
        # ahorra la bisección; si no basta, se biseca lo que queda.
        if new and applied:
            _, by_file = _new_diagnostics(before_lines, after)
            suspects = imported_copies(cwd, set(by_file), applied, dest)
            if suspects:
                trial = applied - suspects
                lines = measure(tree, trial, "imports")
                if not _new_diagnostics(before_lines, lines)[0]:
                    for rel in suspects:
                        outcomes[rel] = "rejected-consumer"
                    applied, after, new = trial, lines, []
        while new and applied:
            blamed = culprits(sorted(applied)) or sorted(applied)
            for rel in blamed:
                outcomes[rel] = "rejected-consumer"
            applied -= set(blamed)
            after = measure(tree, applied, "confirm")
            new, _ = _new_diagnostics(before_lines, after)
        tree.show(applied)
        for rel in applied:
            outcomes[rel] = "copied"
        final = after if copies and applied else measure(tree, applied, "final-empty") if copies else final
    (bench / "final.log").write_text("\n".join(final) + ("\n" if final else ""))
    with ledger.open("a") as out:
        for rel in pending:
            out.write(json.dumps({"file": rel, "outcome": outcomes[rel],
                                  "sha_after": _sha((dest / rel).read_text())}) + "\n")
    report = {"decided": pending, "outcomes": outcomes, "tsc_runs": runs,
              "total_before": _count(before_lines), "total_final": _count(final),
              "files_kept": sorted(rel for rel, o in outcomes.items() if o == "copied")}
    (bench / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    return report


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--" not in argv:
        print("source_copy_step: falta `--` antes del comando de tsc", file=sys.stderr)
        return 2
    cut = argv.index("--")
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--dest", type=Path, required=True, help="raíz del destino, relativa a --root")
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--files", type=Path, required=True, help="una ruta relativa por línea")
    parser.add_argument("--before-log", type=Path, required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--bench", type=Path, required=True)
    parser.add_argument("--rewrite", action="append", default=[], help="VIEJO=NUEVO")
    parser.add_argument("--batch", type=int, default=50)
    args = parser.parse_args(argv[:cut])
    rewrites = [tuple(r.split("=", 1)) for r in args.rewrite]
    files = [line.strip() for line in args.files.read_text().splitlines() if line.strip()]
    try:
        report = run_copy_step(args.root / args.dest, args.source, files,
                               args.before_log.read_text().splitlines(), argv[cut + 1:], args.ledger,
                               args.bench, rewrites, args.batch, cwd=args.root)
    except RuntimeError as error:
        print(f"source_copy_step: {error}", file=sys.stderr)
        return 2
    print(json.dumps({k: report[k] for k in ("total_before", "total_final", "tsc_runs")}
                     | {"counts": {o: list(report["outcomes"].values()).count(o)
                                   for o in sorted(set(report["outcomes"].values()))}}))
    return 0 if report["decided"] else 3


if __name__ == "__main__":
    raise SystemExit(main())
