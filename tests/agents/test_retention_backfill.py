"""Pruebas de ``reconcile_store._backfill_retention_level`` — el nivel de una
fila que ningún barrido de disco puede volver a tocar.

El defecto que cierran
----------------------
``_retention_level`` sólo se aplica a la fila cuyo transcript el barrido
encuentra. Una fila cuyo transcript nunca se escribió no pasa por ahí, así
que su ``retention_level`` se queda en ``NULL`` para siempre — y ``NULL``
significa «todavía no se sabe», que es falso: de esa fila no se va a saber
más nunca.

Medido el 2026-09-07 sobre el store fusionado (1214 filas): **93** con
``retention_level`` NULL, de las cuales 56 son ``completed`` nacidas del hook
y ya marcadas ``usage_source='no_medido'``. La columna que declara que el
costo es irrecuperable y la que declara el nivel decían cosas distintas de la
misma fila.

El par que discrimina
---------------------
El criterio NO es el estado: es la PROCEDENCIA de la medición.

- ``no_medido`` → 4 pase lo que pase, porque no hay registro recuperable.
- ``transcript`` → el nivel que su estado implica (3 si entregó, 4 si murió):
  su persistencia se declaró y se leyó, aunque el archivo ya no esté.
- ``NULL`` → **no se toca**. Es «nadie ha pasado todavía», y escribir un
  nivel ahí colapsaría justo la distinción que la columna existe para
  conservar.

CONTROL DE ANULACIÓN, medido: sustituyendo el reparto por procedencia por
``3 si completed, si no 4`` sobre todo lo terminal, caen **4 de 10** — la
irrecuperable que entregó (pasa a 3), la etiqueta de la leída (recibe
``sin_transcript`` sin deberlo), el conteo (5 en vez de 4) y el caso D (la
fila sin clasificar recibe un 3). Sobreviven las cuatro que no dependen del
reparto: la irrecuperable que murió, las dos leídas, el agente vivo y la
idempotencia.

El caso D es el que no puede pasar sin la guarda, y por eso es el que la
mide: sin él, un backfill que marque todo lo terminal aprobaría igual.
"""
from __future__ import annotations

import sqlite3
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from agents import agent_store, reconcile_store  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


FILAS = [
    # (agent_id, status, usage_source, retention_level esperado)
    ("a-irrecuperable-completed", "completed", "no_medido", 4),
    ("a-irrecuperable-failed", "failed", "no_medido", 4),
    ("a-leido-completed", "completed", "transcript", 3),
    ("a-leido-failed", "failed", "transcript", 4),
    ("a-sin-clasificar", "completed", None, None),
    ("a-vivo", "running", "no_medido", None),
]


def build(store_dir: Path) -> Path:
    """Siembra el store por la ruta real —``agent_store.connect``—, no por un
    esquema reconstruido a mano: una copia del DDL envejece sola y deja fuera
    lo que añaden las migraciones."""
    conn = agent_store.connect(store_dir)
    for agent_id, status, usage, _ in FILAS:
        conn.execute(
            "INSERT INTO agent_sessions (agent_id, subagent_type, session_id, "
            "status, started_at, updated_at, usage_source) "
            "VALUES (?,?,?,?,?,?,?)",
            (agent_id, "general-purpose", "s", status,
             "2026-09-07T00:00:00", "2026-09-07T00:00:00", usage))
    conn.commit()
    conn.close()
    return store_dir / agent_store.DB_FILENAME


with tempfile.TemporaryDirectory() as tmp:
    store = build(Path(tmp))
    tocadas = reconcile_store._backfill_retention_level(store)

    conn = sqlite3.connect(store)
    nivel = dict(conn.execute("SELECT agent_id, retention_level FROM agent_sessions"))
    outcome = dict(conn.execute("SELECT agent_id, outcome_source FROM agent_sessions"))
    conn.close()

    print("== A. La procedencia decide el nivel, no el estado ==")
    for agent_id, _s, _u, esperado in FILAS[:4]:
        check(f"{agent_id} -> {esperado}", esperado, nivel[agent_id])

    print("== B. La procedencia del desenlace se declara, no se deja en blanco ==")
    check("irrecuperable declara el instrumento que lo decidió",
          "sin_transcript", outcome["a-irrecuperable-completed"])
    check("la leída NO se etiqueta sin_transcript: su desenlace vino del JSONL",
          None, outcome["a-leido-completed"])

    print("== C. El conteo publica su alcance ==")
    check("cuatro filas tocadas, no seis", 4, tocadas)

    print("== D. Lo que NO se toca — el control que puede fallar ==")
    check("usage_source NULL sigue NULL: «nadie ha pasado todavía»",
          None, nivel["a-sin-clasificar"])
    check("un agente vivo no recibe nivel", None, nivel["a-vivo"])

    print("== E. Idempotencia: un segundo pase no reescribe nada ==")
    check("segunda pasada toca 0", 0, reconcile_store._backfill_retention_level(store))

print(f"\nRESULTADO: {OK} ok, {FAILED} fallo(s)")
sys.exit(1 if FAILED else 0)
