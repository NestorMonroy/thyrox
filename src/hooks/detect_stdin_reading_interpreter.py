"""Detector del interprete que lee stdin sin que nadie se la de.

El defecto, medido por conducta y no leido de un manual
--------------------------------------------------------
Un interprete sin guion (``python``, ``node``) o con ``-`` lee su programa de
stdin. En primer plano el stdin de la herramienta llega cerrado y el interprete
sale al instante. En SEGUNDO plano llega un tubo que no se cierra nunca, y
espera para siempre. Medido en este contenedor, con ``timeout 10`` y en
invocaciones separadas::

    primer plano   .venv/bin/python            -> exit 0
    segundo plano  .venv/bin/python            -> exit 124 (colgado)
    segundo plano  .venv/bin/python </dev/null -> exit 0

El cliente puede PROMOVER a segundo plano cualquier comando que tarda, asi que
la forma cuelga aunque se escriba para el primer plano, y todo lo que va detras
en la misma linea no corre. El episodio es el comando que registro
``H-THYROX-156``: llevaba dos interpretes desnudos, lo promovieron, y su edicion
del indice nunca ocurrio.

Que hace y que NO hace
-----------------------
Avisa cuando un segmento del comando invoca un interprete en posicion de comando
sin guion, ``-c`` ni ``-m``, y sin entrada provista: ni heredoc, ni tubo, ni
``<``. No bloquea, por la misma razon que sus hermanos: un patron lexico no
distingue el interprete olvidado del que se quiere interactivo.

Ciego a: el interprete que llega por variable (``$PY -``) o por alias, y un
stdin que otro proceso cierre a proposito.
"""
from __future__ import annotations

import re

from hooks.shell_text import strip_heredoc_bodies  # noqa: E402

#: Los interpretes que, sin programa, lo leen de stdin.
_INTERPRETER = re.compile(r"^(?:.*/)?(?:python(?:\d+(?:\.\d+)?)?|node)$")

#: Envoltorios que no cambian a quien pertenece el stdin.
_WRAPPERS = {"nohup", "exec", "command", "time"}

_TOKEN = re.compile(r"""'[^']*'|"[^"]*"|\S+""")
_ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
_REDIRECT = re.compile(r"^\d*(>>?|>&|<&|<(?!<))")


def _segments(command: str) -> list[str]:
    """Los segmentos entre ``;``, ``&&``, ``||``, ``&`` y saltos de linea,
    respetando comillas."""
    segments, current, quote = [], [], None
    i = 0
    while i < len(command):
        char = command[i]
        if quote:
            current.append(char)
            if char == quote:
                quote = None
        elif char in "'\"":
            quote = char
            current.append(char)
        elif command.startswith(("&&", "||"), i):
            segments.append("".join(current))
            current = []
            i += 1
        elif char in ";\n" or (char == "&" and not command.startswith("&>", i)
                               and (i == 0 or command[i - 1] not in "<>")):
            segments.append("".join(current))
            current = []
        else:
            current.append(char)
        i += 1
    segments.append("".join(current))
    return [s for s in segments if s.strip()]


def _stages(segment: str) -> list[str]:
    """Las etapas de un tubo, respetando comillas."""
    stages, current, quote = [], [], None
    for char in segment:
        if quote:
            current.append(char)
            if char == quote:
                quote = None
        elif char in "'\"":
            quote = char
            current.append(char)
        elif char == "|":
            stages.append("".join(current))
            current = []
        else:
            current.append(char)
    stages.append("".join(current))
    return stages


def _stdin_reader(stage: str) -> str | None:
    """El interprete de la etapa si lee su programa de stdin, o ``None``."""
    tokens = _TOKEN.findall(stage)
    while tokens and (_ASSIGNMENT.match(tokens[0]) or tokens[0] in _WRAPPERS):
        tokens.pop(0)
    if tokens and tokens[0] == "timeout":
        tokens = tokens[2:]
    if not tokens or not _INTERPRETER.match(tokens[0]):
        return None
    program, args = tokens[0], tokens[1:]
    skip_next = False
    for arg in args:
        if skip_next:
            skip_next = False
            continue
        if _REDIRECT.match(arg):
            # El destino de una redireccion —de entrada o de salida— no es
            # el guion del interprete: ``python < script.py`` lee stdin.
            skip_next = arg.lstrip("0123456789") in ("<", ">", ">>")
            continue
        if arg == "-":
            return program
        if arg in ("-c", "-m", "-e", "--eval", "-p", "--print") or not arg.startswith("-"):
            return None
    return program


def has_provided_input(segment: str) -> bool:
    """Si el segmento le da entrada al interprete: heredoc, ``<`` o un tubo que
    desemboca en el."""
    if re.search(r"(?<![<>])<(?!\()", segment):
        return True
    stages = _stages(segment)
    return any(_stdin_reader(stage) for stage in stages[1:])


def detect(payload: dict) -> str | None:
    """El aviso si el comando invoca un interprete que se colgaria en segundo plano."""
    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command")
    if not isinstance(command, str) or not command.strip():
        return None
    found = []
    for segment in _segments(strip_heredoc_bodies(command)):
        if has_provided_input(segment):
            continue
        # Cualquier etapa del tubo puede ser el interprete; sin entrada
        # provista, la que lo sea lee de un stdin que nadie cierra.
        if any(_stdin_reader(stage) for stage in _stages(segment)):
            found.append(segment.strip())
    if not found:
        return None
    shown = "; ".join(f"`{s}`" for s in found[:3])
    return (
        f"GATE DE STDIN — {shown} invoca un interprete sin guion, `-c` ni `-m` y "
        "sin entrada provista, asi que lee su programa de stdin. En primer plano "
        "sale al instante; en SEGUNDO plano, al que el cliente puede promover "
        "cualquier comando, el stdin es un tubo que no se cierra y el interprete "
        "espera para siempre. Medido: `.venv/bin/python` en segundo plano sale "
        "124 con `timeout 10`, y con `</dev/null` sale 0 (`H-THYROX-156`: el "
        "resto de la linea no corrio). Si el interprete sobra, quitalo; si es a "
        "proposito, dale entrada: un heredoc, un tubo o `</dev/null`."
    )


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
