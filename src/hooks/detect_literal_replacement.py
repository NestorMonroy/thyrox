"""detect_literal_replacement — un texto FIJO reemplazado con regex o Python.

El defecto que ataja
--------------------
Reemplazar un texto fijo con ``perl -i``, ``sed -i`` o un heredoc de Python
funciona, pero los dos primeros leen el texto como regex —hay que escapar
``$``, ``{`` y ``.``— y, con comillas anidadas dentro de un ``bash -c`` o un
``eval``, el comando se rompe antes de ejecutarse. Episodio real: el
2026-09-25, un ``perl -0 -i -pe 's{LEDGER="\\$\\{…'`` sobre ``wait-jobs.sh``
murió con «syntax error near unexpected token» y hubo que rehacerlo con un
heredoc de Python. ``bin/replace_literal`` (``src/lib/replace_literal.sh``)
hace el reemplazo con ``index()`` y ``ENVIRON`` de gawk: nada que escapar,
``OLD`` multilínea, unicidad como ``Edit`` y permisos conservados.

Cómo mide
---------
Tres familias, y en las tres el comando tiene que REESCRIBIR un archivo:

1. ``perl`` con ``-i`` y una sustitución ``s/…/…/`` (o ``s{…}{…}``);
2. ``sed`` con ``-i``/``--in-place`` y una sustitución;
3. un heredoc de Python que llama ``.replace(`` y escribe (``write_text`` o
   ``.write(``).

En las dos primeras, además, el patrón tiene que expresar un texto fijo: calla
si usa construcciones de regex de verdad (clase ``[…]``, grupo ``(…)``,
cuantificador ``* + ? {n}``, alternancia ``|``, anclas ``^``/``$`` o una clase
con barra ``\\d \\s \\w \\b``). Un metacarácter ESCAPADO (``\\.``, ``\\$``)
cuenta como texto: escaparlo es pedir el literal.

Ciega a: un programa perl/sed leído de un archivo (``-f``), una sustitución
dentro de una variable de shell, y un Python que escriba por otra vía.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re

_PERL = re.compile(r"(?<![\w-])perl\b")
_PERL_IN_PLACE = re.compile(r"(?<!\S)-\w*i")
_SED_IN_PLACE = re.compile(r"(?<![\w-])sed\b[^|;&\n]*?(?<!\S)(?:-\w*i|--in-place)")
_SUBSTITUTION_BRACES = re.compile(r"(?<![\w$@%])s\{((?:\\.|[^\\}])*)\}")
_SUBSTITUTION = re.compile(r"(?<![\w$@%])s([/|#!,:@])((?:\\.|(?!\1).)*)\1")
_PYTHON_HEREDOC = re.compile(r"(?<![\w-])python3?\b[^\n]*<<")
_PY_REPLACE = re.compile(r"\.replace\(")
_PY_WRITE = re.compile(r"write_text\(|\.write\(")
_OWN_TOOL = re.compile(r"\breplace_literal\b")

#: Las construcciones que hacen de un patrón una regex de verdad.
REGEX_CLASSES = set("dswbDSWB")
REGEX_UNESCAPED = set("[(*+?|^")


def is_literal_pattern(pattern: str) -> bool:
    """¿El patrón pide un texto fijo? Falso si usa alguna construcción de regex."""
    i = 0
    while i < len(pattern):
        char = pattern[i]
        if char == "\\":
            if i + 1 < len(pattern) and pattern[i + 1] in REGEX_CLASSES:
                return False
            i += 2
            continue
        if char in REGEX_UNESCAPED:
            return False
        if char == "$" and i == len(pattern) - 1:
            return False
        if char == "{" and re.match(r"\{\d", pattern[i:]):
            return False
        i += 1
    return True


def substitution_patterns(command: str) -> list[str]:
    """Los patrones de las sustituciones ``s…`` del comando."""
    found = [m.group(1) for m in _SUBSTITUTION_BRACES.finditer(command)]
    found += [m.group(2) for m in _SUBSTITUTION.finditer(command)]
    return found


def rewrites_in_place(command: str) -> str | None:
    """La familia que reescribe un archivo en el sitio, o None."""
    if _PERL.search(command) and _PERL_IN_PLACE.search(command[_PERL.search(command).end():]):
        return "perl"
    if _SED_IN_PLACE.search(command):
        return "sed"
    if _PYTHON_HEREDOC.search(command) and _PY_REPLACE.search(command) and _PY_WRITE.search(command):
        return "python"
    return None


def detect(payload: dict) -> str | None:
    """El aviso si el comando reemplaza un texto fijo con regex o con Python."""
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or _OWN_TOOL.search(command):
        return None
    family = rewrites_in_place(command)
    if family is None:
        return None
    if family in ("perl", "sed"):
        patterns = substitution_patterns(command)
        if not patterns or not all(is_literal_pattern(p) for p in patterns):
            return None
    return (
        f"REEMPLAZO LITERAL — este `{family}` reescribe un archivo para cambiar un "
        "texto fijo. `OLD='<texto>' NEW='<texto>' bash bin/replace_literal <archivo>` "
        "lo hace con gawk `index()` y `ENVIRON`: nada que escapar, OLD multilínea, "
        "una sola coincidencia salvo `--all` y permisos conservados. Las comillas "
        "anidadas de un `perl -pe` dentro de otro comando ya rompieron uno."
    )


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
