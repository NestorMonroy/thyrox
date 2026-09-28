"""Pruebas de ``session.classifier_outages`` — el censo de caídas del
clasificador de auto mode en un transcript: episodios, su duración, sus causas
y qué herramientas pasaron mientras tanto.

Los rechazos usan el texto REAL observado
(``tests/hooks/fixtures/classifier_rejections/transient_error.txt``).
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from session.classifier_outages import census, main

FIX = ROOT / "tests" / "hooks" / "fixtures" / "classifier_rejections"
NO_VERDICT = (FIX / "transient_error.txt").read_text()
HARD = (FIX / "hard_input_too_long.txt").read_text()
JUDGED = (FIX / "judged_dangerous.txt").read_text()


def _transcript(calls):
    """``calls``: (hh:mm:ss, herramienta, resultado) con resultado ok|nv|hard|judged."""
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as fh:
        for i, (clock, name, outcome) in enumerate(calls):
            ts = f"2026-09-28T{clock}.000Z"
            tid = f"toolu_{i:04d}"
            content = {"nv": NO_VERDICT, "hard": HARD, "judged": JUDGED, "quoted": NO_VERDICT}.get(outcome, "ok")
            fh.write(json.dumps({"type": "assistant", "timestamp": ts, "message": {"content": [
                {"type": "tool_use", "id": tid, "name": name, "input": {}}]}}) + "\n")
            fh.write(json.dumps({"type": "user", "timestamp": ts, "message": {"content": [
                {"type": "tool_result", "tool_use_id": tid, "content": content,
                 "is_error": outcome not in ("ok", "quoted")}]}}) + "\n")
        fh.write("{truncated line\n")
    return fh.name


TWO_EPISODES = [
    ("06:38:05", "Bash", "ok"),
    ("06:38:24", "Bash", "nv"),
    ("06:38:32", "Read", "ok"),
    ("06:38:39", "Write", "ok"),
    ("06:38:54", "Bash", "nv"),
    ("06:39:00", "Grep", "ok"),
    ("06:42:08", "Bash", "ok"),
    ("07:00:00", "Bash", "hard"),
    ("07:00:10", "Bash", "judged"),
    ("07:05:00", "Bash", "quoted"),
]


def test_episodes_are_split_by_a_bash_call_that_went_through():
    report = census(_transcript(TWO_EPISODES))
    assert [e.rejected for e in report.episodes] == [2, 1], report.episodes


def test_an_episode_carries_its_window_and_its_recovery():
    first = census(_transcript(TWO_EPISODES)).episodes[0]
    assert first.started_at == "2026-09-28T06:38:24.000Z"
    assert first.last_rejection_at == "2026-09-28T06:38:54.000Z"
    assert first.last_ok_before == "2026-09-28T06:38:05.000Z"
    assert first.recovered_at == "2026-09-28T06:42:08.000Z"
    assert first.causes == {"error": 2}
    assert first.kinds == {"transient": 2}


def test_an_episode_counts_the_tools_that_went_through_meanwhile():
    first = census(_transcript(TWO_EPISODES)).episodes[0]
    assert first.passed_meanwhile == {"Read": 1, "Write": 1, "Grep": 1}


def test_a_verdict_ends_an_episode_without_recovering_it():
    second = census(_transcript(TWO_EPISODES)).episodes[1]
    assert second.kinds == {"hard": 1}
    assert second.recovered_at is None


def test_the_denominator_is_every_bash_result():
    report = census(_transcript(TWO_EPISODES))
    assert (report.bash_results, report.no_verdict) == (7, 3)


def test_a_missing_transcript_refuses_without_a_count():
    proc = subprocess.run([sys.executable, str(ROOT / "src" / "session" / "classifier_outages.py"),
                           "/no/such/transcript.jsonl"], capture_output=True, text=True,
                          env={"PYTHONPATH": str(ROOT / "src"), "PATH": "/usr/bin:/bin"}, check=False)
    assert proc.returncode == 2, proc
    assert "no existe" in proc.stderr and proc.stdout == "", proc


def test_the_json_output_is_machine_readable():
    path = _transcript(TWO_EPISODES)
    out = subprocess.run([sys.executable, str(ROOT / "src" / "session" / "classifier_outages.py"),
                          path, "--json"], capture_output=True, text=True,
                         env={"PYTHONPATH": str(ROOT / "src"), "PATH": "/usr/bin:/bin"}, check=True).stdout
    data = json.loads(out)
    assert data["no_verdict"] == 3 and len(data["episodes"]) == 2, data


def test_the_text_report_names_the_denominator():
    path = _transcript(TWO_EPISODES)
    import io
    from contextlib import redirect_stdout
    buf = io.StringIO()
    with redirect_stdout(buf):
        assert main([path]) == 0
    assert "3 rechazo(s) sin veredicto sobre 7 resultado(s) de Bash" in buf.getvalue(), buf.getvalue()


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
