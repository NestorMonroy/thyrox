#!/usr/bin/env python3
"""Control de las piezas puras de `src/verify/pool_pipeline.py`.

Qué haría fallar a este control:
- tomar un archivo con ítems todavía en curso: sus trozos acabarían en lotes
  distintos y el segundo ya no encontraría su `old`;
- tomar dos veces el mismo archivo;
- construir el candidato contra HEAD y no contra el texto actual del árbol de
  medición: borraría lo aceptado en lotes anteriores;
- dejar pasar una edición que silencia.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from verify import pool_pipeline as pp

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_pool_pipeline:")
items = ["a.ts d/1.txt", "b.ts d/2.txt", "a.ts d/3.txt", "c.ts d/4.txt"]
grouped = pp.items_by_file(items)
assert_equal("los ítems se agrupan por archivo", {"a.ts": [1, 3], "b.ts": [2], "c.ts": [4]}, grouped)
assert_equal("un archivo con un trozo en curso no está listo", ["b.ts"], pp.ready_files(grouped, {1, 2}, set()))
assert_equal("listo cuando terminan todos sus trozos", ["a.ts", "b.ts"], pp.ready_files(grouped, {1, 2, 3}, set()))
assert_equal("lo ya tomado no se vuelve a tomar", ["a.ts"], pp.ready_files(grouped, {1, 2, 3}, {"b.ts"}))

with tempfile.TemporaryDirectory() as directory:
    partial = Path(directory) / "1.json"
    partial.write_text('{"result": "sin cerr')
    assert_equal("una salida a medio escribir no cuenta como terminada", None, pp.read_output(partial))

text = "const a = BAD\nconst b = OK\n"
keys = ["a.ts: TS1: x.", "b.ts: TS1: y."]
candidate, dropped = pp.build_candidate("a.ts", text, [
    {"old": "BAD", "new": "1"},
    {"old": "OK", "new": "x as any"},
    {"old": "NOPE", "new": "z"},
], keys)
assert_equal("aplica lo seguro y descarta lo que silencia o no encuentra", (["silencia", "old no único"],
             "const a = 1\nconst b = OK\n"), (dropped, candidate["edits"][0]["newText"]))
assert_equal("la base es el texto ACTUAL, no HEAD", hashlib.sha256(text.encode()).hexdigest(),
             candidate["bases"]["a.ts"])
assert_equal("los objetivos son los diagnósticos del archivo", ["a.ts: TS1: x."], candidate["targets"])
assert_equal("sin cambio no hay candidato", None, pp.build_candidate("a.ts", text, [], keys)[0])


# Ciclo completo con rutas RELATIVAS al árbol principal, como la llamada real:
# el paso corre con cwd en el worktree y el primer lote real murió por eso.
FAKE_TSC = """import pathlib, re, sys
lines = []
for path in sorted(pathlib.Path("src").glob("*.ts")):
    for number, text in enumerate(path.read_text().splitlines(), 1):
        for match in re.finditer(r"BAD(\\d+)", text):
            lines.append(f"{path}({number},1): error TS9001: bad {match.group(1)}.")
