"""Detector PreToolUse: la operación cuyo daño no se revierte.

Origen: propuesta 3 del banco ``notas-ai-course-aplicables-a-thyrox-*``
(informes G3 y G5 de ``ai-course-notes``). Medido al abrirla: ninguno de los
diecisiete detectores de ``pretooluse_dispatch`` miraba ``rm -rf``,
``git reset --hard``, ``push --force`` ni ``DROP``/``TRUNCATE``.

Es el primero que **pide confirmación** (``ask``) en vez de sólo avisar. Sus
hermanos avisan porque su falso positivo cuesta un párrafo de contexto; aquí
el falso negativo cuesta un árbol de trabajo, y un aviso llega cuando el daño
ya ocurrió. ``ask`` no niega: deja la decisión al usuario.

Qué mide — por segmento de la línea de comando, con los cuerpos de heredoc
retirados (son datos que se escriben, no órdenes que se ejecutan):

- ``git reset --hard``, ``git clean -f…``;
- ``git push`` con ``--force``/``-f`` y sin ``--force-with-lease``;
- ``rm -r``/``-rf`` sobre una raíz, el hogar, ``.git``, ``.`` o un comodín;
- ``DROP``/``TRUNCATE`` en un segmento que invoca un cliente de base de datos.

*Ciega a:* el heredoc que se entrega a un intérprete (``bash <<EOF``), la
orden compuesta en tiempo de ejecución (``$CMD``), y un ``rm -rf`` sobre una
ruta que sólo por su contenido es valiosa. Un ``rm -rf "$F"`` calla: su
destino no se conoce antes de ejecutarse.
"""
from __future__ import annotations

import re

#: Los cuerpos de heredoc: desde la línea del ``<<MARCA`` hasta la ``MARCA``.
_HEREDOC = re.compile(r"<<-?\s*['\"]?(\w+)['\"]?[^\n]*\n.*?\n\s*\1\s*(?:\n|$)", re.S)

#: Separadores de segmento en una línea de shell.
_SEGMENTS = re.compile(r"&&|\|\||;|\||\n")

_DANGEROUS_TARGETS = re.compile(
    r"""^['"]?(?:/|~/?|\$HOME/?|\$\{HOME\}/?|\.git/?|\*|\.|\.\./?|/\*)['"]?$""")

_DB_CLIENTS = re.compile(r"\b(?:psql|sqlite3|mysql|mariadb|duckdb)\b")
_DB_DESTRUCTIVE = re.compile(r"\b(?:DROP\s+(?:TABLE|DATABASE|SCHEMA)|TRUNCATE)\b", re.I)


def _segments(command: str) -> list[str]:
    body = _HEREDOC.sub("\n", command)
    return [s.strip() for s in _SEGMENTS.split(body) if s.strip()]


def _removal_targets(words: list[str]) -> list[str] | None:
    """Los destinos de un ``rm`` recursivo, o ``None`` si no lo es."""
    if not words or words[0] != "rm":
        return None
    flags = "".join(w[1:] for w in words[1:] if w.startswith("-") and not w.startswith("--"))
    if "r" not in flags.lower() and "--recursive" not in words:
        return None
    return [w for w in words[1:] if not w.startswith("-")]


def _classify(segment: str) -> str | None:
    words = segment.split()
    if len(words) >= 3 and words[:2] == ["git", "reset"] and "--hard" in words:
        return "git reset --hard (descarta los cambios sin commitear)"
    if len(words) >= 2 and words[:2] == ["git", "clean"] and any(
            w.startswith("-") and "f" in w for w in words[2:]):
        return "git clean -f (borra los archivos sin versionar)"
    if len(words) >= 2 and words[:2] == ["git", "push"]:
        forced = "--force" in words or any(
            w.startswith("-") and not w.startswith("--") and "f" in w for w in words[2:])
        if forced and not any(w.startswith("--force-with-lease") for w in words):
            return "git push --force (reescribe la rama remota)"
    targets = _removal_targets(words)
    if targets and any(_DANGEROUS_TARGETS.match(t) for t in targets):
        return f"rm recursivo sobre {' '.join(targets)}"
    if _DB_CLIENTS.search(segment) and _DB_DESTRUCTIVE.search(segment):
        return "DROP/TRUNCATE enviado a un cliente de base de datos"
    return None


def detect(payload: dict) -> dict | None:
    """``{"notice", "decision": "ask"}`` si el comando es irreversible."""
    if payload.get("tool_name") not in (None, "Bash"):
        return None
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or not command.strip():
        return None
    for segment in _segments(command):
        what = _classify(segment)
        if what:
            return {
                "decision": "ask",
                "notice": (
                    f"OPERACIÓN IRREVERSIBLE — {what}: `{segment}`. Su daño no se "
                    "revierte, así que pide confirmación en vez de sólo avisar. Si "
                    "hay trabajo sin commitear, sácalo antes a un parche en el "
                    "banco (`git diff > <banco>/outputs/x.patch`); para reescribir "
                    "una rama remota, `--force-with-lease`."
                ),
            }
    return None
