"""El lock de estado compartido, portado del ejecutable 2.1.282.

Origen: `.claude/workbench/lock-port-20260926T202249/` — `proper-lockfile`
tal como lo empaqueta `chunk-bzev8hcq.js`. Cada caso cita la función del
ejecutable cuya conducta mide.

Contrato:
  - adquirir es un `mkdir` atómico con `owner.json` dentro (`De`);
  - un lock fresco de otro es ELOCKED (`De`); uno huérfano se recupera (`rt`,
    `nt`), SALVO que su dueño sea de este host y viva: colgado no es muerto;
  - el dueño renueva la `mtime` (`pe`); si alguien le quita el lock, queda
    comprometido y soltar avisa sin exclusividad (`Fe`, `vm`);
  - reintentos con espera exponencial (`ze`);
  - N procesos que leen-modifican-escriben bajo el lock no pierden cuentas.
"""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402
from session import shared_lock as sl  # noqa: E402

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


def dead_pid() -> int:
    """Un pid que existió y ya terminó."""
    done = subprocess.run([sys.executable, "-c", "import os; print(os.getpid())"],
                          capture_output=True, text=True, check=True)
    return int(done.stdout)


def plant(target: Path, pid: int, age_s: float, host: str | None = None) -> None:
    """Un lock ajeno, con su dueño y una mtime de hace `age_s` segundos."""
    lock = sl.lock_path(target)
    lock.mkdir()
    sl.owner_path(target).write_text(json.dumps({"pid": pid, "host": host or socket.gethostname(),
                                                  "run_id": "ajeno", "step_id": "s0",
                                                  "lock_ino": lock.stat().st_ino}))
    when = time.time() - age_s
    os.utime(lock, (when, when))


HOLDER = """
import sys, time
sys.path.insert(0, sys.argv[1])
from session import shared_lock as sl
with sl.held(sys.argv[2], run_id="holder", stale_s=2, update_s=1):
    print("tomado", flush=True)
    time.sleep(float(sys.argv[3]))
"""

COUNTER = """
import sys
sys.path.insert(0, sys.argv[1])
from pathlib import Path
from session import shared_lock as sl
target = Path(sys.argv[2])
for _ in range(int(sys.argv[3])):
    with sl.held(target, run_id="worker", retries=200, min_wait_s=0.005, max_wait_s=0.05):
        n = int(target.read_text())
        target.write_text(str(n + 1))
"""

SRC = str(reach.thyrox_root() / "src")

