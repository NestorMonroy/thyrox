#!/usr/bin/env python3
"""El runner de migraciones de ``agent_store.py`` (TASK-THYROX-0532).

Contrato v2 de ``@thyrox/store`` (``migrationContract.ts``,
``migrationsSync.ts``), portado a Python porque el schema de
``agent_store.sqlite3`` es esta base — DEC-TASK 2026-09-29 (opcion 1) hace a
Python el dueno del schema; ``src/packages/tools/src/tasks.ts`` solo valida
el mismo ledger.

Lo que tiene que poder fallar:

* **base nueva**: ``connect()`` deja el ledger completo, una fila por
  migracion declarada, sin re-ejecutar nada en una segunda apertura.
* **base heredada con filas**: una base creada con el codigo ANTERIOR al
  ledger (``git show <LEGACY_REVISION>:src/agents/agent_store.py``)
  converge sin perder filas, y el ledger queda completo.
* **rechazo de una base mas nueva que el codigo** (version en el ledger que
  la lista ya no declara).
* **rechazo de un nombre de migracion cambiado** (misma version, otro nombre
  registrado — provenance).
"""
from __future__ import annotations

import importlib.util
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").exists():
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

from agents.agent_store import (  # noqa: E402
    CORE_MIGRATIONS,
    MIGRATIONS_TABLE,
    MigrationError,
    connect,
    run_migrations,
)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}")
        print(f"        esperado=[{expected!r}] obtenido=[{obtained!r}]")


def check_raises(label: str, exception_type, fn) -> None:
    global OK, FAILED
    try:
        fn()
    except exception_type:
        OK += 1
        print(f"  ok    {label}")
    except Exception as error:  # tipo equivocado tambien es fallo
        FAILED += 1
        print(f"  FALLA {label}")
        print(f"        exception equivocada: {type(error).__name__}: {error}")
    else:
        FAILED += 1
        print(f"  FALLA {label}")
        print("        no lanzo nada")


def ledger_rows(conn: sqlite3.Connection) -> list:
    return [tuple(row) for row in conn.execute(
        f"SELECT version, name FROM {MIGRATIONS_TABLE} ORDER BY version"
    )]


#: El ultimo commit cuyo ``agent_store.py`` aun no tiene ledger: el padre de
#: TASK-THYROX-0532. Fijo y no ``HEAD``, porque desde ese commit ``HEAD`` ya
#: crea el ledger y la base "heredada" dejaria de serlo.
LEGACY_REVISION = "6703fd2e9332"


