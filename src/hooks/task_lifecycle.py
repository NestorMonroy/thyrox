#!/usr/bin/env python3
"""El puente entre el ciclo de vida de una tarjeta del cliente y el store.

Cierra el disparo que ``TASK-DOCS-0404`` lleva abierto: el mecanismo de acuñado
—``board_sync.mint_created_card``— existia con **cero invocadores de
produccion**, asi que la cita durable se acuñaba a mano y a posteriori. Este
modulo es su unico consumidor real.

El evento es ``TaskCreated``, no un ``PostToolUse`` con matcher
------------------------------------------------------------------
La tarjeta declaraba el plan asi: *«un hook PostToolUse con matcher
TaskCreate|TaskUpdate»*, y lo dejaba bloqueado por no conocer la forma del
``tool_response``. Medido en el ejecutable vendorizado
(``_references/claude-code-bin/2.1.266/claude_strings.txt``), el plan apuntaba
al evento equivocado: el cliente tiene un evento **dedicado** en su enum de 33
—``"TeammateIdle","TaskCreated","TaskCompleted"``— cuyo payload trae el
identificador directamente.

Su propia ayuda lo declara verbatim: *«Input to command is JSON with task_id,
task_subject, task_description, teammate_name, and team_name»*, y el
despachador lo compone igual: ``hook_event_name:"TaskCreated", task_id:e,
task_subject:n, task_description:r, teammate_name:o, team_name:d``.

O sea que **no hay nada que derivar**: el ordinal viaja en el payload. Eso
cierra el DESCONOCIDO que ``board_sync`` dejo escrito, con exactamente la
condicion que aquel DESCONOCIDO fijo — *«que exista un fixture del que se pueda
leer donde viaja el id»*.

Nunca rompe el turno
--------------------
Un hook que revienta deja al cliente con una traza y el trabajo sin hacer. El
contrato es salir 0 siempre y emitir el motivo por ``stderr``: un acuñado que
no ocurre es deuda, un turno roto es una interrupcion. Mismo criterio que
``save_result.mjs`` ya ejerce.

*Metrica:* el payload JSON del cliente por ``stdin``, leido por sus propias
claves (``hook_event_name``, ``session_id``, ``task_id``).
*Ciega a:* una tarjeta creada mientras el hook no esta cableado — el acuñado es
en el alta, no un barrido; la reconciliacion posterior es
``bin/task_ids ingerir-board``. Y ciega a que el board haya escrito ya el
archivo de la tarjeta: si el cliente despacha el evento antes de escribirlo,
``mint_created_card`` no la encuentra y este modulo lo reporta sin fallar.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


from agents import agents_paths  # noqa: E402
from task import board_sync  # noqa: E402

#: Los eventos del ciclo de vida que este modulo atiende, y que hace con cada
#: uno. El alta ACUÑA; el cierre NO — sincroniza la fila que la cita ya nombra.
#: Separarlos es el mecanismo, no una comodidad: acuñar en el cierre daria al
#: mismo trabajo una fila y una cita mas cada vez que se cierra.
HANDLED_EVENTS = ("TaskCreated", "TaskCompleted")


def read_payload(stream) -> dict:
    """El payload del cliente, o un dict vacio si no es legible.

    Devuelve vacio en vez de levantar: quien llama es un hook, y un hook que
    revienta ante una entrada rara cuesta el turno entero.
    """
    try:
        raw = stream.read()
    except Exception:
        return {}
    if not raw or not raw.strip():
        return {}
    try:
        payload = json.loads(raw)
    except (ValueError, TypeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def handle(payload: dict, store_path, board_dir=None, layer=None) -> dict:
    """Despacha el payload a su mecanismo, y declara por que si no hace nada."""
    event = payload.get("hook_event_name")
    session = payload.get("session_id")
    ordinal = payload.get("task_id")

    if event not in HANDLED_EVENTS:
        return {"acted": False,
                "reason": f"evento no atendido: {event!r}"}
    if not session or ordinal in (None, ""):
        return {"acted": False,
                "reason": ("el payload no trae session_id y task_id; sin los "
                           "dos no se sabe que fila tocar")}

    if event == "TaskCreated":
        resultado = board_sync.mint_created_card(
            store_path, session, ordinal, board_dir=board_dir, layer=layer,
            tool_name=event)
        return {"acted": resultado.acted, "reason": resultado.reason,
                "minted": resultado.minted}

    # `TaskCompleted`: el estado lo lleva el reconciliador, que aparea la
    # tarjeta con su fila. No se acuña — la cita ya existe desde el alta.
    return {"acted": False,
            "reason": ("cierre: la cita ya se acuño en el alta; el estado "
                       "converge por `board_sync reconciliar-estados`")}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--store", default=None,
                        help="el store destino; por defecto el del proveedor")
    parser.add_argument("--board", default=None,
                        help="directorio de tarjetas (default: el de la sesion)")
    parser.add_argument("--capa", default=None,
                        help="capa declarada de la cita")
    args = parser.parse_args(argv)

    payload = read_payload(sys.stdin)
    store = Path(args.store) if args.store else agents_paths.agent_store_path()
    try:
        resultado = handle(payload, store, board_dir=args.board,
                           layer=args.capa)
    except Exception as error:                      # noqa: BLE001
        # Deliberadamente ancho: el contrato del hook es no romper el turno.
        print(f"task_lifecycle: no se acuño ({error})", file=sys.stderr)
        return 0
    if not resultado.get("acted"):
        print(f"task_lifecycle: {resultado.get('reason')}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
