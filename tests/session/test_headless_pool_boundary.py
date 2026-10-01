"""La frontera de ``headless-pool.sh`` (contrato de arquitectura de TASK-THYROX-0691).

El lanzador del pool reparte ítems; no decide cómo se materializa un trabajo.
Por eso no contiene lógica de registro, de credenciales de registro, de
ciclo de vida de imágenes, de Podman ni de cgroups: eso vive en el ejecutor,
``@thyrox/image-registry`` y ``@thyrox/podman-execution``.

La lógica de GPU (``nvidia-smi``, VRAM, ``gpu_monitor``) sí está hoy en el
lanzador. Es deuda conocida: sale de ahí cuando los ítems corran en Podman
sobre la primitiva (TASK-THYROX-0667). Hasta entonces su conteo queda
congelado: puede bajar y no puede subir.

Métrica: líneas del guion que contienen cada término.
Ciega a: la misma lógica escrita con otros nombres, o metida en un guion que
el lanzador invoca; esto mide el texto del lanzador, no su comportamiento.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUBJECT = ROOT / "src" / "session" / "headless-pool.sh"

FORBIDDEN_TERMS = {
    "registry": r"registry",
    "authfile": r"authfile",
    "docker": r"docker",
    "podman": r"\bpodman\b",
    "cgroup": r"cgroup",
    "image lifecycle label": r"io\.thyrox\.image",
    "registry credential": r"REGISTRY_PUBLISHER",
}

# Techo de cada término: el conteo medido en el lanzador. Puede bajar; no subir.
FROZEN_GPU_TERMS = {
    "nvidia-smi": (r"nvidia-smi", 10),
    "VRAM": (r"VRAM", 34),
    "gpu_monitor": (r"gpu_monitor", 4),
}

OK = FAILED = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global OK, FAILED
    if condition:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLA {label}{': ' + detail if detail else ''}")
        FAILED += 1


def count_lines(text: str, pattern: str) -> int:
    expression = re.compile(pattern)
    return sum(1 for line in text.splitlines() if expression.search(line))


def main() -> int:
    if not SUBJECT.is_file():
        print(f"NO MEDIDO: no existe {SUBJECT}", file=sys.stderr)
        return 2
    text = SUBJECT.read_text(encoding="utf-8")
    for name, pattern in FORBIDDEN_TERMS.items():
        found = count_lines(text, pattern)
        check(f"sin {name} en el lanzador", found == 0, f"{found} línea(s)")
    for name, (pattern, frozen) in FROZEN_GPU_TERMS.items():
        found = count_lines(text, pattern)
        check(f"{name} no crece (deuda de TASK-THYROX-0667: {found} de {frozen})", found <= frozen, f"{found} > {frozen}")
    print(f"{OK} ok, {FAILED} fallas (alcance medido: 1 archivo, {len(FORBIDDEN_TERMS)} términos prohibidos, {len(FROZEN_GPU_TERMS)} congelados)")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
