"""detect_client_background — un trabajo largo lanzado con el segundo plano del CLIENTE.

El defecto que ataja
--------------------
``run_in_background: true`` es el segundo plano del cliente, no el del árbol.
Un trabajo lanzado así nace FUERA del ledger de ``wait-jobs``: la barrera no lo
ve, el Stop gate no lo retiene y no deja un marcador propio; el cliente sólo
avisa cuando termina. El árbol ya trae los ensambladores
(``.claude/rules/trabajo-en-segundo-plano.md``): ``bin/thyrox-bg start`` más
``register`` para uno, ``bin/run-task-pool`` para N con anchura y memoria
acotadas, y ``bin/wait-jobs`` como barrera. Episodio de 2026-09-23: una espera
``until grep`` y dos ``run-task-pool`` se lanzaron con el parámetro del cliente.

Qué mide
--------
El parámetro ``run_in_background`` de la herramienta ``Bash``, no el comando.
Calla cuando el comando ya viaja por ``thyrox-bg``, que registra el trabajo.

Ciega a: un trabajo desprendido a mano con ``nohup … &`` en primer plano, que
es el eje de ``detect_foreground_long_command``.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re

_ASSEMBLED = re.compile(r"\b(?:thyrox-bg|bg\.sh)\s+start\b")

#: La espera de un trabajo que ya está en el ledger. Es la forma que la regla
#: prescribe desde 2026-09-24: el trabajo va al ledger y su espera al segundo
#: plano del cliente, que es lo único que notifica.
_LEDGER_WAIT = re.compile(
    r"\b(?:(?:thyrox-bg|bg\.sh)\s+wait|wait-jobs(?:\.sh)?\s+wait)\b")


def already_assembled(command: str) -> bool:
    """¿El comando ya lanza el trabajo por el ensamblador que lo registra?"""
    return bool(_ASSEMBLED.search(command) or _LEDGER_WAIT.search(command))


def detect(payload: dict) -> str | None:
    """El aviso si el cliente, y no el árbol, lleva el trabajo a segundo plano."""
    if payload.get("tool_name", "Bash") != "Bash":
        return None
    tool_input = payload.get("tool_input") or {}
    if tool_input.get("run_in_background") is not True:
        return None
    command = tool_input.get("command")
    if not isinstance(command, str) or already_assembled(command):
        return None
    return (
        "SEGUNDO PLANO DEL ÁRBOL — `run_in_background` es el segundo plano del "
        "cliente: el trabajo nace fuera del ledger, la barrera no lo ve y no "
        "deja marcador. Para UN trabajo: `bash bin/thyrox-bg start <nombre> "
        "--memfree <tamaño> -- <comando>` y `bash bin/thyrox-bg register "
        "<nombre>`. Para N: `bin/run-task-pool --memfree <tamaño>`, lanzado a "
        "su vez con `thyrox-bg start`. Para recogerlos: `bin/wait-jobs status` "
        "sin bloquear, o su espera (`thyrox-bg wait <nombre>`) con "
        "`run_in_background`, que notifica al terminar."
    )


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
