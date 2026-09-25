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

*Ciega a:* un bucle dentro de un guion invocado por ruta (mide la línea que se
escribe), y a si las iteraciones son de verdad independientes —un cuerpo que
lee lo que escribió la iteración anterior no se distingue de uno que no—.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re

REQUIRE_EXTERNAL = True
SKIP_GIT_INDEX = True
MIN_LITERAL_ITEMS = 4

_FOR = re.compile(r"\bfor\s+\w+\s+in\s+(?P<items>.*?);\s*do\b(?P<body>.*?)\bdone\b", re.S)
_WHILE = re.compile(r"\bwhile\s+(?:IFS=\S*\s+)?read\b.*?;\s*do\b(?P<body>.*?)\bdone\b", re.S)
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
    return len(items.split())


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
    command = (payload.get("tool_input") or {}).get("command") or ""
    if not command or _ALREADY_PARALLEL.search(command):
        return None
    for pattern, what in ((_FOR, "este `for`"), (_WHILE, "este `while read`")):
        for match in pattern.finditer(command):
            body = match.group("body")
            if SKIP_GIT_INDEX and _GIT_INDEX.search(body):
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
    if xargs:
        return _hint("este `xargs` sin `-P`", "comando")
    return None
