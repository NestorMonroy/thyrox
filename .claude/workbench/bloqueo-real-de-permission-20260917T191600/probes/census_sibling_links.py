#!/usr/bin/env python3
"""Censa los hermanos de workspace que un paquete IMPORTA y no ENLAZA.

Generaliza a los 29 paquetes el cuarto eje que la sonda hermana descubrio
midiendo `permission`: un `exports` bien declarado en el destino no sirve de
nada si el importador no tiene al destino en su `node_modules`. El fallo es
`Cannot find module` en tiempo de ejecucion, no un error de manifiesto, asi
que ningun gate de `exports` lo ve.

Metrica: literales `@thyrox/<paquete>` en el codigo de cada paquete, contra
         las entradas de su `node_modules/@thyrox/`.
Ciega a: un import que componga el specifier en tiempo de ejecucion; a si el
         hermano enlazado exporta de verdad lo que le piden; y a las
         dependencias externas (react y companía), que son otro eje —el de
         TASK-THYROX-0098.
"""
import pathlib
import subprocess
import sys

PACKAGES = pathlib.Path(__file__).resolve().parents[4] / 'src' / 'packages'
SCOPE = '@thyrox/'


def imported_siblings(package: pathlib.Path) -> set[str]:
    root = package / 'src' if (package / 'src').exists() else package
    out = subprocess.run(
        ['grep', '-rhoE', r'@thyrox/[a-z-]+', str(root),
         '--include=*.ts', '--include=*.tsx'],
        capture_output=True, text=True).stdout
    return {s[len(SCOPE):] for s in out.split()} - {package.name}


def linked_siblings(package: pathlib.Path) -> set[str]:
    home = package / 'node_modules' / SCOPE.rstrip('/')
    return {p.name for p in home.iterdir()} if home.exists() else set()


def main() -> int:
    rows = []
    for manifest in sorted(PACKAGES.glob('*/package.json')):
        package = manifest.parent
        if package.name == 'node_modules':
            continue
        imported = imported_siblings(package)
        if not imported:
            continue
        missing = sorted(imported - linked_siblings(package))
        if missing:
            rows.append((package.name, len(imported), missing))
    rows.sort(key=lambda row: -len(row[2]))
    print(f'{"paquete":<20} {"importa":>7}  sin enlazar')
    for name, total, missing in rows:
        print(f'{name:<20} {total:>7}  {" ".join(missing)}')
    print(f'\npaquetes con hermanos sin enlazar: {len(rows)} de '
          f'{len(list(PACKAGES.glob("*/package.json"))) - 1}')
    print(f'aristas de enlace ausentes: {sum(len(r[2]) for r in rows)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
