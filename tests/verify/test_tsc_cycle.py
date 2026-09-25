#!/usr/bin/env python3
"""Control del driver por fases `src/verify/tsc_cycle.py`.

Qué haría fallar a este control:
- `classify` que pierda un diagnóstico entre rutas (la suma no da el total);
- `classify` que escriba la cola sin sus consumidores;
- `classify` sobre un log sin diagnósticos que publique un cero en vez de
  rehusar: un log vacío no distingue «cero errores» de «tsc no corrió».
- `reject` que tome el `base.log` de un lote que no lo tiene: desde el
  segundo lote el «antes» es el `final.log` del anterior (paso 110);
- `reject` que revierta un archivo que ningún lote aceptó.
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

with tempfile.TemporaryDirectory() as tmp:
    import subprocess
    root = Path(tmp) / "repo"
    (root / "src").mkdir(parents=True)
    git = lambda *a: subprocess.run(["git", "-C", str(root), *a], check=True, capture_output=True)
    git("init", "-q")
    (root / "src" / "k.ts").write_text("const k = BAD\n")
    git("add", "."); git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "base")
    (root / "src" / "k.ts").write_text("const k = FIXED_BY_AGENT\n")
    run_dir = root / "run"
    step = run_dir / "step-9"
    first, second = step / "pipeline" / "batch-01", step / "pipeline" / "batch-02"
    for batch in (first, second):
        batch.mkdir(parents=True)
    (first / "base.log").write_text("src/o.ts(1,1): error TS1: before-1\n")
    (first / "final.log").write_text("src/o.ts(1,1): error TS1: after-1\n")
    (first / "report.json").write_text(json.dumps({"accepted": ["agent:pool:src/other.ts"]}))
    (second / "batch.log").write_text("src/o.ts(1,1): error TS1: after-1\nsrc/n.ts(2,2): error TS2: revealed\n")
    (second / "report.json").write_text(json.dumps({"accepted": ["agent:pool:src/k.ts"]}))
    (step / "kept.txt").write_text("src/other.ts\nsrc/k.ts\n")
    (run_dir / "ledger.jsonl").write_text("")
    cwd = Path.cwd()
    os.chdir(root)
    try:
        code, stdout, stderr = run(["reject", "--run", "run", "--bench", "run/step-9", "--file", "src/k.ts",
                                    "--lesson", "parchó al consumidor"])
        code_missing, _, err_missing = run(["reject", "--run", "run", "--bench", "run/step-9", "--file",
                                            "src/none.ts", "--lesson", "x"])
    finally:
        os.chdir(cwd)
    assert_equal("reject sale 0", 0, code)
    assert_equal("revierte el archivo a HEAD", "const k = BAD\n", (root / "src" / "k.ts").read_text())
    ledger = [json.loads(l) for l in (run_dir / "ledger.jsonl").read_text().splitlines() if l.strip()]
    assert_equal("el ledger registra el rechazo en revisión",
                 [("agent:pool:src/k.ts", "rejected-review")], [(r["proposal_id"], r["outcome"]) for r in ledger])
    reflections = run_dir / "reflections.jsonl"
    last = reflections.read_text().splitlines()[-1] if reflections.is_file() else "{}"
    assert_equal("el «antes» del segundo lote es el final.log del primero",
                 ["src/n.ts: TS2: revealed"], json.loads(last).get("revealed"))
    assert_equal("sale de kept.txt", "src/other.ts\n", (step / "kept.txt").read_text())
    assert_equal("un archivo que ningún lote aceptó rehúsa con exit 2", 2, code_missing)
    assert_equal("y lo nombra", True, "src/none.ts" in err_missing)

# --- modules: el módulo como unidad, de punta a punta -------------------------
# `plan` deriva las unidades del log: un «el módulo X no exporta Y» (TS2305,
# TS2724) es un porte pendiente de X, y quien lo emite es su consumidor.
# `launch` corre el pool (GNU Parallel, `claude -p` por módulo) y el pipeline
# que mide por lotes, los dos con `thyrox-bg`: ningún subagente.

MISSING_LOG = """src/packages/a/x.ts(3,10): error TS2305: Module '"@thyrox/agent/attachments.js"' has no exported member 'foo'.
src/packages/b/y.ts(5,3): error TS2724: '"@thyrox/agent/attachments.js"' has no exported member named 'bar'. Did you mean 'baz'?
src/packages/b/y.ts(9,3): error TS2305: Module '"@thyrox/agent/compact.js"' has no exported member 'qux'.
src/packages/c/z.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.
"""
units = tc.module_units(tc.tsc_routes.parse_diagnostics(MISSING_LOG))
assert_equal("las unidades son los módulos que no exportan lo que se les pide",
             ["@thyrox/agent/attachments.js", "@thyrox/agent/compact.js"], sorted(units))
assert_equal("cada unidad lleva sus consumidores", ["src/packages/a/x.ts", "src/packages/b/y.ts"],
             units["@thyrox/agent/attachments.js"]["consumers"])
assert_equal("y los miembros que le faltan", ["bar", "foo"], units["@thyrox/agent/attachments.js"]["members"])

RELATIVE_LOG = """src/packages/agent/compaction/a.ts(1,1): error TS2305: Module '"./compact.js"' has no exported member 'x'.
src/packages/agent/b.ts(1,1): error TS2305: Module '"./compaction/compact.js"' has no exported member 'y'.
src/packages/repl/c.ts(1,1): error TS2305: Module '"./compact.js"' has no exported member 'z'.
"""
relative = tc.module_units(tc.tsc_routes.parse_diagnostics(RELATIVE_LOG))
assert_equal("un especificador relativo se resuelve contra su consumidor: mismo módulo, una unidad",
             ["src/packages/agent/compaction/compact.js", "src/packages/repl/compact.js"], sorted(relative))
assert_equal("y reúne a los consumidores de las dos formas de escribirlo",
             ["src/packages/agent/b.ts", "src/packages/agent/compaction/a.ts"],
             relative.get("src/packages/agent/compaction/compact.js", {}).get("consumers"))

with tempfile.TemporaryDirectory() as directory:
    # Paquete y ruta relativa nombran el MISMO archivo: una sola unidad.
    root = Path(directory)
    pkg = root / "src/packages/agent"
    (pkg / "compaction").mkdir(parents=True)
    (pkg / "package.json").write_text(json.dumps(
        {"name": "@thyrox/agent", "exports": {"./compaction/compact.js": "./compaction/compact.ts"}}))
    (pkg / "compaction/compact.ts").write_text("export const a = 1\n")
    log = """src/packages/agent/compaction/a.ts(1,1): error TS2305: Module '"./compact.js"' has no exported member 'x'.
