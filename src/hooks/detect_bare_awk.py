"""detect_bare_awk — ``awk`` a secas en posición de comando.

El defecto que ataja
--------------------
En Debian ``awk`` resuelve por ``/etc/alternatives/awk``, y en este contenedor
apunta a mawk, que revienta ante un cuantificador de intervalo seguido de grupo
(``REcompile() - panic``, exit 100; h-docs-1068). Instalar gawk no cambia a
dónde apunta el nombre, así que la cadena declara cuál se usa:
``THYROX_TOOLCHAIN_AWK_BIN``, que el ``.env`` fija en ``gawk``. Episodio de
2026-09-23: con gawk instalado y declarado, los comandos de la sesión siguieron
escribiendo ``awk``.

Qué cuenta como invocación
--------------------------
``awk`` como primera palabra de un segmento (inicio, o tras ``;``, ``|``,
``&&``, ``||``, un salto de línea o ``$(``), saltando asignaciones
``VAR=valor``. Las cadenas entre comillas se vacían antes de mirar, así que la
palabra dentro de un ``echo`` o como argumento de ``grep`` no cuenta.

Ciega a: un ``awk`` invocado desde un guion o por ``xargs awk``. Mide la línea
que se escribe, no lo que ejecutan sus programas.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re

_QUOTED = re.compile(r"'[^']*'|\"(?:\\.|[^\"\\])*\"")
_SEGMENT = re.compile(r"\|\||&&|\$\(|[;|\n(]")
_ASSIGNMENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*=\S*")


def invokes_bare_awk(command: str) -> bool:
    """¿Algún segmento del comando empieza por ``awk``?"""
    unquoted = _QUOTED.sub("''", command)
    for segment in _SEGMENT.split(unquoted):
        words = segment.split()
        while words and _ASSIGNMENT.fullmatch(words[0]):
            words.pop(0)
        if words and words[0] == "awk":
            return True
    return False


def detect(payload: dict) -> str | None:
    """El aviso si el comando invoca ``awk`` por su nombre genérico."""
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or "awk" not in command:
        return None
    if not invokes_bare_awk(command):
        return None
    return (
        "AWK DECLARADO — este comando invoca `awk` a secas, que en Debian "
        "resuelve por `/etc/alternatives/awk` y aquí apunta a mawk (h-docs-1068). "
        "La cadena declara cuál usar: escribe `gawk`, o "
        "`\"$THYROX_TOOLCHAIN_AWK_BIN\"` si el comando tiene que servir a otro "
        "clon. `bin/check-toolchain-ready` mide cuál responde."
    )


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
