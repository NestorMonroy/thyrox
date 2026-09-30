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

Las esperas se miden aparte
---------------------------

Una espera (``BLOCKING_WAIT``) nombra el mecanismo, así que el descuento la
eximiría. Tiene dos defectos distintos, cada uno con su aviso: en el primer
plano del cliente **bloquea** el turno; desprendida del shell —lista cerrada
por ``&``, o envuelta en ``nohup``/``setsid``— **no notifica** a nadie y recoge
el trabajo del ledger en silencio. La desprendida se mide primero porque
``run_in_background`` no la corrige: el defecto está en el comando.

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

#: El cuerpo de un heredoc es texto, no comandos: un mensaje de commit que
#: nombra una suite no la ejecuta.
from hooks.shell_text import strip_heredoc_bodies  # noqa: E402

#: Familias de trabajo cuya duración típica supera los diez segundos. Cada entrada
#: es (etiqueta, patrón); la etiqueta se cita en el aviso para que el lector sepa
#: qué lo disparó en vez de recibir un recordatorio genérico.
LONG_FAMILIES: tuple[tuple[str, str], ...] = (
    # Las suites de este árbol se invocan por su archivo —`bash tests/<área>/test-*.sh`,
    # `python3 tests/<área>/test_*.py`—; tras pelar el intérprete, la ruta queda
    # al principio del segmento.
    ("la suite", r"(?:\b(?:tests/run\.sh|pytest|bun\s+test|npm\s+(?:test|ci)|jest)\b"
                 r"|(?:[\w./-]*/)?tests/[\w./-]*test[-_][\w.-]*\.(?:sh|py)(?=\s|$))"),
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
    r"^\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*|sudo|time|timeout\s+\S+|env|exec|bash|sh|uv\s+run|"
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



#: Las esperas que BLOQUEAN hasta que un trabajo termina. Nombran el mecanismo
#: de segundo plano, así que el descuento de ``ALREADY_BACKGROUND`` las
#: eximiría; se miden aparte porque una espera es un comando largo y va al
#: segundo plano del cliente, que notifica al terminar (directiva del
#: ejecutor).
BLOCKING_WAIT = re.compile(
    r"\b(?:(?:thyrox-bg|bg\.sh)\s+wait|wait-jobs(?:\.sh)?\s+wait|marker_wait)\b"
)


#: Separadores de LISTA del shell: ``;``, salto de línea y el ``&`` suelto. El
#: ``&`` desprende la lista entera que termina —``a && b &`` lanza las dos—, así
#: que ``&&``, ``||`` y ``|`` quedan dentro. Se excluye el ``&`` de una
#: redirección (``2>&1``, ``&>log``, ``<&3``): redirige, no desprende.
_LIST_TERMINATOR = re.compile(r";|\n|(?<![&<>|])&(?![&>])")

#: Envolturas que desprenden sin ``&``: ``setsid -f`` sale en el acto, y
#: ``nohup`` sólo tiene sentido para un proceso que sobrevive al shell.
#: ``disown`` no figura: sin un ``&`` previo no desprende nada, y con él ya lo
#: delata el terminador.
_DETACHING_WRAPPER = re.compile(r"\b(?:nohup|setsid)\b")


def shell_lists(command: str) -> list[tuple[str, str]]:
    """Cada lista del comando con el terminador que la cierra (``""`` al final)."""
    lists = []
    start = 0
    for terminator in _LIST_TERMINATOR.finditer(command):
        lists.append((command[start:terminator.start()], terminator.group()))
        start = terminator.end()
    lists.append((command[start:], ""))
    return lists


def is_detached(shell_list: str, terminator: str) -> bool:
    """La lista corre fuera del shell que la lanza: ``&`` final o envoltura."""
    return terminator == "&" or bool(_DETACHING_WRAPPER.search(shell_list))


def detaches_a_wait(command: str) -> bool:
    """Alguna espera del comando se desprende del shell en vez de esperar en él."""
    return any(BLOCKING_WAIT.search(shell_list) and is_detached(shell_list, terminator)
               for shell_list, terminator in shell_lists(command))


def blocks_the_turn(command: str, tool_input: dict) -> bool:
    """Una espera en el primer plano del cliente: retiene el turno hasta terminar."""
    return bool(BLOCKING_WAIT.search(command)) and not tool_input.get("run_in_background")


#: La espera desprendida corre en el segundo plano del SHELL: el cliente no la
#: ve, nadie recibe aviso al terminar y recoge el trabajo del ledger en
#: silencio. Es el defecto de TASK-THYROX-0668, distinto de bloquear.
DETACHED_WAIT_NOTICE = (
    "GATE DE SEGUNDO PLANO — esta ESPERA se desprende del shell (`&`, `nohup` "
    "o `setsid`): corre en el segundo plano del SHELL, no en el del cliente, así "
    "que nadie recibe aviso cuando termina y recoge el trabajo del ledger en "
    "silencio. Lanza el mismo comando sin `&` ni `disown` (ni `nohup`/`setsid`) "
    "con `run_in_background` del cliente: es lo único que notifica."
)

BLOCKING_WAIT_NOTICE = (
    "GATE DE SEGUNDO PLANO — esta ESPERA bloquea el turno hasta que el "
    "trabajo termine. Una espera es un comando largo: lánzala con "
    "`run_in_background` y sigue trabajando; el cliente te notifica "
    "cuando termina. Para mirar sin bloquear: `thyrox-bg status <nombre>` "
    "o `wait-jobs status`."
)


def detect(payload: dict) -> str | None:
    """El aviso de segundo plano si el comando lo merece, o ``None``."""
    tool_input = payload.get("tool_input") or {}
    command = tool_input.get("command")
    if not isinstance(command, str) or not command.strip():
        return None

    executed = strip_heredoc_bodies(command)
    if detaches_a_wait(executed):
        return DETACHED_WAIT_NOTICE
    if blocks_the_turn(executed, tool_input):
        return BLOCKING_WAIT_NOTICE

    # Un comando que ya viaja por el mecanismo cumple la regla: callar.
    if ALREADY_BACKGROUND.search(command):
        return None

    families = matched_families(strip_heredoc_bodies(command))
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