def legacy_module():
    """El ``agent_store.py`` TAL COMO ESTABA antes del ledger
    cargado desde un archivo temporal para no tocar el arbol de trabajo. Sus
    importaciones de paquetes hermanos (``agents.agents_paths``,
    ``corpus.*``, ``paths.*``, ``task.*``, ``measurement.*``) resuelven
    contra el codigo de HOY via ``sys.path`` (ya en este archivo): son
    modulos que este cambio no toca.
    """
    source = subprocess.run(
        ["git", "show", f"{LEGACY_REVISION}:src/agents/agent_store.py"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout
    target = Path(tempfile.mkdtemp(prefix="legacy-agent-store-")) / "legacy_agent_store.py"
    target.write_text(source, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("legacy_agent_store_for_test", target)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"no se pudo cargar el modulo heredado desde {target}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


print("test_agent_store_migrations:")
print()

print("== 1. base nueva: el ledger queda completo y una segunda apertura no repite nada ==")
d1 = Path(tempfile.mkdtemp(prefix="agent-store-migrations-nueva-"))
conn = connect(d1)
rows = ledger_rows(conn)
check("una fila por migracion declarada", len(CORE_MIGRATIONS), len(rows))
check("los nombres coinciden en orden con CORE_MIGRATIONS",
      [(m.version, m.name) for m in CORE_MIGRATIONS], rows)
for table in ("agent_sessions", "findings_history", "tasks", "documents",
              "task_session_highwater"):
    check(f"la tabla {table} existe", True, conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone() is not None)
check("task_highwater (legada) NO se crea", None, conn.execute(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='task_highwater'"
).fetchone())
conn.close()

conn2 = connect(d1)
second = run_migrations(conn2)
check("segunda apertura: nada pendiente", [], second)
check("y el ledger no cambio de tamano", len(CORE_MIGRATIONS), len(ledger_rows(conn2)))
conn2.close()
shutil.rmtree(d1, ignore_errors=True)

print()
print("== 2. base heredada: creada con el codigo anterior al ledger, sin ledger, con filas ==")
legacy = legacy_module()
d2 = Path(tempfile.mkdtemp(prefix="agent-store-migrations-heredada-"))
old_conn = legacy.connect(d2)
old_conn.execute(
    "INSERT INTO agent_sessions (agent_id, subagent_type, session_id, status, "
    "started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ("agente-legado", "general-purpose", "sesion-legada", "completed",
     "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
)
old_conn.execute(
    "INSERT INTO tasks (task_id, subject, status, session_id, created_at, updated_at) "
    "VALUES (?, ?, ?, ?, ?, ?)",
    ("1", "tarea heredada", "pending", "sesion-legada",
     "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
)
old_conn.execute(
    "INSERT INTO findings_history (finding_id, submodule, initiative, summary, "
    "content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ("H-THYROX-9001", "thyrox", "migraciones", "resumen", "contenido",
     "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
)
old_conn.commit()
check("(no existe tabla schema_migrations antes de migrar)", None, old_conn.execute(
    f"SELECT 1 FROM sqlite_master WHERE type='table' AND name='{MIGRATIONS_TABLE}'"
).fetchone())
old_conn.close()

new_conn = connect(d2)
check("la adopcion cubre las 12 migraciones", len(CORE_MIGRATIONS), len(ledger_rows(new_conn)))
check("la fila de agent_sessions sobrevive", 1, new_conn.execute(
    "SELECT COUNT(*) FROM agent_sessions WHERE agent_id = 'agente-legado'"
).fetchone()[0])
check("la fila de tasks sobrevive", 1, new_conn.execute(
    "SELECT COUNT(*) FROM tasks WHERE task_id = '1' AND session_id = 'sesion-legada'"
).fetchone()[0])
check("la fila de findings_history sobrevive", 1, new_conn.execute(
    "SELECT COUNT(*) FROM findings_history WHERE finding_id = 'H-THYROX-9001'"
).fetchone()[0])
new_conn.close()

reopen = connect(d2)
check("reabrir tras adoptar: idempotente, nada pendiente", [], run_migrations(reopen))
reopen.close()
shutil.rmtree(d2, ignore_errors=True)

print()
print("== 3. rechazo de una base MAS NUEVA que el codigo ==")
d3 = Path(tempfile.mkdtemp(prefix="agent-store-migrations-futura-"))
conn3 = connect(d3)
conn3.execute(
    f"INSERT INTO {MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)",
    (9999, "del_futuro", "2099-01-01T00:00:00Z"),
)
conn3.commit()
conn3.close()
check_raises("reabrir con una version que el codigo no declara lanza MigrationError",
             MigrationError, lambda: connect(d3))
shutil.rmtree(d3, ignore_errors=True)

print()
print("== 4. rechazo de un NOMBRE de migracion cambiado (provenance) ==")
d4 = Path(tempfile.mkdtemp(prefix="agent-store-migrations-provenance-"))
conn4 = connect(d4)
conn4.execute(
    f"UPDATE {MIGRATIONS_TABLE} SET name = 'nombre_distinto' WHERE version = 1"
)
conn4.commit()
conn4.close()
check_raises("reabrir con la version 1 registrada bajo otro nombre lanza MigrationError",
             MigrationError, lambda: connect(d4))
shutil.rmtree(d4, ignore_errors=True)

print("== 5. base heredada PARCIAL: solo agent_sessions, sin el resto del nucleo ==")
# La migracion 1 no se adopta mientras falte una tabla del nucleo: una base
# con solo `agent_sessions` quedaba registrada como migrada sin `tasks`,
# `documents` ni `findings_history`.
d5 = Path(tempfile.mkdtemp(prefix="agent-store-migrations-parcial-"))
raw5 = sqlite3.connect(d5 / "agent_store.sqlite3")
raw5.execute(
    "CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY, subagent_type TEXT NOT NULL, "
    "session_id TEXT NOT NULL, status TEXT NOT NULL, output_key TEXT, "
    "started_at TEXT NOT NULL, updated_at TEXT NOT NULL, timeout_at TEXT)"
)
raw5.commit()
raw5.close()
conn5 = connect(d5)
for table in ("findings_history", "tasks", "documents"):
    check(f"la tabla {table} se crea sobre la base parcial", True, conn5.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone() is not None)
check("y el ledger queda completo", len(CORE_MIGRATIONS), len(ledger_rows(conn5)))
conn5.close()
shutil.rmtree(d5, ignore_errors=True)

print()
print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(0 if FAILED == 0 else 1)
