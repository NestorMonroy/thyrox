"""La VRAM de un ítem del pool, como GNU Time mide su RAM.

``--memfree`` de GNU Parallel es memoria del SISTEMA; la de la GPU es otro
recurso y GNU Time no la ve. Este monitor muestrea ``nvidia-smi`` mientras
vive el ÁRBOL de procesos del ítem y deja ``<n>.gpu``, una línea::

    <vram pico MiB> <vram media MiB> <uso pico de GPU %> <muestras>

Cuenta la VRAM de todos los procesos del árbol (el ítem y sus hijos), no la
de los demás que compartan la GPU. El uso de GPU sólo se atribuye a una
muestra en la que el árbol tenía VRAM: ``nvidia-smi`` da el uso por GPU, no
por proceso.

Sin ``nvidia-smi`` no escribe nada —una medida ausente no es un cero—, y un
árbol que no usó la GPU escribe ceros, que sí son una medida. ``headless-pool``
lo lanza por ítem sólo si ``available()``; con ``claude -p`` el modelo corre
en el servidor y la GPU local no se usa, así que medirla sólo informa cuando
el pool corre trabajo local con CUDA.

Métrica: ``used_memory`` de ``nvidia-smi --query-compute-apps`` por PID del
árbol, sumada por muestra; ``utilization.gpu`` máxima entre GPUs.
Ciega a: un pico más corto que el intervalo de muestreo; la VRAM de un
proceso del árbol que ``nvidia-smi`` no lista (contenedores sin espacio de
PID compartido); y el uso de GPU de OTRO proceso en la misma muestra.
"""
from __future__ import annotations

import argparse
import json
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from session import shared_lock

DEFAULT_INTERVAL_S = 0.5
APPS_QUERY = ["--query-compute-apps=pid,used_memory", "--format=csv,noheader,nounits"]
UTIL_QUERY = ["--query-gpu=index,utilization.gpu", "--format=csv,noheader,nounits"]


class GpuUnavailable(Exception):
    """``nvidia-smi`` no está o no respondió: no hay con qué medir."""


@dataclass(frozen=True)
class Sample:
    vram_by_pid: dict[int, int]
    util_pct: int


@dataclass(frozen=True)
class Summary:
    peak_mib: int
    avg_mib: int
    peak_util_pct: int
    samples: int

    def line(self) -> str:
        return f"{self.peak_mib} {self.avg_mib} {self.peak_util_pct} {self.samples}"


