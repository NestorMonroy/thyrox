"""Pruebas de ``store.agent_sessions`` — el store SQLite de sesiones de agente.

Adaptación del mecanismo de ``kaupamex-docs:
.claude/scripts/agents/agent_store.py`` (3040 líneas, 50 ``def`` de nivel
superior, medido con AST). Viaja el MECANISMO: abrir/crear la base con WAL +
busy_timeout, declarar el esquema núcleo de 8 columnas, insertar una sesión
con upsert protegido en estado terminal, actualizarla con COALESCE por campo
y guarda de no-op, consultarla, y el censo de medición que separa
medido/no-medido/sin-clasificar/huérfano con denominador declarado. Se
inyectan (DEC-04): las columnas adicionales de uso (``extra_columns`` en
``connect``), y el vocabulario del censo (``source_column``,
``measured_value``, ``unmeasured_value`` en ``usage_census``) — son
vocabulario propio de kaupamex, no del mecanismo.

Excluido del porte, con su razón (``porte-completo-no-parcial.md``):

- ``findings_history`` + FTS5, ``tasks``/tablero/citas, ``documents``/eje
  temporal, la capa CLI (``argparse``), ``resolve_store_dir`` — dominio
  kaupamex (hallazgos, tablero multi-repo, resolución de rutas que
  ``src/paths/reach.py`` ya resuelve de forma genérica en este árbol).
- ``_asignacion_metadata`` (merge de JSON en ``metadata_json``) — no es parte
  del mecanismo mínimo de actualización parcial; queda fuera porque agrega una
  semántica de fusión que el consumidor puede construir sobre
  ``update_session`` si la necesita.
- El truco ``COALESCE(NULLIF(col, 'desconocido'), ?, col)`` que preserva un
  valor real sobre un centinela de reemplazo — depende de un vocabulario de
  centinela (``'desconocido'``/``'desconocida'``) propio de kaupamex. El
  mecanismo mínimo portado usa ``COALESCE(?, col)`` sin esa preservación.
- La sección "USD por modelo" del censo original (usa ``model_catalog``,
  específico de kaupamex) — el censo aquí termina en los cuatro cubos +
  agregado sobre las columnas de medida, sin monetizar.

Los casos que DISCRIMINAN, con el defecto medido que corrigen:

- **5** — la guarda de estado terminal en el upsert de registro. Sin ella,
  re-registrar una sesión ya ``completed`` (p. ej. un ``SubagentStart`` que
  se dispara de nuevo al reanudar vía ``SendMessage``) la revertiría a
  ``running`` en silencio.
- **7** — la guarda de no-op ``IS NOT``. Sin ella, una actualización que no
  cambia ningún campo real igual mueve ``updated_at`` — corrompe la
  semántica de "sin cambios" que ``metrica-decide-la-conclusion.md``
  sub-patrón D exige distinguir de "actualizado".
- **12** — el AND (no OR) en el predicado "no medido" del censo. Una fila
  con tres columnas NULL y una en cero SÍ tiene dato — es huérfana, no
  sin-clasificar. Con OR, cualquier NULL basta para clasificarla como
  sin-clasificar, y el huérfano desaparece del reporte (H-DB-* — mismo
  defecto que ``metrica-decide-la-conclusion.md`` documenta para
  ``agent_store.py`` real: la columna de origen distingue "nadie ha medido
  todavía" de "nadie podrá ya", y una fila parcialmente poblada sin origen
  declarado no es ninguna de las dos).

Los stores son bases SQLite de usar-y-tirar en ``tempfile.TemporaryDirectory``
— medir contra un store real haría que el resultado dependiera del estado
que deje la sesión.

Mitad roja (TDD) — capturada antes de escribir la implementación:

.. code-block:: text

   $ python3 tests/store/test_agent_sessions.py
   Traceback (most recent call last):
     File "/home/user/thyrox/tests/store/test_agent_sessions.py", line 65, in <module>
       from store import agent_sessions as ags  # noqa: E402
       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ImportError: cannot import name 'agent_sessions' from 'store' (unknown location)

(2026-09-05T17:20:27 UTC — ``src/store/`` aún no existía).

Controles de anulación — resultado (verificado, no supuesto)
--------------------------------------------------------------

Cada guarda se anuló, se corrió la suite completa, y se confirmó que caen
EXACTAMENTE las aserciones que dependen de ella — ni una más, ni una menos.
Restauración verificada con ``diff -q`` contra una copia pristina en el
scratchpad (``git diff --stat`` no aplica: los archivos son nuevos, sin
historial git todavía).

- Guarda de estado terminal (``register_session``, el CASE del upsert)
  anulada → **26 ok, 2 fallos** (exactamente la sección 5: status/output_key
  revierten a running/None). Restaurada → 28 ok, 0 fallos.
- Guarda de no-op (``update_session``, el ``IS NOT`` del WHERE) anulada →
  **26 ok, 2 fallos** (exactamente la sección 7: outcome pasa a "updated" y
  ``updated_at`` se mueve sin cambio real). Restaurada → 28 ok, 0 fallos.
- AND→OR en el predicado "no medido" (``usage_census``) anulado → **26 ok,
  2 fallos** (exactamente la sección 12: la fila con dato parcial migra de
  huérfano a sin_clasificar). Restaurado → 28 ok, 0 fallos.
"""
from __future__ import annotations

