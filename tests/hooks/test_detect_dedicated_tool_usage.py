"""Suite del sexto detector: Write/Edit/Read sobre texto, cuando Bash ya podía.

El control que importa no es «avisa sobre un .py» —eso pasaría igual con y
sin las dos excepciones— sino que **calle** ante binario y ante colisión de
heredoc. Un detector sin esas dos mitades avisa incluso donde Bash no puede
cubrirlo, y ahí el aviso sería un consejo falso.
"""
from __future__ import annotations

import importlib.util
import pathlib

_MODULE = pathlib.Path(__file__).resolve().parents[2] / "src/hooks/detect_dedicated_tool_usage.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _detect(tool_name, **tool_input):
    return gate.detect({"tool_name": tool_name, "tool_input": tool_input})


def test_warns_on_write_of_plain_text():
    notice = _detect("Write", file_path="src/foo.py", content="print(1)\n")
    assert notice is not None
    assert "src/foo.py" in notice
    assert "cat >" in notice


def test_warns_on_edit_of_plain_text():
    notice = _detect("Edit", file_path="README.md",
                     old_string="a", new_string="b")
    assert notice is not None
    assert "sed -i" in notice


def test_warns_on_read_of_plain_text():
    notice = _detect("Read", file_path="src/session/bg.sh")
    assert notice is not None
    assert "sed -n" in notice


def test_stays_silent_on_binary_extension():
    """La primera excepción: Bash no produce un .png con sentido."""
    assert _detect("Write", file_path="assets/logo.png",
                   content="no importa, no se lee como texto") is None


def test_the_binary_exception_carries_its_own_weight():
    """Mismo Write, sólo cambia la extensión — si no, la excepción es muerta."""
    assert _detect("Write", file_path="assets/logo.txt", content="x") is not None
    assert _detect("Write", file_path="assets/logo.png", content="x") is None


def test_stays_silent_on_sqlite_store():
    assert _detect("Write", file_path="agent-results/agent_store.sqlite3",
                   content="binario") is None


def test_stays_silent_on_eof_collision_in_write():
    """La segunda excepción: una línea EOF a secas rompe el heredoc canónico."""
    content = "primera linea\nEOF\nsegunda linea\n"
    assert _detect("Write", file_path="src/foo.py", content=content) is None


def test_the_eof_exception_carries_its_own_weight():
    """Mismo Write, sólo cambia si el contenido trae la línea EOF."""
    assert _detect("Write", file_path="src/foo.py", content="sin colision\n") is not None
    assert _detect("Write", file_path="src/foo.py",
                   content="con\nEOF\ncolision\n") is None


def test_eof_collision_measured_in_edit_new_string_not_old_string():
    """La colisión se mide en lo que el tool ESCRIBE (new_string), no en lo
    que busca (old_string) — old_string con EOF no rompe ningún heredoc de
    escritura."""
    assert _detect("Edit", file_path="src/foo.py",
                   old_string="EOF", new_string="reemplazo limpio") is not None
    assert _detect("Edit", file_path="src/foo.py",
                   old_string="viejo", new_string="nuevo\nEOF\nresto") is None


def test_read_ignores_eof_collision_it_never_writes():
    """Read no escribe nada: una línea EOF en el archivo leído no es motivo
    para callar, porque no hay heredoc de escritura que romper."""
    assert _detect("Read", file_path="src/foo.py") is not None


def test_stays_silent_without_file_path():
    assert gate.detect({"tool_name": "Write", "tool_input": {"content": "x"}}) is None


def test_stays_silent_on_other_tools():
    assert gate.detect({"tool_name": "Bash",
                        "tool_input": {"command": "ls"}}) is None
    assert gate.detect({"tool_name": "NotebookEdit",
                        "tool_input": {"notebook_path": "x.ipynb"}}) is None


def test_stays_silent_on_empty_payload():
    assert gate.detect({}) is None
    assert gate.detect(None) is None


if __name__ == "__main__":
    import sys
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
