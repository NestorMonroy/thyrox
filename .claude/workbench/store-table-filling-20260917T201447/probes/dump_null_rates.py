#!/usr/bin/env python3
"""Volcado TSV de la tasa de NULL por columna del store.

Extrae, no agrega: la agregacion la hace ``awk`` sobre el TSV, segun
``operaciones-de-archivo-con-bash.md``. Existe porque no hay ``sqlite3`` CLI
en este contenedor — es la excepcion por capacidad, no por comodidad.

Salida (TSV, sin cabecera):  table  column  nulls  rows

Metrica: conteo de filas con la columna IS NULL, por columna real de cada
  tabla no-sombra.
Ciega a: la cadena vacia y el cero, que no son NULL y aqui cuentan como dato;
  y a si el valor presente es CORRECTO — sólo ve presencia.
"""
import sqlite3
import sys

SHADOW = "_fts_config", "_fts_data", "_fts_docsize", "_fts_idx"

def main(store: str) -> int:
    conn = sqlite3.connect(f"file:{store}?mode=ro", uri=True)
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
    for table in tables:
        if any(table.endswith(s) for s in SHADOW):
            continue
        columns = [r[1] for r in conn.execute(f'PRAGMA table_info("{table}")')]
        if not columns:
            continue
        rows = conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        counts = conn.execute(
            "SELECT " + ", ".join(f'SUM("{c}" IS NULL)' for c in columns)
            + f' FROM "{table}"').fetchone()
        for column, nulls in zip(columns, counts):
            print(f"{table}\t{column}\t{nulls or 0}\t{rows}")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
