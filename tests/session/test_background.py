"""Pruebas de ``session.background`` — la superficie que hace invocable al pool.

``task_pool.run`` exige NUEVE piezas sin default y ninguna se ensamblaba: el
mecanismo estaba portado y en verde, y su unico consumidor era su propia suite
con dobles. Esto es capacidad muerta — el defecto que
``flow-selection-agile.md`` describe: registrada, nunca seleccionada.

Lo que esta suite fija:

1. El envoltorio de shell del **hecho 5** de ``task_pool``: el marcador se
   escribe en un shell EXTERIOR, asi que un comando que llame ``exit`` no se
   lo lleva por delante. Se mide contra la forma incorrecta, no en abstracto.
2. El hogar del log es del CONSUMIDOR y se resuelve por sus DOS entradas de
   entorno; sin declaracion **rehusa**, no inventa.
3. La anchura cae a la formula del ejecutable — que es lo que la fuente
   (``run-task-pool.sh:62``, ``nproc``) hace en su script consumidor.
"""
from __future__ import annotations

import os
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session import background  # noqa: E402
from session.parallel import width_cap  # noqa: E402

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


def esperar_marcador(log: Path, plazo: float = 10.0) -> str:
    fin = time.monotonic() + plazo
    while time.monotonic() < fin:
        if log.exists() and "EXIT=" in log.read_text():
            return log.read_text()
        time.sleep(0.05)
    return log.read_text() if log.exists() else "<sin log>"


print("== 1. el marcador SOBREVIVE a un comando que llama exit (hecho 5) ==")
with tempfile.TemporaryDirectory() as d:
    log = Path(d) / "sale.log"
    pid = background.spawn_detached("echo hola; exit 7", log)
    salida = esperar_marcador(log)
    check("el comando corrio", True, "hola" in salida)
    check("y su marcador esta, con el codigo real", True, "EXIT=7" in salida)
    check("spawn_detached devuelve un pid entero", True, isinstance(pid, int) and pid > 0)

print("== 2. CONTROL que discrimina: la forma INCORRECTA pierde el marcador ==")
# Un solo shell —`f'{cmd}; echo EXIT=$?'`— muere en el `exit` del comando y
# nunca llega al echo. Sin este caso, el bloque 1 pasaria con las dos formas y
# el verde no distinguiria «el envoltorio es exterior» de «el comando no salio».
with tempfile.TemporaryDirectory() as d:
    log = Path(d) / "un-solo-shell.log"
    import subprocess
    subprocess.run(["bash", "-c", f"{{ echo hola; exit 7; }} > {log} 2>&1; "
                                  f"echo EXIT=$? >> {log}"], check=False)
    # Ese `; echo` del shell EXTERIOR de la prueba si escribe; lo que se mide es
    # el envoltorio de UN solo shell, donde el echo va DENTRO:
    log2 = Path(d) / "dentro.log"
    subprocess.run(["bash", "-c", f"bash -c 'echo hola; exit 7; echo EXIT=$?' > {log2} 2>&1"],
                   check=False)
    check("con el echo DENTRO del mismo shell, el marcador se pierde", False,
          "EXIT=" in log2.read_text())

print("== 3. pid_is_alive discrimina vivo de muerto ==")
check("el propio proceso esta vivo", True, background.pid_is_alive(os.getpid()))
with tempfile.TemporaryDirectory() as d:
    muerto = background.spawn_detached("true", Path(d) / "m.log")
    esperar_marcador(Path(d) / "m.log")
    time.sleep(0.2)
    check("un pid ya terminado no esta vivo", False, background.pid_is_alive(muerto))
check("un pid imposible no esta vivo", False, background.pid_is_alive(2 ** 22 - 1))

print("== 4. el hogar del log REHUSA sin declaracion (las dos entradas) ==")
_previo = os.environ.pop(background.LOG_DIR_VAR, None)
with tempfile.TemporaryDirectory() as vacio:
    try:
        background.log_dir(vacio)
        check("rehusa sin declaracion", "LogHomeError", "no lanzo")
    except background.LogHomeError as err:
        check("rehusa sin declaracion", "LogHomeError", type(err).__name__)
        check("y el mensaje nombra la entrada 1 (el valor)", True,
              background.LOG_DIR_VAR in str(err))
        check("y tambien la entrada 2 (la ruta del archivo)", True,
              background.LOG_DIR_ENV_FILE_VAR in str(err))

