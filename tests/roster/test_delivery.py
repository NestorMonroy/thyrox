#!/usr/bin/env python3
"""Control de `roster.delivery` — «terminó» son TRES estados, no uno.

El roster colapsa en `terminado` tres desenlaces con conductas opuestas:
entregó, se cortó a media herramienta, y no se puede decidir. Confundirlos
es lo que hace que un agente que entregó se lea como uno que se detuvo — la
pregunta que el ejecutor hizo tres veces en una sesión.

El discriminador NO es la última línea del transcript: medido en este build,
84 de 98 terminan en `attachment`, que se apila DESPUÉS del cierre. Es el
último mensaje `assistant` y la forma de sus bloques.

Control de anulación: al retirar el filtro por `assistant`, la clasificación
cae al tipo de la última línea y los 84 `attachment` pasan a indecidibles.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from roster import delivery  # noqa: E402

PASSED = FAILED = 0


def check(label: str, expected, actual) -> None:
    global PASSED, FAILED
    if expected == actual:
        PASSED += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def transcript(*entries: dict) -> str:
    return "\n".join(json.dumps(e) for e in entries) + "\n"


def assistant(*kinds: str) -> dict:
    return {"type": "assistant",
            "message": {"content": [{"type": k, "text": "x"} for k in kinds]}}


print("1. Los tres desenlaces se separan")
check("cierra con texto -> entregó", delivery.DELIVERED,
      delivery.classify(transcript(assistant("text"))))
check("cierra con tool_use -> cortado", delivery.CUT,
      delivery.classify(transcript(assistant("tool_use"))))
check("sin mensaje assistant -> indecidible", delivery.UNDECIDABLE,
      delivery.classify(transcript({"type": "user", "message": {}})))

print("\n2. El `attachment` de cierre NO decide — es lo que apila el cliente")
check("texto seguido de attachment sigue siendo entregó", delivery.DELIVERED,
      delivery.classify(transcript(assistant("text"), {"type": "attachment"})))
check("tool_use seguido de attachment sigue siendo cortado", delivery.CUT,
      delivery.classify(transcript(assistant("tool_use"), {"type": "attachment"})))

print("\n3. El pensamiento no cuenta como entrega ni la impide")
check("texto + thinking -> entregó", delivery.DELIVERED,
      delivery.classify(transcript(assistant("thinking", "text"))))
check("sólo thinking -> indecidible", delivery.UNDECIDABLE,
      delivery.classify(transcript(assistant("thinking"))))

print("\n4. Rehúsa antes que adivinar")
check("línea ilegible sola -> indecidible", delivery.UNDECIDABLE,
      delivery.classify("{no es json\n"))
check("transcript vacío -> indecidible", delivery.UNDECIDABLE,
      delivery.classify(""))

print(f"\nresultado: {PASSED} de {PASSED + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
