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
    git("add", "."); git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "base")
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
    # N=2 worktrees en la ruta 2: dos tsc a la vez rinden 1.77x
    # (tsc-two-concurrent-*), y el lote toma N unidades para medirlas en prefijos.
    _, two = tc.launch_commands(root / "step", model="claude-sonnet-5", worktree=[Path("/wt1"), Path("/wt2")],
                                ledger=Path("/run/l.jsonl"), seed=7, route="shared")
    assert_equal("la ruta 2 pasa los dos worktrees y un lote de su tamaño", (2, True),
                 (two.count("--worktree"), "--batch 2" in " ".join(two)))
    _, module_two = tc.launch_commands(root / "step", model="claude-sonnet-5",
                                       worktree=[Path("/wt1"), Path("/wt2")], ledger=Path("/run/l.jsonl"), seed=7)
    assert_equal("la de módulos no especula: sólo el primero", 1, module_two.count("--worktree"))

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

# Paso 132: la ruta determinista terminó `stalled`, sin propuestas para lo que
# queda, y `next` la volvía a proponer. Quien sabe que una ruta se agotó lo
# declara, y `next` pasa a la siguiente que tenga trabajo.
def route_after(text: str, exhausted: set[str], duplicates=None) -> str:
    return tc.next_route(tc.tsc_routes.parse_diagnostics(text), duplicates or {}, exhausted=exhausted)


assert_equal("una ruta agotada cede a la siguiente con trabajo", "modules",
             route_after(INFER + MISSING + SHARED + LOCAL, {"deterministic"}, dup))
assert_equal("y salta las que no tienen trabajo", "local",
             route_after(INFER + LOCAL, {"deterministic"}, dup))
assert_equal("todas agotadas no es cero: lo dice", "exhausted",
             route_after(INFER, {"deterministic"}, dup))
with tempfile.TemporaryDirectory() as directory:
    log = Path(directory) / "t.log"
    log.write_text(INFER + LOCAL)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = tc.main(["next", "--log", str(log), "--root", str(Path(directory)), "--exhausted", "deterministic"])
    assert_equal("la CLI acepta --exhausted", (0, True), (code, out.getvalue().startswith("next: local")))
    err = io.StringIO()
    log.write_text(INFER)
    with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
        code = tc.main(["next", "--log", str(log), "--root", str(Path(directory)), "--exhausted", "deterministic"])
    assert_equal("todas agotadas rehúsa con exit 2 y lo nombra", (2, True), (code, "agotad" in err.getvalue()))

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

