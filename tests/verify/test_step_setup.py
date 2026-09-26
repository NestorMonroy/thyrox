#!/usr/bin/env python3
"""Control de `src/verify/step_setup.py`: la configuración del paso por fila.

Origen: self-evolving-agents-2026, lección 2: versionar por separado el
modelo, el scaffold, el verificador y el entorno «para evitar la
imposibilidad de atribución». El ledger del lazo no decía con qué modelo, qué
prompt ni qué verificador se juzgó cada propuesta.

Qué haría fallar a este control:
- un `setup_id` que no cambie al cambiar el CONTENIDO del scaffold (sólo su
  ruta), el modelo, el verificador, la política o la ruta;
- uno que cambie sin que cambie nada (no sería estable entre pasos);
- registrar dos veces la misma configuración.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from verify import step_setup as ss

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


with tempfile.TemporaryDirectory() as tmp:
    base = Path(tmp)
    scaffold = base / "prompt.md"
    scaffold.write_text("versión uno\n")
    tsc = ["bash", "-c", "bunx tsc --noEmit -p tsconfig.json"]

    def record(**change) -> dict:
        args = {"route": "local", "model": "claude-sonnet-5", "scaffold": scaffold, "verifier": tsc,
                "policy": {"net": False, "batch": 5}}
        return ss.setup_record(**{**args, **change})

    first = record()
    assert_equal("el registro nombra modelo, scaffold con su sha256, verificador y política", True,
                 all(key in first for key in ("route", "model", "scaffold", "scaffold_sha256", "verifier",
                                              "policy", "setup_id")))
    assert_equal("es estable: los mismos insumos dan el mismo id", first["setup_id"], record()["setup_id"])
    for label, change in (("el modelo", {"model": "claude-opus-5"}), ("el verificador", {"verifier": ["tsc"]}),
                          ("la política", {"policy": {"net": True, "batch": 1}}), ("la ruta", {"route": "shared"})):
        assert_equal(f"cambiar {label} cambia el id", True, record(**change)["setup_id"] != first["setup_id"])
    copy = base / "copy.md"
    copy.write_text("versión uno\n")
    assert_equal("mover el scaffold sin cambiar su contenido no cambia el id", first["setup_id"],
                 record(scaffold=copy)["setup_id"])
    scaffold.write_text("versión dos\n")
    assert_equal("cambiar el CONTENIDO del scaffold, con la misma ruta, cambia el id", True,
                 record()["setup_id"] != first["setup_id"])
    try:
        record(scaffold=base / "missing.md")
        refused = False
    except (OSError, ValueError):
        refused = True
    assert_equal("sin el scaffold no hay configuración que registrar: rehúsa", True, refused)

    run = base / "run"
    run.mkdir()
    one = ss.register(run, first)
    ss.register(run, first)
    lines = (run / ss.SETUPS).read_text().splitlines()
    assert_equal("register devuelve el id y no duplica", (first["setup_id"], 1), (one, len(lines)))
    assert_equal("el registro guardado es el mismo", first, json.loads(lines[0]))

# --- optimizar los scaffolds desde el ledger (L02) -----------------------------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    scaffold_a, scaffold_b = run / "a.md", run / "b.md"
    scaffold_a.write_text("plantilla A")
    scaffold_b.write_text("plantilla B")
    a = ss.setup_record(route="local", model="claude-sonnet-5", scaffold=scaffold_a, verifier=["tsc"], policy={})
    b = ss.setup_record(route="local", model="claude-sonnet-5", scaffold=scaffold_b, verifier=["tsc"], policy={})
    ss.register(run, a)
    ss.register(run, b)
    rows = [(a, "accepted", [])] * 3 + [(a, "rejected", ["src/x.ts(1,1): error TS2322: y"])] \
        + [(b, "accepted", [])] + [(b, "rejected", ["src/x.ts(1,1): error TS2345: z"])] * 3 \
        + [(None, "accepted", [])] * 5
    (run / "ledger.jsonl").write_text("".join(json.dumps(
        {"proposal_id": f"p{i}", "outcome": o, "new_diagnostics": d, **({"setup_id": s["setup_id"]} if s else {})})
        + "\n" for i, (s, o, d) in enumerate(rows)))
    scores = ss.scaffold_scores(run)
    assert_equal("por configuración: intentos y media de Laplace", (4, 0.6667, 4, 0.3333),
                 (scores[a["setup_id"]]["trials"], scores[a["setup_id"]]["mean"],
                  scores[b["setup_id"]]["trials"], scores[b["setup_id"]]["mean"]))
    assert_equal("los códigos que introducen los rechazos, material para revisar el scaffold", {"TS2345": 3},
                 scores[b["setup_id"]]["rejection_codes"])
    assert_equal("las filas sin configuración se cuentan aparte, no se descartan", 5,
                 scores[None]["trials"])
    assert_equal("la mejor configuración de la ruta, entre las que tienen evidencia", a["setup_id"],
                 ss.best_setup(run, "local", min_trials=4))
    assert_equal("sin evidencia suficiente no se elige ninguna", None, ss.best_setup(run, "local", min_trials=5))

print(f"test_step_setup: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
