#!/usr/bin/env python3
"""Suite de ``src/learning/reward.py``: el contrato de recompensa.

Qué tiene que garantizar:
- las compuertas duras van primero: una sola en ``False`` o DESCONOCIDA (``None`` o
  ausente) deja la recompensa en 0 aunque el verificador acepte;
- recompensa 1 sólo con verificador aceptado y todas las compuertas requeridas en ``True``;
- los costes se registran aparte y nunca mueven la recompensa;
- un coste desconocido ordena DETRÁS de uno medido, nunca como cero;
- el orden de candidatos es lexicográfico: P(aceptado), tokens facturables, USD,
  latencia, reintentos.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from learning.reward import (
    HARD_GATES,
    REWARD_VERSION,
    CandidateStats,
    ranking_key,
    reward_for,
)

OK = FAILED = 0


def check(name: str, condition: bool) -> None:
    global OK, FAILED
    OK, FAILED = (OK + 1, FAILED) if condition else (OK, FAILED + 1)
    print(("ok   " if condition else "FAIL ") + name)


ALL_PASS = {gate: True for gate in HARD_GATES}
COSTS = {"billableTokens": 5000, "usd": None, "latencyMs": 120000, "retries": 1, "providerTransients": 2}

print("== 1. aceptado: todas las compuertas y el verificador ==")
outcome = reward_for(ALL_PASS, verifier_accepted=True, costs=COSTS)
check("recompensa 1", outcome.reward == 1.0 and outcome.accepted)
check("versión del contrato", outcome.reward_version == REWARD_VERSION)
check("costes aparte, sin tocar", outcome.costs == COSTS)

print("== 2. el verificador rechaza: 0 aunque las compuertas pasen ==")
check("rechazado por el verificador", reward_for(ALL_PASS, verifier_accepted=False, costs=COSTS).reward == 0.0)

print("== 3. una compuerta falla o es desconocida: 0 aunque el verificador acepte ==")
failed = reward_for({**ALL_PASS, "secret_boundary": False}, verifier_accepted=True, costs=COSTS)
check("compuerta en False", failed.reward == 0.0 and failed.failed_gates == ("secret_boundary",))
unknown = reward_for({**ALL_PASS, "typecheck": None}, verifier_accepted=True, costs=COSTS)
check("compuerta desconocida", unknown.reward == 0.0 and unknown.unknown_gates == ("typecheck",))
missing = dict(ALL_PASS)
del missing["annulment"]
check("compuerta ausente cuenta como desconocida", reward_for(missing, True, COSTS).unknown_gates == ("annulment",))

print("== 4. sólo las compuertas requeridas cuentan ==")
check("subconjunto requerido", reward_for({"green": True}, True, COSTS, required=("green",)).reward == 1.0)

print("== 5. orden lexicográfico de candidatos ==")
cheap = CandidateStats("a", p_accepted=0.8, billable_tokens=1000, usd=None, latency_ms=10, retries=0)
dear = CandidateStats("b", p_accepted=0.8, billable_tokens=9000, usd=None, latency_ms=1, retries=0)
better = CandidateStats("c", p_accepted=0.9, billable_tokens=99999, usd=None, latency_ms=99, retries=9)
unmeasured = CandidateStats("d", p_accepted=0.8, billable_tokens=None, usd=None, latency_ms=1, retries=0)
ranked = [c.action for c in sorted([dear, unmeasured, cheap, better], key=ranking_key)]
check("P(aceptado) primero; luego tokens; lo desconocido al final", ranked == ["c", "a", "b", "d"])

print(f"\n{OK + FAILED} casos: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