print("== 5. CONTROL DE ANULACION: declarada, SI resuelve ==")
with tempfile.TemporaryDirectory() as hogar:
    os.environ[background.LOG_DIR_VAR] = hogar
    try:
        check("devuelve el hogar declarado", Path(hogar), background.log_dir())
    finally:
        os.environ.pop(background.LOG_DIR_VAR, None)

print("== 6. la corrida completa: N comandos, anchura acotada, veredicto ==")
with tempfile.TemporaryDirectory() as d:
    r = background.run(
        ["echo uno", "echo dos", "echo tres"],
        log_dir=Path(d) / "logs", timeout=30.0, interval=0.2)
    check("veredicto", "settled", r.verdict)
    check("un trabajo por comando", 3, len(r.jobs))
    check("todos con marcador recogido", ["collected"] * 3,
          [r.settlements[j.label] for j in r.jobs])
    check("y su salida quedo en el log", True,
          "uno" in (Path(d) / "logs" / r.jobs[0].label).with_suffix(".log").read_text())

print("== 7. CONTROL: un trabajo que muere SIN marcador no se lee como exito ==")
# Se mata el shell EXTERIOR —el pid que `spawn_detached` devuelve—, que es el
# unico que escribe el marcador. Matar el interior NO sirve como control: el
# exterior sobrevive y SI escribe `EXIT=137`, que es justo lo que el hecho 5
# garantiza. Ese fue el primer intento y salio "settled": el control media el
# envoltorio funcionando, no la muerte sin marcador.
with tempfile.TemporaryDirectory() as d:
    logs = Path(d) / "logs"
    logs.mkdir(parents=True)
    ledger_dir = logs / "ledger"
    from session.job_ledger import JobLedger
    from session import task_pool
    ledger = JobLedger(ledger_dir)
    log = logs / "job-001.log"
    pid = background.spawn_detached("sleep 2", log)
    job = ledger.register("job-001", log, pid=pid)
    os.kill(pid, 9)
    time.sleep(0.3)
    asentamientos = ledger.wait(
        marker_pattern=background.MARKER_PATTERN,
        alive=lambda j: background.pid_is_alive(j.pid),
        timeout=10.0, interval=0.2)
    check("el trabajo muerto sin marcador asienta como bailed",
          "bailed", asentamientos["job-001"])

print("== 8. la anchura cae a la formula del ejecutable, y se publica ==")
with tempfile.TemporaryDirectory() as d:
    r = background.run(["true"], log_dir=Path(d) / "logs", timeout=15.0, interval=0.2)
    check("width por defecto = width_cap()", width_cap(), r.width)
with tempfile.TemporaryDirectory() as d:
    r = background.run(["true"], log_dir=Path(d) / "logs", timeout=15.0, interval=0.2, width=1)
    check("y una anchura declarada la sobreescribe", 1, r.width)

print("== 9. CONTROL: el modulo ARRANCA como guion, no solo importado ==")
# La suite lo importaba siempre, asi que nada media la via por la que un
# consumidor lo invoca de verdad. Medido: sin el bootstrap de `sys.path` moria
# con `ModuleNotFoundError: No module named 'paths'` y los 18 casos seguian en
# verde — el verde no distinguia «funciona» de «la suite no pregunta».
import subprocess as _sp
_proc = _sp.run([sys.executable, str(Path(background.__file__).resolve())],
                capture_output=True, text=True)
check("sale 0 como guion", 0, _proc.returncode)
check("y NO muere importando sus hermanos", False,
      "ModuleNotFoundError" in _proc.stderr)
check("y publica su anchura por defecto", True, "anchura por defecto" in _proc.stdout)

if _previo is not None:
    os.environ[background.LOG_DIR_VAR] = _previo

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
