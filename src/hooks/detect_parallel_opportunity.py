"""detect_parallel_opportunity — los momentos en que GNU Parallel es la forma.

El defecto que ataja
--------------------
Un bucle de shell que ejecuta un comando externo por cada línea de entrada
corre en serie lo que es independiente. El episodio que lo origina: trazar el
commit de origen de 97 archivos con un `git log --follow` por archivo. El
bucle no terminó en 120 s, el cliente lo mandó a segundo plano fuera del
ledger y hubo que cancelarlo; con `parallel -j8 -k` terminó en 3 min 38 s con
7 min de CPU repartidos. La versión paralela ya había funcionado, y aun así el
primer impulso fue el bucle: sin un aviso en el momento, gana el hábito.

Momentos que reconoce:

1. `for x in …; do <comando externo> …; done`;
2. `while read …; do <comando externo> …; done`;
3. `xargs` sin `-P`.

Mitades de juicio (de módulo, para que la suite anule cada una):

- ``REQUIRE_EXTERNAL``: un bucle de sólo builtins (`echo`, `printf`, `test`)
  no gana nada repartido.
- ``SKIP_GIT_INDEX``: un bucle que escribe el índice de git (`git mv`, `add`,
  `rm`, `commit`) tiene un solo escritor; en paralelo chocaría en
  `index.lock`. Ahí la serie es lo correcto.
- ``MIN_LITERAL_ITEMS``: una lista literal corta (`for p in api ui`) no paga
  el arranque de parallel.
- ``_ALREADY_PARALLEL``: `xargs -P` o `parallel` ya son la forma.
- ``REQUIRE_PER_ELEMENT_XARGS``: `xargs` sin `-n`, `-L` ni `-I` agrupa todos
  los argumentos en UNA invocación; no hay un proceso por elemento.
- ``SKIP_SHARED_WRITE``: un cuerpo que modifica en sitio (`sed -i`,
  `gawk -i inplace`, `cp`, `mv`, `>`) un archivo que no depende de la
  variable del bucle encadena las iteraciones: no son independientes.

La lista literal se cuenta por palabras de shell (`shlex`), no por espacios:
`'s/A = 1/A = 2/'` es un elemento. Y el cuerpo de un heredoc no se mira: es
texto, no comandos (``hooks/shell_text.py``).

Falsos positivos que originaron las tres últimas medidas, todos del
2026-09-25: un `xargs -r grep` agrupado, un bucle de anulaciones que
reescribía el mismo archivo en cada vuelta, una lista de tres expresiones
`sed` citadas, y el texto de un heredoc de Python.

*Ciega a:* un bucle dentro de un guion invocado por ruta (mide la línea que se
escribe), y a si las iteraciones son de verdad independientes —un cuerpo que
lee lo que escribió la iteración anterior no se distingue de uno que no—.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re
import shlex

from hooks.shell_text import strip_heredoc_bodies  # noqa: E402

REQUIRE_EXTERNAL = True
SKIP_GIT_INDEX = True
MIN_LITERAL_ITEMS = 4
REQUIRE_PER_ELEMENT_XARGS = True
SKIP_SHARED_WRITE = True

_FOR = re.compile(r"\bfor\s+(?P<var>\w+)\s+in\s+(?P<items>.*?);\s*do\b(?P<body>.*?)\bdone\b", re.S)
_WHILE = re.compile(
    r"\bwhile\s+(?:IFS=\S*\s+)?read\s+(?:-\w+\s+)*(?P<var>\w+)[^;]*;\s*do\b(?P<body>.*?)\bdone\b", re.S)
_PER_ELEMENT_XARGS = re.compile(r"^-(?:n\d*|L\d*|I\S*|i\S*)$|^--(?:max-args|max-lines|replace)\b")
#: Opciones de xargs cuyo valor va en la palabra siguiente.
_XARGS_VALUED = frozenset({"-n", "-L", "-I", "-d", "-s", "-P", "-a", "-E", "-e"})
_BODY_SEGMENTS = re.compile(r"&&|\|\||;|\||\n")
_TRUNCATING_REDIRECT = re.compile(r"(?<![>&0-9])>(?!>|&)\s*(?P<target>[^\s;|&]+)")
_XARGS = re.compile(r"(?<![\w-])xargs\b(?P<args>[^|;&\n]*)")
_ALREADY_PARALLEL = re.compile(r"(?<![\w-])parallel\b|(?<![\w-])xargs\b[^|;&\n]*\s-P\s*\d|--max-procs")
_GIT_INDEX = re.compile(r"\bgit\s+(?:-C\s+\S+\s+)?(?:mv|add|rm|commit|stash|reset|checkout|merge)\b")
_BUILTINS = frozenset({
    "echo", "printf", "test", "[", "[[", "true", "false", ":", "read", "local", "export", "set",
    "let", "declare", "break", "continue", "return", "shift", "cd", "pushd", "popd", "if", "then",
    "else", "elif", "fi", "case", "esac", "do", "done", "for", "while",
})
_WORD = re.compile(r"(?:^|[;&|\n`(]|\$\()\s*(?:\w+=\S*\s+)*(?P<word>[\w./\[\]:-]+)")


def _external_command(body: str) -> str | None:
    """El primer comando del cuerpo que no es un builtin del shell."""
    for match in _WORD.finditer(body):
        word = match.group("word")
        if word and word not in _BUILTINS and not word.startswith("$"):
            return word
    return None


def _literal_items(items: str) -> int | None:
    """Cuántos elementos tiene una lista escrita a mano; None si se genera."""
    if "$(" in items or "`" in items or "*" in items or "{" in items:
        return None
    try:
        return len(shlex.split(items))
    except ValueError:
        return len(items.split())


def _in_place_targets(body: str) -> list[str]:
    """Los archivos que el cuerpo modifica en sitio."""
    targets: list[str] = []
    for segment in _BODY_SEGMENTS.split(body):
        targets.extend(m.group("target") for m in _TRUNCATING_REDIRECT.finditer(segment))
        try:
            words = shlex.split(segment)
        except ValueError:
            words = segment.split()
        if len(words) < 2:
            continue
        program = words[0].rsplit("/", 1)[-1]
        edits_in_place = (
            (program == "sed" and any(w.startswith("-i") for w in words[1:]))
            or (program in ("gawk", "awk") and "inplace" in words)
            or program in ("cp", "mv")
        )
        if edits_in_place:
            targets.append(words[-1])
    return [t for t in targets if not t.startswith("/dev/")]


def _xargs_options(args: str) -> list[str]:
    """Las opciones de ``xargs``: las palabras antes del comando que invoca."""
    try:
        words = shlex.split(args)
    except ValueError:
        words = args.split()
    options: list[str] = []
    expects_value = False
    for word in words:
        if expects_value:
            expects_value = False
            continue
        if not word.startswith("-"):
            break
        options.append(word)
        expects_value = word in _XARGS_VALUED
    return options


def _runs_per_element(args: str) -> bool:
    """Si ``xargs`` lanza una invocación por elemento (``-n``, ``-L``, ``-I``)."""
    return any(_PER_ELEMENT_XARGS.match(option) for option in _xargs_options(args))


def _writes_shared_file(body: str, var: str) -> bool:
    """Si el cuerpo modifica en sitio un archivo que no depende de ``var``."""
    keyed = re.compile(rf"\$\{{?{re.escape(var)}\b")
    return any(not keyed.search(target) for target in _in_place_targets(body))


def _hint(what: str, command: str) -> str:
    return (
        f"GNU PARALLEL — {what} corre en serie un `{command}` por elemento. Si las iteraciones son "
        "independientes, la forma es `<lista> | parallel -j N -k '<comando> {}'`: `-k` conserva el "
        "orden de salida de la serie y `N` es la anchura (con tsc en curso, no más de 2 en 4 núcleos). "
        "Si el cuerpo escribe el índice de git, la serie es lo correcto."
    )


def detect(payload: dict) -> str | None:
    if payload.get("tool_name") != "Bash":
        return None
    command = strip_heredoc_bodies((payload.get("tool_input") or {}).get("command") or "")
    if not command or _ALREADY_PARALLEL.search(command):
        return None
    for pattern, what in ((_FOR, "este `for`"), (_WHILE, "este `while read`")):
        for match in pattern.finditer(command):
            body = match.group("body")
            if SKIP_GIT_INDEX and _GIT_INDEX.search(body):
                continue
            if SKIP_SHARED_WRITE and _writes_shared_file(body, match.group("var")):
                continue
            if "items" in match.groupdict():
                count = _literal_items(match.group("items"))
                if count is not None and count < MIN_LITERAL_ITEMS:
                    continue
            external = _external_command(body)
            if external is None and REQUIRE_EXTERNAL:
                continue
            return _hint(what, external or "comando")
    xargs = _XARGS.search(command)
    if xargs and (_runs_per_element(xargs.group("args")) or not REQUIRE_PER_ELEMENT_XARGS):
        return _hint("este `xargs` sin `-P`", "comando")
    return None
