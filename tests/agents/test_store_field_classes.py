#!/usr/bin/env python3
"""Clasificación de campos por tabla del store compartido (TASK-THYROX-0626).

Contrato: `.claude/workbench/datos-d4-inventario-20260929T221846/README.md`
§10 — tres clases de campo por tabla (identidad, contenido de dominio,
contabilidad) y `domain_hash` como sha256 del JSON canónico del contenido de
dominio. La contabilidad (``revision``, ``updated_at``, metadatos de
migración y de merge) queda siempre fuera del hash; una tabla sin
declaración no se adivina.
"""
from __future__ import annotations

import inspect
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").exists():
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

from agents.store_field_classes import (  # noqa: E402
    TABLE_FIELD_CLASSES,
    UnknownTableError,
    domain_hash,
    field_classes,
)


def test_declared_table_exposes_its_three_field_classes():
    classes = field_classes("tasks")
    assert classes.identity == ("session_id", "task_id")
    assert "status" in classes.domain
    assert "updated_at" in classes.bookkeeping


def test_undeclared_table_raises_instead_of_guessing():
    _raises(UnknownTableError, lambda: field_classes("tabla_inexistente"))


def test_findings_history_identity_is_finding_id_not_the_local_autoincrement():
    classes = field_classes("findings_history")
    assert classes.identity == ("finding_id",)
    assert "id" not in classes.identity
    assert "id" not in classes.domain


def test_bookkeeping_fields_are_excluded_from_every_table_domain():
    for table in TABLE_FIELD_CLASSES:
        classes = field_classes(table)
        assert not set(classes.bookkeeping) & set(classes.domain)
        assert not set(classes.identity) & set(classes.domain)


def test_domain_hash_ignores_bookkeeping_differences():
    row_a = {"task_id": "t1", "session_id": "s1", "status": "completed",
              "revision": 12, "updated_at": "2026-01-01T00:00:00Z"}
    row_b = {"task_id": "t1", "session_id": "s1", "status": "completed",
              "revision": 99, "updated_at": "2099-12-31T23:59:59Z"}
    assert domain_hash("tasks", row_a) == domain_hash("tasks", row_b)


def test_domain_hash_changes_with_domain_content():
    row_running = {"task_id": "t1", "session_id": "s1", "status": "pending"}
    row_done = {"task_id": "t1", "session_id": "s1", "status": "completed"}
    assert domain_hash("tasks", row_running) != domain_hash("tasks", row_done)


def test_domain_hash_of_undeclared_table_raises():
    _raises(UnknownTableError, lambda: domain_hash("tabla_inexistente", {"x": 1}))


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
