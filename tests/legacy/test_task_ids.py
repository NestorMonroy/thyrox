#!/usr/bin/env python3
"""Suite de ``task/task_ids.py`` — el identificador de cita del proyecto.

Se escribio ANTES que el instrumento. Su control positivo no es un caso
fabricado: el bloque 5 reproduce la colision REAL que ERR-024 registro —
332 de 337 ids de la sesion activa chocan con los de la sesion anterior — y
exige que el mapa la desambigue.

Lo que la suite mide, y por que cada bloque existe:

1. Forma del identificador. ``TASK-<CAPA>-NNNN`` con la capa en mayuscula y
   cuatro digitos. Sin forma fija no hay patron que citar ni que greppear.
2. Idempotencia. Acunar dos veces las mismas entradas no mueve ningun id.
   Es la propiedad que hace seguro correr el renderizador en cada Stop.
3. Estabilidad bajo cambio de capa. Una tarea acunada sin capa conserva su
   id cuando ``derivar-capa`` se la asigna despues. El id es identidad, no
   clasificacion: renumerarlo rompe toda cita ya escrita.
4. Contador por capa, global y sin reuso. El siguiente nace del maximo
   acunado, no del conteo de filas — borrar una entrada no libera su numero.
5. La colision de ERR-024. Mismo ``task_id`` en dos sesiones distintas son
   DOS tareas, y reciben dos ids.
6. Determinismo. Re-acunar desde cero en el mismo orden reproduce el mapa
   byte a byte. Sin esa propiedad el mapa versionado no se puede reconstruir
   si se pierde, y entonces las citas quedan colgando.
7. Guard de mapa corrupto. Un JSON ilegible REHUSA; no devuelve un mapa
   vacio. Un mapa vacio acunaria ids desde 1 sobre tareas que ya los tienen,
   y ahi el defecto no se ve hasta que alguien sigue una cita equivocada.
"""

from __future__ import annotations

import importlib.util
import json
import pathlib
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
MODULE_PATH = HERE.parent / "task" / "task_ids.py"

_spec = importlib.util.spec_from_file_location("task_ids", MODULE_PATH)
kx = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kx)

failures: list[str] = []
checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(label)


def entry(session: str, task_id, layer=None, subject: str = "") -> kx.TaskRef:
    return kx.TaskRef(session_id=session, task_id=str(task_id),
                      layer=layer, subject=subject)


# --- 1. forma del identificador -------------------------------------------
mapping = kx.Mapping()
assigned = kx.mint(mapping, [entry("s1", 7, "api", "Portar Field")])
check(assigned["s1\x007"] == "TASK-API-0001", "1a: primer id de api es TASK-API-0001")
check(kx.ID_RE.match("TASK-API-0001") is not None, "1b: el patron acepta la forma canonica")
check(kx.ID_RE.match("TASK-API-1") is None, "1c: el patron rechaza el ordinal sin relleno")
check(kx.ID_RE.match("kx-api-0001") is None, "1d: el patron rechaza la minuscula")

sin_capa = kx.mint(mapping, [entry("s1", 8, None, "sin señal de capa")])
check(sin_capa["s1\x008"] == "TASK-GEN-0001",
      "1e: la tarea sin capa acuña bajo GEN, no bajo una capa inventada")

# --- 2. idempotencia -------------------------------------------------------
otra_vez = kx.mint(mapping, [entry("s1", 7, "api", "Portar Field")])
check(otra_vez["s1\x007"] == "TASK-API-0001", "2a: re-acuñar no mueve el id")
check(len(mapping.ids) == 2, "2b: re-acuñar no añade entradas")

# --- 3. estabilidad bajo cambio de capa ------------------------------------
tras_derivar = kx.mint(mapping, [entry("s1", 8, "docs", "sin señal de capa")])
check(tras_derivar["s1\x008"] == "TASK-GEN-0001",
      "3a: derivar la capa despues NO renumera el id ya acuñado")
check(mapping.ids["TASK-GEN-0001"]["layer"] == "gen",
      "3b: la capa congelada en el id no se reescribe")

