#!/usr/bin/env python3
"""Stub de reexportación — el dueño canónico es THYROX.

    Canonical owner: thyrox: src/paths/reach.py

Este módulo **no implementa nada**: reexporta el mecanismo de alcance por
variable que vive en THYROX. La forma es el *re-export stub* que el análisis
del reparto de paquetes en ``ccb`` identificó como adoptable, y su razón es la
que ``calibration-verified-numbers.md`` fija: dos implementaciones del mismo
mecanismo son una segunda fuente de verdad, y su modo de fallo es silencioso —
divergen sin que nadie lo note hasta que dan respuestas distintas.

Por qué queda el archivo en vez de borrarse
--------------------------------------------

**12 archivos de este repo lo consumen** —``require_all`` 6 veces, ``reach`` 4,
``root`` 1, ``ReachRootError`` 1, más ``--env`` desde shell— y tres de ellos
son evidencia congelada bajo ``.claude/eventos/``, que no se reescribe. El stub
los deja funcionando sin tocarlos y mueve la propiedad en un solo archivo.

Qué GANAN los consumidores al pasar por aquí, sin cambiar una línea
--------------------------------------------------------------------

Las tres divergencias que THYROX introdujo contra defectos medidos:

1. ``root(repo)`` **lee** su constante por raíz, que aquí se declaraba y se
   ignoraba (:ref:`h-docs-1070`).
2. El padre se deriva por **ascenso con detección** en vez de por un offset
   fijo que sólo acierta a una profundidad.
3. Las grafías viven en **tuplas ordenadas** —``THYROX_REACH_ROOT`` primero,
   ``KAUPAMEX_ROOT`` después— en vez de cuatro nombres que cada guion inventaba
   (:ref:`h-docs-1071`). Las heredadas siguen resolviendo: ningún consumidor se
   rompe.

Y además el ``.env``, que este módulo nunca leyó.
"""
from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

#: El nombre del clon dueño. Vive aquí y no repetido porque es lo único que este
#: archivo sabe de THYROX.
OWNER_CLONE = "thyrox"
OWNER_MODULE = "src/paths/reach.py"

#: Permite apuntar a otro árbol sin editar el stub — misma razón que las
#: variables del propio mecanismo.
OWNER_ROOT_VAR = "THYROX_ROOT"


def _owner_path() -> Path:
    """La ruta del módulo dueño, declarada o hallada ascendiendo.

    El ascenso es el mismo algoritmo que THYROX usa para su árbol, y por la
    misma razón: no depende de cuántos niveles haya entre este archivo y la
    raíz, así que sobrevive a que el guion se mueva.
    """
    declared = os.environ.get(OWNER_ROOT_VAR)
    if declared:
        return Path(declared) / OWNER_MODULE
    here = Path(__file__).resolve().parent
    for level in (here, *here.parents):
        candidate = level / OWNER_CLONE / OWNER_MODULE
        if candidate.is_file():
            return candidate
    raise SystemExit(
        f"reach_roots: no se encontró el dueño canónico ({OWNER_CLONE}/{OWNER_MODULE}) "
        f"ascendiendo desde {here}.\n"
        f"  Este archivo es un stub de reexportación: la lógica vive en THYROX.\n"
        f"  Declara {OWNER_ROOT_VAR} o clona {OWNER_CLONE} como hermano de este repo.\n"
        "  NO se emite ningún conjunto de raíces: un consumidor que midiera sobre "
        "uno vacío publicaría un conteo que parece sano (H-API-335)."
    )


def _load_owner():
    """El módulo dueño, cargado por el sistema de importación de Python.

    **No se carga con** ``spec_from_file_location``, y la razón es un defecto
    medido: ese camino crea un módulo NUEVO en cada llamada, así que
    ``reach_roots.ReachRootError`` y el ``ReachRootError`` del dueño serían
    **clases distintas** y un ``except`` sobre una no atraparía la otra. El
    fallo sería silencioso — la excepción sube sin que nadie la vea venir.

    Poniendo el ``src`` del dueño en ``sys.path`` e importando por nombre, el
    caché de ``sys.modules`` garantiza una sola instancia, sea quien sea el
    primero en importar.
    """
    path = _owner_path()
    src = str(path.parent.parent)          # …/thyrox/src
    if src not in sys.path:
        sys.path.insert(0, src)
    from paths import reach                # noqa: PLC0415 — la ruta se compone arriba
    return reach


_owner = _load_owner()

# La superficie que los consumidores de este repo usan. Se enumera en vez de
# copiarse con `*` para que el contrato sea legible: quien lea este archivo ve
# exactamente qué se reexporta, sin ir al dueño a averiguarlo.
ReachRootError = _owner.ReachRootError
REACH_ROOTS = _owner.REACH_ROOTS
REPOS = _owner.REACH_ROOTS          # alias histórico; cuatro consumidores lo importan
CLONE_PREFIX = _owner.CLONE_PREFIX
TREE_ROOT_VARS = _owner.TREE_ROOT_VARS
EXTRA_ROOTS_VARS = _owner.EXTRA_ROOTS_VARS

clone_name = _owner.clone_name
clone_names = _owner.clone_names
env_names = _owner.env_names
root = _owner.root
roots = _owner.roots
extra_roots = _owner.extra_roots
reach = _owner.reach
paths = _owner.paths
require_all = _owner.require_all
read_env_file = _owner.read_env_file
env_value = _owner.env_value
tree_root = _owner.tree_root

main = _owner.main


if __name__ == "__main__":
    raise SystemExit(_owner._run(sys.argv))
