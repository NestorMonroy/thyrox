#!/usr/bin/env python3
"""Quien IMPORTA cada nombre del plan — por AST, no por `grep -w`.

La version anterior de esta sonda buscaba la palabra en todo el arbol y
declaraba «171 de 295 con consumidor fuera». Esa cifra era correcta como
conteo de literales y **falsa como conclusion**: `nombre` aparece como local
en cien archivos sin que ninguno se refiera a ESTE simbolo. Medir el
significante y concluir sobre el significado es el sub-patron C de
`metrica-decide-la-conclusion.md`.

Lo que rompe un renombre es una REFERENCIA, y una referencia cruza el modulo
por dos vias, ambas visibles en el AST del consumidor:

1. `from <modulo> import <nombre>`
2. `import <modulo>` mas un `<alias>.<nombre>`

Un nombre que nadie importa se puede renombrar dentro de su archivo aunque
otros cien lo usen como local suyo.
"""
import ast
import collections
import pathlib
import sys

from paths import reach

ROOT = reach.thyrox_root()
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import rename_identifiers as ri  # noqa: E402

RAICES = ('src', 'tests', 'bin', '.claude/hooks')


def module_path(rel: str) -> str:
    """`src/paths/reach.py` -> `paths.reach` (y tambien `reach`, por PYTHONPATH)."""
    p = rel[:-3].replace('/', '.')
    return p[4:] if p.startswith('src.') else p


def imported_from(tree):
    """{(modulo, nombre)} y {(alias_de_modulo, atributo)} que el archivo usa."""
    directos, modulos = set(), {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            for a in node.names:
                directos.add((node.module, a.name))
        elif isinstance(node, ast.Import):
            for a in node.names:
                modulos[a.asname or a.name.split('.')[0]] = a.name
    atributos = set()
    for node in ast.walk(tree):
        if (isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name)
                and node.value.id in modulos):
            atributos.add((modulos[node.value.id], node.attr))
    return directos | atributos


def main():
    por_archivo = {}
    for rel, name in ri.gate_violations():
        por_archivo.setdefault(rel, set()).add(name)
    plan_global = {}
    for rel, names in por_archivo.items():
        plan, _ = ri.rewrite(ROOT / rel, names, dry=True)
        for old, new in plan.items():
            plan_global.setdefault(module_path(rel), {})[old] = new

    consumidores = collections.defaultdict(list)
    medidos = 0
    for raiz in RAICES:
        for py in (ROOT / raiz).rglob('*.py'):
            rel = py.relative_to(ROOT).as_posix()
            try:
                tree = ast.parse(py.read_text(encoding='utf-8'))
            except (SyntaxError, UnicodeDecodeError, OSError):
                continue
            medidos += 1
            refs = imported_from(tree)
            for mod, nombre in refs:
                for declarante, plan in plan_global.items():
                    if nombre in plan and (mod == declarante
                                           or declarante.endswith('.' + mod)
                                           or mod.endswith('.' + declarante)):
                        if rel != declarante.replace('.', '/') + '.py':
                            consumidores[(declarante, nombre)].append(rel)

    total = sum(len(p) for p in plan_global.values())
    print(f'renombres en el plan: {total}')
    print(f'archivos .py medidos como posibles consumidores: {medidos}')
    print(f'nombres con consumidor por IMPORT fuera de su archivo: {len(consumidores)}')
    for (mod, nombre), donde in sorted(consumidores.items()):
        print(f'  {mod}::{nombre}  <- {" ".join(sorted(set(donde))[:5])}')
    print('\nMetrica: `from M import N` y `M.N` tras `import M`, por AST, en '
          f'{"/".join(RAICES)}.')
    print('Ciega a: `import *`, un `getattr(mod, "nombre")` por cadena, y un '
          'consumidor en .sh o .ts que invoque el simbolo por texto.')


if __name__ == '__main__':
    main()
