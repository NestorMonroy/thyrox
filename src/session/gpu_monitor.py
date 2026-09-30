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
lo lanza por ítem sólo si ``available()``; con ``thyrox -p`` el modelo corre
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
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from session.resource_admission import (  # noqa: F401 — superficie pública de gpu_monitor
    LEDGER_LOCK_RETRIES,
    ReservationLedger as VramLedger,
    admissible,
    admit_with,
    is_alive as _alive,
    pending,
    release_from,
    tree,
)

DEFAULT_INTERVAL_S = 0.5
APPS_QUERY = ["--query-compute-apps=pid,used_memory", "--format=csv,noheader,nounits"]
UTILIZATION_QUERY = ["--query-gpu=index,utilization.gpu", "--format=csv,noheader,nounits"]


class GpuUnavailable(Exception):
    """``nvidia-smi`` no está o no respondió: no hay con qué medir."""


@dataclass(frozen=True)
class Sample:
    vram_by_pid: dict[int, int]
    utilization_pct: int


@dataclass(frozen=True)
class Summary:
    peak_mib: int
    avg_mib: int
    peak_utilization_pct: int
    samples: int

    def line(self) -> str:
        return f"{self.peak_mib} {self.avg_mib} {self.peak_utilization_pct} {self.samples}"


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
    utils = [int(float(pct)) for _index, pct, *_ in _query(nvidia_smi, UTILIZATION_QUERY)]
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
        utils.append(current.utilization_pct if used > 0 else 0)
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


def measure(nvidia_smi: str) -> tuple[Sample | None, int | None]:
    """La medida: la muestra por PID y la VRAM libre; ``(None, None)`` sin GPU."""
    try:
        return sample(nvidia_smi), free_vram_mib(nvidia_smi)
    except GpuUnavailable:
        return None, None


def headroom(live: dict[str, int], nvidia_smi: str) -> int | None:
    """El margen para un ítem nuevo: lo libre menos lo comprometido que la GPU
    aún no muestra. ``None`` si no hay lectura de la GPU — sin medida no hay
    margen, y un cero lo afirmaría. Es una consulta: no reserva ni bloquea."""
    current, free = measure(nvidia_smi)
    if free is None:
        return None
    usage = current.vram_by_pid if current else {}
    trees = {int(pid): tree(int(pid)) for pid in live}
    return free - pending(live, usage, trees)


def require_gpu(nvidia_smi: str) -> None:
    """Lanza ``GpuUnavailable`` con su causa si ``nvidia-smi`` no da la VRAM
    libre: sin GPU que medir no falta sitio, falta GPU."""
    _query(nvidia_smi, FREE_QUERY)


def admit(need_mib: int, ledger: Path, owner_pid: int, nvidia_smi: str = "nvidia-smi",
          timeout_s: float = 600.0, interval_s: float = DEFAULT_INTERVAL_S) -> bool:
    """La admisión por VRAM SIN carrera de comprobar-y-usar.

    Comprobar sin reservar deja una ventana: con 5000 MiB libres dos ítems de
    3000 veían sitio los dos y arrancaban los dos (sonda:
    ``.claude/workbench/vram-toctou-*/probe-toctou.sh``). El registro y el
    bucle de comprobar-y-reservar bajo lock son los de ``resource_admission``;
    la VRAM sólo aporta su medida, ``headroom``.

    Una GPU AUSENTE al empezar no es una GPU sin sitio: se rehúsa con
    ``GpuUnavailable`` antes de tocar el registro, en vez de sondear hasta el
    plazo para informar una causa falsa. Una lectura que falla a mitad de la
    espera sigue siendo «sin medida» y no admite."""
    require_gpu(nvidia_smi)
    return admit_with(ledger, need_mib, owner_pid, lambda live: headroom(live, nvidia_smi),
                      "vram-admission", timeout_s, interval_s)


def release(ledger: Path, owner_pid: int) -> None:
    """Suelta la reserva de un ítem que terminó, bajo el lock del registro."""
    release_from(ledger, owner_pid, "vram-admission")


EXIT_ADMITTED = 0
EXIT_ABSENT = 2
EXIT_TIMEOUT = 3


def admit_exit_code(args: argparse.Namespace) -> int:
    """``admit`` como código de salida: 0 reservó, 3 venció el plazo sin sitio,
    2 no hay GPU que medir — con la causa por stderr, como ``available``."""
    try:
        admitted = admit(args.need, args.ledger, args.owner, args.nvidia_smi, args.timeout, args.interval)
    except GpuUnavailable as error:
        print(f"gpu_monitor admit: nvidia-smi no responde ({args.nvidia_smi}): {error}; "
              "sin GPU que medir no se espera", file=sys.stderr)
        return EXIT_ABSENT
    return EXIT_ADMITTED if admitted else EXIT_TIMEOUT


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="gpu_monitor", description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="order", required=True)
    p_watch = sub.add_parser("watch", help="muestrea el árbol de PID y escribe OUT")
    p_watch.add_argument("pid", type=int)
    p_watch.add_argument("out", type=Path)
    p_watch.add_argument("--nvidia-smi", default="nvidia-smi")
    p_watch.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_avail = sub.add_parser("available", help="sale 0 si hay con qué medir, 2 si no")
    p_avail.add_argument("--nvidia-smi", default="nvidia-smi")
    p_admit = sub.add_parser("admit", help="reserva NEED MiB en el registro; sale 0, 3 al vencer el plazo, o 2 sin GPU que medir")
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
        return admit_exit_code(args)
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
