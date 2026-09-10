"""Pruebas del gate de resolución de raíz de referencia.

Porte de ``tests/legacy/test-reference-root-resolution.sh``, que quedó en rojo
tras el traslado a thyrox: componía su raíz con ``../../..`` desde
``tests/legacy/`` y buscaba el gate en ``.claude/scripts/gates/``, la ruta
previa. El sujeto no murió — cambió de casa, y la aritmética de ruta no
sobrevive a una mudanza. Por eso aquí la raíz se pide al mecanismo de alcance
(``paths.reach``) en vez de contarse en niveles.

Los positivos son REALES: el directorio ``control`` del barrido de una raíz,
con las dos formas defectuosas que aquel pase corrigió. Un incumplidor
fabricado por quien escribió el patrón hereda su encuadre y confirma el
instrumento en vez de probarlo (``hallazgo-abierto-genera-sucesor.md``).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from paths import reach  # noqa: E402

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


GATE = reach.thyrox_root() / "src" / "verify" / "check_reference_root_resolution.py"
# El control positivo vive en el banco de evidencia del CONSUMIDOR, no en el de
# thyrox: es un defecto que ocurrió en su árbol. Se resuelve por el mecanismo
# de alcance; si no está, la suite REHÚSA en vez de fabricar uno.
CONTROL = (reach.root("docs") / ".claude" / "eventos"
           / "barrido-una-raiz-20260829T040354" / "control")


def run(*args: str) -> tuple[int, str]:
    hecho = subprocess.run([sys.executable, str(GATE), *args],
                           capture_output=True, text=True)
    return hecho.returncode, hecho.stdout + hecho.stderr


if not GATE.is_file():
    print(f"REHÚSA — el gate no está en {GATE}. No se emite conteo: un 0 aquí "
          f"no distinguiría «sin incumplidores» de «no medí nada».")
    raise SystemExit(2)

if not CONTROL.is_dir():
    print(f"REHÚSA — el control positivo no está en {CONTROL}.\n"
          f"Es evidencia del consumidor, resuelta por `paths.reach`. Sin ella "
          f"los casos 3-5 no pueden discriminar, y un verde sin ellos mediría "
          f"sólo que el gate arranca.")
    raise SystemExit(2)


print("== 1. sobre el árbol vivo: publica un conteo y su denominador ==")
codigo, salida = run()
check("sale 0 (informa, no bloquea sin --strict)", 0, codigo)
check("publica su denominador", True, "alcance medido" in salida)
check("publica un conteo de incumplidores", True, "incumplidor" in salida)

print("== 2. CONTROL POSITIVO REAL: ve las dos formas del defecto ==")
# El caso decisivo. Sin él, todo lo anterior pasaría igual con un gate que no
# midiera nada: un verde no distingue «el gate ve el defecto» de «el árbol no
# lo tiene». Sub-patrón D de `metrica-decide-la-conclusion.md`.
_, sobre_control = run(str(CONTROL))
check("ve la composición contra UNA raíz", True,
      "compone contra UNA raiz" in sobre_control)
check("ve la lista DUPLICADA", True, "DUPLICA la lista" in sobre_control)
check("cuenta los dos, no uno", True, "2 incumplidor" in sobre_control)

print("== 3. --strict discrimina: 1 con incumplidores, 0 sin ellos ==")
codigo_control, _ = run("--strict", str(CONTROL))
check("--strict sobre el control sale 1", 1, codigo_control)
codigo_gates, _ = run("--strict", str(GATE.parent))
check("--strict sobre el propio directorio de gates sale 0", 0, codigo_gates)

print("== 4. el gate NO se marca a sí mismo por citar el anti-patrón ==")
# Un gate que describe el defecto contiene sus literales. Marcarse a sí mismo
# lo dejaría rojo para siempre, y la única salida sería borrar la descripción.
_, propio = run(str(GATE.parent))
check("no aparece su propio archivo en la salida", False,
      GATE.name in propio)

print("== 5. el barrido por omisión SALTA el directorio de control ==")
# Sin esta exclusión el gate quedaría rojo por su propia evidencia. Se mide
# sobre la salida del árbol vivo, no sobre una invocación fabricada.
check("por omisión no reporta nada bajo control/", False,
      "/control/" in salida)

print("== 6. CONTROL DE ANULACIÓN: sin el control positivo, los casos 2-3 caen ==")
# Qué haría fallar a esta suite. Se apunta el gate a un directorio vacío: si
# los casos 2 y 3 siguieran verdes, no estarían midiendo el control sino otra
# cosa. El directorio se crea bajo el banco de evidencia de thyrox, no en /tmp.
import tempfile  # noqa: E402

with tempfile.TemporaryDirectory(dir=str(reach.scratch_root())) as empty:
    _, sobre_vacio = run(empty)
    check("sobre un directorio vacío NO ve la composición contra una raíz",
          False, "compone contra UNA raiz" in sobre_vacio)
    codigo_vacio, _ = run("--strict", empty)
    check("y --strict ahí sale 0 — el 1 del caso 3 venía del control",
          0, codigo_vacio)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
