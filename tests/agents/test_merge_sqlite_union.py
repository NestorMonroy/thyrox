#!/usr/bin/env python3
"""Merge de tres vías con conflictos explícitos (TASK-THYROX-0626).

Contrato: `.claude/workbench/datos-d4-inventario-20260929T221846/README.md`
§10 — tabla de decisión por fila, emparejada por identidad y comparada por
``domain_hash`` contra el ancestro. La igualdad de ``revision`` NO decide: lo
que decide es si el contenido de dominio cambió respecto de la base.

Cada caso nombra la fila de la tabla de decisión que ejerce. ``decide_row``
sólo ve hashes — la elección de qué lado gana el CONTENIDO real (cuando hay
que escribirlo) es responsabilidad de ``resolve_target_row``, probada aparte.
"""
from __future__ import annotations

import inspect
import sqlite3
import sys
import tempfile
from pathlib import Path
from typing import cast

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").exists():
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

from agents import store_field_classes  # noqa: E402
from agents.merge_sqlite_union import (  # noqa: E402
    Decision,
    Outcome,
    decide_row,
    merge_databases,
    resolve_target_row,
)
from agents.store_field_classes import domain_hash  # noqa: E402


def _hash(status: str) -> str:
    return domain_hash("tasks", {"task_id": "t1", "session_id": "s1", "status": status})


# --- Tabla de decisión de §10, sobre hashes puros --------------------------

def test_unchanged_on_both_sides_is_identical():
    h = _hash("pending")
    assert decide_row(h, h, h) == Decision(Outcome.IDENTICAL, "ours")


def test_only_ours_changed_wins_without_conflict():
    base, ours = _hash("pending"), _hash("completed")
    assert decide_row(base, ours, base) == Decision(Outcome.UPDATED, "ours")


def test_only_theirs_changed_wins_without_conflict():
    base, theirs = _hash("pending"), _hash("completed")
    assert decide_row(base, base, theirs) == Decision(Outcome.UPDATED, "theirs")


def test_same_modification_on_both_sides_is_not_a_conflict():
    base, edited = _hash("pending"), _hash("completed")
    assert decide_row(base, edited, edited).outcome is Outcome.UPDATED


def test_divergent_modification_is_a_conflict():
    base = _hash("pending")
    ours = _hash("completed")
    theirs = _hash("cancelled")
    assert decide_row(base, ours, theirs).outcome is Outcome.CONFLICT


def test_only_one_side_inserts():
    h = _hash("pending")
    assert decide_row(None, h, None) == Decision(Outcome.INSERTED, "ours")
    assert decide_row(None, None, h) == Decision(Outcome.INSERTED, "theirs")


def test_both_insert_same_content_once():
    h = _hash("pending")
    assert decide_row(None, h, h).outcome is Outcome.INSERTED


def test_both_insert_divergent_content_is_a_conflict():
    assert decide_row(None, _hash("pending"), _hash("completed")).outcome is Outcome.CONFLICT


def test_delete_against_no_change_deletes():
    base = _hash("pending")
    assert decide_row(base, None, base).outcome is Outcome.DELETED
    assert decide_row(base, base, None).outcome is Outcome.DELETED


def test_both_delete_is_deleted_without_conflict():
    base = _hash("pending")
    assert decide_row(base, None, None).outcome is Outcome.DELETED


def test_delete_against_change_is_a_conflict():
    base = _hash("pending")
    changed = _hash("completed")
    assert decide_row(base, None, changed).outcome is Outcome.CONFLICT
    assert decide_row(base, changed, None).outcome is Outcome.CONFLICT


# --- resolve_target_row: qué contenido aterriza en la tabla principal ------

def test_resolve_target_row_picks_the_declared_source():
    assert resolve_target_row(Decision(Outcome.UPDATED, "theirs"), "fila-nuestra", "fila-suya") == "fila-suya"
    assert resolve_target_row(Decision(Outcome.INSERTED, "ours"), "fila-nuestra", "fila-suya") == "fila-nuestra"


def test_resolve_target_row_of_deleted_is_none():
    assert resolve_target_row(Decision(Outcome.DELETED, None), "fila-nuestra", "fila-suya") is None


def test_resolve_target_row_of_conflict_keeps_ours_untouched():
    # El conflicto no reescribe la tabla principal: la fila que ya tiene
    # nuestro lado se queda, y el conflicto se registra aparte.
    assert resolve_target_row(Decision(Outcome.CONFLICT, "ours"), "fila-nuestra", "fila-suya") == "fila-nuestra"


