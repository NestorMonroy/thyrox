#!/usr/bin/env python3
"""``check_rst_sintaxis.py`` reconoce sus banderas ANTES de auditar.

Defecto medido (H-THYROX-278): `main()` sólo mira `--quiet`, `--strict` y
`--nuevos`; cualquier otra bandera se descarta en silencio y, sin rutas
sueltas, el gate audita TODO `source/` (5852 `.rst` medidos). El sintoma
real: `bin/check_rst_sintaxis --help` no termina en un turno — se comprobó
con `timeout 5`, exit 124.

Cada caso corre por subproceso con un `timeout` corto: si el arreglo se
pierde y el gate vuelve a auditar, la prueba falla por tiempo agotado, no se
queda colgada.

`THYROX_ROOT` se fija EXPLICITO a este worktree para el subproceso, en vez de
heredar el del entorno ambiente: una sesion que ya declaro esa variable hacia
otro clon (el checkout principal, hermano de este worktree) haria que el
sujeto medido fuera OTRO archivo, no el que este item corrige.
"""
from __future__ import annotations

import os
import pathlib
import subprocess

#: Este archivo vive en <worktree>/tests/verify/; dos niveles arriba es la
#: raiz del worktree que este item corrige — NO se deriva con `reach`, que
#: lee `THYROX_ROOT` del entorno y en esta sesion ya apunta al checkout
#: principal.
THYROX_ROOT = pathlib.Path(__file__).resolve().parents[2]
BIN = THYROX_ROOT / 'bin' / 'check_rst_sintaxis'
TIMEOUT_S = 15


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    env['THYROX_ROOT'] = str(THYROX_ROOT)
    env['PYTHONPATH'] = str(THYROX_ROOT / 'src')
    try:
        return subprocess.run(
            ['bash', str(BIN), *args],
            cwd=str(THYROX_ROOT), env=env, capture_output=True, text=True,
            check=False, timeout=TIMEOUT_S,
        )
    except subprocess.TimeoutExpired as exc:
        raise AssertionError(
            f'{args!r} no termino en {TIMEOUT_S}s: siguio auditando en vez '
            'de resolver la bandera de inmediato'
        ) from exc


def test_bin_exists():
    assert BIN.is_file(), BIN


def test_help_lists_recognized_flags_and_exits_zero():
    for flag in ('--help', '-h'):
        r = _run(flag)
        assert r.returncode == 0, f'{flag}: exit={r.returncode} stderr={r.stderr!r}'
        for known_flag in ('--quiet', '--strict', '--nuevos'):
            assert known_flag in r.stdout, f'{flag}: falta {known_flag!r} en {r.stdout!r}'
        assert 'alcance medido' not in r.stdout, (
            f'{flag}: emitio un conteo — audito en vez de sólo listar el uso')


def test_unknown_flag_refuses_without_scanning():
    r = _run('--desconocida')
    assert r.returncode == 2, f'exit={r.returncode} stdout={r.stdout!r} stderr={r.stderr!r}'
    assert '--desconocida' in r.stderr, f'no nombra la bandera: {r.stderr!r}'
    assert 'alcance medido' not in r.stdout, (
        'emitio un conteo con una bandera desconocida — un 0 aqui seria un verde falso')


def _run_suite() -> int:
    failures = 0
    cases = [(n, f) for n, f in sorted(globals().items())
             if n.startswith('test_') and callable(f)]
    for name, case in cases:
        try:
            case()
            print(f'  ok    {name}')
        except Exception as e:                          # noqa: BLE001
            failures += 1
            print(f'  FALLA {name}: {type(e).__name__}: {e}')
    print(f'{len(cases) - failures}/{len(cases)} aserciones verdes')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(_run_suite())
