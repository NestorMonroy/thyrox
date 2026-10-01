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
import os
import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

#: El bootstrap de arriba es la ÚNICA aritmética admitida: alimenta el
#: `sys.path.insert` y falla con ruido si algo se mueve. Todo lo demás sale
#: del localizador declarado (tarea #228).
MODULE_PATH = reach.thyrox_root() / "src" / "task" / "task_ids.py"
#: El mismo archivo, invocado como PROGRAMA: el caso 11 mide la salida del
#: subcomando, no la funcion, porque el defecto vivia en la impresion.
SUT = MODULE_PATH

_spec = importlib.util.spec_from_file_location("task_ids", MODULE_PATH)
assert _spec is not None and _spec.loader is not None
kx = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kx)

failures: list[str] = []
checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(label)


def entry(session: str, task_id, layer=None, subject: str = ""):
    # `kx` es un modulo cargado por import dinamico: pyright no puede resolver
    # `kx.TaskRef` como tipo, asi que aqui no se anota el retorno.
    return kx.TaskRef(session_id=session, task_id=str(task_id),
                      layer=layer, subject=subject)


# --- 1. forma del identificador -------------------------------------------
mapping = kx.Mapping()
assigned = kx.assign_missing_ids(mapping, [entry("s1", 7, "api", "Portar Field")])
check(assigned["s1\x007"] == "TASK-API-0001", "1a: primer id de api es TASK-API-0001")
check(kx.ID_RE.match("TASK-API-0001") is not None, "1b: el patron acepta la forma canonica")
check(kx.ID_RE.match("TASK-API-1") is None, "1c: el patron rechaza el ordinal sin relleno")
check(kx.ID_RE.match("kx-api-0001") is None, "1d: el patron rechaza la minuscula")

sin_capa = kx.assign_missing_ids(mapping, [entry("s1", 8, None, "sin señal de capa")])
check(sin_capa["s1\x008"] == "TASK-GEN-0001",
      "1e: la tarea sin capa acuña bajo GEN, no bajo una capa inventada")

# --- 2. idempotencia -------------------------------------------------------
otra_vez = kx.assign_missing_ids(mapping, [entry("s1", 7, "api", "Portar Field")])
check(otra_vez["s1\x007"] == "TASK-API-0001", "2a: re-acuñar no mueve el id")
check(len(mapping.ids) == 2, "2b: re-acuñar no añade entradas")

# --- 3. estabilidad bajo cambio de capa ------------------------------------
tras_derivar = kx.assign_missing_ids(mapping, [entry("s1", 8, "docs", "sin señal de capa")])
check(tras_derivar["s1\x008"] == "TASK-GEN-0001",
      "3a: derivar la capa despues NO renumera el id ya acuñado")
check(mapping.ids["TASK-GEN-0001"]["layer"] == "gen",
      "3b: la capa congelada en el id no se reescribe")

# --- 4. contador por capa, global y sin reuso -------------------------------
kx.assign_missing_ids(mapping, [entry("s1", 9, "api"), entry("s1", 10, "docs")])
check(kx.lookup(mapping, "s1", "9") == "TASK-API-0002", "4a: el contador de api avanza")
check(kx.lookup(mapping, "s1", "10") == "TASK-DOCS-0001",
      "4b: cada capa lleva su propio contador")
del mapping.ids["TASK-API-0002"]
mapping.reindex()
kx.assign_missing_ids(mapping, [entry("s1", 11, "api")])
check(kx.lookup(mapping, "s1", "11") == "TASK-API-0003",
      "4c: borrar una entrada NO libera su numero — el siguiente sale del maximo")

# --- 5. la colision real de ERR-024 ----------------------------------------
colision = kx.Mapping()
kx.assign_missing_ids(colision, [entry("168b0fdf", 371, "docs", "otra tarea"),
                   entry("29a5e555", 371, "docs", "Declarar la equivalencia")])
uno = kx.lookup(colision, "168b0fdf", "371")
dos = kx.lookup(colision, "29a5e555", "371")
check(uno is not None and dos is not None, "5a: las dos tareas #371 reciben id")
check(uno != dos, "5b: el mismo #371 en dos sesiones NO comparte identificador")

