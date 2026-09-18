"""Pruebas de ``session.marker_wait.wait_for_pid`` — esperar a un proceso AJENO.

Por que existe
--------------
``wait_for_marker`` exige un ``log`` y un marcador: sirve para un trabajo que
**nosotros** lanzamos con ``bg.sh`` o con el patron ``; echo EXIT=$?``. Su
``--pid`` no es una forma de esperar por pid — es el discriminador entre BAIL y
TIMEOUT de esa espera.

Para un proceso **ajeno** —uno que la sesion no lanzo, o que el cliente promovio
a segundo plano despues de fijar su linea de comando— no hay log ni marcador que
enganchar. Sin una forma sancionada, la mano alcanza el ``until ! pgrep -f
<literal>``, que es exactamente el defecto que ``H-THYROX-103`` midio: el bucle
**se casa a si mismo**, porque ``pgrep -f`` compara contra la linea de comando
COMPLETA y la del propio bucle contiene el literal. Giro hasta que lo mataron,
sobre un gate que habia terminado hacia rato.

Las TRES salidas, y por que la tercera no es «ya termino»
----------------------------------------------------------
``ENDED`` (0) el proceso corria y dejo de correr · ``UNDECIDABLE`` (2) el pid no
corria **al arrancar la espera** · ``TIMED_OUT`` (3) vencio el plazo y sigue
vivo.

La segunda es la que discrimina, y una implementacion ingenua la colapsa en 0:
el sistema **reutiliza** los pid, asi que un pid que no corre ahora puede ser
uno que termino hace un segundo, uno que termino hace una semana, o uno que
nunca existio. Devolver 0 ahi publica «el trabajo termino» sobre un trabajo del
que no se sabe nada — el sub-patron D de ``metrica-decide-la-conclusion.md``
con la propia espera de sujeto.

El control que puede fallar
----------------------------
El caso 3 es el unico que depende de la comprobacion de vivacidad INICIAL. Al
anularla (``require_alive_at_start=False``) tiene que caer **exactamente ese
caso** y ninguno mas.
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

# La raiz se reconoce por su marcador, no contando directorios: asi la suite
# sobrevive a una mudanza de carpeta (lo que rompio a su antecesora en shell).
_HERE = Path(__file__).resolve()
REPO = next((p for p in _HERE.parents if (p / "src" / "paths" / "reach.py").is_file()), None)
if REPO is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(REPO / "src"))

from session.marker_wait import (  # noqa: E402
    ENDED,
    TIMED_OUT,
    UNDECIDABLE,
    wait_for_pid,
)

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


def launch(script: str) -> subprocess.Popen:
    """Un proceso real, fuera del grupo de la suite — como uno ajeno."""
    return subprocess.Popen(["bash", "-c", script], start_new_session=True,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def dead_pid() -> int:
    """Un pid que con certeza NO corre: se lanza, se cosecha, se devuelve."""
    job = launch("true")
    job.wait()
    # Cosechado por Popen.wait: /proc/<pid> ya no existe ni como zombi.
    for _ in range(200):
        if not Path(f"/proc/{job.pid}/stat").exists():
            break
        time.sleep(0.01)
    return job.pid


CLI = REPO / "src" / "session" / "marker_wait.py"

# --- 1. el proceso ajeno termina ---------------------------------------------
print("== 1. el proceso corria y dejo de correr -> ENDED ==")
job = launch("sleep 0.5")
result = wait_for_pid(job.pid, timeout=20, interval=0.1)
job.wait()
check("termino -> 0", ENDED, result.code)
check("la razon nombra el pid", True, str(job.pid) in result.reason)

# --- 2. sigue vivo cuando vence el plazo -------------------------------------
print("== 2. sigue vivo al vencer el plazo -> TIMED_OUT ==")
job = launch("sleep 30")
result = wait_for_pid(job.pid, timeout=0.5, interval=0.1)
check("plazo vencido con el proceso vivo -> 3", TIMED_OUT, result.code)
check("la razon dice que sigue vivo", True, "vivo" in result.reason.lower())
job.kill()
job.wait()

# --- 3. EL QUE DISCRIMINA: el pid no corria al arrancar ----------------------
print("== 3. el pid no corre al arrancar -> UNDECIDABLE, no ENDED ==")
gone = dead_pid()
result = wait_for_pid(gone, timeout=5, interval=0.1)
check("un pid que no corre NO es 'termino' -> 2", UNDECIDABLE, result.code)
check("la razon nombra la reutilizacion de pid", True, "reutiliz" in result.reason.lower())

# --- 4. la anulacion: sin la comprobacion inicial, el caso 3 se cae ----------
print("== 4. control de anulacion de la comprobacion inicial ==")
result = wait_for_pid(gone, timeout=5, interval=0.1, require_alive_at_start=False)
check("anulada, el mismo pid publica ENDED (verde falso)", ENDED, result.code)

# --- 5. la espera NO se casa a si misma --------------------------------------
print("== 5. la espera observa un PID, no una cadena de linea de comando ==")
# El defecto de H-THYROX-103 en su forma minima: el sujeto lleva en su propia
# linea de comando el literal por el que se pregunta. Con `pgrep -f` eso basta
# para que el bucle se encuentre a si mismo y no termine nunca. Aqui el
# observador recibe un ENTERO, asi que el literal no puede intervenir.
job = launch("sleep 0.4  # check_suite_discrimina")
result = wait_for_pid(job.pid, timeout=20, interval=0.1)
job.wait()
check("un literal compartido no impide que termine", ENDED, result.code)

# --- 6. la CLI admite el modo sin log ----------------------------------------
print("== 6. la CLI: --pid-only no exige el log posicional ==")
job = launch("sleep 0.4")
done = subprocess.run([sys.executable, str(CLI), "--pid-only", "--pid", str(job.pid),
                       "--timeout", "20", "--interval", "0.1"],
                      capture_output=True, text=True,
                      env={"PYTHONPATH": str(REPO / "src"), "PATH": "/usr/bin:/bin"})
job.wait()
check("la CLI sin log sale 0 cuando el proceso termina", ENDED, done.returncode)
check("y dice por que", True, "==" in done.stdout)

# --- 7. --pid-only sin --pid rehusa NOMBRANDO la bandera ---------------------
print("== 7. --pid-only sin --pid rehusa, y nombra lo que falta ==")
done = subprocess.run([sys.executable, str(CLI), "--pid-only"],
                      capture_output=True, text=True,
                      env={"PYTHONPATH": str(REPO / "src"), "PATH": "/usr/bin:/bin"})
check("rehusa con exit 2", 2, done.returncode)
check("nombra --pid", True, "--pid" in (done.stderr + done.stdout))

# --- 8. no hay regresion: el modo normal SIGUE exigiendo el log --------------
print("== 8. sin --pid-only, el log posicional sigue siendo obligatorio ==")
done = subprocess.run([sys.executable, str(CLI)],
                      capture_output=True, text=True,
                      env={"PYTHONPATH": str(REPO / "src"), "PATH": "/usr/bin:/bin"})
check("sin log y sin --pid-only rehusa", 2, done.returncode)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
