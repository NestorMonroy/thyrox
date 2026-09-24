"""Suite del gate de despacho: ¿proceso o agente?

El control que importa no es «avisa cuando el prompt nombra una suite» —eso
pasaría igual con y sin la mitad de juicio— sino que **calle** cuando el
trabajo descrito exige decidir algo. Un detector sin esa mitad avisa en todo
despacho que mencione un comando, incluido el análisis que sí necesita un
agente, y un aviso que sale siempre se aprende a ignorar.
"""
from __future__ import annotations

import importlib.util
import json
import pathlib
import sys
from pathlib import Path

# El bootstrap CANONICO de thyrox (`paths.reach.BOOTSTRAP`): ascenso con
# deteccion del marcador, no `parents[N]`. La aritmetica por offset acierta a
# UNA profundidad y falla en SILENCIO al mover el archivo un nivel.
_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_agent_dispatch.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _detect(prompt, description=""):
    return gate.detect({"tool_name": "Agent",
                        "tool_input": {"prompt": prompt,
                                       "description": description,
                                       "subagent_type": "general-purpose"}})


def test_warns_when_the_dispatched_work_is_a_suite():
    notice = _detect("Corre `bash tests/run.sh` y reporta el conteo final.")
    assert notice is not None
    assert "una suite" in notice
    assert "bg.sh" in notice


def test_names_every_deterministic_family_the_prompt_invokes():
    notice = _detect("Corre el gate thyrox-audit y luego make html; "
                     "reporta los dos exit codes.")
    assert "un gate" in notice and "un build" in notice


def test_stays_silent_when_the_work_needs_judgment():
    """La mitad que carga el peso: el trabajo ancho sí es para un agente."""
    assert _detect(
        "Corre el gate check_porte_completo sobre los 22 archivos y DECIDE "
        "cuáles de los ausentes son divergencia de mecanismo declarada."
    ) is None


def test_the_judgment_half_carries_its_own_weight():
    """El caso donde el juicio es lo ÚNICO que calla el aviso.

    Mismo trabajo determinista que el primer caso, con una sola cláusula de
    juicio añadida. Si el detector midiera sólo las familias deterministas,
    este caso avisaría igual que aquél y la mitad de juicio sería código
    muerto — el sub-patrón D con el propio gate como sujeto.
    """
    deterministic = "Corre `bash tests/run.sh` y reporta el conteo final."
    assert _detect(deterministic) is not None
    assert _detect(deterministic + " Evalúa qué rojos son regresión.") is None


def test_the_real_captured_payload_stays_silent():
    """El unico caso cuyo texto NO lo escribio quien escribio el patron.

    `fixtures/agent_dispatch_orm.json` es el payload REAL de un despacho,
    guardado en `32026b27` con esta razon en su propio cuerpo: *"Its positive
    control must be the real payload of the dispatch that motivated it, not
    one written by whoever writes the pattern"*. La suite que lo siguio
    fabrica sus siete casos y **nunca lo lee**, asi que la exigencia que ese
    commit declaro no llego a ejercerse.

    Y al leerlo se ve que NO es un control positivo: el detector calla sobre
    el, y calla **bien** — el prompt pide sintetizar, derivar un orden y
    declarar DESCONOCIDO, que es juicio. Es un control NEGATIVO, y vale mas
    que el fabricado de arriba porque sus verbos de juicio van enterrados en
    un prompt real que ademas nombra trabajo mecanico (`python3 -c`, censos,
    el pre-commit). Un detector que midiera solo las familias deterministas
    avisaria aqui.
    """
    payload = json.loads(
        (pathlib.Path(__file__).resolve().parent
         / "fixtures/agent_dispatch_orm.json").read_text(encoding="utf-8"))
    assert gate.detect(payload) is None
    # Y que su silencio lo produce la mitad de juicio, no la ausencia de
    # familias: el texto SI nombra trabajo determinista.
    assert gate.needs_judgment(gate.dispatched_text(payload["tool_input"]))


def test_stays_silent_on_a_payload_without_prompt():
    """El despachador invoca a todos los detectores en cada matcher.

    Un `Bash` o un `Write` no traen `prompt`: el detector calla en vez de
    romper a sus compañeros.
    """
    assert gate.detect({"tool_input": {"command": "bash tests/run.sh"}}) is None
    assert gate.detect({"tool_input": {"file_path": "a.py"}}) is None
    assert gate.detect({}) is None


def test_reads_the_description_too_not_only_the_prompt():
    assert _detect("Haz lo que dice el título.",
                   description="barrido de los identificadores") is not None


def test_the_notice_states_the_measured_cost_asymmetry():
    notice = _detect("Corre `uv run pytest -q` y dame el resultado.")
    assert "126 029" in notice
    assert "cero" in notice.lower()



def test_stays_silent_on_a_bash_call_with_description():
    """Un `Bash` trae `description`, y esa descripcion no es un despacho.

    Medido 2026-09-24 al cablear `PreToolUse`: el aviso salio sobre una llamada
    a `Bash` cuya descripcion decia «suite». El detector mide el tool `Agent`.
    """
    assert gate.detect({"tool_name": "Bash",
                        "tool_input": {"command": "bash tests/run.sh",
                                       "description": "Run the suite"}}) is None


def test_suggests_the_headless_pool_for_judgment_over_many_items():
    """La tercera forma: juicio SI, pero uno por item independiente.

    Leer N notas y extraer sus conceptos exige un modelo en cada una y no
    necesita ni el contexto del orquestador ni su anchura de subagentes: es
    `bin/headless-pool`, una conversacion `claude -p` por item con GNU Parallel.
    """
    notice = _detect("Para cada una de las 365 notas, analiza y extrae sus conceptos")
    assert notice is not None and "headless-pool" in notice


def test_judgment_on_a_single_subject_stays_silent():
    """Sin anchura, el juicio es para un agente, como antes."""
    assert _detect("Analiza el diseno del motor de hooks y recomienda") is None

if __name__ == "__main__":
    import sys
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
