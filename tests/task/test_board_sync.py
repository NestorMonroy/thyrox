#!/usr/bin/env python3
"""Suite de ``task/board_sync.py`` — el board y el store, en los dos sentidos.

Se escribio ANTES que el instrumento. Cierra el par #159 / #184, que es **una
sola pieza**: la cita durable se acuña a posteriori y el renombre del board no
llega al store.

El control positivo NO es un caso fabricado. Reproduce la divergencia medida
sobre la sesion viva `168b0fdf-…` (220 tarjetas: 105 coinciden, 102 con sujeto
distinto, 9 con status distinto, 4 sin fila), y usa como fixture los **dos
ordinales de este trabajo**, que padecen el defecto que piden arreglar:

    board #159  «Acuñar la cita durable al crear la tarea…»
    store #159  TASK-API-0095  completed  «Gate de porte: verificar el SITIO…»

    board #184  «Propagar al store el renombre y el cierre…»
    store #184  TASK-API-0108  pending    «Sembrar las 21 etiquetas de impuesto…»

Que cada bloque mide, y por que existe:

1. **El hogar del board es una CONSTANTE con dos entradas de entorno.** El
   literal `/root/.claude/tasks/<sesion>` vivia en linea dentro de `main()`.
   Se paga con `BOARD_ROOT_VAR` + la declaracion del `.env`
   (`THYROX_ENV_FILE`), el mismo par que `THYROX_ROOT` ya usa.
2. **#159 — se acuña AL CREAR, y solo al crear.** Una tarjeta recien creada
   recibe su cita en el mismo pase. La misma tarjeta llegada como `TaskUpdate`
   **no acuña**: bajo un hook `TaskCreate|TaskUpdate`, acuñar en el update
   convertiria cada renombre en fila nueva con cita nueva — el duplicado que
   `duplicados` existe para detectar.
3. **#159 — el no-acuñado se DECLARA, no se calla.** Un `[]` a secas no
   distingue «el evento no era una creacion» de «no encontre nada que acuñar»
   (sub-patron D). Por eso el resultado lleva `acted` y `reason`.
4. **#184 — el emparejamiento es por CITA, no por ordinal.** El renombre y el
   cierre aterrizan en la fila que la cita nombra, aunque el ordinal del board
   nombre otra. Es literalmente el caso de #159/#184 arriba.
5. **#184 — la identidad no se toca.** `citation_id` y `task_id` quedan
   intactos: sincronizar escribe estado, no identidad.
6. **#184 — el guard REHUSA sin publicar cifra.** Cita ausente, duplicada
   dentro de la sesion, o fuera de forma: no se puede medir a que fila
   pertenece, y un 0 ahi seria un verde falso.
7. **El CLI honra los dos contratos.** Exit 2 y stdout sin cifra en el rehuse;
   exit 0 con el diff antes/despues en el camino feliz.
"""

from __future__ import annotations

import argparse
import contextlib
import importlib.util
import io
import json
import os
import pathlib
import sqlite3
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "src"))
from paths import reach  # noqa: E402

#: El bootstrap de arriba es la ÚNICA aritmética admitida: alimenta el
#: `sys.path.insert` y falla con ruido si algo se mueve. Todo lo demás sale
#: del localizador declarado (tarea #228).
SRC = reach.thyrox_root() / "src" / "task"
MODULE_PATH = SRC / "board_sync.py"
#: El literal del board vivia en `main()` de `task_ids.py`. El caso 1g mide su
#: pago desde el PROGRAMA, que es la unica via por la que `main()` corre.
TASK_IDS_PATH = SRC / "task_ids.py"

sys.path.insert(0, str(SRC))
_spec = importlib.util.spec_from_file_location("board_sync", MODULE_PATH)
bs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bs)

failures: list[str] = []
checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(label)


S = "168b0fdf-bfe4-590b-b6c0-b6be124c124a"

#: Los cuatro sujetos son los REALES de la sesion viva, no inventados.
SUJETO_BOARD_159 = "Acuñar la cita durable al crear la tarea, no a posteriori"
SUJETO_STORE_159 = ("Gate de porte: verificar el SITIO de declaración, "
                    "no sólo el símbolo")
SUJETO_BOARD_184 = ("Propagar al store el renombre y el cierre que TaskUpdate "
                    "hace en el board")
SUJETO_STORE_184 = ("Sembrar las 21 etiquetas de impuesto que el plan fiscal "
                    "mexicano cita")


def store_con(filas):
    """Un store minimo con las columnas que el par toca.

    `filas` = (task_id, subject, session_id, submodule, citation_id, status).
    """
    d = pathlib.Path(tempfile.mkdtemp())
    db = d / "s.sqlite3"
    c = sqlite3.connect(db)
    c.execute("CREATE TABLE tasks (task_id TEXT, subject TEXT, description TEXT,"
              " status TEXT, session_id TEXT, source TEXT, created_at TEXT,"
              " updated_at TEXT, submodule TEXT, submodule_source TEXT,"
              " opened_at TEXT, opened_at_source TEXT, citation_id TEXT)")
    for task_id, subject, session, capa, cita, status in filas:
        c.execute("INSERT INTO tasks (task_id, subject, session_id, submodule,"
                  " citation_id, status, updated_at) VALUES (?,?,?,?,?,?,?)",
                  (task_id, subject, session, capa, cita, status,
                   "2026-01-01T00:00:00"))
    c.commit(); c.close()
    return d, db


