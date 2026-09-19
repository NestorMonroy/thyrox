"""Suite del gate de posible duplicación de tema entre raíces de ``pm/``.

Dos mitades de juicio, cada una probada por anulación: retirarla tiene que
hacer caer EXACTAMENTE las aserciones que dependen de ella.

1. El ancla de identificador CON GUION BAJO (``TOKEN``) — sin ella, jerga
   del repo (``MEDIA``, ``RESUELTO``) dispararía sobre cualquier par de
   archivos.
2. El tope de frecuencia (``FREQUENCY_CAP``) — sin él, un identificador
   transversal (``THYROX_ROOT``) se reportaría como duplicación en cada
   hallazgo nuevo que lo mencione.

El árbol es SINTÉTICO (``tmp_path``-style vía ``tempfile``), no el corpus
real — así la suite no depende de que ``kaupamex-docs`` esté clonado junto a
``thyrox``, y el caso real que originó el gate (``H-THYROX-03`` vs
``H-THYROX-01``/``02``) se reproduce a escala reducida como control positivo.
"""
from __future__ import annotations

import importlib.util
import pathlib
import shutil
import sys
import tempfile

# El bootstrap de UNA linea es la unica aritmetica que el gate admite,
# y la unica que el localizador no puede reemplazar: no se puede pedir
# `reach.thyrox_root()` antes de que `import reach` funcione.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_topic_duplication.py"
sys.path.insert(0, str(_MODULE.parents[1]))  # para que su propio import de "hooks.*" resuelva
_spec = importlib.util.spec_from_file_location("_gate_dup", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _tree_synthetic() -> pathlib.Path:
    """Reproduce el caso real a escala reducida: dos iniciativas de 'thyrox',
    una con el identificador ya documentado, otra escribiendo el hallazgo nuevo.
    """
    root = pathlib.Path(tempfile.mkdtemp()) / "pm"
    old = root / "thyrox/iniciativas/verificar-hogares-de-sesion-thyrox/hallazgos"
    old.mkdir(parents=True)
    (old / "hallazgo-H-THYROX-01-algo.rst").write_text(
        "H-THYROX-01 -- algo\n====================\n\n"
        "Declara THYROX_WORKBENCH_DIR aqui, distinto del titulo nuevo.\n",
        encoding="utf-8",
    )
    # Un identificador transversal, presente en MUCHOS archivos -- para el
    # control de anulación del tope de frecuencia.
    for i in range(8):
        other = root / f"thyrox/iniciativas/otra-iniciativa-{i}/hallazgos"
        other.mkdir(parents=True)
        (other / f"hallazgo-H-THYROX-{90+i}-x.rst").write_text(
            "H-THYROX-9X -- x\n================\n\nMenciona THYROX_ROOT de paso.\n",
            encoding="utf-8",
        )
    return root


def _clean(root: pathlib.Path) -> None:
    shutil.rmtree(root.parent, ignore_errors=True)


def test_finds_a_duplicate_identifier_in_another_initiative():
    root = _tree_synthetic()
    try:
        hits = gate.find_duplicates(
            ["THYROX_WORKBENCH_DIR"], root, exclude_dir_name="nueva-iniciativa"
        )
        assert "THYROX_WORKBENCH_DIR" in hits
        assert any("H-THYROX-01" in f for f in hits["THYROX_WORKBENCH_DIR"])
    finally:
        _clean(root)


def test_excludes_the_initiative_being_written_into():
    root = _tree_synthetic()
    try:
        # El propio archivo nuevo, dentro de SU iniciativa, no debe contarse.
        own = root / "thyrox/iniciativas/nueva-iniciativa/hallazgos"
        own.mkdir(parents=True)
        (own / "hallazgo-H-THYROX-99-nuevo.rst").write_text(
            "H-THYROX-99 -- nuevo\n====================\n\nTHYROX_WORKBENCH_DIR otra vez.\n",
            encoding="utf-8",
        )
        hits = gate.find_duplicates(
            ["THYROX_WORKBENCH_DIR"], root, exclude_dir_name="nueva-iniciativa"
        )
        assert all("nueva-iniciativa" not in f for f in hits.get("THYROX_WORKBENCH_DIR", []))
    finally:
        _clean(root)


def test_a_pervasive_token_is_dropped_by_the_frequency_cap():
    root = _tree_synthetic()
    try:
        hits = gate.find_duplicates(["THYROX_ROOT"], root, exclude_dir_name="nueva-iniciativa")
        assert "THYROX_ROOT" not in hits  # 8 archivos > FREQUENCY_CAP (5)
    finally:
        _clean(root)


def test_the_frequency_cap_carries_its_own_weight():
    """Control de anulación: sin el tope, THYROX_ROOT SÍ aparecería -- en los 8."""
    root = _tree_synthetic()
    try:
        without_cap: dict[str, list[str]] = {}
        for rst in root.glob("*/iniciativas/*/**/*.rst"):
            if "nueva-iniciativa" in rst.parts:
                continue
            if "THYROX_ROOT" in rst.read_text(encoding="utf-8"):
                without_cap.setdefault("THYROX_ROOT", []).append(str(rst))
        assert len(without_cap["THYROX_ROOT"]) == 8
        assert len(without_cap["THYROX_ROOT"]) > gate.FREQUENCY_CAP
    finally:
        _clean(root)


def test_bare_repo_jargon_is_not_a_candidate_token():
    """RESUELTO/MEDIA no llevan guion bajo -- TOKEN los ignora sin lista de parada."""
    text = "Estado: RESUELTO. Severidad: MEDIA. Ver CLAUDE.md y README."
    assert gate._candidate_tokens(text) == []


def test_the_underscore_anchor_carries_its_own_weight():
    """Control de anulación: un patrón sin guion bajo SÍ capturaría la jerga."""
    without_anchor = __import__("re").compile(r"[A-Z][A-Z0-9]{4,}")
    text = "Estado: RESUELTO. Severidad: MEDIA."
    assert without_anchor.findall(text) == ["RESUELTO", "MEDIA"]
    assert gate.TOKEN.findall(text) == []


def test_candidate_tokens_deduplicates_preserving_order():
    text = "THYROX_ROOT y otra vez THYROX_ROOT, y ahora THYROX_JOBS_DIR."
    assert gate._candidate_tokens(text) == ["THYROX_ROOT", "THYROX_JOBS_DIR"]


def test_detect_stays_silent_without_content():
    assert gate.detect({}) is None
    assert gate.detect({"tool_input": {}}) is None
    assert gate.detect({"tool_input": {"content": None}}) is None
    assert gate.detect({"tool_input": {"old_string": "x", "new_string": "y"}}) is None


def test_detect_stays_silent_outside_to_finding_path():
    payload = {"tool_input": {
        "file_path": "source/gestion/pm/thyrox/iniciativas/x/index.rst",
        "content": "THYROX_WORKBENCH_DIR en cualquier lado.",
    }}
    assert gate.detect(payload) is None


def test_detect_stays_silent_without_candidate_tokens():
    payload = {"tool_input": {
        "file_path": "source/gestion/pm/thyrox/iniciativas/x/hallazgos/hallazgo-H-THYROX-05-y.rst",
        "content": "Prosa sin ningun identificador en mayusculas con guion bajo.",
    }}
    assert gate.detect(payload) is None


def test_the_path_anchor_reuses_detect_finding_layer_pattern():
    """No se recompone el ancla -- se importa la del gate hermano."""
    from hooks.detect_finding_layer import PATTERN as hermano
    assert gate.PATTERN is hermano


def test_the_dispatcher_registers_it():
    sys.path.insert(0, str(_MODULE.parent))
    import pretooluse_dispatch as dispatch

    assert "detect_topic_duplication" in dispatch.DETECTOR_NAMES
    registry, missing = dispatch.build_registry(_MODULE.parent, dispatch.DETECTOR_NAMES)
    assert not missing, missing
    assert any(name == "detect_topic_duplication" for name, _ in registry)


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
