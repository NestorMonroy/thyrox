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

Avisa, no bloquea, como sus hermanos de ``tool_use_preflight``.
"""
from __future__ import annotations

import re
from pathlib import Path

#: La política de ejecución declarada, la misma que leen `agent-recommend` y
#: `headless-pool`.
from session.execution_policy import unmanaged_payloads_allowed  # noqa: E402

#: Qué es un payload lo decide el mismo clasificador que mide los comandos
#: largos en primer plano (suite, build, gate, migración).
from hooks.detect_foreground_long_command import LONG_FAMILIES, command_heads  # noqa: E402
from hooks.shell_text import mask_data_quotes, strip_data_heredoc_bodies  # noqa: E402

#: El código que `bash -c`/`sh -c`/`zsh -c` va a correr: su texto es un comando
#: más, y sus cabezas cuentan como las del comando exterior.
_SHELL_CODE = re.compile(r"\b(?:bash|sh|zsh)\s+-c\s+([\x27\"])(.*?)\1", re.S)

_ASSEMBLED = re.compile(r"\b(?:thyrox-bg|bg\.sh)\s+start\b")

#: La espera de un trabajo que ya está en el ledger. Es la forma que la regla
#: prescribe: el trabajo va al ledger y su espera al segundo plano del
#: cliente, que es lo único que notifica.
_LEDGER_WAIT = re.compile(
    r"\b(?:(?:thyrox-bg|bg\.sh)\s+wait|wait-jobs(?:\.sh)?\s+wait)\b")


def already_assembled(command: str) -> bool:
    """¿El comando ya lanza el trabajo por el ensamblador que lo registra?"""
    return bool(_ASSEMBLED.search(command) or _LEDGER_WAIT.search(command))


#: Una espera de observación: un bucle que sólo duerme hasta que algo aparece.
#: No ejecuta trabajo, así que la política no la niega.
_OBSERVATION_WAIT = re.compile(
    r"^\s*(?:timeout\s+\d+\s+)?(?:bash\s+-c\s+[\"'])?\s*(?:until|while)\b[^;]*;\s*do\s+sleep\b")

#: Una entrada declarada del plano de control invocada por su envoltorio de `bin/`.
_CONTROL_PLANE_CALL = re.compile(r"^\s*(?:bash\s+)?(?:\S*/)?bin/([\w.-]+)")

_CONTROL_PLANE_ENTRIES = Path(__file__).resolve().parents[1] / "session" / "control_plane_entries.tsv"

POLICY_DENY_NOTICE = (
    "POLÍTICA DE EJECUCIÓN — la política declarada (`controller.unmanagedPayloads: false`, "
    "`src/session/execution_policy.json`) no admite un payload fuera de la ejecución "
    "gestionada: en primer o en segundo plano, el controlador lo ejecutaría en el "
    "anfitrión, fuera del ledger y de una ExecutionUnit. Lánzalo con `bash bin/thyrox-bg start <nombre> --task "
    "TASK-<CAPA>-NNNN --kind <tipo> -- <comando>`; una entrada del plano de control "
    "(`src/session/control_plane_entries.tsv`) va por `thyrox-bg start <nombre> -- bin/<entrada>`."
)


def control_plane_entry_names() -> frozenset[str]:
    """Los nombres declarados en `control_plane_entries.tsv`."""
    try:
        lines = _CONTROL_PLANE_ENTRIES.read_text(encoding="utf-8").splitlines()
    except OSError:
        return frozenset()
    return frozenset(line.split("\t", 1)[0] for line in lines if line and not line.startswith("#"))


def is_declared_entry(command: str) -> bool:
    """¿Invoca el comando una entrada declarada del plano de control?"""
    match = _CONTROL_PLANE_CALL.match(command)
    return bool(match) and match.group(1) in control_plane_entry_names()


#: Lo que, además de las familias largas, es un payload: ejecutar un modelo o
#: la sonda de un banco. Ninguno es plano de control.
PAYLOAD_FAMILIES: tuple[tuple[str, str], ...] = LONG_FAMILIES + (
    ("una ejecución de modelo", r"(?:[\w./-]*/)?(?:bin/)?(?:local-models-qualify|cli\s+-p|thyrox\s+-p)\b|ollama\s+run\b"),
    ("la sonda de un banco", r"(?:[\w./-]*/)?\.claude/workbench/[\w.-]+/probes/"),
)


def payload_families(command: str) -> list[str]:
    """Las familias de payload que el comando ejecuta (no las que sólo nombra).

    El cuerpo de un heredoc de datos y el contenido de una comilla de datos no
    se ejecutan: el mensaje de un commit puede nombrar una cualificación. Lo
    que una shell sí corre —el cuerpo de `bash <<M`, el argumento de `bash -c`—
    se conserva.
    """
    executed = mask_data_quotes(strip_data_heredoc_bodies(command))
    inner = [m.group(2) for m in _SHELL_CODE.finditer(executed)]
    heads = [head for text in (executed, *inner) for head in command_heads(text)]
    return [label for label, pattern in PAYLOAD_FAMILIES
            if any(re.match(pattern, head) for head in heads)]


def executed_command(payload: dict) -> tuple[str, bool] | None:
    """El comando y si corre en el segundo plano del cliente: `Bash` con
    `run_in_background`, o un `Monitor`, que siempre corre así."""
    tool = payload.get("tool_name", "Bash")
    if tool not in ("Bash", "Monitor"):
        return None
    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command")
    if not isinstance(command, str):
        return None
    return command, tool == "Monitor" or tool_input.get("run_in_background") is True


def detect(payload: dict) -> str | dict | None:
    """La negación de un payload no gestionado si la política lo prohíbe; si
    no, el aviso de que el cliente, y no el árbol, lleva el trabajo a segundo
    plano."""
    executed = executed_command(payload)
    if executed is None:
        return None
    command, background = executed
    if already_assembled(command):
        return None
    # Todo lo que el cliente corre en segundo plano es trabajo fuera del
    # ledger; en primer plano, sólo lo que el clasificador reconoce como
    # payload. Una espera de observación o una entrada del plano de control
    # no lo son.
    exempt = bool(_OBSERVATION_WAIT.match(command)) or is_declared_entry(command)
    unmanaged = not exempt and (background or bool(payload_families(command)))
    if unmanaged and not unmanaged_payloads_allowed():
        return {"notice": POLICY_DENY_NOTICE, "decision": "deny"}
    if payload.get("tool_name", "Bash") != "Bash" or not background:
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