def _query(nvidia_smi: str, args: list[str]) -> list[list[str]]:
    try:
        done = subprocess.run([nvidia_smi, *args], capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise GpuUnavailable(str(error)) from error
    if done.returncode != 0:
        raise GpuUnavailable(done.stderr.strip() or f"exit {done.returncode}")
    return [[cell.strip() for cell in line.split(",")] for line in done.stdout.splitlines() if line.strip()]


def sample(nvidia_smi: str = "nvidia-smi") -> Sample:
    """Una lectura: VRAM por PID y el uso máximo entre las GPUs."""
    vram = {int(pid): int(float(mib)) for pid, mib, *_ in _query(nvidia_smi, APPS_QUERY)}
    utils = [int(float(pct)) for _index, pct, *_ in _query(nvidia_smi, UTIL_QUERY)]
    return Sample(vram, max(utils, default=0))


FREE_QUERY = ["--query-gpu=index,memory.free", "--format=csv,noheader,nounits"]


def free_vram_mib(nvidia_smi: str = "nvidia-smi") -> int | None:
    """La VRAM libre de la GPU con MÁS espacio: un ítem corre en una GPU y no
    se reparte, así que la suma entre GPUs prometería un sitio que no existe.
    ``None`` sin ``nvidia-smi``."""
    try:
        rows = _query(nvidia_smi, FREE_QUERY)
    except GpuUnavailable:
        return None
    return max((int(float(mib)) for _index, mib, *_ in rows), default=None)


def available(nvidia_smi: str = "nvidia-smi") -> bool:
    try:
        sample(nvidia_smi)
    except GpuUnavailable:
        return False
    return True


def _alive(pid: int, proc_root: str = "/proc") -> bool:
    """Vivo y no zombi: un proceso terminado que nadie esperó sigue
    respondiendo a ``kill(pid, 0)``, pero su estado es ``Z``."""
    try:
        stat = Path(proc_root, str(pid), "stat").read_text()
    except OSError:
        return False
    return stat.rsplit(")", 1)[-1].split()[0] not in ("Z", "X")


def tree(pid: int, proc_root: str = "/proc") -> set[int]:
    """El PID y todos sus descendientes, por ``/proc/<pid>/task/*/children``."""
    seen, pending = set(), [pid]
    while pending:
        current = pending.pop()
        if current in seen:
            continue
        seen.add(current)
        for children in Path(proc_root, str(current), "task").glob("*/children"):
            try:
                pending.extend(int(c) for c in children.read_text().split())
            except OSError:
                continue
    return seen


def watch(pid: int, out: Path, nvidia_smi: str = "nvidia-smi",
          interval_s: float = DEFAULT_INTERVAL_S) -> Summary | None:
    """Muestrea mientras vive el árbol de ``pid`` y escribe ``out``."""
    if not available(nvidia_smi):
        return None
    totals, utils = [], []
    while True:
        try:
            current = sample(nvidia_smi)
        except GpuUnavailable as error:
            # Se intentó medir y falló: ni cero ni ausencia. No se publica un
            # resumen parcial como si fuera la medida del ítem.
            Path(out).write_text(f"error {error}\n")
            return None
        # La vida se comprueba ANTES de registrar: una muestra tomada con el
        # árbol ya terminado (el padre zombi, sin hijos) vale 0 MiB y bajaría
        # la media de una medida que no le pertenece. Sonda:
        # `.claude/workbench/gpu-vram-*/probe-tree-lifecycle.sh`.
        if not _alive(pid):
            break
        members = tree(pid)
        used = sum(mib for p, mib in current.vram_by_pid.items() if p in members)
        totals.append(used)
        utils.append(current.util_pct if used > 0 else 0)
        time.sleep(interval_s)
    if not totals:
        return None
    summary = Summary(max(totals), round(statistics.mean(totals)), max(utils), len(totals))
    Path(out).write_text(summary.line() + "\n")
    return summary


@dataclass(frozen=True)
class GpuReading:
    """Los TRES estados de un ``<n>.gpu``, que no se colapsan: ``measured``
    (incluido el cero, que es una medida), ``absent`` (no se midió) y
    ``error`` (se intentó y falló)."""
    state: str
    summary: Summary | None = None
    reason: str | None = None


def read_gpu_file(path: Path) -> GpuReading:
    try:
        text = Path(path).read_text(errors="replace").strip()
    except FileNotFoundError:
        return GpuReading("absent")
    if text.startswith("error"):
        return GpuReading("error", reason=text[len("error"):].strip())
    fields = text.split()
    if len(fields) == 4 and all(f.isdigit() for f in fields):
        return GpuReading("measured", Summary(*(int(f) for f in fields)))
    return GpuReading("error", reason=f"ilegible: {text[:80]!r}")


#: Reintentos del lock del registro: la sección crítica es una lectura de
#: nvidia-smi y una escritura, así que se espera a otro ítem, no a un paso.
LEDGER_LOCK_RETRIES = 50


class VramLedger:
    """El registro de VRAM comprometida: ``{pid del dueño: MiB reservados}``.
    Sólo persiste; no bloquea — quien lo usa sostiene el lock del archivo."""

    def __init__(self, path: Path):
        self.path = Path(path)

    def _read(self) -> dict[str, int]:
        try:
            return {pid: int(mib) for pid, mib in json.loads(self.path.read_text()).items()}
        except (OSError, ValueError):
            return {}

    def live(self) -> dict[str, int]:
        """Las reservas de dueños vivos: la de uno muerto ya no compromete nada."""
        return {pid: mib for pid, mib in self._read().items() if _alive(int(pid))}

    def save(self, reservations: dict[str, int]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        shared_lock.write_atomic(self.path, json.dumps(reservations, sort_keys=True))

    def reserve(self, owner_pid: int, need_mib: int) -> None:
        self.save({**self.live(), str(owner_pid): need_mib})

    def release(self, owner_pid: int) -> None:
        reservations = self._read()
        reservations.pop(str(owner_pid), None)
        self.save(reservations)


def measure(nvidia_smi: str) -> tuple[Sample | None, int | None]:
    """La medida: la muestra por PID y la VRAM libre; ``(None, None)`` sin GPU."""
    try:
        return sample(nvidia_smi), free_vram_mib(nvidia_smi)
    except GpuUnavailable:
        return None, None


def pending(reservations: dict[str, int], usage: dict[int, int], trees: dict[int, set[int]]) -> int:
    """Lo comprometido que la GPU aún NO muestra: de cada reserva, la parte
    que su árbol todavía no usa. Lo que ya usa ya está restado de lo libre, y
    contarlo otra vez bloquearía VRAM que sí existe."""
    total = 0
    for pid, mib in reservations.items():
        used = sum(usage.get(p, 0) for p in trees.get(int(pid), {int(pid)}))
        total += max(0, mib - used)
    return total


def admissible(free_mib: int | None, pending_mib: int, need_mib: int) -> bool:
    """La decisión, pura: cabe si lo libre menos lo comprometido alcanza."""
    return free_mib is not None and free_mib - pending_mib >= need_mib


def _try_admit(ledger: VramLedger, need_mib: int, owner_pid: int, nvidia_smi: str) -> bool:
    """Una pasada de comprobar-y-reservar. Se llama CON el lock sostenido: la
    atomicidad es del lock, no de juntar las responsabilidades en una función."""
    live = ledger.live()
    current, free = measure(nvidia_smi)
    usage = current.vram_by_pid if current else {}
    trees = {int(pid): tree(int(pid)) for pid in live}
    if admissible(free, pending(live, usage, trees), need_mib):
        ledger.reserve(owner_pid, need_mib)
        return True
    ledger.save(live)
    return False


def admit(need_mib: int, ledger: Path, owner_pid: int, nvidia_smi: str = "nvidia-smi",
          timeout_s: float = 600.0, interval_s: float = DEFAULT_INTERVAL_S) -> bool:
    """La admisión por VRAM SIN carrera de comprobar-y-usar.

    ``wait_free`` comprobaba sola cada ítem: con 5000 MiB libres dos ítems de
    3000 veían sitio los dos y arrancaban los dos (sonda:
    ``.claude/workbench/vram-toctou-*/probe-toctou.sh``). Aquí cada pasada de
    comprobar-y-reservar corre bajo el lock del registro (``shared_lock``), así
    que no queda ventana entre comprobar y reservar. Las responsabilidades
    siguen separadas: ``VramLedger`` persiste, ``measure`` mide, ``pending`` y
    ``admissible`` deciden; esta función sólo sostiene el lock y reintenta."""
    book = VramLedger(ledger)
    deadline = time.monotonic() + timeout_s
    while True:
        with shared_lock.held(book.path, run_id="vram-admission", retries=LEDGER_LOCK_RETRIES,
                              min_wait_s=0.01, max_wait_s=0.2):
            if _try_admit(book, need_mib, owner_pid, nvidia_smi):
                return True
        if time.monotonic() >= deadline:
            return False
        time.sleep(interval_s)


def release(ledger: Path, owner_pid: int) -> None:
    """Suelta la reserva de un ítem que terminó, bajo el lock del registro."""
    book = VramLedger(ledger)
    if not book.path.exists():
        return
    with shared_lock.held(book.path, run_id="vram-admission", retries=LEDGER_LOCK_RETRIES,
                          min_wait_s=0.01, max_wait_s=0.2):
        book.release(owner_pid)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="gpu_monitor", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="order", required=True)
    p_watch = sub.add_parser("watch", help="muestrea el árbol de PID y escribe OUT")
    p_watch.add_argument("pid", type=int)
    p_watch.add_argument("out", type=Path)
    p_watch.add_argument("--nvidia-smi", default="nvidia-smi")
    p_watch.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_avail = sub.add_parser("available", help="sale 0 si hay con qué medir, 2 si no")
    p_avail.add_argument("--nvidia-smi", default="nvidia-smi")
    p_admit = sub.add_parser("admit", help="reserva NEED MiB en el registro; sale 0, o 3 al vencer el plazo")
    p_admit.add_argument("need", type=int)
    p_admit.add_argument("--ledger", type=Path, required=True)
    p_admit.add_argument("--owner", type=int, required=True)
    p_admit.add_argument("--nvidia-smi", default="nvidia-smi")
    p_admit.add_argument("--timeout", type=float, default=600.0)
    p_admit.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_release = sub.add_parser("release", help="suelta la reserva de OWNER")
    p_release.add_argument("--ledger", type=Path, required=True)
    p_release.add_argument("--owner", type=int, required=True)
    p_free = sub.add_parser("free", help="imprime la VRAM libre (MiB) de la GPU con más espacio")
    p_free.add_argument("--nvidia-smi", default="nvidia-smi")
    args = parser.parse_args(argv)
    if args.order == "admit":
        return 0 if admit(args.need, args.ledger, args.owner, args.nvidia_smi, args.timeout, args.interval) else 3
    if args.order == "release":
        release(args.ledger, args.owner)
        return 0
    if args.order == "free":
        free = free_vram_mib(args.nvidia_smi)
        if free is None:
            return 2
        print(free)
        return 0
    if args.order == "available":
        return 0 if available(args.nvidia_smi) else 2
    return 0 if watch(args.pid, args.out, args.nvidia_smi, args.interval) else 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
