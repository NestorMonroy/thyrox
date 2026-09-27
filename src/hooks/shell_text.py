"""shell_text — lo que un comando de shell escribe como texto y no ejecuta.

Tres detectores de ``pretooluse_dispatch`` descartaban los cuerpos de
heredoc, cada uno con su copia, y las copias no eran equivalentes: la de
``detect_irreversible_operation`` eliminaba además el resto de la línea del
``<<MARCA``, así que en ``cat <<EOF && git reset --hard`` el ``reset`` salía
del análisis. Un solo instrumento, en un solo sitio.
"""
from __future__ import annotations

import re

_HEREDOC_MARKER = re.compile(r"<<-?\s*(['\"]?)(\w+)\1")


def strip_heredoc_bodies(command: str) -> str:
    """El comando sin los cuerpos de sus heredocs: su texto no son comandos.

    Conserva la línea del ``<<MARCA`` entera —lo que sigue al marcador sí se
    ejecuta— y descarta desde la línea siguiente hasta la del terminador,
    incluida. Admite varios heredocs en una misma línea, en orden.
    """
    kept: list[str] = []
    pending_terminators: list[str] = []
    for line in command.split("\n"):
        if pending_terminators:
            if line.strip() == pending_terminators[0]:
                pending_terminators.pop(0)
            continue
        kept.append(line)
        pending_terminators.extend(m.group(2) for m in _HEREDOC_MARKER.finditer(line))
    return "\n".join(kept)


_REDIRECT_TARGET = re.compile(r"(?:>>?|\btee\s+(?:-a\s+)?)\s*(['\"]?)([^\s'\";&|<>]+)\1")


def heredoc_writes(command: str) -> list[tuple[str | None, str]]:
    """Cada heredoc del comando con el archivo al que escribe, en orden.

    El archivo es el destino de una redirección (``>``, ``>>``) o de ``tee`` en
    la línea del ``<<MARCA``; sin destino, el cuerpo va a la entrada de otro
    programa y el archivo es ``None``. Con varios heredocs en una línea, el
    destino se asigna al primero.
    """
    writes: list[tuple[str | None, str]] = []
    pending: list[tuple[str, str | None, list[str]]] = []
    for line in command.split("\n"):
        if pending:
            terminator, target, body = pending[0]
            if line.strip() == terminator:
                writes.append((target, "\n".join(body)))
                pending.pop(0)
            else:
                body.append(line)
            continue
        markers = [m.group(2) for m in _HEREDOC_MARKER.finditer(line)]
        redirect = _REDIRECT_TARGET.search(line.replace("<<", "\0\0"))
        target = redirect.group(2) if redirect else None
        for index, marker in enumerate(markers):
            pending.append((marker, target if index == 0 else None, []))
    return writes
