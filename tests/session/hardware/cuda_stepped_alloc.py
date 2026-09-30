#!/usr/bin/env python3
"""Asignador CUDA REAL con el protocolo de ``fakes/stepped-alloc.sh``: antes
del paso i espera ``CTL/go.<i>``, asigna ``MIB/STEPS`` MiB en la GPU y
confirma con ``CTL/ack.<i>``; sostiene lo asignado hasta ``CTL/stop``.

Es la contraparte real del asignador falso: la misma traza sale de los dos, y
``gpu_trace compare`` dice en qué difieren. Exige PyTorch con CUDA; sin él
rehúsa con exit 2 nombrando lo que falta, sin asignar nada.
Uso: cuda_stepped_alloc.py CTL MIB STEPS
"""
import sys
import time
from pathlib import Path

MIB = 1024 * 1024
STEP_TIMEOUT_S = 60.0


def require_cuda():
    try:
        import torch
    except ModuleNotFoundError:
        print("cuda_stepped_alloc: REHÚSA — falta PyTorch (`pip install torch`)", file=sys.stderr)
        raise SystemExit(2)
    if not torch.cuda.is_available():
        print("cuda_stepped_alloc: REHÚSA — PyTorch no ve ninguna GPU CUDA", file=sys.stderr)
        raise SystemExit(2)
    return torch


def await_file(path: Path) -> None:
    deadline = time.monotonic() + STEP_TIMEOUT_S
    while not path.exists():
        if time.monotonic() > deadline:
            raise SystemExit(7)
        time.sleep(0.01)


def main() -> int:
    ctl, mib, steps = Path(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    torch = require_cuda()
    held = []
    done = 0
    for i in range(1, steps + 1):
        await_file(ctl / f"go.{i}")
        target = mib * i // steps
        held.append(torch.empty((target - done) * MIB, dtype=torch.uint8, device="cuda"))
        torch.cuda.synchronize()
        done = target
        (ctl / f"ack.{i}").touch()
    await_file(ctl / "stop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