# --- 6. determinismo -------------------------------------------------------
entradas = [entry("sA", 3, "api"), entry("sA", 1, "docs"),
            entry("sB", 3, None), entry("sA", 2, "api")]
primera, segunda = kx.Mapping(), kx.Mapping()
kx.assign_missing_ids(primera, entradas)
kx.assign_missing_ids(segunda, entradas)
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
    kx.persist_to_store(store, kx.assign_missing_ids(puesto, kx.refs_from_store(store)))
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
    kx.persist_to_store(store, kx.assign_missing_ids(segundo, kx.refs_from_store(store)))
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
    kx.assign_missing_ids(uno, kx.refs_from_store(store))
    kx.assign_missing_ids(dos, kx.refs_from_store(store))
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
a1 = kx.assign_missing_ids(m9, primera)
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
a2 = kx.assign_missing_ids(m9, segunda)

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
kx.assign_missing_ids(m9b, primera)
m9b._by_subject = {}          # la guarda anulada (sub-patron D)
antes = len(m9b.ids)
kx.assign_missing_ids(m9b, segunda)
check(len(m9b.ids) == antes + 3,
      "9e: con el indice por sujeto anulado nacen 3 ids — el control discrimina")

# 9f — dos tareas con el MISMO sujeto: el sujeto no desambigua y no se elige al
# azar. Se acuña, y el par queda como estaba.
m9c = kx.Mapping()
kx.assign_missing_ids(m9c, [kx.TaskRef(S, "1", "docs", "Titulo repetido"),
              kx.TaskRef(S, "2", "docs", "Titulo repetido")])
n_antes = len(m9c.ids)
kx.assign_missing_ids(m9c, [kx.TaskRef(S, "9", "docs", "Titulo repetido")])
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


# --- 10. `ingest_board` — la identidad de una tarjeta es su ORDINAL, no su
#     sujeto (H-THYROX-252). El control positivo es el episodio real: una
#     tarjeta renombrada EN EL MISMO ordinal no puede recibir una segunda
#     cita. La cobertura profunda —link_board_ordinal y los controles de
#     anulacion— vive en tests/task/test_board_ordinal_identity.py; aqui solo
#     el contrato minimo de la funcion que este archivo posee.
import sqlite3

def _store_con(filas):
    """Un store minimo con las columnas que `ingest_board` toca.

    Cada fila es ``(task_id, subject, session_id, submodule, citation_id)``
    o, con un sexto elemento explicito, ``(..., board_ordinal)``. Sin el
    sexto, el ordinal por defecto es el propio ``task_id`` — la sesion ya
    RECONCILIADA, que es el caso comun en estas pruebas—; un ``None``
    explicito deja la fila sin ordinal (sesion no reconciliada).
    """
    d = pathlib.Path(tempfile.mkdtemp())
    db = d / "s.sqlite3"
    c = sqlite3.connect(db)
    c.execute("CREATE TABLE tasks (task_id TEXT, subject TEXT, description TEXT,"
              " status TEXT, session_id TEXT, source TEXT, created_at TEXT,"
              " updated_at TEXT, submodule TEXT, submodule_source TEXT,"
              " opened_at TEXT, opened_at_source TEXT, citation_id TEXT,"
              " board_ordinal INTEGER)")
    for f in filas:
        if len(f) == 6:
            task_id, subject, session_id, submodule, citation_id, board_ordinal = f
        else:
            task_id, subject, session_id, submodule, citation_id = f
            board_ordinal = int(task_id)
        c.execute("INSERT INTO tasks (task_id, subject, session_id, submodule,"
                  " citation_id, board_ordinal) VALUES (?,?,?,?,?,?)",
                  (task_id, subject, session_id, submodule, citation_id, board_ordinal))
    c.commit(); c.close()
    return d, db

def _board_con(tarjetas):
    d = pathlib.Path(tempfile.mkdtemp())
    for ordinal, data in tarjetas.items():
        (d / f"{ordinal}.json").write_text(json.dumps(data))
    return d

