"""Las rutas que el subsistema de agentes necesita, resueltas por el mecanismo.

Existe porque la mudanza a thyrox movió catorce módulos tres niveles y cuatro
de ellos quedaron apuntando a directorios inexistentes — el defecto que el
docstring de ``reach.py`` declara y que falla **en silencio** hasta que alguien
invoca el módulo. Medido antes de escribir esto: ``agent_store.py`` buscaba
``reach_roots`` en ``src/``, ``backfill_agent_sessions.py`` un
``src/deprecated.py``, y ``drain_spool.py`` y ``reconcile_store.py`` un
``thyrox/hooks/`` que nunca existió.

La forma que se retira es ``parents[N]`` con N > 0: cuenta niveles del árbol de
ORIGEN. La que se conserva es ``Path(__file__).parent`` — un módulo siempre
sabe en qué directorio está, y eso no cambia al mover el árbol entero.

Dos universos, y no se mezclan:

- **thyrox** — ``paths/``, ``corpus/``, ``lib/``. Se resuelven ascendiendo
  hasta el marcador, igual que ``reach.thyrox_root``.
- **el consumidor** — ``.claude/hooks/`` y ``.claude/agent-results/``, que son
  del clon que thyrox sirve (DEC-04: el mecanismo es del proveedor, el
  parámetro es del consumidor). Su raíz sale de ``THYROX_CONSUMER`` si está
  declarada, y si no del clon ``docs``, que es donde vive el store — el default
  no es una preferencia de este módulo, es dónde está el dato.
"""
from __future__ import annotations

import sys
from pathlib import Path

#: El mismo marcador que `reach.THYROX_MARKER`. Se repite aquí y sólo aquí
#: porque este módulo es el arranque: no puede importar reach sin localizarlo.
_MARKER = Path("src") / "paths" / "reach.py"


def _ascend_to_marker() -> Path:
    here = Path(__file__).resolve()
    for level in (here.parent, *here.parents):
        if (level / _MARKER).is_file():
            return level
    raise RuntimeError(
        f"no se encontró la raíz de thyrox ascendiendo desde {here} "
        f"(marcador {_MARKER})"
    )


THYROX_ROOT = _ascend_to_marker()
PATHS_DIR = THYROX_ROOT / "src" / "paths"
CORPUS_DIR = THYROX_ROOT / "src" / "corpus"
LIB_DIR = THYROX_ROOT / "src" / "lib"

if str(PATHS_DIR) not in sys.path:
    sys.path.insert(0, str(PATHS_DIR))

import reach  # noqa: E402  — statement a nivel de módulo tras fijar sys.path

#: Reexportada, no redeclarada: la excepcion vive en el mecanismo desde
#: TASK-DOCS-0286. `drain_spool` la captura por este nombre, y dos clases con
#: el mismo nombre en dos modulos no se capturan la una a la otra — el
#: `except` de un llamador dejaria de ver el rehuse del otro.
ConsumerUnknownError = reach.ConsumerUnknownError


def consumer_root() -> Path:
    """La raíz del clon consumidor: su variable si está, si no el cwd.

    Nombraba un clon —`DEFAULT_CONSUMER = "docs"`, «porque ahí vive el
    store»—. Las dos mitades caducaron el 2026-09-07: el store se mudó al
    proveedor, y un clon concreto no se codifica en el mecanismo.

    El ascenso arranca del **directorio de trabajo**, no del archivo: quien
    llama aquí es un hook del cliente, y su cwd ES el clon consumidor. Partir
    de `__file__` daría el árbol de thyrox, que es el proveedor — que es la
    razón por la que la versión anterior no usaba `reach.consumer_root` sin
    argumentos.

    Y si el ascenso aterriza en el PROVEEDOR, se rehúsa. Devolverlo sería peor
    que no responder: el llamador compondría `<thyrox>/.claude/hooks` y leería
    su vacío como «el consumidor no tiene hooks». Es la forma de un cero que no
    distingue «no hay» de «no pude saber».

    Ese rehúse **ya no vive aquí**: bajó a `reach.consumer_root` en
    TASK-DOCS-0286, porque una defensa en el envoltorio no protege a los otros
    llamadores del mecanismo. Esta función queda como la puerta que fija el
    punto de partida —el cwd, que para un hook del cliente ES el consumidor— y
    delega el resto.
    """
    return reach.consumer_root(start=Path.cwd())


#: La misma grafía que `reach.ts` declara (`AGENTS_DIR_VAR`). La mitad Python
#: de reach no la expone todavía; se lee aquí para que las dos lenguas
#: respondan a la misma variable en vez de a dos.
AGENTS_DIR_VAR = "THYROX_AGENTS_DIR"


def agents_dir() -> Path:
    """El hogar de las definiciones de agente: su variable, si no el de thyrox.

    Es producto de thyrox, no del consumidor: las 31 definiciones viven en
    `src/agents/definitions/`. Antes se componía como `.claude/agents`
    RELATIVO, así que su `glob` dependía del cwd y devolvía cero sin error —
    un silencio que se lee como «no hay agentes».
    """
    declared = reach.env_value(AGENTS_DIR_VAR)
    return Path(declared) if declared else THYROX_ROOT / "src" / "agents" / "definitions"


def hooks_dir() -> Path:
    """`.claude/hooks/` del consumidor — el hogar de los hooks del cliente."""
    return consumer_root() / ".claude" / "hooks"


def agent_results_dir() -> Path:
    """`.claude/agent-results/` del consumidor — el hogar de su telemetria.

    Es el hogar de `registro-de-agentes.md`, `delta-de-agentes.md` y los
    `.base-*.json`: lo que los hooks del CLIENTE escriben, que es del consumidor
    por definicion. **Ya no es el hogar del store** — ver `agent_store_path`.
    """
    return consumer_root() / ".claude" / "agent-results"


def agent_store_path() -> Path:
    """El store, por el localizador declarado. Delega, no compone.

    Componerlo aqui como `agent_results_dir() / "agent_store.sqlite3"` lo ataba
    al consumidor, y desde el 2026-09-07 el store vive en thyrox salvo que
    `THYROX_AGENT_STORE` diga otra cosa. Dos composiciones de la misma ruta son
    dos fuentes de verdad que nadie sincroniza.
    """
    return reach.agent_store_path()