# --- El contraejemplo de la revisión, contra el driver real ----------------
#
# base rev 11 (running); nuestro rev 13 completed (dos ediciones); suyo rev 12
# cancelled. Un `max(revision)` diría «gana nuestro»: 13 > 12. El contrato
# exige CONFLICTO porque A nunca vio la edición de B.

def _make_store(path: Path, status: str, revision: int) -> None:
    connection = sqlite3.connect(path)
    connection.execute(
        "CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY, subagent_type TEXT, "
        "session_id TEXT, status TEXT, started_at TEXT, updated_at TEXT, revision INTEGER)"
    )
    connection.execute(
        "INSERT INTO agent_sessions VALUES ('a1', 'x', 's1', ?, '2026-01-01T00:00:00Z', ?, ?)",
        (status, f"2026-01-0{revision}T00:00:00Z", revision),
    )
    connection.commit()
    connection.close()


def _three_way(tmp_path: Path) -> tuple[Path, Path, Path]:
    return tmp_path / "base.sqlite3", tmp_path / "ours.sqlite3", tmp_path / "theirs.sqlite3"


def test_revision_counterexample_is_a_conflict_not_a_max_revision_pick(tmp_path):

    ancestor, ours, theirs = _three_way(tmp_path)
    _make_store(ancestor, "running", 11)
    _make_store(ours, "completed", 13)
    _make_store(theirs, "cancelled", 12)

    reports = merge_databases(str(ancestor), str(ours), str(theirs))
    report = next(r for r in reports if r.table == "agent_sessions")
    assert report.counts[Outcome.CONFLICT] == 1

    row = sqlite3.connect(ours).execute(
        "SELECT status FROM agent_sessions WHERE agent_id = 'a1'"
    ).fetchone()
    assert row[0] == "completed"


def test_revision_counterexample_control_without_ancestor(tmp_path):
    """Control de anulación: sin ancestro (base vacía), el caso 1 cae.

    Tratada la base como vacía, las dos filas parecen inserciones nuevas de
    contenido distinto bajo la misma identidad: sigue siendo CONFLICTO, pero
    por la rama de inserción, no por la de "revisión editó dos veces sin que
    el otro lo viera" — que es justo lo que este control retira.
    """

    empty_ancestor = tmp_path / "vacio.sqlite3"
    sqlite3.connect(empty_ancestor).close()
    ours, theirs = tmp_path / "ours.sqlite3", tmp_path / "theirs.sqlite3"
    _make_store(ours, "completed", 13)
    _make_store(theirs, "cancelled", 12)

    reports = merge_databases(str(empty_ancestor), str(ours), str(theirs))
    report = next(r for r in reports if r.table == "agent_sessions")
    assert report.counts[Outcome.CONFLICT] == 1


def test_same_modification_different_bookkeeping_has_no_conflict(tmp_path):
    """Caso 2 de §10: misma modificación, contabilidad distinta -> sin conflicto."""

    ancestor, ours, theirs = _three_way(tmp_path)
    _make_store(ancestor, "running", 11)
    _make_store(ours, "completed", 12)
    _make_store(theirs, "completed", 15)

    reports = merge_databases(str(ancestor), str(ours), str(theirs))
    report = next(r for r in reports if r.table == "agent_sessions")
    assert report.counts[Outcome.CONFLICT] == 0
    assert report.counts[Outcome.UPDATED] == 1


def test_same_modification_control_with_bookkeeping_inside_hash_conflicts(tmp_path):
    """Control de anulación: con la contabilidad dentro del hash, cae el caso 2.

    Se anula la mitad de juicio metiendo ``revision`` y ``updated_at`` en el
    dominio de ``agent_sessions``; con los mismos datos del caso 2 (misma
    modificación, contabilidad distinta) el resultado pasa a CONFLICTO.
    """

    ancestor, ours, theirs = _three_way(tmp_path)
    _make_store(ancestor, "running", 11)
    _make_store(ours, "completed", 12)
    _make_store(theirs, "completed", 15)

    # El registro se declara de sólo lectura; el control lo sustituye a propósito y lo restaura.
    registry = cast(dict[str, store_field_classes.FieldClasses], store_field_classes.TABLE_FIELD_CLASSES)
    classes = registry["agent_sessions"]
    poisoned = store_field_classes.FieldClasses(
        identity=classes.identity,
        domain=classes.domain + classes.bookkeeping,
        bookkeeping=(),
    )
    registry["agent_sessions"] = poisoned
    try:
        reports = merge_databases(str(ancestor), str(ours), str(theirs))
    finally:
        registry["agent_sessions"] = classes
    report = next(r for r in reports if r.table == "agent_sessions")
    assert report.counts[Outcome.CONFLICT] == 1