# --- local: la ruta 3 versionada ------------------------------------------
# Vivía como guion de banco (step-120/build_items.py + plantilla.md): corría y
# nadie más podía invocarlo. Un ítem por archivo y trozo de diagnósticos, con
# el código que los rodea, para que el `claude -p` no gaste turnos leyendo.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    source = root / "src/packages/agent/query.ts"
    source.parent.mkdir(parents=True)
    source.write_text("\n".join(f"line {n}" for n in range(1, 41)) + "\n")
    (root / "src/packages/agent/skip.ts").write_text("x\n")
    log = root / "local.log"
    log.write_text(
        "src/packages/agent/query.ts(20,5): error TS18048: 'result.message' is possibly 'undefined'.\n"
        "src/packages/agent/query.ts(25,5): error TS2345: Argument of type '{}' is not assignable to parameter of type 'CompactionResult'.\n"
        "  Type '{}' is missing the following properties from type 'CompactionResult': summaryMessages\n"
        "src/packages/agent/query.ts(30,1): error TS2698: Spread types may only be created from object types.\n"
        "src/packages/agent/skip.ts(1,1): error TS2304: Cannot find name 'x'.\n"
        "node_modules/x/index.d.ts(1,1): error TS2304: Cannot find name 'y'.\n")
    (root / "excluded.txt").write_text("src/packages/agent/skip.ts\n")
    (root / "run").mkdir()
    code = tc.main(["local", "plan", "--log", str(log), "--bench", str(root / "step"), "--root", str(root),
                    "--run", str(root / "run"), "--exclude", str(root / "excluded.txt"), "--size", "2"])
    lines = (root / "step/items.txt").read_text().splitlines()
    assert_equal("un ítem por trozo de a lo sumo --size diagnósticos, sin excluidos ni ajenos a src/",
                 (0, ["src/packages/agent/query.ts", "src/packages/agent/query.ts"]),
                 (code, [line.split()[0] for line in lines]))
    first = Path(lines[0].split()[1]).read_text()
    assert_equal("el ítem trae la línea encadenada y el código marcado con '>'", (True, True, True),
                 ("  Type '{}' is missing" in first, "   20> line 20" in first, "   10  line 10" in first))
    with contextlib.redirect_stderr(io.StringIO()):
        none = tc.main(["local", "plan", "--log", str(root / "none.log"), "--bench", str(root / "none"),
                        "--root", str(root), "--run", str(root / "run")]) if (root / "none.log").write_text("") is not None else None
    assert_equal("sin diagnósticos locales, rehúsa sin items.txt", (2, False),
                 (none, (root / "none/items.txt").exists()))
    pool, pipeline = tc.launch_commands(root / "step", model="claude-sonnet-5", worktree=Path("/wt"),
                                        ledger=Path("/run/l.jsonl"), seed=7, route="local")
    pool_text, pipeline_text = " ".join(pool), " ".join(pipeline)
    assert_equal("la ruta 3 usa su plantilla versionada, mide por archivo y sin política neta",
                 (True, True, False),
                 ("src/verify/prompts/file-local.md" in pool_text, "--unit file" in pipeline_text,
                  "--net" in pipeline_text))
    assert_equal("la plantilla de la ruta 3 existe", True,
                 (tc.THYROX / "src/verify/prompts/file-local.md").is_file())

