#!/usr/bin/env python3
"""El hogar de las reglas emitidas — la mitad Python del mecanismo.

Existe por una razon concreta y no por simetria: ``paths/declarations.py`` es
el registro de todo hogar que THYROX resuelve por su cuenta, y su recorrido es
Python. Un hogar nuevo cuyo default no pase por ahi es un default SILENCIOSO —
el defecto que ese modulo existe para cerrar.

El tramo de estado NO se escribe aqui. Lo declara ``workbench.paths.state_dir``
(``THYROX_STATE_DIR``, default ``.claude``), que es donde vive la particion que
DEC-01 fija: producto en ``src/``, estado en ``.claude/``. Componer ``.claude``
a mano seria la segunda fuente de verdad de esa particion.

La mitad TypeScript (``src/rules/paths.ts``) declara las mismas dos constantes;
``tests/rules/test_paths_parity.py`` las ata para que no deriven.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Bootstrap canónico (`paths.reach.BOOTSTRAP`): ascenso con detección hasta
# el marcador, NO `parents[N]`. Un offset acierta a UNA profundidad y falla en
# silencio al mover el archivo; el ascenso sobrevive el cambio de anidamiento.
# Es el único punto donde `paths.reach` todavía no se puede importar — de ahí
# en adelante la raíz sale de `reach.thyrox_root()`, no de más aritmética.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths.reach import env_value  # noqa: E402
from workbench.paths import state_dir  # noqa: E402

#: Entrada 1: la variable que declara el hogar, por proceso o por `.env`.
RULES_DIR_VAR = "THYROX_RULES_DIR"

#: El segmento propio de esta familia, dentro del tramo de estado.
RULES_SEGMENT = "rules"


def default_rules_dir(root: str | Path) -> Path:
    """El hogar por defecto de un arbol dado, derivado del segmento declarado."""
    root = Path(root)
    return root / state_dir(root) / RULES_SEGMENT


def consumer_rules_dir(root: str | Path) -> Path:
    """El hogar de las reglas de UN CONSUMIDOR declarado.

    La variable se lee CON la raiz del consumidor como punto de partida, para
    que sea su ``.env`` el que declare su hogar y no el del proveedor. Sin
    ella, el default — que se registra como tal en ``declarations.py``.
    """
    declared = env_value(RULES_DIR_VAR, Path(root))
    if declared:
        return Path(declared)
    return default_rules_dir(root)
