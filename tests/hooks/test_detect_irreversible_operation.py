"""Pruebas de ``hooks.detect_irreversible_operation``.

Origen: propuesta 3 de ``ai-course-notes`` (banco
``notas-ai-course-aplicables-a-thyrox-*``, informes G3 y G5): entre los
detectores de ``pretooluse_dispatch`` ninguno miraba una operación cuyo daño
no se revierte. Medido al abrirla: ``rg 'rm -rf|DROP TABLE|push --force'
src/hooks/*.py`` daba 0.

Es el primero que PIDE CONFIRMACIÓN (``ask``) en vez de sólo avisar: un aviso
llega después de que el daño ya ocurrió. Por eso su precisión importa más que
la de sus hermanos, y la mitad de estos casos son de silencio.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import detect_irreversible_operation as gate  # noqa: E402


def _bash(command: str):
    return gate.detect({"tool_name": "Bash", "tool_input": {"command": command}})


def _asks(command: str) -> bool:
    result = _bash(command)
    return isinstance(result, dict) and result.get("decision") == "ask"


def test_asks_on_git_reset_hard():
    assert _asks("git reset --hard HEAD~1")


def test_asks_on_force_push_but_not_on_lease():
    assert _asks("git push --force origin feature/x")
    assert _asks("git push -f origin feature/x")
    assert _bash("git push --force-with-lease origin feature/x") is None


def test_asks_on_git_clean_force():
    assert _asks("git clean -fdx")


def test_asks_on_removing_a_root_home_or_git_dir():
    for target in ("/", "~", "$HOME", ".git", "*", "."):
        assert _asks(f"rm -rf {target}"), target


def test_stays_silent_on_removing_a_scratch_path():
    assert _bash('rm -rf "$F"') is None
    assert _bash("rm -rf build/tmp") is None


def test_asks_on_drop_or_truncate_sent_to_a_database_client():
    assert _asks('psql -d app -c "DROP TABLE orders"')
    assert _asks("sqlite3 store.db 'TRUNCATE TABLE x'")


def test_stays_silent_when_drop_is_only_searched_for():
    assert _bash("grep -rn 'DROP TABLE' src/") is None


def test_ignores_a_heredoc_body_written_to_a_file():
    command = "cat > t.sh <<'EOF'\ngit reset --hard HEAD\nEOF"
    assert _bash(command) is None


def test_measures_each_segment_of_a_compound_command():
    assert _asks("cd repo && git reset --hard origin/main")


def test_ignores_tools_other_than_bash():
    assert gate.detect({"tool_name": "Write",
                        "tool_input": {"content": "git reset --hard"}}) is None


def test_the_notice_names_what_it_would_destroy():
    result = _bash("git reset --hard HEAD~1")
    assert "git reset --hard" in result["notice"]


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"ok   {name}")
            except AssertionError as exc:
                failures += 1
                print(f"FAIL {name}: {exc}")
    cases = [n for n in globals() if n.startswith("test_")]
    print(f"\n{len(cases)} caso(s); {failures} fallo(s)")
    sys.exit(1 if failures else 0)
