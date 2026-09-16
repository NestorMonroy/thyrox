"""Suite del gate de recorrido sin cota.

Es hermano de ``test_detect_foreground_long_command.py`` y mide OTRO eje. Aquel
pregunta **que programa** se invoca —``pytest``, ``make html``— y por eso pela
envolturas con ``command_heads``. Este pregunta **que forma** tiene el
recorrido, y la forma que costo el episodio vivia DENTRO de un heredoc::

    python3 - <<'PY'
    for db in glob.glob('/home/user/thyrox/**/*.sqlite3', recursive=True): ...
    PY

Pelado a su programa, ese comando es ``-``. Ninguna familia larga coincide y el
hermano calla con razon: no es su eje. Por eso este detector NO usa posicion de
comando — escanea el texto entero.

El control que discrimina no es «avisa ante `recursive=True`»: eso saldria
igual sobre ``src/**/*.py``, que tarda milisegundos, y un aviso que sale
siempre se aprende a ignorar. Lo que hace trabajo son las DOS condiciones
—forma **y** raiz pesada— y los descuentos.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

# Bootstrap canonico (`paths.reach.BOOTSTRAP`): ascenso con deteccion, no
# `parents[N]` — la aritmetica por offset falla en silencio al mover el archivo.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths.reach import thyrox_root  # noqa: E402

_MODULE = thyrox_root(_AQUI.parent) / "src/hooks/detect_unbounded_traversal.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
sys.modules["_gate"] = gate
_spec.loader.exec_module(gate)


def _detect(command):
    return gate.detect({"tool_input": {"command": command}})


#: El comando REAL que provoco el episodio, citado verbatim del mensaje del
#: ejecutor. No es un incumplidor fabricado: uno escrito por quien escribe el
#: patron hereda su encuadre y confirma el instrumento en vez de probarlo
#: (``hallazgo-abierto-genera-sucesor.md``).
COMANDO_REAL = """T="${THYROX_ROOT:-/home/user/thyrox}" && ls "$T/agent-results/"*.sqlite3 2>/dev/null; python3 - <<'PY'
import sqlite3, glob
for db in glob.glob('/home/user/thyrox/**/*.sqlite3', recursive=True):
    print(db)
PY"""


def test_warns_on_the_real_runaway_command():
    aviso = _detect(COMANDO_REAL)
    assert aviso is not None
    assert "bounded_scan" in aviso


def test_the_heavy_root_axis_carries_its_own_weight():
    """Misma FORMA, raiz estrecha: el aviso no sale.

    Es la anulacion del eje de raiz. Si este caso avisara, el detector seria
    un veto a `recursive=True` y no un juicio sobre el coste.
    """
    assert _detect("python3 -c \"import glob; glob.glob('src/**/*.py', recursive=True)\"") is None


def test_warns_when_the_same_shape_points_at_a_heavy_root():
    assert _detect("python3 -c \"import glob; glob.glob('/home/user/thyrox/**/*.py', recursive=True)\"") is not None


def test_the_bound_discount_carries_its_own_weight():
    """Raiz pesada + recursion, pero acotada: calla.

    Es la anulacion del descuento. Sin el, los tres comandos correctos de abajo
    avisarian igual que el defectuoso, y el aviso dejaria de informar.
    """
    assert _detect("grep -rn foo /home/user/thyrox --include='*.py'") is None
    assert _detect("find /home/user/thyrox -maxdepth 2 -name '*.json'") is None
    assert _detect("git -C /home/user/thyrox grep -n foo") is None


def test_the_timeout_discount_carries_its_own_weight():
    """El mismo comando con plazo NO gira: el coste esta acotado por arriba.

    Es el descuento que separa «sin cota» de «largo». `timeout` es coreutils y
    esta siempre, asi que es el piso disponible aunque ningun hook cargue.
    """
    assert _detect("grep -rn foo /home/user/thyrox") is not None
    assert _detect("timeout 60 grep -rn foo /home/user/thyrox") is None


def test_warns_on_an_unbounded_find_over_a_heavy_root():
    assert _detect("find /home/user/odoo-tools -name '*.py' | wc -l") is not None


def test_warns_when_the_root_comes_from_the_provider_variable():
    """`$T`/`$THYROX_ROOT` es la raiz pesada escrita de otra forma."""
    assert _detect('grep -rn foo "$THYROX_ROOT"') is not None


def test_stays_silent_on_ordinary_commands():
    assert _detect("git status --short") is None
    assert _detect("cat src/session/bounded_scan.py") is None
    assert _detect("grep -rn recursive=True .claude/rules/") is None


def test_stays_silent_without_a_command():
    assert _detect({}) is None
    assert gate.detect({}) is None
    assert gate.detect({"tool_input": {"command": "   "}}) is None


def test_the_notice_names_the_mechanism_and_the_floor():
    aviso = _detect(COMANDO_REAL)
    assert "bounded_scan" in aviso and "timeout" in aviso


def test_the_dispatcher_registry_declares_this_detector():
    _spec_d = importlib.util.spec_from_file_location(
        "_disp", thyrox_root(_AQUI.parent) / "src/hooks/pretooluse_dispatch.py")
    disp = importlib.util.module_from_spec(_spec_d)
    sys.modules["_disp"] = disp
    _spec_d.loader.exec_module(disp)
    assert "detect_unbounded_traversal" in disp.DETECTOR_NAMES
    registry, missing = disp.build_registry(disp.DETECTOR_DIR, disp.DETECTOR_NAMES)
    assert not missing, missing
    assert any(name == "detect_unbounded_traversal" for name, _ in registry)


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
