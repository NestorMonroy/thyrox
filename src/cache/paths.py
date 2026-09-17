"""El hogar del indice — la quinta familia ``THYROX_<FAMILY>_<CLONE>``.

Las otras cuatro ya existen y esta se compone igual: workbench
(``workbench/paths.py``), jobs (``session/job_runs.py``), rules y reach. Dos
entradas por hogar, ambas de entorno, como fijo el ejecutor 2026-09-06: el
VALOR (``THYROX_CACHE_DIR``, o ``THYROX_CACHE_<CLONE>`` cuando un solo proceso
resuelve varios arboles) y la RUTA del archivo que puede declararlo
(``THYROX_ENV_FILE``, comun a todas).

A diferencia del hogar del banco, aqui SI hay default y no se rehusa: un indice
es material reconstruible, asi que un arbol sin declaracion no queda sin
mecanismo — queda con el indice bajo su zona de estado. Rehusar apagaria el
ahorro por una declaracion que casi ningun arbol necesita cambiar.
"""
from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from paths.reach import ENV_FILE_VAR, env_value  # noqa: E402
from workbench.paths import repo_of, state_dir  # noqa: E402
from paths.reach import creates_home  # noqa: E402 — reach no importa nada del proyecto al tope

#: Entrada 1 — el valor, global: una sola grafia para todos los arboles.
CACHE_DIR_VAR = "THYROX_CACHE_DIR"

#: El prefijo de la familia POR CLON: ``api`` -> ``THYROX_CACHE_API``.
#:
#: La grafia es la de sus cuatro hermanas y la razon es la misma que
#: ``job_runs.JOBS_CLONE_PREFIX`` ya deja medida: un solo proceso resuelve
#: varios arboles y una variable global no puede decir dos verdades a la vez;
#: ademas ``verify/check_env_contract_keys.py`` declara ``PREFIX = "THYROX_"``,
#: asi que una clave fuera del prefijo seria invisible a su gate.
CACHE_CLONE_PREFIX = "THYROX_CACHE_"

#: El segmento por defecto bajo la zona de estado. Hermano de ``jobs`` y
#: ``workbench``, no el mismo: un indice no es ni la salida de un proceso ni la
#: evidencia de un episodio — es material reconstruible que existe para no
#: rehacer trabajo.
CACHE_DIR_DEFAULT = "cache"

#: Entrada 2, una sola para toda la familia: la ruta del archivo que la declara.
CACHE_ENV_FILE_VAR = ENV_FILE_VAR


def cache_home_name(repo: str) -> str:
    """La constante por raiz: ``api`` -> ``THYROX_CACHE_API``."""
    return f"{CACHE_CLONE_PREFIX}{repo.upper().replace('-', '_')}"


@creates_home
def cache_dir(start: str | pathlib.Path | None = None) -> pathlib.Path:
    """El hogar del indice: el declarado por clon, el global, o el compuesto.

    Se resuelve **al llamar**, no al importar, por la misma razon que sus
    hermanas: una constante de modulo se evalua al importar, asi que un
    consumidor que declare la variable despues del ``import`` no la ve y ningun
    test puede variarla.
    """
    anchor = pathlib.Path(start) if start else pathlib.Path.cwd()

    # Import diferido, igual que en `workbench.workbench_dir` y por la misma
    # razon: `paths.reach` importa de vuelta y al tope del modulo seria ciclo.
    from paths.reach import (  # noqa: PLC0415
        ConsumerUnknownError, consumer_root, resolve_home, root as repo_root,
        thyrox_root,
    )
    from paths.declarations import record_fallback  # noqa: PLC0415

    # La familia POR CLON gana sobre la global: la declaracion mas especifica
    # manda, y es lo unico que impide que una variable exportada para un arbol
    # se aplique a otro.
    repo = repo_of(anchor)
    if repo:
        per_clone = env_value(cache_home_name(repo), anchor)
        if per_clone:
            return resolve_home(per_clone, repo_root(repo))

    declared = env_value(CACHE_DIR_VAR, anchor)
    if declared:
        # Ancla: la raiz del consumidor. Si no se puede saber cual es, una
        # relativa no se puede componer — se devuelve cruda y el llamador ve
        # la ruta que declaro, en vez de una compuesta contra un arbol que
        # este modulo eligio por su cuenta.
        try:
            return resolve_home(declared, consumer_root(start=anchor))
        except ConsumerUnknownError:
            return pathlib.Path(declared)

    # El compuesto: la raiz del CONSUMIDOR mas la zona de estado mas el
    # segmento. Antes se componia sobre el ancla que el llamador trajo, y eso
    # es el defecto home-by-cwd de #284/#286: invocado desde un subdirectorio
    # hondo el indice aterrizaba a media rama, un hogar distinto por cada
    # cwd. Medido antes de cerrarlo: partiendo de
    # `kaupamex-docs/source/gestion` daba `…/source/gestion/.claude/cache`.
    try:
        raiz = consumer_root(start=anchor)
    except ConsumerUnknownError:
        # El PROVEEDOR. `consumer_root` rehusa aqui —thyrox tambien lleva
        # `.claude/`, asi que el marcador no lo distingue— y esta familia NO
        # puede rehusar: su docstring lo declara, un indice es material
        # reconstruible y un arbol sin declaracion no queda sin mecanismo. Se
        # ancla en la raiz del proveedor, que es una DECISION explicita; lo
        # prohibido era heredarla del cwd, no tener default.
        raiz = thyrox_root()

    home = raiz / state_dir(anchor) / CACHE_DIR_DEFAULT
    record_fallback(
        CACHE_DIR_VAR, home,
        f"nadie lo declaro; sale de la raiz del arbol + la zona de estado + "
        f"{CACHE_DIR_DEFAULT}. Declaralo en el archivo que nombra "
        f"{CACHE_ENV_FILE_VAR} para ponerlo bajo tu control.",
    )
    return home
