"""Detector PreToolUse: cita efímera (``#N`` del board) donde hace falta una durable.

Es el gate de ``.claude/CLAUDE.md`` — Flujo de sesión, pasos 4/5 — y del
episodio que los originó: un turno entero citó ``#9``/``#10`` en dos
commits y en el propio banco de evidencia (``.claude/workbench/``) antes
de acuñar su ``TASK-THYROX-NNNN`` con ``src/task/task_ids.py
ingerir-board``. La prosa que lo corrigió no lo previene — "la lección
escrita no previene la reincidencia; sólo un gate ejecutable integrado en
el flujo lo hace" (``gitlink-bump-gate.md``, citado en varios rules de
este mismo árbol) — así que esto es lo que la hace mecánica.

Qué dispara
-----------

Dos superficies, la misma pregunta: ¿el texto que va a persistir cita una
tarea por su forma EFÍMERA sin también citar su forma durable?

- un ``git commit`` (``Bash``, mensaje via ``-m`` o heredoc) cuyo mensaje
  nombra ``board #N`` / ``tarea #N`` / ``task #N`` / ``T-N``;
- un ``Write``/``Edit`` sobre un archivo bajo ``.claude/workbench/`` o
  ``.claude/jobs/`` (el banco/job de evidencia) con el mismo patrón.

Si el MISMO texto ya trae una cita durable (``TASK-[A-Z]+-NNNN``), calla:
el episodio real no era citar el ordinal —eso es legítimo como referencia
de lectura humana— sino citar SÓLO el ordinal, sin que ninguna forma
durable lo acompañe en el mismo texto.

Qué NO dispara, deliberado
---------------------------

Un ``#N`` que no acompaña una palabra de tarea —un encabezado markdown, un
color hex, una referencia de PR/issue de GitHub tipo ``#123`` a secas—
no matchea: el ancla es la PALABRA que precede al signo, no el signo solo.
Sin esa ancla, cualquier ``#`` seguido de dígitos dispararía sobre texto
que nunca habla de una tarea del board.
"""
from __future__ import annotations

import re

#: La forma EFÍMERA — el ordinal del board, con o sin la palabra que lo
#: nombra como tarea. Ancla en la palabra: un "#9" suelto (color, issue de
#: GitHub) no matchea.
EPHEMERAL = re.compile(
    r"\b(?:board|tarea|task|tarjeta)\s+#\d+\b|\bT-\d+\b",
    re.IGNORECASE,
)

#: La forma DURABLE que la regla exige como acompañante. Mismo patrón que
#: ``census_open_tasks.py::CITATION`` — no se copia el literal, se declara
#: aparte porque ese módulo no expone su patrón como símbolo importable
#: sin arrastrar su CLI; dos copias del MISMO patrón valen la pena aquí
#: porque una es de 25 caracteres y no diverge por su cuenta.
DURABLE = re.compile(r"\bTASK-[A-Z]+-[0-9]{4}\b")

#: Rutas del banco/job de evidencia — la otra superficie, junto a un commit.
EVIDENCE_PATH = re.compile(r"\.claude/(?:workbench|jobs)/")


def _text_to_scan(payload: dict) -> tuple[str, str] | None:
    """El texto a medir y su procedencia (``"commit"`` o ``"evidencia"``), o ``None``."""
    tool_input = payload.get("tool_input") or {}

    command = tool_input.get("command")
    if isinstance(command, str) and re.search(r"\bgit\s+commit\b", command):
        return command, "commit"

    file_path = str(tool_input.get("file_path") or "").replace("\\", "/")
    if EVIDENCE_PATH.search(file_path):
        content = tool_input.get("content") or tool_input.get("new_string") or ""
        if isinstance(content, str) and content.strip():
            return content, "evidencia"

    return None


def detect(payload: dict) -> str | None:
    """El aviso si el texto cita la forma efímera sin la durable, o ``None``."""
    found = _text_to_scan(payload)
    if found is None:
        return None
    text, source = found

    efimeras = sorted(set(m.group(0) for m in EPHEMERAL.finditer(text)))
    if not efimeras:
        return None
    if DURABLE.search(text):
        return None

    lugar = "el mensaje del commit" if source == "commit" else "este archivo del banco/job"
    return (
        "GATE DE CITA EFÍMERA — "
        + lugar
        + " nombra "
        + ", ".join(f"`{e}`" for e in efimeras)
        + " (el ordinal del board) sin ninguna cita durable `TASK-<CAPA>-NNNN` "
          "que la acompañe. `.claude/CLAUDE.md` (Flujo de sesión, paso 4): el "
          "`#N` reinicia por sesión y colisiona 332 de 337 veces entre dos "
          "(`src/task/task_ids.py`) — citarlo solo fabrica una referencia "
          "rota desde este mismo commit. Acuñar antes de citar: "
          "`python3 -m src.task.task_ids ingerir-board <session_id> <ordinal> "
          "--capa thyrox`."
    )