def board_con(tarjetas):
    d = pathlib.Path(tempfile.mkdtemp())
    for ordinal, data in tarjetas.items():
        (d / f"{ordinal}.json").write_text(json.dumps(data))
    return d


def fila(db, session, task_id):
    c = sqlite3.connect(db)
    try:
        r = c.execute("SELECT subject, status, citation_id, task_id, updated_at"
                      "  FROM tasks WHERE session_id=? AND task_id=?",
                      (session, task_id)).fetchone()
    finally:
        c.close()
    return r


def fila_por_cita(db, session, cita):
    c = sqlite3.connect(db)
    try:
        r = c.execute("SELECT subject, status, citation_id, task_id, updated_at"
                      "  FROM tasks WHERE session_id=? AND citation_id=?",
                      (session, cita)).fetchone()
    finally:
        c.close()
    return r


# ---------------------------------------------------------------------------
# 1 — el hogar del board es constante, con sus dos entradas de entorno
# ---------------------------------------------------------------------------
check(hasattr(bs, "BOARD_ROOT_VAR"),
      "1a: existe la constante que nombra la variable del valor")
check(bs.BOARD_ROOT_VAR == "THYROX_BOARD_ROOT",
      "1b: la variable del VALOR se llama THYROX_BOARD_ROOT")

_env_previo = {k: os.environ.get(k) for k in (bs.BOARD_ROOT_VAR, "THYROX_ENV_FILE")}
try:
    _raiz = pathlib.Path(tempfile.mkdtemp())
    os.environ[bs.BOARD_ROOT_VAR] = str(_raiz)
    os.environ.pop("THYROX_ENV_FILE", None)
    check(bs.board_dir(S) == _raiz / S,
          "1c: el valor del proceso gobierna, y el board vive bajo <raiz>/<sesion>")

    # La RUTA a la declaracion: sin variable de proceso, manda el `.env`.
    os.environ.pop(bs.BOARD_ROOT_VAR, None)
    _otra = pathlib.Path(tempfile.mkdtemp())
    _envf = pathlib.Path(tempfile.mkdtemp()) / ".env"
    _envf.write_text(f"{bs.BOARD_ROOT_VAR}={_otra}\n")
    os.environ["THYROX_ENV_FILE"] = str(_envf)
    check(bs.board_dir(S) == _otra / S,
          "1d: sin variable de proceso, la declaracion del .env gobierna")

    # 1e es el control que discrimina: sin la constante, un literal inline
    # daria la MISMA respuesta en 1c y 1d que en el default, y los dos casos
    # pasarian con el codigo viejo.
    os.environ.pop("THYROX_ENV_FILE", None)
    check(str(bs.board_dir(S)).endswith(f"/{S}") and
          str(bs.board_dir(S)) != f"{_raiz}/{S}",
          "1e: sin ninguna de las dos entradas cae al default medido, no al de la prueba")
finally:
    for k, v in _env_previo.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v

check(TASK_IDS_PATH.read_text().count("/root/.claude/tasks") == 1,
      "1f: el literal del board aparece UNA sola vez en task_ids.py")
_linea = [l for l in TASK_IDS_PATH.read_text().splitlines()
          if "/root/.claude/tasks" in l]
check(_linea and _linea[0].startswith("BOARD_ROOT_DEFAULT"),
      "1f-bis: y esa unica vez es la CONSTANTE, no una ruta en linea")

# 1g es el control que discrimina el pago del literal. Los casos 1c/1d miden
# `board_dir()`, que es funcion nueva: pasarian igual con `main()` cableada.
# Este invoca `task_ids.py` como PROGRAMA y **sin** `--board`, que es la unica
# via por la que el default de `main()` decide. Bajo la version con la
# f-string, el board resolveria a `/root/.claude/tasks/<sesion-falsa>`, que no
# existe, y `ingest_board` levantaria `MappingError`.
SESION_FALSA = "sesion-que-no-existe-en-el-cliente"
_raiz_g = pathlib.Path(tempfile.mkdtemp())
(_raiz_g / SESION_FALSA).mkdir()
(_raiz_g / SESION_FALSA / "3.json").write_text(json.dumps(
    {"id": 3, "subject": "El sujeto que el default de main() tiene que hallar",
     "status": "pending", "description": ""}))
_, DBG = store_con([("1", "Una fila cualquiera", SESION_FALSA, "docs",
                     "TASK-DOCS-0001", "pending")])
_entorno = dict(os.environ)
_entorno[bs.BOARD_ROOT_VAR] = str(_raiz_g)
_entorno.pop("THYROX_ENV_FILE", None)
_sin_board = subprocess.run(
    [sys.executable, str(TASK_IDS_PATH), "--store", str(DBG),
     "ingerir-board", SESION_FALSA, "3", "--capa", "docs"],
    capture_output=True, text=True, env=_entorno)
