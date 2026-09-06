#!/usr/bin/env python3
"""Stub de reexportación — el dueño canónico es THYROX.

    Canonical owner: thyrox: src/gates/hook_script_token.py

El gate mide **los cinco clones**, no este repo: su hogar es el producto
(``thyrox``), no la configuración de un consumidor. Se portó en P5 del orden de
mudanza (:ref:`h-docs-1074` cerró su precondición, el mecanismo de alcance).

Este archivo se conserva porque sus consumidores lo invocan **por su ruta**:
``thyrox-audit.sh`` y ``.claude/scripts/tests/test-hook-script-token.sh``.
Reapuntarlos a la ruta del dueño es un cambio aparte; el stub hace que el porte
no dependa de él.

Qué añade sobre un reexport pelado, y por qué:

``CHECK_HOOK_TOKEN_REPOS_ROOT``
    La suite de este repo apunta el gate a un árbol sintético con esa variable.
    El dueño no la conoce —su vía es ``--tree-root``, que es explícita— así que
    el stub la traduce. Retirarla habría roto la suite sin medir nada del
    porte, que es exactamente el control que no discrimina.

Uso: idéntico al del dueño.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

SCRIPT_PATH = Path(__file__).resolve()
OWNER_CLONE = "thyrox"
OWNER_MODULE = "src/gates/hook_script_token.py"
OWNER_ROOT_VAR = "THYROX_ROOT"

#: La variable histórica de la suite de ESTE repo. El dueño la ignora.
SUITE_TREE_ROOT_VAR = "CHECK_HOOK_TOKEN_REPOS_ROOT"


def _owner_path() -> Path:
    """La ruta del módulo del dueño: la variable, el hermano, o el vecino.

    El tercer paso es el que faltaba. Esta aritmética
    —``SCRIPT_PATH.parents[3].parent / 'thyrox' / …``— valía cuando este gate
    era un stub en ``kaupamex-docs/.claude/scripts/gates/``: parents[3] era el
    clon, ``.parent`` el árbol, y ``+ thyrox`` el hermano. Desde
    ``thyrox/src/gates/`` da ``/home/thyrox``, que no existe — el gate busca a
    thyrox como hermano de SÍ MISMO.

    Medido por el corredor contra el consumidor real: publicaba FALLA con «el
    dueño canónico no está», que se lee como violación de la regla y es una
    ruta rota. El dueño está **en el mismo directorio**, así que se prueba ahí
    antes de componer nada.
    """
    declared = os.environ.get(OWNER_ROOT_VAR)
    if declared:
        return Path(declared) / OWNER_MODULE

    # El vecino: gate y dueño son hermanos desde que los dos viven en thyrox.
    neighbour = SCRIPT_PATH.parent / Path(OWNER_MODULE).name
    if neighbour.is_file():
        return neighbour

    # El dueño se localiza por su MARCADOR, no por aritmética: la forma
    # anterior buscaba a thyrox como hermano de sí mismo (`/home/thyrox`).
    return reach.thyrox_root() / OWNER_MODULE


def _load_owner():
    """Importa el módulo del dueño POR NOMBRE, no por ruta.

    ``spec_from_file_location`` crearía clases distintas de las del dueño: un
    ``except`` contra su excepción no atraparía la que este módulo alza. Con
    ``sys.path`` + import por nombre el objeto es el mismo, y ``sys.modules``
    lo cachea.
    """
    path = _owner_path()
    if not path.is_file():
        raise SystemExit(
            f"ERROR — el dueño canónico no está: {path}\n"
            f"        Declara {OWNER_ROOT_VAR} o clona {OWNER_CLONE} como hermano.\n"
            f"        NO se emite un conteo: un 0 aquí sería un verde falso."
        )
    src = str(path.parent.parent)          # …/thyrox/src
    if src not in sys.path:
        sys.path.insert(0, src)
    from gates import hook_script_token
    return hook_script_token


_owner = _load_owner()

SETTINGS_NAMES = _owner.SETTINGS_NAMES
SEPARATORS = _owner.SEPARATORS
SOUND_SHAPE = _owner.SOUND_SHAPE
segments = _owner.segments
is_path = _owner.is_path
classify = _owner.classify
declared_commands = _owner.declared_commands
repo_root = _owner.repo_root


def main(argv: list[str] | None = None) -> int:
    """Traduce la variable de la suite al ``--tree-root`` del dueño."""
    argv = list(sys.argv[1:] if argv is None else argv)
    suite_root = os.environ.get(SUITE_TREE_ROOT_VAR)
    if suite_root and "--tree-root" not in argv:
        argv += ["--tree-root", suite_root]
    return _owner.main(argv)


if __name__ == "__main__":
    sys.exit(main())
