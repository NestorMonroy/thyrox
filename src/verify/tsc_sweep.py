#!/usr/bin/env python3
"""Barrido proactivo de un patrón aprendido — el paso 4 del plan v2
(«aplicar cada patrón de MEMORIA a TODO el código restante, sin esperar a
que el verificador señale cada instancia»).

Un patrón vive en `patterns.jsonl`, junto al registro y las reflexiones
(`tsc_reflect`), con los campos del formato del plan: `name`, `signal`
(regex sobre la clave `archivo: TSxxxx: mensaje` que lo delata), `fix`
(el arreglo en lenguaje), y — cuando el arreglo es mecánico — `site` y
`replace`, una regla de sustitución por línea (`re.M`). `include` acota las
rutas; `exclude` y `applied` sacan archivos del barrido.

El barrido NO escribe en el árbol ni decide nada: produce candidatas con el
formato de `agent_proposal` (bases = texto actual, edición mínima por
archivo) y las juzga `tsc_zero_step`. Por defecto sale UNA propuesta con
todos los sitios, para la política neta; `--split` da una por archivo, para
cuando el grupo no pasa y hay que ver cuál sitio lo hunde. Los objetivos son
globales — los diagnósticos que casan la señal en todo el log — porque el
error de un alias suele vivir en sus consumidores, no en el archivo del
alias.

Rehúsa sin sitios o sin objetivos: un barrido sin señal que lo respalde no
aporta (lección del paso 13 del lazo, en `reflections.jsonl`).

Uso::

    bin/tsc_sweep add-pattern --run R --name N --signal RE --fix TEXTO \\
        [--site RE --replace T] [--include RE] [--exclude archivo ...]

Sin `--site`/`--replace` el patrón es NO mecánico: queda en la memoria y
`agent_proposal` nombra los archivos donde su señal sigue viva, pero
`propose` lo rehúsa.
    bin/tsc_sweep propose --run R --name N --before-log L [--split] > candidatas.jsonl
    bin/tsc_sweep applied --run R --name N archivo...
    bin/tsc_sweep exclude --run R --name N --reason TEXTO archivo...
    bin/tsc_sweep close --run R --name N --reason TEXTO
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from verify.agent_proposal import _minimal_edit
from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key

PATTERNS = "patterns.jsonl"
SUFFIXES = (".ts", ".tsx")


def load_patterns(run: Path) -> dict[str, dict]:
    path = run / PATTERNS
    rows = [json.loads(l) for l in path.read_text().splitlines() if l.strip()] if path.exists() else []
    return {row["name"]: row for row in rows}


def _save(run: Path, patterns: dict[str, dict]) -> None:
    (run / PATTERNS).write_text("".join(json.dumps(p, ensure_ascii=False) + "\n"
                                        for p in patterns.values()))


def add_pattern(run: Path, pattern: dict) -> dict:
    for key in ("name", "signal", "fix"):
        if not str(pattern.get(key, "")).strip():
            raise ValueError(f"un patrón sin `{key}` no enseña nada")
    # `site` y `replace` van juntos o no van: sin ellos el patrón es memoria
    # de un arreglo que exige juicio — se recuerda y se señala, no se barre.
    mechanical = [bool(str(pattern.get(k, "")).strip()) for k in ("site", "replace")]
    if mechanical[0] != mechanical[1]:
        raise ValueError("`site` y `replace` van juntos: uno sin el otro no es una sustitución")
    re.compile(pattern["signal"])
    if mechanical[0]:
        re.compile(pattern["site"], re.M)
    patterns = load_patterns(run)
    previous = patterns.get(pattern["name"], {})
    row = {"include": "", "exclude": [], "site": "", "replace": "", **pattern,
           "applied": previous.get("applied", [])}
    patterns[row["name"]] = row
    _save(run, patterns)
    return row


def mark_applied(run: Path, name: str, files: list[str]) -> dict:
    patterns = load_patterns(run)
    if name not in patterns:
        raise ValueError(f"no hay patrón {name!r} en {run / PATTERNS}")
    patterns[name]["applied"] = sorted(set(patterns[name]["applied"]) | set(files))
    _save(run, patterns)
    return patterns[name]


def _require_reason(reason: str) -> str:
    if not reason.strip():
        raise ValueError("una salida del gate 4 sin razón escrita no se admite")
    return reason.strip()


def exclude_files(run: Path, name: str, files: list[str], reason: str) -> dict:
    """Saca archivos de un patrón porque su señal casa ahí por OTRA causa."""
    reason = _require_reason(reason)
    patterns = load_patterns(run)
    if name not in patterns:
        raise ValueError(f"no hay patrón {name!r} en {run / PATTERNS}")
    row = patterns[name]
    row["exclude"] = sorted(set(row.get("exclude", [])) | set(files))
    row["exclude_reasons"] = {**row.get("exclude_reasons", {}), **{f: reason for f in files}}
    _save(run, patterns)
    return row


def close_pattern(run: Path, name: str, reason: str) -> dict:
    """Cierra un patrón: su señal ya no pide aplicación (agotado, o demasiado
    amplia para seguir usándola como gate)."""
    reason = _require_reason(reason)
    patterns = load_patterns(run)
    if name not in patterns:
        raise ValueError(f"no hay patrón {name!r} en {run / PATTERNS}")
    patterns[name].update(status="closed", closed_reason=reason)
    _save(run, patterns)
    return patterns[name]


def sites(root: Path, pattern: dict) -> list[tuple[str, str]]:
    """(archivo, texto sustituido) de cada archivo seguido donde la regla cambia algo."""
    listed = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True,
                            check=True).stdout.splitlines()
    include = re.compile(pattern.get("include") or "")
    skip = set(pattern.get("exclude", [])) | set(pattern.get("applied", []))
    site = re.compile(pattern["site"], re.M)
    found = []
    for file in sorted(listed):
        if not file.endswith(SUFFIXES) or file in skip or not include.search(file):
            continue
        text = (root / file).read_text()
        new = site.sub(pattern["replace"], text)
        if new != text:
            found.append((file, new))
    return found


def _targets(pattern: dict, before_lines: list[str]) -> list[str]:
    signal = re.compile(pattern["signal"])
    keys = {diagnostic_key(m) for m in map(DIAGNOSTIC.match, before_lines) if m}
    return sorted(k for k in keys if signal.search(k))


def propose(root: Path, pattern: dict, before_lines: list[str], *, split: bool) -> list[dict]:
    if not pattern.get("site"):
        raise ValueError(f"el patrón {pattern['name']!r} no es mecánico: su arreglo exige juicio "
                         "y se aplica con agent_proposal, que lo señala por archivo")
    found = sites(root, pattern)
    if not found:
        raise ValueError(f"el patrón {pattern['name']!r} no tiene sitios pendientes")
    targets = _targets(pattern, before_lines)
    if not targets:
        raise ValueError(f"la señal de {pattern['name']!r} no nombra ningún diagnóstico del log")
    name = f"pattern:{pattern['name']}"

    def row(group: list[tuple[str, str]], pid: str) -> dict:
        files = [f for f, _ in group]
        bases = {f: hashlib.sha256((root / f).read_text().encode()).hexdigest() for f in files}
        edits = [_minimal_edit(f, (root / f).read_text(), new) for f, new in group]
        return {"proposal_id": pid, "proposer": name, "targets": targets, "files": files,
                "edits": edits, "bases": bases}

    if split:
        return [row([site], f"{name}:{site[0]}") for site in found]
    return [row(found, name)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    add_p = sub.add_parser("add-pattern")
    add_p.add_argument("--run", type=Path, required=True)
    for key in ("name", "signal", "fix"):
        add_p.add_argument(f"--{key}", required=True)
    add_p.add_argument("--site", default="")
    add_p.add_argument("--replace", default="")
    add_p.add_argument("--include", default="")
    add_p.add_argument("--exclude", nargs="*", default=[])
    prop_p = sub.add_parser("propose")
    prop_p.add_argument("--run", type=Path, required=True)
    prop_p.add_argument("--root", type=Path, default=Path("."))
    prop_p.add_argument("--name", required=True)
    prop_p.add_argument("--before-log", type=Path, required=True)
    prop_p.add_argument("--split", action="store_true")
    app_p = sub.add_parser("applied")
    app_p.add_argument("--run", type=Path, required=True)
    app_p.add_argument("--name", required=True)
    app_p.add_argument("files", nargs="+")
    exc_p = sub.add_parser("exclude", help="saca archivos del patrón: su señal casa ahí por otra causa")
    exc_p.add_argument("--run", type=Path, required=True)
    exc_p.add_argument("--name", required=True)
    exc_p.add_argument("--reason", required=True)
    exc_p.add_argument("files", nargs="+")
    close_p = sub.add_parser("close", help="cierra un patrón: su señal ya no pide aplicación")
    close_p.add_argument("--run", type=Path, required=True)
    close_p.add_argument("--name", required=True)
    close_p.add_argument("--reason", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "add-pattern":
            row = add_pattern(args.run, {k: getattr(args, k) for k in
                                         ("name", "signal", "site", "replace", "fix", "include", "exclude")})
            print(json.dumps(row, ensure_ascii=False))
        elif args.command == "propose":
            patterns = load_patterns(args.run)
            if args.name not in patterns:
                raise ValueError(f"no hay patrón {args.name!r}")
            for row in propose(args.root, patterns[args.name],
                               args.before_log.read_text().splitlines(), split=args.split):
                print(json.dumps(row, ensure_ascii=False))
        elif args.command == "applied":
            print(json.dumps(mark_applied(args.run, args.name, args.files), ensure_ascii=False))
        elif args.command == "exclude":
            print(json.dumps(exclude_files(args.run, args.name, args.files, args.reason),
                             ensure_ascii=False))
        else:
            print(json.dumps(close_pattern(args.run, args.name, args.reason), ensure_ascii=False))
    except (OSError, ValueError, KeyError, re.error, json.JSONDecodeError,
            subprocess.CalledProcessError) as error:
        print(f"tsc_sweep: REHÚSA — {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
