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

with tempfile.TemporaryDirectory() as tmp:
    import os
    import subprocess
    step = Path(tmp) / "step"
    (step / "outputs").mkdir(parents=True)
    (step / "items.txt").write_text("a.ts d/1\nb.ts d/2\nc.ts d/3\n")
    (step / "outputs" / "1.json").write_text(json.dumps({"subtype": "success"}))
    (step / "outputs" / "2.json").write_text(json.dumps({"subtype": "error_max_turns"}))
    (step / "outputs" / "3.json").write_text("")
    for n, before, after, kept in ((1, 100, 90, 3), (2, 90, 88, 1)):
        batch = step / "pipeline" / f"batch-{n:02d}"
        batch.mkdir(parents=True)
        (batch / "report.json").write_text(json.dumps(
            {"total_before": before, "total_final": after, "files_kept": ["x"] * kept}))
    job = Path(tmp) / "job"
    (job / "outputs").mkdir(parents=True)
    (job / "outputs" / "pid").write_text(f"{os.getpid()}\n")
    code, stdout, _ = run(["status", "--bench", str(step), "--job-dir", str(job)])
    assert_equal("status sale 0", 0, code)
    assert_equal("cuenta las salidas contra los ítems", True, "outputs=3/3" in stdout)
    assert_equal("separa cómo terminó cada agente", True,
                 "success=1" in stdout and "error_max_turns=1" in stdout and "unreadable=1" in stdout)
    assert_equal("una línea por lote con su antes y después", True,
                 "batch-01 100->90 kept=3" in stdout and "batch-02 90->88 kept=1" in stdout)
    assert_equal("el trabajo vivo según su archivo pid", True, "job=running" in stdout)
    dead = subprocess.Popen([sys.executable, "-c", "pass"])
    dead.wait()
    (job / "outputs" / "pid").write_text(f"{dead.pid}\n")
    code, stdout, _ = run(["status", "--bench", str(step), "--job-dir", str(job)])
    assert_equal("el trabajo terminado según su archivo pid", True, "job=ended" in stdout)
    (job / "outputs" / "pid").unlink()
    code, stdout, _ = run(["status", "--bench", str(step), "--job-dir", str(job)])
    assert_equal("sin archivo pid el estado es desconocido, no «terminado»", True, "job=unknown" in stdout)

print(f"test_tsc_cycle: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
