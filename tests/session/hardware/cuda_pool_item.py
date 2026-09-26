#!/usr/bin/env python3
"""Un ítem de ``headless-pool`` que usa la GPU de verdad, en lugar de
``claude -p``: lee el prompt por stdin, espera ``CUDA_ITEM_DELAY`` s (el
arranque antes de asignar, la ventana de la carrera), asigna
``CUDA_ITEM_MIB`` MiB, los sostiene ``CUDA_ITEM_HOLD`` s y responde con la
línea ``result`` de stream-json que el pool espera. Anota su arranque y su fin
en ``RAMPA_LOG`` para medir cuántos ítems corrieron a la vez.

Exige PyTorch con CUDA; sin él sale 2 sin asignar nada.
"""
import json
import os
import sys
import time


def main() -> int:
    sys.stdin.read()
    try:
        import torch
    except ModuleNotFoundError:
        print("cuda_pool_item: falta PyTorch", file=sys.stderr)
        return 2
    if not torch.cuda.is_available():
        print("cuda_pool_item: PyTorch no ve ninguna GPU CUDA", file=sys.stderr)
        return 2
    log = os.environ["RAMPA_LOG"]
    with open(log, "a") as f:
        f.write(f"start {time.time():.6f}\n")
    time.sleep(float(os.environ.get("CUDA_ITEM_DELAY", "3")))
    held = torch.empty(int(os.environ["CUDA_ITEM_MIB"]) * 1024 * 1024, dtype=torch.uint8, device="cuda")
    torch.cuda.synchronize()
    time.sleep(float(os.environ.get("CUDA_ITEM_HOLD", "2")))
    del held
    with open(log, "a") as f:
        f.write(f"end {time.time():.6f}\n")
    print(json.dumps({"type": "result", "result": "cuda item ok"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
