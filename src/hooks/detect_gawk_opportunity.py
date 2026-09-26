"""detect_gawk_opportunity — los momentos en que ``gensub`` o ``-i inplace`` son la forma.

El defecto que ataja
--------------------
gawk trae dos cosas que ningún otro awk tiene: ``gensub``, que devuelve el
texto cambiado y reutiliza los grupos capturados, y ``-i inplace``, que edita
el archivo en su lugar. Sin ellas, la misma tarea sale por cuatro caminos
peores, y cada uno es un momento que este detector reconoce:

1. **Temporal y ``mv`` de vuelta** — ``awk … f > f.tmp && mv f.tmp f``. Dos
   pasos, y un temporal que queda si el primero falla: ``gawk -i inplace``.
2. **Grupos capturados en ``gsub``/``sub``** — ``gsub`` no expande ``\\1``:
   medido, ``gsub(/(\\w+) (\\w+)/, "\\\\2 \\\\1")`` sobre «hola mundo» escribe
   ``\\2 \\1`` y sale 0. Un resultado falso y silencioso: ``gensub``.
3. **Una sustitución por línea escrita en Python** — ``read_text`` →
   ``re.sub`` → ``write_text``. Es la puerta de atrás que
   `operaciones-de-archivo-con-bash.md` nombra: ``gawk -i inplace`` con
   ``gensub``.
4. **``-i inplace`` en otro awk** — medido, ``mawk -i inplace`` sale 2 con
   «not an option: -i»; ``awk`` a secas resuelve a mawk en Debian
   (``detect_bare_awk``).

Cómo mide
---------
Cada momento tiene una mitad de juicio que separa su gemelo inocente, y cada
una es de módulo para que la suite la anule y mida qué cae:

- ``invokes_awk``: el ``mv`` de vuelta cuenta sólo si lo produjo un awk (un
  ``sort f > t && mv t f`` tiene su propio ``sort -o``).
- ``REQUIRE_SAME_FILE``: el destino del ``mv`` tiene que ser un argumento del
  awk; si no, el temporal se mueve a otro archivo y no hay edición en sitio.
- ``_SUB_CALL``: ``gensub`` ya es la forma, y un ``re.sub`` o ``.sub`` no es awk.
- ``REQUIRE_WRITE``: un ``re.sub`` que sólo imprime no edita nada.
- ``SKIP_MULTILINE``: con ``re.S``/``DOTALL``/``(?s)`` o ``\\n`` en el patrón,
  la sustitución cruza líneas y gawk, que lee por registro, no alcanza.
- ``_FOREIGN_INPLACE``: ``gawk -i inplace`` es la forma correcta.

Ciega a: un programa en un ``.awk`` o un ``.py`` invocado por ruta (mide la
línea que se escribe), a un ``mv`` que no sigue inmediatamente al awk, y a
un ``re.sub`` repartido en funciones. ``&`` sí lo expande ``gsub`` y no avisa.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re

_AWK = re.compile(r"(?<![\w-])[gm]?awk\b|THYROX_TOOLCHAIN_AWK_BIN")
_SEGMENT = re.compile(r"\|\||&&|[;|\n]")
_REDIRECT_MV = re.compile(
    r">\s*(?P<tmp>[^\s;&|<>]+)\s*(?:&&|;|\n)\s*mv\s+(?:-\S+\s+)*(?P=tmp)\s+(?P<dest>[^\s;&|]+)")
_SUB_CALL = re.compile(r"(?<![\w.$])g?sub\s*\(")
_BACKREF = re.compile(r"\\\\[1-9]")
_PYTHON = re.compile(r"(?<![\w-])python3?\b")
_PY_SUB = re.compile(r"\bre\.subn?\s*\(")
_PY_WRITE = re.compile(r"\.write_text\s*\(|\.write\s*\(|open\s*\([^)]*['\"][wa]\+?['\"]")
_MULTILINE = re.compile(r"re\.S\b|re\.DOTALL|\(\?[a-zA-Z]*s[a-zA-Z]*\)|re\.subn?\s*\(\s*r?['\"][^'\"]*\\n")
_FOREIGN_INPLACE = re.compile(r"(?<![\w-])m?awk\s+-i\s+inplace\b")

#: Las mitades de juicio que la suite anula una por una.
REQUIRE_SAME_FILE = True
REQUIRE_WRITE = True
SKIP_MULTILINE = True

_EXAMPLE = "gawk -i inplace '{ print gensub(/patrón/, \"reemplazo\", \"g\") }' archivo"


def invokes_awk(command: str) -> bool:
    """¿El texto invoca algún awk?"""
    return _AWK.search(command) is not None


def _call_arguments(text: str, start: int) -> list[str]:
    """Los argumentos de la llamada cuyo paréntesis abre justo antes de ``start``.

    Salta cadenas ``"..."`` y literales ``/regex/`` al inicio de un argumento,
    como `detect_awk_substr_target`: una coma dentro de ellos no separa nada.
    """
    arguments, current, depth, i = [], [], 0, start
    while i < len(text):
        char = text[i]
        if char == '"' or (char == "/" and depth == 0 and not "".join(current).strip()):
            j = i + 1
            while j < len(text) and text[j] != char:
                j += 2 if text[j] == "\\" else 1
            current.append(text[i:j + 1])
            i = j + 1
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


def mv_back(command: str) -> str | None:
    """El archivo que un awk reescribe con un temporal y un ``mv`` de vuelta."""
    for match in _REDIRECT_MV.finditer(command):
        segment = _SEGMENT.split(command[:match.start()])[-1]
        if not invokes_awk(segment):
            continue
        if REQUIRE_SAME_FILE and match.group("dest") not in segment.split():
            continue
        return match.group("dest")
    return None


def gsub_backreference(command: str) -> str | None:
    """La llamada ``gsub``/``sub`` cuyo reemplazo cita un grupo capturado."""
    if not invokes_awk(command):
        return None
    for match in _SUB_CALL.finditer(command):
        arguments = _call_arguments(command, match.end())
        if len(arguments) >= 2 and _BACKREF.search(arguments[1]):
            return f"{match.group(0).rstrip('( ')}(…, {arguments[1].strip()})"
    return None


def python_file_substitution(command: str) -> bool:
    """¿Un Python en línea sustituye con ``re.sub`` y escribe el archivo?"""
    if not _PYTHON.search(command) or not _PY_SUB.search(command):
        return False
    if REQUIRE_WRITE and not _PY_WRITE.search(command):
        return False
    if SKIP_MULTILINE and _MULTILINE.search(command):
        return False
    return True


def detect(payload: dict) -> str | None:
    """El aviso si el comando resuelve a mano lo que gensub o ``-i inplace`` resuelven."""
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str):
        return None
    if _FOREIGN_INPLACE.search(command):
        return (
            "GAWK INPLACE — `-i inplace` es una extensión de gawk: medido, "
            "`mawk -i inplace` sale 2 («not an option: -i») y `awk` a secas "
            "resuelve a mawk en Debian. Escribe `gawk -i inplace`."
        )
    target = mv_back(command)
    if target:
        return (
            f"GAWK INPLACE — este comando reescribe `{target}` con un temporal y "
            "un `mv` de vuelta. `gawk -i inplace '{…}' archivo` lo hace en un "
            "paso y no deja el temporal si falla; con copia de seguridad, "
            "`-v inplace::suffix=.bak`."
        )
    call = gsub_backreference(command)
    if call:
        return (
            f"GAWK GENSUB — `{call}`: gsub/sub no expanden grupos capturados. "
            "Medido: el reemplazo sale literal (`\\2 \\1`) y el comando sale 0. "
            "gensub sí los expande y devuelve el texto: "
            "`gensub(/(\\w+) (\\w+)/, \"\\\\2 \\\\1\", \"g\")`."
        )
    if python_file_substitution(command):
        return (
            "GAWK INPLACE — un Python que lee, sustituye con `re.sub` y escribe "
            "el archivo es una sustitución por línea: "
            f"`{_EXAMPLE}` (con grupos, `\\\\1` en el reemplazo). Si la "
            "sustitución cruza líneas, el aviso no aplica. Formas en "
            "`.claude/rules/operaciones-de-archivo-con-bash.md`."
        )
    return None


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
