"""El acuñado al CREAR dispara con el evento del cliente, no con el nombre del tool.

El defecto, medido antes de escribir esto
(``.claude/workbench/disparo-de-acunado-al-crear-20260917T234857/``):
``board_sync.mint_created_card`` tiene **cero invocadores de produccion** — solo
lo llaman su propia suite y un volcado de banco. La capacidad esta escrita y
muerta, que es por lo que ``TASK-DOCS-0404`` sigue abierta pese al mecanismo.

El plan que la tarjeta declaraba era *«un hook PostToolUse con matcher
TaskCreate|TaskUpdate»*, y su bloqueo declarado era no conocer la forma del
payload. Medido en ``_references/claude-code-bin/2.1.266/claude_strings.txt``,
el plan apuntaba al evento equivocado:

* el cliente declara un evento **dedicado**, en su enum de 33 —
  ``"TeammateIdle","TaskCreated","TaskCompleted"``— y lo despacha con
  ``hook_event_name:"TaskCreated", task_id:e, task_subject:n,
  task_description:r, teammate_name:o, team_name:d``;
* su propia ayuda lo dice verbatim: *«Input to command is JSON with task_id,
  task_subject, task_description, teammate_name, and team_name»*.

O sea que el ordinal **viaja en el payload**, y no hay que derivarlo de un
``tool_response`` cuya forma nadie declaro. Eso cierra el DESCONOCIDO que
``board_sync`` dejo escrito, con la condicion que el propio DESCONOCIDO fijo.

Y destapa el desajuste que hace inerte al mecanismo: ``CREATION_EVENTS`` admite
``TaskCreate`` —el nombre del **tool**— mientras el hook entrega ``TaskCreated``
—el nombre del **evento**. Cableado tal cual, el guard rehusaria TODO acuñado.
Es el significante contra el significado: dos cadenas que difieren en una letra
y nombran cosas de capas distintas.

Lo que tiene que poder fallar:

* **el guard admite el evento del hook**. Sin eso el cableado no acuña nada y
  su silencio se lee como «no habia tarjetas nuevas».
* **el guard SIGUE rechazando lo que no crea**. Es la otra mitad: admitir
  ``TaskCompleted`` en el acuñado daria al mismo trabajo una fila y una cita
  mas en cada cierre — el duplicado que ``mint_created_card`` existe para
  evitar, y que su propio docstring declara.
* **el payload se lee del stdin del cliente, con SU forma**. Un lector que
  espere ``tool_input.ordinal`` no ve nada en un payload real, y su cero se
  leeria como «no habia id».
* **un payload que no es JSON no rompe el turno**. Un hook que revienta con
  traza deja al cliente con ruido y sin acuñado; el contrato es salir 0.
"""
from __future__ import annotations

import json
import subprocess
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").exists():
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

from task import board_sync  # noqa: E402
from agents import agent_store  # noqa: E402

HOOK = ROOT / "src/hooks/task_lifecycle.py"

OK = 0
FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}")
        print(f"        esperado=[{expected}] obtenido=[{obtained}]")


#: El payload tal y como el cliente lo despacha. Se conserva con SUS nombres de
#: clave —no parafraseados— porque la forma es el sujeto de este control:
#: `2.1.266`, `hook_event_name:"TaskCreated",task_id:e,task_subject:n,…`.
def payload(event, ordinal, subject, session):
    return json.dumps({
        "hook_event_name": event,
        "session_id": session,
        "task_id": str(ordinal),
        "task_subject": subject,
        "task_description": "lo que hay que hacer",
        "teammate_name": None,
        "team_name": None,
    })


def scenario():
    """Un board de una tarjeta y un store vacio, ambos desechables."""
    tmp = Path(tempfile.mkdtemp(prefix="task-lifecycle-"))
    session = "sesion-de-sonda"
    board = tmp / "tasks" / session
    board.mkdir(parents=True)
    (board / "7.json").write_text(json.dumps(
        {"subject": "Sujeto de la sonda", "status": "pending",
         "description": "lo que hay que hacer"}))
    # Se abre por la puerta CANONICA, no transcribiendo su esquema: `connect`
    # corre las siete migraciones, y un fixture que solo ejecute `CORE_SCHEMA`
    # mide una tabla que el store real no tiene —le faltan `citation_id`,
    # `opened_at` y el CHECK de estado—. Un verde sobre esa tabla no diria
    # nada del store vivo.
    agent_store.connect(tmp).close()
    store = tmp / agent_store.DB_FILENAME
    return tmp, session, board, store