# --- 4. contador por capa, global y sin reuso -------------------------------
kx.mint(mapping, [entry("s1", 9, "api"), entry("s1", 10, "docs")])
check(kx.lookup(mapping, "s1", "9") == "TASK-API-0002", "4a: el contador de api avanza")
check(kx.lookup(mapping, "s1", "10") == "TASK-DOCS-0001",
      "4b: cada capa lleva su propio contador")
del mapping.ids["TASK-API-0002"]
mapping.reindex()
kx.mint(mapping, [entry("s1", 11, "api")])
check(kx.lookup(mapping, "s1", "11") == "TASK-API-0003",
      "4c: borrar una entrada NO libera su numero — el siguiente sale del maximo")

# --- 5. la colision real de ERR-024 ----------------------------------------
colision = kx.Mapping()
kx.mint(colision, [entry("168b0fdf", 371, "docs", "otra tarea"),
                   entry("29a5e555", 371, "docs", "Declarar la equivalencia")])
uno = kx.lookup(colision, "168b0fdf", "371")
dos = kx.lookup(colision, "29a5e555", "371")
check(uno is not None and dos is not None, "5a: las dos tareas #371 reciben id")
check(uno != dos, "5b: el mismo #371 en dos sesiones NO comparte identificador")

# --- 6. determinismo -------------------------------------------------------
entradas = [entry("sA", 3, "api"), entry("sA", 1, "docs"),
            entry("sB", 3, None), entry("sA", 2, "api")]
primera, segunda = kx.Mapping(), kx.Mapping()
kx.mint(primera, entradas)
kx.mint(segunda, entradas)
check(kx.dumps(primera) == kx.dumps(segunda),
      "6a: dos acuñaciones del mismo orden dan el mismo mapa, byte a byte")

import sqlite3


def build_store(path, filas, with_column=True):
    """Un store minimo con el esquema de ``tasks`` que el modulo consulta."""
    conn = sqlite3.connect(path)
    columna = ", citation_id TEXT" if with_column else ""
    conn.execute("CREATE TABLE tasks (session_id TEXT, task_id TEXT, "
                 f"submodule TEXT, subject TEXT, created_at TEXT{columna})")
    if with_column:
        conn.executemany("INSERT INTO tasks VALUES (?,?,?,?,?,?)", filas)
    else:
        conn.executemany("INSERT INTO tasks VALUES (?,?,?,?,?)",
                         [f[:5] for f in filas])
    conn.commit()
    conn.close()


with tempfile.TemporaryDirectory() as tmp:
    store = pathlib.Path(tmp) / "ida-y-vuelta.sqlite3"
    build_store(store, [("sA", "3", "api", "tres", "2026-01-01", None),
                        ("sA", "1", "docs", "uno", "2026-01-01", None),
                        ("sB", "3", None, "otra", "2026-02-01", None)])
    puesto = kx.Mapping()
    kx.persist_to_store(store, kx.mint(puesto, kx.refs_from_store(store)))
    releido = kx.mapping_from_store(store)
    check(kx.dumps(releido) == kx.dumps(puesto),
          "6b: escribir al store y releerlo no altera el mapa")
    check(kx.lookup(releido, "sA", "3") == kx.lookup(puesto, "sA", "3"),
          "6c: el indice inverso sobrevive al viaje por el store")

    # 6d — acuñar sobre un store YA acuñado continua el contador
    conn = sqlite3.connect(store)
    conn.execute("INSERT INTO tasks VALUES ('sC','9','api','nueve','2026-03-01',NULL)")
    conn.commit(); conn.close()
    segundo = kx.mapping_from_store(store)
    kx.persist_to_store(store, kx.mint(segundo, kx.refs_from_store(store)))
    check(kx.lookup(kx.mapping_from_store(store), "sC", "9") == "TASK-API-0002",
          "6d: acuñar sobre un store ya acuñado continua el contador")
    check(kx.lookup(kx.mapping_from_store(store), "sA", "3") == "TASK-API-0001",
          "6e: y NO mueve el id que ya estaba")

