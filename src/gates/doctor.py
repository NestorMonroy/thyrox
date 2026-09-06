#!/usr/bin/env python3
"""El corredor de gates de thyrox — un registro declarativo, no bloques a mano.

Adaptado de `ccnmt: scripts/doctor-architecture.ts`, medido en
:ref:`analisis-superficie-de-verificacion-contra-ccnmt`. Lo que se adopta de
la referencia y por qué:

- **El registro es dato.** Allá son 84 entradas `{id, layer, subsystem,
  script, doc}` y 84 verificadores en disco que coinciden exactamente. Aquí
  eran 1126 líneas de bloques `if [[ -f … ]]` escritos a mano, cada uno con su
  aviso, su umbral y su extracción de denominador por `sed`.
- **El corredor no importa nada de lo que califica.** Lanza cada gate como
  subproceso, así que un gate que revienta no se lleva al corredor por delante.
  La referencia lo declara igual: *«zero imports from the packages it is
  grading»*.
- **Un gate registrado que no está en disco NO es un aprobado.** Es un estado
  propio, y bloquea — `anyFailure = results.some(r => r.status !== 'pass')`.

Dónde DIVERGE, con su razón: la referencia indirecciona por `package.json`
(`bun run doctor:arch`), y eso no cruza la frontera proveedor/consumidor —
el consumidor no tiene los scripts de thyrox. Y su corredor mide su propio
repo porque ccnmt es UN repo; thyrox es proveedor, así que **el árbol medido
es un parámetro**, resuelto por las dos entradas de entorno que
`src/paths/reach.py` ya implementa.

Códigos de salida, los mismos tres de la referencia:
  0  todo aprobado
  1  hay violaciones, o un gate registrado no está
  2  error del corredor (incluye: el filtro no seleccionó nada)
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import os
import pathlib
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
CONSUMER_VAR = 'THYROX_CONSUMER'

RUNNER_ERROR = 2


class NothingSelected(Exception):
    """El filtro no seleccionó ningún gate.

    NO es un aprobado en vacío: la referencia sale 2 en este caso, y por la
    misma razón que un gate sin sujeto rehúsa — un cero sobre cero no
    distingue «no hay violaciones» de «no medí nada».
    """


@dataclasses.dataclass(frozen=True)
class Check:
    """Una regla que sabemos verificar, y el guion que la mide."""

    id: str
    layer: str
    subsystem: str
    script: str
    doc: str


@dataclasses.dataclass
class Result:
    check: Check
    status: str          # pass | fail | missing | unmeasured
    exit_code: int | None
    stdout: str
    stderr: str
    duration_ms: int


@dataclasses.dataclass(frozen=True)
class Verdict:
    passed: int
    failed: int
    missing: int
    unmeasured: int
    total: int
    ok: bool


def select(checks, only=None):
    """Los gates que la invocación pide, por subcadena del `id`."""
    if not only:
        return list(checks)
    chosen = [c for c in checks if only in c.id]
    if not chosen:
        raise NothingSelected(only)
    return chosen


def resolve_consumer(declared=None):
    """El árbol a medir. Dos entradas, ambas de entorno.

    Es la forma de litellm que el proyecto ya adoptó: un valor directo
    (`WORKER_CONFIG` allá, `THYROX_CONSUMER` aquí) y la ruta a un archivo que
    lo declara (`CONFIG_FILE_PATH` allá, `THYROX_ENV_FILE` aquí, que
    `reach.env_value` ya lee). Sin ninguna de las dos, el respaldo es el
    directorio de invocación — nunca la raíz del PROVEEDOR, que es el error
    que dejaba a los gates midiendo un corpus ausente.
    """
    if declared:
        return pathlib.Path(declared).resolve()

    from paths import reach

    value = os.environ.get(CONSUMER_VAR, '').strip() or reach.env_value(CONSUMER_VAR)
    if value:
        return pathlib.Path(value).resolve()
    return pathlib.Path.cwd().resolve()


def run_one(check, gates_dir, consumer):
    """Lanza un gate como subproceso, con el consumidor por cwd."""
    script = pathlib.Path(gates_dir) / check.script
    if not script.is_file():
        return Result(check, 'missing', None, '',
                      f'no está en disco: {script}', 0)

    runner = ['bash'] if script.suffix == '.sh' else [sys.executable]
    started = time.monotonic()
    try:
        done = subprocess.run(
            [*runner, str(script)],
            cwd=str(consumer), capture_output=True, text=True, timeout=600,
        )
    except subprocess.TimeoutExpired:
        return Result(check, 'unmeasured', None, '', 'timeout 600 s',
                      int((time.monotonic() - started) * 1000))
    elapsed = int((time.monotonic() - started) * 1000)

    # 2 es «no emití veredicto», por convención de este árbol y de la
    # referencia. No es fail: contarlo como violación publicaría un defecto
    # donde sólo hubo una precondición ausente.
    status = {0: 'pass', 2: 'unmeasured'}.get(done.returncode, 'fail')
    return Result(check, status, done.returncode, done.stdout, done.stderr, elapsed)


def run(checks, gates_dir=None, consumer=None):
    gates_dir = pathlib.Path(gates_dir) if gates_dir else HERE
    consumer = pathlib.Path(consumer) if consumer else resolve_consumer()
    return [run_one(c, gates_dir, consumer) for c in checks]


def verdict(results):
    """El reparto completo. Un conteo sin su denominador no es un resultado."""
    by = {s: sum(1 for r in results if r.status == s)
          for s in ('pass', 'fail', 'missing', 'unmeasured')}
    return Verdict(
        passed=by['pass'], failed=by['fail'], missing=by['missing'],
        unmeasured=by['unmeasured'], total=len(results),
        # `missing` bloquea: un gate registrado que desapareció es una
        # medición que no ocurrió, y su silencio se leería como salud.
        ok=by['fail'] == 0 and by['missing'] == 0,
    )


def _print_human(results, verbose=False):
    marca = {'pass': 'PASS ', 'fail': 'FALLA', 'missing': 'AUSENTE', 'unmeasured': 'SIN MEDIR'}
    for r in results:
        print(f'  {marca[r.status]:<10} {r.check.id:<34} {r.check.doc}')
        if r.status != 'pass' or verbose:
            for linea in (r.stderr or r.stdout or '').strip().splitlines()[:6]:
                print(f'             {linea}')
    v = verdict(results)
    print()
    print(f'  {"─" * 56}')
    print(f'  {v.passed} aprobados · {v.failed} con violaciones · '
          f'{v.missing} ausentes · {v.unmeasured} sin medir '
          f'(alcance medido: {v.total} gate(s) registrados)')


def main(argv=None):
    from gates import registry

    p = argparse.ArgumentParser(description='Corre los gates registrados sobre un consumidor.')
    p.add_argument('--only', help='subcadena del id')
    p.add_argument('--list', action='store_true', help='lista el registro y sale')
    p.add_argument('--json', action='store_true', help='salida legible por máquina')
    p.add_argument('--verbose', action='store_true', help='vuelca la salida de cada gate')
    p.add_argument('--consumer', help=f'árbol a medir (o ${CONSUMER_VAR})')
    args = p.parse_args(argv)

    try:
        checks = select(registry.CHECKS, args.only)
    except NothingSelected as e:
        print(f'ERROR — ningún gate coincide con --only {e.args[0]!r}. '
              'NO se emite un conteo: cero sobre cero no es un aprobado.',
              file=sys.stderr)
        return RUNNER_ERROR

    if args.list:
        if args.json:
            print(json.dumps([dataclasses.asdict(c) for c in checks], indent=2, ensure_ascii=False))
        else:
            for c in checks:
                print(f'{c.id:<34} {c.layer:<16} {c.script}')
        return 0

    consumer = resolve_consumer(args.consumer)
    results = run(checks, consumer=consumer)

    if args.json:
        v = verdict(results)
        print(json.dumps({
            'consumer': str(consumer),
            'summary': dataclasses.asdict(v),
            'results': [
                {'id': r.check.id, 'status': r.status, 'exit': r.exit_code,
                 'ms': r.duration_ms, 'doc': r.check.doc}
                for r in results
            ],
        }, indent=2, ensure_ascii=False))
    else:
        print(f'consumidor: {consumer}')
        _print_human(results, args.verbose)

    return 0 if verdict(results).ok else 1


if __name__ == '__main__':
    sys.path.insert(0, str(HERE.parent))
    raise SystemExit(main())