check(_sin_board.returncode == 0,
      "1g: `ingerir-board` SIN --board resuelve el board por la constante")
check("TASK-DOCS-" in _sin_board.stdout,
      "1h: y acuña la cita de la tarjeta que ahi encontro")

# ---------------------------------------------------------------------------
# 2 y 3 — #159: se acuña al CREAR, y el no-acuñado se declara
# ---------------------------------------------------------------------------
_, DB = store_con([("1", "Una fila vieja que no se toca", S, "docs",
                    "TASK-DOCS-0001", "completed")])
BOARD = board_con({"159": {"id": 159, "subject": SUJETO_BOARD_159,
                           "status": "pending", "description": ""}})

creado = bs.mint_created_card(DB, S, "159", board_dir=BOARD, layer="docs",
                              tool_name="TaskCreate")
check(creado.acted is True, "2a: un TaskCreate SI acuña")
check(len(creado.minted) == 1, "2b: y acuña exactamente la tarjeta pedida")
check(creado.minted[0][2].startswith("TASK-DOCS-"),
      "2c: la cita nace en la capa declarada")
_nueva = fila_por_cita(DB, S, creado.minted[0][2])
check(_nueva is not None and _nueva[0] == SUJETO_BOARD_159,
      "2d: la fila nueva lleva el sujeto de la tarjeta")
check(fila(DB, S, "1")[0] == "Una fila vieja que no se toca",
      "2e: aditivo — ninguna fila existente se toca")

# 2f es el control de anulacion de #159: si se retira el acotamiento a
# TaskCreate, esta asercion —y solo esta— cae.
_, DB2 = store_con([("1", "Otra fila vieja", S, "docs", "TASK-DOCS-0001", "pending")])
actualizado = bs.mint_created_card(DB2, S, "159", board_dir=BOARD, layer="docs",
                                   tool_name="TaskUpdate")
check(actualizado.acted is False,
      "2f: un TaskUpdate NO acuña — acuñar ahi duplicaria el sujeto en cada renombre")
check(actualizado.minted == [], "2g: y no inserta ninguna fila")
_c = sqlite3.connect(DB2)
_total = _c.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
_c.close()
check(_total == 1, "2h: el store queda con las filas con que empezo")

check(isinstance(actualizado.reason, str) and actualizado.reason.strip() != "",
      "3a: el no-acuñado declara SU RAZON — un [] mudo no discrimina")
check("TaskUpdate" in actualizado.reason,
      "3b: y la razon nombra el evento que lo produjo")

# ---------------------------------------------------------------------------
# 4, 5 y 6 — #184: sincronizar por cita
# ---------------------------------------------------------------------------
# El fixture ES la divergencia medida: el ordinal 184 del store nombra otro
# sujeto, con otra cita, que la tarjeta 184 del board.
_, DB3 = store_con([
    ("184", SUJETO_STORE_184, S, "api", "TASK-API-0108", "pending"),
    ("991", SUJETO_BOARD_184, S, "docs", "TASK-DOCS-0184", "pending"),
])
BOARD2 = board_con({"184": {"id": 184,
                            "subject": SUJETO_BOARD_184 + " (renombrada)",
                            "status": "completed", "description": ""}})

res = bs.sync_card(DB3, S, "184", "TASK-DOCS-0184", board_dir=BOARD2)
_destino = fila_por_cita(DB3, S, "TASK-DOCS-0184")
check(_destino[0] == SUJETO_BOARD_184 + " (renombrada)",
      "4a: el renombre aterriza en la fila que la CITA nombra")
check(_destino[1] == "completed", "4b: y el cierre tambien")
_ajeno = fila_por_cita(DB3, S, "TASK-API-0108")
check(_ajeno[0] == SUJETO_STORE_184,
      "4c: la fila que el ORDINAL nombra queda intacta — es otro sujeto")
check(_ajeno[1] == "pending", "4d: su status tampoco se mueve")
check(res["before"]["subject"] == SUJETO_BOARD_184 and
      res["after"]["subject"] == SUJETO_BOARD_184 + " (renombrada)",
      "4e: el resultado publica el diff antes/despues, no solo un OK")
check("status" in res["changed"] and "subject" in res["changed"],
      "4f: y nombra que campos cambiaron")

check(_destino[2] == "TASK-DOCS-0184", "5a: la cita NO se toca")
check(_destino[3] == "991", "5b: el task_id del store tampoco — es identidad")
check(_destino[4] != "2026-01-01T00:00:00",
      "5c: updated_at si avanza — la fila se tocó y tiene que decirlo")

# ---------------------------------------------------------------------------
# 5bis — #184: la DESCRIPCION tambien viaja
# ---------------------------------------------------------------------------
# El control positivo es el episodio medido de esta sesion: el board #364 se
# corrigio con `TaskUpdate` —su premisa original mezclaba dos poblaciones— y
# `sync_card` llevo al store el sujeto nuevo dejando la descripcion FALSA
# intacta. Medido tras sincronizar: subject «Escribir submodule en el camino de
# insercion compartido del store», description todavia «636 filas tienen
# citation_id con una capa distinta…». La fila quedaba diciendo dos cosas que
# se contradicen, y la falsa es la que lleva el detalle. Ver :ref:`h-docs-1260`.
_, DB3B = store_con([
    ("991", SUJETO_BOARD_184, S, "docs", "TASK-DOCS-0364", "pending"),
])
sqlite3.connect(DB3B).execute(
    "UPDATE tasks SET description = ? WHERE citation_id = ?",
    ("premisa vieja: 636 filas", "TASK-DOCS-0364")).connection.commit()
