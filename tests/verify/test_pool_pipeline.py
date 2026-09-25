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
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd=main, check=True)
    (main / "node_modules").mkdir()
    (main / "out").mkdir()
    (main / "items.txt").write_text("src/a.ts d/1.txt\n")
    (main / "out/1.json").write_text(json.dumps({"result": json.dumps({"edits": [{"old": "BAD1", "new": "1"}]})}))
    cwd = os.getcwd()
    os.chdir(main)
    try:
        result = pp.run(argparse.Namespace(
            main=Path("."), worktree=base / "wt", items=Path("items.txt"), outputs=[Path("out")],
            bench=Path("bench"), ledger=Path("bench/ledger.jsonl"), seed=1, batch=1, poll=0.1),
            [sys.executable, "fake_tsc.py"])
    finally:
        os.chdir(cwd)
    assert_equal("ciclo completo: el lote mide en el worktree y conserva el arreglo", ["src/a.ts"],
                 result["files_kept"])
    assert_equal("y lo conservado vuelve al árbol principal", "const a = 1\n", (main / "src/a.ts").read_text())
    assert_equal("sin tocar lo que ningún lote tomó", "const b = BAD2\n", (main / "src/b.ts").read_text())

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
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd=main, check=True)
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

print(f"test_pool_pipeline: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
