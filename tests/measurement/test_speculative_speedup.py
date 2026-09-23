#!/usr/bin/env python3
"""Control de la tasa de aceptacion y de los tokens por llamada al objetivo.

El brief dice que la ganancia de speculative decoding depende de cuanto se
parece el borrador al objetivo. Esta suite fija las dos cantidades que lo
miden: la probabilidad de aceptar una propuesta, ``alpha = sum(min(p, q))``, y
los tokens que produce en promedio cada llamada al objetivo con ``gamma``
propuestas, ``(1 - alpha ** (gamma + 1)) / (1 - alpha)``.

Que haria fallar a este control:
- promediar ``min(1, q/p)`` sin ponderar por ``p``: da 0.7238 en el brief y el
  muestreador real acepta 0.55 — caen el valor exacto y el empirico;
- una formula de tokens por llamada que no sea la del mecanismo: cae el caso
  que la contrasta con una simulacion hecha con ``sample``.
"""
from __future__ import annotations

import random
import sys

from measurement import rejection_sampling as rs

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def refuses(call) -> bool:
    try:
        call()
    except ValueError:
        return True
    return False


print("test_speculative_speedup:")
DRAFT = [0.35, 0.30, 0.15, 0.10, 0.10]
TARGET = [0.10, 0.10, 0.40, 0.30, 0.10]

assert_equal("alpha del brief es sum(min(p, q))", 0.55, round(rs.acceptance_rate(DRAFT, TARGET), 10))

rng = random.Random(21)
N = 200_000
accepted = sum(rs.sample(DRAFT, TARGET, rng=rng, trace=True)[1] for _ in range(N))
assert_equal("el muestreador real acepta esa fraccion", True,
             abs(accepted / N - rs.acceptance_rate(DRAFT, TARGET)) < 0.005)

UNIFORM = [0.2] * 5
assert_equal("con p == q se acepta siempre", 1.0, rs.acceptance_rate(UNIFORM, UNIFORM))
assert_equal("con alpha 1 cada llamada produce gamma + 1 tokens", 5.0,
             rs.expected_tokens_per_call(1.0, 4))
assert_equal("con alpha 0 cada llamada produce solo el token de correccion", 1.0,
             rs.expected_tokens_per_call(0.0, 4))
assert_equal("tokens por llamada del brief con gamma 4", 2.1104,
             round(rs.expected_tokens_per_call(0.55, 4), 4))

# La formula contra el mecanismo: se proponen hasta gamma tokens y se cuentan
# los aceptados hasta el primer rechazo, mas el que siempre se produce (el de
# correccion, o el adicional si se aceptaron todos).
GAMMA, CALLS = 4, 50_000
rng = random.Random(7)
produced = 0
for _ in range(CALLS):
    run = 0
    while run < GAMMA and rs.sample(DRAFT, TARGET, rng=rng, trace=True)[1]:
        run += 1
    produced += run + 1
assert_equal("la formula coincide con la simulacion del mecanismo", True,
             abs(produced / CALLS - rs.expected_tokens_per_call(0.55, GAMMA)) < 0.03)

assert_equal("un alpha fuera de [0, 1] rehusa", True, refuses(lambda: rs.expected_tokens_per_call(1.2, 4)))
assert_equal("gamma menor que 1 rehusa", True, refuses(lambda: rs.expected_tokens_per_call(0.5, 0)))

print(f"test_speculative_speedup: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
