#!/usr/bin/env python3
"""Un solo punto de entrada a los gates de porte — el `build_migration_report`.

Los gates existen y funcionan; lo que no existía era **una llamada** que los
compusiera. Siete comandos sueltos en el paso 6 de ``migration-porter`` son
siete cosas que el agente tiene que recordar, y una capacidad que hay que
recordar es capacidad muerta — el defecto que ``flow-selection-agile.md``
describe.

Este guion NO reimplementa ningún gate ni redeclara las raíces de la
referencia: **delega**. Las raíces salen de ``api: scripts/reference_roots.py``,
que es su única fuente; una segunda copia sería la deuda que
``calibration-verified-numbers.md`` prohíbe, y falla en silencio (apuntada a
una raíz vacía, publica ``0 incumplidores`` y parece sana — H-API-335).

Cada gate se corre con **el alcance más estrecho que acepte**, y el reporte
declara cuál fue. Un gate que barrió el árbol entero y uno acotado a un addon
publican cifras que no se pueden comparar.
"""

import argparse
import os
import pathlib
import subprocess
import sys

# Sobreescribible por entorno para poder ejercitar el guard contra una raíz
# ausente: un control que no se puede hacer fallar no discrimina nada.
API_ROOT = pathlib.Path(os.environ.get('KAUPAMEX_API_ROOT', '/home/user/kaupamex-api'))

# Cada fila: (nombre, argumentos fijos, cómo acota). El tercer campo dice qué
# bandera acepta el gate para reducir su universo — None significa que barre
# todo el árbol y su cifra no es comparable con la de un gate acotado.
GATES = [
    ('check_porte_completo', [], 'addon'),
    ('check_model_class_attributes', [], 'addon'),
    ('check_symbol_home', ['--quiet'], None),
    ('check_mirrored_roots', ['--quiet'], 'paths'),
    ('check_fk_naming', [], None),
    ('check_no_lazy_imports', [], None),
    ('check_silent_oks', [], None),
    ('check_identifier_language', [], 'paths'),
]


def require_api_tree():
    """Declara su precondición: sin el árbol de api no hay gates que componer.

    Rehúsa con exit 2 y **sin emitir conteo**. Un 0 aquí no distinguiría «no
    hay defectos» de «no pude medir», que es el sub-patrón D de
    ``metrica-decide-la-conclusion.md``.
    """
    gates_dir = API_ROOT / 'scripts'
    if not (gates_dir / 'reference_roots.py').is_file():
        print(f'ERROR — no encuentro {gates_dir}/reference_roots.py.\n'
              'Este guion COMPONE los gates de kaupamex-api; sin ese árbol no '
              'hay nada que componer. NO se emite un conteo: un 0 aquí sería '
              'un verde falso.', file=sys.stderr)
        raise SystemExit(2)
    return gates_dir


def reference_roots(gates_dir):
    """Las cuatro raíces, leídas de su única fuente — nunca tecleadas aquí."""
    salida = subprocess.run([sys.executable, 'scripts/reference_roots.py'],
                            cwd=API_ROOT, capture_output=True, text=True)
    return salida.stdout.rstrip()


def run_gate(gates_dir, name, fixed_args, narrowing, addon, paths):
    """Corre un gate con el alcance más estrecho que acepte, y lo declara."""
    args = [sys.executable, f'scripts/{name}.py', *fixed_args]
    scope = 'árbol completo'
    if narrowing == 'addon' and addon:
        args += ['--addon', addon]
        scope = f'addon {addon}'
    elif narrowing == 'paths' and paths:
        args += list(paths)
        scope = f'{len(paths)} archivo(s)'

    proceso = subprocess.run(args, cwd=API_ROOT, capture_output=True, text=True)
    lineas = [l for l in (proceso.stdout + proceso.stderr).splitlines() if l.strip()]
    return {
        'name': name,
        'scope': scope,
        'exit': proceso.returncode,
        # La cola es donde los gates de este repo publican su denominador.
        'tail': lineas[-3:] if lineas else ['(sin salida)'],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--addon', help='acota los gates que aceptan --addon')
    parser.add_argument('--paths', nargs='*', default=[],
                        help='rutas relativas a kaupamex-api')
    parser.add_argument('--roots', action='store_true',
                        help='sólo publica las cuatro raíces de la referencia')
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si algún gate compuesto falla')
    opciones = parser.parse_args()

    gates_dir = require_api_tree()

    if opciones.roots:
        print(reference_roots(gates_dir))
        return 0

    resultados = [run_gate(gates_dir, n, a, s, opciones.addon, opciones.paths)
                  for n, a, s in GATES]

    print('reporte-de-porte — composición de gates de kaupamex-api\n')
    for r in resultados:
        marca = 'OK  ' if r['exit'] == 0 else 'FALLA'
        print(f"{marca} {r['name']}  [alcance: {r['scope']}]")
        for linea in r['tail']:
            print(f'        {linea}')

    fallidos = [r['name'] for r in resultados if r['exit'] != 0]
    print(f"\n{len(fallidos)} de {len(resultados)} gate(s) con salida distinta de 0"
          f"{': ' + ', '.join(fallidos) if fallidos else ''}")
    print('El alcance de cada gate va en su fila: una cifra de árbol completo y '
          'una acotada NO son comparables.')

    return 1 if (opciones.strict and fallidos) else 0


if __name__ == '__main__':
    raise SystemExit(main())