BOARD2B = board_con({"364": {"id": 364, "subject": SUJETO_BOARD_184,
                             "status": "pending",
                             "description": "premisa corregida: 404 filas"}})


def descripcion(db, session, cita):
    c = sqlite3.connect(db)
    try:
        r = c.execute("SELECT description FROM tasks"
                      "  WHERE session_id=? AND citation_id=?",
                      (session, cita)).fetchone()
    finally:
        c.close()
    return r[0]


_res_desc = bs.sync_card(DB3B, S, "364", "TASK-DOCS-0364", board_dir=BOARD2B)
check(descripcion(DB3B, S, "TASK-DOCS-0364") == "premisa corregida: 404 filas",
      "5d: la descripcion corregida en la tarjeta aterriza en la fila")
check("description" in _res_desc["changed"],
      "5e: y el diff la nombra — un OK a secas no dejaria auditar la premisa")
check(_res_desc["before"].get("description") == "premisa vieja: 636 filas",
      "5f: el antes publica la premisa que se esta corrigiendo")

# Control: sin cambio real, la descripcion NO entra en `changed`. Sin el, un
# `changed` que siempre la nombre pasaria el caso 5e sin propagar nada.
_res_igual = bs.sync_card(DB3B, S, "364", "TASK-DOCS-0364", board_dir=BOARD2B)
check("description" not in _res_igual["changed"],
      "5g: control — re-sincronizar la misma tarjeta no la declara cambiada")

# La tarjeta vacia SI vacia la fila: el board es la fuente, y un caso especial
# para un solo campo seria la asimetria que luego se lee como defecto. Medido
# sobre el board vivo: 363 de 363 tarjetas traen texto, asi que la poblacion de
# este caso es 0 — se declara, no se supone.
BOARD2C = board_con({"364": {"id": 364, "subject": SUJETO_BOARD_184,
                             "status": "pending", "description": ""}})
bs.sync_card(DB3B, S, "364", "TASK-DOCS-0364", board_dir=BOARD2C)
check(descripcion(DB3B, S, "TASK-DOCS-0364") == "",
      "5h: una tarjeta con descripcion vacia vacia la fila — misma semantica "
      "que subject y status, declarada")

# 6 — el guard. Cada caso es «no se puede medir a que fila pertenece».
def rehusa(label, *args, **kwargs):
    try:
        bs.sync_card(*args, **kwargs)
    except bs.BoardSyncError:
        check(True, label)
    else:
        check(False, label)

rehusa("6a: una cita que no existe en la sesion REHUSA",
       DB3, S, "184", "TASK-DOCS-9999", board_dir=BOARD2)
rehusa("6b: una cita fuera de la forma canonica REHUSA",
       DB3, S, "184", "kx-docs-1", board_dir=BOARD2)
rehusa("6c: una tarjeta que no existe REHUSA",
       DB3, S, "77777", "TASK-DOCS-0184", board_dir=BOARD2)

_, DB4 = store_con([
    ("10", "Sujeto A", S, "docs", "TASK-DOCS-0500", "pending"),
    ("11", "Sujeto B", S, "docs", "TASK-DOCS-0500", "pending"),
])
rehusa("6d: una cita DUPLICADA dentro de la sesion REHUSA — no se sabe cual es",
       DB4, S, "184", "TASK-DOCS-0500", board_dir=BOARD2)

# 6e — el control que discrimina el guard de duplicado: con la cita unica, el
# mismo camino pasa. Sin el, 6d podria pasar por cualquier otro motivo.
_, DB5 = store_con([("12", "Sujeto C", S, "docs", "TASK-DOCS-0501", "pending")])
bs.sync_card(DB5, S, "184", "TASK-DOCS-0501", board_dir=BOARD2)
check(fila_por_cita(DB5, S, "TASK-DOCS-0501")[1] == "completed",
      "6e: con la cita unica el mismo camino SI sincroniza")

# ---------------------------------------------------------------------------
# 7 — el CLI honra los dos contratos
# ---------------------------------------------------------------------------
_, DB6 = store_con([("12", "Sujeto D", S, "docs", "TASK-DOCS-0502", "pending")])
_ok = subprocess.run(
    [sys.executable, str(MODULE_PATH), "--store", str(DB6), "sincronizar-board",
     S, "184", "--cita", "TASK-DOCS-0502", "--board", str(BOARD2)],
    capture_output=True, text=True)
check(_ok.returncode == 0, "7a: el camino feliz sale 0")
check("TASK-DOCS-0502" in _ok.stdout, "7b: y publica la cita sincronizada")
check("Sujeto D" in _ok.stdout and "renombrada" in _ok.stdout,
      "7c: con el antes y el despues, que es lo que permite auditar el cambio")

