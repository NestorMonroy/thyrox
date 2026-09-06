"""Pruebas de ``gates.check_consumer_anchor`` — el ancla que sale del árbol.

Lo que estas pruebas fijan NO es «cuenta parents[N]»: es que el veredicto se
emita por el EFECTO de la aritmética (a dónde apunta desde el archivo que la
escribe) y no por el literal ni por un umbral sobre N. La diferencia es la que
el defecto original explotaba: `parents[3]` desde `src/gates/` sale del árbol y
desde `src/packages/harness/src/` no.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parents[2]
GATE = ROOT / "src" / "gates" / "check_consumer_anchor.py"

sys.path.insert(0, str(ROOT / "src" / "gates"))
import check_consumer_anchor as gate  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def fake_tree(tmp: pathlib.Path, body: str) -> pathlib.Path:
    """Un árbol con la MISMA profundidad que thyrox: raíz/src/<pkg>/<file>.py."""
    pkg = tmp / "src" / "gates"
    pkg.mkdir(parents=True)
    (pkg / "probe.py").write_text(body, encoding="utf-8")
    return tmp


print("== 1. el árbol real está en cero ==")
found, measured = gate.measure(ROOT)
check("ninguna ancla sale del árbol", [], found)
check("y midió archivos (un 0 aquí sería un verde ciego)", True, measured > 0)

print("== 2. CONTROL POSITIVO — la forma REAL que el árbol tenía ==")
# No es un incumplidor fabricado: es la línea verbatim que
# `check_rst_convenciones.py:66` llevaba antes del arreglo.
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(pathlib.Path(d).resolve(),
                    "import pathlib\n"
                    "RAIZ = pathlib.Path(__file__).resolve().parents[3] / 'source'\n")
    found, _ = gate.measure(tmp)
    check("lo ve", 1, len(found))
    check("y nombra el nivel, no sólo el archivo", True,
          found and found[0].endswith(":2:3"))

print("== 3. el bootstrap a `src/` NO se marca: ancla al proveedor ==")
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(pathlib.Path(d).resolve(),
                    "import pathlib, sys\n"
                    "sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))\n")
    found, _ = gate.measure(tmp)
    check("parents[1] desde src/<pkg>/ se queda dentro", [], found)

print("== 4. el veredicto es por EFECTO, no por umbral sobre N ==")
# Mismo `parents[3]`, un nivel más hondo: NO sale del árbol. Un gate con umbral
# marcaría los dos y estaría midiendo el literal.
with tempfile.TemporaryDirectory() as d:
    tmp = pathlib.Path(d).resolve()
    hondo = tmp / "src" / "packages" / "harness" / "src"
    hondo.mkdir(parents=True)
    (hondo / "probe.py").write_text(
        "import pathlib\nX = pathlib.Path(__file__).resolve().parents[3]\n",
        encoding="utf-8")
    found, _ = gate.measure(tmp)
    check("mismo parents[3], más hondo, NO se marca", [], found)

print("== 5. la mención en PROSA no es un uso ==")
with tempfile.TemporaryDirectory() as d:
    tmp = fake_tree(pathlib.Path(d).resolve(),
                    '"""Antes salía de `parents[3]`, que describía otro árbol."""\n'
                    "# la aritmética `parents[3]` se retiró aquí\n")
    found, _ = gate.measure(tmp)
    check("el docstring que documenta el retiro no cuenta", [], found)

print("== 6. sin árbol que medir REHÚSA — no publica un cero ==")
with tempfile.TemporaryDirectory() as d:
    proc = subprocess.run([sys.executable, str(GATE), "--root", d],
                          capture_output=True, text=True)
    check("exit 2", 2, proc.returncode)
    check("y NO emite conteo en stdout", "", proc.stdout.strip())

print("== 7. --strict sólo falla con anclas NUEVAS ==")
proc = subprocess.run([sys.executable, str(GATE), "--strict"],
                      capture_output=True, text=True)
check("el árbol real pasa en strict", 0, proc.returncode)
check("y publica su denominador", True, "alcance medido:" in proc.stdout)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
