#!/usr/bin/env python3
"""Deriva las entradas de `exports` que declaran un `.tsx`, tomando su FORMA
de la fuente (ccnmt) y verificando que el archivo destino exista aqui.

La fuente declara cada `.tsx` con una clave explicita `./<ruta>.js` cuyo
destino es `./<ruta>.tsx`. Un wildcard `./*.js -> ./*.ts` no lo alcanza: la
extension del destino es literal, no un comodin.

Metrica: entradas de `exports` de la fuente cuyo destino termina en `.tsx`,
cruzadas con (a) si la clave ya esta en NUESTRO mapa y (b) si el archivo
destino existe en nuestro arbol.
Ciega a: un `.tsx` que la fuente tampoco declare; y a un destino que exista
con el mismo nombre y otro contenido.
"""
import json
import os
import sys

THYROX = os.environ.get('THYROX_ROOT', '/home/user/thyrox')
SOURCE = '/home/user/claude-code-nestor-monroy-tools/packages'


def entries(manifest_path):
    with open(manifest_path) as handle:
        return json.load(handle).get('exports') or {}


def main(packages):
    plan = {}
    for package in packages:
        source_manifest = os.path.join(SOURCE, package, 'package.json')
        mine_manifest = os.path.join(THYROX, 'src/packages', package, 'package.json')
        if not os.path.exists(source_manifest) or not os.path.exists(mine_manifest):
            print(f'{package}\tSIN-MANIFIESTO', file=sys.stderr)
            continue
        source, mine = entries(source_manifest), entries(mine_manifest)
        missing = {}
        for key, target in source.items():
            if not isinstance(target, str) or not target.endswith('.tsx'):
                continue
            if key in mine:
                continue
            on_disk = os.path.join(THYROX, 'src/packages', package, target)
            state = 'PRESENTE' if os.path.exists(on_disk) else 'AUSENTE'
            print(f'{package}\t{key}\t{target}\t{state}')
            if state == 'PRESENTE':
                missing[key] = target
        if missing:
            plan[package] = missing
    with open(os.path.join(THYROX, os.environ['PLAN_OUT']), 'w') as handle:
        json.dump(plan, handle, indent=2, sort_keys=True)
    print(f'-- paquetes con faltantes: {len(plan)}  entradas: {sum(len(v) for v in plan.values())}',
          file=sys.stderr)


if __name__ == '__main__':
    main(sys.argv[1:])