VIEJO = "Cron A — portar el ejecutor de IrCron"
NUEVO = "Reparar el REcompile() panic del gate de sucesor"

# 10a — el control positivo del episodio: la tarjeta del ordinal "5" se
#     RENOMBRA en el board. Deduplicar por sujeto (la forma anterior) leia
#     esto como un sujeto nuevo y acuñaba una SEGUNDA cita; por ordinal, es
#     la MISMA tarjeta.
_, DB = _store_con([("5", VIEJO, S, "gen", "TASK-GEN-0045")])
BOARD = _board_con({"5": {"subject": NUEVO, "submodule": "docs"}})
acunadas = kx.ingest_board(DB, BOARD, S, ["5"])

check(len(acunadas) == 1, "10a: la tarjeta renombrada se procesa una vez")
check(acunadas[0][1] == "5",
      "10b: NO aterriza en un ordinal nuevo — es la MISMA fila que ya existia")

con = sqlite3.connect(DB)
filas = con.execute("SELECT task_id, subject, citation_id FROM tasks "
                    "WHERE session_id = ?", (S,)).fetchall()
con.close()
check(len(filas) == 1,
      "10c: sigue habiendo UNA sola fila — el defecto de H-THYROX-252 no reaparece")
check(filas[0][1] == NUEVO,
      "10d: el sujeto de la fila es el NUEVO — se actualizo en su sitio")
check(filas[0][2] == "TASK-GEN-0045",
      "10e: la cita NO se movio — sigue siendo la que ya tenia esa tarjeta")

# 10f — idempotencia: repetir el ingest sin cambios no vuelve a listar la
#     tarjeta — nada que tocar.
check(kx.ingest_board(DB, BOARD, S, ["5"]) == [],
      "10f: repetir el ingest sin cambios no toca nada")

# 10g — un ordinal que AUN no tiene fila SI crea una nueva.
BOARD2 = _board_con({"5": {"subject": NUEVO, "submodule": "docs"},
                     "9": {"subject": "Una tarjeta genuinamente nueva",
                           "submodule": "api"}})
acunadas2 = kx.ingest_board(DB, BOARD2, S, ["9"])
check(len(acunadas2) == 1, "10g: un ordinal sin fila previa SI se acuña")
check(acunadas2[0][1] != "5",
      "10h: y aterriza en un task_id propio, no en el de la tarjeta renombrada")

# 10i — una fila que YA tiene ordinal pero SIN cita (como la deja
#     `snapshot-tareas`) recibe su cita sin duplicarse.
_, DB3 = _store_con([("1", NUEVO, S, "gen", None, 5)])
acunadas3 = kx.ingest_board(DB3, BOARD, S, ["5"], layer="thyrox")
con = sqlite3.connect(DB3)
rows3 = con.execute("SELECT task_id, citation_id FROM tasks "
                     "WHERE session_id = ?", (S,)).fetchall()
con.close()
check(len(rows3) == 1 and rows3[0][1] is not None
      and rows3[0][1].startswith("TASK-THYROX-"),
      "10i: la fila sin cita recibe la suya, sin duplicarse")
check(len(acunadas3) == 1 and acunadas3[0][1] == "1",
      "10j: el informe la cuenta en su task_id existente, no en uno nuevo")

# 10k — guard: una SESION no reconciliada (alguna fila con board_ordinal
#     NULO) REHUSA por completo — nada se escribe.
_, DB4 = _store_con([("1", "A", S, "gen", "TASK-GEN-0900", None)])
antes = sqlite3.connect(DB4).execute(
    "SELECT subject, citation_id FROM tasks").fetchall()
try:
    kx.ingest_board(DB4, BOARD2, S, ["9"])
    check(False, "10k: una sesion no reconciliada debe REHUSAR")
except kx.MappingError as exc:
    check("1" in str(exc), "10k: y nombra CUANTAS filas sin ordinal tiene")