src/packages/repl/c.ts(1,1): error TS2305: Module '"@thyrox/agent/compaction/compact.js"' has no exported member 'y'.
"""
    resolved = tc.module_units(tc.tsc_routes.parse_diagnostics(log), root)
    assert_equal("un import de paquete y uno relativo al mismo archivo son una unidad",
                 ["src/packages/agent/compaction/compact.ts"], sorted(resolved))

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / "tsc.log").write_text(MISSING_LOG)
    code = tc.main(["modules", "plan", "--log", str(base / "tsc.log"), "--bench", str(base / "step"),
                    "--root", str(base)])
    lines = (base / "step/items.txt").read_text().splitlines()
    assert_equal("plan escribe una línea por módulo", (0, 2), (code, len(lines)))
    assert_equal("la línea es unidad, ítem y consumidores",
                 ["module:@thyrox/agent/attachments.js", str(base / "step/items/1.txt"),
                  "src/packages/a/x.ts", "src/packages/b/y.ts"], lines[0].split())
    item = (base / "step/items/1.txt").read_text()
    assert_equal("el ítem lleva los diagnósticos del módulo, y sólo los suyos", (True, False, False),
                 ("has no exported member 'foo'" in item, "qux" in item, "TS2322" in item))

    (base / "none.log").write_text("src/packages/c/z.ts(1,1): error TS2322: Type 'string' is not assignable.\n")
    with contextlib.redirect_stderr(io.StringIO()):
        empty = tc.main(["modules", "plan", "--log", str(base / "none.log"), "--bench", str(base / "none"),
                         "--root", str(base)])
    assert_equal("sin ningún módulo que portar, plan rehúsa en vez de escribir un lote vacío", (2, False),
                 (empty, (base / "none/items.txt").exists()))

    commands = tc.launch_commands(base / "step", model="claude-sonnet-5", worktree=Path("/wt"),
                                  ledger=Path("/run/ledger.jsonl"), seed=7, width=8)
    pool, pipeline = commands
    assert_equal("launch corre dos trabajos con thyrox-bg", (["bin/thyrox-bg", "start"], ["bin/thyrox-bg", "start"]),
                 (pool[1:3], pipeline[1:3]))
    pool_text, pipeline_text = " ".join(pool), " ".join(pipeline)
    assert_equal("el pool es headless-pool con la plantilla de módulos, sobre items.txt", (True, True, True),
                 ("bin/headless-pool" in pool_text, "src/verify/prompts/module-port.md" in pool_text,
                  f"< {base / 'step/items.txt'}" in pool_text))
    assert_equal("el pipeline mide en modo módulo las salidas de ese pool", (True, True),
                 ("--unit module" in pipeline_text, f"--outputs {base / 'step/outputs'}" in pipeline_text))

# --- shared: la ruta 2, una definición duplicada por unidad --------------------
# El juicio es UNO por definición —qué copia es la buena—, no uno por
# consumidor. La unidad lleva sus copias y sus consumidores como objetivo, y
# se mide de a una con la política neta: unificar destapa contratos, y lo que
# decide es que baje el total.

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    for rel, text in {
        "src/packages/a/src/types.ts": "export type Foo = { a: string; b: number }\n",
        "src/packages/b/src/local.ts": "type Foo = { a: string }\n",
        "src/packages/c/src/types.ts": "export type Bar = { x: number }\n",
        "src/packages/d/src/copy.ts": "export type Bar = { x: number; y?: string }\n",
    }.items():
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        (root / rel).write_text(text)
    log = root / "tsc.log"
    log.write_text("""src/packages/e/src/use.ts(1,1): error TS2322: Type 'Foo' is not assignable to type 'Foo'.
