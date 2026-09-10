"""El store SQLite de sesiones de agente.

Adaptación del mecanismo de ``kaupamex-docs:
.claude/scripts/agents/agent_store.py`` (3040 líneas; 50 ``def`` de nivel
superior, medido con
``python3 -c "import ast;print(len([n for n in
ast.parse(open('agent_store.py').read()).body
if isinstance(n, ast.FunctionDef)]))"``). El archivo original gobierna DOS
tablas (``agent_sessions`` y ``findings_history``) más un motor de búsqueda de
texto completo, un tablero de tareas multi-repo y un eje temporal de
documentos. Aquí viaja SÓLO el mecanismo de ``agent_sessions`` — el resto es
dominio propio de kaupamex y se excluye con su razón (ver
``tests/store/test_agent_sessions.py``, sección "Excluido del porte").

Lo que viaja
------------

- ``connect`` — abre o crea la base con ``journal_mode=WAL`` y
  ``busy_timeout``, necesarios porque varios hooks/subagentes pueden escribir
  al mismo tiempo; declara el esquema núcleo de 8 columnas y sus dos índices;
  aplica una migración aditiva de columnas (``ALTER TABLE ... ADD COLUMN``
  sólo si falta) para las columnas que el consumidor inyecte.
- ``register_session`` — inserta o actualiza (upsert) una sesión, con una
  guarda que protege el estado terminal: una vez ``completed``/``failed``, un
  registro tardío (p. ej. un ``SubagentStart`` que se dispara de nuevo al
  reanudar por ``SendMessage``) no la revierte a ``running``.
- ``update_session`` — actualización parcial: cada campo pasado se escribe
  con ``COALESCE(?, columna)``, así que un campo omitido conserva su valor.
  Valida los nombres de campo contra ``PRAGMA table_info`` antes de
  interpolarlos — rehúsa con ``UnknownColumnError`` en vez de escribir SQL
  con un nombre que no existe. Una guarda de no-cambio (``IS NOT``, nunca
  ``<>`` — ``NULL <> NULL`` es NULL/falso y rompería la comparación en
  columnas anulables) evita mover ``updated_at`` cuando nada cambió de
  verdad. El desenlace es de TRES vías, no dos: actualizado / sin cambios
  (el agent_id existe pero nada difería) / inexistente (rehúsa con
  ``SessionNotFoundError``) — colapsar "sin cambios" e "inexistente" en un
  solo ``rowcount == 0`` es el sub-patrón D de
  ``metrica-decide-la-conclusion.md``: un cero no discrimina "no había nada
  que cambiar" de "no hay tal sesión".
- ``list_sessions`` — consulta simple, con filtro opcional por ``status``.
- ``usage_census`` — separa las filas en cuatro cubos con denominador
  declarado: medidas (``source_column == measured_value``), no-medidas-
  irrecuperables (``== unmeasured_value``), sin-clasificar (``source_column``
  NULL y TODAS las columnas de medida NULL a la vez — con AND, no OR: una
  fila con tres NULL y una en cero SÍ tiene dato) y huérfanas (``source_column``
  NULL pero con algún dato escrito sin origen declarado). El agregado sobre
  las medidas es ``None`` — no un cero fabricado — cuando no hay ninguna.

Qué se inyecta (DEC-04)
-----------------------

El consumidor aporta:

- ``extra_columns`` en ``connect`` — el diccionario columna→tipo de las
  columnas propias de su dominio (en kaupamex, ~25 columnas de uso: modelo,
  tokens, costo equivalente…). El mecanismo de migración aditiva es genérico;
  el conjunto concreto de columnas no lo es.
- ``source_column``, ``measured_value``, ``unmeasured_value`` en
  ``usage_census`` — el vocabulario del censo (en kaupamex,
  ``usage_source``/``'transcript'``/``'no_medido'``) es propio del consumidor;
  el mecanismo de separación en cuatro cubos con AND-no-OR es lo que viaja.

Lo que NO viaja, con su razón
------------------------------

- ``findings_history`` + su esquema FTS5 (``_create_fts_schema``,
  ``fts_available``, ``_resync_fts``, los ``_fts5_match_query*``) — motor de
  búsqueda de hallazgos, dominio kaupamex.
- El tablero de tareas multi-repo y sus citas (``cmd_snapshot_tasks``,
  ``citation_reassignments``, ``_reanchor_citations_by_subject``,
  ``cmd_render_tablero``, ``firma_estados``…) — vocabulario y esquema de
  ``tasks``/``documents`` específicos del multi-repo kaupamex.
- ``resolve_store_dir`` — resuelve la ruta de ``.claude/agent-results/`` de un
  repo kaupamex vía ``--repo``/``--claude-dir``; la resolución de rutas es del
  consumidor (este árbol ya tiene ``src/paths/reach.py`` para su propio caso
  genérico).
- La capa CLI completa (``build_parser``, ``main``, ``cmd_init``,
  ``add_target_args``) — es la interfaz de kaupamex, no el mecanismo.
- ``_asignacion_metadata`` (fusión de claves JSON en una columna
  ``metadata_json``) — no es parte del mecanismo mínimo de actualización
  parcial; el consumidor puede construir esa fusión sobre ``update_session``
  si la necesita.
- El truco ``COALESCE(NULLIF(columna, 'desconocido'), ?, columna)`` que
  preserva un valor real sobre un centinela de reemplazo — depende de un
  vocabulario de centinela propio de kaupamex (``'desconocido'``/
  ``'desconocida'``). El ``update_session`` de aquí usa
  ``COALESCE(?, columna)`` sin esa preservación de centinela.
- La sección "USD por modelo" del censo original, que consulta el catálogo de
  precios de kaupamex (``model_catalog``) — el censo de aquí termina en los
  cuatro cubos + el agregado sobre las columnas de medida.
- La derivación de submódulo (``derive_submodule``) y el resto de funciones de
  dominio (búsqueda de tareas, clasificación de documentos, snapshot de
  tablero) — sesenta y tantos símbolos del archivo original que pertenecen a
  ``findings_history``/``tasks``/``documents``/CLI, ninguno al mecanismo de
  ``agent_sessions``.
"""
from __future__ import annotations

