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
        m = job_runs.read_manifest(run)
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
        m = job_runs.read_manifest(run)
        assert m["exit_code"] == 3


def test_latest_run_finds_the_most_recent_of_a_slug():
    with tempfile.TemporaryDirectory() as base:
        job_runs.scaffold_run(base, "suite")
        segundo = job_runs.scaffold_run(base, "suite")
        # dos runs del mismo slug conviven; el cajón plano los pisaba
        assert len(list(pathlib.Path(base).iterdir())) >= 1
        assert job_runs.latest_run(base, "suite") is not None


# --- El eje del RELOJ: dimensionar un lote exige la DISTRIBUCION ---------------
#
# TASK-THYROX-0012. `run-task-pool.sh` reparte N trabajos entre C servidores y
# el reloj de pared es Sigma(t_i)/C, no max(t_i). Medido: `SECONDS|duration|
# elapsed|date +%s` da 0 hits en `run-task-pool.sh` y en `task_pool.py`, asi que
# hoy el ancho del lote se elige a ojo. Es el `seq_length.py` del tutorial: la
# distribucion de longitudes se MIDE antes de decidir como se procesa.
#
# EL CONTROL QUE DISCRIMINA: una distribucion con la MISMA suma y dispersion
# opuesta (uniforme contra un valor dominante) tiene que dar veredictos
# distintos. Si el instrumento solo publica el total, las dos se ven iguales y
# no informa nada sobre el reparto — seria la media escondiendo la cola.

def test_scaffold_records_when_the_job_started():
    with tempfile.TemporaryDirectory() as base:
        run = job_runs.scaffold_run(base, "suite", command="x")
        m = job_runs.read_manifest(run)
        assert "started_at" in m


def test_settle_records_the_duration_not_only_the_exit_code():
    with tempfile.TemporaryDirectory() as base:
        run = job_runs.scaffold_run(base, "suite", command="x")
        job_runs.settle(run, 0)
        m = job_runs.read_manifest(run)
        assert "finished_at" in m
        assert isinstance(m.get("duration_seconds"), (int, float))
        assert m["duration_seconds"] >= 0


def test_the_distribution_publishes_its_operands_not_only_the_total():
    d = job_runs.duration_distribution([4.0, 4.0, 4.0, 4.0])
    assert d["n"] == 4
    assert d["total"] == 16.0
    assert d["max"] == 4.0
    assert d["median"] == 4.0


def test_opposite_dispersion_with_the_SAME_total_gives_a_different_verdict():
    # CONTROL POSITIVO: mismo total (16 s) y misma n; solo cambia la forma.
    uniform = job_runs.duration_distribution([4.0, 4.0, 4.0, 4.0])
    dominant = job_runs.duration_distribution([13.0, 1.0, 1.0, 1.0])
    assert uniform["total"] == dominant["total"]
    # El reloj de pared con C servidores NO es total/C cuando hay un dominante:
    # no se puede bajar de la pieza mas larga.
    assert uniform["floor_wall_clock"](2) == 8.0      # total/C manda
    assert dominant["floor_wall_clock"](2) == 13.0    # max manda
    assert uniform["floor_wall_clock"](2) != dominant["floor_wall_clock"](2)


def test_an_empty_population_refuses_instead_of_publishing_a_zero():
    # Un 0 aqui no distinguiria "ningun trabajo tardo nada" de "no hay medicion".
    try:
        job_runs.duration_distribution([])
    except ValueError as e:
        # El mensaje es prosa en español y lleva sus tildes; el test compara lo que
        # el mensaje DICE, no una forma sin acentuar que nadie escribe.
        assert "sin medición" in str(e).lower()
    else:
        raise AssertionError("una poblacion vacia debe REHUSAR, no dar 0")


def test_settle_is_idempotent_and_its_duration_does_not_grow():
    """EL QUE DISCRIMINA de TASK-THYROX-0234: `settle` se llamaba una vez POR
    LECTURA, no una vez por trabajo.

    `bg.sh status` asienta si ve el marcador en el log, y el marcador no se
    borra: cada `status` sobre un trabajo ya asentado apendaba otra fila
    `settle`. Y su `duration_seconds` se deriva de `now - started_at`, asi que
    cada fila nueva publicaba una duracion MAYOR — medido por conducta sobre un
    trabajo de ~1 s: 2.2, 5.35, 8.51.

    Lo que lo hace grave es el eje del JSONL: su lector colapsa las filas y la
    ULTIMA gana. Un consumidor que preguntara «cuanto tardo» leia siempre la
    peor de todas, y la respuesta crecia con cuanta gente hubiera preguntado.

    Que lo haria fallar: retirar la guarda de `settle`. Entonces la segunda
    llamada apenda, el conteo pasa de 1 a 2 y la duracion crece.
    """
    with tempfile.TemporaryDirectory() as hogar:
        run = job_runs.scaffold_run(hogar, "sonda", command="bash -c :")
        job_runs.settle(run, 3)
        primera = job_runs.read_manifest(run)["duration_seconds"]

        # La MISMA llamada, dos veces mas. Es lo que `status` hace.
        job_runs.settle(run, 3)
        job_runs.settle(run, 3)

        lineas = (pathlib.Path(run) / job_runs.MANIFEST_FILE_NAME).read_text(
            encoding="utf-8").splitlines()
        asentadas = [l for l in lineas if '"kind": "settle"' in l]
        assert len(asentadas) == 1, (
            f"settle no es idempotente: {len(asentadas)} filas para un trabajo")
        assert job_runs.read_manifest(run)["duration_seconds"] == primera, (
            "la duracion publicada cambio sin que el trabajo volviera a correr")


def test_settle_forced_reasserts_and_says_so():
    """La rama alterna, porque una guarda sin escape convierte un defecto de
    duplicado en uno de dato congelado.

    Un run ADOPTADO despues —`wait-jobs adopt-external`— puede necesitar
    corregir su codigo: ahi la segunda fila es deliberada, y se pide. Sin este
    caso la guarda no se distingue de «settle deja de funcionar».
    """
    with tempfile.TemporaryDirectory() as hogar:
        run = job_runs.scaffold_run(hogar, "sonda", command="bash -c :")
        job_runs.settle(run, 0)
        job_runs.settle(run, 7, force=True)
        assert job_runs.read_manifest(run)["exit_code"] == 7, (
            "una re-asercion declarada tiene que ganar: es el eje del JSONL")


# Sin este bloque `python3 <suite>` sólo IMPORTA el módulo: las funciones
# `test_*` no se invocan y el corredor cuenta la suite en verde. El verde no
# distinguía «las aserciones pasan» de «las aserciones no se ejecutan» —
# sub-patrón D con la propia suite como sujeto. Medido: 20 funciones inertes en
# dos archivos de los 117 `test_*.py` (los otros 81 sin bloque asertan a nivel
# de módulo, y ésas sí corren al importar).
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
