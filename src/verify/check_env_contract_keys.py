#!/usr/bin/env python3
"""Toda clave `THYROX_*` que el arbol LEE del entorno esta declarada en `.env.example`.

Por que es un gate y no un parrafo: `.env.example` es la SEGUNDA entrada de la
DEC-04 —la ruta al archivo que declara los valores— y una clave que se lee sin
figurar ahi es una obligacion que el consumidor no puede conocer. Medido al
cablearlo: 27 claves leidas, 9 declaradas, **18 sin declarar**. La prosa no lo
previno; el precedente esta escrito en `gitlink-bump-gate.md`.

Discrimina LEER de ASIGNAR. Una variable de shell asignada sin condicion
—`THYROX_DIR="$(cd … && pwd)"`— no es clave de contrato: la asignacion pisa lo
que el entorno traiga. Contarla publica una obligacion falsa, que es el
sub-patron C de `metrica-decide-la-conclusion.md`.

*Metrica:* nombres con prefijo `THYROX_` leidos del entorno por dos vias — la
directa (`os.environ`, `os.getenv`, `process.env.X`, y en shell `${X}` sin
asignacion incondicional en el mismo archivo) y la indirecta (el nombre vive en
una constante que se pasa a `env_value(name)`, invisible al AST).
*Ciega a:* la clave compuesta en tiempo de ejecucion — la familia
`THYROX_REACH_<CLON>` de `reach.py::env_names(repo)` no existe como literal.
Y la via indirecta es COTA SUPERIOR: un literal en un docstring cuenta.
"""
from __future__ import annotations

import argparse
import ast
import os
import pathlib
import re
import sys

PREFIX = "THYROX_"
TEST_MARKERS = ("__tests__", "/tests/", "test_", ".test.", "-test.")
#: `workbench` y `eventos` son BANCOS DE EVIDENCIA: cada uno es una medicion
#: fechada, no producto. Una sonda de banco que lea una clave propia no crea
#: obligacion para ningun consumidor —el banco ya corrio, y su `.env` de
#: entonces no gobierna a nadie hoy—, asi que exigir declararla haria crecer el
#: contrato con cada medicion. Mismo criterio con que `check_script_naming
#: --identifiers` excluye `eventos/` y `tools/` «por ser evidencia y corpus
#: vendorizado». Medido al añadirlo: la unica clave que caia por esta via era
#: `THYROX_BOARD_DIR`, leida solo por la sonda de un volcado de tablero.
SKIP_DIRS = ("/node_modules/", "/.git/", "/_archived/", "/_references/",
             "/.claude/workbench/", "/.claude/eventos/")

#: Segunda via: el nombre vive en una CONSTANTE y se pasa a `env_value(name)`.
#: Un nombre que TERMINA en `_` no es una clave: es el PREFIJO de una familia
#: que se compone en tiempo de ejecucion —`THYROX_WORKBENCH_` + el clon—, y
#: nadie exporta esa variable. Sin esta exclusion el gate exigia declarar
#: `THYROX_WORKBENCH_` en `.env.example`, que seria documentar una obligacion
#: que no existe. La familia se documenta como familia, con su regla de
#: composicion, igual que `THYROX_REACH_<CLON>`.
NAME_CONSTANT = re.compile(r"""["'](THYROX_[A-Z0-9_]*[A-Z0-9])["']""")
TS_MEMBER = re.compile(r"process\.env\.([A-Za-z_][A-Za-z0-9_]*)")
TS_INDEX = re.compile(r"""process\.env\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\]""")
SH_READ = re.compile(r"\$\{(" + PREFIX + r"[A-Z0-9_]+)[:}\-]|\$(" + PREFIX + r"[A-Z0-9_]+)\b")
SH_ASSIGN = re.compile(r"^\s*(?:export\s+)?(" + PREFIX + r"[A-Z0-9_]+)=", re.M)


def is_test(path: pathlib.Path) -> bool:
    return any(marker in str(path) for marker in TEST_MARKERS)


def python_reads(source: str) -> set[str]:
    found: set[str] = set()
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return found
    for node in ast.walk(tree):
        if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Constant):
            if isinstance(node.slice.value, str):
                found.add(node.slice.value)
        elif isinstance(node, ast.Call):
            if getattr(node.func, "attr", None) in {"get", "getenv", "setdefault"} and node.args:
                first = node.args[0]
                if isinstance(first, ast.Constant) and isinstance(first.value, str):
                    found.add(first.value)
        elif isinstance(node, ast.Compare) and isinstance(node.left, ast.Constant):
            if isinstance(node.left.value, str):
                found.add(node.left.value)
    return {name for name in found if name.startswith(PREFIX)}


def typescript_reads(source: str) -> set[str]:
    found = set(TS_MEMBER.findall(source)) | set(TS_INDEX.findall(source))
    return {name for name in found if name.startswith(PREFIX)}


def shell_reads(source: str) -> set[str]:
    """Leidas menos asignadas SIN condicion en el mismo archivo."""
    read = {lhs or rhs for lhs, rhs in SH_READ.findall(source)}
    assigned = set(SH_ASSIGN.findall(source))
    conditional = {
        name
        for name in assigned
        if re.search(r"^\s*(?:export\s+)?" + name + r"=\"?\$\{" + name + r"[:}\-]", source, re.M)
    }
    return read - (assigned - conditional)


def declared_keys(env_example: pathlib.Path) -> set[str]:
    keys = set()
    for line in env_example.read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith("#") or "=" not in stripped:
            continue
        keys.add(stripped.split("=", 1)[0].strip())
    return keys


def read_keys(root: pathlib.Path) -> dict[str, list[str]]:
    """Las claves leidas del entorno, con el primer archivo que las lee."""
    by_key: dict[str, list[str]] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or any(skip in str(path) for skip in SKIP_DIRS):
            continue
        if is_test(path):
            continue
        suffix = path.suffix
        if suffix == ".py":
            reader = python_reads
        elif suffix in {".ts", ".tsx", ".js", ".mjs"}:
            reader = typescript_reads
        elif suffix == ".sh":
            reader = shell_reads
        else:
            continue
        try:
            source = path.read_text(errors="ignore")
        except OSError:
            continue
        keys = reader(source)
        if suffix != ".sh":
            keys = keys | set(NAME_CONSTANT.findall(source))
        for key in keys:
            by_key.setdefault(key, []).append(str(path.relative_to(root)))
    return by_key


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=os.environ.get("THYROX_ROOT", "."))
    parser.add_argument("--env-example", default=None)
    parser.add_argument("--strict", action="store_true", help="exit 1 si falta alguna")
    args = parser.parse_args(argv)

    root = pathlib.Path(args.root).resolve()
    env_example = pathlib.Path(args.env_example) if args.env_example else root / ".env.example"
    if not env_example.is_file():
        print(f"ERROR: no existe {env_example}. NO se emite conteo: un 0 aqui "
              f"no distinguiria «no falta ninguna» de «no pude medir».", file=sys.stderr)
        return 2

    by_key = read_keys(root)
    declared = declared_keys(env_example)
    missing = sorted(key for key in by_key if key not in declared)

    print(f"claves leidas del entorno: {len(by_key)} | declaradas: {len(declared)} "
          f"| sin declarar: {len(missing)}")
    for key in missing:
        print(f"  SIN DECLARAR  {key}  <- {by_key[key][0]}")
    if missing and args.strict:
        print(f"\nCada una es una obligacion que el consumidor no puede conocer. "
              f"Declararla en {env_example.name} con el comentario que la explique.",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
