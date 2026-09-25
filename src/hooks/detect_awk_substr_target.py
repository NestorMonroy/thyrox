"""detect_awk_substr_target — ``substr()`` como destino de ``gsub``/``sub``.

El defecto que ataja
--------------------
En ningún awk (gawk, mawk, busybox) el tercer argumento de ``gsub``/``sub``
puede ser ``substr()``: tiene que ser asignable —una variable o un campo— y
``substr()`` devuelve una copia. gawk lo rechaza al compilar («gsub third
parameter is not a changeable object»). No se arregla instalando otro awk.
La regla vive en `operaciones-de-archivo-con-bash.md` con las tres formas que
sí funcionan; este detector es su gate, porque una regla en prosa no ataja
nada (directiva del ejecutor 2026-09-25).

Cómo mide
---------
Sólo si el comando invoca algún awk (``awk``, ``gawk``, ``mawk``, ``busybox
awk`` o ``$THYROX_TOOLCHAIN_AWK_BIN``). Por cada ``gsub(``/``sub(`` —no
``gensub``, que devuelve el resultado en vez de modificar, ni un método
``.sub(`` como el ``re.sub`` de Python en la misma tubería— separa los
argumentos por las comas de profundidad cero, saltando las cadenas ``"..."``
y los literales ``/regex/`` al inicio de un argumento: una coma dentro de
ellos no separa nada. Si el tercer argumento empieza por ``substr(``, avisa.

Ciega a: un programa awk en un archivo ``.awk`` o invocado desde un guion
(mide la línea que se escribe), y a un programa entre comillas dobles de shell
con sus comillas internas escapadas.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re

_AWK = re.compile(r"(?<![\w-])[gm]?awk\b|THYROX_TOOLCHAIN_AWK_BIN")
_CALL = re.compile(r"(?<![\w.$])g?sub\s*\(")
_SUBSTR = re.compile(r"substr\s*\(")

#: Las dos mitades de juicio del separador de argumentos. Son de módulo para
#: que la suite pueda anular cada una y medir qué cae.
SKIP_STRINGS = True
SKIP_REGEX_LITERALS = True


def invokes_awk(command: str) -> bool:
    """¿El comando invoca algún awk?"""
    return _AWK.search(command) is not None


def _skip_delimited(text: str, i: int, delimiter: str) -> int:
    """Índice tras el delimitador de cierre sin escapar, desde ``text[i]``."""
    j = i + 1
    while j < len(text):
        if text[j] == "\\":
            j += 2
            continue
        if text[j] == delimiter:
            return j + 1
        j += 1
    return j


def call_arguments(text: str, start: int) -> list[str]:
    """Los argumentos de la llamada cuyo paréntesis abre justo antes de ``start``."""
    arguments: list[str] = []
    current: list[str] = []
    depth = 0
    i = start
    while i < len(text):
        char = text[i]
        at_argument_start = not "".join(current).strip()
        if char == '"' and SKIP_STRINGS:
            end = _skip_delimited(text, i, '"')
            current.append(text[i:end])
            i = end
            continue
        if char == "/" and SKIP_REGEX_LITERALS and depth == 0 and at_argument_start:
            end = _skip_delimited(text, i, "/")
            current.append(text[i:end])
            i = end
            continue
        if char in "([":
            depth += 1
        elif char in ")]":
            if depth == 0:
                arguments.append("".join(current))
                return arguments
            depth -= 1
        elif char == "," and depth == 0:
            arguments.append("".join(current))
            current = []
            i += 1
            continue
        current.append(char)
        i += 1
    arguments.append("".join(current))
    return arguments


def substr_targets(command: str) -> list[str]:
    """Las llamadas ``gsub``/``sub`` cuyo destino es ``substr()``."""
    found: list[str] = []
    for match in _CALL.finditer(command):
        arguments = call_arguments(command, match.end())
        if len(arguments) >= 3 and _SUBSTR.match(arguments[2].strip()):
            found.append(f"{match.group(0).rstrip('( ')}(…, {arguments[2].strip()})")
    return found


def detect(payload: dict) -> str | None:
    """El aviso si un programa awk usa ``substr()`` como destino de sustitución."""
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or "sub" not in command or not invokes_awk(command):
        return None
    found = substr_targets(command)
    if not found:
        return None
    return (
        f"AWK SUBSTR — `{found[0]}`: el tercer argumento de gsub/sub tiene que "
        "ser asignable y substr() devuelve una copia; ningún awk lo acepta. "
        "Extrae el tramo a una variable, sustituye sobre ella y vuelve a montar "
        "la línea; o usa gensub (sólo gawk), que devuelve el resultado. Formas "
        "completas en `.claude/rules/operaciones-de-archivo-con-bash.md`."
    )


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