import sqlite3
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from store import agent_sessions as ags  # noqa: E402

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


print("== 1. connect() crea el esquema núcleo: 8 columnas + 2 índices ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(agent_sessions)")]
    check("las 8 columnas núcleo", list(ags.CORE_COLUMNS), cols)
    idx = {r["name"] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index'")}
    check("los 2 índices declarados",
          {"idx_agent_sessions_status", "idx_agent_sessions_started_at"},
          {n for n in idx if n.startswith("idx_agent_sessions_")})
    conn.close()

print("== 2. CONTROL: store_dir vacío rehúsa, no crea nada silenciosamente ==")
try:
    ags.connect("")
    check("rehúsa store_dir vacío", "EmptyStoreDirError", "no lanzó")
except ags.EmptyStoreDirError as err:
    check("rehúsa store_dir vacío", "EmptyStoreDirError", type(err).__name__)

print("== 3. extra_columns — migración aditiva, idempotente ==")
with tempfile.TemporaryDirectory() as tmp:
    store_dir = Path(tmp) / "store"
    extra = {"model": "TEXT", "turns": "INTEGER"}
    conn = ags.connect(store_dir, extra_columns=extra)
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(agent_sessions)")}
    check("las columnas extra aparecen", True, {"model", "turns"} <= cols)
    conn.close()
    # Reconectar al MISMO archivo no debe fallar (ALTER TABLE sólo si falta)
    conn2 = ags.connect(store_dir, extra_columns=extra)
    check("reconectar es idempotente", True, conn2 is not None)
    conn2.close()

print("== 4. register_session — inserta una sesión nueva ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    ags.register_session(conn, "a1", "general-purpose", "sess-1",
                          started_at="2020-01-01T00:00:00", updated_at="2020-01-01T00:00:00")
    row = conn.execute("SELECT * FROM agent_sessions WHERE agent_id = ?", ("a1",)).fetchone()
    check("status por defecto", "running", row["status"])
    check("subagent_type", "general-purpose", row["subagent_type"])
    conn.close()

print("== 5. DISCRIMINA: el upsert NO revierte una sesión terminal a running ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    ags.register_session(conn, "a2", "t", "s",
                          started_at="2020-01-01T00:00:00", updated_at="2020-01-01T00:00:00")
    ags.update_session(conn, "a2", updated_at="2020-01-01T00:05:00",
                        status="completed", output_key="out-1")
    # Re-registro tardío (p. ej. SendMessage reanuda y dispara SubagentStart otra vez)
    ags.register_session(conn, "a2", "t", "s",
                          started_at="2020-01-01T00:00:00", updated_at="2020-01-01T00:10:00")
    row = conn.execute("SELECT status, output_key FROM agent_sessions WHERE agent_id = ?",
                        ("a2",)).fetchone()
    check("status se queda completed", "completed", row["status"])
    check("output_key se queda out-1", "out-1", row["output_key"])
    conn.close()

print("== 6. update_session — COALESCE por campo: sólo toca lo que se pasa ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    ags.register_session(conn, "a3", "t", "s", output_key="k0",
                          started_at="2020-01-01T00:00:00", updated_at="2020-01-01T00:00:00")
    outcome = ags.update_session(conn, "a3", updated_at="2020-01-01T00:05:00", status="completed")
    row = conn.execute("SELECT status, output_key FROM agent_sessions WHERE agent_id = ?",
                        ("a3",)).fetchone()
    check("outcome updated", "updated", outcome)
    check("status cambia", "completed", row["status"])
    check("output_key no tocado", "k0", row["output_key"])
    conn.close()

print("== 7. DISCRIMINA: la guarda de no-op no mueve updated_at sin cambio real ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    ags.register_session(conn, "a4", "t", "s", status="completed",
                          started_at="2020-01-01T00:00:00", updated_at="2020-01-01T00:00:00")
    outcome = ags.update_session(conn, "a4", updated_at="2020-01-01T09:00:00", status="completed")
    row = conn.execute("SELECT updated_at FROM agent_sessions WHERE agent_id = ?",
                        ("a4",)).fetchone()
    check("outcome unchanged", "unchanged", outcome)
    check("updated_at NO se mueve", "2020-01-01T00:00:00", row["updated_at"])
    conn.close()

print("== 8. update_session — el tercer desenlace: agent_id inexistente rehúsa ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    try:
        ags.update_session(conn, "no-existe", updated_at="2020-01-01T00:00:00", status="completed")
        check("rehúsa agent_id ausente", "SessionNotFoundError", "no lanzó")
    except ags.SessionNotFoundError as err:
        check("rehúsa agent_id ausente", "SessionNotFoundError", type(err).__name__)
    conn.close()

print("== 9. update_session — columna desconocida rehúsa (no la interpola) ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    ags.register_session(conn, "a5", "t", "s",
                          started_at="2020-01-01T00:00:00", updated_at="2020-01-01T00:00:00")
    try:
        ags.update_session(conn, "a5", updated_at="2020-01-01T00:01:00", no_existe="x")
        check("rehúsa columna desconocida", "UnknownColumnError", "no lanzó")
    except ags.UnknownColumnError as err:
        check("rehúsa columna desconocida", "UnknownColumnError", type(err).__name__)
    conn.close()

print("== 10. update_session — create_if_missing crea el stub y aplica el update ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    outcome = ags.update_session(conn, "a6", updated_at="2020-01-01T00:00:00",
                                  create_if_missing=True, status="completed",
                                  subagent_type="general-purpose", session_id="sess-6")
    row = conn.execute("SELECT * FROM agent_sessions WHERE agent_id = ?", ("a6",)).fetchone()
    check("outcome updated", "updated", outcome)
    check("subagent_type del stub luego actualizado", "general-purpose", row["subagent_type"])
    check("status aplicado", "completed", row["status"])
    conn.close()

print("== 11. list_sessions — orden por started_at, filtro por status, rehúsa inválido ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    ags.register_session(conn, "b1", "t", "s", started_at="2020-01-02T00:00:00",
                          updated_at="2020-01-02T00:00:00")
    ags.register_session(conn, "b2", "t", "s", started_at="2020-01-01T00:00:00",
                          updated_at="2020-01-01T00:00:00", status="completed")
    rows = ags.list_sessions(conn)
    check("orden por started_at", ["b2", "b1"], [r["agent_id"] for r in rows])
    filtered = ags.list_sessions(conn, status="completed")
    check("filtro por status", ["b2"], [r["agent_id"] for r in filtered])
    try:
        ags.list_sessions(conn, status="no-es-un-estado")
        check("rehúsa status inválido", "InvalidStatusError", "no lanzó")
    except ags.InvalidStatusError as err:
        check("rehúsa status inválido", "InvalidStatusError", type(err).__name__)
    conn.close()

print("== 12. DISCRIMINA: usage_census — AND (no OR) en el predicado no-medido ==")
with tempfile.TemporaryDirectory() as tmp:
    store_dir = Path(tmp) / "store"
    extra = {"m1": "INTEGER", "m2": "INTEGER", "m3": "INTEGER", "m4": "INTEGER",
             "usage_source": "TEXT"}
    conn = ags.connect(store_dir, extra_columns=extra)
    ags.register_session(conn, "c1", "t", "s", started_at="2020-01-01T00:00:00",
                          updated_at="2020-01-01T00:00:00")
    conn.execute("UPDATE agent_sessions SET m1=NULL, m2=NULL, m3=NULL, m4=NULL "
                 "WHERE agent_id = 'c1'")
    ags.register_session(conn, "c2", "t", "s", started_at="2020-01-01T00:00:00",
                          updated_at="2020-01-01T00:00:00")
    conn.execute("UPDATE agent_sessions SET m1=NULL, m2=NULL, m3=NULL, m4=0 "
                 "WHERE agent_id = 'c2'")
    conn.commit()
    census = ags.usage_census(conn, ["m1", "m2", "m3", "m4"],
                               source_column="usage_source",
                               measured_value="measured", unmeasured_value="unmeasured")
    check("c1 sin ningún dato -> sin_clasificar", 1, census["sin_clasificar"])
    check("c2 con un dato parcial -> huerfano, no sin_clasificar", 1, census["huerfanos"])
    conn.close()

print("== 13. usage_census — rehúsa measure_columns vacío ==")
with tempfile.TemporaryDirectory() as tmp:
    conn = ags.connect(Path(tmp) / "store")
    try:
        ags.usage_census(conn, [])
        check("rehúsa measure_columns vacío", "EmptyMeasureColumnsError", "no lanzó")
    except ags.EmptyMeasureColumnsError as err:
        check("rehúsa measure_columns vacío", "EmptyMeasureColumnsError", type(err).__name__)
    conn.close()

print("== 14. usage_census — agregado es None (no cero fabricado) sin medidos ==")
with tempfile.TemporaryDirectory() as tmp:
    store_dir = Path(tmp) / "store"
    extra = {"m1": "INTEGER", "usage_source": "TEXT"}
    conn = ags.connect(store_dir, extra_columns=extra)
    ags.register_session(conn, "d1", "t", "s", started_at="2020-01-01T00:00:00",
                          updated_at="2020-01-01T00:00:00")
    census = ags.usage_census(conn, ["m1"], source_column="usage_source",
                               measured_value="measured", unmeasured_value="unmeasured")
    check("sin filas medidas, aggregate es None", None, census["aggregate"])
    conn.close()

print("== 15. usage_census — el agregado suma correctamente sobre los medidos ==")
with tempfile.TemporaryDirectory() as tmp:
    store_dir = Path(tmp) / "store"
    extra = {"m1": "INTEGER", "usage_source": "TEXT"}
    conn = ags.connect(store_dir, extra_columns=extra)
    ags.register_session(conn, "e1", "t", "s", started_at="2020-01-01T00:00:00",
                          updated_at="2020-01-01T00:00:00")
    conn.execute("UPDATE agent_sessions SET m1=10, usage_source='measured' "
                 "WHERE agent_id='e1'")
    ags.register_session(conn, "e2", "t", "s", started_at="2020-01-01T00:00:00",
                          updated_at="2020-01-01T00:00:00")
    conn.execute("UPDATE agent_sessions SET m1=5, usage_source='measured' "
                 "WHERE agent_id='e2'")
    conn.commit()
    census = ags.usage_census(conn, ["m1"], source_column="usage_source",
                               measured_value="measured", unmeasured_value="unmeasured")
    check("n medidos", 2, census["aggregate"]["n"])
    check("suma de m1", 15, census["aggregate"]["sum"]["m1"])
    conn.close()

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
