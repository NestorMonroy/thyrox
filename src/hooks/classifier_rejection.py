"""Qué clase de rechazo del clasificador de auto mode trae un ``tool_result``.

El cliente arma el texto con plantillas fijas (``_references/claude-code-bin/
2.1.283/bunfs-root/chunk-csayct82.js``: la función que compone el mensaje y
``k2``, la que pone la causa entre paréntesis). Tres clases:

- ``transient`` — el clasificador no respondió por una falla suya (``error``,
  ``timed out``, ``rate-limited``…). La misma acción puede pasar después.
- ``hard`` — el clasificador no puede juzgar esta petición (p. ej. la
  conversación es demasiado larga). Repetirla da lo mismo.
- ``judged`` — hubo veredicto: la acción se consideró peligrosa.

*Ciega a:* un rechazo cuyo texto cambie en otra versión del cliente; se
reconoce por frases literales, no por un código estructurado.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

RejectionKind = Literal["transient", "hard", "judged"]

#: El tramo común a todo rechazo sin veredicto: `_ce` en el cliente.
_NO_VERDICT_MARK = "so auto mode cannot determine the safety of"
_HARD_MARK = "This is a hard failure"
_JUDGED_MARK = "judged this action dangerous"
_CAUSE = re.compile(r"(?:gave no verdict|is temporarily unavailable) \(([^)]*)\)")


@dataclass(frozen=True)
class Rejection:
    kind: RejectionKind
    #: La causa que el cliente pone entre paréntesis; ``None`` si no la da.
    cause: str | None


def _as_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(b.get("text", "") for b in content if isinstance(b, dict))
    return ""


def classify_rejection(content: object, *, is_error: bool) -> Rejection | None:
    """La clase del rechazo, o ``None`` si el contenido no es un rechazo del clasificador.

    El texto solo no basta: una salida de Bash que lo imprime (un ``cat``, un
    ``grep`` al binario) lo contiene igual. Un rechazo real llega marcado como
    error y su contenido EMPIEZA por el mensaje; un Bash que falla empieza por
    su código de salida.
    """
    if not is_error:
        return None
    text = _as_text(content)
    first_line = text.lstrip().split("\n", 1)[0]
    if _JUDGED_MARK in first_line:
        return Rejection("judged", None)
    if _NO_VERDICT_MARK not in first_line:
        return None
    match = _CAUSE.search(text)
    cause = match.group(1) if match else None
    return Rejection("hard" if _HARD_MARK in text else "transient", cause)
