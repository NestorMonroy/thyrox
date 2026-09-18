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

# El bootstrap de UNA linea es la unica aritmetica que el gate admite,
# y la unica que el localizador no puede reemplazar: no se puede pedir
# `reach.thyrox_root()` antes de que `import reach` funcione.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_agent_dispatch.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _detect(prompt, description=""):
    return gate.detect({"tool_input": {"prompt": prompt,
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
