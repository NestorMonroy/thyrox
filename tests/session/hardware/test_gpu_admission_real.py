#!/usr/bin/env python3
"""Nivel 2 — ¿el modelo del fake corresponde a esta GPU NVIDIA?

Corre ``cuda_stepped_alloc.py`` por pasos, registra la traza con
``gpu_trace.record`` y la compara con los supuestos del fake
(``gpu_trace.compare``). Deja ``trace.tsv`` y ``report.json`` en ``--out``
—por defecto ``.claude/build-logs/gpu-trace-<fecha>/``— para que la
calibración (sobrecarga de contexto, PIDs invisibles) se lleve al fake con su
evidencia.

Sale 0 si todo supuesto medido se cumple, 1 si alguno se viola, y 2 si no
pudo medir —sin ``nvidia-smi`` o sin PyTorch con CUDA—, sin publicar ninguna
cifra: un 0 ahí se leería como «el modelo es correcto».

La frontera de aceptación: que el fake pase prueba el mecanismo; que ESTE
arnés pase prueba que el modelo del fake corresponde a esta GPU; que
``test-gpu-pools-real.sh`` pase prueba la carga real de dos pools. Sólo los
tres juntos validan el control de VRAM.
"""
import argparse
import dataclasses
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "src"))
from session import gpu_monitor as gm  # noqa: E402
from session import gpu_trace as gt  # noqa: E402

ALLOCATOR = Path(__file__).resolve().parent / "cuda_stepped_alloc.py"


def refuse(reason: str) -> int:
    print(f"test_gpu_admission_real: REHÚSA — {reason}. No se midió nada.", file=sys.stderr)
    return 2


def cuda_ready() -> bool:
    probe = "import torch, sys; sys.exit(0 if torch.cuda.is_available() else 1)"
    return subprocess.run([sys.executable, "-c", probe], capture_output=True).returncode == 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="traza real de VRAM contra los supuestos del fake")
    parser.add_argument("--nvidia-smi", default="nvidia-smi")
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--mib", type=int, default=None, help="por defecto min(2048, libre/4)")
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--window", type=float, default=1.0)
    args = parser.parse_args(argv)

    if not gm.available(args.nvidia_smi):
        return refuse(f"nvidia-smi no responde ({args.nvidia_smi})")
    if not cuda_ready():
        return refuse("falta PyTorch con CUDA en este intérprete")
    free = gm.free_vram_mib(args.nvidia_smi)
    mib = args.mib or min(2048, free // 4)
    out = args.out or ROOT / ".claude/build-logs" / time.strftime("gpu-trace-%Y%m%dT%H%M%SZ", time.gmtime())
    out.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as ctl:
        rows = gt.record([sys.executable, str(ALLOCATOR), ctl, str(mib), str(args.steps)], Path(ctl),
                         mib=mib, steps=args.steps, nvidia_smi=args.nvidia_smi, window_s=args.window)
    gt.write_trace(out / "trace.tsv", rows)
    report = gt.compare(rows)
    (out / "report.json").write_text(json.dumps(
        {"assumptions": {k: dataclasses.asdict(v) for k, v in report.assumptions.items()},
         "calibration": report.calibration, "mib": mib}, indent=2, sort_keys=True) + "\n")
    for name, verdict in report.assumptions.items():
        print(f"{name}\t{verdict.state}\t{verdict.detail}")
    print(f"calibration\t{json.dumps(report.calibration, sort_keys=True)}")
    print(f"traza: {out / 'trace.tsv'}")
    states = {v.state for v in report.assumptions.values()}
    if "violated" in states:
        return 1
    return 2 if states == {"unmeasured"} else 0


if __name__ == "__main__":
    raise SystemExit(main())
