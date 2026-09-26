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
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

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
        except GpuUnavailable:
            break
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
    args = parser.parse_args(argv)
    if args.order == "available":
        return 0 if available(args.nvidia_smi) else 2
    return 0 if watch(args.pid, args.out, args.nvidia_smi, args.interval) else 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
