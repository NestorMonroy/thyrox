"""La VRAM de cada ítem del pool y su admisión, sobre el puerto de telemetría.

`--memfree` de GNU Parallel es memoria del SISTEMA; la de la GPU es otro
recurso y GNU Time no la ve. `gpu_monitor` la muestrea con un
`GpuMemoryBackend` mientras vive el ÁRBOL de procesos del ítem y deja `<n>.gpu`:

    <vram pico MiB> <vram media MiB> <uso pico de GPU %> <muestras>

Aquí no hay GPU. Donde el caso es la conversación con el binario de NVIDIA se
usa un ejecutable falso con `NvidiaSmiBackend`; el resto usa backends falsos
en Python, sin simular el binario. Eso prueba el mecanismo —qué PIDs cuenta,
cuándo para, qué hace sin telemetría, en qué dispositivo reserva—, no la
precisión del driver.

Contrato:
  - cuenta sólo la VRAM del árbol del ítem, por PIDs del anfitrión;
  - para cuando el árbol termina;
  - sin telemetría no escribe una cifra: `absent` no deja archivo y
    `unavailable` deja su estado;
  - un árbol que no usó la GPU SÍ escribe, con cero: eso es una medida;
  - cada reserva nombra su dispositivo y su tipo (worker, residency, request),
    y se admite contra lo libre de ESE dispositivo;
  - el requisito del trabajo (none, optional, required) decide antes de
    ejecutar si la VRAM es dimensión de admisión.
Invariantes de TASK-THYROX-0691: 3, 4, 6, 7, 8 y la enmienda 1.7.0.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

from paths import reach
from session import gpu_backend as gb
from session import gpu_monitor as gm

OK = FAILED = 0
GIB = 1024


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


FAKE_SMI = """#!/usr/bin/env bash
# El binario de NVIDIA falso: las tres consultas del backend, desde tres archivos.
case "$*" in
  *--query-compute-apps=pid,used_memory*) cat "$FAKE_GPU_APPS" ;;
  *--query-gpu=index,utilization.gpu*)    cat "$FAKE_GPU_UTIL" ;;
  *--query-gpu=index,memory.free*)        cat "$FAKE_GPU_FREE" ;;
  *) echo "consulta no prevista: $*" >&2; exit 9 ;;