after = sqlite3.connect(DB4).execute(
    "SELECT subject, citation_id FROM tasks").fetchall()
check(antes == after, "10l: y no escribe nada — ni siquiera la tarjeta nueva")

# 10m — guard: una tarjeta que falta REHUSA, y no escribe la mitad del lote.
try:
    kx.ingest_board(DB, BOARD, S, ["5", "99"])
    check(False, "10m: una tarjeta ausente debe REHUSAR")
except kx.MappingError:
    check(True, "10m: una tarjeta ausente REHUSA en vez de acuñar a medias")


# 11 — `cita` publica el SUJETO, no solo el id (#182).
#     Imprimia solo el identificador, y un llamador que pasa un ordinal del
#     board recibia una respuesta bien formada sobre OTRA tarea sin señal
#     alguna. Medido sobre cuatro ordinales de un pase: 2 de 4 coincidian.
#     Acertar la mitad entrena a confiar en el comando.
_, DB3 = _store_con([("7", "El sujeto que tiene que aparecer", S, "docs", "TASK-DOCS-0007")])
_salida = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB3), "lookup", S, "7"],
    capture_output=True, text=True)
check(_salida.returncode == 0, "11a: `cita` resuelve un par que existe")
check("TASK-DOCS-0007" in _salida.stdout, "11b: y publica el identificador")
# 11c es el control que discrimina: sin el sujeto en la salida, 11a y 11b
# pasarian identicos con la version que solo imprimia el id.
check("El sujeto que tiene que aparecer" in _salida.stdout,
      "11c: y el SUJETO, que es lo que permite comparar contra lo que se pedia")
check(len(_salida.stdout.strip().splitlines()) == 1,
      "11d: en UNA sola linea — un consumidor que hace $(...) sigue leyendo un renglon")

# 11e — sin sujeto se DICE, no se calla: una linea con solo el id volveria
#     indistinguible «la tarea no tiene titulo» de «el comando no lo publica».
_, DB4 = _store_con([("8", "", S, "docs", "TASK-DOCS-0008")])
_vacio = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB4), "lookup", S, "8"],
    capture_output=True, text=True)
check("sin sujeto" in _vacio.stdout, "11e: un sujeto vacio se declara, no se omite")


# 12 — `cita` REHUSA cuando el numero es ambiguo (H-DOCS-1240).
#
#     El bloque 11 publica el sujeto para que quien pregunta pueda comparar.
#     Eso es DETECCION, y exige que el lector compare — no lo previene. El
#     defecto reincidio con la mitigacion ya puesta, porque hay DOS espacios
#     de numeracion con la misma forma `NNN`: el ordinal del board y el
#     `task_id` del store. Medido sobre el par real que lo destapo:
#
#         task_id 1146   -> TASK-THYROX-0006  Portar appRuntime y los 32 ...
#         ordinal   276  -> TASK-API-0150     Gate: filas del list-table ...
#         board 276.json -> subject: "Portar appRuntime y los 32 ..."
#
#     Las dos consultas responden; una responde sobre otra tarea. El control
#     positivo de abajo reproduce esa forma exacta.
_, DB5 = _store_con([("276", "Gate: filas del list-table vs entradas del toctree",
                      S, "api", "TASK-API-0150")])
BOARD5 = _board_con({"276": {"id": "276", "status": "in_progress",
                             "subject": "Portar appRuntime y los 32 de swarm "
                                        "que no usan interfaz"}})
_amb = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB5), "lookup",
     "--board", str(BOARD5), S, "276"],
    capture_output=True, text=True)
check(_amb.returncode != 0,
      "12a: con el numero ambiguo `cita` REHUSA en vez de responder")
check("Gate: filas del list-table" in _amb.stderr,
      "12b: y nombra el sujeto que el STORE tiene en ese task_id")
check("Portar appRuntime" in _amb.stderr,
      "12c: y el sujeto que el BOARD tiene en ese ordinal — los dos, para comparar")
check("TASK-API-0150" not in _amb.stdout,
      "12d: la cita equivocada NO sale por stdout, que es lo que un $() captura")

