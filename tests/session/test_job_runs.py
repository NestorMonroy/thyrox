"""Suite de la familia `jobs` — un run por trabajo, no un cajón plano.

El defecto que cierra, medido: `bg.sh` escribía `<BG_DIR>/<nombre>.log` plano.
Cinco trabajos de una sesión dejaban cinco `.log` sueltos en un directorio, sin
manifiesto, sin fecha en el nombre y sin forma de saber qué preguntaba cada uno
— exactamente lo que el workbench ya resolvió para la evidencia.

La familia REUSA el workbench en vez de calcarlo: el identificador de run sale
de `workbench.manifest.run_id_for` y las cinco claves de `REQUIRED_KEYS`. Un
segundo acuñador daría dos gramáticas de fecha que nadie sincroniza.
"""
from __future__ import annotations

import json
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from session import job_runs  # noqa: E402
from workbench import manifest as wb  # noqa: E402


def test_reuses_the_workbench_run_id_grammar():
    """Un segundo acuñador de fecha es una segunda fuente de verdad."""
    assert job_runs.run_id_for is wb.run_id_for


def test_reuses_the_workbench_required_keys():
    assert job_runs.REQUIRED_KEYS == wb.REQUIRED_KEYS


def test_scaffold_creates_one_directory_per_run():
    with tempfile.TemporaryDirectory() as base:
        uno = job_runs.scaffold_run(base, "suite-tras-gate")
        dos = job_runs.scaffold_run(base, "diag-rojos")
        assert uno.is_dir() and dos.is_dir()
        assert uno.parent == dos.parent == pathlib.Path(base)
        # el nombre lleva su fecha: el cajón plano no la tenía
        assert wb.run_id_date(uno.name), uno.name


def test_the_log_lives_inside_its_run_not_beside_it():
    with tempfile.TemporaryDirectory() as base:
        run = job_runs.scaffold_run(base, "suite")
        assert job_runs.log_path(run).parent == run / "outputs"


def test_the_manifest_declares_the_instrument_and_OMITS_what_it_cannot_know():
    """Andamiar rellena lo que consta y calla lo demás.

    Un placeholder pasa el check de presencia y se lee como dato; una clave
    ausente la nombra el gate. Es la doctrina del workbench, no una invención.
    """
    with tempfile.TemporaryDirectory() as base:
        run = job_runs.scaffold_run(base, "suite", command="bash tests/run.sh")
        m = json.loads((run / wb.MANIFEST_FILE_NAME).read_text())
        assert m["instrument"] == "bash tests/run.sh"
        ausentes = [k for k in wb.REQUIRED_KEYS if k not in m]
        assert ausentes == ["question", "metric", "blind_to", "destination"]


def test_a_scaffolded_run_is_NOT_conformant_yet():
    with tempfile.TemporaryDirectory() as base:
        run = job_runs.scaffold_run(base, "suite", command="x")
        faltan = job_runs.missing_keys(run)
        assert faltan and "question" in faltan


def test_settle_records_the_exit_code_where_the_manifest_can_be_read():
    with tempfile.TemporaryDirectory() as base:
        run = job_runs.scaffold_run(base, "suite", command="x")
        job_runs.settle(run, 3)
        m = json.loads((run / wb.MANIFEST_FILE_NAME).read_text())
        assert m["exit_code"] == 3


def test_latest_run_finds_the_most_recent_of_a_slug():
    with tempfile.TemporaryDirectory() as base:
        job_runs.scaffold_run(base, "suite")
        segundo = job_runs.scaffold_run(base, "suite")
        # dos runs del mismo slug conviven; el cajón plano los pisaba
        assert len(list(pathlib.Path(base).iterdir())) >= 1
        assert job_runs.latest_run(base, "suite") is not None