src/packages/f/src/use.ts(2,1): error TS2345: Argument of type 'Foo' is not assignable to parameter of type 'Foo'.
src/packages/g/src/use.ts(3,1): error TS2322: Type 'Bar' is not assignable to type 'Bar'.
src/packages/h/src/use.ts(4,1): error TS2305: Module '"x"' has no exported member 'y'.
""")
    code = tc.main(["shared", "plan", "--log", str(log), "--bench", str(root / "step"), "--root", str(root)])
    lines = (root / "step/items.txt").read_text().splitlines()
    assert_equal("una unidad por definición, de la más citada a la menos", (0, ["type:Foo", "type:Bar"]),
                 (code, [l.split()[0] for l in lines]))
    assert_equal("sus objetivos son los consumidores y las copias",
                 ["src/packages/a/src/types.ts", "src/packages/b/src/local.ts",
                  "src/packages/e/src/use.ts", "src/packages/f/src/use.ts"], lines[0].split()[2:])
    item = (root / "step/items/1.txt").read_text()
    assert_equal("el ítem nombra las copias y sólo los diagnósticos que la citan", (True, True, False, False),
                 ("src/packages/b/src/local.ts" in item, "TS2345" in item, "Bar" in item, "TS2305" in item))
    tc.main(["shared", "plan", "--log", str(log), "--bench", str(root / "top"), "--root", str(root), "--top", "1"])
    assert_equal("--top toma sólo la cabeza de la cola", 1,
                 len((root / "top/items.txt").read_text().splitlines()))
    (root / "none.log").write_text("src/packages/h/src/use.ts(4,1): error TS2305: Module '\"x\"' has no exported member 'y'.\n")
    with contextlib.redirect_stderr(io.StringIO()):
        none = tc.main(["shared", "plan", "--log", str(root / "none.log"), "--bench", str(root / "none"),
                        "--root", str(root)])
    assert_equal("sin causas compartidas, rehúsa", (2, False), (none, (root / "none/items.txt").exists()))

    pool, pipeline = tc.launch_commands(root / "step", model="claude-sonnet-5", worktree=Path("/wt"),
                                        ledger=Path("/run/ledger.jsonl"), seed=7, route="shared")
    pool_text, pipeline_text = " ".join(pool), " ".join(pipeline)
    assert_equal("la ruta 2 usa su plantilla y mide de a una con la política neta", (True, True, True),
                 ("src/verify/prompts/shared-type.md" in pool_text, "--batch 1" in pipeline_text,
                  "--net" in pipeline_text))
    module_pool, module_pipeline = tc.launch_commands(root / "step", model="claude-sonnet-5",
                                                      worktree=Path("/wt"), ledger=Path("/run/l.jsonl"), seed=7)
    assert_equal("la ruta de módulos no hereda la política neta", False, "--net" in " ".join(module_pipeline))

# --- next: el orden del plan v3, no el que se le ocurra a quien lance ---------
# 1 determinista (lo mecánico por proponentes, lo sin portar por módulo),
# 2 la cabeza de la cola compartida, 3 el pool por archivo. Cero diagnósticos
# no decide nada: lo decide la medición.

def route_of(text: str, duplicates: dict[str, list[str]] | None = None) -> str:
    return tc.next_route(tc.tsc_routes.parse_diagnostics(text), duplicates or {})


INFER = "src/a.ts(1,1): error TS7006: Parameter 'x' implicitly has an 'any' type.\n"
MISSING = "src/b.ts(1,1): error TS2305: Module '\"./m.js\"' has no exported member 'y'.\n"
SHARED = "src/c.ts(1,1): error TS2322: Type 'Foo' is not assignable to type 'Foo'.\n"
LOCAL = "src/d.ts(1,1): error TS2339: Property 'z' does not exist on type 'Q'.\n"
dup = {"Foo": ["a/src/t.ts", "b/src/t.ts"]}
assert_equal("lo mecánico va antes que todo", "deterministic", route_of(INFER + MISSING + SHARED + LOCAL, dup))
assert_equal("después, los módulos sin portar", "modules", route_of(MISSING + SHARED + LOCAL, dup))
assert_equal("después, la cola compartida", "shared", route_of(SHARED + LOCAL, dup))
assert_equal("al final, el pool por archivo", "local", route_of(LOCAL, dup))
assert_equal("sin diagnósticos no hay ruta", "none", route_of(""))

# --- compare: el antes y el después de una medición ---------------------------
# Suelto en `.claude/cache/cmp.py` vivía una copia de `_new_diagnostics`; la
# comparación es la del paso, y se publica con su denominador.

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / "a.log").write_text("src/a.ts(1,1): error TS2322: x.\nsrc/b.ts(2,1): error TS2345: y.\n")
    (base / "b.log").write_text("src/a.ts(9,1): error TS2322: x.\nsrc/c.ts(3,1): error TS2339: z.\n")
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = tc.main(["compare", str(base / "a.log"), str(base / "b.log")])
    text = out.getvalue()
    assert_equal("compare publica total, desaparecidos y nuevos", (0, True),
                 (code, "total 2 desaparecidos 1 nuevos 1" in text))
    assert_equal("un error que sólo cambió de línea no cuenta como nuevo", (False, True),
                 ("src/a.ts" in text.partition("\n")[2], "src/c.ts" in text.partition("\n")[2]))
    (base / "empty.log").write_text("")
    with contextlib.redirect_stderr(io.StringIO()):
        refused = tc.main(["compare", str(base / "a.log"), str(base / "missing.log")])
    assert_equal("un log que no existe rehúsa, no publica ceros", 2, refused)

# El comando que `next` imprime se ejecuta tal cual: el de la ruta determinista
# se lanzó sin proponente ni tsc tras `--` y el lazo salió 2 (paso 132).
det = tc.ROUTE_COMMANDS["deterministic"]
assert_equal("la ruta determinista nombra la identidad, el proponente y tsc", (True, True, True),
             ("commit_identity env" in det, "-- bin/tsc_proposers --" in det, "bunx tsc --noEmit" in det))

print(f"test_tsc_cycle: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