with tempfile.TemporaryDirectory() as raw:
    tmp = Path(raw)

    print("== 1. adquirir crea el lock con su dueño; soltar lo retira (De, it) ==")
    target = tmp / "setups.jsonl"
    with sl.held(target, run_id="r1", step_id="step-160") as lock:
        owner = sl.read_owner(target)
        check("el lock es <archivo>.lock (ne)", tmp / "setups.jsonl.lock", sl.lock_path(target))
        check("el dueño declara pid, host, run y step",
              (os.getpid(), socket.gethostname(), "r1", "step-160"),
              (owner["pid"], owner["host"], owner["run_id"], owner["step_id"]))
        check("check() lo ve tomado (Pt)", True, sl.check(target))
        # `proper-lockfile` suelta y roba con `rmdir`, que falla sobre un
        # directorio no vacío: el dueño va en un archivo HERMANO para que un
        # lock tomado desde .py lo pueda soltar o recuperar el lado .ts.
        check("el directorio del lock queda vacío (compatible con rmdir)", [], list(sl.lock_path(target).iterdir()))
        check("el dueño es <archivo>.lock.owner.json", tmp / "setups.jsonl.lock.owner.json", sl.owner_path(target))
    check("al soltar no queda lock", False, sl.lock_path(target).exists())
    check("ni su dueño", False, sl.owner_path(target).exists())
    check("check() lo ve libre", False, sl.check(target))

    print("== 2. un lock fresco de otro es ELOCKED y nombra a su dueño (De) ==")
    holder = subprocess.Popen([sys.executable, "-c", HOLDER, SRC, str(target), "3"],
                              stdout=subprocess.PIPE, text=True)
    assert holder.stdout is not None  # se pidio con stdout=PIPE
    holder.stdout.readline()
    try:
        sl.acquire(target, run_id="r2", retries=0)
        check("ELOCKED", "ELOCKED", "tomado")
    except sl.LockHeld as held:
        check("ELOCKED", "ELOCKED", held.code)
        check("nombra el pid del dueño", holder.pid, held.owner.get("pid"))

    print("== 3. reintentos: espera a que el dueño suelte (ze) ==")
    with sl.held(target, run_id="r3", retries=12, min_wait_s=0.2, max_wait_s=1.0):
        check("lo tomó tras soltarlo el otro", holder.pid,
              holder.wait(timeout=10) == 0 and holder.pid)

    print("== 4. huérfano con dueño muerto: se recupera (rt, nt) ==")
    plant(target, dead_pid(), age_s=120)
    with sl.held(target, run_id="r4", stale_s=60) as lock:
        owner = sl.read_owner(target)
        check("el dueño nuevo es este proceso", ("r4", os.getpid()), (owner["run_id"], owner["pid"]))

    print("== 5. huérfano con dueño VIVO en este host: NO se roba ==")
    plant(target, os.getpid(), age_s=120)
    try:
        sl.acquire(target, run_id="r5", stale_s=60, retries=0)
        check("rehúsa", "ELOCKED", "tomado")
    except sl.LockHeld as held:
        check("rehúsa con ELOCKED", "ELOCKED", held.code)
        check("dice que el dueño vive sin latido", True, "sin latido" in held.reason)
        check("adjunta la sonda de stdin del dueño", True, held.probe is not None)
    check("el lock ajeno sigue ahí", True, sl.lock_path(target).exists())
    sl.force_remove(target)

    print("== 6. huérfano de OTRO host: no se puede sondear, se recupera por latido ==")
    plant(target, os.getpid(), age_s=120, host="otra-maquina")
    with sl.held(target, run_id="r6", stale_s=60):
        check("recuperado", "r6", sl.read_owner(target)["run_id"])

    print("== 7. el latido mantiene fresca la mtime (pe) ==")
    with sl.held(target, run_id="r7", stale_s=2, update_s=1):
        time.sleep(2.5)
        age = time.time() - sl.lock_path(target).stat().st_mtime
        check("la mtime tiene menos de un intervalo", True, age < 1.5)
        check("y por eso sigue sin ser huérfano", True, sl.check(target, stale_s=2))

    print("== 8. si otro le quita el lock, queda comprometido y soltar avisa (Fe, vm) ==")
    lock = sl.acquire(target, run_id="r8", stale_s=2, update_s=1)
    sl.force_remove(target)
    time.sleep(1.5)
    check("comprometido", True, lock.compromised)
    warning = lock.release()
    check("soltar avisa que no hubo exclusividad", True,
          warning is not None and "without exclusivity" in warning)

    print("== 9. N procesos leen-modifican-escriben sin perder cuentas ==")
    counter = tmp / "contador"
    counter.write_text("0")
    workers = [subprocess.Popen([sys.executable, "-c", COUNTER, SRC, str(counter), "25"]) for _ in range(6)]
    codes = [w.wait(timeout=120) for w in workers]
    check("los seis terminan bien", [0] * 6, codes)
    check("150 incrementos, 150 en el archivo", "150", counter.read_text())

    print("== 10. un dueño de OTRO lock (robado por quien no escribe dueño) no se atribuye ==")
    lock = sl.lock_path(target)
    lock.mkdir()
    sl.owner_path(target).write_text(json.dumps({"pid": os.getpid(), "host": socket.gethostname(),
                                                  "run_id": "viejo", "lock_ino": -1}))
    check("el dueño cuyo inodo no es el del lock se ignora", {}, sl.read_owner(target))
    sl.force_remove(target)
    check("force_remove retira también el dueño", False, sl.owner_path(target).exists())

    print("== 11. escritura atómica: tmp + rename, sin restos ==")
    data = tmp / "estado.json"
    data.write_text("viejo")
    sl.write_atomic(data, "nuevo")
    check("contenido nuevo", "nuevo", data.read_text())
    check("sin temporales", [data.name], sorted(p.name for p in tmp.glob("estado*")))

print(f"\ntest_shared_lock: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