# --- sweep: el paso 4 del plan v2.2.0 como ruta, y su gate -----------------
# H-THYROX-186: la memoria y el barrido existían (`tsc_reflect`, `tsc_sweep`)
# pero sólo como CLI que nadie llamaba; la ruta 3 los saltó en silencio.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for name in ("a", "b", "c", "d"):
        path = root / f"src/{name}.ts"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(f"line {n}" for n in range(1, 21)) + "\n")
    run = root / "run"
    run.mkdir()
    (run / "patterns.jsonl").write_text(json.dumps({
        "name": "bad-literal", "signal": "TS9001: bad", "fix": "sustituir BADn por n", "include": "",
        "exclude": [], "site": "", "replace": "", "applied": ["src/a.ts"]}) + "\n")
    log = root / "sweep.log"
    log.write_text("src/b.ts(5,1): error TS9001: bad 2.\n"
                   "src/c.ts(7,1): error TS9001: bad 3.\n"
                   "src/d.ts(9,1): error TS1234: other.\n")
    with contextlib.redirect_stderr(io.StringIO()) as err:
        blocked = tc.main(["local", "plan", "--log", str(log), "--bench", str(root / "local"),
                           "--root", str(root), "--run", str(run)])
    assert_equal("gate 4: con instancias vivas de un patrón en memoria, la ruta local rehúsa", (2, True, False),
                 (blocked, "GATE 4 BLOQUEADO" in err.getvalue(), (root / "local/items.txt").exists()))
    # Las instancias en archivos que OTRO paso tiene en vuelo no bloquean: ése
    # las está resolviendo, y el solape no las toca. Episodio: el solape del
    # paso 164 rehusó por una instancia en AttachmentMessage.tsx que el 163
    # tenía en su pool en ese momento.
    in_flight = root / "en-vuelo.txt"
    in_flight.write_text("src/b.ts\nsrc/c.ts\n")
    with contextlib.redirect_stderr(io.StringIO()):
        overlapped = tc.main(["local", "plan", "--log", str(log), "--bench", str(root / "overlap"),
                              "--root", str(root), "--run", str(run), "--exclude", str(in_flight)])
    planned = [line.split()[0] for line in (root / "overlap/items.txt").read_text().splitlines()] \
        if (root / "overlap/items.txt").exists() else []
    assert_equal("gate 4 descuenta las instancias en vuelo en otro paso, y no las planea", (0, ["src/d.ts"]),
                 (overlapped, planned))
    code = tc.main(["sweep", "plan", "--log", str(log), "--bench", str(root / "sweep"), "--root", str(root),
                    "--run", str(run)])
    lines = (root / "sweep/items.txt").read_text().splitlines()
    assert_equal("un ítem por patrón con sus archivos vivos", (0, ["pattern:bad-literal", "src/b.ts", "src/c.ts"]),
                 (code, [lines[0].split()[0], *lines[0].split()[2:]]))
    item = Path(lines[0].split()[1]).read_text()
    assert_equal("el ítem trae señal, arreglo, dónde ya se aplicó y el código marcado", (True, True, True, True),
                 ("TS9001: bad" in item, "sustituir BADn por n" in item, "src/a.ts" in item, "    5> line 5" in item))
    assert_equal("sweep plan deja gate4.json con los patrones revisados", ["bad-literal"],
                 json.loads((root / "sweep/gate4.json").read_text())["reviewed"])
    pool, pipeline = tc.launch_commands(root / "sweep", model="claude-sonnet-5", worktree=Path("/wt"),
                                        ledger=run / "ledger.jsonl", seed=7, route="sweep")
    assert_equal("la ruta sweep usa su plantilla y la unidad de varios archivos", (True, True),
                 ("src/verify/prompts/pattern-sweep.md" in " ".join(pool), "--unit module" in " ".join(pipeline)))
    assert_equal("la plantilla del barrido existe", True, (tc.THYROX / "src/verify/prompts/pattern-sweep.md").is_file())
    assert_equal("next manda al barrido antes que a la ruta local", "sweep",
                 tc.next_route(tc.tsc_routes.parse_diagnostics(log.read_text()), {}, run=run))
    tc.tsc_sweep.exclude_files(run, "bad-literal", ["src/b.ts", "src/c.ts"], "otra causa, medido")
    with contextlib.redirect_stderr(io.StringIO()):
        freed = tc.main(["local", "plan", "--log", str(log), "--bench", str(root / "local2"),
                         "--root", str(root), "--run", str(run)])
    assert_equal("excluidas con razón, la ruta local queda libre", 0, freed)

