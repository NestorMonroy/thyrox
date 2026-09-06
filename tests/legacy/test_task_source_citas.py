#!/usr/bin/env python3
"""Suite de ``task/task_source.citation_index`` — la cita durable en la salida.

Lo que esta pieza hace, y por que necesita control propio: los seis guiones que
publican identidad de tarea a un lector citaban el **ordinal** del board, y ese
ordinal se reinicia y se reusa por sesion (ERR-024, :ref:`h-docs-1067`). La cita
durable ``TASK-<CAPA>-NNNN`` vive en ``tasks.citation_id`` del store y se ancla
al **sujeto**, no a la posicion. ``citation_index`` es la pieza que hace ese
emparejamiento.

Los bloques, y por que cada uno existe:

1. Emparejamiento por SUJETO — el positivo, tomado del store REAL. El sujeto no
   se fabrica: se lee del store una fila que tenga cita unica, y se exige que
   una ficha con ese mismo sujeto la resuelva. Un caso escrito a mano heredaria
   el encuadre de quien escribio el emparejador.
2. **El control que DISCRIMINA** (sub-patron D de
   ``metrica-decide-la-conclusion.md``): con la clave de sujeto anulada —la
   pieza que hace el trabajo— caen EXACTAMENTE los casos con cita, y la salida
   de ordinal sobrevive intacta. Sin este bloque, la suite pasaria igual con un
   ``citation_index`` que devolviera siempre ``{}``.
3. Contrato de compatibilidad — una base sin la columna, y un store ausente,
   siguen respondiendo SIN el campo. Es el contrato de ``selectCitationId`` del
   harness: la telemetria ausente no tumba al consumidor.
4. Ambiguedad — un sujeto con DOS citas distintas NO desambigua: se publica
   ninguna en vez de elegir al azar. Elegir una seria republicar el defecto.
5. El sujeto vacio no ancla — colapsaria todas las fichas sin titulo en una
   sola llave.
6. ``format_identity`` conserva el ordinal SIEMPRE: es con lo que el board
   responde, y quien lee la salida lo necesita para operarlo.
"""

from __future__ import annotations

import importlib.util
import os
import pathlib
import sqlite3
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
MODULE_PATH = HERE.parents[1] / "src" / "task" / "task_source.py"
# El store real es PARAMETRO del consumidor, no del mecanismo: vive en el clon
# que despacha. La aritmetica anterior lo buscaba en `.claude/agent-results/`
# relativo a este archivo, que era su sitio cuando la suite vivia en
# `docs: .claude/scripts/tests/`; desde `thyrox/tests/legacy/` no resuelve a
# nada. Se declara con la misma variable que `agents/model_catalog.py`.
_ENV_STORE = os.environ.get("THYROX_AGENT_STORE") or os.environ.get(
    "KAUPAMEX_AGENT_STORE")
STORE_REAL = pathlib.Path(_ENV_STORE) if _ENV_STORE else None

_spec = importlib.util.spec_from_file_location("task_source", MODULE_PATH)
ts = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ts)

failures: list[str] = []
checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(label)


def store_con(filas, con_columna=True):
    """Un store sintetico. ``filas`` = ``(task_id, subject, citation_id)``."""
    tmp = tempfile.mkdtemp()
    path = pathlib.Path(tmp) / "store.sqlite3"
    conn = sqlite3.connect(path)
    columna = ", citation_id TEXT" if con_columna else ""
    conn.execute(
        "CREATE TABLE tasks (task_id TEXT NOT NULL, subject TEXT NOT NULL,"
        f" session_id TEXT NOT NULL DEFAULT 'x'{columna})")
    for task_id, subject, citation in filas:
        if con_columna:
            conn.execute("INSERT INTO tasks (task_id, subject, citation_id)"
                         " VALUES (?,?,?)", (task_id, subject, citation))
        else:
            conn.execute("INSERT INTO tasks (task_id, subject) VALUES (?,?)",
                         (task_id, subject))
    conn.commit()
    conn.close()
    return path


def ficha(task_id, subject):
    return {"id": str(task_id), "subject": subject}


