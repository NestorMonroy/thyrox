#!/usr/bin/env python3
"""Aplica al `exports` de cada paquete las entradas derivadas del plan.

Inserta la clave junto a sus hermanas (orden de insercion del mapa), sin
reordenar el resto: un mapa de `exports` reordenado produce un diff que no
se puede leer, y el orden de insercion es el unico que preserva la forma
que el paquete ya tenia.

Con `--revert` retira exactamente las mismas claves: es el control de
anulacion del cambio, no un segundo mecanismo.
"""
import json
import os
import sys

THYROX = os.environ.get('THYROX_ROOT', '/home/user/thyrox')


def apply_plan(plan, revert=False):
    touched = 0
    for package, additions in sorted(plan.items()):
        path = os.path.join(THYROX, 'src/packages', package, 'package.json')
        with open(path) as handle:
            raw = handle.read()
        manifest = json.loads(raw)
        exports = manifest['exports']
        for key, target in sorted(additions.items()):
            if revert:
                exports.pop(key, None)
            else:
                exports[key] = target
        manifest['exports'] = exports
        with open(path, 'w') as handle:
            handle.write(json.dumps(manifest, indent=2) + '\n')
        touched += len(additions)
        print(f'{package}: {"retiradas" if revert else "anadidas"} {len(additions)} -> {len(exports)} entradas')
    print(f'-- total: {touched}')


if __name__ == '__main__':
    with open(os.path.join(THYROX, sys.argv[1])) as handle:
        apply_plan(json.load(handle), revert='--revert' in sys.argv)
