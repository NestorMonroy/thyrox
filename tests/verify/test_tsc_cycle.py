#!/usr/bin/env python3
"""Control del driver por fases `src/verify/tsc_cycle.py`.

Qué haría fallar a este control:
- `classify` que pierda un diagnóstico entre rutas (la suma no da el total);
- `classify` que escriba la cola sin sus consumidores;
- `classify` sobre un log sin diagnósticos que publique un cero en vez de
  rehusar: un log vacío no distingue «cero errores» de «tsc no corrió».
"""
from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path

from verify import tsc_cycle as tc

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def run(argv: list[str]) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = tc.main(argv)
    return code, out.getvalue(), err.getvalue()


print("test_tsc_cycle:")
with tempfile.TemporaryDirectory() as tmp:
    base = Path(tmp)
    packages = base / "packages"
    for rel in ("a/types.ts", "b/types.ts"):
        (packages / rel).parent.mkdir(parents=True, exist_ok=True)
        (packages / rel).write_text("export type Bindings = {}\n")
    log = base / "tsc.log"
    log.write_text(
        "src/x.ts(1,1): error TS2322: Type 'number' is not assignable to type 'Bindings'.\n"
        "src/y.ts(1,1): error TS7016: Could not find a declaration file for module 'qrcode'.\n"
        "src/z.ts(1,1): error TS2339: Property 'k' does not exist on type 'Other'.\n"
        "Found 3 errors.\n")
    out = base / "routes.json"
    code, stdout, _ = run(["classify", "--log", str(log), "--packages", str(packages), "--out", str(out)])
    data = json.loads(out.read_text())
    assert_equal("classify sale 0", 0, code)
    assert_equal("cada diagnóstico cae en una ruta y sólo en una", {"total": 3, "deterministic": 1, "shared": 1,
                 "local": 1}, data["counts"])
    assert_equal("la cola nombra definiciones y consumidores",
                 [{"type": "Bindings", "errors": 1, "definitions": ["a/types.ts", "b/types.ts"],
                   "consumers": ["src/x.ts"]}], data["queue"])
    assert_equal("la línea de resumen lleva las tres rutas", True,
                 "deterministic=1" in stdout and "shared=1" in stdout and "local=1" in stdout)

    empty = base / "empty.log"
    empty.write_text("")
    code, _, stderr = run(["classify", "--log", str(empty), "--packages", str(packages), "--out", str(out)])
    assert_equal("un log sin diagnósticos rehúsa con exit 2", 2, code)
    assert_equal("y nombra por qué, sin publicar un cero", True, "sin diagnósticos" in stderr)

print(f"test_tsc_cycle: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