# 12e — el control que DISCRIMINA: si la tarjeta del board nombra el MISMO
#     sujeto no hay ambiguedad, y rehusar ahi haria inutil el comando. Con la
#     guarda anulada 12a-12d pasan igual; con esta, no.
BOARD6 = _board_con({"276": {"id": "276", "status": "pending",
                             "subject": "Gate: filas del list-table vs "
                                        "entradas del toctree"}})
_ok = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB5), "lookup",
     "--board", str(BOARD6), S, "276"],
    capture_output=True, text=True)
check(_ok.returncode == 0 and "TASK-API-0150" in _ok.stdout,
      "12e: cuando los dos sujetos coinciden responde — la guarda discrimina")

# 12f — board inalcanzable: se AVISA y se responde. Callar volveria
#     indistinguible «no hay ambiguedad» de «no pude mirar», que es el
#     sub-patron D aplicado a la propia guarda.
_sin = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB5), "lookup",
     "--board", str(BOARD5 / "no-existe"), S, "276"],
    capture_output=True, text=True)
check(_sin.returncode == 0 and "TASK-API-0150" in _sin.stdout,
      "12f: sin board el comando responde igual — la guarda no bloquea por no ver")
check("no alcanzable" in _sin.stderr,
      "12g: y lo DICE, para que quien lee sepa que la ambiguedad no se descarto")

# 12h — el otro camino de la reincidencia (H-DOCS-1236): no hay fila, hay
#     tarjeta. La respuesta «sin id de cita» es correcta y no dice que hacer,
#     asi que la mano fabrica la cita prefijando el ordinal. Nombrar el sujeto
#     de la tarjeta y el comando que la acuña cierra ese hueco.
_, DB7 = _store_con([])
_falta = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB7), "lookup",
     "--board", str(BOARD5), S, "276"],
    capture_output=True, text=True)
check(_falta.returncode != 0, "12h: sin fila en el store `cita` sigue rehusando")
check("Portar appRuntime" in _falta.stderr and "ingest-board" in _falta.stderr,
      "12i: y nombra el sujeto de la tarjeta y el comando que lo acuña")


# ── El store es PARAMETRO del consumidor, no constante de thyrox ──────────
#
# `DEFAULT_STORE_PATH` se derivaba con `parents[2] / "agent-results"`, que
# desde `thyrox/src/task/` resuelve `/home/user/thyrox/agent-results/…` — un
# directorio que no existe. Efecto medido: `task_ids.py censo` rehusaba con
# MappingError, y por eso las tareas se seguian citando por el ordinal del
# board en vez de por su cita durable. La aritmetica de ruta prohibida, en su
# forma mas cara: no rompe, deja el mecanismo inalcanzable.
#
# El mecanismo correcto ya existe y tiene dos consumidores
# (`agents/model_catalog.py`, `task/task_source.py`): la variable
# `THYROX_AGENT_STORE`, con `None` cuando no esta declarada — nunca una ruta
# supuesta.
print("El store del mapa se declara, no se deriva por aritmetica")

# Las tres se miden por CONDUCTA, no por literal. Un `"parents[2]" not in
# fuente` habria pasado a rojo por el comentario que explica la correccion —
# mediria el significante y concluiria sobre el significado (sub-patron C de
# `metrica-decide-la-conclusion.md`), justo el defecto que este bloque cierra.
_VACIO = pathlib.Path(tempfile.mkdtemp()) / "sin-declaracion.env"
_VACIO.write_text("# vacio a proposito: el ascenso no debe encontrar la clave\n")


def _default_store_con(entorno):
    """`DEFAULT_STORE_PATH` en un proceso con ese entorno. `''` = None."""
    env = dict(os.environ)
    env.pop("THYROX_AGENT_STORE", None)
    env.pop("KAUPAMEX_AGENT_STORE", None)
    env["THYROX_ENV_FILE"] = str(_VACIO)
    env.update(entorno)
    salida = subprocess.run(
        [sys.executable, "-c",
         "import importlib.util,sys;"
         f"spec=importlib.util.spec_from_file_location('kx', {str(SUT)!r});"
         "m=importlib.util.module_from_spec(spec);sys.modules['kx']=m;"
         "spec.loader.exec_module(m);"
         "print('' if m.DEFAULT_STORE_PATH is None else m.DEFAULT_STORE_PATH)"],
        capture_output=True, text=True, env=env)
    return salida.stdout.strip()


