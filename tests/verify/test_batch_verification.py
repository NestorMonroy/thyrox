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

import json
import sys
import tempfile
from pathlib import Path

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
             ["y.ts: TS2339: Argument of type 'x' is not assignable."],
             report.new_diagnostics)
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

# La identidad semántica no contiene coordenadas: insertar una línea no crea
# un diagnóstico nuevo.
SHIFTED_AFTER = [missing("c.ts", 30, "@thyrox/beta", "three"), other("z.ts", 90)]
shifted = bv.verify_batch(BEFORE, SHIFTED_AFTER, ["@thyrox/alpha", "@thyrox/gamma"])
assert_equal("mover líneas no fabrica diagnósticos nuevos", [], shifted.new_diagnostics)

# El verificador general recibe objetivos y archivos de cualquier proponente,
# no sólo providers TS2305.
generic_before = [other("imports.ts", 3, "TS6133"), other("keep.ts", 7, "TS2322")]
target = bv.diagnostic_key_from_line(generic_before[0])
proposal = bv.Proposal(
    proposal_id="unused-import-1",
    proposer="typescript-code-fix",
    targets=frozenset({target}),
    files=frozenset({"imports.ts"}),
)
generic_after = [other("keep.ts", 70, "TS2322")]
generic = bv.verify_proposals(generic_before, generic_after, [proposal])
assert_equal("un proponente general cierra su objetivo", "accepted", generic.verdicts[0].outcome)
assert_equal("y el movimiento de la línea ajena no ensucia el lote", True, generic.clean)

regressed_after = [other("imports.ts", 4, "TS2339"), other("keep.ts", 70, "TS2322")]
regressed = bv.verify_proposals(generic_before, regressed_after, [proposal])
assert_equal("un diagnóstico nuevo en el archivo tocado rechaza la propuesta",
             "rejected", regressed.verdicts[0].outcome)
assert_equal("el veredicto atribuye el diagnóstico nuevo",
             [bv.diagnostic_key_from_line(regressed_after[0])],
             regressed.verdicts[0].new_diagnostics)

with tempfile.TemporaryDirectory() as directory:
    manifest = Path(directory) / "proposals.jsonl"
    manifest.write_text(json.dumps({
        "proposal_id": "generic-1",
        "proposer": "fixture",
        "targets": [target],
        "files": ["imports.ts"],
    }) + "\n", encoding="utf-8")
    loaded = bv.read_proposals(manifest)
    assert_equal("el manifiesto JSONL general conserva id y proponente",
                 ("generic-1", "fixture"),
                 (loaded[0].proposal_id, loaded[0].proposer))
    assert_equal("el manifiesto conserva objetivos y archivos como conjuntos",
                 (frozenset({target}), frozenset({"imports.ts"})),
                 (loaded[0].targets, loaded[0].files))

# El registro de veredictos es la entrada `--ledger` de `bin/tsc_schedule`:
# sin él, el planificador no tiene historia de la que aprender.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / "before.log").write_text("\n".join(generic_before) + "\n", encoding="utf-8")
    (base / "after.log").write_text("\n".join(generic_after) + "\n", encoding="utf-8")
    (base / "proposals.jsonl").write_text(json.dumps({
        "proposal_id": "unused-import-1", "proposer": "typescript-code-fix",
        "targets": [target], "files": ["imports.ts"],
    }) + "\n", encoding="utf-8")
    ledger = base / "verdicts.jsonl"
    code = bv.main(["--before", str(base / "before.log"), "--after", str(base / "after.log"),
                    "--proposals", str(base / "proposals.jsonl"), "--verdicts-out", str(ledger)])
    rows = ([json.loads(line) for line in ledger.read_text().splitlines() if line.strip()]
            if ledger.exists() else [])
    assert_equal("el lote limpio sale 0", 0, code)
    assert_equal("el registro lleva una fila por propuesta con su veredicto",
                 [("unused-import-1", "typescript-code-fix", "accepted")],
                 [(r.get("proposal_id"), r.get("proposer"), r.get("outcome")) for r in rows])
    code_again = bv.main(["--before", str(base / "before.log"), "--after", str(base / "after.log"),
                          "--proposals", str(base / "proposals.jsonl"), "--verdicts-out", str(ledger)])
    rows_again = [line for line in ledger.read_text().splitlines() if line.strip()] if ledger.exists() else []
    assert_equal("el registro se AÑADE, no se reescribe: es historia", 2, len(rows_again))

print(f"test_batch_verification: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