# --- 1. El positivo, del store REAL -----------------------------------------
#     Se busca una fila con cita cuyo sujeto sea UNICO en el store: si el sujeto
#     se repitiera con dos citas, el bloque 4 manda no resolver, y este bloque
#     estaria midiendo la ambiguedad en vez del emparejamiento.
sujeto_real = cita_real = None
if STORE_REAL is not None and STORE_REAL.is_file():
    conexion = sqlite3.connect(f"file:{STORE_REAL}?mode=ro", uri=True)
    columnas = {r[1] for r in conexion.execute("PRAGMA table_info(tasks)")}
    if "citation_id" in columnas:
        fila = conexion.execute(
            "SELECT subject, MIN(citation_id) FROM tasks"
            " WHERE citation_id IS NOT NULL AND TRIM(subject) <> ''"
            " GROUP BY subject"
            " HAVING COUNT(DISTINCT citation_id) = 1 LIMIT 1").fetchone()
        if fila:
            sujeto_real, cita_real = fila
    conexion.close()

check(sujeto_real is not None,
      "1a: el store real ofrece un sujeto con cita unica (el positivo)")
if sujeto_real is not None:
    indice = ts.citation_index([ficha(9999, sujeto_real)])
    check(indice.get("9999") == cita_real,
          "1b: una ficha con el sujeto REAL resuelve a su cita durable")
    check(ts.format_identity(9999, indice.get("9999"))
          == f"#9999 ({cita_real})",
          "1c: la identidad publicada lleva ordinal Y cita")
else:                                    # sin store no hay positivo que medir
    check(False, "1b: (sin store real, el positivo no se pudo medir)")
    check(False, "1c: (sin store real, el positivo no se pudo medir)")

# --- 2. El control que DISCRIMINA -------------------------------------------
#     Se anula `_subject_key` —la pieza que ancla— y se exige que caiga
#     EXACTAMENTE el emparejamiento: ninguna cita, y el ordinal intacto.
#     Con la clave viva el mismo store da una cita; sin ella, ninguna. Si el
#     conteo no cambiara, el indice no seria quien hace el trabajo.
DB = store_con([("1", "portar el ejecutor de ir.cron", "TASK-API-0001")])
FICHAS = [ficha(7, "portar el ejecutor de ir.cron"), ficha(8, "otra cosa")]

vivo = ts.citation_index(FICHAS, store_path=DB)
check(len(vivo) == 1 and vivo.get("7") == "TASK-API-0001",
      "2a: con la clave viva empareja exactamente una ficha")

_clave_original = ts._subject_key
ts._subject_key = lambda subject: None
try:
    anulado = ts.citation_index(FICHAS, store_path=DB)
    identidades_anuladas = [ts.format_identity(f["id"], anulado.get(f["id"]))
                            for f in FICHAS]
finally:
    ts._subject_key = _clave_original

check(len(anulado) == 0,
      "2b: anulada la clave de sujeto CAEN todas las citas (1 -> 0)")
check(identidades_anuladas == ["#7", "#8"],
      "2c: y la salida de ordinal sobrevive intacta — el control discrimina")
check(len(ts.citation_index(FICHAS, store_path=DB)) == 1,
      "2d: restaurada la clave, el emparejamiento vuelve — no quedo estado")

# --- 3. Contrato de compatibilidad ------------------------------------------
SIN_COLUMNA = store_con([("1", "portar el ejecutor de ir.cron", None)],
                        con_columna=False)
check(ts.citation_index(FICHAS, store_path=SIN_COLUMNA) == {},
      "3a: una base SIN la columna responde sin el campo, no levanta")
check(ts.citation_index(FICHAS, store_path="/no/existe/store.sqlite3") == {},
      "3b: un store ausente responde sin el campo, no levanta")

# --- 4. Ambiguedad: dos citas para el mismo sujeto --------------------------
AMBIGUO = store_con([("1", "mismo sujeto", "TASK-API-0001"),
                     ("2", "mismo sujeto", "TASK-DOCS-0002")])
check(ts.citation_index([ficha(7, "mismo sujeto")], store_path=AMBIGUO) == {},
      "4: un sujeto con DOS citas no publica ninguna, no elige al azar")

# --- 5. El sujeto vacio no ancla --------------------------------------------
VACIO = store_con([("1", "   ", "TASK-API-0001")])
check(ts.citation_index([ficha(7, "")], store_path=VACIO) == {},
      "5: un sujeto vacio no ancla — no colapsa las fichas sin titulo")

# --- 6. El ordinal NUNCA se retira ------------------------------------------
check(ts.format_identity(122) == "#122",
      "6a: sin cita, la identidad es el ordinal a secas")
check(ts.format_identity(122, "TASK-DOCS-0390") == "#122 (TASK-DOCS-0390)",
      "6b: con cita, el ordinal SIGUE presente — el board responde por el")

print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    sys.exit(1)
print("OK: todas las aserciones pasan")