#: El localizador declarado, no `parents[2]` sobre `kx.__file__` (tarea #228):
#: la aritmética coincidía con `thyrox_root()` desde `src/task/`, pero eso no
#: la volvía correcta — la sección de abajo ya lo discrimina.
_THYROX = str(reach.thyrox_root())
_DEFAULT = _THYROX + "/agent-results/agent_store.sqlite3"

check(_default_store_con({"THYROX_AGENT_STORE": "/x/y.sqlite3"}) == "/x/y.sqlite3",
      "store: la constante declarada gana")
check(_default_store_con({}) == _DEFAULT,
      "store: sin constante, el default es el de thyrox")

# El control que DISCRIMINA. El default coincide, por casualidad, con lo que
# `parents[2]` daba desde `src/task/`: la ruta sola NO separa el mecanismo
# declarado de la aritmetica. Lo que si los separa son dos conductas que la
# aritmetica no tiene — obedecer la constante (arriba) y **crear** el
# directorio (aqui). Con la aritmetica de vuelta las dos caen.
_dir = pathlib.Path(_THYROX) / "agent-results"
if _dir.is_dir() and not any(_dir.iterdir()):
    _dir.rmdir()          # solo si esta vacio: no se borra un store real
check(_default_store_con({}) == _DEFAULT and _dir.is_dir(),
      "store: sin constante, el directorio se crea (idempotente)")

# ---------------------------------------------------------------------------
# 9. Corregir la CAPA sin tocar el id — la Propiedad 3 aplicada a un error de
#    atribucion, no a una derivacion tardia.
#
# El eje declarado es EL REPO, no la capa del producto (`task_ids.py:124-138`),
# y `GEN` nombra el trabajo que CRUZA repos. Cuando una tarea se acuña con la
# capa equivocada —porque el sujeto MENCIONA un repo en el que el trabajo nunca
# aterrizo— lo que se corrige es la COLUMNA, nunca el id: renumerar rompe toda
# cita ya escrita, y el bloque 3 ya exige esa invariante para la derivacion.
#
# EL QUE DISCRIMINA es la tercera asercion: que el `citation_id` NO se mueva.
# Sin ella, una implementacion que renumerara pasaria los otros dos.
_, DB9 = _store_con([("7", "Sujeto mal atribuido", S, "api", "TASK-API-0395")])

_before = sqlite3.connect(DB9).execute(
    "SELECT submodule, submodule_source, citation_id FROM tasks "
    " WHERE citation_id = 'TASK-API-0395'").fetchone()
kx.correct_layer(DB9, "TASK-API-0395", "gen", "los commits cruzan repos")
# La relectura va por `task_id`, NO por la cita: leer por la cita haria que una
# version que renumerara devolviera `None` y el control muriera con TypeError en
# la PRIMERA asercion, en vez de fallar limpiamente en la tercera — que es la
# que mide el renumerado. Un control que revienta no dice cual mecanismo falto.
_dsp = sqlite3.connect(DB9).execute(
    "SELECT submodule, submodule_source, citation_id FROM tasks "
    " WHERE task_id = '7'").fetchone()

check(_before[0] == "api" and _dsp[0] == "gen", "capa: la columna se corrige")
check("los commits cruzan repos" in (_dsp[1] or ""),
      "capa: la procedencia guarda la RAZON, no solo el valor nuevo")
check(_dsp[2] == "TASK-API-0395",
      "capa: el citation_id NO se mueve — es identidad, no clasificacion")

# Rehusa en vez de escribir a ciegas: una cita ausente y una capa inventada
# son dos formas de corromper el registro en silencio.
try:
    kx.correct_layer(DB9, "TASK-API-9999", "gen", "x")
    check(False, "capa: cita ausente REHUSA")