# --- probabilidad de éxito por archivo (L03, self-evolving-agents-2026) -------
# Medido en run-20260924T175031: 8 archivos acumulaban 47 propuestas
# rechazadas sin ninguna aceptada, el 6.4 % del pool. L03 prefiere tareas en la
# frontera, p(1-p); aquí sólo aplica la mitad de lo imposible: lo FÁCIL es lo
# que el objetivo (0 errores) quiere primero, así que no se castiga.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for name in ("easy", "hard", "fresh", "young"):
        path = root / f"src/{name}.ts"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(f"line {n}" for n in range(1, 21)) + "\n")
    run_dir = root / "run"
    run_dir.mkdir()
    rows = ([("agent:pool:src/easy.ts", "accepted")] * 2 + [("agent:pool:src/easy.ts", "rejected")]
            + [("agent:pool:src/hard.ts", "rejected")] * 2 + [("agent:pool:src/hard.ts", "rejected-review")]
            + [("agent:pool:src/young.ts", "rejected")] * 2 + [("agent:pool:src/fresh.ts", "revealed")]
            + [("agent:pool:pattern:x", "rejected")] * 5)
    (run_dir / "ledger.jsonl").write_text("".join(json.dumps({"proposal_id": p, "outcome": o}) + "\n"
                                                  for p, o in rows))
    confidence = tc.file_confidence(run_dir / "ledger.jsonl")
    assert_equal("la confianza por archivo sale del ledger de la ruta por archivo, no de los barridos",
                 {"src/easy.ts": (2, 1), "src/hard.ts": (0, 3), "src/young.ts": (0, 2), "src/fresh.ts": (0, 0)},
                 {k: (v["accepted"], v["rejected"]) for k, v in confidence.items()})
    log = root / "p.log"
    log.write_text("".join(f"src/{name}.ts(3,1): error TS2304: Cannot find name \x27{name}\x27.\n"
                           for name in ("fresh", "hard", "young", "easy")))
    code = tc.main(["local", "plan", "--log", str(log), "--bench", str(root / "step"), "--root", str(root),
                    "--run", str(run_dir)])
    planned = [line.split()[0] for line in (root / "step/items.txt").read_text().splitlines()]
    assert_equal("sin salida posible (0 de 3) el archivo sale de la ruta local", (0, False),
                 (code, "src/hard.ts" in planned))
    deferred = (root / "step/deferred.txt").read_text() if (root / "step/deferred.txt").exists() else ""
    assert_equal("y queda en deferred.txt con sus cifras y la ruta alternativa", (True, True, True),
                 ("src/hard.ts" in deferred, "0 de 3" in deferred, "modules" in deferred))
    assert_equal("con pocos intentos se sigue proponiendo, aunque su media esté en el umbral", True,
                 "src/young.ts" in planned)
    assert_equal("el resto va de mayor a menor probabilidad: el fácil primero, el sin historia después",
                 ["src/easy.ts", "src/fresh.ts", "src/young.ts"], planned)

