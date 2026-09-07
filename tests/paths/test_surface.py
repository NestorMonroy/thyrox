#!/usr/bin/env python3
"""Control de `paths/surface.py` y de su gate.

La mitad TypeScript tiene `exports.test.ts`; ésta no tenía nada, y una
superficie que nadie contrasta es el mapa inerte que #143 cerró para la otra
mitad. Aquí se mide que la declaración PESA: que el gate ve una cita fuera de
la superficie, y que rehúsa cuando no puede medir.
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'src'))
from paths import surface  # noqa: E402
from paths import reach  # noqa: E402

#: El bootstrap de arriba es la ÚNICA aritmética admitida: alimenta el
#: `sys.path.insert` y falla con ruido si algo se mueve. Todo lo demás sale
#: del localizador declarado (tarea #228).
RAIZ = reach.thyrox_root()
GATE = RAIZ / 'src' / 'gates' / 'check_python_surface.py'

ok = fallos = 0


def check(label: str, esperado, obtenido) -> None:
    global ok, fallos
    if esperado == obtenido:
        ok += 1
        print(f'  ok    {label}')
    else:
        fallos += 1
        print(f'  FALLO {label}: esperaba {esperado!r}, obtuve {obtenido!r}')


def correr(consumidores: list[pathlib.Path], *args: str) -> tuple[int, str]:
    entorno = {**os.environ,
               'THYROX_SURFACE_CONSUMERS': os.pathsep.join(str(c) for c in consumidores)}
    done = subprocess.run([sys.executable, str(GATE), *args],
                          capture_output=True, text=True, env=entorno)
    return done.returncode, done.stdout + done.stderr


def consumidor(base: pathlib.Path, cuerpo: str) -> pathlib.Path:
    """Un clon sintético con un hook que cita a thyrox."""
    hooks = base / '.claude' / 'hooks'
    hooks.mkdir(parents=True)
    (hooks / 'algo.sh').write_text(cuerpo)
    return base


print('== 1. la declaración responde a las tres formas ==')
check('el localizador es superficie', True, surface.is_public('src/paths/reach.py'))
check('un hijo de un dir declarado también',
      True, surface.is_public('src/agents/agent-cost.sh'))
check('un módulo interno NO lo es',
      False, surface.is_public('src/session/marker_wait.py'))
check('y la forma ./ se normaliza',
      True, surface.is_public('./src/paths/reach.py'))

print('== 2. el gate NO marca una cita que sí está en la superficie ==')
with tempfile.TemporaryDirectory() as d:
    c = consumidor(pathlib.Path(d), 'GATE="$THYROX_ROOT/src/gates/thyrox-audit.sh"\n')
    code, out = correr([c])
    check('sale 0', 0, code)
    check('y publica 0 fuera de superficie', True, '0 cita(s) fuera' in out)

print('== 3. CONTROL que discrimina: una cita fuera SÍ se marca ==')
# Sin este caso, un gate que nunca marcara nada pasaría el caso 2 igual: el
# verde no distinguiría «la declaración cubre» de «el patrón no ve nada».
with tempfile.TemporaryDirectory() as d:
    c = consumidor(pathlib.Path(d), 'X="$THYROX_ROOT/src/session/marker_wait.py"\n')
    code, out = correr([c], '--strict')
    check('sale 1 bajo --strict', 1, code)
    check('nombra la ruta fuera de superficie', True, 'src/session/marker_wait.py' in out)
    check('y nombra el archivo que la invoca', True, 'algo.sh' in out)

print('== 4. la cita en PROSA no cuenta, y es deliberado ==')
with tempfile.TemporaryDirectory() as d:
    base = pathlib.Path(d)
    c = consumidor(base, '# ver $THYROX_ROOT/src/session/marker_wait.py para el detalle\n')
    code, out = correr([c], '--strict')
    check('no la marca — sólo la nombra', False, 'FUERA DE SUPERFICIE' in out)
    # Y sin ninguna cita ejecutable el gate REHÚSA, no publica 0.
    check('rehúsa con exit 2 en vez de publicar un 0', 2, code)

print('== 5. sin consumidor alcanzable REHÚSA, no publica un 0 ==')
with tempfile.TemporaryDirectory() as d:
    vacio = pathlib.Path(d) / 'sin-claude'
    vacio.mkdir()
    code, out = correr([vacio], '--strict')
    check('exit 2', 2, code)
    check('y NO emite un conteo', False, 'cita(s) fuera' in out)

print('== 6. el banco de evidencia no es un consumidor ==')
with tempfile.TemporaryDirectory() as d:
    base = pathlib.Path(d)
    c = consumidor(base, 'GATE="$THYROX_ROOT/src/gates/thyrox-audit.sh"\n')
    evento = base / '.claude' / 'eventos' / 'algo-20260907T000000'
    evento.mkdir(parents=True)
    (evento / 'sonda.sh').write_text('X="$THYROX_ROOT/src/session/marker_wait.py"\n')
    code, out = correr([c], '--strict')
    check('la sonda del evento no cuenta como cita viva', 0, code)

print()
print(f'{ok} ok, {fallos} fallos')
raise SystemExit(1 if fallos else 0)
