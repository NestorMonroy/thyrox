#!/usr/bin/env python3
"""Suite de ``src/verify/tsc_schedule.py``: el planificador del lazo tsc cero.

Qué tiene que garantizar, según ``plan-tsc-zero.rst``:
- ``ε`` se valida en ``[0, 1)``, como en el brief de label smoothing;
- la media de la posterior es la α̂ suavizada del plan;
- el registro cuenta sólo lo que es responsabilidad de la propuesta:
  ``ambiguous``, ``no-targets`` y los fallos de infraestructura no cuentan;
- Thompson sampling es reproducible con la misma semilla y EXPLORA: un
  proponente sin historia no queda condenado por no tenerla;
- el lote no lleva dos propuestas que toquen el mismo archivo.
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from verify.tsc_schedule import (  # noqa: E402
    Candidate, count_ledger, posterior, schedule, validate_epsilon,
)

OK = FAILED = 0


def check(name, expected, actual):
    global OK, FAILED
    if expected == actual:
        OK += 1
        print(f"  ok    {name}")
    else:
        FAILED += 1
        print(f"  FALLO {name}\n        esperado={expected!r} obtenido={actual!r}")


def raises(fn) -> str:
    try:
        fn()
        return "sin error"
    except Exception as error:  # la clase es la aserción
        return type(error).__name__


print("== 1. ε se valida en [0, 1) ==")
check("ε = 1 rehúsa", "ValueError", raises(lambda: validate_epsilon(1.0)))
check("ε negativo rehúsa", "ValueError", raises(lambda: validate_epsilon(-0.1)))
check("ε = 0 se admite", "sin error", raises(lambda: validate_epsilon(0.0)))
check("ε = 0.5 se admite", "sin error", raises(lambda: validate_epsilon(0.5)))

print("== 2. la media de la posterior es la α̂ suavizada del plan ==")
a, b = posterior(accepted=3, rejected=1, epsilon=0.5, alpha0=0.4)
check("a = aceptadas + ε·α₀", 3 + 0.5 * 0.4, a)
check("b = rechazadas + ε·(1 − α₀)", 1 + 0.5 * 0.6, b)
check("media = (k + ε·α₀)/(n + ε)", round((3 + 0.5 * 0.4) / (4 + 0.5), 12), round(a / (a + b), 12))

print("== 3. el registro cuenta sólo lo que es de la propuesta ==")
ledger = [
    {"proposer": "p", "outcome": "accepted"},
    {"proposer": "p", "outcome": "rejected"},
    {"proposer": "p", "outcome": "partial"},
    {"proposer": "p", "outcome": "ambiguous"},
    {"proposer": "p", "outcome": "no-targets"},
    {"proposer": "p", "outcome": "infrastructure"},
    {"proposer": "q", "outcome": "accepted"},
]
counts = count_ledger(ledger)
check("p: 1 aceptada, 2 rechazadas (partial cuenta como no aceptada)", (1, 2), counts["p"])
check("q: 1 aceptada, 0 rechazadas", (1, 0), counts["q"])

print("== 4. Thompson: reproducible y explora ==")
cands = [
    Candidate("a1", "veteran", 5, frozenset({"x.ts"})),
    Candidate("b1", "newcomer", 5, frozenset({"y.ts"})),
]
history = [{"proposer": "veteran", "outcome": "accepted"}] * 3 + \
          [{"proposer": "veteran", "outcome": "rejected"}] * 2
first = [c.proposal_id for c in schedule(cands, history, 0.5, 0.5, seed=7, max_batch=1).selected]
again = [c.proposal_id for c in schedule(cands, history, 0.5, 0.5, seed=7, max_batch=1).selected]
check("misma semilla, mismo lote", first, again)
picks = [schedule(cands, history, 0.5, 0.5, seed=s, max_batch=1).selected[0].proposer
         for s in range(200)]
check("el proponente sin historia sale elegido alguna vez", True, "newcomer" in picks)
check("y el veterano también", True, "veteran" in picks)
report = schedule(cands, history, 0.5, 0.5, seed=7, max_batch=1)
check("el informe guarda semilla, ε y α₀", (7, 0.5, 0.5),
      (report.seed, report.epsilon, report.alpha0))

print("== 5. sin interferencia: dos propuestas no comparten archivo ==")
clash = [
    Candidate("c1", "p", 9, frozenset({"same.ts"})),
    Candidate("c2", "p", 8, frozenset({"same.ts", "other.ts"})),
    Candidate("c3", "p", 1, frozenset({"free.ts"})),
]
chosen = {c.proposal_id for c in schedule(clash, [], 0.5, 0.5, seed=1).selected}
check("de las que chocan entra una sola, y la libre entra", True,
      len(chosen & {"c1", "c2"}) == 1 and "c3" in chosen)

print("== 6. el orden sigue α̃ × objetivos ==")
same = [
    Candidate("big", "p", 10, frozenset({"b.ts"})),
    Candidate("small", "p", 1, frozenset({"s.ts"})),
]
order = [c.proposal_id for c in schedule(same, [], 0.5, 0.5, seed=3).selected]
check("mismo proponente: primero el de más objetivos", ["big", "small"], order)

# `revealed` no cuenta ni a favor ni en contra: la propuesta es correcta y lo
# que destapa son contratos reales, que van a la cola residual.
check("revealed no cuenta en el registro", {"p": (1, 0)},
             count_ledger([{"proposer": "p", "outcome": "accepted"},
                              {"proposer": "p", "outcome": "revealed"}]))

# Lo que la revisión de conducta tumbó y lo parcial conservado sí cuentan.
check("rejected-review cuenta en contra y accepted-partial a favor", {"p": (1, 1)},
      count_ledger([{"proposer": "p", "outcome": "accepted-partial"},
                    {"proposer": "p", "outcome": "rejected-review"}]))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