import sqlite3
from collections.abc import Mapping, Sequence
from pathlib import Path

#: Las 8 columnas del esquema núcleo, en el orden en que se declaran.
CORE_COLUMNS = (
    "agent_id", "subagent_type", "session_id", "status",
    "output_key", "started_at", "updated_at", "timeout_at",
)

#: El vocabulario admitido de ``status`` — el mismo que el CHECK del esquema.
STATUSES = ("running", "completed", "failed")

#: Estados que la guarda de ``register_session`` protege de una reversión.
TERMINAL_STATUSES = ("completed", "failed")

CORE_SCHEMA = """
CREATE TABLE IF NOT EXISTS agent_sessions (
    agent_id TEXT PRIMARY KEY,
    subagent_type TEXT NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
    output_key TEXT,
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    timeout_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status
    ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_started_at
    ON agent_sessions(started_at);
"""


class EmptyStoreDirError(ValueError):
    """Se pidió conectar con un ``store_dir`` vacío o nulo."""


class UnknownColumnError(KeyError):
    """Se referenció una columna que ``agent_sessions`` no declara."""


class SessionNotFoundError(LookupError):
    """El ``agent_id`` no existe y no se pidió ``create_if_missing``."""


class InvalidStatusError(ValueError):
    """El ``status`` no pertenece al vocabulario declarado en ``STATUSES``."""


class EmptyMeasureColumnsError(ValueError):
    """``usage_census`` se llamó sin columnas de medida que discriminar."""


def connect(store_dir: Path | str,
            *,
            db_filename: str = "agent_sessions.sqlite3",
            extra_columns: Mapping[str, str] | None = None) -> sqlite3.Connection:
    """Abre o crea la base en ``store_dir``, con el esquema núcleo aplicado.

    ``store_dir`` vacío rehúsa en vez de crear una base bajo una ruta
    accidental (p. ej. el directorio de trabajo actual) — un ``store_dir``
    vacío no es "usa el default", es un error de quien llama.
    """
    if not store_dir:
        raise EmptyStoreDirError(
            "connect() requiere un store_dir no vacío.\n"
            "  NO se usa un default silencioso: una ruta vacía suele ser un "
            "error de composición de quien llama, no una elección real."
        )
    path = Path(store_dir)
    path.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path / db_filename)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(CORE_SCHEMA)
    if extra_columns:
        _migrate_extra_columns(conn, extra_columns)
    conn.commit()
    return conn


