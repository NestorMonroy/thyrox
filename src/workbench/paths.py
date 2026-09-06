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
  verde—. Su nombre es fijo y su sitio tambien: ``.claude/eventos``, en THYROX
  y en cada consumidor. No viaja porque no es un parametro: es donde la sesion
  deja constancia de lo que midio.

Las DOS ENTRADAS del hogar del banco, con el nombre de cada una
---------------------------------------------------------------

Directiva del ejecutor 2026-09-06: *«todas las que requieran cablear el hogar
de algo definiendo una ruta, todas ellas la ruta tiene que ser pasada por una
CONSTANTE, y con dos entradas, ambas de entorno»*. Su ilustracion las nombra por
separado y no son la misma cosa mirada dos veces::

    worker_config   = get_secret("WORKER_CONFIG")        <- el VALOR, directo
    env_config_yaml = get_secret_str("CONFIG_FILE_PATH") <- la RUTA del archivo
                                                            que lo declara

Aqui: ``WORKBENCH_DIR_VAR`` lleva el valor y ``WORKBENCH_ENV_FILE_VAR`` lleva la
ruta del archivo que puede declararlo. ``env_value`` de ``paths.reach`` las
consulta en ese orden — el proceso primero, porque quien exporta para UNA
invocacion esta corrigiendo a proposito lo que el archivo dice para todas.

NO son dos fuentes de verdad para el mismo dato: son dos VIAS de declaracion de
un dato unico. Una decide para esta invocacion, la otra para el arbol.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths.reach import ENV_FILE_VAR, env_value  # noqa: E402

#: El segmento que abre la zona de estado de un arbol.
STATE_DIR = ".claude"

#: El nombre del directorio de evidencia. Fijo en los dos arboles.
EVIDENCE_DIR = "eventos"

#: Entrada 1 — el valor: el hogar del banco, declarado directamente.
WORKBENCH_DIR_VAR = "THYROX_WORKBENCH_DIR"

#: Entrada 2 — la ruta del archivo que puede declararlo. Se re-exporta del
#: localizador del ``.env`` en vez de re-declararse: escribir el nombre otra vez
#: crearia la segunda fuente de verdad que este modulo existe para no tener.
WORKBENCH_ENV_FILE_VAR = ENV_FILE_VAR


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


def is_evidence_path(path: str | Path) -> bool:
    """¿La ruta cae bajo la evidencia de algun arbol?

    Se mide el PAR de segmentos adyacentes ``.claude/eventos``, nunca el nombre
    suelto. El nombre suelto casaria con cualquier ``eventos/`` de producto, y
    un gate que lo usara para excluir dejaria de medir codigo real **sin emitir
    ninguna señal** — el sub-patron D de ``metrica-decide-la-conclusion.md``.
    """
    parts = Path(path).parts
    return any(parts[i] == STATE_DIR and parts[i + 1] == EVIDENCE_DIR
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
    return is_evidence_path(path) or is_workbench_path(path, start)