except kx.MappingError:
    check(True, "capa: cita ausente REHUSA")
try:
    kx.correct_layer(DB9, "TASK-API-0395", "inventada", "x")
    check(False, "capa: capa fuera del canon REHUSA")
except kx.MappingError:
    check(True, "capa: capa fuera del canon REHUSA")


# ---------------------------------------------------------------------------
# 13. La cita de la CAPA corregida — `layer_citation_id`, una columna aparte.
#
# El bloque 9 fija que `fix-layer` NO mueve el `citation_id`: es identidad.
# Eso deja una tarea de thyrox citada para siempre como `TASK-GEN-NNNN`, que
# es la forma en que nacian todas las tarjetas del board sin capa declarada.
# La segunda columna da la cita en su capa sin tocar la primera: las dos
# resuelven a la misma fila, y las dos salen de UNA sola secuencia por capa.
#
# EL QUE DISCRIMINA es 13c: sin contar la columna nueva al numerar, el
# siguiente `ingest-board` de thyrox repetiria el numero ya repartido, y una
# cita nombraria dos tareas.
def _store_with_layer_citation(filas):
    """Como `_store_con`, con la columna `layer_citation_id` presente."""
    d, db = _store_con(filas)
    c = sqlite3.connect(db)
    c.execute("ALTER TABLE tasks ADD COLUMN layer_citation_id TEXT")
    c.commit(); c.close()
    return d, db


def _layer_citation_of(db, task_id):
    return sqlite3.connect(db).execute(
        "SELECT citation_id, layer_citation_id FROM tasks WHERE task_id = ?",
        (task_id,)).fetchone()


_, DB13 = _store_with_layer_citation([
    ("10", "Tarea de thyrox acuñada sin capa", S, "gen", "TASK-GEN-0010"),
    ("5", "Otra tarea de thyrox", S, "thyrox", "TASK-THYROX-0005"),
])
_minted = kx.correct_layer(DB13, "TASK-GEN-0010", "thyrox", "el trabajo vive en thyrox")
_row = _layer_citation_of(DB13, "10")
check(_row == ("TASK-GEN-0010", "TASK-THYROX-0006"),
      "13a: corregir a una capa distinta del prefijo acuña la cita de esa capa")
check(_minted[2] == "TASK-THYROX-0006",
      "13a: y la devuelve a quien la pidio")

kx.correct_layer(DB13, "TASK-GEN-0010", "thyrox", "otra vez")
check(_layer_citation_of(DB13, "10")[1] == "TASK-THYROX-0006",
      "13b: repetir la correccion no acuña otra cita (idempotente)")

_board13 = _board_con({"11": {"subject": "Tarjeta nueva de thyrox",
                              "description": "", "status": "pending"}})
kx.ingest_board(DB13, _board13, S, ["11"], layer="thyrox")
check(_layer_citation_of(DB13, "11")[1] is None and sqlite3.connect(DB13).execute(
          "SELECT citation_id FROM tasks WHERE board_ordinal = 11").fetchone()[0]
      == "TASK-THYROX-0007",
      "13c: ingest-board cuenta la columna nueva y NO repite el 0006")

_map13 = kx.mapping_from_store(DB13)
check(_map13.resolve("TASK-THYROX-0006") == "TASK-GEN-0010",
      "13d: la cita de capa resuelve a la misma fila que su citation_id")
check(_map13.resolve("TASK-GEN-0010") == "TASK-GEN-0010",
      "13d: y el citation_id sigue resolviendo")
check(_map13.next_ordinal("thyrox") == 8,
      "13d: la marca de agua del mapa tambien cuenta la columna nueva")

_, DB13e = _store_with_layer_citation([
    ("20", "Ya nacio en su capa", S, "thyrox", "TASK-THYROX-0020"),
    ("21", "Cruza repos", S, "docs", "TASK-DOCS-0021"),
])
kx.correct_layer(DB13e, "TASK-THYROX-0020", "thyrox", "sin cambio")
kx.correct_layer(DB13e, "TASK-DOCS-0021", "gen", "cruza repos")
check(_layer_citation_of(DB13e, "20")[1] is None,
      "13e: si el prefijo ya es la capa, no se acuña nada")