_mal = subprocess.run(
    [sys.executable, str(MODULE_PATH), "--store", str(DB6), "sincronizar-board",
     S, "184", "--cita", "TASK-DOCS-9999", "--board", str(BOARD2)],
    capture_output=True, text=True)
check(_mal.returncode == 2, "7d: el rehuse sale 2, no 1 ni 0")
check(not any(ch.isdigit() for ch in _mal.stdout),
      "7e: y NO publica cifra en stdout — un 0 ahi seria un verde falso")
check("TASK-DOCS-9999" in _mal.stderr,
      "7f: el motivo va a stderr y nombra la cita que no se pudo resolver")

_crear = subprocess.run(
    [sys.executable, str(MODULE_PATH), "--store", str(DB6), "acunar-tarjeta",
     S, "159", "--board", str(BOARD), "--capa", "docs",
     "--evento", "TaskUpdate"],
    capture_output=True, text=True)
check(_crear.returncode == 0, "7g: `acunar-tarjeta` con TaskUpdate no es un error")
check("TaskUpdate" in _crear.stdout,
      "7h: y dice por que no acuñó, en vez de imprimir un 0 mudo")

# ---------------------------------------------------------------------------
# 8. `reconciliar-estados` — la mitad EN BLOQUE de #184.
#
# `sync_card` cierra una tarjeta cuando quien llama declara su cita. El board
# entero no puede declarar 358 citas, asi que la llave tiene que salir de los
# datos: el SUJETO, que es lo unico estable entre tarjeta y fila. El ordinal
# NO sirve — se reusa, y por eso los fixtures 159/184 de esta suite tienen
# sujeto distinto en board y store.
#
# Medido sobre la sesion viva antes de escribir esto: 358 tarjetas -> 250
# iguales, 65 con estado divergente, 42 sin pareja, 1 ambigua. Los 65 son
# 51 completed->pending, 8 in_progress->pending y 6 completed->in_progress.
# ---------------------------------------------------------------------------
_D8, DB8 = store_con([
    # Pareja por sujeto: el board la cerro y el store sigue pendiente.
    ("900", SUJETO_BOARD_159, S, "docs", "TASK-DOCS-0404", "pending"),
    # Pareja por sujeto, ya al dia: no debe contarse como divergencia.
    ("901", SUJETO_BOARD_184, S, "docs", "TASK-DOCS-0405", "completed"),
    # Sujeto que el board NO tiene: no aparea, y no se toca.
    ("902", SUJETO_STORE_159, S, "docs", "TASK-DOCS-0406", "pending"),
])
BOARD8 = board_con({
    "159": {"subject": SUJETO_BOARD_159, "status": "completed"},
    "184": {"subject": SUJETO_BOARD_184, "status": "completed"},
    "999": {"subject": "Un sujeto que el store no conoce", "status": "pending"},
})

_seco = bs.reconcile_status(DB8, S, board_dir=BOARD8)
check(_seco["total_cards"] == 3, "8a: el universo es el numero de tarjetas")
check(len(_seco["buckets"]["status_drift"]) == 1,
      "8b: solo la tarjeta cerrada en board y pendiente en store diverge")
check(len(_seco["buckets"]["same"]) == 1,
      "8c: la que ya coincide cae en `same`, no en divergencia")
check(len(_seco["buckets"]["absent"]) == 1,
      "8d: la tarjeta sin pareja por sujeto cae en `absent`")
check(sum(len(_seco["buckets"][b]) for b in bs.RECONCILE_BUCKETS) == 3,
      "8e: los cubos cubren el universo — sin fila que se pierda del conteo")
check(_seco["written"] == 0 and _seco["applied"] is False,
      "8f: sin --aplicar NO escribe: cerrar una fila es irreversible")

_antes = sqlite3.connect(DB8).execute(
    "SELECT status FROM tasks WHERE citation_id = 'TASK-DOCS-0404'").fetchone()[0]
check(_antes == "pending", "8g: y el disco lo confirma — la fila sigue pendiente")

_humedo = bs.reconcile_status(DB8, S, board_dir=BOARD8, apply_changes=True)
check(_humedo["written"] == 1, "8h: con --aplicar escribe exactamente la divergente")
_despues = sqlite3.connect(DB8).execute(
    "SELECT status FROM tasks WHERE citation_id = 'TASK-DOCS-0404'").fetchone()[0]
check(_despues == "completed", "8i: la fila quedo con el estado del board")
_intacta = sqlite3.connect(DB8).execute(
    "SELECT status FROM tasks WHERE citation_id = 'TASK-DOCS-0406'").fetchone()[0]
check(_intacta == "pending",
      "8j: la fila SIN pareja no se toco — `absent` no es «ciérrala igual»")

# El sujeto es la LLAVE y no se reescribe: si cambiara, la fila dejaria de
# aparear con la tarjeta que acaba de cerrarla.
_sujeto = sqlite3.connect(DB8).execute(
    "SELECT subject FROM tasks WHERE citation_id = 'TASK-DOCS-0404'").fetchone()[0]
