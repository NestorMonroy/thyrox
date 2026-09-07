#!/usr/bin/env python3
"""El censo de tablas DERIVA su columna de fecha; no la adivina de una lista.

Mitad ROJA. La medicion que publique hoy elegia la columna de fecha de una
lista escrita a mano —`created_at`, `updated_at`, `started_at`, `fecha`— y por
eso declaro `cleared_tool_results` «sin columna de fecha» y «no medible». La
tabla tiene `cleared_at` y es la mas viva de las cinco: 294 filas hoy.

El defecto no estaba en la tabla: estaba en el instrumento. Es la misma forma
que `REACH_ROOTS` y `--repo-docs` tenian — un literal dentro del mecanismo
donde deberia haber una derivacion.

CONTROL DE ANULACION: si `date_columns` volviera a la lista de cuatro nombres,
cae el caso 2 —y solo el 2—. El 1 y el 3 miden tablas cuya columna SI estaba en
aquella lista, asi que sobreviven; sin el caso 2 el verde no distinguiria
«deriva» de «acerto porque el nombre estaba en la lista».
"""
from __future__ import annotations

import importlib.util
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE / "src"))

spec = importlib.util.spec_from_file_location("agent_store", HERE / "src" / "agents" / "agent_store.py")
store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]"); FAILED += 1


conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE con_created (id TEXT, created_at TEXT)")
conn.execute("CREATE TABLE con_cleared (id TEXT, cleared_at TEXT)")
conn.execute("CREATE TABLE con_dos (id TEXT, created_at TEXT, updated_at TEXT)")
conn.execute("CREATE TABLE sin_fecha (id TEXT, nombre TEXT)")

print("== 1. una columna con nombre de la lista vieja ==")
check("created_at se detecta", ["created_at"], store.date_columns(conn, "con_created"))

print("== 2. el caso que el instrumento viejo NO veia ==")
check("cleared_at tambien se detecta", ["cleared_at"], store.date_columns(conn, "con_cleared"))

print("== 3. varias columnas: se devuelven TODAS, no la primera ==")
check("created_at y updated_at", ["created_at", "updated_at"],
      store.date_columns(conn, "con_dos"))

print("== 4. una tabla sin fecha lo dice, no falla ==")
check("lista vacia", [], store.date_columns(conn, "sin_fecha"))

print("== 5. la ultima escritura sale del MAXIMO de todas ==")
conn.execute("INSERT INTO con_dos VALUES ('a','2026-01-01','2026-09-07')")
conn.execute("INSERT INTO con_dos VALUES ('b','2026-05-05',NULL)")
check("gana el mayor entre las dos columnas", "2026-09-07",
      store.last_write(conn, "con_dos"))
check("sin columna de fecha devuelve None", None, store.last_write(conn, "sin_fecha"))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
