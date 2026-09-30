"""Detector PreToolUse: antes de una llamada a Bash, cuántas respuestas
seguidas del clasificador de auto mode llegaron sin veredicto en este turno.

El cliente corta el turno tras ``NO_VERDICT_TURN_LIMIT`` respuestas seguidas
sin veredicto (``hS`` en el binario 2.1.283). Es una falla del servicio, no
del comando, y sólo la sufren las llamadas que consultan al clasificador: en
la caída medida, Read, Grep, Write y Edit pasaron todas mientras cada Bash era
rechazado (banco ``classifier-no-verdict-*``). El aviso dice cuántas van y
cuántas quedan, y manda a esas herramientas para leer, buscar y editar.

No guarda estado: la racha se lee de la cola del transcript. Cuenta sólo los
resultados de Bash; un Bash que pasa, o un rechazo con veredicto, la corta, y
un mensaje genuino del usuario abre un turno nuevo.

*Ciega a:* un rechazo cuyo texto no reconozca ``classifier_rejection``, y a
otra herramienta que el cliente también someta al clasificador.
"""
from __future__ import annotations

from hooks.classifier_rejection import Rejection, classify_rejection
from hooks.transcript_tail import current_turn, tail_entries

#: Respuestas seguidas sin veredicto tras las que el cliente corta el turno.
NO_VERDICT_TURN_LIMIT = 10
#: A partir de cuántas restantes el aviso las cuenta.
REMAINING_WARNING = 2

_CLASSIFIED_TOOL = "Bash"


def _tool_names(entries: list[dict]) -> dict[str, str]:
    names = {}
    for entry in entries:
        if entry.get("type") != "assistant":
            continue
        for block in (entry.get("message") or {}).get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                names[block.get("id", "")] = block.get("name", "")
    return names


def _bash_results(entries: list[dict]) -> list[Rejection | None]:
    """Por cada resultado de Bash del turno, su rechazo o ``None`` si pasó."""
    names = _tool_names(entries)
    out: list[Rejection | None] = []
    for entry in entries:
        if entry.get("type") != "user":
            continue
        for block in (entry.get("message") or {}).get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_result" \
                    and names.get(block.get("tool_use_id", "")) == _CLASSIFIED_TOOL:
                out.append(classify_rejection(block.get("content"), is_error=block.get("is_error") is True))
    return out


def no_verdict_streak(entries: list[dict]) -> tuple[int, Rejection | None]:
    """La racha final de rechazos sin veredicto y el último de ellos."""
    streak, last = 0, None
    for rejection in _bash_results(current_turn(entries)):
        if rejection is None or rejection.kind == "judged":
            streak, last = 0, None
        else:
            streak, last = streak + 1, rejection
    return streak, last


def detect(payload: dict) -> str | None:
    """El aviso si la llamada a Bash llega tras respuestas sin veredicto."""
    transcript = payload.get("transcript_path")
    if payload.get("tool_name") != _CLASSIFIED_TOOL or not isinstance(transcript, str):
        return None
    streak, last = no_verdict_streak(tail_entries(transcript))
    if streak == 0 or last is None:
        return None
    remaining = NO_VERDICT_TURN_LIMIT - streak
    cause = f" ({last.cause})" if last.cause else ""
    lines = [
        (f"CLASIFICADOR SIN VEREDICTO — {streak} de {NO_VERDICT_TURN_LIMIT} respuestas "
         f"seguidas sin veredicto{cause}; en {NO_VERDICT_TURN_LIMIT} el cliente corta el turno."),
    ]
    if last.kind == "hard":
        lines.append("La última es una falla DURA: el clasificador no puede juzgar esa "
                     "acción. No reintentes la misma: cambia de camino o díselo al usuario.")
    else:
        lines.append("Es una falla del servicio, no del comando: un reintento por acción, tal cual.")
    if remaining <= REMAINING_WARNING:
        lines.append(f"Quedan {remaining}: no gastes otra en algo que no exija Bash.")
    lines.append("Para leer, buscar o editar usa Read, Grep, Glob, Write y Edit: no consultan "
                 "al clasificador. Deja Bash para lo que sólo Bash hace (pruebas, git, procesos).")
    return "\n".join(lines)