check(_sujeto == SUJETO_BOARD_159, "8k: el sujeto NO se reescribe — es la llave")

# Idempotente: una segunda corrida no encuentra nada que escribir.
_otra = bs.reconcile_status(DB8, S, board_dir=BOARD8, apply_changes=True)
check(_otra["written"] == 0 and len(_otra["buckets"]["status_drift"]) == 0,
      "8l: idempotente — la segunda corrida no tiene divergencia que cerrar")

# CONTROL DE ANULACION. Si la llave fuera el ORDINAL en vez del sujeto, la
# tarjeta #159 (cerrada) apearia con la fila #900 solo por casualidad y la
# #999 no apearia con nada. Se comprueba que ninguna fila del store lleva un
# task_id igual a un ordinal del board: parear por ordinal daria CERO parejas
# sobre este fixture, o sea el veredicto contrario al medido.
_ordinales_board = {"159", "184", "999"}
_ids_store = {r[0] for r in sqlite3.connect(DB8).execute(
    "SELECT task_id FROM tasks WHERE session_id = ?", (S,))}
check(not (_ordinales_board & _ids_store),
      "8m: control — parear por ordinal daria 0 parejas donde por sujeto hay 2")

_vacio = pathlib.Path(tempfile.mkdtemp()) / "no-existe"
try:
    bs.reconcile_status(_vacio, S, board_dir=BOARD8)
    check(False, "8n: un store ausente debe REHUSAR")
except bs.BoardSyncError as err:
    check("NO se reconcilia nada" in str(err),
          "8n: un store ausente REHUSA y dice que no escribio nada")

# ---------------------------------------------------------------------------
# 9. La descripcion tambien converge — la mitad que faltaba de #184.
#
# `sync_card` lleva las tres columnas desde thyrox@a75b3300, pero es POR
# TARJETA y solo cuando quien llama declara la cita. `reconcile_status` es el
# unico que recorre el board entero, y escribia `status` y nada mas: una fila
# cuya descripcion quedo atras no converge nunca.
#
# Medido sobre la sesion viva antes de escribir esto, pareando por sujeto:
# 320 parejas -> 0 con estado divergente y 37 con descripcion divergente. El
# eje del estado ya esta cerrado; el de la descripcion no lo tocaba nadie.
#
# `subject` sigue sin escribirse: es la LLAVE del pareo. `description` no lo
# es, asi que puede converger sin reescribir aquello con lo que se apareo.
# ---------------------------------------------------------------------------
SUJETO_9A = "Un trabajo cuya descripcion quedo atras"
SUJETO_9B = "Un trabajo cuyo estado Y descripcion quedaron atras"
SUJETO_9C = "Un trabajo al dia en las dos columnas"

_D9, DB9 = store_con([
    ("910", SUJETO_9A, S, "docs", "TASK-DOCS-0410", "completed"),
    ("911", SUJETO_9B, S, "docs", "TASK-DOCS-0411", "pending"),
    ("912", SUJETO_9C, S, "docs", "TASK-DOCS-0412", "completed"),
])
_c9 = sqlite3.connect(DB9)
_c9.execute("UPDATE tasks SET description = ? WHERE citation_id = ?",
            ("la premisa vieja, ya corregida en el board", "TASK-DOCS-0410"))
_c9.execute("UPDATE tasks SET description = ? WHERE citation_id = ?",
            ("otra premisa vieja", "TASK-DOCS-0411"))
_c9.execute("UPDATE tasks SET description = ? WHERE citation_id = ?",
            ("al dia", "TASK-DOCS-0412"))
_c9.commit(); _c9.close()

BOARD9 = board_con({
    "910": {"subject": SUJETO_9A, "status": "completed",
            "description": "CORREGIDA: la premisa mezclaba dos poblaciones"},
    "911": {"subject": SUJETO_9B, "status": "completed",
            "description": "CORREGIDA tambien, y ademas cerrada"},
    "912": {"subject": SUJETO_9C, "status": "completed",
            "description": "al dia"},
})

_r9 = bs.reconcile_status(DB9, S, board_dir=BOARD9)
check(len(_r9["buckets"].get("field_drift", [])) == 1,
      "9a: la tarjeta con estado igual y descripcion distinta cae en `field_drift`")
check(len(_r9["buckets"]["status_drift"]) == 1,
      "9b: la que ademas cambio de estado sigue cayendo en `status_drift`")
check(len(_r9["buckets"]["same"]) == 1,
      "9c: `same` significa que NO hay nada que escribir, en ninguna columna")
check(sum(len(_r9["buckets"].get(b, [])) for b in bs.RECONCILE_BUCKETS) == 3,
      "9d: los cinco cubos siguen particionando el universo")

_h9 = bs.reconcile_status(DB9, S, board_dir=BOARD9, apply_changes=True)
check(_h9["written"] == 2, "9e: escribe las dos divergentes, no la que esta al dia")

def _desc(cita):
    c = sqlite3.connect(DB9)
    try:
        return c.execute("SELECT description FROM tasks WHERE citation_id = ?",
                         (cita,)).fetchone()[0]
    finally:
        c.close()