def run(event, ordinal, session, board, store, layer="thyrox"):
    return subprocess.run(
        [sys.executable, str(HOOK), "--store", str(store), "--board", str(board),
         "--capa", layer],
        input=payload(event, ordinal, "Sujeto de la sonda", session),
        capture_output=True, text=True)


def citations(store):
    conn = sqlite3.connect(store)
    rows = conn.execute("SELECT citation_id, subject FROM tasks").fetchall()
    conn.close()
    return rows


print("test_task_lifecycle:")
print()
print("== 1. el guard admite el EVENTO del hook, no solo el nombre del tool ==")
check("`TaskCreated` (el evento) esta en CREATION_EVENTS", True,
      "TaskCreated" in board_sync.CREATION_EVENTS)
check("`TaskCreate` (el tool) sigue estando", True,
      "TaskCreate" in board_sync.CREATION_EVENTS)

print()
print("== 2. la OTRA mitad: lo que no crea sigue rechazado ==")
# Admitir el cierre aqui daria al mismo trabajo una fila y una cita mas en cada
# `TaskCompleted`. El acuñado es del alta; el cierre lo lleva `sync_card`.
check("`TaskCompleted` NO acuña", False,
      "TaskCompleted" in board_sync.CREATION_EVENTS)
check("`TaskUpdate` NO acuña", False,
      "TaskUpdate" in board_sync.CREATION_EVENTS)

print()
print("== 3. el hook lee el payload del cliente y acuña ==")
tmp, session, board, store = scenario()
r = run("TaskCreated", 7, session, board, store)
check("sale 0", 0, r.returncode)
rows = citations(store)
check("acuña exactamente una fila", 1, len(rows))
check("y su cita es de la capa declarada", True,
      bool(rows) and rows[0][0].startswith("TASK-THYROX-"))
check("y lleva el sujeto de la tarjeta", "Sujeto de la sonda",
      rows[0][1] if rows else None)

print()
print("== 4. el evento de cierre NO acuña una fila mas ==")
r2 = run("TaskCompleted", 7, session, board, store)
check("sale 0 igualmente (no es un error)", 0, r2.returncode)
check("y el store sigue con UNA fila", 1, len(citations(store)))

print()
print("== 5. un payload roto no rompe el turno ==")
# El contrato del cliente: un hook que revienta deja ruido y el turno sigue.
# Salir !=0 con traza seria peor que no acuñar.
r3 = subprocess.run(
    [sys.executable, str(HOOK), "--store", str(store), "--board", str(board)],
    input="{esto no es json", capture_output=True, text=True)
check("sale 0 ante JSON invalido", 0, r3.returncode)
r4 = subprocess.run(
    [sys.executable, str(HOOK), "--store", str(store), "--board", str(board)],
    input="", capture_output=True, text=True)
check("sale 0 ante stdin vacio", 0, r4.returncode)

print()
print("== 6. el cableado del usuario DECLARA el evento ==")
# Un mecanismo que no esta en el cableado es capacidad muerta — el defecto
# exacto que esta tarea lleva abierta desde que se escribio el mecanismo.
from session import user_wiring  # noqa: E402
declared = user_wiring.declared_wiring(root=ROOT)["hooks"]
check("`TaskCreated` esta declarado", True, "TaskCreated" in declared)
check("`TaskCompleted` esta declarado", True, "TaskCompleted" in declared)
commands = [h["command"] for ev in ("TaskCreated", "TaskCompleted")
            for group in declared.get(ev, []) for h in group.get("hooks", [])]
check("los dos apuntan al mismo guion", 2,
      sum(1 for c in commands if "task_lifecycle.py" in c))

print()
print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(0 if FAILED == 0 else 1)
