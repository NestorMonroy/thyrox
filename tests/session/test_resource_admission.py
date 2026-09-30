"""La admisión por recurso SIN carrera de comprobar-y-usar, para la RAM.

Comprobar sin reservar deja una ventana: A mide 5000 libres y decide que caben
sus 3000; antes de que A llegue a usarlos, B mide lo mismo y decide lo mismo.
Aquí comprobar y reservar son UN paso bajo el lock del registro, y lo
comprometido que el sistema aún no muestra —la reserva menos lo que el árbol
del dueño ya reside— se descuenta de lo libre. La reserva caduca sola cuando
su dueño muere: un `slots++` en un `trap` no corre con SIGKILL.

El registro y el bucle son los que `gpu_monitor` usaba para la VRAM; la RAM
sólo aporta su medida: `MemAvailable` y el RSS de cada árbol.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from session import gpu_monitor as gm
from session import resource_admission as ra

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


def meminfo(path: Path, available_kb: int) -> Path:
    path.write_text(f"MemTotal:       16000000 kB\nMemAvailable:   {available_kb} kB\n")
    return path


def cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-m", "session.resource_admission", *args],
                          cwd=ROOT, env={**os.environ, "PYTHONPATH": str(ROOT / "src")},
                          capture_output=True, text=True, timeout=60)


with tempfile.TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)

    print("caso 1 — el registro es el mismo que usaba la GPU")
    check("gpu_monitor reutiliza el registro común", ra.ReservationLedger, gm.VramLedger)
    check("y la decisión pura", ra.admissible, gm.admissible)

    print("caso 2 — la reserva de un dueño muerto no compromete nada")
    dead = subprocess.Popen(["true"]); dead.wait()
    book = ra.ReservationLedger(tmp_path / "ledger.json")
    book.save({str(dead.pid): 3000, str(os.getpid()): 1000})
    check("sólo queda la del vivo", {str(os.getpid()): 1000}, book.live())

    print("caso 3 — lo libre de RAM descuenta lo reservado que aún no reside")
    free = ra.ram_headroom({"4242": 3000}, meminfo(tmp_path / "meminfo", 10_000),
                           rss_kb=lambda pids: 1000 if 4242 in pids else 0,
                           tree=lambda pid: {pid})
    check("10000 − (3000 − 1000)", 8000, free)
    check("sin MemAvailable no hay margen", None,
          ra.ram_headroom({}, tmp_path / "absent", rss_kb=lambda pids: 0, tree=lambda pid: {pid}))

    print("caso 4 — dos que piden 3 GB sobre 5 GB libres: entra uno")
    # En kB: el RSS de un `sleep` dueño (1–2 MB) es despreciable frente a lo
    # reservado, así que lo aún no usado es casi toda la reserva.
    info = meminfo(tmp_path / "meminfo5g", 5_000_000)
    ledger = tmp_path / "race.json"
    owners = [subprocess.Popen(["sleep", "30"]) for _ in range(2)]
    try:
        racers = [subprocess.Popen([sys.executable, "-m", "session.resource_admission", "admit-ram", "3000000",
                                    "--ledger", str(ledger), "--owner", str(o.pid), "--meminfo", str(info),
                                    "--timeout", "0"],
                                   cwd=ROOT, env={**os.environ, "PYTHONPATH": str(ROOT / "src")})
                  for o in owners]
        codes = sorted(r.wait(timeout=60) for r in racers)
        check("uno admitido (0) y uno vencido (3)", [0, 3], codes)
        check("una sola reserva en el registro", 1, len(ra.ReservationLedger(ledger).live()))

        print("caso 5 — soltar la reserva deja entrar al siguiente")
        admitted = next(iter(ra.ReservationLedger(ledger).live()))
        check("release sale 0", 0, cli("release", "--ledger", str(ledger), "--owner", admitted).returncode)
        waiting = next(str(o.pid) for o in owners if str(o.pid) != admitted)
        check("el otro entra ahora", 0, cli("admit-ram", "3000000", "--ledger", str(ledger), "--owner", waiting,
                                              "--meminfo", str(info), "--timeout", "0").returncode)

        print("caso 6 — muerto el dueño, su reserva deja de contar")
        holder = next(o for o in owners if str(o.pid) == waiting)
        holder.kill(); holder.wait()
        survivor = next(o for o in owners if o is not holder)
        check("el vivo entra sin que nadie haya soltado", 0,
              cli("admit-ram", "3000000", "--ledger", str(ledger), "--owner", str(survivor.pid),
                  "--meminfo", str(info), "--timeout", "0").returncode)
    finally:
        for o in owners:
            o.kill(); o.wait()

    print("caso 7 — el RSS de un árbol vivo se mide de /proc")
    child = subprocess.Popen(["sleep", "30"])
    try:
        time.sleep(0.1)
        check("un proceso vivo reside algo", True, ra.proc_rss_kb({child.pid}) > 0)
        check("un pid inexistente no suma", 0, ra.proc_rss_kb({2 ** 22 + 7}))
    finally:
        child.kill(); child.wait()

print("caso 7b — soltada la última reserva viva, el registro desaparece: en reposo no queda archivo")
with tempfile.TemporaryDirectory() as idle:
    idle_ledger = Path(idle) / "idle.json"
    ra.ReservationLedger(idle_ledger).save({str(os.getpid()): 10})
    ra.release_from(idle_ledger, os.getpid(), "ram-admission")
    check("sin reservas vivas no queda el archivo", False, idle_ledger.exists())
    ra.ReservationLedger(idle_ledger).save({str(os.getpid()): 10, "1": 5})
    ra.release_from(idle_ledger, os.getpid(), "ram-admission")
    check("con otra reserva viva el registro sigue", True, idle_ledger.exists())

print("caso 7c — sin medida, admit_with espera hasta el plazo: rehusar al instante es de la VRAM, no de aquí")
with tempfile.TemporaryDirectory() as unmeasured:
    started = time.monotonic()
    waited = ra.admit_with(Path(unmeasured) / "ledger.json", 1, os.getpid(), lambda live: None,
                           "ram-admission", timeout_s=0.3, interval_s=0.1)
    check("sin medida no admite", False, waited)
    check("y agota el plazo antes de responder", True, time.monotonic() - started >= 0.3)

print("caso 8 — el registro y la fuente de MemAvailable se declaran por entorno")
os.environ["THYROX_RAM_ADMISSION_LEDGER"] = "/x/ledger.json"
os.environ["THYROX_RAM_ADMISSION_MEMINFO"] = "/x/meminfo"
check("THYROX_RAM_ADMISSION_LEDGER gana", Path("/x/ledger.json"), ra.ram_ledger_path())
check("THYROX_RAM_ADMISSION_MEMINFO gana", Path("/x/meminfo"), ra.meminfo_path())
del os.environ["THYROX_RAM_ADMISSION_LEDGER"], os.environ["THYROX_RAM_ADMISSION_MEMINFO"]
check("sin declararlo, el registro vive en la caché del repo", "ram-admission.json", ra.ram_ledger_path().name)
check("sin declararlo, MemAvailable sale del kernel", Path("/proc/meminfo"), ra.meminfo_path())

print(f"test_resource_admission: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
