"""Suite del gate de citas ``:doc:`` que no aterrizan.

Origen: TASK-DOCS-0546. Mide dos cosas que un conteo por si solo no separa:

1. que el gate **vea** una cita rota — su universo son los ``docname`` de HOY,
   no el historial: el criterio es «resuelve contra el arbol actual», no
   «existio alguna vez» (eso lo midio TASK-GEN-0635, con `git log --all`, y
   cuesta 9273 rutas por invocacion — inviable dentro de un gate);
2. que la **rama relativa** de la resolucion cargue su peso. Sin ella una cita
   relativa valida se publicaria como rota, y el gate seria un veto a la forma
   relativa en vez de un juez de destino.

Los textos citantes NO son fabricados: son los renglones reales del corpus del
consumidor, con su ruta de origen anotada — `hallazgo-abierto-genera-sucesor.md`
exige control positivo real, porque uno escrito por quien escribe el patron
hereda su encuadre.
"""
from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

_MODULE = _ROOT / "src/verify/check_doc_citations.py"
_spec = importlib.util.spec_from_file_location("_gate_doc_citations", _MODULE)
gate = importlib.util.module_from_spec(_spec)
sys.modules["_gate_doc_citations"] = gate
_spec.loader.exec_module(gate)


#: Cita ABSOLUTA rota, verbatim de
#: `kaupamex-docs: source/arquitectura-tecnica/modulos/users/index.rst:263`.
#: Su destino nunca existio en el arbol: es un UC planeado con una numeracion
#: que el corpus nunca tuvo.
BROKEN_ABSOLUTE_CITATION = "- :doc:`/requisitos/casos-uso/auth/uc-auth-01-registro-usuario`\n"

#: Cita RELATIVA rota, verbatim de
#: `source/arquitectura-tecnica/perspectivas/analisis-normalizacion-jsonfield.rst`.
BROKEN_RELATIVE_CITATION = "Ver :doc:`modelo-cart` para el detalle.\n"

#: Cita dentro de un literal en linea — MENCION, no enlace. Verbatim de
#: `source/gestion/pm/docs/iniciativas/revisar-pendientes-docs/progreso-*.rst:1297`.
CITATION_INSIDE_A_LITERAL = "El rol ``:doc:`/inexistente/jamas``` es la forma que se cita.\n"


def _tree(tmp: Path) -> Path:
    """Un consumidor sintetico: `source/` con sus docnames y `.claude/`."""
    (tmp / ".claude" / "baselines").mkdir(parents=True)
    src = tmp / "source"
    for rel in ("arquitectura-tecnica/modulos/users",
                "arquitectura-tecnica/perspectivas",
                "requisitos/casos-uso/auth"):
        (src / rel).mkdir(parents=True, exist_ok=True)
    # El docname que SI existe, y al que apunta la cita relativa valida.
    (src / "arquitectura-tecnica/perspectivas/modelo-order.rst").write_text(
        "Modelo order\n============\n", encoding="utf-8")
    (src / "arquitectura-tecnica/modulos/users/index.rst").write_text(
        "Users\n=====\n\n" + BROKEN_ABSOLUTE_CITATION, encoding="utf-8")
    (src / "arquitectura-tecnica/perspectivas/analisis-normalizacion-jsonfield.rst"
     ).write_text("JSONField\n=========\n\n" + BROKEN_RELATIVE_CITATION
                  + "Y :doc:`modelo-order` que si existe.\n", encoding="utf-8")
    (src / "requisitos/casos-uso/auth/uc-auth-01-registrar.rst").write_text(
        "UC\n==\n", encoding="utf-8")
    return tmp


def _run(cwd: Path, *args, baseline=None):
    env = dict(os.environ)
    env["THYROX_CONSUMER_ROOT"] = str(cwd)
    if baseline is not None:
        env["DOC_CITATIONS_BASELINE"] = str(baseline)
    return subprocess.run(
        [sys.executable, str(_MODULE), *args],
        cwd=str(cwd), env=env, capture_output=True, text=True)


def test_sees_the_broken_absolute_citation_from_the_real_corpus():
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        r = _run(root, "--strict", baseline=base)
        assert r.returncode == 1, r.stdout + r.stderr
        assert "requisitos/casos-uso/auth/uc-auth-01-registro-usuario" in r.stdout


