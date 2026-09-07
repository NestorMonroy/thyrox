#!/usr/bin/env python3
"""Mide las rutas de thyrox que un consumidor INVOCA contra la superficie declarada.

``exports.test.ts`` gobierna la mitad TypeScript y es ciego a ésta por
construcción: ``exports`` es resolución de Node, y quien hace
``python3 "$THYROX_ROOT/src/..."`` no lo consulta. Sin este gate, la superficie
que ``paths/surface.py`` declara sería una lista que nadie contrasta — el mapa
inerte que ``#143`` ya cerró para la otra mitad.

Qué mide
--------

Las citas **ejecutables** de los consumidores: una ruta bajo ``$THYROX_ROOT``
(o ``$THYROX_RAIZ``) asignada a una variable, o declarada como ``OWNER_MODULE``
de un stub. Una ruta que sólo se **nombra** en prosa no cuenta: un ``.rst`` que
enumera los gates los cita sin invocarlos, y contarlos publicaría como
superficie casi todo ``src/`` (medido: 200+ rutas contra 17 declaradas).

Sin consumidor alcanzable REHÚSA con exit 2. Un 0 sin consumidores no
distinguiría «ningún consumidor sale de la superficie» de «no medí ninguno».
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from paths import reach, surface  # noqa: E402

EXIT_OK, EXIT_VIOLATIONS, EXIT_GUARD = 0, 1, 2

#: Asignación a variable: `ALGO="$THYROX_ROOT/src/…"`.
ASSIGNMENT = re.compile(
    r'^\s*[A-Za-z_][A-Za-z_0-9]*="\$\{?(?:THYROX_ROOT|THYROX_RAIZ)\}?/(src/[^"]+)"',
    re.MULTILINE)
#: Stub que delega: `OWNER_MODULE="src/…"`.
OWNER_MODULE = re.compile(r'''OWNER_MODULE=["'](src/[^"']+)["']''')
#: Bootstrap del localizador, que nombra el marcador por su ruta.
MARKER = re.compile(r'''["'](src/paths/reach\.py)["']''')

PATTERNS = (ASSIGNMENT, OWNER_MODULE, MARKER)


def consumer_roots() -> list[pathlib.Path]:
    """Los clones que consumen thyrox. Declarados, nunca inventados."""
    declared = os.environ.get('THYROX_SURFACE_CONSUMERS')
    if declared:
        return [pathlib.Path(p) for p in declared.split(os.pathsep) if p]
    return [pathlib.Path(p) for p in reach.roots().values()]


def citations(root: pathlib.Path) -> dict[str, list[str]]:
    """Ruta citada -> archivos que la citan, dentro de `<root>/.claude`."""
    found: dict[str, list[str]] = {}
    base = root / '.claude'
    if not base.is_dir():
        return found
    for path in base.rglob('*'):
        if not path.is_file() or path.suffix not in ('.sh', '.py'):
            continue
        if 'eventos' in path.parts:          # banco de evidencia, no consumidor
            continue
        try:
            text = path.read_text(errors='ignore')
        except OSError:
            continue
        for pattern in PATTERNS:
            for cited in pattern.findall(text):
                found.setdefault(cited, []).append(str(path))
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si algún consumidor sale de la superficie')
    parser.add_argument('--quiet', action='store_true', help='sólo el conteo')
    args = parser.parse_args()

    roots = [r for r in consumer_roots() if (r / '.claude').is_dir()]
    if not roots:
        print('ERROR — ningún consumidor con .claude alcanzable. NO se emite un '
              'conteo: un 0 aquí no distinguiría «nadie sale de la superficie» '
              'de «no medí a nadie».', file=sys.stderr)
        return EXIT_GUARD

    todas: dict[str, list[str]] = {}
    for root in roots:
        for cited, files in citations(root).items():
            todas.setdefault(cited, []).extend(files)

    if not todas:
        print(f'ERROR — 0 citas ejecutables en {len(roots)} consumidor(es). El '
              'patrón no reconoce ninguna forma viva; NO se emite un veredicto.',
              file=sys.stderr)
        return EXIT_GUARD

    fuera = {c: f for c, f in sorted(todas.items()) if not surface.is_public(c)}

    if args.quiet:
        print(len(fuera))
        return EXIT_VIOLATIONS if (args.strict and fuera) else EXIT_OK

    for cited, files in fuera.items():
        print(f'FUERA DE SUPERFICIE  {cited}')
        for f in sorted(set(files)):
            print(f'    lo invoca: {f}')

    declarado = len(surface.PUBLIC_PATHS) + len(surface.PUBLIC_DIRS)
    print(f'{len(fuera)} cita(s) fuera de la superficie declarada  '
          f'(alcance medido: {len(todas)} ruta(s) invocada(s) por '
          f'{len(roots)} consumidor(es); {declarado} entrada(s) declarada(s))')
    print('Métrica: rutas bajo $THYROX_ROOT asignadas a variable, OWNER_MODULE '
          'de un stub, y el marcador del bootstrap.')
    print('Ciega a: la invocación construida en tiempo de ejecución (una ruta '
          'compuesta pieza a pieza), a la cita que sólo NOMBRA en prosa —que es '
          'deliberado— y a un consumidor fuera de los clones que `reach` declara.')
    return EXIT_VIOLATIONS if (args.strict and fuera) else EXIT_OK


if __name__ == '__main__':
    raise SystemExit(main())