# --- local overlap: el paso N+1 empieza en la cola del paso N ---------------
# Pipeline parallelism (cs25-v6 L04, 1F1B): el tiempo muerto entre pasos es el
# problema. Medido en el paso 155: 206 s del pool a ancho < 8, más el hueco de
# commit, plan y lanzamiento. El paso N+1 puede pensar (pool) sobre archivos
# que el N no toca, pero sólo MIDE cuando el N asienta con 0: su base es la que
# el N deja en el árbol principal.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for name in ("busy", "free"):
        path = root / f"src/{name}.ts"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(f"line {n}" for n in range(1, 21)) + "\n")
    (root / "run").mkdir()
    log = root / "overlap.log"
    log.write_text("src/busy.ts(3,1): error TS2304: Cannot find name 'a'.\n"
                   "src/free.ts(4,1): error TS2304: Cannot find name 'b'.\n")
    previous = root / "step-200"
    previous.mkdir()
    (previous / "items.txt").write_text(f"src/busy.ts {previous}/items/1.txt\n")
    assert_equal("in_flight_files lee la primera columna de items.txt", {"src/busy.ts"},
                 tc.in_flight_files(previous))

    def cli(argv: list[str]) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = tc.main(argv)
        return code, out.getvalue(), err.getvalue()

    def overlap(after: Path, bench: str) -> tuple[int, str, str]:
        return cli(["local", "overlap", "--after", str(after), "--log", str(log),
                    "--bench", str(root / bench), "--root", str(root), "--run", str(root / "run"),
                    "--worktree", "/wt", "--ledger", str(root / "run/ledger.jsonl"), "--seed", "1",
                    "--dry-run"])

    code, out, _ = overlap(previous, "step-201")
    planned = [line.split()[0] for line in (root / "step-201/items.txt").read_text().splitlines()]
    assert_equal("el paso siguiente no planea un archivo que el anterior tiene en vuelo",
                 (0, ["src/free.ts"]), (code, planned))
    commands = [line for line in out.splitlines() if line.strip()]
    edge = [line for line in commands if "wait-jobs register step-201-pipeline" in line]
    assert_equal("el pool arranca ya, con thyrox-bg start, y queda en el ledger", (True, True),
                 (any("thyrox-bg start step-201-pool" in line for line in commands),
                  any("thyrox-bg register step-201-pool" in line for line in commands)))
    assert_equal("el pipeline NO arranca: se declara la arista --after-ok al pipeline anterior",
                 (1, True, False),
                 (len(edge), bool(edge) and "--after-ok step-200-pipeline" in edge[0],
                  any("thyrox-bg start step-201-pipeline" in line for line in commands)))
    os.environ["THYROX_ENABLE_PROMPT_CACHING_1H"] = "1"
    try:
        _, out_ttl, _ = overlap(previous, "step-202")
    finally:
        del os.environ["THYROX_ENABLE_PROMPT_CACHING_1H"]
    assert_equal("overlap fija el TTL del pool como launch, con el entorno por delante", True,
                 "--cache-ttl 1h" in out_ttl)
    assert_equal("overlap también encadena su cierre a su propio pipeline", True,
                 any("wait-jobs register step-201-close" in line and "--after-ok step-201-pipeline" in line
                     for line in commands))
    assert_equal("el comando de la arista es el pipeline de la ruta 3, con su marcador", (True, True, True),
                 (bool(edge) and "pool_pipeline.py" in edge[0], bool(edge) and "--unit file" in edge[0],
                  bool(edge) and "--marker" not in edge[0]))

    lonely = root / "step-300"
    lonely.mkdir()
    code, _, err = overlap(lonely, "step-301")
    assert_equal("sin items.txt del anterior no se sabe qué está en vuelo: rehúsa sin planear",
                 (2, False, True), (code, (root / "step-301/items.txt").exists(), "items.txt" in err))

    everything = root / "step-400"
    everything.mkdir()
    (everything / "items.txt").write_text("src/busy.ts x\nsrc/free.ts y\n")
    code, _, _ = overlap(everything, "step-401")
    assert_equal("todo en vuelo: nada disjunto que adelantar, rehúsa", (2, False),
                 (code, (root / "step-401/items.txt").exists()))

    code, out, _ = cli(["local", "launch", "--bench", str(root / "step-201"), "--worktree", "/wt",
                        "--ledger", str(root / "run/ledger.jsonl"), "--seed", "1", "--dry-run"])
    pipeline_line = next(line for line in out.splitlines() if "pool_pipeline.py" in line)
    expected = tc.step_setup_of(root / "step-201", "claude-sonnet-5", Path("/wt"), "local",
                                cache_ttl=tc.pool_cache_ttl(root / "step-201", "claude-sonnet-5")[0])
    assert_equal("launch pasa al pipeline el setup_id de su configuración (L02)", True,
                 "--setup-id " + expected["setup_id"] in pipeline_line)
    assert_equal("con --dry-run no se registra nada en la corrida", False,
                 (root / "run" / tc.step_setup.SETUPS).exists())
    assert_equal("launch registra el pool y el pipeline: sin eso una arista no tiene predecesor",
                 (0, True, True),
                 (code, "thyrox-bg register step-201-pool" in out, "thyrox-bg register step-201-pipeline" in out))
    close = [line for line in out.splitlines() if "wait-jobs register step-201-close" in line]
    assert_equal("launch encadena el cierre al pipeline: informe, commit, trinquete y push sin manos",
                 (1, True, True, True),
                 (len(close), bool(close) and "--after-ok step-201-pipeline" in close[0],
                  bool(close) and "bash bin/step_close" in close[0],
                  bool(close) and f"--run {root / 'run'}" in close[0]))