def test_sees_the_broken_relative_citation_resolved_against_the_citing_directory():
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        r = _run(root, baseline=base)
        assert "arquitectura-tecnica/perspectivas/modelo-cart" in r.stdout, r.stdout


def test_a_valid_relative_citation_is_NOT_published_as_broken():
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        r = _run(root, baseline=base)
        assert "perspectivas/modelo-order" not in r.stdout, r.stdout


def test_the_relative_branch_carries_its_own_weight():
    """Anulacion: sin ella, la cita relativa VALIDA cae como rota.

    Se sustituye `resolve_target` por una version que trata todo destino como
    absoluto. Tiene que aparecer **exactamente una** rota nueva —la valida— y
    ninguna mas: las que ya estaban rotas siguen estandolo, con otro destino.
    """
    from docs import citations

    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        names = gate.docnames(root)
        files = gate.corpus(root)

        # Se indexa por el destino ESCRITO, no por el resuelto: bajo la
        # anulacion `modelo-cart` sigue rota y su destino escrito no cambia,
        # asi que la diferencia aisla la que la rama relativa sostenia.
        intact = {(citing, target) for citing, target, _, _
                  in gate.scan(files, root, names)[1]}

        original = citations.resolve_target
        try:
            citations.resolve_target = lambda target, citing: target.strip().lstrip("/")
            blanked = {(citing, target) for citing, target, _, _
                       in gate.scan(files, root, names)[1]}
        finally:
            citations.resolve_target = original

        fallen = blanked - intact
        assert len(fallen) == 1, fallen
        assert next(iter(fallen))[1] == "modelo-order", fallen


def test_a_citation_inside_a_literal_does_NOT_count():
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        (root / "source/mencion.rst").write_text(
            "Mencion\n=======\n\n" + CITATION_INSIDE_A_LITERAL, encoding="utf-8")
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        r = _run(root, baseline=base)
        assert "inexistente/jamas" not in r.stdout, r.stdout


def test_the_baseline_freezes_inherited_debt():
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        w = _run(root, "--write-baseline", baseline=base)
        assert w.returncode == 0, w.stdout + w.stderr
        r = _run(root, "--strict", baseline=base)
        assert r.returncode == 0, r.stdout + r.stderr
        assert "en baseline heredado" in r.stdout


def test_publishes_its_denominator():
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        r = _run(root, baseline=base)
        assert "alcance medido:" in r.stdout and "archivo" in r.stdout, r.stdout


def test_refuses_with_exit_2_without_source():
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        (root / ".claude" / "baselines").mkdir(parents=True)
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        r = _run(root, baseline=base)
        assert r.returncode == 2, (r.returncode, r.stdout, r.stderr)
        assert "source/" in r.stderr


def test_refuses_with_exit_2_without_a_baseline():
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        r = _run(root, baseline=root / "no-existe.txt")
        assert r.returncode == 2, (r.returncode, r.stdout, r.stderr)
        assert "NO se emite un conteo" in r.stderr


def test_the_three_exit_states_are_distinguishable():
    """0 limpio · 1 roto nuevo · 2 rehusado — el gate no colapsa dos en uno."""
    with tempfile.TemporaryDirectory() as d:
        root = _tree(Path(d))
        base = root / ".claude/baselines/doc_citations_baseline.txt"
        base.write_text("", encoding="utf-8")
        assert _run(root, "--strict", baseline=base).returncode == 1
        _run(root, "--write-baseline", baseline=base)
        assert _run(root, "--strict", baseline=base).returncode == 0
        assert _run(root, "--strict", baseline=root / "nada.txt").returncode == 2


if __name__ == "__main__":
    import traceback
    failures = 0
    for name, case in sorted(globals().items()):
        if not name.startswith("test_") or not callable(case):
            continue
        try:
            case()
            print(f"  ok    {name}")
        except Exception:
            failures += 1
            print(f"  FALLO {name}")
            traceback.print_exc()
    print(f"resumen: {failures} fallo(s)")
    raise SystemExit(1 if failures else 0)