# --- 7. guards: el store no se puede leer, o no se entiende ----------------
with tempfile.TemporaryDirectory() as tmp:
    ausente = pathlib.Path(tmp) / "no-existe.sqlite3"
    for fn, etiqueta in ((kx.mapping_from_store, "mapping_from_store"),
                         (kx.refs_from_store, "refs_from_store")):
        try:
            fn(ausente)
            check(False, f"7a: {etiqueta} debe rehusar con el store ausente")
        except kx.MappingError as exc:
            check(str(ausente) in str(exc),
                  f"7b: el rehuse de {etiqueta} NOMBRA el store que falta")

    roto = pathlib.Path(tmp) / "id-corrupto.sqlite3"
    build_store(roto, [("sA", "1", "api", "uno", "2026-01-01", "TASK-API-1")])
    try:
        kx.mapping_from_store(roto)
        check(False, "7c: un citation_id fuera de forma debe rehusar")
    except kx.MappingError as exc:
        check("TASK-API-1" in str(exc), "7d: el rehuse nombra el id que no entiende")

    sin_columna = pathlib.Path(tmp) / "sin-columna.sqlite3"
    build_store(sin_columna, [("sA", "1", "api", "uno", "2026-01-01", None)],
                with_column=False)
    check(len(kx.mapping_from_store(sin_columna).ids) == 0,
          "7e: un store sin la columna arranca vacio — es el primer uso, no un fallo")

    # 7f — control que discrimina: `persist_to_store` NUNCA pisa un id ya puesto.
    # Sin el `WHERE citation_id IS NULL` este caso pasaria igual y nadie veria
    # que un segundo acuñado puede reasignar una cita ya escrita.
    ocupado = pathlib.Path(tmp) / "ocupado.sqlite3"
    build_store(ocupado, [("sA", "1", "api", "uno", "2026-01-01", "TASK-API-0001")])
    tocadas = kx.persist_to_store(ocupado, {"sA\x001": "TASK-API-0099"})
    check(tocadas == 0, "7f: escribir sobre una fila ya acuñada no toca ninguna fila")
    check(kx.lookup(kx.mapping_from_store(ocupado), "sA", "1") == "TASK-API-0001",
          "7g: y el id que estaba sigue siendo el mismo")

# --- 8. el adaptador al store: el ORDEN es parte del contrato ---------------
# Sin orden fijo, re-acuñar desde cero reparte otros numeros y el acuñado deja
# de ser reconstruible — que es la propiedad del bloque 6.

with tempfile.TemporaryDirectory() as tmp:
    store = pathlib.Path(tmp) / "store.sqlite3"
    conn = sqlite3.connect(store)
    conn.execute("CREATE TABLE tasks (session_id TEXT, task_id TEXT, "
                 "submodule TEXT, subject TEXT, created_at TEXT)")
    # sB nace ANTES que sA; dentro de cada una los ids llegan desordenados y
    # con dos digitos, que es donde un ORDER BY de texto se equivoca.
    conn.executemany(
        "INSERT INTO tasks VALUES (?,?,?,?,?)",
        [("sA", "10", "api", "diez", "2026-02-01"),
         ("sA", "2", "api", "dos", "2026-02-02"),
         ("sB", "1", None, "uno", "2026-01-01")])
    conn.commit()
    conn.close()

    refs = kx.refs_from_store(store)
    check([(r.session_id, r.task_id) for r in refs]
          == [("sB", "1"), ("sA", "2"), ("sA", "10")],
          "8a: sesion por su tarea mas antigua, tarea por id NUMERICO (2 antes que 10)")

    uno, dos = kx.Mapping(), kx.Mapping()
    kx.mint(uno, kx.refs_from_store(store))
    kx.mint(dos, kx.refs_from_store(store))
    check(kx.dumps(uno) == kx.dumps(dos),
          "8b: dos acuñaciones desde el mismo store dan el mismo mapa")
    check(kx.lookup(uno, "sA", "2") == "TASK-API-0001",
          "8c: el id numericamente menor de api acuña primero")
    check(kx.lookup(uno, "sB", "1") == "TASK-GEN-0001",
          "8d: la tarea sin submodule acuña bajo GEN")

    ausente = pathlib.Path(tmp) / "no-esta.sqlite3"
    try:
        kx.refs_from_store(ausente)
        check(False, "8e: un store ausente debe rehusar, no devolver lista vacia")
    except kx.MappingError:
        check(True, "8e: un store ausente rehusa")

    # 8f — control que discrimina: acuñar NO escribe en el store. Es la
    # propiedad que evita el conflicto binario con la rama hermana.
    antes = store.read_bytes()
    kx.refs_from_store(store)
    check(store.read_bytes() == antes,
          "8f: leer el store para acuñar lo deja byte a byte igual")


