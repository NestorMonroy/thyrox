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

import importlib.util
import json
import os
import pathlib
import sqlite3
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parents[1] / "src" / "task"
MODULE_PATH = SRC / "board_sync.py"

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

check("/root/.claude/tasks" not in MODULE_PATH.read_text().replace(
          "BOARD_ROOT_DEFAULT", ""),
      "1f: el literal del board aparece UNA vez, en su constante")

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

print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    sys.exit(1)
print("OK: todas las aserciones pasan")
