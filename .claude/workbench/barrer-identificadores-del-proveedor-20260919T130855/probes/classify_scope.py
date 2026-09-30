#!/usr/bin/env python3
"""Clasifica por AMBITO los identificadores en espanol que el gate publica.

El eje NO es la palabra sino el alcance del simbolo: un nombre LOCAL a una
funcion se renombra dentro del archivo y nada externo lo ve; un `def`, una
`class`, un parametro, un nombre de modulo o una clave de dict cruzan
archivos y exigen medir consumidores antes de tocarlos.

La poblacion se DERIVA de la salida del propio gate — no de un glob propio —
para que el universo del triaje sea exactamente el que el gate mide.
"""
import ast
import collections
import re
import subprocess

from paths import reach

ROOT = reach.thyrox_root()
LINE = re.compile(r'^  (?P<path>[^:]+\.py):(?P<line>\d+)  (?P<name>\S+)  ->')


def gate_violations():
    """(ruta relativa, linea, nombre) por infractor que el gate publica."""
    out = subprocess.run(
        ['bash', str(ROOT / 'bin' / 'check_script_naming'), '--identifiers', str(ROOT)],
        capture_output=True, text=True, check=False, cwd=str(ROOT))
    for raw in out.stdout.splitlines():
        m = LINE.match(raw)
        if m:
            yield m['path'], int(m['line']), m['name']


def scopes(path):
    """{(nombre, linea): clase} para todo simbolo declarado del archivo."""
    try:
        tree = ast.parse(path.read_text(encoding='utf-8'))
    except (SyntaxError, UnicodeDecodeError):
        return {}
    local = set()
    for fn in ast.walk(tree):
        if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for n in ast.walk(fn):
                if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store):
                    local.add((n.id, n.lineno))
    out = {}
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            out[(node.name, node.lineno)] = 'def'
        elif isinstance(node, ast.ClassDef):
            out[(node.name, node.lineno)] = 'class'
        elif isinstance(node, ast.arg):
            out[(node.arg, node.lineno)] = 'arg'
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            out.setdefault((node.id, node.lineno),
                           'local' if (node.id, node.lineno) in local else 'module')
        elif isinstance(node, ast.Dict):
            for key in node.keys:
                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                    out.setdefault((key.value, key.lineno), 'dictkey')
    return out


def main():
    cache, por_clase, detalle = {}, collections.Counter(), collections.defaultdict(list)
    archivos = set()
    for rel, line, name in gate_violations():
        archivos.add(rel)
        if rel not in cache:
            cache[rel] = scopes(ROOT / rel)
        kind = cache[rel].get((name, line), 'sin-clasificar')
        por_clase[kind] += 1
        detalle[kind].append(f'{rel}:{line}  {name}')
    total = sum(por_clase.values())
    print(f'archivos con infractor: {len(archivos)}')
    for k, n in por_clase.most_common():
        print(f'  {k:15s} {n:4d}  ({100 * n / total:.1f} %)')
    print(f'  {"TOTAL":15s} {total:4d}')
    print('\nMetrica: infractores que el gate --identifiers publica, clasificados '
          'por el nodo AST que los declara.')
    print('Ciega a: un local que otro archivo alcance por `from x import *`, y a '
          'un nombre declarado dos veces en la misma linea.')
    for k in ('def', 'class', 'arg', 'module', 'dictkey', 'sin-clasificar'):
        if detalle[k]:
            print(f'\n== {k} ({len(detalle[k])}) ==')
            for ln in sorted(detalle[k]):
                print('  ' + ln)


if __name__ == '__main__':
    main()
