#!/usr/bin/env python3
"""Control DEC-04: el baseline y las raices son parametro del CONSUMIDOR.

Cierra la mudanza de `check_identifier_language.py` a THYROX
(actualizar-agentic-ai-thyrox). El mecanismo —AST, lexico, corpus— es del
proveedor; DONDE vive la deuda heredada de CADA consumidor no lo es, y por
eso NO tiene un default: un baseline ausente leido como vacio haria ver como
NUEVA a toda la deuda heredada (H-DOCS-1072, medido para el gate hermano
`check_script_naming.py`).

Control de anulacion, en el mismo pase que produjo este archivo: retirar el
`raise BaselineHomeError` de `baseline_path()` (dejar que devuelva una ruta
inventada en vez de rehusar) tumba EXACTAMENTE los casos marcados
`# ANULACION` — ningun otro. Es la prueba de que el rehuse es un control
real, no un adorno que nunca podria fallar (sub-patron D).
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
GATE = ROOT / 'src' / 'verify' / 'check_identifier_language.py'

sys.path.insert(0, str(GATE.parent))
import check_identifier_language as gate  # noqa: E402

ok = fallos = 0


def check(label, esperado, obtenido):
    global ok, fallos
    if esperado == obtenido:
        ok += 1
        print(f'  ok    {label}')
    else:
        fallos += 1
        print(f'  FALLO {label}: esperaba {esperado!r}, obtuve {obtenido!r}')


def entorno_limpio():
    """Una copia del entorno SIN ninguna de las dos variables del mecanismo.

    Necesario porque el proceso que corre esta suite puede (o no) llevar
    `IDENTIFIER_LANGUAGE_BASELINE`/`ROOTS`/`THYROX_ENV_FILE` heredadas de un
    turno anterior — un test que no las limpiara mediria el entorno, no el
    codigo.
    """
    env = dict(os.environ)
    for var in ('IDENTIFIER_LANGUAGE_BASELINE', 'IDENTIFIER_LANGUAGE_ROOTS',
                'THYROX_ENV_FILE'):
        env.pop(var, None)
    return env


print('=== BASELINE: sin declaracion, rehusa — nunca un 0 silencioso ===')

# ANULACION: sin el raise, esto devolveria una ruta inventada en vez de
# levantar BaselineHomeError.
try:
    gate.baseline_path(start=Path(tempfile.mkdtemp()))
    check('rehusa sin declaracion', 'BaselineHomeError', 'no levanto nada')
except gate.BaselineHomeError as exc:
    check('rehusa sin declaracion', True, True)
    check('nombra la variable en el mensaje', gate.BASELINE_VAR in str(exc), True)

print()
print('=== BASELINE: declarada por PROCESO, se usa tal cual ===')
with tempfile.TemporaryDirectory() as tmp:
    destino = Path(tmp) / 'baseline.txt'
    os.environ['IDENTIFIER_LANGUAGE_BASELINE'] = str(destino)
    try:
        # ANULACION: sin el `if from_process: return from_process` de
        # `env_value` (la funcion que este modulo reusa de `paths.reach`),
        # esto no encontraria el valor puesto solo en el proceso.
        check('la ruta del proceso gana', gate.baseline_path(), destino)
    finally:
        del os.environ['IDENTIFIER_LANGUAGE_BASELINE']

print()
print('=== BASELINE: declarada por .env, PROCESO le gana ===')
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    env_file = tmp / '.env'
    del_proceso = tmp / 'del-proceso.txt'
    del_env = tmp / 'del-env.txt'
    env_file.write_text(f'IDENTIFIER_LANGUAGE_BASELINE={del_env}\n')
    os.environ['THYROX_ENV_FILE'] = str(env_file)
    try:
        check('sin var de proceso, lee el .env',
              gate.baseline_path(start=tmp), del_env)
        os.environ['IDENTIFIER_LANGUAGE_BASELINE'] = str(del_proceso)
        check('con var de proceso, el proceso gana sobre el .env',
              gate.baseline_path(start=tmp), del_proceso)
    finally:
        os.environ.pop('IDENTIFIER_LANGUAGE_BASELINE', None)
        del os.environ['THYROX_ENV_FILE']

print()
print('=== ROOTS: sin declaracion, el default que YA usaba api ===')
check('default = (src, tests, addons)', gate.roots(start=Path(tempfile.mkdtemp())),
      ('src', 'tests', 'addons'))

print()
print('=== ROOTS: declaradas, separadas por ":" como PATH ===')
os.environ['IDENTIFIER_LANGUAGE_ROOTS'] = 'src:packages:tests'
try:
    check('se parte por :', gate.roots(), ('src', 'packages', 'tests'))
finally:
    del os.environ['IDENTIFIER_LANGUAGE_ROOTS']

print()
print('=== CLI: sin baseline declarado, exit 2 y SIN cifra ===')
with tempfile.TemporaryDirectory() as tmp:
    archivo = Path(tmp) / 'algo.py'
    archivo.write_text('def bien():\n    return 1\n')
    done = subprocess.run([sys.executable, str(GATE), str(archivo)],
                          capture_output=True, text=True, env=entorno_limpio())
    salida = done.stdout + done.stderr
    # ANULACION: si `main()` no comprobara `baseline_path()` antes de medir,
    # esto saldria 0 o 1 con un conteo — un verde o un rojo que no dice «no se
    # donde esta el baseline».
    check('sale con 2 (no emitio veredicto)', done.returncode, 2)
    check('nombra la variable que falta', gate.BASELINE_VAR in salida, True)
    check('NO hay cifra de archivos medidos', 'archivos medidos' in salida, False)

print()
print('=== CLI: CON baseline declarado (vacio), mide y da veredicto ===')
with tempfile.TemporaryDirectory() as tmp:
    archivo = Path(tmp) / 'algo.py'
    archivo.write_text('def bien():\n    return 1\n')
    baseline = Path(tmp) / 'baseline.txt'
    baseline.write_text('')
    env = entorno_limpio()
    env['IDENTIFIER_LANGUAGE_BASELINE'] = str(baseline)
    done = subprocess.run([sys.executable, str(GATE), str(archivo)],
                          capture_output=True, text=True, env=env)
    check('sale con 1 (bien es espanol y el baseline esta vacio)',
          done.returncode, 1)
    check('cita el archivo:linea', 'algo.py:1' in (done.stdout + done.stderr), True)

print()
print(f'{ok} ok, {fallos} fallos (alcance medido: {ok + fallos} aserciones sobre {GATE})')
raise SystemExit(1 if fallos else 0)