check(_desc("TASK-DOCS-0410").startswith("CORREGIDA:"),
      "9f: la descripcion del board aterrizo en la fila")
check(_desc("TASK-DOCS-0411").startswith("CORREGIDA tambien"),
      "9g: y tambien en la que cambio de estado — las dos columnas, no una")
_e9 = sqlite3.connect(DB9).execute(
    "SELECT status FROM tasks WHERE citation_id = 'TASK-DOCS-0411'").fetchone()[0]
check(_e9 == "completed", "9h: sin perder el estado, que es el eje que ya funcionaba")

# El sujeto es la llave y NO se reescribe, tampoco por esta via.
_s9 = sqlite3.connect(DB9).execute(
    "SELECT subject FROM tasks WHERE citation_id = 'TASK-DOCS-0410'").fetchone()[0]
check(_s9 == SUJETO_9A, "9i: el sujeto sigue intacto — es la llave del pareo")

_o9 = bs.reconcile_status(DB9, S, board_dir=BOARD9, apply_changes=True)
check(_o9["written"] == 0 and len(_o9["buckets"].get("field_drift", [])) == 0,
      "9j: idempotente — la segunda corrida no encuentra descripcion que cerrar")

# ---------------------------------------------------------------------------
# 10. El REPORTE cuenta lo que la escritura tocaria — los dos cubos, no uno.
# El nucleo ya escribia `status_drift` + `field_drift`; el CLI seguia contando
# y listando solo el primero, asi que el modo seco anunciaba «1 fila» ante una
# escritura de 38. Es la misma segunda fuente de verdad que `RECONCILED_FIELDS`
# cerro un nivel mas abajo: la particion se declara una vez (`DRIFT_BUCKETS`)
# y la consumen el lote del UPDATE y el reporte.
# ---------------------------------------------------------------------------
SUJETO_10A = "Un trabajo cuyo estado quedo atras"
SUJETO_10B = "Un trabajo cuya sola descripcion quedo atras"

_D10, DB10 = store_con([
    ("1010", SUJETO_10A, S, "docs", "TASK-DOCS-1010", "pending"),
    ("1011", SUJETO_10B, S, "docs", "TASK-DOCS-1011", "completed"),
])
_c10 = sqlite3.connect(DB10)
_c10.execute("UPDATE tasks SET description = ? WHERE citation_id = ?",
             ("al dia", "TASK-DOCS-1010"))
_c10.execute("UPDATE tasks SET description = ? WHERE citation_id = ?",
             ("la premisa vieja", "TASK-DOCS-1011"))
_c10.commit(); _c10.close()

BOARD10 = board_con({
    "1010": {"subject": SUJETO_10A, "status": "completed",
             "description": "al dia"},
    "1011": {"subject": SUJETO_10B, "status": "completed",
             "description": "CORREGIDA: la premisa medía otra poblacion"},
})

_ns10 = argparse.Namespace(store=DB10, sesion=S, board=BOARD10, aplicar=False)
_buf10 = io.StringIO()
with contextlib.redirect_stdout(_buf10):
    _rc10 = bs._cmd_reconcile_status(_ns10)
_txt10 = _buf10.getvalue()

check(_rc10 == 0, "10a: el modo seco sale 0 — reporta, no juzga")
check("2 fila(s) quedarian al dia" in _txt10,
      "10b: el conteo del modo seco es la poblacion escribible, no solo `status_drift`")
check("TASK-DOCS-1011" in _txt10,
      "10c: la fila que solo difiere en descripcion se LISTA, no se calla")
check("description" in _txt10,
      "10d: cada linea declara que columnas difieren, no solo que hay deriva")

_ns10.aplicar = True
_buf10b = io.StringIO()
with contextlib.redirect_stdout(_buf10b):
    bs._cmd_reconcile_status(_ns10)
check("escritas: 2 fila(s)" in _buf10b.getvalue(),
      "10e: y la escritura toca exactamente las que el modo seco anuncio")

check(tuple(bs.DRIFT_BUCKETS) == ("status_drift", "field_drift"),
      "10f: la particion escribible se declara una vez y la consumen nucleo y reporte")


# ---------------------------------------------------------------------------
# 11. #184 — la mitad de CABLEADO: el mecanismo existe y nadie lo invoca.
#
# Los diez bloques de arriba miden `reconcile_status`, que reconcilia UNA
# sesion cuando alguien la nombra. Medido el 2026-09-12: `reconciliar-estados`
# tiene **cero invocadores** fuera de su propio modulo y de los manifiestos de
# workbench — asi que la propagacion existe como capacidad y no ocurre nunca.
# Es el defecto que `flow-selection-agile.md` llama capacidad muerta, y el que
# `gitlink-bump-gate.md` resume: un mecanismo sin invocador es prosa con exit 0.
#
# El punto de entrada del cableado recorre TODOS los boards de la raiz. No es
# azucar sobre `reconcile_status`: quien lo invoca (un githook) no sabe que
# sesiones hay, asi que la enumeracion tiene que vivir aqui y no en el llamador.
#
# El control positivo es REAL, no fabricado: `fixtures/board_store_drift/`
# guarda la tarjeta #369 y la fila TASK-DOCS-0542 de la sesion viva, capturadas
# ANTES de cualquier `--aplicar`. Difieren en `description` porque el
# `TaskUpdate` nativo del harness escribe la tarjeta y no toca el store.
FIXTURE = HERE / "fixtures" / "board_store_drift"


