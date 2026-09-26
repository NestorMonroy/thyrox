"""detect_git_grep_opportunity — los momentos en que `git grep` es la forma.

El defecto que ataja
--------------------
Una pregunta de PRESENCIA («¿este texto está en el repo?») respondida con
un instrumento que hace más trabajo del que la pregunta pide. Episodio del
2026-09-25: para saber si `thyrox_toolchain_require_pdf_text` existía en el
consumidor se corrieron `grep -rl` sobre `.claude/` y `git log --all -S`, y
el comando acabó en segundo plano. El coste lo puso el pickaxe (`-S`/`-G`),
que calcula un diff por commit alcanzable: responde *cuándo* apareció el
texto, no *si está*. La medición de las cinco formas vive en una sola
fuente, ``.claude/rules/search-the-git-index.md``, con su banco en
``.claude/workbench/git-grep-vs-grep-r-20260925T194542/``.

Momentos que reconoce:

1. `grep -r`/`-R` sobre una ruta dentro de un work tree de git;
2. `git log -S`/`-G` sobre un rango ancho (`--all`, o sin rango `a..b`).

Mitades de juicio (de módulo, para que la suite anule cada una):

- ``REQUIRE_GIT_TREE``: fuera de un work tree no hay índice que consultar.
  Se busca `.git` subiendo por los directorios, sin subprocesos.
- ``SKIP_BOUNDED_RANGE``: un pickaxe sobre `a..b` es barato y responde la
  pregunta de historia, que es su uso legítimo.

*Ciega a:* la intención —un `git log --all -S` puede querer de verdad la
historia completa— y a lo no versionado: `git grep` no lo ve salvo con
`--untracked`, y `grep -r` sí. Por eso avisa y no bloquea.
"""
from __future__ import annotations

import os
import re
import shlex

#: El cuerpo de un heredoc es texto, no comandos. Sin descartarlo, el primer
#: disparo real del detector avisó sobre la prosa de su propia regla.
from hooks.shell_text import strip_heredoc_bodies  # noqa: E402

REQUIRE_GIT_TREE = True
SKIP_BOUNDED_RANGE = True

_GREP_R = re.compile(r"(?:^|[;&|\n(]|\$\()\s*(?:\w+=\S*\s+)*grep\s+(?P<args>[^|;&\n]*)")
_RECURSIVE_FLAG = re.compile(r"^-[A-Za-z]*[rR][A-Za-z]*$|^--(?:recursive|dereference-recursive)$")
_GIT_LOG = re.compile(r"\bgit\s+(?:-C\s+\S+\s+)?log\b(?P<args>[^|;&\n]*)")
_PICKAXE = re.compile(r"(?:^|\s)-[SG]\S*|--pickaxe-regex")
_RANGE = re.compile(r"\S+\.\.\.?\S+")


def _inside_git_tree(path: str, cwd: str) -> bool:
    here = os.path.abspath(os.path.join(cwd or os.getcwd(), path))
    while True:
        if os.path.exists(os.path.join(here, ".git")):
            return True
        parent = os.path.dirname(here)
        if parent == here:
            return False
        here = parent


def _words(args: str) -> list[str]:
    try:
        return shlex.split(args)
    except ValueError:
        return args.split()


def _is_recursive(words: list[str]) -> bool:
    return any(_RECURSIVE_FLAG.match(word) for word in words)


def _searched_paths(words: list[str]) -> list[str]:
    """Las rutas que recorre un ``grep``: los operandos tras el patrón."""
    operands = [word for word in words if not word.startswith("-")]
    return operands[1:] or ["."]


def _is_bounded_range(args: str) -> bool:
    """Un pickaxe sobre ``a..b`` sin ``--all`` recorre sólo ese tramo."""
    return "--all" not in args and _RANGE.search(args) is not None


def _hint(what: str) -> str:
    return (
        f"GIT GREP — {what}. Si la pregunta es si el texto ESTÁ, se elige por universo: "
        "`rg -l` (lo no ignorado), `git grep -l <patrón> -- <ruta>` (exactamente lo versionado; "
        "`--untracked` si lo nuevo cuenta) o `grep -r` (todo el disco). `git log -S` responde "
        "CUÁNDO apareció, y entonces con un rango `a..b`. Medición y porqué: "
        "`.claude/rules/search-the-git-index.md`."
    )


def _recursive_grep_in_git_tree(command: str, cwd: str) -> str | None:
    for match in _GREP_R.finditer(command):
        words = _words(match.group("args"))
        if not _is_recursive(words):
            continue
        paths = _searched_paths(words)
        if any(_inside_git_tree(path, cwd) for path in paths) or not REQUIRE_GIT_TREE:
            return _hint("este `grep -r` recorre un árbol que git ya indexa")
    return None


def _wide_pickaxe(command: str) -> str | None:
    for match in _GIT_LOG.finditer(command):
        args = match.group("args")
        if not _PICKAXE.search(args):
            continue
        if SKIP_BOUNDED_RANGE and _is_bounded_range(args):
            continue
        return _hint("este `git log -S/-G` calcula un diff por cada commit alcanzable")
    return None


def detect(payload: dict) -> str | None:
    if payload.get("tool_name") != "Bash":
        return None
    command = strip_heredoc_bodies((payload.get("tool_input") or {}).get("command") or "")
    cwd = payload.get("cwd") or ""
    return _recursive_grep_in_git_tree(command, cwd) or _wide_pickaxe(command)
