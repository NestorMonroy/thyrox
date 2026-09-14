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

from paths.reach import env_value, resolve_home  # noqa: E402
from workbench.paths import repo_of, state_dir  # noqa: E402

#: La variable de familia — declara el hogar de TODOS los clones a la vez.
#: Es el ultimo recurso antes del default, no la entrada principal: ver
#: `rules_home_name` para por que una sola clave no basta.
RULES_DIR_VAR = "THYROX_RULES_DIR"

#: El prefijo de la constante POR CLON. Misma forma que
#: `workbench.WORKBENCH_CLONE_PREFIX`, y no por simetria: la razon esta medida
#: en el docstring de `workbench_home_name` con dos episodios silenciosos.
RULES_CLONE_PREFIX = "THYROX_RULES_"

#: El segmento propio de esta familia, dentro del tramo de estado.
RULES_SEGMENT = "rules"


def rules_home_name(repo: str) -> str:
    """La constante por clon: ``db`` -> ``THYROX_RULES_DB``.

    Existe porque **un solo proceso resuelve varios arboles**, y una variable
    global no puede decir dos verdades a la vez. Medido antes de introducirla:
    con solo `RULES_DIR_VAR`, declarar el hogar de `db` le daba a `api`, a
    `docs`, a `server` y a `ui` **el hogar de db** — las cinco filas de
    `declarations.py` imprimian la misma ruta y ninguna avisaba.

    Ese fallo no revienta: las reglas se emiten al arbol equivocado y el clon
    que las esperaba sigue sin ellas. Es la forma que `workbench_home_name` ya
    registro para `THYROX_ENV_FILE`, un nivel mas abajo.

    La composicion se calca de `workbench_home_name` a proposito: dos familias
    con dos gramaticas de nombre obligarian a quien declara a recordar cual es
    cual, que es como se inventa la tercera.
    """
    return f"{RULES_CLONE_PREFIX}{repo.upper().replace('-', '_')}"


def default_rules_dir(root: str | Path) -> Path:
    """El hogar por defecto de un arbol dado, derivado del segmento declarado."""
    root = Path(root)
    return root / state_dir(root) / RULES_SEGMENT


def consumer_rules_dir(root: str | Path) -> Path:
    """El hogar de las reglas de UN CONSUMIDOR, en tres pasos.

    La precedencia va de lo especifico a lo derivado, que es el mismo criterio
    que `reach` declara: una ruta que alguien escribio para ESTE clon no puede
    quedar anulada por una que se escribio para todos::

        THYROX_RULES_<CLONE>  ->  resuelta contra la raiz de ESE clon
        THYROX_RULES_DIR     ->  resuelta contra la raiz de cada clon
        derivado             ->  <raiz>/<tramo de estado>/rules

    Las dos variables se leen CON la raiz del consumidor como punto de partida,
    para que sea SU ``.env`` el que declare su hogar y no el del proveedor. Y
    su valor pasa por ``resolve_home``, que es lo que hace util a la clave de
    FAMILIA: como segmento relativo —``.claude/rules``— dice lo correcto para
    los cinco clones a la vez, porque se compone sobre la raiz de cada uno.
    Sin esa resolucion la clave de familia solo podia llevar una ruta absoluta,
    y una absoluta le da a los cinco el hogar de uno; medido antes de tenerla:
    las cinco filas de ``declarations.py`` imprimian la ruta de ``db``.

    Una ruta ABSOLUTA declarada en la clave de familia sigue colisionando, y es
    correcto que lo haga: quien escribe una absoluta esta nombrando un sitio
    concreto, no un patron.

    El clon se deriva de la ruta (`repo_of`) y no se pide como parametro: un
    llamador que tuviera que nombrarlo podria nombrar otro, y entonces el
    mecanismo resolveria el hogar de un arbol con la clave de otro — que es el
    defecto que `rules_home_name` cierra, reintroducido por la firma.
    """
    root = Path(root)
    repo = repo_of(root)
    if repo is not None:
        specific = env_value(rules_home_name(repo), root)
        if specific:
            return resolve_home(specific, root)
    family = env_value(RULES_DIR_VAR, root)
    if family:
        return resolve_home(family, root)
    return default_rules_dir(root)