check(_layer_citation_of(DB13e, "21")[1] is None,
      "13e: `gen` no es una capa: corregir a gen no acuña cita")

try:
    kx.correct_layer(DB13, "TASK-GEN-0010", "docs", "cambio de opinion")
    check(False, "13f: una cita de capa ya publicada no se reemplaza — REHUSA")
except kx.MappingError:
    check(_layer_citation_of(DB13, "10")[1] == "TASK-THYROX-0006",
          "13f: una cita de capa ya publicada no se reemplaza — REHUSA")

_, DB13g = _store_con([("30", "Store sin la columna", S, "gen", "TASK-GEN-0030")])
_without_column = kx.correct_layer(DB13g, "TASK-GEN-0030", "thyrox", "falta la migracion")
check(_without_column == ("gen", "thyrox", None)
      and sqlite3.connect(DB13g).execute(
          "SELECT submodule FROM tasks WHERE task_id = '30'").fetchone()[0] == "thyrox",
      "13g: sin la columna, la capa se corrige igual y no se acuña cita de capa")
_cli13g = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB13g), "fix-layer", "TASK-GEN-0030",
     "--layer", "docs", "--reason", "otra"], capture_output=True, text=True)
check(_cli13g.returncode == 0 and "layer_citation_id" in _cli13g.stderr,
      "13g: y la CLI lo dice, nombrando la columna que falta")

_look13 = subprocess.run(
    [sys.executable, str(SUT), "--store", str(DB13), "lookup", S, "10"],
    capture_output=True, text=True)
check(_look13.stdout.split()[:1] == ["TASK-THYROX-0006"]
      and "TASK-GEN-0010" in _look13.stdout
      and len(_look13.stdout.strip().splitlines()) == 1,
      "13h: lookup publica primero la cita de capa, nombra la original, en una linea")

# 13i — el relleno de lo ya corregido. Las filas cuya capa ya se corrigio antes
#     de que existiera la columna reciben su cita de capa, sin tocar la RAZON
#     que `submodule_source` guarda (por eso no se reusa `correct_layer`).
_, DB13i = _store_with_layer_citation([
    ("40", "Capa docs, prefijo gen", S, "docs", "TASK-GEN-0040"),
    ("41", "Sin capa conocida", S, None, "TASK-GEN-0041"),
    ("42", "Ya en su capa", S, "thyrox", "TASK-THYROX-0003"),
    ("43", "Capa thyrox, prefijo gen", S, "thyrox", "TASK-GEN-0043"),
])
sqlite3.connect(DB13i).execute(
    "UPDATE tasks SET submodule_source = 'corregida antes'").connection.commit()
_dry = kx.assign_layer_citations(DB13i, dry_run=True)
check(_dry == [("TASK-GEN-0040", "TASK-DOCS-0001"), ("TASK-GEN-0043", "TASK-THYROX-0004")]
      and _layer_citation_of(DB13i, "40")[1] is None,
      "13i: dry-run publica lo que acuñaria y no escribe")
_done = kx.assign_layer_citations(DB13i)
check(_done == _dry and _layer_citation_of(DB13i, "43")[1] == "TASK-THYROX-0004",
      "13i: acuña solo donde el prefijo no nombra una capa conocida")
check(_layer_citation_of(DB13i, "41")[1] is None and _layer_citation_of(DB13i, "42")[1] is None,
      "13i: sin capa conocida, o ya en su capa, no acuña nada")
check(sqlite3.connect(DB13i).execute(
          "SELECT COUNT(*) FROM tasks WHERE submodule_source = 'corregida antes'").fetchone()[0] == 4,
      "13i: no toca la razon de la correccion")
check(kx.assign_layer_citations(DB13i) == [],
      "13i: una segunda pasada no acuña nada (idempotente)")

print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    sys.exit(1)
print("OK: todas las aserciones pasan")