esac
"""


class FakeBackend:
    """Telemetría declarada: memoria libre por dispositivo y uso por PID del anfitrión."""

    def __init__(self, devices: dict[str, int], usage: dict[int, int] | None = None):
        self.memory = devices
        self.usage = usage or {}

    def available(self) -> bool:
        return True

    def devices(self) -> list[gb.DeviceMemory]:
        return [gb.DeviceMemory(device, free) for device, free in self.memory.items()]

    def usage_by_pid(self, pids) -> dict[int, int]:
        return {pid: mib for pid, mib in self.usage.items() if pid in set(pids)}

    def utilization_pct(self) -> int:
        return 50

    def identity(self) -> str:
        return "fake"


class StaticMembers:
    """Una fuente de miembros que vive ``rounds`` lecturas con PIDs fijos."""

    def __init__(self, pids: set[int], rounds: int):
        self.pids = pids
        self.rounds = rounds

    def current_members(self) -> set[int] | None:
        self.rounds -= 1
        return set(self.pids) if self.rounds >= 0 else None


def no_hardware() -> gb.HardwareEvidence:
    return gb.HardwareEvidence.NONE


def partial_hardware() -> gb.HardwareEvidence:
    return gb.HardwareEvidence.PARTIAL


def capability_of(binary: Path) -> gb.Capability:
    return gb.probe_capability(gb.NvidiaSmiBackend(str(binary)), no_hardware)


def spawn_tree(seconds: float) -> tuple[subprocess.Popen, int]:
    """Un padre con un hijo: el hijo es quien usa la GPU, no el padre."""
    parent = subprocess.Popen(["bash", "-c", f"sleep {seconds} & echo $!; wait"],
                              stdout=subprocess.PIPE, text=True)
    assert parent.stdout is not None  # se pidió con stdout=PIPE
    return parent, int(parent.stdout.readline())


def worker(owner_pid: int, need_mib: int) -> gm.WorkerReservation:
    return gm.WorkerReservation(owner_pid, need_mib)


def admitted(reservation: gm.Reservation | None) -> bool:
    return reservation is not None


def refusal_of(action) -> str:
    """El nombre de la excepción que lanza ``action``, o «sin excepción»."""
    try:
        action()
    except Exception as error:  # noqa: BLE001 — el caso compara el tipo lanzado
        return type(error).__name__
    return "sin excepción"


def run_cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-m", "session.gpu_monitor", *args],
                          env={**os.environ, "PYTHONPATH": str(reach.thyrox_root() / "src")},
                          capture_output=True, text=True, timeout=60)


with tempfile.TemporaryDirectory() as raw:
    tmp = Path(raw)
    smi = tmp / "nvidia-smi"
    smi.write_text(FAKE_SMI); smi.chmod(0o755)
    apps, utilization, free = tmp / "apps.csv", tmp / "util.csv", tmp / "free.csv"
    os.environ["FAKE_GPU_APPS"], os.environ["FAKE_GPU_UTIL"] = str(apps), str(utilization)
    os.environ["FAKE_GPU_FREE"] = str(free)
    free.write_text("0, 5000\n")
    nvidia = gb.NvidiaSmiBackend(str(smi))

    print("== 1. el árbol del ítem incluye a sus hijos ==")
    parent, child = spawn_tree(2)
    check("el hijo está en el árbol del padre", True, child in gm.tree(parent.pid))
    parent.wait()

    print("== 2. una muestra: VRAM de los PIDs pedidos y uso por GPU ==")
    apps.write_text("4242, 300\n4343, 5000\n")
    utilization.write_text("0, 91\n1, 12\n")
    sample = gm.sample(nvidia, {4242, 4343})
    check("VRAM por PID", {4242: 300, 4343: 5000}, sample.vram_by_pid)
    check("uso pico entre GPUs", 91, sample.utilization_pct)

    print("== 3. watch cuenta SÓLO el árbol del ítem, y para cuando termina ==")
    parent, child = spawn_tree(1.5)
    apps.write_text(f"{child}, 300\n999999, 5000\n")
    out = tmp / "1.gpu"
    started = time.monotonic()
    summary = gm.watch(gm.HostTree(parent.pid), out, capability_of(smi), interval_s=0.2)
    elapsed = time.monotonic() - started
    parent.wait()
    assert summary is not None
    check("pico: los 300 MiB del hijo, no los 5000 ajenos", 300, summary.peak_mib)
    # La media no se fija en 300: entre que el hijo termina y el padre sale
    # hay una ventana de milisegundos en la que el árbol no usa VRAM.
    check("media: positiva y no mayor que el pico", True, 0 < summary.avg_mib <= 300)
    check("uso pico de GPU", 91, summary.peak_utilization_pct)
    check("varias muestras", True, summary.samples >= 3)
    check("para al terminar el árbol, no después", True, elapsed < 3.0)
    check("<n>.gpu con las cuatro cifras", f"300 {summary.avg_mib} 91 {summary.samples}", out.read_text().strip())

    print("== 4. un árbol que no usó la GPU escribe CERO: eso es una medida ==")
    parent, child = spawn_tree(0.6)
    apps.write_text("999999, 5000\n")
    out = tmp / "2.gpu"
    summary = gm.watch(gm.HostTree(parent.pid), out, capability_of(smi), interval_s=0.2)
    parent.wait()
    assert summary is not None
    check("pico cero, uso cero", (0, 0), (summary.peak_mib, summary.peak_utilization_pct))
    check("y el archivo existe", True, out.exists())

    print("== 5. sin telemetría no se escribe una cifra ==")
    parent, child = spawn_tree(0.3)
    out = tmp / "3.gpu"
    absent = capability_of(tmp / "no-existe")
    check("sin binario ni evidencia: absent", gb.ABSENT, absent.state)
    check("absent: sin resumen", None, gm.watch(gm.HostTree(parent.pid), out, absent, interval_s=0.1))
    parent.wait()
    check("absent: sin archivo", False, out.exists())
    out = tmp / "3u.gpu"
    unavailable = gb.probe_capability(gb.NvidiaSmiBackend(str(tmp / "no-existe")), partial_hardware)
    check("unavailable: sin resumen", None, gm.watch(StaticMembers({1}, 1), out, unavailable, interval_s=0.01))
    check("unavailable: el archivo declara el estado", gb.UNAVAILABLE, gm.read_gpu_file(out).state)
    check("y no lleva resumen", None, gm.read_gpu_file(out).summary)

    print("== 7. la VRAM libre: la del dispositivo con más espacio ==")
    free.write_text("0, 6000\n1, 11000\n")
    check("la mayor entre GPUs, no la suma: un ítem no se reparte", 11000, gb.largest_free_mib(nvidia))
    check("la CLI free la imprime", "11000", run_cli("free", "--nvidia-smi", str(smi)).stdout.strip())
    check("la CLI free sin binario sale 2", 2, run_cli("free", "--nvidia-smi", str(tmp / "no-existe")).returncode)

    print("== 8. TRES estados: medido 0, ausente, y error al medir ==")
    # Un binario que responde las primeras N llamadas y luego falla: se intentó
    # medir y no se pudo. Eso NO es cero ni ausencia, y no se publica parcial.
    flaky = tmp / "nvidia-smi-flaky"
    flaky.write_text('#!/usr/bin/env bash\nn=$(cat "$FAKE_CALLS" 2>/dev/null || echo 0); echo $((n+1)) > "$FAKE_CALLS"\n'
                     '[ "$n" -ge 4 ] && { echo "NVML: Driver/library version mismatch" >&2; exit 18; }\n'
                     f'exec {smi} "$@"\n')
    flaky.chmod(0o755)
    os.environ["FAKE_CALLS"] = str(tmp / "calls")
    parent, child = spawn_tree(1.5)
    apps.write_text(f"{child}, 300\n")
    out = tmp / "4.gpu"
    summary = gm.watch(gm.HostTree(parent.pid), out, capability_of(flaky), interval_s=0.2)
    parent.wait()
    check("error al medir: sin resumen publicado", None, summary)
    written = out.read_text() if out.exists() else ""
    check("el archivo declara el error y su causa", True,
          written.startswith("error ") and "mismatch" in written)
    check("read_gpu_file lo clasifica como error", "error", gm.read_gpu_file(out).state)
    check("un .gpu con ceros es una medida", "measured", gm.read_gpu_file(tmp / "2.gpu").state)
    check("sin archivo es ausente", "absent", gm.read_gpu_file(tmp / "3.gpu").state)

    print("== 9. admisión por VRAM: espera a que haya sitio antes de arrancar ==")
    ledger9 = tmp / "ledger9.json"
    owner9 = os.getpid()
    free.write_text("0, 1000\n"); apps.write_text("")
    check("sin sitio y sin plazo: no admite", False,
          admitted(gm.admit(worker(owner9, 2000), ledger9, nvidia, timeout_s=0.5, interval_s=0.1)))
    free.write_text("0, 5000\n")
    check("con sitio: admite enseguida", True,
          admitted(gm.admit(worker(owner9, 2000), ledger9, nvidia, timeout_s=0.5, interval_s=0.1)))
    gm.release(ledger9, owner9)
    free.write_text("0, 1000\n")
    subprocess.Popen(["bash", "-c", f"sleep 0.4; echo '0, 5000' > {free}"])
    check("se libera mientras espera: admite", True,
          admitted(gm.admit(worker(owner9, 2000), ledger9, nvidia, timeout_s=3, interval_s=0.1)))
    gm.release(ledger9, owner9)

    print("== 9b. el registro vive en un directorio que aún no existe: admit lo crea ==")
    fresh = tmp / "base-nueva" / "sub" / "vram.json"
    free.write_text("0, 5000\n")
    check("admite aunque el directorio no exista", True,
          admitted(gm.admit(worker(os.getpid(), 2000), fresh, nvidia, timeout_s=0.5, interval_s=0.1)))
    gm.release(fresh, os.getpid())
    check("y release deja el registro vacío", {}, gm.VramLedger(fresh).live())
    check("release sobre un directorio inexistente no lanza", None,
          gm.release(tmp / "otra-base" / "vram.json", os.getpid()))

    print("== 9c. el requisito del trabajo decide antes de ejecutar (invariantes 3 y 4) ==")
    def request(ledger: Path, need: int = 3000, timeout_s: float = 0.2) -> gm.AdmissionRequest:
        return gm.AdmissionRequest(need, ledger, os.getpid(), timeout_s, 0.05)

    ledger_req = tmp / "requirement" / "vram.json"
    started = time.monotonic()
    check("required sin telemetría: rehúsa", gm.Outcome.REFUSED,
          gm.admit_for(gb.GpuRequirement.REQUIRED, request(ledger_req, timeout_s=5), None))
    check("y al instante, sin esperar el plazo", True, time.monotonic() - started < 1.0)
    check("y no se escribe reserva", False, ledger_req.parent.exists())
    full = FakeBackend({"GPU-a": 0})
    check("none con la GPU llena: entra sin la VRAM como dimensión", gm.Outcome.UNCONSTRAINED,
          gm.admit_for(gb.GpuRequirement.NONE, request(ledger_req), full))
    check("none sin telemetría: igual", gm.Outcome.UNCONSTRAINED,
          gm.admit_for(gb.GpuRequirement.NONE, request(ledger_req), None))
    check("none: el registro sigue sin existir", False, ledger_req.parent.exists())
    check("optional sin telemetría: la ruta CPU declarada", gm.Outcome.CPU_FALLBACK,
          gm.admit_for(gb.GpuRequirement.OPTIONAL, request(ledger_req), None))
    check("optional sin telemetría: sin reserva", False, ledger_req.parent.exists())
    check("optional con telemetría y sitio: reserva", gm.Outcome.RESERVED,
          gm.admit_for(gb.GpuRequirement.OPTIONAL, request(ledger_req), FakeBackend({"GPU-a": 5000})))
    check("y la reserva está en el registro, en su dispositivo", [("worker", "GPU-a", 3000)],
          [(r.kind, r.device, r.mib) for r in gm.VramLedger(ledger_req).live().values()])
    gm.release(ledger_req, os.getpid())
    check("optional con telemetría sin sitio: ruta CPU al vencer su plazo", gm.Outcome.CPU_FALLBACK,
          gm.admit_for(gb.GpuRequirement.OPTIONAL, request(ledger_req), FakeBackend({"GPU-a": 100})))
    check("required con telemetría sin sitio: vence el plazo", gm.Outcome.TIMEOUT,
          gm.admit_for(gb.GpuRequirement.REQUIRED, request(ledger_req), FakeBackend({"GPU-a": 100})))

    print("== 10. TOCTOU: dos admisiones simultáneas no reservan la misma VRAM (invariante 6) ==")
    free.write_text("0, 5000\n")
    apps.write_text("")
    ledger = tmp / "vram.json"
    go = tmp / "go"
    racer = (f"import sys, time\nfrom pathlib import Path\nfrom session import gpu_backend as gb, gpu_monitor as gm\n"
             f"while not Path({str(go)!r}).exists(): time.sleep(0.001)\n"
             f"got = gm.admit(gm.WorkerReservation(int(sys.argv[1]), 3000), Path({str(ledger)!r}),"
             f" gb.NvidiaSmiBackend({str(smi)!r}), timeout_s=0.8, interval_s=0.1)\n"
             f"print('admitido' if got else 'esperó')\n")
    env = {**os.environ, "PYTHONPATH": str(reach.thyrox_root() / "src")}
    holders = [subprocess.Popen(["sleep", "5"]) for _ in range(2)]
    racers = [subprocess.Popen([sys.executable, "-c", racer, str(h.pid)], stdout=subprocess.PIPE, text=True, env=env)
              for h in holders]
    time.sleep(0.5); go.touch()
    outcomes = sorted(r.communicate(timeout=30)[0].strip() for r in racers)
    check("uno admitido y el otro esperó", ["admitido", "esperó"], outcomes)

    print("== 11. una reserva cuenta sólo lo que su árbol aún no usa: sin doble conteo ==")
    ledger2 = tmp / "vram2.json"
    parent, child = spawn_tree(5)
    check("el primero reserva", True,
          admitted(gm.admit(worker(parent.pid, 3000), ledger2, nvidia, timeout_s=0.2)))
    apps.write_text(f"{child}, 3000\n")
    free.write_text("0, 2000\n")
    check("con los 3000 ya visibles, 1500 caben en los 2000 libres", True,
          admitted(gm.admit(worker(holders[0].pid, 1500), ledger2, nvidia, timeout_s=0.2)))

    print("== 12. soltar y dueños muertos liberan lo comprometido (invariante 7) ==")
    free.write_text("0, 5000\n"); apps.write_text("")
    ledger3 = tmp / "vram3.json"
    check("A reserva 3000", True, admitted(gm.admit(worker(holders[0].pid, 3000), ledger3, nvidia, timeout_s=0.2)))
    check("B no cabe mientras A tenga su reserva", False,
          admitted(gm.admit(worker(holders[1].pid, 3000), ledger3, nvidia, timeout_s=0.2, interval_s=0.05)))
    gm.release(ledger3, holders[0].pid)
    check("soltada la de A, B cabe", True,
          admitted(gm.admit(worker(holders[1].pid, 3000), ledger3, nvidia, timeout_s=0.2)))
    holders[1].kill(); holders[1].wait()
    check("con el dueño de B muerto, su reserva no cuenta", True,
          admitted(gm.admit(worker(holders[0].pid, 3000), ledger3, nvidia, timeout_s=0.2)))
    for h in holders: h.kill(); h.wait()
    parent.kill(); parent.wait()

    print("== 13. la decisión es pura: se prueba sin telemetría ni registro ==")
    check("5000 libres, nada comprometido, pide 3000: cabe", True, gm.admissible(5000, 0, 3000))
    check("5000 libres, 3000 comprometidos, pide 3000: no cabe", False, gm.admissible(5000, 3000, 3000))
    check("sin lectura de VRAM libre: no se admite", False, gm.admissible(None, 0, 1))
    check("elige el dispositivo con más margen que alcance", "GPU-10",
          gm.choose_device({"GPU-4": 4 * GIB, "GPU-10": 10 * GIB}, 3 * GIB, None))
    check("ninguno alcanza: None", None, gm.choose_device({"GPU-4": 4 * GIB, "GPU-10": 10 * GIB}, 12 * GIB, None))
    check("fijado a un dispositivo, sólo cuenta ése", None,
          gm.choose_device({"GPU-4": 4 * GIB, "GPU-10": 10 * GIB}, 8 * GIB, "GPU-4"))

    print("== 14. el registro: reservar, soltar, descartar dueños muertos ==")
    book = gm.VramLedger(tmp / "libro.json")
    alive = subprocess.Popen(["sleep", "5"])
    dead = subprocess.Popen(["true"]); dead.wait()
    book.save({r.key: r for r in (gm.WorkerReservation(alive.pid, 3000, "GPU-a"),
                                  gm.WorkerReservation(dead.pid, 2000, "GPU-a"))})
    check("sólo cuentan los dueños vivos", [f"worker:{alive.pid}"], sorted(book.live()))
    gm.release(tmp / "libro.json", alive.pid)
    check("soltada, no queda nada", {}, book.live())
    alive.kill(); alive.wait()

    print("== 5b. un proceso que sale a mitad del recorrido no tumba tree() ==")
    fake_proc = tmp / "proc"
    (fake_proc / "4242" / "task" / "4242").mkdir(parents=True)
    (fake_proc / "4242" / "task" / "4242" / "children").write_text("4243\n")
    (fake_proc / "4243" / "task").mkdir(parents=True)
    real_scandir = os.scandir

    def vanishing_scandir(path=".", *rest):
        if str(path).endswith(os.path.join("4243", "task")):
            raise FileNotFoundError(2, "No such file or directory", str(path))
        return real_scandir(path, *rest)

    os.scandir = vanishing_scandir
    try:
        try:
            walked = gm.tree(4242, proc_root=str(fake_proc))
        except OSError as error:
            walked = f"{type(error).__name__}"
    finally:
        os.scandir = real_scandir
    check("el hijo que desapareció cuenta y el recorrido sigue", {4242, 4243}, walked)

    print("== 15. watch con la fuente de un contenedor: mide sus PIDs, no los del cliente ==")
    relative = "/libpod_parent/libpod-gpu"
    podman = tmp / "podman"
    podman.write_text("#!/usr/bin/env bash\n"
                      'case "$*" in\n'
                      "  *exists*known*) exit 0 ;;\n  *exists*) exit 1 ;;\n"
                      f'  *inspect*known*) echo "true {relative}" ;;\n'
                      '  *) echo "orden no prevista: $*" >&2; exit 125 ;;\nesac\n')
    podman.chmod(0o755)
    cgroup_root = tmp / "cgroup"
    memory = cgroup_root / "memory" / relative.lstrip("/")
    memory.mkdir(parents=True)
    container_worker = subprocess.Popen(["sleep", "30"])
    (memory / "cgroup.procs").write_text(f"{container_worker.pid}\n")
    (memory / "memory.max_usage_in_bytes").write_text("1\n")
    (memory / "memory.usage_in_bytes").write_text("1\n")
    apps.write_text(f"{container_worker.pid}, 700\n{os.getpid()}, 5000\n")
    source = gm.ContainerMembers("known", str(podman), cgroup_root)
    threading.Timer(1.0, shutil.rmtree, args=(memory,)).start()
    out = tmp / "15.gpu"
    summary = gm.watch(source, out, capability_of(smi), interval_s=0.2)
    check("pico: los 700 MiB del contenedor, no los 5000 del cliente", 700,
          summary.peak_mib if summary else None)
    check("para cuando el cgroup desaparece", True, summary is not None and summary.samples >= 2)

    print("== 16. la fuente de contenedor que no puede dar PIDs: .gpu es error, nunca 0 ==")
    memory.mkdir(parents=True)
    (memory / "cgroup.procs").mkdir()
    (memory / "memory.max_usage_in_bytes").write_text("1\n")
    (memory / "memory.usage_in_bytes").write_text("1\n")
    out = tmp / "16.gpu"
    summary = gm.watch(source, out, capability_of(smi), interval_s=0.2)
    check("sin resumen publicado", None, summary)
    check("el archivo es error con causa, no ceros", "error", gm.read_gpu_file(out).state)

    print("== 17. la CLI: watch --container usa la fuente del contenedor ==")
    shutil.rmtree(memory)
    memory.mkdir(parents=True)
    (memory / "cgroup.procs").write_text(f"{container_worker.pid}\n")
    (memory / "memory.max_usage_in_bytes").write_text("1\n")
    (memory / "memory.usage_in_bytes").write_text("1\n")
    threading.Timer(1.0, shutil.rmtree, args=(memory,)).start()
    out = tmp / "17.gpu"
    done = run_cli("watch", str(os.getpid()), str(out), "--container", "known", "--podman", str(podman),
                   "--cgroup-root", str(cgroup_root), "--nvidia-smi", str(smi), "--interval", "0.2")
    reading = gm.read_gpu_file(out)
    check("la CLI mide el contenedor: pico 700", (0, 700),
          (done.returncode, reading.summary.peak_mib if reading.summary else None))
    container_worker.kill(); container_worker.wait()

    print("== 18. la VRAM se atribuye por PIDs del anfitrión, no del contenedor (invariante 8) ==")
    # Dentro del contenedor el trabajo es el PID 7; en el anfitrión es 5001, y
    # el 7 del anfitrión es otro proceso con 5000 MiB.
    host_view = FakeBackend({"GPU-a": 1000}, usage={5001: 700, 7: 5000})
    out = tmp / "18.gpu"
    capable = gb.probe_capability(host_view, no_hardware)
    summary = gm.watch(StaticMembers({5001}, 2), out, capable, interval_s=0.01)
    check("con los PIDs del anfitrión: 700", 700, summary.peak_mib if summary else None)
    check("con los del espacio del contenedor saldría otra cifra", 5000,
          sum(host_view.usage_by_pid({1, 7}).values()))

    print("== 19. cada reserva nombra su dispositivo: se admite contra lo libre de ESE ==")
    two = FakeBackend({"GPU-4": 4 * GIB, "GPU-10": 10 * GIB})
    ledger19 = tmp / "devices.json"
    check("4 GiB en una y 10 en otra no admiten 12", None,
          gm.admit(worker(os.getpid(), 12 * GIB), ledger19, two, timeout_s=0.1, interval_s=0.05))
    placed = gm.admit(worker(os.getpid(), 8 * GIB), ledger19, two, timeout_s=0.1, interval_s=0.05)
    check("8 GiB entran en la de 10", "GPU-10", placed.device if placed else None)
    other = subprocess.Popen(["sleep", "30"])
    second = gm.admit(worker(other.pid, 3 * GIB), ledger19, two, timeout_s=0.1, interval_s=0.05)
    check("la siguiente de 3 GiB va a la de 4: en la de 10 quedan 2", "GPU-4",
          second.device if second else None)
    other.kill(); other.wait()
    stored = json.loads(ledger19.read_text())
    check("el registro guarda tipo, dispositivo y MiB", {"kind": "worker", "device": "GPU-10", "mib": 8 * GIB},
          {k: stored[f"worker:{os.getpid()}"][k] for k in ("kind", "device", "mib")})
    gm.release(ledger19, os.getpid())

    print("== 20. los tres tipos: worker, residency y request ==")
    ledger20 = tmp / "types.json"
    residency = gm.admit(gm.ResidencyReservation("llama@host", 2, 6 * GIB), ledger20, two, timeout_s=0.1)
    check("una residency se reserva a nombre de su instancia y generación", "residency:llama@host:2",
          residency.key if residency else None)
    check("y vive sin PID que la sostenga", True, residency is not None and residency.key in gm.VramLedger(ledger20).live())
    requester = subprocess.Popen(["sleep", "30"])
    req = gm.admit(gm.RequestReservation("r-1", requester.pid, "residency:llama@host:2", 1 * GIB),
                   ledger20, two, timeout_s=0.1)
    check("la request va al dispositivo de su residency", residency.device if residency else "?",
          req.device if req else None)
    check("liberar la residency con una request viva se rehúsa", "ResidencyBusy",
          refusal_of(lambda: gm.release_residency(ledger20, "llama@host", 2)))
    check("y la residency sigue en el registro", True, "residency:llama@host:2" in gm.VramLedger(ledger20).live())
    check("otra generación no la libera", "sin excepción",
          refusal_of(lambda: gm.release_residency(ledger20, "llama@host", 1)))
    check("la de generación 2 sigue", True, "residency:llama@host:2" in gm.VramLedger(ledger20).live())
    check("una request sin su residency se rehúsa", "ResidencyMissing",
          refusal_of(lambda: gm.admit(gm.RequestReservation("r-2", requester.pid, "residency:otra:1", 1),
                                      ledger20, two, timeout_s=0.1)))
    requester.kill(); requester.wait()
    check("muerto su dueño, la request deja de contar", ["residency:llama@host:2"],
          sorted(gm.VramLedger(ledger20).live()))
    check("y la residency ya se puede liberar", "sin excepción",
          refusal_of(lambda: gm.release_residency(ledger20, "llama@host", 2)))
    check("sin reservas vivas no queda archivo", False, ledger20.exists())

    print("== 21. la CLI admit con requisito ==")
    cli_ledger = tmp / "cli" / "vram.json"
    check("none: sale 0 sin tocar el registro", (0, False),
          (run_cli("admit", "100", "--ledger", str(cli_ledger), "--owner", str(os.getpid()),
                   "--requirement", "none", "--nvidia-smi", str(tmp / "no-existe")).returncode, cli_ledger.parent.exists()))
    optional = run_cli("admit", "100", "--ledger", str(cli_ledger), "--owner", str(os.getpid()),
                       "--requirement", "optional", "--nvidia-smi", str(tmp / "no-existe"))
    check("optional sin telemetría: sale con su código de ruta CPU", gm.EXIT_CPU_FALLBACK, optional.returncode)
    check("y lo dice por stderr", True, "ruta CPU" in optional.stderr)
    required = run_cli("admit", "100", "--ledger", str(cli_ledger), "--owner", str(os.getpid()),
                       "--nvidia-smi", str(tmp / "no-existe"))
    check("sin requisito declarado es required: sale 2", 2, required.returncode)
    check("sin cifra en stdout", "", required.stdout)
    check("y el registro no se escribe", False, cli_ledger.parent.exists())

    print("== 22. la CLI capability publica el estado, no una cifra ==")
    shown = run_cli("capability", "--nvidia-smi", str(smi))
    check("con telemetría: available", "available", shown.stdout.split("\t")[0])
    free.write_text("0, 5000\n")

    print("== 6. available() distingue las dos situaciones ==")
    check("con el falso: sale 0", 0, run_cli("available", "--nvidia-smi", str(smi)).returncode)
    check("sin él: sale 2", 2, run_cli("available", "--nvidia-smi", str(tmp / "no-existe")).returncode)

print(f"\ntest_gpu_monitor: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
