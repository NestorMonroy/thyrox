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
import os
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


def _resolve_relative(consumer: Path, spec: str) -> set[Path]:
    """Las rutas a las que puede apuntar un import relativo de TypeScript:
    el `.js` del especificador se escribe por el `.ts` que compila a él."""
    base = (consumer.parent / spec).resolve()
    stem = base.with_suffix("") if base.suffix in (".js", ".mjs", ".ts", ".tsx") else base
    return {stem.with_suffix(ext) for ext in (".ts", ".tsx", ".mts")} | \
        {stem / f"index{ext}" for ext in (".ts", ".tsx")}


def imported_copies(cwd: Path, consumers: set[str], applied: set[str], dest: Path) -> set[str]:
    """Las copias aplicadas que algún consumidor afectado importa. Un import
    relativo se resuelve a su ruta; uno de paquete se casa por el nombre del
    módulo, salvo `index`, que nombra a medio árbol y culparía a inocentes."""
    paths = {(dest / rel).resolve(): rel for rel in applied}
    stems: dict[str, set[str]] = {}
    for rel in applied:
        stem = Path(rel).with_suffix("").name
        if stem != "index":
            stems.setdefault(stem, set()).add(rel)
    found: set[str] = set()
    for consumer in consumers:
        path = cwd / consumer
        if not path.is_file():
            continue
        for spec in _IMPORT.findall(path.read_text(errors="ignore")):
            if spec.startswith("."):
                found |= {paths[target] for target in _resolve_relative(path, spec) if target in paths}
                continue
            name = Path(spec).name
            for suffix in (".js", ".ts", ".tsx", ".mjs"):
                name = name.removesuffix(suffix)
            found |= stems.get(name, set())
    return found


def _package_map(dest: Path) -> dict[str, tuple[Path, dict]]:
    """Nombre de paquete -> (su directorio, su mapa `exports`), sin seguir
    enlaces y podando `node_modules`: el árbol tiene cientos de enlaces de
    workspace y un recorrido que los siga no termina (h-thyrox-29)."""
    found: dict[str, tuple[Path, dict]] = {}
    for root, dirs, files in os.walk(dest, followlinks=False):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "dist")]
        if "package.json" in files:
            try:
                data = json.loads((Path(root) / "package.json").read_text())
            except (OSError, ValueError):
                continue
            exports = data.get("exports")
            if isinstance(data.get("name"), str):
                found[data["name"]] = (Path(root).resolve(), exports if isinstance(exports, dict) else {})
    return found


def _resolve_package(spec: str, packages: dict[str, tuple[Path, dict]]) -> set[Path]:
    """Un import de paquete del workspace resuelto por su `exports`; sin
    entrada, por las dos formas de directorio que el árbol usa."""
    parts = spec.split("/")
    name = "/".join(parts[:2]) if spec.startswith("@") else parts[0]
    if name not in packages:
        return set()
    root, exports = packages[name]
    sub = spec[len(name):].lstrip("/")
    key = "./" + sub if sub else "."
    for candidate in (key, key.removesuffix(".js"), key + ".js"):
        target = exports.get(candidate)
        if isinstance(target, dict):
            target = target.get("default") or target.get("import")
        if isinstance(target, str):
            return {(root / target).resolve()}
    if not sub:
        return set()
    return set().union(*(_resolve_relative(base / "x", "./" + sub) for base in (root / "src", root)))


def reachable_copies(cwd: Path, consumers: set[str], applied: set[str], dest: Path,
                     depth: int = 6, package_root: Path | None = None) -> set[str]:
    """Las copias aplicadas a las que un consumidor afectado llega por la
    cadena de imports, hasta `depth` saltos. Un tipo que se rompe en una copia
    llega re-exportado por módulos que no se copiaron: el primer salto no lo
    ve, y sin esto la bisección recorre el lote entero. `package_root` acota
    dónde se buscan los `package.json` cuando `dest` es una raíz más ancha."""
    packages = _package_map(package_root or dest)
    paths = {(dest / rel).resolve(): rel for rel in applied}
    frontier = {(cwd / c).resolve() for c in consumers}
    seen = set(frontier)
    found: set[str] = set()
    for _ in range(depth):
        following: set[Path] = set()
        for path in frontier:
            if not path.is_file():
                continue
            for spec in _IMPORT.findall(path.read_text(errors="ignore")):
                targets = _resolve_relative(path, spec) if spec.startswith(".") else _resolve_package(spec, packages)
                for target in targets:
                    if target in paths:
                        found.add(paths[target])
                    if target not in seen and target.is_file():
                        seen.add(target)
                        following.add(target)
        frontier = following
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

        # Primero el grafo de imports, por rondas: el consumidor que recibe un
        # diagnóstico nuevo casi siempre importa la copia que lo rompió. Cada
        # ronda culpa a las importadas y se queda con el retiro si lo nuevo
        # baja, aunque no llegue a cero; sólo el residuo que ningún import
        # explica se biseca. Antes era todo o nada: un solo culpable
        # transitivo tiraba la atribución entera y se bisecaba el lote.
        while new and applied:
            _, by_file = _new_diagnostics(before_lines, after)
            suspects = imported_copies(cwd, set(by_file), applied, dest)
            if not suspects:
                break
            trial = applied - suspects
            lines = measure(tree, trial, f"imports-{runs}")
            remaining = _new_diagnostics(before_lines, lines)[0]
            if len(remaining) >= len(new):
                break
            for rel in suspects:
                outcomes[rel] = "rejected-consumer"
            applied, after, new = trial, lines, remaining
        # El residuo que ningún import directo explica se biseca, pero sólo
        # entre las copias a las que sus consumidores llegan por la cadena de
        # imports: en lote-06, 3 diagnósticos residuales hicieron bisecar 70
        # copias a ~31 s por pasada. Si la bisección acotada no reproduce lo
        # nuevo por sí sola, se cae al lote entero.
        while new and applied:
            _, by_file = _new_diagnostics(before_lines, after)
            pool = reachable_copies(cwd, set(by_file), applied, dest) or applied
            blamed = culprits(sorted(pool)) if pool != applied else []
            blamed = blamed or culprits(sorted(applied)) or sorted(applied)
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
