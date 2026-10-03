"""shell_text — lo que un comando de shell escribe como texto y no ejecuta.

Tres detectores de ``tool_use_preflight`` descartaban los cuerpos de
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


#: Un heredoc cuyo cuerpo lee una shell como programa: `bash <<M`, `sh -s <<M`,
#: `zsh <<M`. Su texto SÍ se ejecuta.
_SHELL_FED_HEREDOC = re.compile(r"(?:^|[\s;&|(])(?:bash|sh|zsh)(?:\s+-s)?\s*<<")


def strip_data_heredoc_bodies(command: str) -> str:
    """El comando sin los cuerpos de los heredocs que son DATOS.

    Como ``strip_heredoc_bodies``, salvo que conserva el comando entero cuando
    algún heredoc alimenta a una shell (``bash <<MARCA``): ese cuerpo es código
    que va a correr, y un detector que decide negar no puede perderlo de vista.
    """
    if any(_SHELL_FED_HEREDOC.search(line) for line in command.split("\n")):
        return command
    return strip_heredoc_bodies(command)


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


_QUOTED_SPAN = re.compile(r"'[^']*'|\"[^\"]*\"")

#: Shells cuyo ``-c`` recibe CÓDIGO, no un dato: el texto entre comillas que
#: lo sigue lo va a correr esa misma shell.
_EXECUTABLE_SHELLS = {"bash", "sh", "zsh"}

#: Palabras que tratan lo que sigue como EL COMANDO, aunque venga entre
#: comillas: ``eval`` lo evalúa, y ``env``/``nohup``/``xargs`` lo ejecutan tal
#: cual llega.
_EXECUTABLE_PRECEDING = {"eval", "env", "nohup", "xargs"}


def _is_executable_context(prefix: str) -> bool:
    """Si la comilla que sigue a ``prefix`` es código que una shell corre.

    La comilla por defecto es un dato: el valor de un ``flag``, el cuerpo de
    un ``printf``, un JSON por tubería. La excepción es angosta y nombrada:
    el argumento de ``bash -c``/``sh -c``/``zsh -c`` o ``eval``, y el comando
    que sigue a ``timeout N``, ``env``, ``nohup``, ``xargs``.
    """
    tokens = prefix.split()
    if not tokens:
        return False
    last = tokens[-1]
    if last == "-c":
        shell = tokens[-2].rsplit("/", 1)[-1] if len(tokens) >= 2 else ""
        return shell in _EXECUTABLE_SHELLS
    if last in _EXECUTABLE_PRECEDING:
        return True
    return last.isdigit() and len(tokens) >= 2 and tokens[-2] == "timeout"


def mask_data_quotes(command: str) -> str:
    """El comando con el CONTENIDO de sus comillas de DATOS vaciado.

    Un argumento entrecomillado es casi siempre un dato —el valor de un
    ``flag``, el cuerpo de un ``printf``, un JSON por tubería— y ese texto no
    lo ejecuta ninguna shell; un análisis léxico que lo trata como comando da
    falso positivo (medido: ``printf '%s' 'python3 src/…py'`` avisaba de una
    invocación que nunca corre). La excepción es cuando la comilla ES el
    código que una shell va a correr —ver ``_is_executable_context``—, y ahí
    el contenido se conserva intacto para que el resto del análisis lo siga
    viendo.
    """
    def replace(match: re.Match[str]) -> str:
        span = match.group(0)
        if _is_executable_context(command[:match.start()]):
            return span
        return "#" * len(span)

    return _QUOTED_SPAN.sub(replace, command)
