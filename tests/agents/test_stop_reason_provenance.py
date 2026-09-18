"""La procedencia de ``stop_reason`` YA la declara ``usage_source`` — un NULL
bajo ``transcript`` es el dato, no un hueco.

El defecto, medido antes de escribir esto
(``.claude/workbench/procedencia-de-stop-reason-20260917T231750/``): la tarjeta
que abre este trabajo cuenta **1345** filas con ``stop_reason IS NULL`` como
«sin procedencia declarada», y su bloqueo declarado era decidir si
``outcome_source`` declara la procedencia de ``stop_reason`` o la de ``status``.

Las dos mitades del encuadre son falsas, y se midieron:

* ``outcome_source`` parea con **``status``**. Lo dicen tres sitios —
  ``reconcile_store.py:486-487`` (``"agent_id, status" + ", outcome_source"``),
  ``:887`` (*"(status, outcome_source) — el desenlace y QUÉ lo decidió"*) y su
  propio docstring de esquema, cuyo vocabulario ``hook``/``journal``/
  ``api_error``/``sin_transcript`` nombra instrumentos del **desenlace**. El
  pareo con ``stop_reason`` se supuso por el nombre: significante, no
  significado.
* **1266 de las 1345 SÍ tienen procedencia declarada.** ``no_medido`` dice
  «nadie podrá ya» y ``NULL`` dice «nadie ha pasado todavía»; contarlas como
  hueco es colapsar la distinción que la columna existe para conservar.

Quien declara la procedencia de ``stop_reason`` es ``usage_source``, porque el
**mismo recorrido** puebla ambos: ``register_session.py:349-350`` lee
``message.stop_reason`` dentro del bucle que suma ``usage``. Una segunda
columna ``_source`` sería una segunda declaración de una sola lectura.

Lo que tiene que poder fallar:

* **el reparto SEPARA el dato del hueco**. Sin él, un ``SELECT count(*) WHERE
  stop_reason IS NULL`` publica una cifra que mezcla tres poblaciones con
  remedios opuestos — terminal, pendiente y dato — y se lee como una sola deuda.
* **``client_version`` discrimina la generación del extractor**. Es el
  discriminador y no una corazonada: medido sobre el store real, **0** filas
  tienen ``client_version IS NULL`` con ``stop_reason IS NOT NULL``. Una fila
  leída por el extractor actual no puede dejarlo vacío, así que su ausencia
  marca una lectura anterior a que ``stop_reason`` se leyera — evidencia ida.
* **los cubos PARTICIONAN el universo**. Si suman menos que el total, hay una
  población que el censo no ve y su silencio se leería como cero — que es la
  ceguera de ``metrica-decide-la-conclusion.md`` con el censo como sujeto.
* **el huérfano se reporta, no se suma**. Una fila con ``stop_reason`` escrito y
  ``usage_source`` vacío sólo puede venir de un escritor que no pasó por el
  recorrido; sumarla a los medidos la escondería.
"""
from __future__ import annotations

import importlib
import os
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").exists():
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

from agents.agent_store import (  # noqa: E402
    CORE_SCHEMA,
    _migrate_agent_sessions_usage_columns,
    stop_reason_provenance,
)
from agents import reconcile_store  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}")
        print(f"        esperado=[{expected}] obtenido=[{obtained}]")


def store():
    """Un store en memoria con el esquema real y sus columnas de uso."""
    conn = sqlite3.connect(":memory:")
    conn.executescript(CORE_SCHEMA)
    _migrate_agent_sessions_usage_columns(conn)
    return conn


def fila(conn, agent_id, *, usage_source=None, stop_reason=None,
         client_version=None, status="completed"):
    conn.execute(
        "INSERT INTO agent_sessions (agent_id, subagent_type, session_id, "
        "status, started_at, updated_at, usage_source, stop_reason, "
        "client_version) VALUES (?,?,?,?,?,?,?,?,?)",
        (agent_id, "probe", "probe-session", status, "2026-01-01", "2026-01-01",
         usage_source, stop_reason, client_version))
    conn.commit()


print("test_stop_reason_provenance:")
print()
print("== 1. el reparto separa el DATO del HUECO ==")
conn = store()
fila(conn, "con-valor", usage_source="transcript", stop_reason="end_turn",
     client_version="2.1.268")
fila(conn, "declarado-nulo", usage_source="transcript", client_version="2.1.268")
fila(conn, "extractor-viejo", usage_source="transcript")
fila(conn, "irrecuperable", usage_source="no_medido")
fila(conn, "sin-clasificar")

reparto = stop_reason_provenance(conn)
check("el que trae valor no cuenta como NULL", 1, reparto["con_valor"])
check("leido por el extractor actual, el transcript declaro nulo -> DATO", 1,
      reparto["declarado_nulo"])
