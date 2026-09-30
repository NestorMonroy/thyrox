#!/usr/bin/env python3
"""Censo: nombre CARGADO en el cuerpo del modulo antes de que un import lo ligue.

Metrica: por archivo, todo `ast.Name` en contexto Load que aparezca en el
cuerpo del modulo (fuera de def/class) en una linea ANTERIOR a la del
`import`/`from ... import` que liga ese nombre.
Ciega a: nombres ligados por asignacion o por `for`/`with`; builtins; y el
uso dentro de un cuerpo de funcion, que se ejecuta despues del modulo entero.
"""
from __future__ import annotations

import ast
import builtins
import pathlib
import sys

BUILTINS = set(dir(builtins))


def import_bindings(tree: ast.Module) -> dict[str, int]:
    out: dict[str, int] = {}
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                name = (alias.asname or alias.name).split('.')[0]
                if name not in out:
                    out[name] = node.lineno
    return out


def other_bindings(tree: ast.Module) -> set[str]:
    """Nombres que el modulo liga por algo que no es un import."""
    out: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            out.add(node.name)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            out.add(node.id)
        elif isinstance(node, (ast.Global, ast.Nonlocal)):
            out.update(node.names)
        elif isinstance(node, ast.ExceptHandler) and node.name:
            out.add(node.name)
    return out


def offences(path: pathlib.Path) -> list[tuple[str, int, int]]:
    tree = ast.parse(path.read_text())
    imports = import_bindings(tree)
    stored = other_bindings(tree)
    found: dict[str, tuple[int, int]] = {}
    for stmt in tree.body:
        if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        for sub in ast.walk(stmt):
            if not (isinstance(sub, ast.Name) and isinstance(sub.ctx, ast.Load)):
                continue
            name = sub.id
            if name in BUILTINS or name in stored or name not in imports:
                continue
            if sub.lineno < imports[name] and name not in found:
                found[name] = (sub.lineno, imports[name])
    return [(n, u, i) for n, (u, i) in sorted(found.items(), key=lambda kv: kv[1][0])]


def main(roots: list[str]) -> int:
    total = 0
    for root in roots:
        for path in sorted(pathlib.Path(root).rglob('*.py')):
            try:
                rows = offences(path)
            except SyntaxError:
                continue
            for name, use, imp in rows:
                print(f"{path}  {name}  uso:{use} import:{imp}")
                total += 1
    print(f"-- {total} uso(s) antes de su import")
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:] or ['src', 'tests']))
