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

print(f"test_step_setup: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
