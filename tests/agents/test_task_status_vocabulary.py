"""El vocabulario de estado se hace cumplir en la TABLA, no en cada escritor.

El defecto, medido antes de escribir esto
(``.claude/workbench/vocabulario-de-estado-en-el-store-20260917T223234/``):
la tabla ``tasks`` acepta ``borrador``, ``DONE``, ``in-progress``, ``deleted``
y la cadena vacia. El vocabulario esta declarado dos veces y en dos lenguas —
``src/task/schema.ts::TASK_STATUSES`` y el ``choices`` de un subcomando de
``agent_store.py``— y ninguna de las dos gobierna lo que entra.

Por que la TABLA y no un guard en cada escritor: hay **cuatro** sitios de
insercion en **tres** modulos y dos lenguas (``agent_store.py``,
``task_ids.py``, y dos en ``packages/tools/src/tasks.ts``). Un guard por
escritor es un contrato que cada nuevo escritor tiene que recordar; el
``CHECK`` lo hereda por construccion — es el unico punto que los cuatro
comparten.

Lo que tiene que poder fallar:

* **el CHECK rechaza lo de fuera**. Sin el, los cinco casos de
  ``OUTSIDE_VOCABULARY`` entran en silencio y el tablero queda con estados que
  ningun lector sabe interpretar.
* **el CHECK NO rechaza lo de dentro**. Es la otra mitad, y la que un CHECK mal
  escrito rompe: una lista con un typo deja fuera un estado legitimo y **toda**
  escritura de esa clase empieza a fallar. Los tres canonicos se afirman uno a
  uno, no como grupo.
* **``deleted`` queda FUERA a proposito**. ``UPDATE_STATUSES`` lo admite como
  *orden* de borrar la fila (``schema.ts:35``); no es un estado que se guarde.
  Un CHECK que lo aceptara convertiria la orden en un estado persistible, que
  es lo contrario de lo que aquel comentario declara.
* **la migracion alcanza a una base VIEJA**. El store real ya existe con la
  tabla sin CHECK; SQLite no tiene ``ALTER TABLE ... ADD CONSTRAINT``, asi que
  la unica via es reconstruir. Sin este caso la migracion podria no correr
  nunca y el CHECK solo protegeria a las bases nuevas.
* **la migracion CONSERVA las filas**. Una reconstruccion que pierda datos
  pasaria igual de verde que una correcta si solo se midiera el CHECK.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").exists():
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

from agents.agent_store import (  # noqa: E402
    CORE_SCHEMA,
    TASK_STATUSES,
    _migrate_tasks_status_check,
)

OK = 0
FAILED = 0

#: Las tres que el tablero guarda. `deleted` NO esta: es una orden, no un estado.
CANONICAL = ("pending", "in_progress", "completed")

#: Cada una entraba antes de este cambio — medido, no supuesto.
OUTSIDE_VOCABULARY = ("borrador", "DONE", "", "in-progress", "deleted")

#: El DDL SIN CHECK, tal y como la base real lo tenia. Se conserva verbatim
#: porque es el sujeto de la migracion: un DDL parafraseado mediria otra cosa.
LEGACY_DDL = """
CREATE TABLE tasks (
    task_id       TEXT NOT NULL,
    subject       TEXT NOT NULL,
    description   TEXT,
    status        TEXT NOT NULL,
    active_form   TEXT,
    owner         TEXT,
    blocks_json   TEXT,
    blocked_by_json TEXT,
    session_id    TEXT NOT NULL DEFAULT 'desconocida',
    source        TEXT,
    metadata_json TEXT,
    submodule        TEXT,
    submodule_source TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (session_id, task_id)
)
"""


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}")
        print(f"        esperado=[{expected}] obtenido=[{obtained}]")


def insert(conn, status, task_id=None):
    """Inserta por SQL crudo — la via que usan los cuatro escritores.

    Devuelve ``None`` si la base la acepto, o el mensaje del rechazo.
    """
    try:
        conn.execute(
            "INSERT INTO tasks (task_id, subject, status, session_id, "
            "created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (task_id or f"probe-{status or 'empty'}", "probe subject", status,
             "probe-session", "2026-01-01", "2026-01-01"),
        )
        conn.commit()
        return None
    except sqlite3.IntegrityError as error:
        conn.rollback()
        return str(error)


print("test_task_status_vocabulary:")
print()
print("== 1. el vocabulario se declara una vez y la tabla lo consume ==")
check("TASK_STATUSES son los tres canonicos", CANONICAL, TASK_STATUSES)
check("`deleted` NO esta en el vocabulario persistible", False,
      "deleted" in TASK_STATUSES)

fresh = sqlite3.connect(":memory:")
fresh.executescript(CORE_SCHEMA)
ddl = fresh.execute(
    "SELECT sql FROM sqlite_master WHERE name='tasks'").fetchone()[0]
check("una base nueva nace con el CHECK", True, "CHECK" in ddl.upper())

print()
print("== 2. LA MITAD: los tres canonicos siguen entrando ==")
# Un CHECK con un typo rompe la escritura legitima y NADA mas lo delata: la
# suite del escritor seguiria verde si sólo probara el rechazo.
for status in CANONICAL:
    check(f"`{status}` entra", None, insert(fresh, status))

print()
print("== 3. LA OTRA MITAD: lo de fuera se rechaza ==")
for status in OUTSIDE_VOCABULARY:
    rejected = insert(fresh, status) is not None
    check(f"`{status or '(cadena vacia)'}` se rechaza", True, rejected)

print()
print("== 4. la migracion alcanza a una base VIEJA, sin perder filas ==")
old = sqlite3.connect(":memory:")
old.executescript(LEGACY_DDL)
for index, status in enumerate(CANONICAL):
    insert(old, status, task_id=f"heredada-{index}")
check("la base vieja admitia lo de fuera", None, insert(old, "borrador",
                                                        task_id="heredada-x"))
old.execute("DELETE FROM tasks WHERE task_id='heredada-x'")
old.commit()

_migrate_tasks_status_check(old)
migrated = old.execute(
    "SELECT sql FROM sqlite_master WHERE name='tasks'").fetchone()[0]
check("tras migrar, la tabla lleva el CHECK", True, "CHECK" in migrated.upper())
check("y conserva sus tres filas", 3,
      old.execute("SELECT COUNT(*) FROM tasks").fetchone()[0])
check("y ahora rechaza lo de fuera", True,
      insert(old, "borrador", task_id="post") is not None)
check("y la clave compuesta sobrevive a la reconstruccion",
      {"session_id", "task_id"},
      {row[1] for row in old.execute("PRAGMA table_info(tasks)") if row[5]})

print()
print("== 5. la migracion es idempotente ==")
# Correrla dos veces no puede duplicar la tabla ni perder filas: `connect()` la
# invoca en CADA apertura del store, asi que la segunda pasada es el caso
# normal, no el excepcional.
_migrate_tasks_status_check(old)
check("segunda pasada: las filas siguen", 3,
      old.execute("SELECT COUNT(*) FROM tasks").fetchone()[0])
check("y no quedo ninguna tabla de trabajo", [],
      [row[0] for row in old.execute(
          "SELECT name FROM sqlite_master WHERE name LIKE 'tasks_%'")])

print()
print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(0 if FAILED == 0 else 1)
