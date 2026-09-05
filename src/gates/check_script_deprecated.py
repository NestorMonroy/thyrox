#!/usr/bin/env python3
"""Stub de reexportación — el dueño canónico es THYROX.

    Canonical owner: thyrox: src/gates/script_deprecated.py

El gate mide **los cinco clones**, no este repo: su hogar es el producto
(``thyrox``), no la configuración de un consumidor. Se portó en P5 del orden de
mudanza — que es la opción (c) que el propio docstring del original difería a
la tarea **#90**.

Este archivo se conserva porque sus consumidores lo invocan **por su ruta**:
``thyrox-audit.sh`` y ``.claude/scripts/tests/test-script-deprecated.sh``.
Reapuntarlos a la ruta del dueño es un cambio aparte; el stub hace que el porte
no dependa de él.

A diferencia de sus dos hermanos, este gate **no tiene variable de override**:
su suite le nombra las raíces por argumento, que ya es la vía explícita. Así que
el stub no traduce nada — sólo delega.

Uso: idéntico al del dueño.
"""

import os
import sys
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve()
OWNER_CLONE = "thyrox"
OWNER_MODULE = "src/gates/script_deprecated.py"
OWNER_ROOT_VAR = "THYROX_ROOT"


def _owner_path() -> Path:
    """La ruta del módulo del dueño: la variable, o el clon hermano."""
    declared = os.environ.get(OWNER_ROOT_VAR)
    if declared:
        return Path(declared) / OWNER_MODULE
    return SCRIPT_PATH.parents[3].parent / OWNER_CLONE / OWNER_MODULE


def _load_owner():
    """Importa el módulo del dueño POR NOMBRE, no por ruta.

    ``spec_from_file_location`` crearía clases distintas de las del dueño: un
    ``except`` contra su excepción no atraparía la que este módulo alza.
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
    from gates import script_deprecated
    return script_deprecated


_owner = _load_owner()

ROOTS = _owner.ROOTS
EXCLUDE = _owner.EXCLUDE
HEADER_KEYS = _owner.HEADER_KEYS
GUARD = _owner.GUARD
review = _owner.review
scan = _owner.scan
resolve_roots = _owner.resolve_roots
main = _owner.main


if __name__ == "__main__":
    sys.exit(main())
