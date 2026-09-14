"""Detector PreToolUse: el trabajo determinista que se iba a despachar a un agente.

Es el gemelo de ``detect_foreground_long_command``. Aquél mide un **comando** y
pregunta «¿primer plano o segundo plano?»; éste mide un **despacho** y pregunta
la que ningún gate hacía: **¿proceso o agente?**

La asimetría de coste no es de estilo, está medida y vive en
``.claude/rules/trabajo-en-segundo-plano.md``: un trabajo en segundo plano es un
**proceso** y cuesta **cero tokens**; un subagente es una **conversación** que
paga en frío el piso siempre-cargado —126 029 tokens (``H-DOCS-99``)— y lo paga
**por turno**. El agente rinde cuando el trabajo es ancho y exige juicio; una
suite, un gate, un censo o un barrido no lo son, y despacharlos es pagar una
conversación por un ``exit code``.

Qué lo dispara — las DOS mitades
--------------------------------

1. el prompt (o la descripción) invoca una **familia determinista**: suite,
   gate, build, censo o barrido, búsqueda mecánica, migración; **y**
2. no aparece **ningún verbo de juicio** — decidir, elegir, evaluar, ponderar,
   triar, recomendar, comparar, analizar, clasificar, redactar.

La segunda mitad es la que carga el peso. Sin ella el aviso saldría en todo
despacho que mencione un comando, incluido el análisis que sí necesita un
agente — y un aviso que sale siempre se aprende a ignorar. Es lo que su suite
mide con el control de anulación: mismo trabajo determinista con una sola
cláusula de juicio añadida tiene que callar.

Qué NO hace, y es deliberado
----------------------------

**No bloquea.** Sale por ``additionalContext`` como sus hermanos del
despachador. Un patrón léxico no separa «corre la suite y dime el conteo» de
«corre la suite y decide qué rojos son regresión»: la segunda mitad acota el
falso positivo, no lo cierra. Bloquear con un instrumento que no discrimina
sería el sub-patrón D de ``metrica-decide-la-conclusion.md`` con el propio gate
como sujeto.

*Métrica:* familias deterministas y verbos de juicio, por literal, sobre el
``prompt`` y la ``description`` del ``tool_input``.
*Ciega a:* el trabajo determinista descrito **sin** nombrar su familia —«haz lo
que dice el documento»—; al prompt que nombra un verbo de juicio decorativo sin
que el trabajo lo exija; y a la anchura, que es el otro eje por el que un agente
se justifica y ningún literal declara.
"""
from __future__ import annotations

import re

#: Familias de trabajo cuyo resultado es un ``exit code`` o un conteo: no
#: depende de decidir nada, así que su ejecutor natural es un proceso. La
#: etiqueta se cita en el aviso para que el lector sepa qué lo disparó.
DETERMINISTIC_FAMILIES: tuple[tuple[str, str], ...] = (
    ("una suite", r"\b(?:suites?|pytest|bun\s+test|jest|tests/run\.sh|npm\s+test)\b"),
    ("un gate", r"\b(?:gates?|thyrox-audit|check_[a-z_]+|pre-commit)\b"),
    ("un build", r"\b(?:make\s+html|sphinx-build|webpack|npm\s+run\s+build)\b"),
    ("un censo o barrido", r"\b(?:censo|censar|barrido|barrer|conteo|contar|inventariar)\b"),
    ("una búsqueda mecánica", r"\b(?:grep|rg|git\s+grep|find\b)"),
    ("una migración", r"\bmanage\.py\s+migrate\b|\bmigrat(?:e|ions?)\b"),
)

#: Verbos que sólo un modelo resuelve. Su presencia retira el aviso: el trabajo
#: no es un ``exit code``, y el agente es el ejecutor correcto. La raíz va sin
#: sufijo para cubrir las conjugaciones sin enumerarlas.
JUDGMENT_ROOTS = re.compile(
    r"\b(?:decid|decís|elegir|elige|elij|eval[uú]|ponder|triar|tría|tria\b|"
    r"recomend|compar|juicio|criterio|analiz|análisis|analisis|diseñ|disen|"
    r"redact|veredicto|clasific|interpret|justific|argument)",
    re.IGNORECASE,
)


def dispatched_text(tool_input: dict) -> str:
    """El texto que describe el trabajo: el prompt más su descripción.

    Los dos, no sólo el primero: un despacho puede llevar el trabajo en el
    título y remitir al cuerpo de otro documento en el prompt.
    """
    parts = [tool_input.get("prompt"), tool_input.get("description")]
    return "\n".join(p for p in parts if isinstance(p, str))


def matched_families(text: str) -> list[str]:
    """Las familias deterministas que el texto invoca, en orden de declaración."""
    return [label for label, pattern in DETERMINISTIC_FAMILIES
            if re.search(pattern, text, re.IGNORECASE)]


def needs_judgment(text: str) -> bool:
    """Si el trabajo descrito exige decidir algo, y por tanto es para un agente."""
    return bool(JUDGMENT_ROOTS.search(text))


def detect(payload: dict) -> str | None:
    """El aviso de despacho si el trabajo es un proceso, o ``None``."""
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return None

    text = dispatched_text(tool_input)
    # Sin prompt no hay despacho que medir: un `Bash` o un `Write` pasan por el
    # mismo despachador y no traen este campo.
    if not text.strip():
        return None

    if needs_judgment(text):
        return None

    families = matched_families(text)
    if not families:
        return None

    return (
        "GATE DE DESPACHO — ¿proceso o agente? Este despacho describe "
        + ", ".join(families)
        + ", y no nombra ninguna decisión que tomar. Un trabajo cuyo resultado "
        "es un `exit code` o un conteo es un PROCESO: cuesta **cero** tokens. "
        "Un subagente es una conversación que paga en frío el piso "
        "siempre-cargado —126 029 tokens— y lo paga POR TURNO. "
        "`.claude/rules/trabajo-en-segundo-plano.md`: lánzalo con "
        "`bash src/session/bg.sh start <nombre> -- <comando>` y recógelo con "
        "`wait`; si son varios, `run-task-pool.sh` con su anchura y "
        "`wait-jobs.sh` como barrera. Si el trabajo sí exige juicio —decidir "
        "entre opciones, triar, redactar un análisis— ignora este aviso y "
        "dilo en el prompt: mide los literales, no la anchura real."
    )