def test_unknown_table_aborts_instead_of_guessing(tmp_path):

    ancestor, ours, theirs = tmp_path / "a.sqlite3", tmp_path / "o.sqlite3", tmp_path / "t.sqlite3"
    for path in (ancestor, ours, theirs):
        connection = sqlite3.connect(path)
        connection.execute("CREATE TABLE tabla_no_declarada (id TEXT PRIMARY KEY, v TEXT)")
        connection.commit()
        connection.close()

    _raises(SystemExit, lambda: merge_databases(str(ancestor), str(ours), str(theirs)))


def test_findings_history_local_id_collision_does_not_lose_a_row(tmp_path):
    """Caso de §4, ahora en verde: dos hallazgos nuevos con el MISMO ``id``
    AUTOINCREMENT local (asignado por bases independientes) conviven, porque
    la identidad real es ``finding_id``. La unión antigua perdía uno en
    silencio (§4 del banco de inventario); aquí los dos sobreviven."""

    ancestor, ours, theirs = tmp_path / "a.sqlite3", tmp_path / "o.sqlite3", tmp_path / "t.sqlite3"
    ddl = (
        "CREATE TABLE findings_history (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "finding_id TEXT NOT NULL UNIQUE, submodule TEXT NOT NULL, initiative TEXT NOT NULL, "
        "finding_type TEXT NOT NULL DEFAULT 'finding', severity TEXT, summary TEXT NOT NULL, "
        "content TEXT NOT NULL, source_ref TEXT, metadata_json TEXT, session_id TEXT, "
        "created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    )
    sqlite3.connect(ancestor).execute(ddl)
    for path, finding_id in ((ours, "H-OURS-1"), (theirs, "H-THEIRS-1")):
        connection = sqlite3.connect(path)
        connection.execute(ddl)
        connection.execute(
            "INSERT INTO findings_history (id, finding_id, submodule, initiative, summary, "
            "content, created_at, updated_at) VALUES (1, ?, 'thyrox', 'd4-a', 'r', 'c', 't0', 't0')",
            (finding_id,),
        )
        connection.commit()

    merge_databases(str(ancestor), str(ours), str(theirs))

    rows = sqlite3.connect(ours).execute("SELECT finding_id FROM findings_history").fetchall()
    assert {r[0] for r in rows} == {"H-OURS-1", "H-THEIRS-1"}


def test_conflict_keeps_both_versions_recoverable(tmp_path):

    ancestor, ours, theirs = _three_way(tmp_path)
    _make_store(ancestor, "running", 11)
    _make_store(ours, "completed", 13)
    _make_store(theirs, "cancelled", 12)

    merge_databases(str(ancestor), str(ours), str(theirs))

    connection = sqlite3.connect(ours)
    rows = connection.execute(
        "SELECT table_name, ours_json, theirs_json FROM merge_conflicts"
    ).fetchall()
    assert len(rows) == 1
    table_name, ours_json, theirs_json = rows[0]
    assert table_name == "agent_sessions"
    assert "completed" in ours_json
    assert "cancelled" in theirs_json


def _raises(expected: type[BaseException], action) -> None:
    """Falla si ``action()`` no lanza ``expected``."""
    try:
        action()
    except expected:
        return
    raise AssertionError(f"se esperaba {expected.__name__}")


def main() -> int:
    """Ejecuta cada ``test_*`` del módulo; los que declaran ``tmp_path``
    reciben un directorio temporal propio."""
    tests = [(name, fn) for name, fn in globals().items() if name.startswith("test_") and callable(fn)]
    failures = 0
    for name, fn in tests:
        try:
            if "tmp_path" in inspect.signature(fn).parameters:
                with tempfile.TemporaryDirectory() as tmp:
                    fn(Path(tmp))
            else:
                fn()
            print(f"  ok   {name}")
        except Exception as error:  # noqa: BLE001 — el runner reporta cualquier fallo del caso
            failures += 1
            print(f"  FALLO {name}: {error!r}")
    print(f"{len(tests) - failures} aprobada(s) · {failures} fallida(s) (alcance medido: {len(tests)} caso(s) de {Path(__file__).name})")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
