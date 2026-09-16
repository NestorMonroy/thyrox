"""Cola con memoria: conserva lineas criticas que una ventana ciega descartaria.

``tail -N`` no distingue una linea de relleno de un ``FATAL`` o el resumen
final de un ``pytest`` — corta por posicion, no por contenido. El defecto ya
esta medido en este mismo arbol: ``H-DOCS-155`` cita un caso real donde
``7 failed`` existia en el log y nadie lo vio porque cayo fuera de la ventana
que se mostro.

No es un port de SmartCrusher (headroom, README.md:373): ese mecanismo mide
varianza estadistica sobre CAMPOS de un documento JSON, y aqui el sustrato es
texto plano de un log de shell — no hay campos que medir. Lo que se adapta es
el PRINCIPIO que headroom declara (preservar una linea critica bajo
compresion), reimplementado nativo con patrones declarados en vez de
estadistica de campo.
"""
from __future__ import annotations

import re
from collections.abc import Iterable

# Patrones por defecto: el marcador de excepcion no capturada, el resumen de
# una suite de pytest (que empieza la LINEA con el conteo — evita que un
# comentario que MENCIONE la palabra "failed" en otro lugar cuente), y la
# linea de aserccion fallida que pytest antepone con "E ".
DEFAULT_PATTERNS: tuple[str, ...] = (
    r"\bFATAL\b",
    r"Traceback \(most recent call last\)",
    r"\bERROR\b",
    r"^\d+ (?:failed|error(?:s)?)\b",
    r"^E\s",
)


def smart_tail(
    text: str,
    window: int,
    patterns: Iterable[str] = DEFAULT_PATTERNS,
) -> str:
    """Las ultimas ``window`` lineas de ``text``, mas las criticas que caigan
    fuera de esa ventana.

    Una linea es critica cuando ``re.search`` de algun patron de ``patterns``
    la empareja. Las criticas ya presentes dentro de la ventana no se repiten.
    El orden de salida es: rescatadas (en su orden original), un separador,
    luego la ventana final — para que la ventana siga siendo reconocible como
    "lo ultimo que paso", con lo rescatado a la vista pero aparte.

    ``patterns=()`` apaga el rescate por completo — es el control de
    anulacion de este modulo: con el vacio, ``smart_tail`` se reduce
    exactamente a ``tail -N``.
    """
    if not text:
        return ""
    all_lines = text.splitlines()
    if window <= 0:
        return ""
    cut = max(0, len(all_lines) - window)
    tail_lines = all_lines[cut:]
    compiled = [re.compile(p) for p in patterns]
    if not compiled:
        return "\n".join(tail_lines)
    rescued = [
        line
        for line in all_lines[:cut]
        if any(pattern.search(line) for pattern in compiled)
    ]
    if not rescued:
        return "\n".join(tail_lines)
    header = f"[log_tail] {len(rescued)} linea(s) critica(s) fuera de la ventana de {window}:"
    return "\n".join([header, *rescued, "---", *tail_lines])
