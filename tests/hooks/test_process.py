"""Pruebas de ``hooks.process`` — el hijo con plazo que no queda corriendo.

El caso que DISCRIMINA es el 3, y viene con su anulación en el 4: mide el
**fenómeno** —¿el trabajo siguió?— con un testigo en disco, no el nombre del
proceso. Un ``pgrep -f`` no sirve por dos razones ya medidas: el ``#`` de un
comentario no llega al argv del hijo, y la marca hace juego con el argv de quien
invoca la suite.

El caso 1 es el que motivó extraer el módulo: ``stop_gate`` fundía ``stdout`` y
``stderr`` en un solo texto y decidía con la suma. Los dos flujos salen
separados justamente para que cada consumidor elija cuál lo gobierna.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import process as p  # noqa: E402

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


print("== 1. DISCRIMINA: stdout y stderr salen SEPARADOS ==")
# Fundirlos es lo que hacía `stop_gate`, y con eso un motor que sale no-cero
# con stdout vacío y un aviso en stderr se leía como incumplimiento.
done = p.run_guarded(["sh", "-c", "printf 'porla-salida\\n'; printf 'porel-error\\n' >&2; exit 1"], 5)
check("el código es el del hijo", 1, done.exit_code)
check("stdout trae SÓLO lo suyo", "porla-salida", done.stdout.strip())
check("stderr trae SÓLO lo suyo", "porel-error", done.stderr.strip())
check("no se marca agotado", False, done.timed_out)
check("y arrancó", True, done.started)

print("== 2. un hijo que termina bien no se marca ni agotado ni ausente ==")
done = p.run_guarded(["sh", "-c", "exit 0"], 5)
check("código 0", 0, done.exit_code)
check("timed_out False", False, done.timed_out)
check("started True", True, done.started)

print("== 3. DISCRIMINA: el hijo agotado NO deja su trabajo corriendo ==")
with tempfile.TemporaryDirectory() as carpeta:
    testigo = pathlib.Path(carpeta) / "el-trabajo-siguio"
    done = p.run_guarded(
        ["sh", "-c", f"(sleep 2; touch '{testigo}') & wait"], 1)
    check("se reporta agotado", True, done.timed_out)
    check("con el código sintético", p.TIMEOUT_EXIT, done.exit_code)
    time.sleep(3)
    check("y el trabajo NO siguió corriendo", False, testigo.exists())

print("== 4. ANULACIÓN: sin el guard, ese mismo trabajo SÍ sigue ==")
# Control de la guarda anulada. Si este caso no distinguiera, el 3 estaría
# midiendo que `sleep 2` no alcanza a correr — no que se le mató el grupo.
with tempfile.TemporaryDirectory() as carpeta:
    testigo = pathlib.Path(carpeta) / "el-trabajo-siguio"
    try:
        subprocess.run(["sh", "-c", f"(sleep 2; touch '{testigo}') & wait"],
                       capture_output=True, timeout=1)
    except subprocess.TimeoutExpired:
        pass
    time.sleep(3)
    check("el subprocess.run pelado SÍ deja al hijo vivo", True, testigo.exists())

print("== 5. un binario ausente NO revienta: se declara que no arrancó ==")
done = p.run_guarded(["/no/existe/comando"], 5)
check("started False", False, done.started)
check("código sintético de ausencia", p.NOT_FOUND_EXIT, done.exit_code)
check("y el motivo va en stderr", True, bool(done.stderr))

print("== 6. el hijo que ya murió se cosecha — no queda zombi ==")
proc = subprocess.Popen(["sh", "-c", "exit 0"], stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE, text=True, start_new_session=True)
time.sleep(0.3)                       # ya terminó; su grupo ya no existe
p.kill_group(proc)                    # ProcessLookupError -> rama de cosecha
check("el estado quedó leído", True, proc.poll() is not None)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
