#!/usr/bin/env python3
"""Mide si la tabla ``tasks`` admite un estado fuera del vocabulario.

El vocabulario esta declarado en DOS sitios y en dos lenguas —
``src/task/schema.ts::TASK_STATUSES`` y el ``choices`` de un subcomando de
``src/agents/agent_store.py``— y ninguno de los dos gobierna la tabla. Esta
sonda escribe por SQL crudo, que es lo que hacen los cuatro sitios de
insercion, y reporta que acepta la base.

No escribe en el store real: compone su propia base con el mismo DDL.
"""
import sqlite3
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve()
while RAIZ != RAIZ.parent and not (RAIZ / "src/paths/reach.py").exists():
    RAIZ = RAIZ.parent
sys.path.insert(0, str(RAIZ / "src"))

from agents.agent_store import CORE_SCHEMA  # noqa: E402

CANONICAL = ("pending", "in_progress", "completed")
OUTSIDE = ("borrador", "DONE", "", "in-progress", "deleted")


def accepts(conn, status):
    """¿La base acepta esta fila? Devuelve None si si, o el mensaje si no."""
    try:
        conn.execute(
            "INSERT INTO tasks (task_id, subject, status, session_id, "
            "created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (f"probe-{status or 'vacio'}", "sujeto de sonda", status,
             "sesion-de-sonda", "2026-01-01", "2026-01-01"),
        )
        conn.commit()
        return None
    except sqlite3.IntegrityError as error:
        conn.rollback()
        return str(error)


def main():
    conn = sqlite3.connect(":memory:")
    conn.executescript(CORE_SCHEMA)

    print("== canonicos: los tres tienen que entrar ==")
    for status in CANONICAL:
        error = accepts(conn, status)
        print(f"  {status:<14} {'ACEPTA' if error is None else 'RECHAZA — ' + error}")

    print()
    print("== fuera del vocabulario: cada ACEPTA es el defecto ==")
    for status in OUTSIDE:
        error = accepts(conn, status)
        etiqueta = status if status else "(cadena vacia)"
        print(f"  {etiqueta:<14} {'ACEPTA' if error is None else 'RECHAZA — ' + error}")

    print()
    filas = conn.execute("SELECT status FROM tasks ORDER BY status").fetchall()
    print(f"filas que quedaron en la tabla: {len(filas)}")
    print("estados:", sorted({row[0] for row in filas}))


if __name__ == "__main__":
    main()
