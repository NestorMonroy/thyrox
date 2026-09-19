"""Suite del undecimo detector: el idioma DENTRO de un archivo de codigo.

El control que importa no es «avisa sobre un identificador espanol» —eso
pasaria igual con y sin las dos mitades de juicio— sino que **calle** ante un
literal de cadena y ante una cita marcada. Un detector sin esas dos mitades
marca como defecto el archivo que ENSENA a evitar el antipatron, que es
exactamente lo que hacen las reglas que lo prohiben.

El control positivo NO esta fabricado: `src/task/refresh-board.sh` declara hoy
`DEGRADADO`, `RAIZ`, `SALIDA` y `VIVAS`, y ningun gate del arbol los ve — los
tres ejes de `identificadores-en-ingles.md` recorren AST de Python y un `.sh`
no tiene AST que recorrer.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys
from pathlib import Path

# El bootstrap CANONICO de thyrox (`paths.reach.BOOTSTRAP`): ascenso con
# deteccion del marcador, no `parents[N]`. La aritmetica por offset acierta a
# UNA profundidad y falla en SILENCIO al mover el archivo un nivel.
_HERE = Path(__file__).resolve()
_TREE_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _TREE_ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_TREE_ROOT / "src"))

from paths import reach  # noqa: E402

_ROOT = reach.thyrox_root()
_MODULE = _ROOT / "src/hooks/detect_code_language.py"
_spec = importlib.util.spec_from_file_location("_gate_code_language", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _detect(tool_name="Write", **tool_input):
    return gate.detect({"tool_name": tool_name, "tool_input": tool_input})


# --- control positivo REAL del repo ----------------------------------------

def test_warns_on_real_shell_file_of_this_repo():
    """El positivo no se fabrica: se cita un archivo vivo del arbol."""
    subject = _ROOT / "src/task/refresh-board.sh"
    assert subject.is_file(), f"el control positivo desaparecio: {subject}"
    notice = _detect(file_path=str(subject),
                     content=subject.read_text(encoding="utf-8"))
    assert notice is not None, "el detector no ve el positivo real del repo"
    assert "identificador en español" in notice


def test_warns_on_spanish_identifier_in_typescript():
    notice = _detect(file_path="src/foo.ts",
                     content="const salidaDeLaEjecucion = 1;\n")
    assert notice is not None
    assert "identificador en español" in notice


def test_warns_on_forbidden_form_in_a_comment():
    notice = _detect(file_path="src/foo.ts",
                     content="// una corrida del generador\nconst x = 1;\n")
    assert notice is not None
    assert "vocabulario vetado" in notice


# --- mitad de juicio 1: un literal de cadena NO es un comentario ------------

def test_stays_silent_on_forbidden_form_inside_a_string_literal():
    """El `//` va SEPARADO de la comilla a proposito.

    Pegado (`"// ...`) el lookbehind del patron ya lo silencia solo, asi que
    ese caso pasaba con y sin el descuento — un verde que no discrimina, el
    sub-patron D con este test como sujeto. Separado, el lookbehind no
    interviene y la unica causa del silencio es el descuento de literales.
    """
    notice = _detect(file_path="src/foo.ts",
                     content='const sample = "ver // una corrida";\n')
    assert notice is None or "vocabulario vetado" not in notice


# --- mitad de juicio 2: una cita marcada NO es un uso ----------------------

def test_stays_silent_on_forbidden_form_marked_as_a_citation():
    notice = _detect(file_path="src/foo.ts",
                     content="// se veta `corrida`: usar ejecucion\nconst x = 1;\n")
    assert notice is None or "vocabulario vetado" not in notice


# --- precondicion: sin lexico NO calla -------------------------------------

def test_declares_it_could_not_measure_without_the_forbidden_list(monkeypatch=None):
    original = gate.load_forbidden
    gate.load_forbidden = lambda: None
    try:
        notice = _detect(file_path="src/foo.ts", content="// hola\nconst x=1;\n")
    finally:
        gate.load_forbidden = original
    assert notice is not None, "un silencio aqui es indistinguible de «sin defectos»"
    assert "no se pudo medir" in notice


# --- alcance ---------------------------------------------------------------

def test_stays_silent_on_extensions_other_gates_already_cover():
    """`.py` lo cubre el gate de AST; `.rst` lo cubre el de prosa."""
    assert _detect(file_path="src/foo.py", content="# una corrida\n") is None
    assert _detect(file_path="doc.rst", content="una corrida\n") is None


def test_stays_silent_on_other_tools_and_empty_payload():
    assert gate.detect({"tool_name": "Bash",
                        "tool_input": {"command": "ls"}}) is None
    assert gate.detect({}) is None
    assert _detect(file_path="src/foo.ts", content="   \n") is None


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
