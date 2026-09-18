"""Detector de la espera que se casa a si misma — ``pgrep -f`` sobre un literal.

El defecto, medido por conducta y no leido de un manual
--------------------------------------------------------
``pgrep -f`` compara el patron contra la **linea de comando completa** de cada
proceso. Un comando escrito en el turno corre dentro de un ``bash -c`` cuya
linea de comando **contiene el patron**, porque el patron es su propio
argumento. Asi que el patron se encuentra a si mismo, y una espera construida
sobre el no termina nunca::

    bash -c "pgrep -af 'marca_qq_uno'"    -> exit 0   (casa con el wrapper)
    bash -c "pgrep -af '[m]arca_qq_dos'"  -> exit 1   (no casa con nada)

Las dos lineas son mediciones de este contenedor, en invocaciones **separadas**:
una primera sonda las puso en el mismo comando y las dos casaron, porque el
literal de la primera mitad contaminaba la linea que la segunda inspeccionaba.
Ese falso positivo es el mismo fenomeno que el detector existe para atajar, un
nivel mas arriba.

El episodio: ``H-THYROX-103``. Un ``until ! pgrep -f 'check_suite_discrimina'``
giro hasta que lo mataron, sobre un gate que habia terminado hacia rato. El
bucle era el unico proceso que el patron encontraba.

Que hace y que NO hace
-----------------------
Avisa cuando un comando invoca ``pgrep``/``pkill`` con una bandera que incluye
``-f`` y su patron **no** lleva clase de corchete. No bloquea, por la misma
razon que sus hermanos: un patron lexico no distingue la espera que gira de un
``pgrep -f`` de una sola vez cuyo resultado el autor va a leer con los ojos —
las dos casan con el wrapper, pero solo la primera cuelga.

Ciego a: un ``pgrep -f`` cuyo patron llegue por sustitucion de comando o por un
arreglo de argumentos; ahi no hay literal que inspeccionar. Esos casos caen en
la rama INDECIDIBLE, que avisa en vez de callar.
"""
from __future__ import annotations

import re

#: Los dos programas que comparan contra la linea de comando completa. ``pkill``
#: comparte el mecanismo Y ademas mata lo que casa, asi que su auto-coincidencia
#: no cuelga: se suicida.
_PROGRAMS = ("pgrep", "pkill")

_INVOCATION = re.compile(r"\b(pgrep|pkill)\b")

#: Un token de la cola del comando: entrecomillado simple, doble, o crudo.
_TOKEN = re.compile(r"""'[^']*'|"[^"]*"|\S+""")

#: Donde termina la invocacion. Un metacaracter cierra el comando, asi que lo
#: que venga despues ya no es argumento suyo.
_TERMINATORS = {";", "|", "||", "&&", ">", ">>", "<", "&", "2>", "2>&1"}

#: La forma que NO se casa a si misma: una clase de corchete en el patron. El
#: regex ``[c]heck`` casa el texto ``check``; el texto que la linea de comando
#: lleva es ``[c]heck``, que el regex no casa.
_BRACKET = re.compile(r"\[[^\]]+\]")


def has_bracket_class(pattern: str) -> bool:
    """¿El patron lleva la clase de corchete que lo desacopla de si mismo?

    Se aisla en una funcion para poder ANULARLA en la suite: sin ella, el caso
    del corchete —y solo ese— tiene que dejar de callar. Un control que no puede
    fallar no mide nada.
    """
    return bool(_BRACKET.search(pattern))


def _strip_quotes(token: str) -> str:
    if len(token) >= 2 and token[0] == token[-1] and token[0] in "'\"":
        return token[1:-1]
    return token


def _has_full_flag(option: str) -> bool:
    """¿Esta opcion enciende la comparacion contra la linea completa?

    ``-f`` viaja pegado a sus hermanas (``-af``, ``-lf``): la bandera corta es
    una LETRA dentro del racimo, no un token propio. Medir el token completo
    —``option == "-f"``— es ciego a las dos formas mas frecuentes.
    """
    if option == "--full":
        return True
    if option.startswith("--"):
        return False
    return option.startswith("-") and "f" in option[1:]


def _pattern_of(rest: str) -> tuple[bool, str | None]:
    """Recorre la cola de la invocacion: ¿lleva ``-f``, y cual es su patron?

    Devuelve ``(full, pattern)``. Un ``pattern`` en ``None`` con ``full`` cierto
    significa que la invocacion no expuso literal alguno — INDECIDIBLE, no
    inocente.
    """
    full = False
    for match in _TOKEN.finditer(rest):
        token = match.group(0)
        if token in _TERMINATORS:
            break
        if token.startswith("-") and len(token) > 1:
            full = full or _has_full_flag(token)
            continue
        return full, token
    return full, None


def detect(payload: dict) -> str | None:
    """El aviso si el comando construye una espera que se casa a si misma."""
    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command")
    if not isinstance(command, str) or not command.strip():
        return None

    for match in _INVOCATION.finditer(command):
        full, raw = _pattern_of(command[match.end():])
        if not full:
            continue
        if raw is not None:
            pattern = _strip_quotes(raw)
            # Un patron compuesto en tiempo de ejecucion no se puede
            # inspeccionar: avisar es la conducta conservadora, porque callar
            # seria publicar «no hay defecto» sobre lo que no se midio.
            if "$" not in pattern and "`" not in pattern and has_bracket_class(pattern):
                continue
        return (
            f"GATE DE ESPERA — este comando usa `{match.group(1)} -f` con un "
            "patron que la propia linea de comando contiene, asi que **casa "
            "consigo mismo**: medido en este contenedor, `pgrep -af 'X'` dentro "
            "de un `bash -c` encuentra al wrapper y sale 0 para siempre "
            "(`H-THYROX-103`, un turno entero girando sobre un gate que ya "
            "habia terminado). `.claude/rules/trabajo-en-segundo-plano.md`: "
            "para esperar a un proceso AJENO usa "
            "`bash bin/marker_wait --pid-only --pid <pid>`, que observa un "
            "ENTERO y no puede aparecer en su propia coincidencia; para N "
            "trabajos, `bash bin/wait-jobs wait` como barrera. Si el `pgrep` es "
            "de una sola vez y su salida la lees tu, la salida minima es la "
            "clase de corchete —`'[p]atron'`—, que el regex casa y el literal "
            "no."
        )
    return None


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    aviso = detect(json.load(sys.stdin))
    if aviso:
        print(aviso)
    raise SystemExit(0)
