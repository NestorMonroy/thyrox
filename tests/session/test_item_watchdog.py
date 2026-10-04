"""El vigilante de un ítem del pool (TASK-THYROX-0931, F7).

Un worker local en CPU puede quedar girando: repite la misma llamada a
herramienta, reintenta el mismo comando entre otras, o deja de producir
eventos. `--max-turns` y `--timeout` acotan turnos y pared; no ven ninguno de
esos tres. El vigilante lee `<n>.stream.jsonl` mientras crece y, al detectar
uno, detiene la SESIÓN del ítem y deja `<n>.watchdog` con el motivo.

Contrato:
  - N llamadas idénticas CONSECUTIVAS (nombre + entrada canónica) detienen;
  - M repeticiones de la misma llamada, aunque no consecutivas, detienen;
  - una llamada distinta en medio reinicia la racha, no el total;
  - sin eventos nuevos durante S segundos, detiene; 0 lo desactiva;
  - un ítem que termina solo no deja `<n>.watchdog`.
"""
from __future__ import annotations

import json
import signal
import subprocess
import tempfile
import time
from pathlib import Path

from session.item_watchdog import Limits, ToolCallTracker, watch


def tool_use(name: str, **arguments: object) -> dict:
    return {"type": "assistant", "message": {"content": [{"type": "tool_use", "id": "x", "name": name, "input": arguments}]}}


def test_consecutive_identical_calls_breach_at_the_limit() -> None:
    tracker = ToolCallTracker(Limits(max_identical=3, max_repeats=10, idle_seconds=0))
    call = tool_use("Bash", command="python3 -m unittest")
    assert tracker.observe(call) is None
    assert tracker.observe(call) is None
    breach = tracker.observe(call)
    assert breach is not None and breach.reason == "identical-tool-call"
    assert "Bash" in breach.detail


def test_a_different_call_resets_the_streak_but_not_the_total() -> None:
    tracker = ToolCallTracker(Limits(max_identical=3, max_repeats=4, idle_seconds=0))
    test_run = tool_use("Bash", command="python3 -m unittest")
    other = tool_use("Read", file_path="slug.py")
    for event in (test_run, test_run, other, test_run, other, test_run):
        breach = tracker.observe(event)
    assert breach is not None and breach.reason == "repeated-tool-call"


def test_input_key_order_does_not_make_a_call_different() -> None:
    tracker = ToolCallTracker(Limits(max_identical=2, max_repeats=10, idle_seconds=0))
    assert tracker.observe(tool_use("Edit", file_path="a", old_string="x")) is None
    first_key_order = {"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Edit", "input": {"old_string": "x", "file_path": "a"}}]}}
    assert tracker.observe(first_key_order) is not None


def call(name: str, call_id: str, **arguments: object) -> dict:
    return {"type": "assistant", "message": {"content": [{"type": "tool_use", "id": call_id, "name": name, "input": arguments}]}}


def result(call_id: str, is_error: bool = False) -> dict:
    return {"type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": call_id, "is_error": is_error, "content": ""}]}}


# Medido (repo-code-change@1, qwen3-4b, 2026-10-04): el modelo iteraba editar →
# probar, con un Edit distinto y aplicado entre cada prueba, llegó a 6 de 7
# pruebas, y el vigilante lo detuvo por «5 en total» de la orden de pruebas.
def test_a_new_applied_edit_between_runs_is_progress_not_repetition() -> None:
    tracker = ToolCallTracker(Limits(max_identical=3, max_repeats=3, idle_seconds=0))
    for step in range(6):
        assert tracker.observe(call("Edit", f"e{step}", file_path="slug.py", old_string=f"v{step}", new_string=f"v{step + 1}")) is None
        assert tracker.observe(result(f"e{step}")) is None
        assert tracker.observe(call("Bash", f"b{step}", command="python3 -m unittest")) is None
        assert tracker.observe(result(f"b{step}", is_error=True)) is None


def test_a_refused_edit_is_not_progress() -> None:
    tracker = ToolCallTracker(Limits(max_identical=3, max_repeats=3, idle_seconds=0))
    breach = None
    for step in range(3):
        tracker.observe(call("Edit", f"e{step}", file_path="slug.py", old_string=f"missing{step}", new_string="x"))
        tracker.observe(result(f"e{step}", is_error=True))
        breach = tracker.observe(call("Bash", f"b{step}", command="python3 -m unittest"))
    assert breach is not None and breach.reason == "repeated-tool-call"


def test_reapplying_the_same_edit_is_not_progress() -> None:
    tracker = ToolCallTracker(Limits(max_identical=3, max_repeats=3, idle_seconds=0))
    forward = dict(file_path="slug.py", old_string="a", new_string="b")
    back = dict(file_path="slug.py", old_string="b", new_string="a")
    breach = None
    for step in range(3):
        for name, arguments in (("f", forward), ("k", back)):
            tracker.observe(call("Edit", f"{name}{step}", **arguments))
            tracker.observe(result(f"{name}{step}"))
            breach = breach or tracker.observe(call("Bash", f"b{name}{step}", command="python3 -m unittest"))
    assert breach is not None and breach.reason == "repeated-tool-call"


def test_events_without_tool_calls_never_breach() -> None:
    tracker = ToolCallTracker(Limits(max_identical=1, max_repeats=1, idle_seconds=0))
    assert tracker.observe({"type": "system", "subtype": "init"}) is None
    assert tracker.observe({"type": "assistant", "message": {"content": [{"type": "text", "text": "hola"}]}}) is None


def _session(seconds: float) -> subprocess.Popen:
    # setsid: el ítem del pool es líder de su sesión, y el vigilante la detiene entera.
    return subprocess.Popen(["setsid", "sleep", str(seconds)])


def test_watch_stops_the_session_and_writes_the_reason() -> None:
    with tempfile.TemporaryDirectory() as directory:
        stream, report = Path(directory, "1.stream.jsonl"), Path(directory, "1.watchdog")
        call = json.dumps(tool_use("Bash", command="ls"))
        stream.write_text(f"{call}\n{call}\n{call}\n")
        item = _session(30)
        started = time.monotonic()
        watch(item.pid, stream, report, Limits(max_identical=3, max_repeats=10, idle_seconds=0), interval=0.05)
        item.wait(timeout=5)
        assert time.monotonic() - started < 5
        assert item.returncode == -signal.SIGTERM
        assert report.read_text().startswith("identical-tool-call\t")


def test_watch_stops_an_item_that_stops_producing_events() -> None:
    with tempfile.TemporaryDirectory() as directory:
        stream, report = Path(directory, "1.stream.jsonl"), Path(directory, "1.watchdog")
        stream.write_text(json.dumps({"type": "system"}) + "\n")
        item = _session(30)
        watch(item.pid, stream, report, Limits(max_identical=3, max_repeats=10, idle_seconds=1), interval=0.05)
        item.wait(timeout=5)
        assert report.read_text().startswith("no-progress\t")


def test_an_item_that_ends_on_its_own_leaves_no_report() -> None:
    with tempfile.TemporaryDirectory() as directory:
        stream, report = Path(directory, "1.stream.jsonl"), Path(directory, "1.watchdog")
        stream.write_text("")
        item = _session(0.3)
        watch(item.pid, stream, report, Limits(max_identical=3, max_repeats=10, idle_seconds=0), interval=0.05)
        item.wait(timeout=5)
        assert not report.exists()