# --- el TTL de caché del pool se decide con lo que midió el paso anterior -----
# Cada ítem es un `claude -p`: su caché es de 5 m salvo que un hueco entre
# turnos la haga caducar, y ningún hueco dentro de un ítem supera la duración
# del ítem. El ítem más largo del paso anterior es la cota que decide.
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    previous = run / "step-154" / "outputs"
    previous.mkdir(parents=True)
    for n, minutes in enumerate((1.4, 4.91), 1):
        (previous / f"{n}.json").write_text(json.dumps({"duration_ms": minutes * 60000}))
    (previous / "joblog.tsv").write_text("no es json\n")
    current = run / "step-155"
    (current / "outputs").mkdir(parents=True)
    assert_equal("la cota es el ítem más largo del paso anterior, en minutos", 4.91,
                 tc.previous_item_bound(current))
    ttl, why = tc.pool_cache_ttl(current, "claude-sonnet-5")
    assert_equal("ítems de menos de 5 min: 5m, y el porqué", ("5m", True), (ttl, "turnos seguidos" in why))
    (previous / "3.json").write_text(json.dumps({"duration_ms": 12 * 60000}))
    assert_equal("un ítem de 12 min en el paso anterior: 1h", "1h", tc.pool_cache_ttl(current, "claude-sonnet-5")[0])
    # El entorno THYROX_* va antes que la cota: la cota es un DEFAULT
    # derivado, no una declaración — en el orden de `QCt` (2.1.282) forzar
    # 5m, la variable del origen y activar 1h le ganan. Sin esto,
    # `THYROX_ENABLE_PROMPT_CACHING_1H=1` no llegaba nunca: el pool recibía
    # `--cache-ttl 5m` de la cota y la opción ganaba a activar 1h.
    (previous / "3.json").unlink()
    enable = {"THYROX_ENABLE_PROMPT_CACHING_1H": "1"}
    ttl, why = tc.pool_cache_ttl(current, "claude-sonnet-5", env=enable)
    assert_equal("activar 1h gana a la cota de 4.91 min, y lo dice", ("1h", True), (ttl, "enable_1h_env" in why))
    assert_equal("la variable del origen gana a activar 1h", "5m",
                 tc.pool_cache_ttl(current, "claude-sonnet-5",
                                   env={**enable, "THYROX_CODE_PROMPT_CACHE_TTL": "5m"})[0])
    assert_equal("forzar 5m gana a todo", "5m",
                 tc.pool_cache_ttl(current, "claude-sonnet-5",
                                   env={"THYROX_FORCE_PROMPT_CACHING_5M": "1",
                                        "THYROX_CODE_PROMPT_CACHE_TTL": "1h"})[0])
    try:
        tc.pool_cache_ttl(current, "claude-sonnet-5", env={"THYROX_CODE_PROMPT_CACHE_TTL": "30m"})
        illegible = "no rehusó"
    except ValueError as error:
        illegible = "THYROX_CODE_PROMPT_CACHE_TTL" in str(error)
    assert_equal("un valor ilegible rehúsa nombrando la variable", True, illegible)
    assert_equal("sin entorno, la cota decide como antes", "5m", tc.pool_cache_ttl(current, "claude-sonnet-5", env={})[0])
    alone = Path(tmp) / "solo" / "step-1"
    alone.mkdir(parents=True)
    assert_equal("sin paso anterior medido no se decide: lo decide el cliente", None,
                 tc.pool_cache_ttl(alone, "claude-sonnet-5")[0])
    pool, _ = tc.launch_commands(current, model="claude-sonnet-5", worktree=Path("/wt"),
                                 ledger=run / "ledger.jsonl", seed=1, cache_ttl="5m")
    assert_equal("el TTL decidido llega al pool", True, "--cache-ttl 5m" in " ".join(pool))
    pool, _ = tc.launch_commands(current, model="claude-sonnet-5", worktree=Path("/wt"),
                                 ledger=run / "ledger.jsonl", seed=1)
    assert_equal("sin TTL decidido el pool no lo fija", False, "--cache-ttl" in " ".join(pool))
    assert_equal("el TTL es parte de la configuración del paso (setup_id)", "5m",
                 tc.step_setup_of(current, "claude-sonnet-5", Path("/wt"), "modules", cache_ttl="5m")["policy"]["cache_ttl"])

print(f"test_tsc_cycle: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
