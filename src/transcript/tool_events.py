"""Extraer del transcript las llamadas a herramienta, con su antigüedad.

Es el **sustrato** que ``roster.production`` declara inyectable (DEC-04):
aquél sabe qué efecto tiene una llamada sobre el árbol y no sabe leer un
transcript; éste sabe leer un transcript y no opina sobre efectos. Separarlos
es lo que permite alimentar el mismo veredicto desde otra fuente —el log de
una tarea de ``Bash``, una prueba que construye los eventos a mano— sin tocar
la taxonomía.

La forma de la línea, medida sobre un transcript real de esta sesión: un
objeto por línea con ``timestamp`` en ISO 8601 con ``Z``, y ``message.content``
como lista de bloques donde los de ``type == "tool_use"`` traen ``name`` e
``input``.

Un evento SIN fecha legible no se descarta en silencio: va a ``undated``, por
el mismo criterio con que ``roster.job_liveness.sweep`` separa la cuarentena de
los diagnósticos. Colapsarlo con «no hubo evento» haría que un transcript de
formato inesperado publicara el mismo vacío que uno tranquilo.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from .messages import _lines

#: El tipo de bloque que declara una llamada a herramienta.
TOOL_USE = "tool_use"


@dataclass(frozen=True)
class EventScan:
    """Los eventos fechados y los que no se pudieron fechar — disjuntos.

    ``events`` viaja en la forma que ``roster.production.summarize`` consume:
    ``(name, tool_input, age_seconds)``. ``undated`` guarda sólo el nombre,
    porque sin fecha no hay ventana en la que colocarlo.
    """

    events: list[tuple[str, Any, float]]
    undated: list[str]


def _age(stamp: Any, now: float) -> float | None:
    """Segundos entre la marca ISO 8601 del cliente y ``now``; ``None`` si no parsea."""
    if not isinstance(stamp, str) or not stamp:
        return None
    text = stamp[:-1] + "+00:00" if stamp.endswith("Z") else stamp
    try:
        return now - datetime.fromisoformat(text).timestamp()
    except ValueError:
        return None


def scan(path: str | Path, *, now: float) -> EventScan:
    """Recorre el transcript y devuelve sus llamadas a herramienta.

    Un archivo ausente o ilegible produce un escaneo vacío, no una excepción:
    ``_lines`` ya traga el ``OSError`` — quien necesite distinguir «no existe»
    de «existe y no hizo nada» lo pregunta al roster, que es quien tiene la
    entrada.
    """
    events: list[tuple[str, Any, float]] = []
    undated: list[str] = []
    for line in _lines(path):
        message = line.get("message")
        if not isinstance(message, dict):
            continue
        content = message.get("content")
        if not isinstance(content, list):
            continue
        age = _age(line.get("timestamp"), now)
        for block in content:
            if not isinstance(block, dict) or block.get("type") != TOOL_USE:
                continue
            name = block.get("name") or ""
            if age is None:
                undated.append(name)
            else:
                events.append((name, block.get("input"), age))
    return EventScan(events=events, undated=undated)
