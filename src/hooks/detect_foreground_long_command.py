"""Detector PreToolUse: el comando largo que se iba a esperar en primer plano.

Es el gate de ``.claude/rules/trabajo-en-segundo-plano.md``. Aquella regla dice
qué mecanismo existe —``bg.sh``, ``run-task-pool.sh``, ``wait-jobs.sh``— y por
qué un subagente no es su sustituto; sin gate era prosa, y la prosa no previene
la reincidencia: los ``long-running-commands.md`` de los consumidores llevan
años enseñando el ``nohup`` a mano y el mecanismo siguió sin invocarse.

Mide el **comando**, no el archivo: por eso su superficie es ``Bash`` y no
``Write``/``Edit`` como sus tres hermanos del despachador.

Qué lo dispara
--------------

Un comando que (a) invoca una familia de trabajo larga —suite, build, gate de
corpus— **en posición de comando**, y (b) **no** viaja ya por uno de los tres
ensambladores ni por un ``nohup`` propio. Las tres condiciones importan:

- sin la segunda, el aviso saldría en el mismo lanzamiento que ya cumple la
  regla, y un aviso que sale siempre se aprende a ignorar;
- sin la **posición**, ``grep -rn pytest .claude/rules/`` dispara el aviso — el
  literal está, pero como *argumento* de otro programa. Medir la presencia del
  token y concluir sobre la ejecución es medir el significante y concluir sobre
  el significado. El segmento se parte por los separadores del shell y se le
  quitan las envolturas (``bash``, ``uv run``, ``time``, asignaciones de
  entorno) antes de buscar la familia al principio de lo que queda.

Qué NO hace, y es deliberado
----------------------------

**No bloquea.** Sale por ``additionalContext`` como los demás detectores: el
juicio de si este comando concreto es largo lo tiene quien lo escribe, y un
patrón léxico no puede distinguir ``pytest tests/unit/x/test_uno.py::test_a``
—segundos— de la suite entera. Bloquear con un instrumento que no discrimina
sería el sub-patrón D con el gate como sujeto.
"""
from __future__ import annotations

import re

#: Familias de trabajo cuya duración típica supera el medio minuto. Cada entrada
#: es (etiqueta, patrón); la etiqueta se cita en el aviso para que el lector sepa
#: qué lo disparó en vez de recibir un recordatorio genérico.
LONG_FAMILIES: tuple[tuple[str, str], ...] = (
    ("la suite", r"\b(?:tests/run\.sh|pytest|bun\s+test|npm\s+(?:test|ci)|jest)\b"),
    ("un build", r"\b(?:make\s+html|sphinx-build|npm\s+run\s+build|webpack)\b"),
    ("un gate de corpus", r"\b(?:thyrox-audit|check_vocabulario_prosa|linkcheck)\b"),
    ("una migración", r"\bmanage\.py\s+migrate\b"),
)

#: Ya va por el mecanismo: el aviso no aplica. ``bg.sh``/``run-task-pool``/
#: ``wait-jobs`` son los ensambladores; ``nohup`` y ``&`` con ``disown`` son la
#: forma a mano, que la regla no prohíbe — sólo prefiere la herramienta.
ALREADY_BACKGROUND = re.compile(
    r"\b(?:bg\.sh|run-task-pool|wait-jobs|nohup|disown|setsid)\b"
)

#: El lanzamiento de un subagente NO cuenta como segundo plano: es una
#: conversación que paga el piso por turno. Se nombra aparte para que el aviso
#: pueda decirlo, no para eximir.
_LAUNCHER = "src/session/bg.sh"


#: Separadores de comando del shell. Cada trozo es un comando candidato.
_SEPARATORS = re.compile(r"&&|\|\||[;|\n]")

#: Envolturas que preceden al programa real sin serlo, y las asignaciones de
#: entorno (``DJANGO_SETTINGS_MODULE=x pytest``). Se pelan una por una.
_WRAPPERS = re.compile(
    r"^\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*|sudo|time|env|exec|bash|sh|uv\s+run|"
    r"npx|python3?|poetry\s+run)\s+"
)


def command_heads(command: str) -> list[str]:
    """Los segmentos del comando, ya sin envolturas ni asignaciones.

    Es lo que hace la diferencia entre ejecutar ``pytest`` y **nombrarlo** como
    argumento de un ``grep``: sólo el primero queda al principio de un segmento.
    """
    heads = []
    for chunk in _SEPARATORS.split(command):
        head = chunk.strip()
        while head:
            peeled = _WRAPPERS.sub("", head, count=1)
            if peeled == head:
                break
            head = peeled.strip()
        if head:
            heads.append(head)
    return heads


def matched_families(command: str) -> list[str]:
    """Las familias largas que este comando invoca, en orden de declaración."""
    heads = command_heads(command)
    return [label for label, pattern in LONG_FAMILIES
            if any(re.match(pattern, head) for head in heads)]


def detect(payload: dict) -> str | None:
    """El aviso de segundo plano si el comando lo merece, o ``None``."""
    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command")
    if not isinstance(command, str) or not command.strip():
        return None

    # Un comando que ya viaja por el mecanismo cumple la regla: callar.
    if ALREADY_BACKGROUND.search(command):
        return None

    families = matched_families(command)
    if not families:
        return None

    return (
        "GATE DE SEGUNDO PLANO — este comando invoca "
        + ", ".join(families)
        + ", y va en primer plano. `.claude/rules/trabajo-en-segundo-plano.md`: "
        f"lánzalo con `bash {_LAUNCHER} start <nombre> -- <comando>` y recógelo "
        "con `wait`; si son varios, `run-task-pool.sh` con su anchura y "
        "`wait-jobs.sh` como barrera. Un proceso cuesta CERO tokens; despachar "
        "un subagente para esto paga el piso de 126 029 tokens por turno. Si el "
        "comando es de segundos —un test suelto, un gate de un archivo— ignora "
        "este aviso: mide la familia, no la duración real."
    )
