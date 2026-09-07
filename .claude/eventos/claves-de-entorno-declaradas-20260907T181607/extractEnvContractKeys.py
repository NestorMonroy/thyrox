#!/usr/bin/env python3
"""Las claves `THYROX_*` que el arbol LEE del entorno, contra las que declara.

Discrimina LEER de ASIGNAR, que es la distincion que el instrumento anterior no
hacia. Una variable de shell asignada sin condicion —`THYROX_DIR="$(cd ...)"`—
no es una clave de contrato: su valor lo fija el guion, y exportarla desde el
entorno no cambia nada. Contarla como clave publica una obligacion falsa sobre
el consumidor, que es el sub-patron C aplicado al propio censo: se midio el
significante (el nombre aparece) y se concluyo sobre el mecanismo (se lee).
"""
from __future__ import annotations

import ast
import json
import os
import pathlib
import re
import sys

PREFIX = "THYROX_"
TEST_MARKERS = ("__tests__", "/tests/", "test_", ".test.", "-test.")

# Segunda via de lectura: el nombre vive en una CONSTANTE y se pasa a
# `env_value(name)` / `os.environ.get(name)`. El AST ve la variable, no la
# cadena, asi que sin este arco el censo declara «no se lee» sobre 6 claves que
# si se leen — la ceguera que el instrumento anterior tenia y no declaraba.
NAME_CONSTANT = re.compile(r"""["'](THYROX_[A-Z0-9_]+)["']""")

TS_MEMBER = re.compile(r"process\.env\.([A-Za-z_][A-Za-z0-9_]*)")
TS_INDEX = re.compile(r"""process\.env\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\]""")
SH_READ = re.compile(r"\$\{(" + PREFIX + r"[A-Z0-9_]+)[:}\-]|\$(" + PREFIX + r"[A-Z0-9_]+)\b")
SH_ASSIGN = re.compile(r"^\s*(?:export\s+)?(" + PREFIX + r"[A-Z0-9_]+)=", re.M)


def is_test(path: pathlib.Path) -> bool:
    text = str(path)
    return any(marker in text for marker in TEST_MARKERS)


def python_reads(source: str) -> set[str]:
    """`os.environ[...]`, `.get(...)`, `os.getenv(...)` y `... in os.environ`."""
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
            name = getattr(node.func, "attr", None)
            if name in {"get", "getenv", "setdefault"} and node.args:
                first = node.args[0]
                if isinstance(first, ast.Constant) and isinstance(first.value, str):
                    found.add(first.value)
        elif isinstance(node, ast.Compare):
            left = node.left
            if isinstance(left, ast.Constant) and isinstance(left.value, str):
                found.add(left.value)
    return {name for name in found if name.startswith(PREFIX)}


def typescript_reads(source: str) -> set[str]:
    found = set(TS_MEMBER.findall(source)) | set(TS_INDEX.findall(source))
    return {name for name in found if name.startswith(PREFIX)}


def shell_reads(source: str) -> set[str]:
    """Leidas menos asignadas SIN condicion en el mismo archivo."""
    read: set[str] = set()
    for lhs, rhs in SH_READ.findall(source):
        read.add(lhs or rhs)
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


def main() -> int:
    root = pathlib.Path(os.environ.get("THYROX_ROOT", ".")).resolve()
    by_key: dict[str, list[str]] = {}
    fixtures: dict[str, list[str]] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or "/node_modules/" in str(path) or "/.git/" in str(path):
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
        target = fixtures if is_test(path) else by_key
        keys = reader(source)
        if suffix in {".py", ".ts", ".tsx", ".js", ".mjs"}:
            keys = keys | set(NAME_CONSTANT.findall(source))
        for key in keys:
            target.setdefault(key, []).append(str(path.relative_to(root)))

    declared = declared_keys(root / ".env.example")
    contract = sorted(by_key)
    missing = [key for key in contract if key not in declared]
    unused = sorted(key for key in declared if key not in by_key)

    print(f"claves leidas del entorno (sin fixtures): {len(contract)}")
    print(f"declaradas en .env.example:               {len(declared)}")
    print(f"leidas y NO declaradas:                   {len(missing)}")
    for key in missing:
        print(f"  FALTA  {key}  <- {by_key[key][0]}")
    print(f"declaradas y no leidas por este censo:    {len(unused)}")
    for key in unused:
        print(f"  SOLO-DECLARADA  {key}")
    print(f"solo en fixtures de prueba:               {len(fixtures)}")
    for key in sorted(fixtures):
        print(f"  FIXTURE  {key}  <- {fixtures[key][0]}")
    print(json.dumps({"contract": contract, "missing": missing}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
