#!/usr/bin/env python3
"""El hogar del store es de THYROX, no de un consumidor.

Directiva del ejecutor 2026-09-07: *«thyrox/agent-results/agent_store.sqlite3
es solo uno, donde se guarda todo lo de la sesion, sin importar a que
kaupamex-* fue el trabajo, porque es analitica de la sesion de donde se esta
ejecutando»*. Y: *«si revisas bien aun no la hemos llenado»*.

MEDIDO al escribir esta prueba, y es la razon de que exista:

    thyrox: 1152 filas · ultima 2026-09-07T03:01:19   <- congelado en la mudanza
    docs:   1201 filas · ultima 2026-09-07T19:34:37   <- sigue creciendo hoy

Las 49 filas de diferencia son los agentes de ESTA sesion. El localizador
`reach.agent_store_path()` ya resuelve bien —a thyrox—, pero dos sitios del
proveedor siguen fabricando `docs` como destino, y el hook que arranca en el
clon de docs invoca esa cadena.

El contraste que lo prueba: `register_session.destination_args()` ya devuelve
`None` en vez de inventar el default, y su docstring dice el principio. Su
hermano `reconcile_store._destination()` no.

CONTROL DE ANULACION: si `_destination()` volviera a fabricar un destino, cae
el caso 2. Si `agent_results_dir()` volviera a colgar del consumidor, cae el 3
— y ese es el que discrimina, porque los otros dos pasarian igual con el
directorio apuntando al arbol equivocado.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from agents import agents_paths, reconcile_store  # noqa: E402
from paths import reach  # noqa: E402

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


def _en_codigo(archivo: Path, literal: str) -> int:
    dentro = False
    n = 0
    for linea in archivo.read_text().splitlines():
        if linea.strip().startswith(('#',)):
            continue
        comillas = linea.count('"""')
        if dentro:
            dentro = comillas % 2 == 0
            continue
        if comillas:
            dentro = comillas % 2 == 1
            continue
        n += linea.count(literal)
    return n



print("== 1. el localizador ya apunta al proveedor ==")
check("el store vive bajo la raiz de thyrox", True,
      str(reach.agent_store_path()).startswith(str(reach.thyrox_root())))

print("== 2. el destino NO se fabrica: se declara o no hay ==")
# Mismo contrato que `register_session.destination_args()`, que ya lo cumple.
check("sin declaracion devuelve lista vacia, no ['--repo', 'docs']",
      [], reconcile_store._destination())
check("y el mecanismo no nombra a ningun consumidor en codigo", 0,
      _en_codigo(Path(reconcile_store.__file__), '"docs"'))

print("== 3. y el de RESULTADOS sigue colgando del consumidor — no es lo mismo ==")
# Correccion de esta misma prueba: la primera version afirmaba que
# `agent_results_dir()` deberia colgar de thyrox, y estaba mal. Es el hogar de
# `registro-de-agentes.md`, `delta-de-agentes.md` y los `.base-*.json`: lo que
# escriben los hooks DEL CLIENTE, que es del consumidor por definicion. Su
# propio docstring ya lo declaraba, y ya decia «ya no es el hogar del store».
#
# Los dos directorios se llamaban igual y son cosas distintas. Confundirlos
# habria "arreglado" algo que estaba bien.
# La prueba declara el consumidor porque aqui ELLA hace de consumidor: desde
# el cwd de thyrox, `consumer_root()` rehusa —y esa negativa es el caso 5—.
import os  # noqa: E402
os.environ[reach.CONSUMER_ROOT_VAR] = str(reach.root("docs"))
check("agent_results_dir() NO es el padre del store", True,
      agents_paths.agent_results_dir() != reach.agent_store_path().parent)
check("y no cuelga del proveedor", False,
      str(agents_paths.agent_results_dir()).startswith(str(reach.thyrox_root())))
del os.environ[reach.CONSUMER_ROOT_VAR]

print("== 5. sin consumidor declarado REHUSA, no devuelve el proveedor ==")
# El control que discrimina de verdad: devolver la raiz de thyrox haria que el
# llamador compusiera `<thyrox>/.claude/hooks` y leyera su vacio como «el
# consumidor no tiene hooks». Un cero que no distingue «no hay» de «no se».
try:
    agents_paths.consumer_root()
    check("rehusa desde el cwd del proveedor", True, False)
except agents_paths.ConsumerUnknownError as err:
    check("rehusa desde el cwd del proveedor", True, True)
    check("y el mensaje nombra la variable", True,
          reach.CONSUMER_ROOT_VAR in str(err))

print("== 4. el clon por defecto no se codifica en el proveedor ==")
# Se cuenta el literal en CODIGO, no en prosa: el docstring lo cita para
# explicar por que ya no esta, y contarlo ahi mediria el significante.
check("agents_paths no nombra un consumidor concreto en codigo", 0,
      _en_codigo(Path(agents_paths.__file__), '"docs"'))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
