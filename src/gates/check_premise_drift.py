#!/usr/bin/env python3
"""Corre la cadena de premisas y reporta los veredictos que CAMBIARON.

El detector (`verificar_premisa.py`) ya daba un veredicto por ficha, y nadie lo
corría. Su valor no está en el veredicto de un día: el acuerdo del mismo día es
estructural, porque los instrumentos se incluyen. Está en la **re-medición** —
una ficha que ayer tenía premisa firme y hoy pide re-encuadre es una señal, y
sin dos ejecuciones esa señal no existe.

Por eso este gate no publica veredictos: publica su **diferencia** contra un
baseline. Y por eso el baseline se escribe con un comando explícito
(`--write-baseline`) y no en cada ejecución: si el gate se actualizara solo,
todo cambio quedaría absorbido en el momento de detectarlo y nunca habría nada
que reportar — el verde que no discrimina de `metrica-decide-la-conclusion.md`.

Uso:
    check_premise_drift.py [--tasks-dir D] [--baseline B] [--strict]
    check_premise_drift.py --write-baseline
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_BASELINE = HERE / 'premise_drift_baseline.json'
EXIT_GUARD = 2


def load_detector():
    """El detector, cargado por ruta.

    Se reusa en vez de reimplementarse: dos definiciones de «premisa envejecida»
    divergirían, y entonces el gate mediría un fenómeno distinto del que el
    detector reporta.
    """
    spec = importlib.util.spec_from_file_location('verificar_premisa', HERE / 'verificar_premisa.py')
    if spec is None or spec.loader is None:
        print('ERROR — no se pudo cargar verificar_premisa.py. NO se emite un conteo.', file=sys.stderr)
        raise SystemExit(EXIT_GUARD)
    module = importlib.util.module_from_spec(spec)
    sys.modules['verificar_premisa'] = module
    spec.loader.exec_module(module)
    return module


def verdicts(detector, tasks_dir: str) -> dict[str, str]:
    """Veredicto por ficha abierta: `firme` o `re-encuadrar`.

    Las cerradas quedan fuera: su señal es **esperada** —declararon esos
    símbolos al cumplirse— y contarlas daría por envejecida toda ficha
    cumplida, que es la lectura opuesta a la que el detector existe para dar.
    """
    tasks = detector.load_tasks(tasks_dir)
    if not tasks:
        print(f'ERROR — sin fichas en {tasks_dir}. NO se emite un conteo: un 0 '
              'aquí no distinguiría «nada cambió» de «no pude medir».', file=sys.stderr)
        raise SystemExit(EXIT_GUARD)

    # Las raíces las declara el detector (`CODE_ROOTS`): medir otras haría que
    # el gate y el detector hablaran de universos distintos, que es justo lo que
    # `load_detector` existe para impedir. `build_symbol_index` devuelve además
    # el conteo de archivos, que aquí no se publica.
    symbols, _ = detector.build_symbol_index(detector.CODE_ROOTS)
    salida = {}
    for task_id, task in tasks.items():
        if task['status'] == detector.DONE:
            continue
        found = detector.signals_for(task, tasks, symbols)
        salida[task_id] = 're-encuadrar' if found else 'firme'
    return salida


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--tasks-dir', default=None, help="directorio de fichas, o '-' para stdin")
    p.add_argument('--baseline', default=str(DEFAULT_BASELINE))
    p.add_argument('--strict', action='store_true', help='exit 1 si algún veredicto cambió')
    p.add_argument('--write-baseline', action='store_true')
    p.add_argument('--quiet', action='store_true', help='sólo el conteo de cambios')
    args = p.parse_args()

    detector = load_detector()
    tasks_dir = args.tasks_dir if args.tasks_dir is not None else detector.default_tasks_dir()
    if tasks_dir is None:
        print('ERROR — no se localizó el directorio de fichas. NO se emite un conteo.', file=sys.stderr)
        return EXIT_GUARD

    ahora = verdicts(detector, tasks_dir)
    baseline_path = Path(args.baseline)

    if args.write_baseline:
        baseline_path.write_text(json.dumps(ahora, indent=1, sort_keys=True) + '\n')
        print(f'baseline escrito: {len(ahora)} ficha(s) en {baseline_path}')
        return 0

    if not baseline_path.exists():
        # Sin baseline no hay con qué comparar, y el gate REHÚSA en vez de
        # publicar un conteo. Publicar «0 cambios» aquí —aunque fuera junto a
        # la explicación— es el verde que no discrimina: un lector, y sobre
        # todo `--quiet`, no puede separar «nada cambió» de «no había contra
        # qué medir». Es el sub-patrón D aplicado al propio instrumento.
        print(f'ERROR — sin baseline en {baseline_path}. NO se emite un conteo; '
              f'escríbelo con --write-baseline.', file=sys.stderr)
        return EXIT_GUARD

    antes = json.loads(baseline_path.read_text())
    cambios = {k: (antes[k], v) for k, v in ahora.items() if k in antes and antes[k] != v}
    nuevas = [k for k in ahora if k not in antes]
    idas = [k for k in antes if k not in ahora]

    if args.quiet:
        print(len(cambios))
        return 1 if (args.strict and cambios) else 0

    for task_id, (viejo, nuevo) in sorted(cambios.items(), key=lambda kv: int(kv[0])):
        print(f'#{task_id}  {viejo} -> {nuevo}')
    if nuevas:
        print(f'{len(nuevas)} nueva(s) sin historia: {", ".join("#" + n for n in sorted(nuevas, key=int))}')
    if idas:
        print(f'{len(idas)} cerrada(s) o retirada(s): {", ".join("#" + n for n in sorted(idas, key=int))}')

    print(f'{len(cambios)} cambio(s)  (alcance medido: {len(ahora)} ficha(s) abierta(s) '
          f'contra {len(antes)} del baseline)')
    print('Métrica: veredicto del detector por ficha abierta, comparado con el baseline.')
    print('Ciega a: un cambio que ocurra y se revierta entre dos ejecuciones; a toda '
          'ficha cerrada —su señal es la huella de su propio trabajo—; y al cambio de '
          'sesión: el tablero vive en ~/.claude/tasks y sus ids no son globales, así '
          'que otra sesión aparece entera como «nuevas sin historia», no como drift.')
    return 1 if (args.strict and cambios) else 0


if __name__ == '__main__':
    raise SystemExit(main())
