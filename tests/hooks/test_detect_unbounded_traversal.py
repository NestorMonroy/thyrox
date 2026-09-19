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
_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from paths.reach import thyrox_root  # noqa: E402

_MODULE = thyrox_root(_HERE.parent) / "src/hooks/detect_unbounded_traversal.py"
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
COMMAND_REAL = """T="${THYROX_ROOT:-/home/user/thyrox}" && ls "$T/agent-results/"*.sqlite3 2>/dev/null; python3 - <<'PY'
import sqlite3, glob
for db in glob.glob('/home/user/thyrox/**/*.sqlite3', recursive=True):
    print(db)
PY"""


def test_warns_on_the_real_runaway_command():
    warning = _detect(COMMAND_REAL)
    assert warning is not None
    assert "bounded_scan" in warning


def test_the_heavy_root_axis_carries_its_own_weight():
    """Misma FORMA LINEAL, raiz estrecha: el aviso no sale.

    Es la anulacion del eje de raiz, y sigue viva para la familia cuyo coste
    ES lineal en el tamano del subarbol. Si este caso avisara, el detector
    seria un veto a `rglob` y no un juicio sobre el coste.

    El caso que ocupaba este sitio -`glob(..., recursive=True)` sobre `src/`-
    se mudo abajo: h-thyrox-29 lo midio y NO TERMINA en 45 s, asi que su
    silencio era un falso negativo, no una anulacion.
    """
    assert _detect("python3 -c \"import pathlib; pathlib.Path('src').rglob('*.py')\"") is None
    assert _detect("grep -rn foo src/session/") is None


def test_warns_when_the_same_shape_points_at_a_heavy_root():
    assert _detect("python3 -c \"import pathlib; pathlib.Path('/home/user/thyrox').rglob('*.py')\"") is not None


def test_warns_on_a_symlink_follower_over_a_LIGHT_root():
    """La familia que sigue enlaces avisa SIN condicion de raiz.

    Control positivo REAL, no fabricado: `src/packages/agent` tiene 369
    entradas -la raiz mas ligera medida- y `glob(..., recursive=True)` no
    termina en 30 s sobre ella, mientras `rglob` la recorre en 0.01 s. El
    peso de la raiz no discrimina este fenomeno (h-thyrox-29).
    """
    warning = _detect(
        "python3 -c \"import glob; glob.glob('src/packages/agent/**/*.json', recursive=True)\""
    )
    assert warning is not None
    assert "enlaces" in warning


def test_the_symlink_family_separates_r_from_R():
    """`-r` no sigue enlaces y `-R` si — medido, no supuesto.

    Sobre un arbol con un enlace a directorio: `grep -r` da 0 hits y
    `grep -R` da 1; `find` 0 y `find -L` 1; `rg` 0 y `rg -L` 1.
    """
    assert _detect("grep -rn foo src/session/") is None
    assert _detect("grep -Rn foo src/session/") is not None
    assert _detect("find src/session -name '*.sh'") is None
    assert _detect("find -L src/session -name '*.sh'") is not None


def test_the_symlink_axis_carries_its_own_weight():
    """Anulacion de la familia nueva: sin ella, sus casos vuelven al silencio.

    Con `SYMLINK_FOLLOWING_SHAPES` vacia, los tres de abajo dejan de avisar
    porque sus raices son ligeras — que es exactamente el falso negativo que
    h-thyrox-29 midio. Los de la familia lineal NO dependen de ella.
    """
    cases_of_spin = (
        "python3 -c \"import glob; glob.glob('src/packages/agent/**/*.json', recursive=True)\"",
        "grep -Rn foo src/session/",
        "find -L src/session -name '*.sh'",
    )
    assert all(_detect(c) is not None for c in cases_of_spin)

    saved = gate.SYMLINK_FOLLOWING_SHAPES
    try:
        gate.SYMLINK_FOLLOWING_SHAPES = ()
        drops = [c for c in cases_of_spin if _detect(c) is None]
        # Caen EXACTAMENTE los tres, ni uno mas: la familia lineal sigue viva.
        assert len(drops) == 3, drops
        assert _detect("python3 -c \"import pathlib; pathlib.Path('/home/user/thyrox').rglob('*.py')\"") is not None
    finally:
        gate.SYMLINK_FOLLOWING_SHAPES = saved


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


def test_warns_on_the_shell_recursive_expansion_that_feeds_awk():
    """`awk` no recorre nada: lo caro es el `**/` que le da de comer.

    Es el caso que el detector NO veia mientras solo miraba `grep`: la familia
    de proceso que el arbol prescribe —awk, sort, cut, uniq, comm, xargs, wc—
    se vuelve cara por su ENTRADA, y la entrada es una expansion recursiva.
    """
    assert _detect("awk '{s+=$1} END{print s}' /home/user/thyrox/**/*.log") is not None
    assert _detect("wc -l /home/user/thyrox/**/*.py | sort -k1nr | head") is not None
    assert _detect("cut -f2 /home/user/odoo-tools/**/*.tsv | sort | uniq -c") is not None


def test_the_process_family_alone_is_not_the_subject():
    """Los mismos programas sobre un archivo concreto: calla.

    Marcar `awk` como familia habria avisado aqui, que es el falso positivo que
    vuelve ruido al aviso. El detector mide la fuente de la entrada.
    """
    assert _detect("awk '{s+=$1} END{print s}' /home/user/thyrox/censo.tsv") is None
    assert _detect("cut -f2 datos.tsv | sort | uniq -c | sort -k1nr") is None


def test_warns_on_an_unbounded_xargs_fed_by_find():
    assert _detect("find /home/user/thyrox -name '*.log' | xargs -P4 gzip") is not None


def test_the_ripgrep_discount_carries_its_own_weight():
    """`rg` acota por defecto — medido: 14 067 archivos contra 50 190.

    Es descuento, no ceguera: la cota existe y es automatica. Pero se RETIRA
    cuando el comando la desactiva, porque `rg --no-ignore` recorre lo mismo
    que un `grep -r` pelado.
    """
    assert _detect("rg -l patron /home/user/thyrox") is None
    assert _detect("rg --no-ignore -l patron /home/user/thyrox") is not None
    assert _detect("rg --hidden -l patron /home/user/thyrox") is not None


def test_stays_silent_on_ordinary_commands():
    assert _detect("git status --short") is None
    assert _detect("cat src/session/bounded_scan.py") is None
    assert _detect("grep -rn recursive=True .claude/rules/") is None


def test_stays_silent_without_a_command():
    assert _detect({}) is None
    assert gate.detect({}) is None
    assert gate.detect({"tool_input": {"command": "   "}}) is None


def test_the_notice_names_the_mechanism_and_the_floor():
    warning = _detect(COMMAND_REAL)
    assert "bounded_scan" in warning and "timeout" in warning


def test_the_dispatcher_registry_declares_this_detector():
    _spec_d = importlib.util.spec_from_file_location(
        "_disp", thyrox_root(_HERE.parent) / "src/hooks/pretooluse_dispatch.py")
    disp = importlib.util.module_from_spec(_spec_d)
    sys.modules["_disp"] = disp
    _spec_d.loader.exec_module(disp)
    assert "detect_unbounded_traversal" in disp.DETECTOR_NAMES
    registry, missing = disp.build_registry(disp.DETECTOR_DIR, disp.DETECTOR_NAMES)
    assert not missing, missing
    assert any(name == "detect_unbounded_traversal" for name, _ in registry)


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
