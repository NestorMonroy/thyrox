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


def cache_dir(start: str | pathlib.Path | None = None) -> pathlib.Path:
    """El hogar del indice: el declarado por clon, el global, o el compuesto.

    Se resuelve **al llamar**, no al importar, por la misma razon que sus
    hermanas: una constante de modulo se evalua al importar, asi que un
    consumidor que declare la variable despues del ``import`` no la ve y ningun
    test puede variarla.
    """
    anchor = pathlib.Path(start) if start else pathlib.Path.cwd()

    repo = repo_of(anchor)
    if repo:
        declared = env_value(cache_home_name(repo), anchor)
        if declared:
            return pathlib.Path(declared)

    declared = env_value(CACHE_DIR_VAR, anchor)
    if declared:
        return pathlib.Path(declared)

    # El compuesto: la zona de estado del arbol mas el segmento. No se inventa
    # un arbol — se compone sobre el ancla que el llamador ya trajo.
    return anchor / state_dir(anchor) / CACHE_DIR_DEFAULT
