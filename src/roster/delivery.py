#!/usr/bin/env python3
"""Separa los tres desenlaces que el roster colapsa en «terminado».

El roster clasifica un subagente como `vivo`, `atascado`, `desaparecido`,
`terminado` o `indecidible`. `terminado` mete en el mismo cubo tres cosas con
conductas opuestas para quien coordina:

- **entregó** — cerró con su reporte final;
- **cortado** — se quedó a media llamada de herramienta, sin reporte;
- **indecidible** — el transcript no permite decirlo.

Confundirlos es lo que hace que un agente que entregó se lea como uno que se
detuvo. Es la pregunta que el ejecutor hizo tres veces en una sesión, y no
tenía instrumento que la respondiera.

El discriminador, medido — y NO es lo que parece
------------------------------------------------
No es el tipo de la última línea. Medido sobre el roster vivo de esta sesión,
**84 de 98** transcripts terminan en una línea `attachment`, que el cliente
apila DESPUÉS del cierre; sólo 14 terminan en `assistant`. Un clasificador
que mire la última línea llama indecidibles a 84 agentes que entregaron.

El discriminador es el **último mensaje `assistant`** y la forma de sus
bloques: un bloque `text` es el reporte; un `tool_use` es una llamada que
nunca volvió.

*Métrica:* tipo de los bloques del último mensaje `assistant` del transcript.
*Ciega a:* la diferencia entre «se cortó solo» y «lo detuvieron desde fuera».
Las dos dejan la misma forma, y separarlas exige una señal del cliente que el
transcript no lleva. Por eso `CUT` no se llama «detenido»: nombraría una causa
que el instrumento no puede ver.
"""
from __future__ import annotations

import json

#: Los tres desenlaces. Se declaran como constantes para que un consumidor no
#: escriba la cadena a mano y quede fuera de sincronía en silencio.
DELIVERED = "delivered"
CUT = "cut"
UNDECIDABLE = "undecidable"

VERDICTS = (DELIVERED, CUT, UNDECIDABLE)

#: Un bloque de pensamiento no es entrega ni la impide: acompaña al reporte y
#: también a una llamada de herramienta. Se descuenta antes de decidir.
_IGNORED_BLOCKS = frozenset({"thinking", "redacted_thinking"})


def _blocks(entry: dict) -> set[str]:
    message = entry.get("message")
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, list):
        return set()
    return {b.get("type") for b in content if isinstance(b, dict)}


def last_assistant(text: str) -> dict | None:
    """El último mensaje `assistant`, saltando lo que el cliente apila después.

    Recorre hacia atrás y devuelve `None` si no hay ninguno — que es un estado
    real, no un fallo: un agente que murió antes de su primer turno no dejó
    mensaje que leer.
    """
    for line in reversed(text.splitlines()):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue          # una línea rota no invalida las anteriores
        if isinstance(entry, dict) and entry.get("type") == "assistant":
            return entry
    return None


def classify(text: str) -> str:
    """El desenlace de un transcript YA CERRADO, en una de las tres constantes.

    PRECONDICIÓN — el transcript no puede estar vivo. Un agente que sigue
    trabajando está, por construcción, a media llamada de herramienta: su
    último `assistant` lleva un `tool_use` y esta función lo llama ``CUT``.
    No es un falso positivo del clasificador sino su dominio: separa desenlaces,
    y un agente vivo todavía no tiene ninguno.

    Medido al cablearlo: de los dos casos que el roster ofrecía como ``cut``,
    uno era un agente **en ejecución** en ese instante. Por eso el consumidor
    llama aquí sólo cuando la vivacidad ya dio ``terminated`` — el guard vive
    aguas arriba, y sin él este veredicto miente sobre los vivos.
    """
    entry = last_assistant(text)
    if entry is None:
        return UNDECIDABLE
    kinds = _blocks(entry) - _IGNORED_BLOCKS
    if "tool_use" in kinds:
        return CUT
    if "text" in kinds:
        return DELIVERED
    return UNDECIDABLE