check("leido por un extractor anterior a la lectura -> irrecuperable", 1,
      reparto["extractor_sin_lectura"])
check("nunca medido (usage_source='no_medido') -> tiene procedencia", 1,
      reparto["no_medido"])
check("sin clasificar todavia (usage_source NULL)", 1, reparto["sin_clasificar"])

print()
print("== 2. los cubos PARTICIONAN el universo ==")
# Un censo cuyos cubos no suman el total deja una poblacion invisible, y su
# silencio se lee como cero. El denominador es parte del resultado, no adorno.
cubos = ("con_valor", "declarado_nulo", "extractor_sin_lectura", "no_medido",
         "sin_clasificar", "huerfano")
check("el total es el universo", 5, reparto["total"])
check("los cubos suman el total", reparto["total"],
      sum(reparto[c] for c in cubos))

print()
print("== 3. el huerfano se reporta, NO se suma a los medidos ==")
conn2 = store()
fila(conn2, "huerfano", stop_reason="end_turn")   # valor sin quien lo midiera
r2 = stop_reason_provenance(conn2)
check("con valor y sin procedencia -> huerfano", 1, r2["huerfano"])
check("y NO entra en con_valor", 0, r2["con_valor"])
check("y NO entra en sin_clasificar", 0, r2["sin_clasificar"])
check("los cubos siguen sumando el total", r2["total"],
      sum(r2[c] for c in cubos))

print()
print("== 4. client_version discrimina, y su ausencia NO se confunde ==")
# La otra mitad: un CHECK mal escrito que mandara todo al cubo de irrecuperable
# publicaria «0 datos» sobre un store sano. Los dos casos se afirman aparte.
conn3 = store()
for i in range(3):
    fila(conn3, f"actual-{i}", usage_source="transcript", client_version="2.1.268")
for i in range(2):
    fila(conn3, f"viejo-{i}", usage_source="transcript")
r3 = stop_reason_provenance(conn3)
check("tres leidos por el extractor actual", 3, r3["declarado_nulo"])
check("dos leidos antes de la lectura", 2, r3["extractor_sin_lectura"])
check("ninguno cae en no_medido", 0, r3["no_medido"])

print()
print("== 5. un store vacio da ceros, no revienta ==")
r4 = stop_reason_provenance(store())
check("total 0", 0, r4["total"])
check("y los cubos suman 0", 0, sum(r4[c] for c in cubos))

print()
print("== 6. el barrido NO reclama una fila cuyo stop_reason ya se leyo ==")
# El control que discrimina el cambio de `_ids_incompletos`: una fila leida por
# el extractor actual con TODAS las demas columnas llenas y `stop_reason` en
# NULL. Con el predicado llano anterior quedaba reclamada para siempre, porque
# su transcript declara el nulo y releerlo no puede cambiarlo.
temp = tempfile.mkdtemp(prefix="stop-reason-guard-")
destino = Path(temp) / "agent-results"
destino.mkdir()
db = sqlite3.connect(destino / "agent_store.sqlite3")
db.executescript(CORE_SCHEMA)
_migrate_agent_sessions_usage_columns(db)


def fila_completa(conn, agent_id, **override):
    """Una fila SIN ninguna deuda: el unico motivo posible es el del override."""
    campos = dict(
        agent_id=agent_id, subagent_type="probe", session_id="probe-session",
        status="completed", started_at="2026-01-01", updated_at="2026-01-01",
        spawn_depth=1, source="hook", tool_use_id="tu-1", duration_s=1,
        tool_uses_total=1, tool_uses_json="[]", prompt="p", retention_level=3,
        model="claude-sonnet-5", effort="high", client_version="2.1.268",
        service_tier="standard", outcome_source="hook",
        usage_source="transcript", stop_reason="end_turn")
    campos.update(override)
    conn.execute(
        f"INSERT INTO agent_sessions ({','.join(campos)}) "
        f"VALUES ({','.join('?' * len(campos))})", tuple(campos.values()))
    conn.commit()


fila_completa(db, "sana")                              # control negativo
fila_completa(db, "leida-nulo", stop_reason=None)      # el sujeto del cambio
fila_completa(db, "sin-leer", stop_reason=None, client_version=None)
db.close()

os.environ["AGENT_STORE_CLAUDE_DIR"] = str(destino)
importlib.reload(reconcile_store)
reclamados = reconcile_store._ids_incompletos()
check("la fila sana no se reclama", False, "sana" in reclamados)
check("stop_reason NULL leido por el extractor actual NO se reclama", False,
      "leida-nulo" in reclamados)
# Control positivo: la que nunca se leyo SI entra — por `client_version`, que
# es la columna que de verdad marca «este extractor no ha pasado».
check("la que nunca se leyo si se reclama", True, "sin-leer" in reclamados)
shutil.rmtree(temp)

print()
print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(0 if FAILED == 0 else 1)
