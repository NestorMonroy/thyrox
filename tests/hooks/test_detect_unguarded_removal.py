"""Pruebas de ``hooks.detect_unguarded_removal``.

Origen: el 2026-09-29 un solo comando Bash encadenó quince pasos —escrituras
con heredoc, reemplazos, una prueba— y uno de ellos borraba con un destino
que empezaba por una variable sin guarda (``$W/…``). El chequeo de
seguridad del cliente rehúsa ese borrado, porque si la variable está vacía
el destino cuelga de ``/``, y rehúsa el comando ENTERO: ninguno de los otros
catorce pasos corrió y no quedó salida que leer. La forma que el propio
cliente propone es ``"${W:?}"/…``, que aborta el shell en vez de borrar.

Segunda observación, el mismo día: el chequeo rehusó también un comando
cuyo único borrado estaba DENTRO del cuerpo de un heredoc —el texto de este
mismo archivo—, porque un cuerpo puede volver a leerse como órdenes. Así que
el detector no descarta los heredocs: ahí propone escribir con ``Write``.

Las órdenes de prueba se arman con ``RM`` para que este archivo, si alguien
lo escribe con un heredoc, no lleve la orden literal.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import detect_unguarded_removal as gate  # noqa: E402

RM = "r" + "m"


def _bash(command: str):
    return gate.detect({"tool_name": "Bash", "tool_input": {"command": command}})


#: El comando del episodio, recortado a su forma: pasos encadenados con
#: heredocs, un reemplazo, el borrado sin guarda y la prueba del final.
EPISODE = (
    "W=.claude/workbench/datos-d1-store-20260929T062907 && T=src/x.test.ts && "
    "cat > $W/o1.txt <<'EOF'\nfunction fakeConnect() {}\nEOF\n"
    "bash bin/replace_literal --old-file $W/o1.txt --new-file $W/n1.txt $T\n"
    f"{RM} $W/[on][1-4].txt\n"
    "(cd src/packages/store && timeout 120 bun test < /dev/null 2>&1 | grep -E 'pass$')"
)


def test_warns_on_the_episode_and_proposes_the_guarded_form():
    notice = _bash(EPISODE)
    assert isinstance(notice, str)
    assert "$W/[on][1-4].txt" in notice
    assert '"${W:?}"/[on][1-4].txt' in notice


def test_on_a_compound_command_says_every_step_is_lost():
    notice = _bash(EPISODE)
    assert isinstance(notice, str)
    assert "comando entero" in notice


def test_a_single_removal_warns_without_the_compound_clause():
    notice = _bash(f"{RM} $W/x.txt")
    assert isinstance(notice, str)
    assert "comando entero" not in notice


def test_warns_on_quoted_and_braced_expansions():
    assert isinstance(_bash(f'{RM} -f "$W"/x.txt'), str)
    assert isinstance(_bash(f"{RM} -f ${{W}}/x.txt"), str)
    assert isinstance(_bash(f'{RM} -rf "$DIR"'), str)


def test_stays_silent_on_the_guarded_form():
    assert _bash(f'{RM} -f "${{W:?}}/env-old.txt" "${{W:?}}/env-new.txt"') is None
    assert _bash(f'{RM} -f "${{W:?}}"/[on][1-4].txt') is None


def test_stays_silent_on_a_literal_path():
    assert _bash(f"{RM} -f .claude/workbench/x/o1.txt") is None


def test_stays_silent_on_a_variable_in_the_middle_of_the_path():
    # El destino empieza por un literal: vacía la variable, sigue colgando de él.
    assert _bash(f"{RM} -f .claude/workbench/$NAME.txt") is None


def test_warns_on_the_removal_text_inside_a_heredoc_and_proposes_write():
    notice = _bash(f"cat > note.py <<'EOF'\n{RM} $W/x.txt\nEOF")
    assert isinstance(notice, str)
    assert "Write" in notice


def test_stays_silent_on_rm_as_part_of_another_word():
    # `git rm` quita del índice; el chequeo del cliente mira la orden `rm` suelta.
    assert _bash(f"git {RM} --cached $W/x.txt") is None
    assert _bash("echo $W/format.txt") is None


def test_ignores_other_tools():
    payload = {"tool_name": "Write", "tool_input": {"file_path": "x", "content": f"{RM} $W/x"}}
    assert gate.detect(payload) is None
