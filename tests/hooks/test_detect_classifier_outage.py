"""Pruebas de ``hooks.detect_classifier_outage`` — antes de una llamada a
Bash, cuántas respuestas seguidas del clasificador de auto mode llegaron sin
veredicto.

El control positivo es la secuencia REAL de una caída medida (``window.txt``
del banco ``classifier-no-verdict-*``): 6 Bash rechazados intercalados con 30
llamadas a Read/Grep/Write/Edit que sí pasaron.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import detect_classifier_outage as gate

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "classifier_rejections"
NO_VERDICT = (FIXTURES / "transient_error.txt").read_text()
HARD = (FIXTURES / "hard_input_too_long.txt").read_text()
JUDGED = (FIXTURES / "judged_dangerous.txt").read_text()

# La ventana medida, en orden: (herramienta, resultado).
REAL_WINDOW = (
    [("Bash", "ok"), ("Bash", "nv"), ("Bash", "nv")]
    + [("Read", "ok"), ("Write", "ok"), ("Write", "ok"), ("Write", "ok")]
    + [("Bash", "nv"), ("Grep", "ok"), ("Write", "ok"), ("Write", "ok")]
    + [("Bash", "nv"), ("Read", "ok"), ("Grep", "ok")]
    + [("Bash", "nv")]
    + [("Grep", "ok")] * 6 + [("Read", "ok"), ("Grep", "ok"), ("Write", "ok"), ("Read", "ok"), ("Write", "ok")]
    + [("Bash", "nv")]
)


def _user(text):
    return {"type": "user", "message": {"role": "user", "content": text}}


def _call(i, name, outcome):
    tid = f"toolu_{i:04d}"
    content = {"nv": NO_VERDICT, "hard": HARD, "judged": JUDGED}.get(outcome, "ok")
    return [
        {"type": "assistant", "message": {"role": "assistant", "content": [
            {"type": "tool_use", "id": tid, "name": name, "input": {}}]}},
        {"type": "user", "message": {"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": tid, "content": content,
             "is_error": outcome != "ok"}]}},
    ]


def _transcript(calls, prefix=()):
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as fh:
        for e in list(prefix):
            fh.write(json.dumps(e) + "\n")
        for i, (name, outcome) in enumerate(calls):
            for e in _call(i, name, outcome):
                fh.write(json.dumps(e) + "\n")
    return fh.name


def _detect(calls, tool="Bash", prefix=()):
    return gate.detect({"tool_name": tool, "tool_input": {"command": "true"},
                        "transcript_path": _transcript(calls, prefix)})


def test_the_real_window_counts_six_in_a_row():
    notice = _detect(REAL_WINDOW)
    assert notice and f"6 de {gate.NO_VERDICT_TURN_LIMIT}" in notice, notice


def test_the_notice_points_to_the_tools_that_do_not_need_the_classifier():
    notice = _detect(REAL_WINDOW)
    for tool in ("Read", "Grep", "Glob", "Write", "Edit"):
        assert tool in notice, tool


def test_calls_that_do_not_consult_the_classifier_do_not_break_the_streak():
    calls = [("Bash", "nv"), ("Read", "ok"), ("Edit", "ok"), ("Bash", "nv")]
    notice = _detect(calls)
    assert notice and f"2 de {gate.NO_VERDICT_TURN_LIMIT}" in notice, notice


def test_a_bash_call_that_went_through_resets_the_streak():
    assert _detect([("Bash", "nv"), ("Bash", "nv"), ("Bash", "ok")]) is None


def test_a_denial_with_a_verdict_resets_the_streak():
    assert _detect([("Bash", "nv"), ("Bash", "judged")]) is None


def test_a_genuine_user_message_starts_a_new_turn():
    calls = [("Bash", "nv"), ("Bash", "nv")]
    fh = _transcript(calls)
    with open(fh, "a") as out:
        out.write(json.dumps(_user("sigue")) + "\n")
    assert gate.detect({"tool_name": "Bash", "tool_input": {}, "transcript_path": fh}) is None


def test_a_hard_failure_says_not_to_retry():
    notice = _detect([("Bash", "hard")])
    assert notice and "no reintentes" in notice.lower(), notice


def test_the_last_rejections_before_the_limit_say_how_many_remain():
    notice = _detect([("Bash", "nv")] * (gate.NO_VERDICT_TURN_LIMIT - 2))
    assert notice and "quedan 2" in notice.lower(), notice


def test_it_only_speaks_before_a_bash_call():
    assert _detect(REAL_WINDOW, tool="Read") is None
    assert _detect(REAL_WINDOW, tool="Write") is None


def test_a_bash_output_that_quotes_the_rejection_is_not_counted():
    fh = _transcript([("Bash", "nv")])
    with open(fh, "a") as out:
        out.write(json.dumps({"type": "assistant", "message": {"content": [
            {"type": "tool_use", "id": "q", "name": "Bash", "input": {}}]}}) + "\n")
        out.write(json.dumps({"type": "user", "message": {"content": [
            {"type": "tool_result", "tool_use_id": "q", "content": NO_VERDICT, "is_error": False}]}}) + "\n")
    # El `cat` que imprimió el texto pasó: corta la racha en vez de alargarla.
    assert gate.detect({"tool_name": "Bash", "tool_input": {}, "transcript_path": fh}) is None


def test_without_rejections_or_without_transcript_it_stays_silent():
    assert _detect([("Bash", "ok"), ("Read", "ok")]) is None
    assert gate.detect({"tool_name": "Bash", "tool_input": {}}) is None
    assert gate.detect({"tool_name": "Bash", "tool_input": {}, "transcript_path": "/no/such.jsonl"}) is None


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"ok   {name}")
            except AssertionError as exc:
                failures += 1
                print(f"FAIL {name}: {exc!r}")
    cases = [n for n in globals() if n.startswith("test_")]
    print(f"\n{len(cases)} caso(s); {failures} fallo(s)")
    sys.exit(1 if failures else 0)
