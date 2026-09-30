"""Detector PreToolUse: el borrado cuyo destino empieza por una variable sin guarda.

El chequeo de seguridad del cliente rehúsa un ``rm`` cuyo destino empieza
por una expansión sin guarda (``$W/…``, ``"$W"/…``, ``${W}/…``): si la
variable está vacía, el destino cuelga de ``/``. Y no rehúsa ese paso sino
el comando entero, así que en un comando de varios pasos no corre ninguno y
no queda salida que leer. Este detector avisa antes de enviarlo, con la
forma que el cliente acepta: ``"${W:?}"/…``, que aborta el shell si la
variable falta en vez de borrar.

El chequeo del cliente lee también el cuerpo de un heredoc —puede volver a
interpretarse como órdenes—, así que aquí los heredocs no se descartan:
dentro de uno, la salida es escribir el archivo con ``Write``.

*Ciega a:* el destino compuesto en tiempo de ejecución (``rm $(…)``, un
``eval``) y el ``rm`` que llega por ``xargs`` o ``find -delete``. Avisa, no
bloquea: el bloqueo ya lo hace el cliente; lo que falta es verlo antes.
"""
from __future__ import annotations

import re

from hooks.shell_text import strip_heredoc_bodies  # noqa: E402

#: Separadores de paso en una línea de shell.
_SEGMENTS = re.compile(r"&&|\|\||;|\||\n")

#: ``rm`` en posición de orden: al principio de una línea, tras un separador,
#: un paréntesis o una palabra que introduce una orden.
_REMOVAL = re.compile(r"(?:^|[;&|(\n]|\b(?:sudo|then|do|else))[ \t]*rm(?=[ \t])")

#: Fin de los argumentos de una orden.
_ARGUMENTS_END = re.compile(r"[;&|)\n]")

#: Un destino que empieza por una expansión: ``$W``, ``"$W"``, ``${W}``.
_LEADING_EXPANSION = re.compile(r"""^(["']?)\$(?:\{([A-Za-z_][A-Za-z0-9_]*)([^}]*)\}|([A-Za-z_][A-Za-z0-9_]*))(\1)(.*)$""")


def _unguarded_targets(text: str) -> list[str]:
    """Los destinos de cada ``rm`` de ``text`` que empiezan por una variable sin guarda."""
    found: list[str] = []
    for match in _REMOVAL.finditer(text):
        rest = text[match.end():]
        end = _ARGUMENTS_END.search(rest)
        words = (rest[: end.start()] if end else rest).split()
        for word in words:
            if word.startswith("-"):
                continue
            expansion = _LEADING_EXPANSION.match(word)
            if expansion and not (expansion.group(3) or "").startswith(":?"):
                found.append(word)
    return found


def guarded_form(target: str) -> str:
    """El destino con la guarda ``${NAME:?}``, que aborta si la variable falta."""
    expansion = _LEADING_EXPANSION.match(target)
    if not expansion:
        return target
    name = expansion.group(2) or expansion.group(4)
    return f'"${{{name}:?}}"{expansion.group(6)}'


def detect(payload: dict) -> str | None:
    """El aviso, o ``None`` si ningún ``rm`` empieza por una variable sin guarda."""
    if payload.get("tool_name") not in (None, "Bash"):
        return None
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or not command.strip():
        return None
    targets = _unguarded_targets(command)
    if not targets:
        return None
    outside_heredoc = strip_heredoc_bodies(command)
    in_heredoc = [t for t in targets if t not in _unguarded_targets(outside_heredoc)]
    steps = [s for s in _SEGMENTS.split(outside_heredoc) if s.strip()]
    lines = [
        "BORRADO SIN GUARDA — el chequeo de seguridad del cliente rehúsa un `rm` "
        "cuyo destino empieza por una variable sin guarda: vacía, el destino cuelga de `/`.",
    ]
    for target in targets:
        if target in in_heredoc:
            lines.append(
                f"  `{target}` va dentro de un heredoc y el cliente lo lee igual: "
                "escribe ese archivo con `Write`, no con `cat <<EOF`.")
        else:
            lines.append(f"  `{target}` → `{guarded_form(target)}`")
    if len(steps) > 1:
        lines.append(
            f"Este comando tiene {len(steps)} pasos y el rechazo cae sobre el comando "
            "entero: ninguno corre. Lleva el borrado en una llamada propia.")
    return "\n".join(lines)
