"""Suite del gate de segundo plano.

El control que importa no es «avisa cuando hay suite» —eso pasaría igual con y
sin el descuento de `ALREADY_BACKGROUND`— sino que **calle** cuando el comando
ya viaja por el mecanismo. Un detector sin ese descuento avisa en el mismo
lanzamiento que cumple la regla, y un aviso que sale siempre se ignora.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

_MODULE = pathlib.Path(__file__).resolve().parents[2] / "src/hooks/detect_foreground_long_command.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _detect(command):
    return gate.detect({"tool_input": {"command": command}})


def test_warns_on_the_bare_suite():
    aviso = _detect("bash tests/run.sh")
    assert aviso is not None
    assert "la suite" in aviso
    assert "bg.sh" in aviso


def test_names_every_family_the_command_invokes():
    aviso = _detect("make html && uv run pytest -q")
    assert "un build" in aviso and "la suite" in aviso


def test_stays_silent_when_the_command_already_uses_the_assembler():
    assert _detect("bash src/session/bg.sh start suite -- bash tests/run.sh") is None
    assert _detect("bash src/session/run-task-pool.sh --width 2 jobs.txt") is None
    assert _detect("nohup uv run pytest -q > log 2>&1 & disown") is None


def test_the_background_discount_carries_its_own_weight():
    """El caso donde `ALREADY_BACKGROUND` es lo ÚNICO que calla el aviso.

    Los tres de arriba los silencia el anclaje a posición de comando, no el
    descuento: al retirar `ALREADY_BACKGROUND` la suite seguía en verde, o sea
    que el descuento era código muerto y el control no discriminaba. La forma
    que sí lo exige es el `&` final — no es separador de segmento, así que la
    familia queda al principio del `head` y el anclaje no la ve.
    """
    assert _detect("bash tests/run.sh &") is not None   # sin disown: aún en primer plano
    assert _detect("bash tests/run.sh & disown") is None


def test_stays_silent_on_short_commands():
    assert _detect("git status --short") is None
    assert _detect("grep -rn pytest .claude/rules/") is None


def test_stays_silent_without_a_command():
    assert _detect("") is None
    assert gate.detect({}) is None
    assert gate.detect({"tool_input": {"command": None}}) is None


def test_the_dispatcher_registers_it():
    sys.path.insert(0, str(_MODULE.parent))
    import pretooluse_dispatch as dispatch

    assert "detect_foreground_long_command" in dispatch.DETECTOR_NAMES
    registry, missing = dispatch.build_registry(_MODULE.parent, dispatch.DETECTOR_NAMES)
    assert not missing, missing
    assert any(name == "detect_foreground_long_command" for name, _ in registry)


# Sin este bloque `python3 <suite>` sólo IMPORTA el módulo: las funciones
# `test_*` no se invocan y el corredor cuenta la suite en verde. El verde no
# distinguía «las aserciones pasan» de «las aserciones no se ejecutan» —
# sub-patrón D con la propia suite como sujeto. Medido: 20 funciones inertes en
# dos archivos de los 117 `test_*.py` (los otros 81 sin bloque asertan a nivel
# de módulo, y ésas sí corren al importar).
if __name__ == "__main__":
    import traceback
    _fallos = 0
    for _nombre, _caso in sorted(list(globals().items())):
        if not _nombre.startswith("test_") or not callable(_caso):
            continue
        try:
            _caso()
            print(f"  ok    {_nombre}")
        except Exception:
            _fallos += 1
            print(f"  FALLO {_nombre}")
            traceback.print_exc()
    print(f"resumen: {_fallos} fallo(s)")
    raise SystemExit(1 if _fallos else 0)
