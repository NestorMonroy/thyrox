#!/usr/bin/env python3
"""Control de `src/verify/batch_verification.py`: verificar N arreglos con UN tsc.

La adaptacion de speculative decoding al ciclo de errores: cada arreglo barato
es una PROPUESTA y el `tsc --noEmit` completo es el OBJETIVO caro. En vez de un
`tsc` por arreglo, se aplican varios y se verifican todos en una sola pasada, y
cada propuesta se acepta o rechaza por SUS aristas, no por el total.

Que haria fallar a este control:
- juzgar por el total: el caso `mixed` baja el total y aun asi tiene una
  propuesta rechazada y un diagnostico nuevo que nadie reclama;
- no reportar diagnosticos nuevos: el caso `mixed` los introduce y el veredicto
  del lote debe decirlo, porque ninguna propuesta los tiene como aristas;
- contar un proveedor sin aristas previas como aceptado: no habia nada que
  arreglar, y una aceptacion sin objeto inflaria alpha.
"""
from __future__ import annotations

import sys

from verify import batch_verification as bv

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def missing(consumer: str, line: int, provider: str, symbol: str) -> str:
    return (f"{consumer}({line},1): error TS2305: Module '\"{provider}\"' "
            f"has no exported member '{symbol}'.")


def other(consumer: str, line: int, code: str = "TS2345") -> str:
    return f"{consumer}({line},5): error {code}: Argument of type 'x' is not assignable."


print("test_batch_verification:")

BEFORE = [
    missing("a.ts", 1, "@thyrox/alpha", "one"),
    missing("b.ts", 2, "@thyrox/alpha", "two"),
    missing("c.ts", 3, "@thyrox/beta", "three"),
    missing("d.ts", 4, "@thyrox/gamma", "four"),
    missing("e.ts", 5, "@thyrox/gamma", "five"),
    other("z.ts", 9),
]
# alpha queda en cero, gamma baja de 2 a 1, beta no se toco, y aparece un
# diagnostico nuevo en y.ts que no es arista de ninguna propuesta.
AFTER = [
    missing("c.ts", 3, "@thyrox/beta", "three"),
    missing("e.ts", 5, "@thyrox/gamma", "five"),
    other("z.ts", 9),
    other("y.ts", 7, "TS2339"),
]

report = bv.verify_batch(BEFORE, AFTER, ["@thyrox/alpha", "@thyrox/gamma", "@thyrox/delta"])
by_provider = {v.provider: v for v in report.verdicts}
assert_equal("alpha llega a cero: aceptada", "accepted", by_provider["@thyrox/alpha"].outcome)
assert_equal("gamma baja sin llegar a cero: parcial", "partial", by_provider["@thyrox/gamma"].outcome)
assert_equal("delta no tenia aristas: sin objeto, no aceptada", "no-edges",
             by_provider["@thyrox/delta"].outcome)
assert_equal("las aristas antes y despues de gamma", (2, 1),
             (by_provider["@thyrox/gamma"].edges_before, by_provider["@thyrox/gamma"].edges_after))
assert_equal("alpha = aceptadas / propuestas con objeto", 0.5, report.acceptance_rate)
assert_equal("el total baja de 6 a 4", (6, 4), (report.total_before, report.total_after))
assert_equal("el diagnostico nuevo se reporta aunque el total baje",
             ["y.ts(7,5): TS2339"], report.new_diagnostics)
assert_equal("el lote no es limpio: una parcial y un diagnostico nuevo", False, report.clean)

CLEAN_AFTER = [missing("c.ts", 3, "@thyrox/beta", "three"), other("z.ts", 9)]
clean = bv.verify_batch(BEFORE, CLEAN_AFTER, ["@thyrox/alpha", "@thyrox/gamma"])
assert_equal("dos propuestas a cero y nada nuevo: lote limpio", True, clean.clean)
assert_equal("con las dos aceptadas alpha vale 1", 1.0, clean.acceptance_rate)

try:
    bv.verify_batch([], AFTER, ["@thyrox/alpha"])
    assert_equal("un log previo sin diagnosticos rehusa", "ValueError", "sin error")
except ValueError:
    assert_equal("un log previo sin diagnosticos rehusa", "ValueError", "ValueError")

print(f"test_batch_verification: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
