#!/usr/bin/env python3
"""La admisión por VRAM contra una GPU simulada CON ESTADO — prueba de
COMPONENTE (``gpu_monitor`` + ``VramLedger``), no de integración.

El nvidia-smi falso (``fakes/stateful-nvidia-smi.sh``) calcula lo libre como
el total menos lo que usan los procesos VIVOS; el asignador
(``fakes/stepped-alloc.sh``) sube su uso por pasos que el test ordena y
confirma. Así las fases —admitido, 1/4 asignado, …, todo asignado— las fija
el test, no el planificador del sistema.

Los dueños son cadenas de procesos como en producción: dueño -> envoltorio ->
asignador (en el pool: el shell del ítem -> GNU Time/timeout -> ``claude``).

Qué NO prueba esta suite, dicho para no presentarla como otra cosa:
- la integración de dos ``headless-pool`` sobre un registro común: eso vive en
  ``test-headless-pool.sh``;
- una GPU real: orden temporal de CUDA, PIDs de otro espacio de nombres,
  varias GPUs y MIG — lo mide ``hardware/test_gpu_admission_real.py``.
Es Linux: el árbol y la vida de un proceso se leen de ``/proc``, igual que en
el módulo que prueba.
"""
import contextlib
import os
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()
from session import gpu_monitor as gm  # noqa: E402

FAKES = Path(__file__).resolve().parent / "fakes"
STEP_TIMEOUT_S = 10.0
RACE_ROUNDS = 5

results = []


def check(name, expected, obtained):
    ok = expected == obtained
    results.append(ok)
    print(("  ok    " if ok else "  FALLA ") + name + ("" if ok else f" — esperado {expected!r}, obtenido {obtained!r}"))


def wait_until(predicate, what: str, timeout_s: float = STEP_TIMEOUT_S):
    deadline = time.monotonic() + timeout_s
    while not predicate():
        if time.monotonic() > deadline:
            raise TimeoutError(what)
        time.sleep(0.01)


class Gpu:
    """Una GPU simulada con su propio estado y su propio nvidia-smi: nada en
    ``os.environ``, así que dos escenarios no se ven entre sí."""

    def __init__(self, stack: contextlib.ExitStack, total_mib: int):
        self.dir = Path(stack.enter_context(tempfile.TemporaryDirectory(prefix="gpu-")))
        self.state = self.dir / "state"
        (self.state / "used").mkdir(parents=True)
        (self.state / "total").write_text(f"{total_mib}\n")
        self.smi = str(self.dir / "nvidia-smi")
        Path(self.smi).write_text(f'#!/usr/bin/env bash\nGPU_STATE="{self.state}" exec bash "{FAKES}/stateful-nvidia-smi.sh" "$@"\n')
        os.chmod(self.smi, 0o755)
        self.ledger = self.dir / "vram.json"
        self.stack = stack

    def job(self, mib: int = 0, steps: int = 0) -> "Job":
        return self.stack.enter_context(Job(self, mib, steps))

    def row(self) -> tuple[int, int, int | None, int | None]:
        """(usado por los dueños, pendiente, libre, margen) en este instante."""
        live = gm.VramLedger(self.ledger).live()
        usage = gm.sample(self.smi).vram_by_pid
        trees = {int(pid): gm.tree(int(pid)) for pid in live}
        used = sum(usage.get(p, 0) for t in trees.values() for p in t)
        return used, gm.pending(live, usage, trees), gm.free_vram_mib(self.smi), gm.headroom(live, self.smi)

    def admit(self, need: int, owner: "Job", timeout_s: float = 0.5) -> bool:
        return gm.admit(need, self.ledger, owner.pid, self.smi, timeout_s=timeout_s, interval_s=0.05)


class Job:
    """dueño (bash) -> envoltorio (bash) -> asignador por pasos. Los `; true`
    impiden que bash sustituya un nivel por `exec`: los tres procesos existen."""

    def __init__(self, gpu: Gpu, mib: int, steps: int):
        self.ctl = Path(tempfile.mkdtemp(dir=gpu.dir, prefix="ctl-"))
        alloc = f'GPU_STATE={gpu.state} bash {FAKES}/stepped-alloc.sh {self.ctl} {mib} {steps}'
        self.proc = subprocess.Popen(["bash", "-c", f"bash -c '{alloc}; true'; true"], start_new_session=True)
        self.pid = self.proc.pid

    def step(self, i: int) -> None:
        (self.ctl / f"go.{i}").touch()
        wait_until((self.ctl / f"ack.{i}").exists, f"paso {i} sin confirmar")

    def kill(self) -> None:
        if self.proc.poll() is None:
            os.killpg(self.pid, signal.SIGKILL)
        self.proc.wait()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.kill()


def proc_state(pid: int) -> str | None:
    """El estado de ``/proc/<pid>/stat``, tras el ÚLTIMO ``)``: el nombre del
    programa va entre paréntesis y puede llevar espacios o paréntesis."""
    try:
        return Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[0]
    except (OSError, IndexError):
        return None


def scenario_ramp():
    print("== 1. la reserva se vuelve uso paso a paso: pendiente baja, lo usado sube, el margen no cambia ==")
    with contextlib.ExitStack() as stack:
        gpu = Gpu(stack, 6000)
        a = gpu.job(3200, 4)
        check("A admitido", True, gpu.admit(3200, a))
        rows = [gpu.row()]
        for i in range(1, 5):
            a.step(i)
            rows.append(gpu.row())
        check("tabla (usado, pendiente, libre, margen) por paso", [
            (0, 3200, 6000, 2800),
            (800, 2400, 5200, 2800),
            (1600, 1600, 4400, 2800),
            (2400, 800, 3600, 2800),
            (3200, 0, 2800, 2800),
        ], rows)
        b = gpu.job()
        check("B de 3200 no cabe", False, gpu.admit(3200, b))
        check("B de 2800 sí cabe", True, gpu.admit(2800, b))


