"""Pruebas de ``hooks.classifier_rejection`` — qué clase de rechazo del
clasificador de auto mode trae el texto de un ``tool_result``.

El control positivo es el texto REAL de una caída observada
(``fixtures/classifier_rejections/transient_error.txt``); los otros tres se
compusieron con las plantillas literales del binario 2.1.283 y lo declaran en
el README de la carpeta.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks.classifier_rejection import classify_rejection

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "classifier_rejections"


def _text(name):
    return (FIXTURES / name).read_text()


def test_the_observed_rejection_is_transient_with_its_cause():
    r = classify_rejection(_text("transient_error.txt"), is_error=True)
    assert r is not None and r.kind == "transient" and r.cause == "error", r


def test_a_hard_failure_is_hard_and_names_its_cause():
    r = classify_rejection(_text("hard_input_too_long.txt"), is_error=True)
    assert r is not None and r.kind == "hard", r
    assert r.cause == "the conversation is too long for the check", r


def test_temporarily_unavailable_is_transient():
    r = classify_rejection(_text("temporarily_unavailable.txt"), is_error=True)
    assert r is not None and r.kind == "transient" and r.cause == "rate-limited", r


def test_a_judged_denial_carries_a_verdict():
    r = classify_rejection(_text("judged_dangerous.txt"), is_error=True)
    assert r is not None and r.kind == "judged", r


def test_an_output_that_quotes_the_text_is_not_a_rejection():
    quoted = _text("transient_error.txt")
    # Un Bash que imprime el texto (un `cat`, un `grep` al binario) no es rechazo.
    assert classify_rejection(quoted, is_error=False) is None
    # Ni un Bash que falla y lo cita: su salida empieza por el código de salida.
    assert classify_rejection("Exit code 1\n" + quoted, is_error=True) is None
    assert classify_rejection("2667522 22058\n" + quoted, is_error=True) is None


def test_ordinary_output_is_not_a_rejection():
    for text in ("", "ok", "exit 1: no such file", "the classifier module was renamed"):
        assert classify_rejection(text, is_error=True) is None, text


def test_non_text_content_is_not_a_rejection():
    assert classify_rejection(None, is_error=True) is None
    assert classify_rejection([{"type": "text", "text": "ok"}], is_error=True) is None


def test_a_block_list_is_read_as_its_text():
    blocks = [{"type": "text", "text": _text("transient_error.txt")}]
    r = classify_rejection(blocks, is_error=True)
    assert r is not None and r.kind == "transient"


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
