"""Pruebas de ``hooks.detect_edit_loop`` — el mismo archivo editado una y otra
vez dentro de un turno.

Origen: propuesta 4 del banco ``notas-ai-course-aplicables-a-thyrox-*``
(informe G1, *doom loop* de agentes largos). Medido al abrirla:
``rg -i 'doom.?loop|repeated.?edit' src`` daba 0.

El turno se lee del transcript que el cliente pasa en ``transcript_path``: el
corte es el último mensaje GENUINO del usuario, cuyo ``content`` es texto; los
``tool_result`` también llegan con ``type: user`` y no cortan nada.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import detect_edit_loop as gate  # noqa: E402


def _user(text):
    return {"type": "user", "message": {"role": "user", "content": text}}


def _result():
    return {"type": "user", "message": {"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": "x", "content": "ok"}]}}


def _tool(name, **inp):
    return {"type": "assistant", "message": {"role": "assistant", "content": [
        {"type": "tool_use", "id": "x", "name": name, "input": inp}]}}


def _transcript(entries):
    fh = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
    for e in entries:
        fh.write(json.dumps(e) + "\n")
    fh.close()
    return fh.name


def _payload(entries, name="Edit", **inp):
    return {"tool_name": name, "tool_input": inp,
            "transcript_path": _transcript(entries)}


def _edits(n, path="src/a.py"):
    out = []
    for _ in range(n):
        out += [_tool("Edit", file_path=path), _result()]
    return out


def test_warns_when_the_same_file_reaches_the_threshold():
    entries = [_user("arregla a.py")] + _edits(gate.THRESHOLD - 1)
    notice = gate.detect(_payload(entries, file_path="src/a.py"))
    assert notice and "src/a.py" in notice


def test_stays_silent_below_the_threshold():
    entries = [_user("arregla a.py")] + _edits(gate.THRESHOLD - 2)
    assert gate.detect(_payload(entries, file_path="src/a.py")) is None


def test_a_genuine_user_message_resets_the_count():
    entries = _edits(gate.THRESHOLD) + [_user("sigue")] + _edits(1)
    assert gate.detect(_payload(entries, file_path="src/a.py")) is None


def test_tool_results_do_not_reset_the_count():
    entries = [_user("x")] + _edits(gate.THRESHOLD - 1)
    assert gate.detect(_payload(entries, file_path="src/a.py")) is not None


def test_counts_sed_in_place_edits_from_bash():
    entries = [_user("x")] + [_tool("Bash", command="sed -i 's/a/b/' src/a.py"),
                              _result()] * (gate.THRESHOLD - 1)
    notice = gate.detect(_payload(entries, name="Bash",
                                  command="sed -i 's/b/c/' src/a.py"))
    assert notice and "src/a.py" in notice


def test_other_files_do_not_add_up():
    entries = [_user("x")] + _edits(gate.THRESHOLD - 1, path="src/b.py")
    assert gate.detect(_payload(entries, file_path="src/a.py")) is None


def test_without_transcript_it_stays_silent():
    assert gate.detect({"tool_name": "Edit", "tool_input": {"file_path": "a"}}) is None


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