def scenario_overshoot():
    print("== 2. un dueño que usa MÁS de lo reservado: su exceso ya está en lo libre ==")
    with contextlib.ExitStack() as stack:
        gpu = Gpu(stack, 6000)
        a = gpu.job(4000, 1)
        check("A admitido con 3200", True, gpu.admit(3200, a))
        a.step(1)
        check("(usado, pendiente, libre, margen)", (4000, 0, 2000, 2000), gpu.row())


def scenario_sigkill():
    print("== 3. SIGKILL a mitad de la asignación, sin release: su reserva deja de contar ==")
    with contextlib.ExitStack() as stack:
        gpu = Gpu(stack, 6000)
        a = gpu.job(3200, 2)
        check("A admitido", True, gpu.admit(3200, a))
        a.step(1)
        b = gpu.job()
        check("B de 3200 no cabe mientras A vive", False, gpu.admit(3200, b))
        a.kill()
        check("B de 3200 entra tras el SIGKILL de A", True, gpu.admit(3200, b))
        check("el registro guarda sólo a B", [str(b.pid)], sorted(gm.VramLedger(gpu.ledger).live()))


def scenario_zombie():
    print("== 4. un dueño zombi (terminó y nadie lo cosechó) no retiene su reserva ==")
    with contextlib.ExitStack() as stack:
        gpu = Gpu(stack, 6000)
        owner = subprocess.Popen(["bash", "-c", "read -r _"], stdin=subprocess.PIPE)
        stack.callback(owner.wait)
        check("A admitido mientras vive", True, gm.admit(3200, gpu.ledger, owner.pid, gpu.smi, timeout_s=0.5, interval_s=0.05))
        b = gpu.job()
        check("B de 3200 no cabe mientras A vive", False, gpu.admit(3200, b))
        assert owner.stdin is not None  # se pidio con stdin=PIPE
        owner.stdin.close()
        wait_until(lambda: proc_state(owner.pid) == "Z", "A no llegó a zombi")
        check("A es zombi (sigue en /proc)", "Z", proc_state(owner.pid))
        check("B de 3200 entra", True, gpu.admit(3200, b))


def scenario_foreign():
    print("== 5. un proceso AJENO al registro: su VRAM ya resta de lo libre ==")
    with contextlib.ExitStack() as stack:
        gpu = Gpu(stack, 6000)
        foreign = gpu.job(5000, 1)
        foreign.step(1)
        check("margen = 1000", 1000, gm.headroom({}, gpu.smi))
        b = gpu.job()
        check("GPU casi llena: 3200 no entra", False, gpu.admit(3200, b))
        check("800 sí entra", True, gpu.admit(800, b))


def scenario_unmeasured():
    print("== 6. sin lectura de la GPU no hay margen: None, no cero ==")
    with tempfile.TemporaryDirectory() as tmp:
        smi = Path(tmp) / "nvidia-smi"
        smi.write_text(f'#!/usr/bin/env bash\nGPU_STATE="{tmp}/no-existe" exec bash "{FAKES}/stateful-nvidia-smi.sh" "$@"\n')
        os.chmod(smi, 0o755)
        check("headroom sin medida es None", None, gm.headroom({}, str(smi)))


RACER = r"""
import sys, time
from pathlib import Path
from session import gpu_monitor as gm
barrier, ledger, smi, need = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], int(sys.argv[4])
while not barrier.exists():
    time.sleep(0.001)
import os
print("admitido" if gm.admit(need, ledger, os.getpid(), smi, timeout_s=1.0, interval_s=0.05) else "esperó", flush=True)
sys.stdin.read()   # el dueño sigue vivo hasta que el test lo suelte
"""


def scenario_race():
    print(f"== 7. dos admisiones SIMULTÁNEAS tras una barrera, 4000 + 4000 sobre 6000, {RACE_ROUNDS} rondas ==")
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src")}
    admitted_per_round = []
    for _ in range(RACE_ROUNDS):
        with contextlib.ExitStack() as stack:
            gpu = Gpu(stack, 6000)
            barrier = gpu.dir / "go"
            racers = [subprocess.Popen([sys.executable, "-c", RACER, str(barrier), str(gpu.ledger), gpu.smi, "4000"],
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, env=env)
                      for _ in range(2)]
            for racer in racers:
                assert racer.stdin is not None and racer.stdout is not None
                stack.callback(racer.wait)
                stack.callback(racer.stdin.close)
            time.sleep(0.2)          # los dos ya esperan en la barrera
            barrier.touch()
            outcomes = sorted(racer.stdout.readline().strip() for racer in racers
                               if racer.stdout is not None)
            admitted_per_round.append(outcomes.count("admitido"))
    check("en cada ronda entra exactamente uno", [1] * RACE_ROUNDS, admitted_per_round)


def main() -> int:
    for scenario in (scenario_ramp, scenario_overshoot, scenario_sigkill, scenario_zombie,
                     scenario_foreign, scenario_unmeasured, scenario_race):
        scenario()
    total, failures = len(results), results.count(False)
    print(f"test_gpu_scenarios: {total - failures} ok, {failures} falla(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
