"""Pruebas de ``workbench.paths`` — los DOS hogares, y por que no son uno.

La separacion la confirmo el ejecutor 2026-09-06::

    <hogar declarado por THYROX_WORKBENCH_DIR>/  manifest + instrumento + outputs
    .claude/eventos/                             rojo-de-partida · anulacion · verde

Esta suite fija las tres propiedades que distinguen esa separacion de la version
anterior, que las colapsaba en un solo predicado por nombre de directorio:

1. La evidencia se reconoce por el PAR ``.claude/eventos``, nunca por el nombre
   suelto. Con el nombre suelto, un ``eventos/`` de producto quedaria excluido y
   el gate publicaria su conteo con un agujero — sub-patron D de
   ``metrica-decide-la-conclusion.md``.
2. El hogar del banco se RESUELVE por sus dos entradas de entorno y **rehusa**
   sin declaracion. Un default ahi es la decision que la directiva retira al
   emisor.
3. El predicado del banco, en cambio, devuelve ``False`` sin declaracion: el
   gate mide de mas, no de menos.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from workbench import paths  # noqa: E402

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


print("== 1. la evidencia se reconoce por el par `.claude/eventos` ==")
check("una pieza de la evidencia propia", True,
      paths.is_evidence_path(".claude/eventos/medir-algo-20260906T000000/verde.txt"))
check("el directorio de evidencia a secas", True,
      paths.is_evidence_path(".claude/eventos"))
check("la de un consumidor, con su prefijo de clon", True,
      paths.is_evidence_path("kaupamex-docs/.claude/eventos/censo/gen.py"))

print("== 2. CONTROL que discrimina: el nombre SUELTO no basta ==")
# Sin este caso, un predicado `'eventos' in parts` pasaria el bloque 1 igual y
# apagaria los gates sobre un `eventos/` de producto.
check("`src/eventos/` es producto, no evidencia", False,
      paths.is_evidence_path("src/eventos/loader.py"))
check("`src/workbench/` tampoco lo es", False,
      paths.is_evidence_path("src/workbench/paths.py"))

print("== 3. el hogar del banco REHUSA sin declaracion ==")
_prior = os.environ.pop(paths.WORKBENCH_DIR_VAR, None)
with tempfile.TemporaryDirectory() as empty:
    # `start` en un arbol sin `.env` para que la segunda via tampoco lo declare.
    try:
        paths.workbench_dir(empty)
        check("rehusa sin declaracion", "WorkbenchHomeError", "no lanzo")
    except paths.WorkbenchHomeError as err:
        check("rehusa sin declaracion", "WorkbenchHomeError", type(err).__name__)
        check("y el mensaje nombra la entrada 1 (el valor)", True,
              paths.WORKBENCH_DIR_VAR in str(err))
        check("y tambien la entrada 2 (la ruta del archivo)", True,
              paths.WORKBENCH_ENV_FILE_VAR in str(err))

print("== 4. CONTROL DE ANULACION: declarada la entrada 1, SI resuelve ==")
# Sin este caso el bloque 3 pasaria igual con un modulo que rehusara siempre:
# el verde no distinguiria «lee la declaracion» de «no sabe leer nada».
with tempfile.TemporaryDirectory() as home:
    os.environ[paths.WORKBENCH_DIR_VAR] = home
    try:
        check("devuelve el hogar declarado", Path(home), paths.workbench_dir())
        piece = Path(home) / "medir-algo-20260906T000000" / "manifest.json"
        check("y una pieza suya SI es del banco", True, paths.is_workbench_path(piece))
        check("una ruta ajena NO lo es", False,
              paths.is_workbench_path("/etc/hostname"))
    finally:
        os.environ.pop(paths.WORKBENCH_DIR_VAR, None)

print("== 5. sin declaracion el predicado del banco no excluye NADA ==")
# La direccion del error importa: el gate mide de mas, no de menos.
with tempfile.TemporaryDirectory() as empty:
    check("una ruta cualquiera no es banco", False,
          paths.is_workbench_path("/tmp/lo-que-sea/manifest.json", empty))

print("== 6. la union es lo que consume un gate ==")
check("evidencia entra por la primera mitad", True,
      paths.is_measurement_artifact(".claude/eventos/x/gen.py"))
with tempfile.TemporaryDirectory() as home:
    os.environ[paths.WORKBENCH_DIR_VAR] = home
    try:
        check("el banco declarado entra por la segunda", True,
              paths.is_measurement_artifact(Path(home) / "x" / "gen.py"))
    finally:
        os.environ.pop(paths.WORKBENCH_DIR_VAR, None)
check("y el producto no entra por ninguna", False,
      paths.is_measurement_artifact("src/workbench/paths.py"))

if _prior is not None:
    os.environ[paths.WORKBENCH_DIR_VAR] = _prior

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
