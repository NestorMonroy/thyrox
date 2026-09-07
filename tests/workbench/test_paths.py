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

from paths import declarations  # noqa: E402
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


# El par se COMPONE de los dos segmentos declarados, no se cablea: el default
# de evidencia paso de `eventos` a `workbench` el 2026-09-07, y un caso con la
# cadena escrita a mano habria medido el nombre de ayer. Ver
# `analisis-hogar-del-workbench-en-thyrox.rst`.
PAR = f"{paths.state_dir()}/{paths.evidence_dir()}"
print(f"== 1. la evidencia se reconoce por el par `{PAR}` ==")
check("una pieza de la evidencia propia", True,
      paths.is_evidence_path(f"{PAR}/medir-algo-20260906T000000/verde.txt"))
check("el directorio de evidencia a secas", True,
      paths.is_evidence_path(PAR))
check("la de un consumidor, con su prefijo de clon", True,
      paths.is_evidence_path(f"kaupamex-docs/{PAR}/censo/gen.py"))

print("== 2. CONTROL que discrimina: el nombre SUELTO no basta ==")
# Sin este caso, un predicado `'eventos' in parts` pasaria el bloque 1 igual y
# apagaria los gates sobre un `eventos/` de producto.
check("`src/eventos/` es producto, no evidencia", False,
      paths.is_evidence_path("src/eventos/loader.py"))
# Y el nombre HEREDADO ya no es el vivo: con el default en `workbench`, un
# `.claude/eventos` suelto NO es evidencia de este arbol. Sin este caso, el
# bloque pasaria igual con un predicado que siguiera cableando `eventos`.
check("`.claude/eventos` ya no es el par vivo", False,
      paths.is_evidence_path(".claude/eventos/x/y.txt"))
check("`src/workbench/` tampoco lo es", False,
      paths.is_evidence_path("src/workbench/paths.py"))

print("== 3. sin declaracion CAE A UN DEFAULT, y lo anota ==")
# Este bloque medía el rehuse hasta el 2026-09-07. Cambió por directiva del
# ejecutor: *«a menos que el usuario defina la constante en .env, si no esta se
# tiene que ir a una ruta por default … y si no se declaran thyrox las maneja,
# porque son necesarias»*. Lo prohibido nunca fue tener default — era derivarlo
# por aritmetica de `__file__`; aqui sale de la cadena declarada.
_prior = os.environ.pop(paths.WORKBENCH_DIR_VAR, None)
declarations.clear()
with tempfile.TemporaryDirectory() as empty:
    # `start` en un arbol sin `.env` para que la segunda via tampoco lo declare.
    home = paths.workbench_dir(empty)
    check("no rehusa: devuelve una ruta", True, isinstance(home, Path))
    check("y el tramo final es <estado>/<evidencia>",
          (paths.state_dir(empty), paths.evidence_dir(empty)),
          (home.parent.name, home.name))
    anotados = {f.key: f for f in declarations.fallbacks()}
    check("queda anotado en el registro", True,
          paths.WORKBENCH_DIR_VAR in anotados)
    check("y su razon nombra la entrada 2 (la ruta del archivo)", True,
          paths.WORKBENCH_ENV_FILE_VAR in anotados[paths.WORKBENCH_DIR_VAR].reason)
    check("el valor anotado es el que devolvio", str(home),
          anotados[paths.WORKBENCH_DIR_VAR].value)

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
      paths.is_measurement_artifact(f"{PAR}/x/gen.py"))
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