def _migrate_extra_columns(conn: sqlite3.Connection,
                            extra_columns: Mapping[str, str]) -> None:
    """Añade las columnas de ``extra_columns`` que aún no existan.

    Idempotente: sólo emite ``ALTER TABLE`` para las que ``PRAGMA
    table_info`` no reporta todavía, así que reconectar al mismo archivo con
    el mismo mapa no falla ni duplica nada.
    """
    existing = {row["name"] for row in conn.execute("PRAGMA table_info(agent_sessions)")}
    for column, sql_type in extra_columns.items():
        if column not in existing:
            conn.execute(f"ALTER TABLE agent_sessions ADD COLUMN {column} {sql_type}")


def register_session(conn: sqlite3.Connection,
                      agent_id: str,
                      subagent_type: str,
                      session_id: str,
                      *,
                      started_at: str,
                      updated_at: str,
                      status: str = "running",
                      output_key: str | None = None,
                      timeout_at: str | None = None) -> None:
    """Registra una sesión — upsert con la guarda de estado terminal.

    Un re-registro tardío de una sesión ya ``completed``/``failed`` (p. ej.
    un ``SubagentStart`` que se dispara de nuevo al reanudar) actualiza
    ``subagent_type``/``session_id``/``updated_at``/``timeout_at`` pero NO
    revierte ``status`` ni ``output_key`` — quedan en su valor terminal.
    """
    if status not in STATUSES:
        raise InvalidStatusError(status)
    conn.execute(
        "INSERT INTO agent_sessions "
        "(agent_id, subagent_type, session_id, status, output_key, "
        " started_at, updated_at, timeout_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(agent_id) DO UPDATE SET "
        "  subagent_type = excluded.subagent_type, "
        "  session_id    = excluded.session_id, "
        "  status        = CASE WHEN agent_sessions.status IN "
        "                       ('completed', 'failed') "
        "                       THEN agent_sessions.status "
        "                       ELSE excluded.status END, "
        "  output_key    = CASE WHEN agent_sessions.status IN "
        "                       ('completed', 'failed') "
        "                       THEN agent_sessions.output_key "
        "                       ELSE excluded.output_key END, "
        "  updated_at    = excluded.updated_at, "
        "  timeout_at    = excluded.timeout_at",
        (agent_id, subagent_type, session_id, status, output_key,
         started_at, updated_at, timeout_at),
    )
    conn.commit()


def update_session(conn: sqlite3.Connection,
                    agent_id: str,
                    *,
                    updated_at: str,
                    create_if_missing: bool = False,
                    **fields: object) -> str:
    """Actualización parcial — sólo toca los campos pasados en ``fields``.

    Devuelve uno de tres desenlaces:

    - ``"updated"``  — el ``agent_id`` existe y al menos un campo cambió.
    - ``"unchanged"`` — el ``agent_id`` existe pero ningún campo difería
      (``updated_at`` NO se mueve — evita mentir sobre cuándo cambió algo).
    - rehúsa con ``SessionNotFoundError`` si el ``agent_id`` no existe y no
      se pidió ``create_if_missing``.

    Rehúsa con ``UnknownColumnError`` si algún nombre en ``fields`` no es
    una columna real de ``agent_sessions`` — la validación es contra
    ``PRAGMA table_info``, nunca se interpola un nombre sin verificar.
    """
    if not fields:
        raise ValueError(
            "update_session requiere al menos un campo — sin ninguno no hay "
            "nada que discriminar entre 'updated' y 'unchanged'."
        )
    table_columns = {row["name"] for row in conn.execute("PRAGMA table_info(agent_sessions)")}
    unknown = sorted(set(fields) - table_columns)
    if unknown:
        raise UnknownColumnError(unknown)

    if create_if_missing:
        conn.execute(
            "INSERT OR IGNORE INTO agent_sessions "
            "(agent_id, subagent_type, session_id, status, started_at, updated_at) "
            "VALUES (?, ?, ?, 'running', ?, ?)",
            (agent_id,
             fields.get("subagent_type", "unknown"),
             fields.get("session_id", "unknown"),
             updated_at, updated_at),
        )

    columns = list(fields.keys())
    values = list(fields.values())
    set_sql = ", ".join(f"{col} = COALESCE(?, {col})" for col in columns)
    # `IS NOT`, nunca `<>` — `NULL <> NULL` es NULL/falso y rompería la
    # comparación de no-cambio en columnas anulables.
    dif_sql = " OR ".join(f"{col} IS NOT COALESCE(?, {col})" for col in columns)
    cur = conn.execute(
        f"UPDATE agent_sessions SET {set_sql}, updated_at = ? "
        f"WHERE agent_id = ? AND ({dif_sql})",
        (*values, updated_at, agent_id, *values),
    )
    conn.commit()
    if cur.rowcount:
        return "updated"
    exists = conn.execute(
        "SELECT 1 FROM agent_sessions WHERE agent_id = ?", (agent_id,)
    ).fetchone()
    if exists:
        return "unchanged"
    raise SessionNotFoundError(agent_id)


