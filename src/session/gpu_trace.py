#!/usr/bin/env python3
"""La traza de VRAM de un asignador por pasos, y su comparación con los
supuestos del fake.

``tests/session/fakes/stateful-nvidia-smi.sh`` es un MODELO de la GPU: las
suites que corren contra él prueban el mecanismo de admisión, no que el
modelo corresponda a una GPU NVIDIA real. Este módulo es el puente entre los
dos: ``record`` corre un asignador que sube su uso por pasos (el protocolo de
``fakes/stepped-alloc.sh``: ``go.<i>`` / ``ack.<i>`` / ``stop``) y registra en
cada muestra lo reservado, lo asignado, lo que nvidia-smi atribuye al árbol
del asignador y lo libre; ``compare`` contrasta esa traza con cada supuesto
del modelo y, si no se cumple, nombra qué parámetro del fake corregir. Se
corrige el fake, no la lectura del hardware.

Cada supuesto sale en TRES estados, como la medida de VRAM: ``holds``,
``violated`` y ``unmeasured`` —la traza no tiene filas con qué decidirlo—. Un
supuesto sin medir no es un supuesto cumplido.

Ciega a: lo que el asignador no ejercita —varias GPUs, MIG, procesos que
comparten contexto—, y a la carga real de dos pools, que mide
``tests/session/hardware/test_gpu_pools_real.sh``.
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import statistics
import subprocess
import sys
import time
from pathlib import Path

from session import gpu_monitor

ASSUMPTIONS = ("pid_visible", "used_tracks_allocation", "no_context_overhead",
               "free_complement", "release_on_exit")
DEFAULT_TOLERANCE_MIB = 16
STEP_TIMEOUT_S = 30.0
COLUMNS = ("t_s", "pid", "reserved_mib", "allocated_mib", "smi_used_mib", "free_mib", "state")


@dataclasses.dataclass(frozen=True)
class TraceRow:
    t_s: float
    pid: int
    reserved_mib: int
    allocated_mib: int
    smi_used_mib: int | None
    free_mib: int | None
    state: str   # baseline | running | exited


@dataclasses.dataclass(frozen=True)
class Verdict:
    state: str   # holds | violated | unmeasured
    detail: str = ""


@dataclasses.dataclass(frozen=True)
class Report:
    assumptions: dict[str, Verdict]
    calibration: dict[str, float | int | None]


# --- registrar ---------------------------------------------------------------

def _observe(pid: int, nvidia_smi: str) -> tuple[int | None, int | None]:
    """Lo que nvidia-smi atribuye al ÁRBOL del asignador (None si no lista
    ninguno de sus PIDs) y lo libre (None sin lectura)."""
    current, free = gpu_monitor.measure(nvidia_smi)
    if current is None:
        return None, free
    listed = [current.vram_by_pid[p] for p in gpu_monitor.tree(pid) if p in current.vram_by_pid]
    return (sum(listed) if listed else None), free


def _sample_window(rows: list[TraceRow], t0: float, pid: int, reserved: int, allocated: int,
                   state: str, nvidia_smi: str, window_s: float, interval_s: float) -> None:
    end = time.monotonic() + window_s
    while True:
        used, free = _observe(pid, nvidia_smi)
        rows.append(TraceRow(round(time.monotonic() - t0, 6), pid, reserved, allocated, used, free, state))
        if time.monotonic() >= end:
            return
        time.sleep(interval_s)


def _await(path: Path, timeout_s: float = STEP_TIMEOUT_S) -> None:
    deadline = time.monotonic() + timeout_s
    while not path.exists():
        if time.monotonic() > deadline:
            raise TimeoutError(f"el asignador no confirmó {path.name}")
        time.sleep(0.01)


def record(alloc_cmd: list[str], ctl: Path, mib: int, steps: int, nvidia_smi: str = "nvidia-smi",
           window_s: float = 1.0, interval_s: float = 0.05, env: dict[str, str] | None = None) -> list[TraceRow]:
    """Corre el asignador y registra la traza: antes de asignar, tras cada
    paso confirmado y tras su salida. Lo reservado es ``mib`` en todas las
    filas: es lo que la admisión habría comprometido para este trabajo."""
    ctl.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(alloc_cmd, env=env)
    rows: list[TraceRow] = []
    t0 = time.monotonic()
    try:
        _sample_window(rows, t0, proc.pid, mib, 0, "baseline", nvidia_smi, window_s, interval_s)
        for i in range(1, steps + 1):
            (ctl / f"go.{i}").touch()
            _await(ctl / f"ack.{i}")
            _sample_window(rows, t0, proc.pid, mib, mib * i // steps, "running", nvidia_smi, window_s, interval_s)
        (ctl / "stop").touch()
        proc.wait(timeout=STEP_TIMEOUT_S)
        _sample_window(rows, t0, proc.pid, mib, 0, "exited", nvidia_smi, window_s, interval_s)
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait()
    return rows


def write_trace(path: Path, rows: list[TraceRow]) -> None:
    def cell(value) -> str:
        return "-" if value is None else (f"{value:.6f}" if isinstance(value, float) else str(value))
    lines = ["\t".join(COLUMNS)] + ["\t".join(cell(getattr(r, c)) for c in COLUMNS) for r in rows]
    path.write_text("\n".join(lines) + "\n")


def read_trace(path: Path) -> list[TraceRow]:
    def opt(value: str) -> int | None:
        return None if value == "-" else int(value)
    rows = []
    for line in path.read_text().splitlines()[1:]:
        t, pid, reserved, allocated, used, free, state = line.split("\t")
        rows.append(TraceRow(float(t), int(pid), int(reserved), int(allocated), opt(used), opt(free), state))
    return rows


# --- comparar ----------------------------------------------------------------

def settled(rows: list[TraceRow]) -> list[TraceRow]:
    """La última muestra de cada paso: la que ya tuvo la ventana para
    reflejarlo."""
    last: dict[int, TraceRow] = {}
    for row in rows:
        if row.state == "running":
            last[row.allocated_mib] = row
    return [last[k] for k in sorted(last)]


def _baseline_free(rows: list[TraceRow]) -> int | None:
    return next((r.free_mib for r in rows if r.state == "baseline" and r.free_mib is not None), None)


def _offsets(steps: list[TraceRow]) -> list[int]:
    return [r.smi_used_mib - r.allocated_mib for r in steps if r.smi_used_mib is not None]


def check_pid_visible(steps: list[TraceRow]) -> Verdict:
    if not steps:
        return Verdict("unmeasured", "sin pasos en marcha")
    hidden = [r.allocated_mib for r in steps if r.smi_used_mib is None]
    if not hidden:
        return Verdict("holds")
    return Verdict("violated", "nvidia-smi no lista el PID del asignador ni el de sus hijos en los pasos "
                   f"{hidden}: ¿otro espacio de nombres? Lo pendiente nunca baja; el fake debe declarar hide_pids")


def check_used_tracks_allocation(steps: list[TraceRow], tolerance: int) -> Verdict:
    offsets = _offsets(steps)
    if not offsets:
        return Verdict("unmeasured", "ningún paso con uso atribuido al PID")
    if max(offsets) - min(offsets) <= tolerance:
        return Verdict("holds")
    return Verdict("violated", f"el desfase uso - asignado no es constante: {offsets}")


def check_no_context_overhead(overhead: int | None, tolerance: int) -> Verdict:
    if overhead is None:
        return Verdict("unmeasured", "sin desfase medible")
    if abs(overhead) <= tolerance:
        return Verdict("holds")
    return Verdict("violated", f"el driver suma {overhead} MiB por proceso: el fake debe declarar "
                   f"context_overhead_mib={overhead}")


def check_free_complement(steps: list[TraceRow], baseline_free: int | None, tolerance: int) -> Verdict:
    pairs = [(baseline_free - r.free_mib, r.smi_used_mib) for r in steps
             if baseline_free is not None and r.free_mib is not None and r.smi_used_mib is not None]
    if not pairs:
        return Verdict("unmeasured", "sin libre de referencia o sin uso atribuido")
    bad = [(drop, used) for drop, used in pairs if abs(drop - used) > tolerance]
    if not bad:
        return Verdict("holds")
    return Verdict("violated", f"lo libre no baja lo que sube el uso (bajada, uso): {bad}; "
                   "hay memoria que el driver retiene fuera de los procesos")


def check_release_on_exit(rows: list[TraceRow], baseline_free: int | None, tolerance: int) -> Verdict:
    exited = [r for r in rows if r.state == "exited"]
    if not exited or baseline_free is None or exited[-1].free_mib is None:
        return Verdict("unmeasured", "sin muestras tras la salida del asignador")
    last = exited[-1]
    if last.smi_used_mib is None and abs(last.free_mib - baseline_free) <= tolerance:
        return Verdict("holds")
    return Verdict("violated", f"tras salir: uso {last.smi_used_mib}, libre {last.free_mib} "
                   f"(antes {baseline_free}); la VRAM no se devuelve al terminar el proceso")


def _visibility_lag(rows: list[TraceRow], overhead: int | None, tolerance: int) -> float | None:
    """El máximo, entre pasos, de cuánto tarda nvidia-smi en reflejar lo asignado."""
    if overhead is None:
        return None
    lags = []
    for allocated in sorted({r.allocated_mib for r in rows if r.state == "running"}):
        step = [r for r in rows if r.state == "running" and r.allocated_mib == allocated]
        hit = next((r for r in step if r.smi_used_mib is not None
                    and abs(r.smi_used_mib - allocated - overhead) <= tolerance), None)
        if hit is None:
            return None
        lags.append(round(hit.t_s - step[0].t_s, 6))
    return max(lags) if lags else None


def compare(rows: list[TraceRow], tolerance_mib: int = DEFAULT_TOLERANCE_MIB) -> Report:
    steps = settled(rows)
    baseline_free = _baseline_free(rows)
    offsets = _offsets(steps)
    overhead = round(statistics.median(offsets)) if offsets else None
    assumptions = {
        "pid_visible": check_pid_visible(steps),
        "used_tracks_allocation": check_used_tracks_allocation(steps, tolerance_mib),
        "no_context_overhead": check_no_context_overhead(overhead, tolerance_mib),
        "free_complement": check_free_complement(steps, baseline_free, tolerance_mib),
        "release_on_exit": check_release_on_exit(rows, baseline_free, tolerance_mib),
    }
    calibration = {"context_overhead_mib": overhead,
                   "visibility_lag_s": _visibility_lag(rows, overhead, tolerance_mib)}
    return Report(assumptions, calibration)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p_rec = sub.add_parser("record", help="corre ALLOC_CMD por pasos y escribe la traza TSV en OUT")
    p_rec.add_argument("out", type=Path)
    p_rec.add_argument("--ctl", type=Path, required=True, help="directorio de control go/ack/stop")
    p_rec.add_argument("--mib", type=int, required=True)
    p_rec.add_argument("--steps", type=int, default=4)
    p_rec.add_argument("--nvidia-smi", default="nvidia-smi")
    p_rec.add_argument("--window", type=float, default=1.0)
    p_rec.add_argument("--interval", type=float, default=0.05)
    p_rec.add_argument("alloc_cmd", nargs=argparse.REMAINDER)
    p_cmp = sub.add_parser("compare", help="contrasta una traza con los supuestos del fake")
    p_cmp.add_argument("trace", type=Path)
    p_cmp.add_argument("--tolerance", type=int, default=DEFAULT_TOLERANCE_MIB)
    args = parser.parse_args(argv)
    if args.command == "record":
        cmd = args.alloc_cmd[1:] if args.alloc_cmd[:1] == ["--"] else args.alloc_cmd
        if not cmd:
            parser.error("falta ALLOC_CMD tras --")
        write_trace(args.out, record(cmd, args.ctl, args.mib, args.steps, args.nvidia_smi,
                                     args.window, args.interval))
        return 0
    report = compare(read_trace(args.trace), args.tolerance)
    for name, verdict in report.assumptions.items():
        print(f"{name}\t{verdict.state}\t{verdict.detail}")
    print("calibration\t" + json.dumps(report.calibration, sort_keys=True))
    states = {v.state for v in report.assumptions.values()}
    if "violated" in states:
        return 1
    return 2 if states == {"unmeasured"} else 0


if __name__ == "__main__":
    sys.exit(main())
