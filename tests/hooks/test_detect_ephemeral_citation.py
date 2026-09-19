"""Suite del gate de cita efímera.

Dos mitades de juicio, y las dos se prueban por anulación: retirar cada
una tiene que hacer caer EXACTAMENTE las aserciones que dependen de ella,
ni una más. Es el episodio real que lo origina (`.claude/CLAUDE.md`, Flujo
de sesión paso 4): dos commits y el banco citaron `#9`/`#10` antes de
acuñar `TASK-THYROX-0026`/`0027`.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

# El bootstrap de UNA linea es la unica aritmetica que el gate admite,
# y la unica que el localizador no puede reemplazar: no se puede pedir
# `reach.thyrox_root()` antes de que `import reach` funcione.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_ephemeral_citation.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _commit(message):
    return gate.detect({"tool_input": {"command": f'git commit -m "{message}"'}})


def _evidence(content, file_path=".claude/workbench/algo-20260913T000000/README.md"):
    return gate.detect({"tool_input": {"file_path": file_path, "content": content}})


def test_warns_on_a_bare_board_ordinal_in_a_commit_message():
    warning = _commit("Fix incomplete exports maps, T-9")
    assert warning is not None
    assert "T-9" in warning
    assert "TASK-<CAPA>-NNNN" in warning


def test_warns_on_board_hash_form():
    warning = _commit("Cierra board #9 y board #10")
    assert warning is not None
    assert "board #9" in warning and "board #10" in warning


def test_stays_silent_when_the_durable_citation_is_present_too():
    assert _commit("TASK-THYROX-0026: fix incomplete exports maps (T-9)") is None


def test_stays_silent_on_a_hash_with_no_task_word():
    """El ancla es la PALABRA, no el signo -- un issue/PR de GitHub no dispara."""
    assert _commit("Closes #9 on GitHub, see PR #10") is None


def test_the_word_anchor_carries_its_own_weight():
    """Retirar el ancla de palabra (aceptar cualquier '#N') dispara sobre texto
    que nunca habla de una tarea del board -- el control que la prueba.
    """
    unanchored = __import__("re").compile(r"#\d+")
    text = "Closes #9 on GitHub, see PR #10"
    assert unanchored.search(text) is not None          # el texto SÍ tiene "#N"
    assert gate.EPHEMERAL.search(text) is None           # el ancla real lo calla


def test_evidence_surface_fires_on_workbench_and_jobs():
    assert _evidence("Board #9 midió 12 paquetes.") is not None
    assert _evidence(
        "board #9 midió 12 paquetes.",
        file_path=".claude/jobs/suite-full-t9-20260913T182631/README.md",
    ) is not None


def test_stays_silent_outside_the_evidence_path():
    assert _evidence("board #9 midió 12 paquetes.", file_path="README.md") is None


def test_the_evidence_path_anchor_carries_its_own_weight():
    """Sin el ancla de ruta, cualquier Write con '#N'+palabra dispararía --
    incluida prosa normal que no es evidencia de sesión en absoluto.
    """
    assert gate.EVIDENCE_PATH.search("README.md") is None
    assert gate.EVIDENCE_PATH.search(".claude/workbench/x/README.md") is not None


def test_stays_silent_without_a_task_word_present():
    assert _commit("Fix the color #9F2B3C in the palette") is None


def test_stays_silent_without_command_or_content():
    assert gate.detect({}) is None
    assert gate.detect({"tool_input": {}}) is None
    assert gate.detect({"tool_input": {"command": None}}) is None
    assert gate.detect({"tool_input": {"file_path": ".claude/workbench/x/R.md", "content": None}}) is None


def test_stays_silent_on_non_commit_bash_commands():
    assert gate.detect({"tool_input": {"command": "git log --oneline -- T-9"}}) is None


def test_the_dispatcher_registers_it():
    sys.path.insert(0, str(_MODULE.parent))
    import pretooluse_dispatch as dispatch

    assert "detect_ephemeral_citation" in dispatch.DETECTOR_NAMES
    registry, missing = dispatch.build_registry(_MODULE.parent, dispatch.DETECTOR_NAMES)
    assert not missing, missing
    assert any(name == "detect_ephemeral_citation" for name, _ in registry)


if __name__ == "__main__":
    import traceback
    _failures = 0
    for _name, _case in sorted(list(globals().items())):
        if not _name.startswith("test_") or not callable(_case):
            continue
        try:
            _case()
            print(f"  ok    {_name}")
        except Exception:
            _failures += 1
            print(f"  FALLO {_name}")
            traceback.print_exc()
    print(f"resumen: {_failures} fallo(s)")
    raise SystemExit(1 if _failures else 0)