# --- 9. #104: el id se ancla al SUJETO, no al ordinal -----------------------
#
# El caso real: el cliente renumera dentro de la MISMA sesion. Sin anclaje por
# sujeto, la segunda pasada acuña un id nuevo para una tarea que ya lo tenia, y
# el viejo queda nombrando a quien ocupe ahora ese ordinal (H-DOCS-1042).
S = "168b0fdf"
primera = [
    kx.TaskRef(S, "1", "docs", "Portar el gate de fidelidad"),
    kx.TaskRef(S, "2", "api", "Barrer los identificadores en espanol"),
]
m9 = kx.Mapping()
a1 = kx.mint(m9, primera)
id_gate = a1[f"{S}\x001"]
sweep_id = a1[f"{S}\x002"]

# El mismo tablero, renumerado: los dos sujetos cambian de ordinal y entra uno
# nuevo en medio.
segunda = [
    kx.TaskRef(S, "1", "docs", "Una tarea nueva que se colo primero"),
    kx.TaskRef(S, "2", "docs", "Portar el gate de fidelidad"),
    kx.TaskRef(S, "3", "api", "Barrer los identificadores en espanol"),
]
before_minting = len(m9.ids)
a2 = kx.mint(m9, segunda)

check(a2[f"{S}\x002"] == id_gate,
      "9a: el sujeto conserva su id cuando el ordinal cambia (1 -> 2)")
check(a2[f"{S}\x003"] == sweep_id,
      "9b: el segundo sujeto tambien (2 -> 3)")
check(len(m9.ids) == before_minting + 1,
      "9c: solo nace UN id — el del sujeto que no existia")
check(a2[f"{S}\x001"] not in (id_gate, sweep_id),
      "9d: el ordinal 1, ahora otro sujeto, NO hereda el id del anterior")

# 9e — control que discrimina: sin el anclaje, 9c daria +3 en vez de +1. Se
# mide anulando el indice por sujeto, que es la pieza que hace el trabajo.
m9b = kx.Mapping()
kx.mint(m9b, primera)
m9b._by_subject = {}          # la guarda anulada (sub-patron D)
antes = len(m9b.ids)
kx.mint(m9b, segunda)
check(len(m9b.ids) == antes + 3,
      "9e: con el indice por sujeto anulado nacen 3 ids — el control discrimina")

# 9f — dos tareas con el MISMO sujeto: el sujeto no desambigua y no se elige al
# azar. Se acuña, y el par queda como estaba.
m9c = kx.Mapping()
kx.mint(m9c, [kx.TaskRef(S, "1", "docs", "Titulo repetido"),
              kx.TaskRef(S, "2", "docs", "Titulo repetido")])
n_antes = len(m9c.ids)
kx.mint(m9c, [kx.TaskRef(S, "9", "docs", "Titulo repetido")])
check(len(m9c.ids) == n_antes + 1,
      "9f: con el sujeto ambiguo se acuña uno nuevo, no se elige al azar")

# 9g — un sujeto VACIO nunca ancla: colapsaria todas las tareas sin titulo.
check(kx.TaskRef(S, "1", "docs", "   ").subject_key is None,
      "9g: un sujeto vacio o de solo espacios no produce llave de sujeto")

# 9h — el sujeto se normaliza por espacios: el mismo titulo con otro espaciado
# es el mismo sujeto.
check(kx.TaskRef(S, "1", "docs", "a  b").subject_key
      == kx.TaskRef(S, "7", "docs", " a b ").subject_key,
      "9h: el sujeto se compara normalizado por espacios")


