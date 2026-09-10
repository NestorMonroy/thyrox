"""Pruebas de ``session.marker_wait`` — las TRES salidas contra procesos reales.

Se prueba contra ``subprocess`` de verdad, no contra dobles: lo que el mecanismo
aporta no es el ``grep`` —eso lo hace cualquiera— sino **distinguir «murio» de
«sigue» usando el pid**, y esa distincion solo existe frente a un proceso.

Su antecesora, ``tests/legacy/test-esperar-marcador.sh``, media siete conductas
y llevaba rota desde la mudanza a THYROX: resolvia su sujeto con
``dirname($0)/..``, que desde ``tests/legacy/`` apunta a ``tests/session/`` y no
a ``src/session/``. Sus catorce aserciones no median nada — exit 127 en trece de
ellas. Aqui la ruta se resuelve por ``paths.reach``, que sobrevive a la mudanza
porque asciende hasta reconocer el arbol en vez de contar directorios.

El control que puede fallar
---------------------------
El caso 6 —el trabajo escribe el marcador y muere en el mismo instante— es el
unico que depende de una guarda concreta: la re-comprobacion del log despues de
ver el proceso muerto. Al anularla (``recheck_after_death=False``) tiene que
caer **exactamente ese caso** y ninguno mas. Sin esa medicion, el verde no
distingue «la guarda funciona» de «la suite no pregunta».
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session import marker_wait  # noqa: E402
from session.marker_wait import BAILED, PRESENT, TIMED_OUT, wait_for_marker  # noqa: E402

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


def lanzar(script: str) -> subprocess.Popen:
    """Un trabajo real. ``start_new_session`` lo saca del grupo de la suite."""
    return subprocess.Popen(["bash", "-c", script], start_new_session=True,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


TMP = Path(tempfile.mkdtemp(prefix="marker-wait-"))

# --- 1. el trabajo termina bien -----------------------------------------------
print("== 1. el marcador aparece -> PRESENT, con la cola real ==")
log = TMP / "ok.log"
log.write_text("")
job = lanzar(f"sleep 0.5; echo 'todo bien' >> {log}; echo 'EXIT=0' >> {log}")
r = wait_for_marker(log, pid=job.pid, timeout=20, interval=0.2)
job.wait()
check("marcador presente -> 0", PRESENT, r.code)
check("imprime la cola real del log", True, "EXIT=0" in r.tail)
check("y el cuerpo del trabajo, no solo el marcador", True, "todo bien" in r.tail)

# --- 2. muere sin marcador ----------------------------------------------------
print("== 2. muere sin marcador -> BAILED, y PRONTO (no agota el plazo) ==")
log = TMP / "muere.log"
log.write_text("")
job = lanzar(f"echo arranco >> {log}; sleep 0.5; kill -9 $$")
inicio = time.monotonic()
r = wait_for_marker(log, pid=job.pid, timeout=60, interval=0.2)
duracion = time.monotonic() - inicio
job.wait()
check("muerte sin marcador -> 2", BAILED, r.code)
check("aborta pronto, NO agota los 60s", True, duracion < 20)
check("distingue BAIL de timeout en la razon", True, "NO es un timeout" in r.reason)
check("adjunta la cola real como evidencia", True, "arranco" in r.tail)

# --- 3. muere con el log vacio ------------------------------------------------
print("== 3. muere con el log VACIO -> lo dice explicito ==")
log = TMP / "vacio.log"
log.write_text("")
job = lanzar("sleep 0.5; kill -9 $$")
r = wait_for_marker(log, pid=job.pid, timeout=30, interval=0.2)
job.wait()
check("log vacio + muerte -> 2", BAILED, r.code)
check("nombra el caso de 0 bytes", True, "murio antes de emitir nada" in r.reason)

# --- 4. sigue vivo al vencer el plazo -----------------------------------------
print("== 4. sigue vivo al vencer -> TIMED_OUT, y NO lo llama muerte ==")
log = TMP / "lento.log"
log.write_text("")
job = lanzar("sleep 30")
r = wait_for_marker(log, pid=job.pid, timeout=1.5, interval=0.2)
job.kill()
job.wait()
check("vivo al vencer -> 3 (no 2)", TIMED_OUT, r.code)
check("el timeout dice que el proceso vive", True, "sigue vivo" in r.reason)

# --- 5. sin pid: declara que no puede decidir ---------------------------------
print("== 5. sin pid declara la indecidibilidad, en vez de fingirla ==")
log = TMP / "sinpid.log"
log.write_text("")
r = wait_for_marker(log, timeout=0.6, interval=0.2)
check("sin pid -> 3", TIMED_OUT, r.code)
check("declara la indecidibilidad", True, "no se puede distinguir" in r.reason)

# --- 6. la carrera: el marcador lo escribe OTRO, despues de que el pid muere --
print("== 6. CONTROL POSITIVO: el marcador llega DESPUES de morir el pid vigilado ==")
# La forma no es artificial: es la de ``background.spawn_detached``. El marcador
# lo escribe el shell EXTERIOR con ``echo EXIT=$?`` **despues** de que el comando
# interior termina. Quien vigile el pid interior lo ve muerto con el log todavia
# sin marcador — y sin la guarda declara BAIL sobre un trabajo que termino bien.
#
# La primera version de este caso mataba al propio escritor, asi que el marcador
# aparecia ANTES de que el sondeo notara la muerte: pasaba por el camino normal
# y la guarda nunca entraba. La anulacion del caso 8 lo destapo — el verde no
# distinguia «la guarda funciona» de «el caso no la ejerce».
def lanzar_carrera(log: Path, pidfile: Path) -> int:
    """Devuelve el pid INTERIOR; el marcador lo escribe el exterior mas tarde."""
    lanzar(f"bash -c 'sleep 0.5; exit 7' & echo $! > {pidfile}; "
           f"wait $(cat {pidfile}); rc=$?; sleep 0.3; echo \"EXIT=$rc\" >> {log}")
    plazo = time.monotonic() + 5
    while time.monotonic() < plazo:
        if pidfile.exists() and pidfile.read_text().strip():
            return int(pidfile.read_text().strip())
        time.sleep(0.05)
    raise AssertionError("el fixture no publico el pid interior")

log = TMP / "carrera.log"
log.write_text("")
interior = lanzar_carrera(log, TMP / "carrera.pid")
r_carrera = wait_for_marker(log, pid=interior, timeout=20, interval=0.2)
check("marcador escrito tras la muerte -> 0, no BAIL", PRESENT, r_carrera.code)
check("y la razon nombra que se escribio al salir", True, "escrito al salir" in r_carrera.reason)

# --- 7. patron propio ---------------------------------------------------------
print("== 7. el patron es del consumidor, no solo EXIT= ==")
log = TMP / "patron.log"
log.write_text("")
job = lanzar(f"sleep 0.5; echo '2464 passed in 585s' >> {log}; sleep 20")
r = wait_for_marker(log, pid=job.pid, pattern=r"passed|failed", timeout=20, interval=0.2)
job.kill()
job.wait()
check("patron arbitrario -> 0", PRESENT, r.code)

# --- 8. ANULACION: se retira la re-comprobacion de la carrera -----------------
print("== 8. ANULACION: sin la re-comprobacion, la carrera se declara BAIL ==")
# El mismo trabajo del caso 6, con la guarda retirada. Si el veredicto NO
# cambiara, el caso 6 no estaria midiendo la guarda: estaria midiendo otra cosa.
log = TMP / "carrera-anulada.log"
log.write_text("")
interior = lanzar_carrera(log, TMP / "carrera-anulada.pid")
r_anulado = wait_for_marker(log, pid=interior, timeout=20, interval=0.2,
                            recheck_after_death=False)
check("sin la guarda, la carrera cae a BAIL", BAILED, r_anulado.code)
check("con la guarda daba PRESENT — el control DISCRIMINA", True,
      r_carrera.code == PRESENT and r_anulado.code == BAILED)

# Y cae EXACTAMENTE ese caso: los otros no dependen de la guarda.
log = TMP / "muere-anulada.log"
log.write_text("")
job = lanzar(f"echo arranco >> {log}; sleep 0.5; kill -9 $$")
r = wait_for_marker(log, pid=job.pid, timeout=20, interval=0.2, recheck_after_death=False)
job.wait()
check("la muerte limpia sigue en BAILED con y sin guarda", BAILED, r.code)

# --- 9. el modulo arranca como guion -----------------------------------------
print("== 9. CONTROL: el modulo ARRANCA como guion, no solo importado ==")
log = TMP / "cli.log"
log.write_text("EXIT=0\n")
proc = subprocess.run(
    [sys.executable, str(Path(marker_wait.__file__).resolve()), str(log), "--timeout", "2"],
    capture_output=True, text=True)
check("sale 0 como guion", PRESENT, proc.returncode)
check("y NO muere importando sus hermanos", False, "ModuleNotFoundError" in proc.stderr)
check("y publica la razon del veredicto", True, "marcador presente" in proc.stdout)

proc = subprocess.run(
    [sys.executable, str(Path(marker_wait.__file__).resolve()), str(TMP / "no-existe.log"),
     "--timeout", "0.5", "--interval", "0.2"],
    capture_output=True, text=True)
check("log inexistente y sin pid -> 3, no una traza", TIMED_OUT, proc.returncode)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