print("\\n".join(lines))
sys.exit(2 if lines else 0)
"""
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    main = base / "main"
    (main / "src").mkdir(parents=True)
    (main / "src/a.ts").write_text("const a = BAD1\n")
    (main / "src/b.ts").write_text("const b = BAD2\n")
    (main / "fake_tsc.py").write_text(FAKE_TSC)
    (main / ".gitignore").write_text("node_modules\nbench\nout\n")
    for args in (["init", "-q"], ["add", "."], ["commit", "-qm", "base"]):
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", *args], cwd=main, check=True)
    (main / "node_modules").mkdir()
    (main / "out").mkdir()
    (main / "items.txt").write_text("src/a.ts d/1.txt\n")
    (main / "out/1.json").write_text(json.dumps({"result": json.dumps({"edits": [{"old": "BAD1", "new": "1"}],
        "patterns": [{"patron": "bad-literal", "senal_del_verificador": "TS9001: bad \\d+",
                      "fix_generico": "sustituir BADn por n", "edits": [0]}]})}))
    cwd = os.getcwd()
    os.chdir(main)
    try:
        result = pp.run(argparse.Namespace(
            main=Path("."), worktree=base / "wt", items=Path("items.txt"), outputs=[Path("out")],
            bench=Path("bench"), ledger=Path("bench/ledger.jsonl"), seed=1, batch=1, poll=0.1),
            [sys.executable, "fake_tsc.py"])
    except pp.GateBlocked as error:
        result = {"files_kept": [], "blocked": str(error)}
    finally:
        os.chdir(cwd)
    assert_equal("ciclo completo: el lote mide en el worktree y conserva el arreglo", ["src/a.ts"],
                 result["files_kept"])
    assert_equal("y lo conservado vuelve al árbol principal", "const a = 1\n", (main / "src/a.ts").read_text())
    assert_equal("sin tocar lo que ningún lote tomó", "const b = BAD2\n", (main / "src/b.ts").read_text())
    memory_file = main / "bench/patterns.jsonl"
    memory = [json.loads(l) for l in memory_file.read_text().splitlines()] if memory_file.exists() else []
    assert_equal("gate 3b: lo conservado deja su patrón en la memoria, con los cuatro campos",
                 [("bad-literal", "TS9001: bad \\d+", "sustituir BADn por n", ["src/a.ts"])],
                 [(m["name"], m["signal"], m["fix"], m["applied"]) for m in memory])

# Gate 3b (plan v2.2.0; H-THYROX-186): un lote que conserva un arreglo SIN
# patrón válido detiene el pipeline con un error explícito y no exporta.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    main = base / "main"
    (main / "src").mkdir(parents=True)
    (main / "src/a.ts").write_text("const a = BAD1\n")
    (main / "fake_tsc.py").write_text(FAKE_TSC)
    (main / ".gitignore").write_text("node_modules\nbench\nout\n")
    for args in (["init", "-q"], ["add", "."], ["commit", "-qm", "base"]):
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", *args], cwd=main, check=True)
    (main / "node_modules").mkdir()
    (main / "out").mkdir()
    (main / "items.txt").write_text("src/a.ts d/1.txt\n")
    (main / "out/1.json").write_text(json.dumps({"result": json.dumps({"edits": [{"old": "BAD1", "new": "1"}]})}))
    cwd = os.getcwd()
    os.chdir(main)
    try:
        pp.run(argparse.Namespace(
            main=Path("."), worktree=base / "wt", items=Path("items.txt"), outputs=[Path("out")],
            bench=Path("bench"), ledger=Path("bench/ledger.jsonl"), seed=1, batch=1, poll=0.1),
            [sys.executable, "fake_tsc.py"])
        blocked = ""
    except pp.GateBlocked as error:
        blocked = str(error)
    finally:
        os.chdir(cwd)
    assert_equal("sin patrón, el gate 3b detiene el pipeline con un error explícito", True,
                 blocked.startswith("GATE 3b BLOQUEADO") and "src/a.ts" in blocked)
    assert_equal("y no exporta lo conservado al árbol principal", "const a = BAD1\n",
                 (main / "src/a.ts").read_text())

# Gate 3b, la validación de la señal (paso 155): los agentes trajeron sus
# patrones con los cuatro campos y aun así ninguno cubría lo conservado. Dos
# formas medidas: `error TS2304: …` copia el prefijo del log crudo, que la
# clave de diagnóstico no lleva; y `TS2322:.*Type 'undefined'…` busca texto
# que sólo está en las líneas encadenadas. La primera se normaliza; la
# segunda se DERIVA de la clave del archivo, pero sólo si esa clave nombra
# algo propio (una cita) y literal: la primera derivación generalizó lo citado
# y `TS2322: Type '[^']+' …` casó con 53 diagnósticos ajenos (BALTO, L07: la
# atribución errónea contamina la memoria).
with tempfile.TemporaryDirectory() as directory:
    run_dir = Path(directory)
    keys = ["src/a.ts: TS2304: Cannot find name 'foo'.",
            "src/a.ts: TS2322: Type 'Foo' is not assignable to type 'Bar'.",
            "src/a.ts: TS2677: A type predicate's type must be assignable to its parameter's type.",
            "src/b.ts: TS2304: Cannot find name 'bar'.",
            "src/b.ts: TS2322: Type 'Baz' is not assignable to type 'Bar'."]
    output = {"result": json.dumps({"edits": [{"old": "x", "new": "y"}], "patterns": [
        {"patron": "missing-name", "senal_del_verificador": "error TS2304: Cannot find name '(\\w+)'",
         "fix_generico": "importar el símbolo", "edits": [0]},
        {"patron": "chained-undefined", "senal_del_verificador": "TS2322:.*Type 'undefined'",
         "fix_generico": "guardar el opcional", "edits": [0]},
        {"patron": "predicate-fixed-text", "senal_del_verificador": "TS2677.*'NormalizedMessage'",
         "fix_generico": "estrechar el predicado", "edits": [0]}]})}
    batch_origin = {"step": "bench/batch-03", "evidence": "bench/batch-03/base.log", "setup_id": "s-9"}
    problems = pp.record_patterns(run_dir, {"src/a.ts": [output]}, ["src/a.ts"], keys, provenance=batch_origin)
    memory = pp.tsc_sweep.load_patterns(run_dir)
    assert_equal("la procedencia de un patrón del agente nombra paso, evidencia, configuración, regla y archivo",
                 {**batch_origin, "rule": "agent-signal", "file": "src/a.ts"},
                 memory.get("missing-name", {}).get("provenance"))
    assert_equal("la de uno derivado declara la regla con que se derivó", "derived-from-key",
                 memory.get("chained-undefined", {}).get("provenance", {}).get("rule"))
    assert_equal("el prefijo 'error ' del log crudo se quita de la señal",
                 "TS2304: Cannot find name '(\\w+)'", memory.get("missing-name", {}).get("signal"))
    assert_equal("y el patrón normalizado queda aplicado al archivo", ["src/a.ts"],
                 memory.get("missing-name", {}).get("applied"))
    derived = memory.get("chained-undefined", {})
    assert_equal("una señal que sólo casa con texto encadenado entra DERIVADA de la clave del archivo",
                 ("derived-from-key", "TS2322:.*Type 'undefined'"),
                 (derived.get("signal_origin"), derived.get("agent_signal")))
    assert_equal("la derivada conserva lo citado LITERAL",
                 "TS2322: Type 'Foo' is not assignable to type 'Bar'\\.", derived.get("signal"))
    assert_equal("y no casa con otro diagnóstico del mismo código con otras citas", (True, False),
                 (bool(re.search(derived.get("signal", "(?!)"), keys[1])),
                  bool(re.search(derived.get("signal", "(?!)"), keys[4]))))
    assert_equal("y queda aplicada al archivo", ["src/a.ts"], derived.get("applied"))
    assert_equal("una clave sin cita es el texto fijo del código: no se deriva ni entra", False,
                 "predicate-fixed-text" in memory)
    assert_equal("y el motivo la nombra", True,
                 any("predicate-fixed-text" in p and "no casa" in p for p in problems))

    alien = {"result": json.dumps({"edits": [{"old": "x", "new": "y"}], "patterns": [
        {"patron": "code-not-in-file", "senal_del_verificador": "TS9999: nothing",
         "fix_generico": "nada", "edits": [0]}]})}
    problems = pp.record_patterns(run_dir, {"src/a.ts": [alien]}, ["src/a.ts"], keys)
    assert_equal("si el código de la señal no está en el archivo, no se deriva y no entra", False,
                 "code-not-in-file" in pp.tsc_sweep.load_patterns(run_dir))

    twin = {"result": json.dumps({"edits": [{"old": "x", "new": "y"}], "patterns": [
        {"patron": "missing-name-again", "senal_del_verificador": "TS2304: Cannot find name \x27(\\w+)\x27",
         "fix_generico": "importar", "edits": [0]}]})}
    problems = pp.record_patterns(run_dir, {"src/c.ts": [twin]}, ["src/c.ts"],
                                  keys + ["src/c.ts: TS2304: Cannot find name \x27baz\x27."])
    memory = pp.tsc_sweep.load_patterns(run_dir)
    assert_equal("una señal repetida no crea patrón: lo aplicado va al existente, sin problema",
                 (False, ["src/a.ts", "src/c.ts"], []),
                 ("missing-name-again" in memory, memory["missing-name"]["applied"], problems))

    assert_equal("el apóstrofo de una palabra no es una cita", None,
                 pp.derived_signal([keys[2]], "src/a.ts", "TS2677"))
    assert_equal("sin cita (TS2769 fija su primera línea) no hay señal que derivar", None,
                 pp.derived_signal(["src/a.ts: TS2769: No overload matches this call."], "src/a.ts", "TS2769"))

# --- Módulo como ítem -----------------------------------------------------------
# Un porte toca varios archivos, puede crear uno, y sus objetivos están en los
# consumidores que el ítem declara. Las ediciones se aplican con el porte del
# aplicador de `Edit` del binario (`file_edits`): si una edición de un archivo
# falla, ese archivo entero cae, como falla la llamada entera en el binario.

def module_edit(file: str, old: str, new: str) -> dict:
    return {"file": file, "old_string": old, "new_string": new}


with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    (root / "src").mkdir()
    (root / "src/a.ts").write_text("import { x } from './n'\nconst a = BAD1\n")
    (root / "src/c.ts").write_text("const c = BAD3\n")
    keys = ["src/a.ts: TS1: x.", "src/c.ts: TS1: y.", "src/z.ts: TS1: z."]
    candidate, dropped = pp.build_module_candidate("module:n", root, [
        module_edit("src/a.ts", "BAD1", "x"),
        module_edit("src/sub/n.ts", "", "export const x = 1\n"),
        module_edit("src/c.ts", "NOPE", "3"),
    ], keys, ["src/z.ts"])
    assert_equal("el candidato toca los archivos que aplican y crea el nuevo",
                 ["src/a.ts", "src/sub/n.ts"], candidate["files"])
    assert_equal("un archivo con una edición que falla cae entero, con su motivo",
                 [("src/c.ts", "String to replace not found in file.")], dropped)
    assert_equal("el archivo nuevo lleva base ausente", "absent", candidate["bases"]["src/sub/n.ts"])
    assert_equal("los objetivos son los de los archivos tocados y los consumidores declarados",
                 ["src/a.ts: TS1: x.", "src/z.ts: TS1: z."], candidate["targets"])
    new_text = {e["file"]: e["newText"] for e in candidate["edits"]}
    assert_equal("la edición del archivo nuevo es su contenido entero", "export const x = 1\n",
                 new_text["src/sub/n.ts"])
    silenced, why = pp.build_module_candidate("module:n", root, [module_edit("src/a.ts", "BAD1", "x as any")],
                                               keys, [])
    assert_equal("una edición que silencia hace caer su archivo", (None, [("src/a.ts", "silencia")]),
                 (silenced, why))
    created, why = pp.build_module_candidate("module:n", root, [module_edit("src/a.ts", "", "otro\n")],
                                              keys, [])
    assert_equal("crear sobre un archivo existente se rechaza con el motivo del binario",
                 (None, [("src/a.ts", "Cannot create new file - file already exists.")]), (created, why))

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    main = base / "main"
    (main / "src").mkdir(parents=True)
    (main / "src/a.ts").write_text("const a = BAD1\n")
    (main / "fake_tsc.py").write_text(FAKE_TSC)
    (main / ".gitignore").write_text("node_modules\nbench\nout\n")
    for args in (["init", "-q"], ["add", "."], ["commit", "-qm", "base"]):
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", *args], cwd=main, check=True)
    (main / "node_modules").mkdir()
    (main / "out").mkdir()
    (main / "items.txt").write_text("module:n d/1.txt src/a.ts\n")
    proposal_text = json.dumps({"edits": [module_edit("src/a.ts", "BAD1", "1"),
                                          module_edit("src/port/n.ts", "", "export const n = 1\n")]})
    (main / "out/1.json").write_text(json.dumps({"result": proposal_text}))
    cwd = os.getcwd()
    os.chdir(main)
    try:
        result = pp.run(argparse.Namespace(
            main=Path("."), worktree=base / "wt", items=Path("items.txt"), outputs=[Path("out")],
            bench=Path("bench"), ledger=Path("bench/ledger.jsonl"), seed=1, batch=1, poll=0.1,
            unit="module"), [sys.executable, "fake_tsc.py"])
    except OSError as error:
        # Exportar un archivo nuevo sin crear su directorio muere aquí.
        result = {"files_kept": f"murió al exportar: {type(error).__name__}"}
    finally:
        os.chdir(cwd)
    assert_equal("modo módulo: se conservan los dos archivos del porte", ["src/a.ts", "src/port/n.ts"],
                 result["files_kept"])
    assert_equal("y el archivo nuevo llega al árbol principal, directorio incluido", "export const n = 1\n",
                 (main / "src/port/n.ts").read_text() if (main / "src/port/n.ts").exists() else None)

# --- N worktrees: la ruta 2 mide prefijos en paralelo (`prefix_speculation`) --
# Dos tsc a la vez rinden 1.77x en 4 núcleos (tsc-two-concurrent-*). Con dos
# worktrees y la política neta, el lote toma dos unidades: el worktree 2 mide
# `a+b` mientras el 1 mide `a`. `b` deja un error nuevo en su propio archivo:
# se rechaza contra el log de `a`, y `c` entra en la ronda siguiente.
def speculative_run(bad: str, directory: str) -> tuple[dict, Path, Path]:
    """El pipeline con dos worktrees sobre `a`, `b` y `c`. La unidad `bad`
    deja un error nuevo en su propio archivo. `ready_files` ordena por
    nombre, así que el prefijo de la primera ronda es siempre `[a, b]`."""
    base = Path(directory)
    main = base / "main"
    (main / "src").mkdir(parents=True)
    for name, number in (("a", 1), ("b", 2), ("c", 3)):
        (main / f"src/{name}.ts").write_text(f"const {name} = BAD{number}\n")
    (main / "fake_tsc.py").write_text(FAKE_TSC)
    (main / ".gitignore").write_text("node_modules\nbench\nout\n")
    for args in (["init", "-q"], ["add", "."], ["commit", "-qm", "base"]):
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", *args], cwd=main, check=True)
    (main / "node_modules").mkdir()
    (main / "out").mkdir()
    edits = {name: (f"BAD{n}", "BAD9" if name == bad else str(n)) for n, name in enumerate("abc", 1)}
    (main / "items.txt").write_text("".join(f"src/{name}.ts d/{n}.txt\n" for n, name in enumerate("abc", 1)))
    for n, name in enumerate("abc", 1):
        old, new = edits[name]
        (main / f"out/{n}.json").write_text(json.dumps({"result": json.dumps({"edits": [{"old": old, "new": new}]})}))
    cwd = os.getcwd()
    os.chdir(main)
    try:
        result = pp.run(argparse.Namespace(
            main=Path("."), worktree=[base / "wt1", base / "wt2"], items=Path("items.txt"),
            outputs=[Path("out")], bench=Path("bench"), ledger=Path("bench/ledger.jsonl"), seed=1,
            batch=2, poll=0.1, net=True, setup_id="s-spec"), [sys.executable, "fake_tsc.py"])
    finally:
        os.chdir(cwd)
    return result, main, base


# Cada corrida en su TemporaryDirectory: se borra exactamente ese directorio.
# (La limpieza anterior borraba `base.parent`, que era /tmp: H-THYROX-184.)
with tempfile.TemporaryDirectory() as directory:
    result, main, base = speculative_run(bad="b", directory=directory)
    assert_equal("dos worktrees: se conservan a y c, no b", ["src/a.ts", "src/c.ts"], result["files_kept"])
    assert_equal("y llegan al árbol principal", ("const a = 1\n", "const b = BAD2\n", "const c = 3\n"),
                 tuple((main / f"src/{n}.ts").read_text() for n in "abc"))
    assert_equal("el primer lote midió dos prefijos a la vez", True, (main / "bench/batch-01/prefix-2.log").exists())
    assert_equal("los dos worktrees terminan iguales", (base / "wt1/src/c.ts").read_text(),
                 (base / "wt2/src/c.ts").read_text())
    ledger_rows = [json.loads(line) for line in (main / "bench/ledger.jsonl").read_text().splitlines()]
    assert_equal("el ledger registra cada decisión", {"agent:pool:src/a.ts": "accepted-net",
                                                      "agent:pool:src/b.ts": "rejected",
                                                      "agent:pool:src/c.ts": "accepted-net"},
                 {row["proposal_id"]: row["outcome"] for row in ledger_rows})
    assert_equal("cada fila de la ruta especulativa lleva el setup_id del pipeline", {"s-spec"},
                 {row.get("setup_id") for row in ledger_rows})
# La mala es `a`, la primera del prefijo: se rechaza, y `b`, medido encima de
# `a`, queda sin decidir. Tiene que volver en la ronda siguiente, no perderse.
with tempfile.TemporaryDirectory() as directory:
    result, main, base = speculative_run(bad="a", directory=directory)
    assert_equal("lo medido encima de un rechazo vuelve y se decide después", ["src/b.ts", "src/c.ts"],
                 result["files_kept"])

# La política neta viaja hasta el paso: sin ella, unificar un tipo que
# destapa contratos se revierte aunque baje el total.
base_args = dict(ledger=Path("/l.jsonl"), bench_dir=Path("/b"), before_log=Path("/before.log"), seed=3,
                 tsc=["tsc"])
assert_equal("el paso lleva --net cuando el pipeline lo pide", True,
             "--net" in pp.step_command(Path("/wt"), Path("/c.jsonl"), net=True, **base_args))
assert_equal("y no lo lleva cuando no", False,
             "--net" in pp.step_command(Path("/wt"), Path("/c.jsonl"), net=False, **base_args))
with_id = pp.step_command(Path("/wt"), Path("/c.jsonl"), setup_id="s-1", **base_args)
assert_equal("el paso lleva el setup_id del pipeline, antes del separador de tsc", True,
             "--setup-id" in with_id and with_id[with_id.index("--setup-id") + 1] == "s-1"
             and with_id.index("--setup-id") < with_id.index("--"))
assert_equal("sin setup_id no inventa uno", False,
             "--setup-id" in pp.step_command(Path("/wt"), Path("/c.jsonl"), **base_args))

# Paso 137: un lote cuyas candidatas no se aplicaron (tsc_runs 0) no escribe
# final.log; la base siguiente sigue siendo la anterior, no un archivo que no
# existe (el pipeline murió ahí y no exportó los 4 archivos conservados).
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    previous = base / "batch-03/final.log"
    previous.parent.mkdir()
    previous.write_text("x\n")
    (base / "batch-04").mkdir()
    assert_equal("sin final.log, la base sigue siendo la anterior", previous,
                 pp.next_base(base / "batch-04", previous))
    (base / "batch-04/final.log").write_text("y\n")
    assert_equal("con final.log, la base es la del lote", base / "batch-04/final.log",
                 pp.next_base(base / "batch-04", previous))

# Gate 4, la mitad que asienta: tras un lote de barrido, los archivos del
# patrón que el paso conservó quedan como aplicados y los que no, excluidos
# con una razón que cita el paso. Sin esto la ruta sweep volvería a ofrecer
# los mismos archivos y el gate no se liberaría nunca.
with tempfile.TemporaryDirectory() as directory:
    run_dir = Path(directory)
    pp.tsc_sweep.add_pattern(run_dir, {"name": "missing-index-guard", "signal": r"TS2532",
                                       "fix": "afirmar el índice tras comprobarlo"})
    settled = pp.settle_sweep(run_dir, "pattern:missing-index-guard", ["src/a.ts", "src/b.ts"],
                              ["src/a.ts", "src/z.ts"], "step-150")
    row = pp.tsc_sweep.load_patterns(run_dir)["missing-index-guard"]
    assert_equal("el archivo conservado queda aplicado", True, "src/a.ts" in row["applied"])
    assert_equal("el no conservado queda excluido", ["src/b.ts"], row["exclude"])
    assert_equal("y su razón cita el paso", True, "step-150" in row.get("exclude_reasons", {}).get("src/b.ts", ""))
    assert_equal("un conservado ajeno al patrón no se le atribuye", False, "src/z.ts" in row["applied"])
    assert_equal("devuelve lo aplicado y lo excluido", {"applied": ["src/a.ts"], "excluded": ["src/b.ts"]},
                 settled)
    try:
        outside = pp.settle_sweep(run_dir, "src/packages/x", ["src/c.ts"], [], "step-150")
    except ValueError as error:
        outside = f"error: {error}"
    assert_equal("una unidad que no es de patrón no toca la memoria", None, outside)

print(f"test_pool_pipeline: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
