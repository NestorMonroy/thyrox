#!/usr/bin/env python3
"""Consumidores FUERA del archivo de cada renombre no-local del plan.

El aplicador reescribe un archivo a la vez. Un nombre LOCAL no sale de su
funcion, pero un `def`, una `class`, un parametro o un nombre de modulo si:
si otro archivo lo importa o lo nombra, el renombre lo rompe en silencio.

Se mide ANTES de aplicar, no despues: un ImportError en la suite dice que algo
se rompio, no QUE se rompio ni donde.
"""
import ast
import pathlib
import re
import subprocess
import sys

from paths import reach

ROOT = reach.thyrox_root()
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import rename_identifiers as ri  # noqa: E402

#: Donde puede vivir un consumidor. `_references` y `_archived` quedan fuera:
#: son corpus, no codigo nuestro.
RAICES = ('src', 'tests', 'bin', '.claude/hooks', '.githooks')


def local_names(path):
    """Nombres que SOLO viven dentro de una funcion del archivo."""
    try:
        tree = ast.parse(path.read_text(encoding='utf-8'))
    except (SyntaxError, UnicodeDecodeError):
        return set()
    dentro, fuera = set(), set()
    for fn in ast.walk(tree):
        if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for n in ast.walk(fn):
                if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store):
                    dentro.add(n.id)
                elif isinstance(n, ast.arg):
                    dentro.add(n.arg)
    for node in tree.body:
        for n in ast.walk(node):
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                if n in tree.body:
                    fuera.add(n.name)
            elif isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store):
                if isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign, ast.For, ast.With)):
                    fuera.add(n.id)
    return dentro - fuera


def main():
    por_archivo = {}
    for rel, name in ri.gate_violations():
        por_archivo.setdefault(rel, set()).add(name)
    sospechosos = []
    for rel, names in sorted(por_archivo.items()):
        path = ROOT / rel
        plan, _ = ri.rewrite(path, names, dry=True)
        locales = local_names(path)
        for old in sorted(plan):
            if old not in locales:
                sospechosos.append((rel, old, plan[old]))
    print(f'renombres NO locales a verificar: {len(sospechosos)}')
    rotos = 0
    for rel, old, new in sospechosos:
        out = subprocess.run(
            ['grep', '-rlnw', '--include=*.py', '--include=*.sh', '--', old, *RAICES],
            capture_output=True, text=True, check=False, cwd=str(ROOT))
        otros = [f for f in out.stdout.split() if f != rel]
        if otros:
            rotos += 1
            print(f'  {rel}::{old} -> {new}   tambien en: {" ".join(otros[:4])}'
                  f'{" …" if len(otros) > 4 else ""}')
    print(f'\ncon consumidor fuera del archivo: {rotos} de {len(sospechosos)}')
    print('Metrica: nombre buscado como palabra completa (grep -w) en '
          f'{"/".join(RAICES)}, .py y .sh.')
    print('Ciega a: una cita del nombre dentro de una cadena compuesta '
          '(getattr por f-string), y a un consumidor fuera de esas raices.')


if __name__ == '__main__':
    main()