# --- 10. `ingest_board` — el sujeto del board entra al store en un ordinal
#     LIBRE, sin pisar la cita del ocupante anterior de su ordinal.
#
#     El defecto que repara es real y esta medido (:ref:`h-docs-1067`): el
#     ordinal del board se reusa, y en el store esos mismos numeros nombran
#     otros sujetos. El control positivo reproduce esa forma — una fila vieja
#     ya ocupa el ordinal "5" con OTRO sujeto y su propia cita.
import sqlite3

def _store_con(filas):
    """Un store minimo con las columnas que `ingest_board` toca."""
    d = pathlib.Path(tempfile.mkdtemp())
    db = d / "s.sqlite3"
    c = sqlite3.connect(db)
    c.execute("CREATE TABLE tasks (task_id TEXT, subject TEXT, description TEXT,"
              " status TEXT, session_id TEXT, source TEXT, created_at TEXT,"
              " updated_at TEXT, submodule TEXT, submodule_source TEXT,"
              " opened_at TEXT, opened_at_source TEXT, citation_id TEXT)")
    for f in filas:
        c.execute("INSERT INTO tasks (task_id, subject, session_id, submodule,"
                  " citation_id) VALUES (?,?,?,?,?)", f)
    c.commit(); c.close()
    return d, db

def _board_con(tarjetas):
    d = pathlib.Path(tempfile.mkdtemp())
    for ordinal, data in tarjetas.items():
        (d / f"{ordinal}.json").write_text(json.dumps(data))
    return d

VIEJO = "Cron A — portar el ejecutor de IrCron"
NUEVO = "Reparar el REcompile() panic del gate de sucesor"

_, DB = _store_con([("5", VIEJO, S, "gen", "TASK-GEN-0045")])
BOARD = _board_con({"5": {"subject": NUEVO, "submodule": "docs"}})
acunadas = kx.ingest_board(DB, BOARD, S, ["5"])

check(len(acunadas) == 1, "10a: el sujeto nuevo del board se acuña")
check(acunadas[0][1] != "5",
      "10b: aterriza en un ordinal LIBRE, no en el 5 que ya estaba ocupado")

con = sqlite3.connect(DB)
cita_vieja = con.execute("SELECT citation_id FROM tasks WHERE subject = ?",
                         (VIEJO,)).fetchone()[0]
check(cita_vieja == "TASK-GEN-0045",
      "10c: la cita del sujeto ANTERIOR queda intacta (el daño de h-docs-1042)")
cita_nueva = con.execute("SELECT citation_id FROM tasks WHERE subject = ?",
                         (NUEVO,)).fetchone()[0]
check(cita_nueva != cita_vieja and cita_nueva.startswith("TASK-DOCS-"),
      "10d: el sujeto nuevo recibe cita propia, en la capa que declara su tarjeta")
con.close()

# 10e — idempotencia: repetir el mismo ingest NO acuña una segunda cita para
#     el mismo sujeto. Sin esto, cada pasada duplicaria la fila (TASK-DB-0002).
check(len(kx.ingest_board(DB, BOARD, S, ["5"])) == 0,
      "10e: repetir el ingest no acuña de nuevo el mismo sujeto")

# 10f — control que DISCRIMINA: con el indice de sujetos vacio —la pieza que
#     hace el trabajo— el segundo ingest SI duplicaria. Se mide sobre un store
#     hermano, sin tocar el de arriba.
_, DB2 = _store_con([])
check(len(kx.ingest_board(DB2, BOARD, S, ["5"])) == 1,
      "10f: sobre un store sin ese sujeto SI se acuña — el control discrimina")

# 10g — guard: una tarjeta que falta REHUSA, y no escribe la mitad del lote.
try:
    kx.ingest_board(DB, BOARD, S, ["5", "99"])
    check(False, "10g: una tarjeta ausente debe REHUSAR")
except kx.MappingError:
    check(True, "10g: una tarjeta ausente REHUSA en vez de acuñar a medias")


print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    sys.exit(1)
print("OK: todas las aserciones pasan")
