#!/usr/bin/env python3
"""Control de `roster.recovery` — qué se hace con cada desenlace, y cuándo.

`delivery` separa los desenlaces; éste decide la acción. El caso que lo
originó: cinco subagentes cortados por el límite semanal (429,
`rateLimitType: seven_day`, `resetsAt` a tres días). Reanudarlos antes de esa
hora repite el mismo 429; después, `SendMessage` a su id los retoma con su
contexto. Un 400 no se reanuda: la misma petición vuelve a fallar.
"""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from roster import recovery  # noqa: E402

PASSED = FAILED = 0
RESETS_AT = 1790748000          # 2026-09-30T06:00:00Z, medido en el transcript real


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
    return {"type": "assistant", "message": {"content": [{"type": k, "text": "x"} for k in kinds]}}


def api_error(status: int, quota: dict | None = None) -> dict:
    entry = {"type": "assistant", "isApiErrorMessage": True, "apiErrorStatus": status,
             "message": {"content": [{"type": "text", "text": "error"}]}}
    if quota is not None:
        entry["quotaLimits"] = quota
    return entry


print("1. Cada desenlace tiene su acción")
check("entregó -> recoger", recovery.COLLECT,
      recovery.plan(transcript(assistant("text")), now=0).action)
check("cortado -> reanudar", recovery.RESUME,
      recovery.plan(transcript(assistant("tool_use")), now=0).action)
check("indecidible -> leer el transcript", recovery.INSPECT,
      recovery.plan("", now=0).action)

print("2. Un 429 se reanuda YA; la hora declarada es un dato, no una espera")
# Medido 2026-09-27: el servidor rechazó con `resetsAt` a tres días y, una
# hora después, `SendMessage` retomó el mismo agente en el mismo modelo sin
# 429. Esperar a la hora declarada habría parado tres días un trabajo que
# podía seguir. Si la reanudación vuelve a dar 429, el transcript lo dice y el
# roster lo vuelve a clasificar: el control es reintentar y medir.
limit_hit = api_error(429, {"status": "rejected", "resetsAt": RESETS_AT, "rateLimitType": "seven_day"})
before_reset = recovery.plan(transcript(limit_hit), now=RESETS_AT - 3600)
check("antes del reinicio declarado -> reanudar igual", recovery.RESUME, before_reset.action)
check("y conserva la hora que el servidor declaró", RESETS_AT, before_reset.retry_at)
check("y la razón nombra el tipo de límite y la hora", True,
      "seven_day" in before_reset.reason and "2026-09-30T06:00:00Z" in before_reset.reason)
after_reset = recovery.plan(transcript(limit_hit), now=RESETS_AT + 1)
check("pasado el reinicio -> reanudar", recovery.RESUME, after_reset.action)

print("3. Un 429 sin hora conocida se reanuda (no hay a qué esperar)")
check("429 sin quotaLimits -> reanudar", recovery.RESUME,
      recovery.plan(transcript(api_error(429)), now=0).action)

print("4. Un 400 no se reanuda")
bad_request = recovery.plan(transcript(api_error(400)), now=0)
check("400 -> relanzar con el prompt corregido", recovery.RELAUNCH, bad_request.action)
check("y lo explica", True, "400" in bad_request.reason)

print("5. La hora se publica en ISO")
check("iso de resetsAt", "2026-09-30T06:00:00Z", recovery.iso(RESETS_AT))

print(f"\nresultado: {PASSED} de {PASSED + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
