#!/usr/bin/env python3
"""Mitad roja: los subcomandos y opciones de ``task_ids.py`` en INGLES.

Decision del ejecutor (``.claude/workbench/task-id-analysis-20260929T073702/
README.md``, «Naming decision»): cada subcomando nuevo tiene que aceptarse y
cada nombre viejo tiene que rehusar con ``exit 2`` de argparse — la forma en
que un subparser declara sus ``choices``. Escrita ANTES del renombre: en su
primera corrida contra el modulo viejo, las aserciones de la mitad 1 y 3
(subcomandos y opciones NUEVOS) caen en rojo.
"""
from __future__ import annotations

import json
import os
import pathlib
import sqlite3
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

#: Se puede apuntar a otra copia del modulo (p. ej. la version pre-renombre)
#: via variable de entorno, para medir el ANTES y el DESPUES con la misma
#: suite — es la forma en que esta mitad roja se guarda como evidencia.
SUT = pathlib.Path(
    os.environ.get("TASK_IDS_SUT")
    or str(reach.thyrox_root() / "src" / "task" / "task_ids.py"))

failures: list[str] = []
checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(label)


def run(*args):
    return subprocess.run([sys.executable, str(SUT), *args],
                          capture_output=True, text=True)


def build_store(path):
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE tasks (session_id TEXT, task_id TEXT, submodule TEXT, "
        "subject TEXT, description TEXT, status TEXT, source TEXT, "
        "created_at TEXT, updated_at TEXT, submodule_source TEXT, "
        "opened_at TEXT, opened_at_source TEXT, citation_id TEXT, "
        "board_ordinal INTEGER)")
    conn.execute(
        "INSERT INTO tasks (session_id, task_id, submodule, subject, "
        "citation_id, board_ordinal) VALUES (?,?,?,?,?,?)",
        ("s1", "1", "api", "sujeto de la sonda", "TASK-API-0001", 1))
    conn.commit()
    conn.close()


TMP = pathlib.Path(tempfile.mkdtemp(prefix="task-ids-cli-names-"))
STORE = TMP / "store.sqlite3"
build_store(STORE)
BOARD = TMP / "board"
BOARD.mkdir()
(BOARD / "9.json").write_text(json.dumps(
    {"subject": "Una tarjeta nueva", "status": "pending", "description": ""}))

# --- 1. subcomandos NUEVOS: argparse los acepta -----------------------------
check(run("--store", str(STORE), "lookup", "s1", "1").returncode == 0,
      "1a: `lookup` (antes `cita`) es un subcomando valido")
check(run("--store", str(STORE), "census").returncode == 0,
      "1b: `census` (antes `censo`) es un subcomando valido")
check(run("--store", str(STORE), "duplicates").returncode == 0,
      "1c: `duplicates` (antes `duplicados`) es un subcomando valido")
check(run("--store", str(STORE), "assign-ids", "--dry-run").returncode == 0,
      "1d: `assign-ids` (antes `acunar`) es un subcomando valido")
check(run("--store", str(STORE), "ingest-board", "s1", "9",
          "--board", str(BOARD), "--layer", "docs").returncode == 0,
      "1e: `ingest-board` (antes `ingerir-board`) es un subcomando valido")
check(run("--store", str(STORE), "fix-layer", "TASK-API-0001",
          "--layer", "docs", "--reason", "prueba").returncode == 0,
      "1f: `fix-layer` (antes `corregir-capa`) es un subcomando valido")

# --- 2. subcomandos VIEJOS: argparse los rehusa con exit 2 ------------------
for old_name in ("cita", "censo", "duplicados", "acunar", "ingerir-board",
                  "corregir-capa"):
    check(run("--store", str(STORE), old_name).returncode == 2,
          f"2: el subcomando viejo `{old_name}` ya no se acepta (exit 2)")

# --- 3. opciones NUEVAS: se aceptan ------------------------------------------
check(run("--store", str(STORE), "ingest-board", "s1", "9",
          "--board", str(BOARD), "--layer", "docs").returncode == 0,
      "3a: `--layer` (antes `--capa`) se acepta en `ingest-board`")
check(run("--store", str(STORE), "fix-layer", "TASK-API-0001",
          "--layer", "docs", "--reason", "prueba").returncode == 0,
      "3b: `--layer`/`--reason` (antes `--capa`/`--razon`) se aceptan en "
      "`fix-layer`")
check(run("--store", str(STORE), "duplicates", "--limit", "3").returncode == 0,
      "3c: `--limit` (antes `--limite`) se acepta en `duplicates`")

# --- 4. opciones VIEJAS: argparse las rehusa con exit 2 ----------------------
check(run("--store", str(STORE), "ingest-board", "s1", "9",
          "--board", str(BOARD), "--capa", "docs").returncode == 2,
      "4a: `--capa` ya no se acepta en `ingest-board`")
check(run("--store", str(STORE), "fix-layer", "TASK-API-0001",
          "--capa", "docs", "--razon", "prueba").returncode == 2,
      "4b: `--capa`/`--razon` ya no se aceptan en `fix-layer`")
check(run("--store", str(STORE), "duplicates", "--limite", "3").returncode == 2,
      "4c: `--limite` ya no se acepta en `duplicates`")

print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    sys.exit(1)
print("OK: todos los subcomandos y opciones estan en ingles")
