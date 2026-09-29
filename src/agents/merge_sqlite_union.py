#!/usr/bin/env python3
"""merge_sqlite_union.py — driver de merge de tres vías para una base SQLite versionada.

``agent_store.sqlite3`` es binario y está versionado, y dos sesiones que
corren a la vez le añaden filas distintas. Sin driver, git husmea el archivo
como binario, avisa ``Cannot merge binary files`` y deja conflicto: el árbol
se queda con **nuestro** lado y las filas del otro desaparecen sin que nadie
las nombre.

Contrato: `.claude/workbench/datos-d4-inventario-20260929T221846/README.md`
§10. La propiedad no es «determinista» sino **sin pérdida silenciosa**: si el
merge puede probar qué cambio aplicar, lo aplica; si los dos lados cambiaron
de forma incompatible, no inventa ganador — declara CONFLICTO y conserva las
dos versiones.

Un contador de ``revision`` local NO decide entre copias que evolucionaron en
paralelo (el contraejemplo de §10: base rev 11, nuestro rev 13, suyo rev 12 —
``13 > 12`` no prueba que nuestro lado incluya el cambio del otro). Lo que
decide es el ancestro común que git ya entrega como ``argv[1]``, comparado por
``domain_hash`` (``store_field_classes.py``): igual al de la base es «sin
cambio»; distinto es «cambió»; dos lados que cambiaron a hashes distintos es
conflicto, sin importar su ``revision``.

Uso — git lo invoca con los tres estados del archivo::

    merge_sqlite_union.py <ancestro> <nuestro> <suyo>

``<nuestro>`` es a la vez entrada y **destino**: git toma de ahí el resultado.

## Qué decide, y qué no

Decide, fila por fila, emparejada por la identidad que ``store_field_classes``
declara para su tabla: idéntica, insertada, actualizada, borrada o en
conflicto. Un conflicto deja la tabla principal como estaba en nuestro lado
(no inventa ganador) y registra las tres versiones —base, nuestro, suyo— en la
tabla ``merge_conflicts`` para que se resuelvan a mano; el driver sale con
código distinto de cero para que git marque el conflicto.

Aborta (exit 1, git marca conflicto) cuando el merge no está definido:

- una tabla no tiene declarada su clasificación de campos
  (``store_field_classes.UnknownTableError``) — no se adivina;
- una tabla existe en más de un lado con **columnas distintas** — hubo un
  cambio de esquema, y mezclar filas entre esquemas divergentes corrompe.

El índice FTS5 (``findings_fts`` y sus tablas sombra) no se une fila a fila:
se regenera con ``rebuild`` a partir de su tabla de contenido, ya unida.

*Métrica:* por tabla, cuántas filas cayeron en cada uno de los cinco
desenlaces (idéntica, insertada, actualizada, borrada, conflicto).
*Ciega a:* si el contenido en conflicto debía resolverse a favor de un lado
por una regla de dominio — esa decisión es de quien lee ``merge_conflicts``,
no de este driver.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path

# git invoca este archivo directo ("python3 merge_sqlite_union.py %O %A %B",
# ver install-hooks.sh), sin PYTHONPATH=src: sin esto, "agents" no resuelve.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.store_field_classes import FieldClasses, UnknownTableError, domain_hash, field_classes  # noqa: E402

#: Tablas que SQLite gestiona por su cuenta; unirlas corrompería el archivo.
INTERNAL_TABLE_PREFIX = "sqlite_"

#: Sufijos de las tablas sombra que FTS5 crea junto a cada tabla virtual.
#: No se unen fila a fila: son el índice, y se regeneran con 'rebuild'.
FTS_SHADOW_SUFFIXES = ("_data", "_idx", "_docsize", "_config", "_content")

#: Dónde queda un conflicto: las tres versiones, recuperables a mano.
CONFLICTS_TABLE = "merge_conflicts"

CONFLICTS_TABLE_DDL = f"""
CREATE TABLE IF NOT EXISTS {CONFLICTS_TABLE} (
    table_name    TEXT NOT NULL,
    identity_json TEXT NOT NULL,
    base_json     TEXT,
    ours_json     TEXT,
    theirs_json   TEXT,
    detected_at   TEXT NOT NULL
)
"""

#: Nombres de esquema con los que se ATTACHan las tres copias en la conexión
#: de trabajo. ``main`` es la propia base destino (nuestro lado).
OURS_SCHEMA = "main"
BASE_SCHEMA = "base"
THEIRS_SCHEMA = "theirs"


class Outcome(Enum):
    """Los cinco desenlaces posibles de una fila, por identidad (§10)."""

    IDENTICAL = "identical"
    INSERTED = "inserted"
    UPDATED = "updated"
    DELETED = "deleted"
    CONFLICT = "conflict"


@dataclass(frozen=True)
class Decision:
    """El desenlace de una fila y, si aplica, qué lado aporta su contenido."""

    outcome: Outcome
    #: "ours", "theirs" o None (sin fila resultante: DELETED, o CONFLICT sin
    #: fila propia). Nunca se usa para escribir directamente: lo resuelve
    #: ``resolve_target_row`` contra las filas reales.
    source: str | None


def decide_row(base_hash: str | None, ours_hash: str | None, theirs_hash: str | None) -> Decision:
    """La fila de la tabla de decisión de §10 que corresponde a estos hashes.

    ``None`` representa ausencia de la fila en ese lado (borrada, o nunca
    existió). Puro: no toca la base de datos, así que cada rama se prueba con
    literales, sin fixtures de sqlite.
    """
    if base_hash is None:
        return _decide_new_row(ours_hash, theirs_hash)
    return _decide_existing_row(base_hash, ours_hash, theirs_hash)


def _decide_new_row(ours_hash: str | None, theirs_hash: str | None) -> Decision:
    if ours_hash is None:
        return Decision(Outcome.INSERTED, "theirs")
    if theirs_hash is None:
        return Decision(Outcome.INSERTED, "ours")
    if ours_hash == theirs_hash:
        return Decision(Outcome.INSERTED, "ours")
    return Decision(Outcome.CONFLICT, "ours")


def _decide_existing_row(base_hash: str, ours_hash: str | None, theirs_hash: str | None) -> Decision:
    ours_changed = ours_hash != base_hash
    theirs_changed = theirs_hash != base_hash

    if not ours_changed and not theirs_changed:
        return Decision(Outcome.IDENTICAL, "ours")
    if ours_changed and not theirs_changed:
        return _decide_one_sided_change(ours_hash, "ours")
    if theirs_changed and not ours_changed:
        return _decide_one_sided_change(theirs_hash, "theirs")
    return _decide_both_sides_changed(ours_hash, theirs_hash)


def _decide_one_sided_change(changed_hash: str | None, side: str) -> Decision:
    if changed_hash is None:
        return Decision(Outcome.DELETED, None)
    return Decision(Outcome.UPDATED, side)


def _decide_both_sides_changed(ours_hash: str | None, theirs_hash: str | None) -> Decision:
    if ours_hash is None and theirs_hash is None:
        return Decision(Outcome.DELETED, None)
    if ours_hash is None or theirs_hash is None:
        return Decision(Outcome.CONFLICT, "ours" if ours_hash is not None else None)
    if ours_hash == theirs_hash:
        return Decision(Outcome.UPDATED, "ours")
    return Decision(Outcome.CONFLICT, "ours")


def resolve_target_row(decision: Decision, ours_row, theirs_row):
    """El contenido que debe quedar en la tabla principal tras la decisión.

    Un CONFLICTO nunca reescribe la tabla principal: su ``source`` es
    "ours" (o None si nuestro lado ya no tenía la fila) precisamente para
    dejarla como está — el conflicto se registra aparte, no se resuelve aquí.
    """
    if decision.source == "ours":
        return ours_row
    if decision.source == "theirs":
        return theirs_row
    return None


def virtual_tables(connection: sqlite3.Connection, schema: str) -> list[str]:
    """Las tablas virtuales del esquema — FTS5 y compañía."""
    rows = connection.execute(
        f"SELECT name, sql FROM {schema}.sqlite_master WHERE type = 'table'"
    ).fetchall()
    return [name for name, sql in rows if (sql or "").lstrip().upper().startswith("CREATE VIRTUAL")]


def real_tables(connection: sqlite3.Connection, schema: str) -> list[str]:
    """Las tablas que sí se unen fila a fila: ni internas, ni FTS, ni el log de conflictos."""
    rows = connection.execute(
        f"SELECT name FROM {schema}.sqlite_master WHERE type = 'table'"
    ).fetchall()
    virtual = set(virtual_tables(connection, schema))
    shadows = {f"{name}{suffix}" for name in virtual for suffix in FTS_SHADOW_SUFFIXES}
    return [
        name for (name,) in rows
        if not name.startswith(INTERNAL_TABLE_PREFIX)
        and name not in virtual
        and name not in shadows
        and name != CONFLICTS_TABLE
    ]


def table_exists(connection: sqlite3.Connection, schema: str, table: str) -> bool:
    return connection.execute(
        f"SELECT 1 FROM {schema}.sqlite_master WHERE type = 'table' AND name = ?", (table,)
    ).fetchone() is not None


def table_columns(connection: sqlite3.Connection, schema: str, table: str) -> list[str]:
    return [row[1] for row in connection.execute(f'PRAGMA {schema}.table_info("{table}")')]


def table_ddl(connection: sqlite3.Connection, schema: str, table: str) -> str:
    (ddl,) = connection.execute(
        f"SELECT sql FROM {schema}.sqlite_master WHERE type = 'table' AND name = ?", (table,)
    ).fetchone()
    return ddl


def local_sequence_column(connection: sqlite3.Connection, schema: str, table: str, identity_fields: tuple[str, ...]) -> str | None:
    """La columna INTEGER PRIMARY KEY que SQLite autonumera, si no es identidad.

    ``findings_history.id`` es la forma real: un AUTOINCREMENT local que dos
    bases independientes reparten desde 1, así que el mismo entero no
    significa la misma fila en las dos. Copiar su valor al insertar
    colisionaría con una fila ajena que llegó primero a ese número — se omite
    y SQLite asigna uno nuevo. Una columna que SÍ es la identidad declarada
    (``schema_migrations.version``) no entra aquí: ese entero sí viaja con
    significado.
    """
    primary_key_columns = [
        (row[1], row[2]) for row in connection.execute(f'PRAGMA {schema}.table_info("{table}")') if row[5]
    ]
    if len(primary_key_columns) != 1:
        return None
    name, declared_type = primary_key_columns[0]
    if name in identity_fields or (declared_type or "").strip().upper() != "INTEGER":
        return None
    return name


def validate_matching_columns(connection: sqlite3.Connection, table: str, schemas_with_table: list[str]) -> list[str]:
    """Las columnas de ``table``, si coinciden en todo lado que la tiene.

    Columnas distintas entre dos lados significan un cambio de esquema, y
    mezclar filas de esquemas divergentes corrompe: el merge no está
    definido y el driver aborta en vez de adivinar.
    """
    reference_schema = schemas_with_table[0]
    columns = table_columns(connection, reference_schema, table)
    for schema in schemas_with_table[1:]:
        if table_columns(connection, schema, table) != columns:
            raise SystemExit(
                f"merge_sqlite_union: la tabla {table!r} tiene columnas distintas en "
                f"cada lado — hubo cambio de esquema y el merge no está definido. "
                f"Se deja el conflicto para que lo resuelva una persona."
            )
    return columns


def fetch_rows(
    connection: sqlite3.Connection, schema: str, table: str, columns: list[str], identity_fields: tuple[str, ...]
) -> dict[tuple, dict]:
    """Las filas de ``table`` en ``schema``, indexadas por su identidad de dominio."""
    column_list = ", ".join(f'"{column}"' for column in columns)
    rows = {}
    for values in connection.execute(f'SELECT {column_list} FROM {schema}."{table}"'):
        row = dict(zip(columns, values))
        identity = tuple(row[field_name] for field_name in identity_fields)
        rows[identity] = row
    return rows


def hash_or_none(table: str, row: dict | None) -> str | None:
    return domain_hash(table, row) if row is not None else None


def insert_row(
    connection: sqlite3.Connection, table: str, columns: list[str], row: dict, sequence_column: str | None
) -> None:
    insertable = [column for column in columns if column != sequence_column]
    column_list = ", ".join(f'"{column}"' for column in insertable)
    placeholders = ", ".join("?" for _ in insertable)
    connection.execute(
        f'INSERT INTO {OURS_SCHEMA}."{table}" ({column_list}) VALUES ({placeholders})',
        [row[column] for column in insertable],
    )


def update_row(
    connection: sqlite3.Connection,
    table: str,
    columns: list[str],
    identity_fields: tuple[str, ...],
    row: dict,
    sequence_column: str | None,
) -> None:
    excluded = set(identity_fields) | {sequence_column}
    updatable = [column for column in columns if column not in excluded]
    assignments = ", ".join(f'"{column}" = ?' for column in updatable)
    where_clause = " AND ".join(f'"{field_name}" = ?' for field_name in identity_fields)
    values = [row[column] for column in updatable] + [row[field_name] for field_name in identity_fields]
    connection.execute(f'UPDATE {OURS_SCHEMA}."{table}" SET {assignments} WHERE {where_clause}', values)


def delete_row(connection: sqlite3.Connection, table: str, identity_fields: tuple[str, ...], identity: tuple) -> None:
    where_clause = " AND ".join(f'"{field_name}" = ?' for field_name in identity_fields)
    connection.execute(f'DELETE FROM {OURS_SCHEMA}."{table}" WHERE {where_clause}', list(identity))


def apply_target_row(
    connection: sqlite3.Connection,
    table: str,
    columns: list[str],
    identity_fields: tuple[str, ...],
    identity: tuple,
    current_row: dict | None,
    target_row: dict | None,
    sequence_column: str | None,
) -> None:
    """Deja la tabla principal como ``target_row`` exige, sin tocarla si ya lo está."""
    if target_row is None:
        if current_row is not None:
            delete_row(connection, table, identity_fields, identity)
        return
    if current_row is None:
        insert_row(connection, table, columns, target_row, sequence_column)
        return
    if target_row != current_row:
        update_row(connection, table, columns, identity_fields, target_row, sequence_column)


def record_conflict(
    connection: sqlite3.Connection,
    table: str,
    identity_fields: tuple[str, ...],
    identity: tuple,
    base_row: dict | None,
    ours_row: dict | None,
    theirs_row: dict | None,
) -> None:
    """Deja las tres versiones recuperables en ``merge_conflicts``, sin descartar ninguna."""
    identity_json = json.dumps(dict(zip(identity_fields, identity)), sort_keys=True)
    connection.execute(
        f"INSERT INTO {CONFLICTS_TABLE} "
        "(table_name, identity_json, base_json, ours_json, theirs_json, detected_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            table,
            identity_json,
            json.dumps(base_row, sort_keys=True) if base_row is not None else None,
            json.dumps(ours_row, sort_keys=True) if ours_row is not None else None,
            json.dumps(theirs_row, sort_keys=True) if theirs_row is not None else None,
            datetime.now(timezone.utc).isoformat(),
        ),
    )


@dataclass
class TableReport:
    """El conteo por desenlace de una tabla, y la identidad de cada conflicto."""

    table: str
    counts: dict[Outcome, int] = field(default_factory=lambda: {outcome: 0 for outcome in Outcome})
    conflict_identities: list[dict] = field(default_factory=list)

    def record(self, decision: Decision, identity_fields: tuple[str, ...], identity: tuple) -> None:
        self.counts[decision.outcome] += 1
        if decision.outcome is Outcome.CONFLICT:
            self.conflict_identities.append(dict(zip(identity_fields, identity)))


def merge_table(connection: sqlite3.Connection, table: str) -> TableReport:
    """Fusiona una tabla real de tres vías y devuelve su informe."""
    try:
        classes: FieldClasses = field_classes(table)
    except UnknownTableError as error:
        raise SystemExit(
            f"merge_sqlite_union: la tabla {table!r} no tiene declarada su clasificación "
            f"de campos en store_field_classes.py — el merge no adivina, se aborta."
        ) from error

    schemas_with_table = [
        schema for schema in (BASE_SCHEMA, OURS_SCHEMA, THEIRS_SCHEMA)
        if table_exists(connection, schema, table)
    ]
    columns = validate_matching_columns(connection, table, schemas_with_table)

    if not table_exists(connection, OURS_SCHEMA, table) and table_exists(connection, THEIRS_SCHEMA, table):
        connection.execute(table_ddl(connection, THEIRS_SCHEMA, table))

    sequence_column = local_sequence_column(connection, OURS_SCHEMA, table, classes.identity)

    base_rows = fetch_rows(connection, BASE_SCHEMA, table, columns, classes.identity) \
        if BASE_SCHEMA in schemas_with_table else {}
    ours_rows = fetch_rows(connection, OURS_SCHEMA, table, columns, classes.identity) \
        if table_exists(connection, OURS_SCHEMA, table) else {}
    theirs_rows = fetch_rows(connection, THEIRS_SCHEMA, table, columns, classes.identity) \
        if THEIRS_SCHEMA in schemas_with_table else {}

    report = TableReport(table)
    all_identities = set(base_rows) | set(ours_rows) | set(theirs_rows)
    for identity in sorted(all_identities):
        base_row, ours_row, theirs_row = base_rows.get(identity), ours_rows.get(identity), theirs_rows.get(identity)
        decision = decide_row(
            hash_or_none(table, base_row), hash_or_none(table, ours_row), hash_or_none(table, theirs_row)
        )
        target_row = resolve_target_row(decision, ours_row, theirs_row)
        apply_target_row(connection, table, columns, classes.identity, identity, ours_row, target_row, sequence_column)
        report.record(decision, classes.identity, identity)
        if decision.outcome is Outcome.CONFLICT:
            record_conflict(connection, table, classes.identity, identity, base_row, ours_row, theirs_row)

    return report


def rebuild_fts_indexes(connection: sqlite3.Connection) -> None:
    """El índice de texto se REGENERA, no se une: sus tablas sombra son estructura interna."""
    for virtual in virtual_tables(connection, OURS_SCHEMA):
        connection.execute(f'INSERT INTO {OURS_SCHEMA}."{virtual}"("{virtual}") VALUES (\'rebuild\')')


def merge_databases(ancestor_path: str, ours_path: str, theirs_path: str) -> list[TableReport]:
    """Fusiona ``theirs`` y ``ancestor`` dentro de ``ours``. Devuelve el informe por tabla."""
    connection = sqlite3.connect(ours_path)
    connection.execute(f"ATTACH DATABASE ? AS {BASE_SCHEMA}", (ancestor_path,))
    connection.execute(f"ATTACH DATABASE ? AS {THEIRS_SCHEMA}", (theirs_path,))
    connection.execute(CONFLICTS_TABLE_DDL)

    tables = sorted(
        set(real_tables(connection, BASE_SCHEMA))
        | set(real_tables(connection, OURS_SCHEMA))
        | set(real_tables(connection, THEIRS_SCHEMA))
    )
    reports = [merge_table(connection, table) for table in tables]

    rebuild_fts_indexes(connection)
    connection.commit()
    connection.close()
    return reports


def print_report(reports: list[TableReport]) -> int:
    """Escribe el informe por tabla a stderr. Devuelve el total de conflictos."""
    total_conflicts = 0
    for report in reports:
        counts = ", ".join(f"{outcome.value}={report.counts[outcome]}" for outcome in Outcome)
        print(f"merge_sqlite_union: {report.table}: {counts}", file=sys.stderr)
        for identity in report.conflict_identities:
            print(f"merge_sqlite_union: {report.table}: conflicto en {identity}", file=sys.stderr)
        total_conflicts += report.counts[Outcome.CONFLICT]
    return total_conflicts


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        raise SystemExit(f"uso: {argv[0]} <ancestro> <nuestro> <suyo>")

    ancestor_path, ours_path, theirs_path = argv[1:4]
    reports = merge_databases(ancestor_path, ours_path, theirs_path)
    total_conflicts = print_report(reports)
    return 1 if total_conflicts else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
