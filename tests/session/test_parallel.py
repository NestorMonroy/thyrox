"""Pruebas de ``session.parallel`` — las cinco reglas del ejecutable, ejercidas.

Rescate de ``tests/legacy/test-parallel.sh``, que media este mismo modulo y
estaba **ROJO**: hacia ``cd .../../..`` hasta ``/home/user`` y luego
``sys.path.insert(0, '.claude/scripts')``, la ruta del modulo ANTES de la
mudanza a THYROX. Su fallo era ``ModuleNotFoundError: No module named
'parallel'`` — es decir, ninguna de sus 10 aserciones media nada desde la
mudanza, y el primitivo llevaba desde entonces sin control.

Cada caso mide la REGLA, no que la funcion devuelva algo: un test que solo
comprobara «devolvio 5 resultados» pasa aunque el cap no limite nada.
"""
from __future__ import annotations

import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session.parallel import (  # noqa: E402
    DEFAULT_ITEM_CAP, LIFETIME_CAP, ParallelError, parallel, pipeline, width_cap,
)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


print("== 1. la formula del cap, CON su piso ==")
# El piso es justo lo que la parafrasis del propio ejecutable pierde: su prosa
# dice `min(16, CPUs - 2)` y su codigo `Math.min(16,Math.max(2,r-2))`.
for cpus, esperado in ((1, 2), (3, 2), (4, 2), (12, 10), (64, 16)):
    check(f"width_cap({cpus})", esperado, width_cap(cpus))

print("== 2. CONTROL que discrimina: la concurrencia esta REALMENTE limitada ==")
# Se mide el maximo de trabajos simultaneos observado, no el resultado. Sin
# este caso, una implementacion secuencial —o una que ignorara `cap`— pasaria
# los bloques 3 y 4 igual: el verde no distinguiria «acota» de «no acota».
vivos = tope = 0
lock = threading.Lock()


def _trabajo(x: int) -> int:
    global vivos, tope
    with lock:
        vivos += 1
        tope = max(tope, vivos)
    time.sleep(0.05)
    with lock:
        vivos -= 1
    return x


parallel(list(range(20)), _trabajo, cap=3)
check("20 items con cap=3 nunca superan 3 a la vez", 3, tope)

print("== 3. TODOS completan aunque N >> cap (regla 3) ==")
check("50 items con cap=2 completan", 50, len(parallel(list(range(50)), lambda x: x * 2, cap=2)))

print("== 4. el orden es el de ENTRADA, no el de terminacion ==")
# El item 0 tarda mas: con orden de terminacion saldria el ultimo.
check("orden de entrada preservado", [0, 1, 2, 3],
      parallel([0, 1, 2, 3],
               lambda x: (time.sleep(0.1 if x == 0 else 0), x)[1], cap=4))

print("== 5. exceder la cota es error EXPLICITO, no truncamiento (regla 4) ==")
try:
    parallel(list(range(51)), lambda x: x, item_cap=50)
    check("51 items con cota 50 rehusa", "ParallelError", "no levanto")
except ParallelError as err:
    check("51 items con cota 50 rehusa", "ParallelError", type(err).__name__)
    check("y el rechazo NOMBRA el truncamiento que no hace", True,
          "truncamiento" in str(err))
    check("y nombra la cota real", True, str(50) in str(err))

print("== 6. CONTROL DE ANULACION del bloque 5: por debajo de la cota SI corre ==")
# Sin este caso, un `parallel` que rehusara SIEMPRE pasaria el bloque 5.
check("50 items con cota 50 no rehusa", 50,
      len(parallel(list(range(50)), lambda x: x, item_cap=50)))
check("lista vacia devuelve lista vacia, no error", [], parallel([], lambda x: x))

print("== 7. pipeline encadena dos etapas sin barrera entre ellas ==")
check("pipeline dos etapas", [22, 24, 26],
      pipeline([1, 2, 3], lambda x: x + 10, lambda y: y * 2, cap=2))

print("== 8. las dos cotas declaradas son las del ejecutable ==")
# `LIFETIME_CAP` esta en claro en el ejecutable; `DEFAULT_ITEM_CAP` es cota
# NUESTRA porque el cliente interpola la suya. Nada las media hasta hoy.
check("cota de vida del ejecutable", 1000, LIFETIME_CAP)
check("cota de items por llamada, declarada como nuestra", 50, DEFAULT_ITEM_CAP)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