def list_sessions(conn: sqlite3.Connection,
                   *,
                   status: str | None = None) -> list[sqlite3.Row]:
    """Las sesiones, ordenadas por ``started_at``; filtro opcional por ``status``."""
    if status is not None and status not in STATUSES:
        raise InvalidStatusError(status)
    if status is None:
        return conn.execute(
            "SELECT * FROM agent_sessions ORDER BY started_at"
        ).fetchall()
    return conn.execute(
        "SELECT * FROM agent_sessions WHERE status = ? ORDER BY started_at",
        (status,),
    ).fetchall()


def usage_census(conn: sqlite3.Connection,
                  measure_columns: Sequence[str],
                  *,
                  source_column: str = "usage_source",
                  measured_value: str = "measured",
                  unmeasured_value: str = "unmeasured") -> dict:
    """Separa las filas en cuatro cubos con denominador declarado.

    ``Métrica:`` cuenta filas por el valor de ``source_column`` y, para las
    que no lo declaran, si TODAS las columnas de ``measure_columns`` están
    NULL a la vez (AND, nunca OR — una fila con tres NULL y una en cero SÍ
    tiene dato, y clasificarla por OR la perdería como "sin_clasificar" en
    vez de "huerfano").
    ``Ciega a:`` una fila cuyo ``source_column`` mienta sobre su origen real
    (declara ``measured_value`` sin tener datos coherentes) — el censo no
    audita coherencia entre el origen declarado y los valores presentes.
    """
    if not measure_columns:
        raise EmptyMeasureColumnsError(
            "usage_census requiere al menos una columna de medida — sin "
            "ninguna, 'sin_clasificar' y 'huerfano' no se pueden distinguir."
        )
    table_columns = {row["name"] for row in conn.execute("PRAGMA table_info(agent_sessions)")}
    missing = sorted(c for c in (*measure_columns, source_column) if c not in table_columns)
    if missing:
        raise UnknownColumnError(missing)

    total = conn.execute("SELECT COUNT(*) FROM agent_sessions").fetchone()[0]
    unmeasured_predicate = " AND ".join(f"{c} IS NULL" for c in measure_columns)

    medidos = conn.execute(
        f"SELECT COUNT(*) FROM agent_sessions WHERE {source_column} = ?",
        (measured_value,),
    ).fetchone()[0]
    no_medidos = conn.execute(
        f"SELECT COUNT(*) FROM agent_sessions WHERE {source_column} = ?",
        (unmeasured_value,),
    ).fetchone()[0]
    sin_clasificar = conn.execute(
        f"SELECT COUNT(*) FROM agent_sessions "
        f"WHERE {source_column} IS NULL AND ({unmeasured_predicate})"
    ).fetchone()[0]
    huerfanos = conn.execute(
        f"SELECT COUNT(*) FROM agent_sessions "
        f"WHERE {source_column} IS NULL AND NOT ({unmeasured_predicate})"
    ).fetchone()[0]

    aggregate = None
    if medidos:
        sums = ", ".join(f"SUM({c}) AS sum_{c}" for c in measure_columns)
        row = conn.execute(
            f"SELECT COUNT(*) AS n, {sums} FROM agent_sessions "
            f"WHERE {source_column} = ?",
            (measured_value,),
        ).fetchone()
        aggregate = {
            "n": row["n"],
            "sum": {c: row[f"sum_{c}"] for c in measure_columns},
        }

    return {
        "total": total,
        "medidos": medidos,
        "no_medidos": no_medidos,
        "sin_clasificar": sin_clasificar,
        "huerfanos": huerfanos,
        "aggregate": aggregate,
    }
