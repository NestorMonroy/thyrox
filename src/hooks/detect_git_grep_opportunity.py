"""detect_git_grep_opportunity — los momentos en que `git grep` es la forma.

El defecto que ataja
--------------------
Una pregunta de PRESENCIA («¿este texto está en el repo?») respondida con
un instrumento que hace más trabajo del que la pregunta pide. Episodio del
2026-09-25: para saber si `thyrox_toolchain_require_pdf_text` existía en el
consumidor se corrieron `grep -rl` sobre `.claude/` y `git log --all -S`, y
el comando acabó en segundo plano. Medido después sobre ese mismo repo
(`.claude/workbench/git-grep-vs-grep-r-20260925T194542/`):

======================================  ============
forma                                   segundos
======================================  ============
``rg -l``                               0.080 (n=3)
``git grep -l`` sobre el índice         0.172 (n=3)
``grep -rl`` sobre el disco             0.447 (n=3)
``git grep -l HEAD``                    0.543 (n=3)
``git log --all -S``                    15.30 (n=1)
======================================  ============

El pickaxe (`-S`/`-G`) calcula un diff por commit alcanzable —5880 ahí—: es
el que costó. Responde otra pregunta, *cuándo* apareció o desapareció el
texto, y para ésa es la forma; para *si está*, no.

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

#: El cuerpo de un heredoc es texto, no comandos: se pela con el mismo
#: instrumento que ``detect_stdin_reading_interpreter`` en vez de una copia.
#: Sin esto, el primer disparo real del detector avisó sobre la prosa de su
#: propia regla, escrita con ``cat > … <<'EOF'``.
from hooks.detect_stdin_reading_interpreter import _strip_heredoc_bodies  # noqa: E402

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


def _grep_paths(args: str) -> list[str] | None:
    """Las rutas de un `grep` recursivo; None si no es recursivo."""
    try:
        words = shlex.split(args)
    except ValueError:
        words = args.split()
    if not any(_RECURSIVE_FLAG.match(w) for w in words):
        return None
    operands = [w for w in words if not w.startswith("-")]
    # El primer operando es el patrón (salvo -e/-f, que no cambian el veredicto).
    return operands[1:] or ["."]


def _hint(what: str) -> str:
    return (
        f"GIT GREP — {what}. Si la pregunta es si el texto ESTÁ, se elige por universo: "
        "`rg -l` (lo no ignorado, 0.08 s), `git grep -l <patrón> -- <ruta>` (exactamente lo "
        "versionado, 0.18 s; `--untracked` si lo nuevo cuenta) o `grep -r` (todo el disco, 0.45 s). "
        "`git log --all -S` tardó 15.3 s en el mismo repo: responde CUÁNDO apareció, y entonces "
        "con un rango `a..b` que lo acote. Ver `.claude/rules/search-the-git-index.md`."
    )


def detect(payload: dict) -> str | None:
    if payload.get("tool_name") != "Bash":
        return None
    command = _strip_heredoc_bodies((payload.get("tool_input") or {}).get("command") or "")
    cwd = payload.get("cwd") or ""
    for match in _GREP_R.finditer(command):
        paths = _grep_paths(match.group("args"))
        if paths is None:
            continue
        if not REQUIRE_GIT_TREE or any(_inside_git_tree(p, cwd) for p in paths):
            return _hint("este `grep -r` recorre un árbol que git ya indexa")
    for match in _GIT_LOG.finditer(command):
        args = match.group("args")
        if not _PICKAXE.search(args):
            continue
        if SKIP_BOUNDED_RANGE and "--all" not in args and _RANGE.search(args):
            continue
        return _hint("este `git log -S/-G` calcula un diff por cada commit alcanzable")
    return None