def store_desde_fila(fila, *, extra=()):
    """Un store cuyas columnas son las de la fila REAL, no las que yo suponga.

    `store_con` declara trece columnas elegidas a mano; la tabla viva tiene
    dieciocho. Construir el fixture desde las claves de la fila es lo que hace
    que el control mida la tabla que existe y no la que recuerdo.
    """
    d = pathlib.Path(tempfile.mkdtemp())
    db = d / "s.sqlite3"
    columnas = list(fila)
    c = sqlite3.connect(db)
    c.execute(f"CREATE TABLE tasks ({', '.join(n + ' TEXT' for n in columnas)})")
    marcas = ", ".join("?" for _ in columnas)
    c.execute(f"INSERT INTO tasks ({', '.join(columnas)}) VALUES ({marcas})",
              tuple(fila[n] for n in columnas))
    for otra in extra:
        c.execute(f"INSERT INTO tasks ({', '.join(columnas)}) VALUES ({marcas})",
                  tuple(otra.get(n) for n in columnas))
    c.commit(); c.close()
    return d, db


_fila369 = json.loads((FIXTURE / "store_row_369.json").read_text(encoding="utf-8"))
_card369 = json.loads((FIXTURE / "card_369.json").read_text(encoding="utf-8"))

check(_fila369["subject"] == _card369["subject"],
      "11a: el fixture aparea — mismo sujeto, que es la llave del reconciliador")
check(_fila369["description"] != _card369["description"],
      "11b: y diverge en `description`, que es la columna que el control mide")

# Dos sesiones, cada una con su board y su deriva. Una sola bastaria para
# probar que escribe; hacen falta DOS para probar que RECORRE — con una, un
# punto de entrada que reconciliara solo la primera pasaria igual.
S_B = "22222222-2222-2222-2222-222222222222"
_fila_b = dict(_fila369, session_id=S_B, citation_id="TASK-DOCS-9999",
               task_id="9999")
_dir11, DB11 = store_desde_fila(_fila369, extra=[_fila_b])

RAIZ11 = pathlib.Path(tempfile.mkdtemp())
for _sesion in (S, S_B):
    _bd = RAIZ11 / _sesion
    _bd.mkdir()
    (_bd / "369.json").write_text(json.dumps(_card369))
# Un board de una sesion que el store no conoce. No es un error: la raiz aloja
# los boards de TODAS las sesiones de la maquina, y la mayoria no son nuestras.
_huerfano = RAIZ11 / "33333333-3333-3333-3333-333333333333"
_huerfano.mkdir()
(_huerfano / "1.json").write_text(json.dumps(
    {"id": "1", "subject": "de otra sesion", "status": "pending",
     "description": "x"}))

_seco = bs.reconcile_all_sessions(DB11, board_root=RAIZ11)
check(_seco["written"] == 0,
      "11c: sin --aplicar no escribe nada, igual que su hermano por sesion")
check(len(_seco["sessions"]) == 2,
      "11d: recorre las sesiones que el store conoce — las DOS, no la primera")
check(_seco["skipped"] and "33333333-3333-3333-3333-333333333333" in _seco["skipped"],
      "11e: la sesion sin filas se DECLARA omitida; un silencio no distingue "
      "«no habia deriva» de «no la mire» (sub-patron D)")
check(fila_por_cita(DB11, S, "TASK-DOCS-0542")[0] is not None
      and descripcion(DB11, S, "TASK-DOCS-0542") == _fila369["description"],
      "11f: y en seco la fila conserva su descripcion vieja")

_aplicado = bs.reconcile_all_sessions(DB11, board_root=RAIZ11, apply_changes=True)
check(_aplicado["written"] == 2,
      "11g: al aplicar escribe UNA por sesion — el agregado es la suma, no la "
      "primera que encuentra")
check(descripcion(DB11, S, "TASK-DOCS-0542") == _card369["description"],
      "11h: la fila de la sesion viva converge a la descripcion corregida del board")
check(descripcion(DB11, S_B, "TASK-DOCS-9999") == _card369["description"],
      "11i: y la de la segunda sesion tambien — el recorrido no se corta en la primera")
check(fila_por_cita(DB11, S, "TASK-DOCS-0542")[2] == "TASK-DOCS-0542",
      "11j: la identidad no se toca: converge estado, no cita")

# El guard de la raiz. Una raiz inexistente NO es «cero sesiones»: es «no pude
# mirar», y publicarlo como 0 seria el verde falso que el hook heredaria.
try:
    bs.reconcile_all_sessions(DB11, board_root=RAIZ11 / "no-existe")
    check(False, "11k: una raiz inexistente REHUSA en vez de publicar cero")
except bs.BoardSyncError as _e11:
    check("no existe" in str(_e11).lower(),
          "11k: una raiz inexistente REHUSA en vez de publicar cero")
print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    sys.exit(1)
print("OK: todas las aserciones pasan")
