"""Los dos hogares, del lado Python — y son DOS, no uno.

Gemelo de ``paths.ts`` de este mismo subsistema: la convencion medida en el
arbol es ``<subsistema>/paths.<ext>`` —``skills/paths.ts``, ``paths/reach.py``—,
no un modulo suelto por lenguaje.

La separacion, confirmada por el ejecutor 2026-09-06::

    <hogar declarado por THYROX_WORKBENCH_DIR>/
      <slug>-<ISO>/   manifest.json + instrumento + outputs/ + commits/

    .claude/eventos/
      <slug>-<ISO>/   rojo-de-partida · anulacion · verde

Son dos cosas con roles distintos y **no se colapsan**:

- El **banco** aloja el instrumento y lo que produce. Su hogar es del
  CONSUMIDOR: *«thyrox ya no dice que el primero cuelgue de .claude/. Puede
  colgar de ahi, o de otro sitio; lo declara quien lo usa. Lo unico que thyrox
  fija es que sin declaracion no hay hogar inventado.»*
- La **evidencia** aloja el episodio —el rojo de partida, su anulacion, el
  verde—. Su sitio es el mismo en THYROX y en cada consumidor: el par
  ``<estado>/<evidencia>``, por defecto ``.claude/eventos``. No viaja de arbol
  en arbol porque no es un parametro de sesion; los NOMBRES de sus dos
  segmentos si son declarables, y por eso tambien llevan sus dos entradas.

Las DOS ENTRADAS del hogar del banco, con el nombre de cada una
---------------------------------------------------------------

Directiva del ejecutor 2026-09-06: *«todas las que requieran cablear el hogar
de algo definiendo una ruta, todas ellas la ruta tiene que ser pasada por una
CONSTANTE, y con dos entradas, ambas de entorno»*. Su ilustracion las nombra por
separado y no son la misma cosa mirada dos veces::

    worker_config   = get_secret("WORKER_CONFIG")        <- el VALOR, directo
    env_config_yaml = get_secret_str("CONFIG_FILE_PATH") <- la RUTA del archivo
                                                            que lo declara

Las tres constantes que cablean un hogar aqui llevan su entrada 1 —el valor—
y comparten la entrada 2 —la ruta del archivo que puede declararlas—, porque el
archivo es uno solo::

    STATE_DIR_VAR       THYROX_STATE_DIR       -> state_dir()
    EVIDENCE_DIR_VAR    THYROX_EVIDENCE_DIR    -> evidence_dir()
    WORKBENCH_DIR_VAR   THYROX_WORKBENCH_DIR   -> workbench_dir()
    WORKBENCH_ENV_FILE_VAR = THYROX_ENV_FILE   <- entrada 2, comun a las tres

``env_value`` de ``paths.reach`` las consulta en ese orden — el proceso primero,
porque quien exporta para UNA invocacion esta corrigiendo a proposito lo que el
archivo dice para todas.

Las tres se resuelven **en una funcion**, no en una constante de modulo: una
constante se evalua al importar, y ese es el defecto exacto que el docstring de
``paths/reach.py`` ya nombra. Lo que si difiere entre ellas es el desenlace sin
declaracion: ``state_dir`` y ``evidence_dir`` caen a un default y
``workbench_dir`` REHUSA. La asimetria es deliberada y esta justificada donde
cada una se declara.

NO son dos fuentes de verdad para el mismo dato: son dos VIAS de declaracion de
un dato unico. Una decide para esta invocacion, la otra para el arbol.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths.reach import ENV_FILE_VAR, env_value  # noqa: E402

#: Entrada 1 de la zona de estado — el valor.
STATE_DIR_VAR = "THYROX_STATE_DIR"

#: Lo que vale si nadie lo declara. A diferencia del hogar del banco, aqui SI
#: hay default y no se rehusa: un nombre de segmento no decide donde aterrizan
#: las piezas —el arbol ya esta resuelto cuando se consulta—, solo como se
#: llama el tramo dentro de el. Rehusar apagaria a sus tres consumidores por una
#: declaracion que casi ningun arbol necesita cambiar.
STATE_DIR_DEFAULT = ".claude"

#: Entrada 1 del directorio de evidencia — el valor.
EVIDENCE_DIR_VAR = "THYROX_EVIDENCE_DIR"

#: Su default, por el mismo criterio que ``STATE_DIR_DEFAULT``.
EVIDENCE_DIR_DEFAULT = "eventos"

#: Entrada 1 — el valor: el hogar del banco, declarado directamente.
WORKBENCH_DIR_VAR = "THYROX_WORKBENCH_DIR"

#: Entrada 2, y es **una sola para las tres**: la ruta del archivo que puede
#: declararlas. Se re-exporta del localizador del ``.env`` en vez de
#: re-declararse —escribir el nombre otra vez crearia la segunda fuente de
#: verdad que este modulo existe para no tener— y no se declina por constante
#: porque el archivo es el mismo: tres nombres para un archivo unico serian esa
#: misma duplicacion, repartida.
WORKBENCH_ENV_FILE_VAR = ENV_FILE_VAR


def state_dir(start: str | Path | None = None) -> str:
    """El segmento de estado declarado, o su default.

    Se resuelve **al llamar**, no al importar. La distincion no es de estilo: el
    docstring de ``paths.reach`` ya nombra el defecto de la otra forma —una
    constante de modulo se evalua al importar, asi que un consumidor que declare
    la variable **despues** del ``import`` no la ve, y ningun test puede
    variarla; el mecanismo era, literalmente, no comprobable—.
    """
    return env_value(STATE_DIR_VAR, Path(start) if start else None) or STATE_DIR_DEFAULT


def evidence_dir(start: str | Path | None = None) -> str:
    """El segmento de evidencia declarado, o su default. Ver ``state_dir``."""
    return (env_value(EVIDENCE_DIR_VAR, Path(start) if start else None)
            or EVIDENCE_DIR_DEFAULT)


class WorkbenchHomeError(Exception):
    """Se rehusa cuando el consumidor no declaro su hogar. No es fallo del emisor."""


def workbench_dir(start: str | Path | None = None) -> Path:
    """El hogar declarado del banco, o rehusar.

    Por que NO hay default: ``agents_dir`` y ``skills_dir`` caen al hogar propio
    de THYROX porque resuelven artefactos DE THYROX, sobre los que si decide. Un
    banco vive en el arbol del CONSUMIDOR y lo producen sus sesiones; un default
    aqui es exactamente la decision que la directiva retira al emisor.

    NO se verifica que el directorio exista, por el mismo criterio que
    ``agents_dir``: un hogar declarado y ausente es un hecho del consumidor que
    su llamador tiene que poder ver.
    """
    declared = env_value(WORKBENCH_DIR_VAR, Path(start) if start else None)
    if declared:
        return Path(declared)
    raise WorkbenchHomeError(
        "El hogar del banco no esta declarado. Es una decision del consumidor, "
        f"no de THYROX: declara {WORKBENCH_DIR_VAR} en el proceso, o en el "
        f"archivo que nombra {WORKBENCH_ENV_FILE_VAR} (por defecto el .env del "
        "arbol). NO se emite un hogar por defecto: inventarlo decidiria por ti "
        "donde van tus piezas."
    )


def is_evidence_path(path: str | Path, start: str | Path | None = None) -> bool:
    """¿La ruta cae bajo la evidencia de algun arbol?

    Se mide el PAR de segmentos adyacentes ``.claude/eventos``, nunca el nombre
    suelto. El nombre suelto casaria con cualquier ``eventos/`` de producto, y
    un gate que lo usara para excluir dejaria de medir codigo real **sin emitir
    ninguna señal** — el sub-patron D de ``metrica-decide-la-conclusion.md``.

    ``start`` es el punto de partida para localizar el ``.env``, igual que en
    ``workbench_dir``: los dos segmentos del par son declarables.
    """
    parts = Path(path).parts
    state, evidence = state_dir(start), evidence_dir(start)
    return any(parts[i] == state and parts[i + 1] == evidence
               for i in range(len(parts) - 1))


def is_workbench_path(path: str | Path, start: str | Path | None = None) -> bool:
    """¿La ruta cae bajo el hogar DECLARADO del banco?

    Sin declaracion devuelve ``False`` en vez de rehusar, y la direccion del
    error importa: sin hogar declarado no hay banco, asi que **nada** se excluye
    y el gate mide de mas, no de menos. Rehusar aqui apagaria el gate entero por
    una decision que el consumidor todavia no tomo.
    """
    try:
        home = workbench_dir(start).resolve()
    except WorkbenchHomeError:
        return False
    candidate = Path(path)
    if not candidate.is_absolute():
        candidate = (Path.cwd() / candidate)
    try:
        candidate.resolve().relative_to(home)
    except ValueError:
        return False
    return True


def is_measurement_artifact(path: str | Path,
                            start: str | Path | None = None) -> bool:
    """La union: evidencia de un episodio, o pieza del banco declarado.

    Es lo que un gate consulta para saltar lo que NO es codigo de producto de
    este arbol. Se llama por lo que las dos mitades tienen en comun —son
    artefactos de un episodio de medicion— y no «banco», que nombra sólo a una.
    """
    return is_evidence_path(path, start) or is_workbench_path(path, start)
