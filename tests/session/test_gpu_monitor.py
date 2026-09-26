"""La VRAM de cada ítem del pool, como GNU Time mide su RAM.

`--memfree` de GNU Parallel es memoria del SISTEMA; la de la GPU es otro
recurso y GNU Time no la ve. `gpu_monitor` la muestrea con `nvidia-smi`
mientras vive el ÁRBOL de procesos del ítem y deja `<n>.gpu`:

    <vram pico MiB> <vram media MiB> <uso pico de GPU %> <muestras>

Aquí no hay GPU, así que `nvidia-smi` es un falso que responde lo que el test
escribe en dos archivos. Eso prueba el mecanismo —qué PIDs cuenta, cuándo
para, qué hace sin GPU—, no la precisión de `nvidia-smi`, que es de NVIDIA.

Contrato:
  - cuenta sólo la VRAM del árbol del ítem, no la de otros procesos;
  - para cuando el árbol termina;
  - sin `nvidia-smi` no escribe nada: una medida ausente no es un cero;
  - un árbol que no usó la GPU SÍ escribe, con cero: eso es una medida.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from session import gpu_monitor as gm

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


FAKE_SMI = """#!/usr/bin/env bash
# nvidia-smi falso: las dos consultas que usa gpu_monitor, desde dos archivos.
case "$*" in
  *--query-compute-apps=pid,used_memory*) cat "$FAKE_GPU_APPS" ;;
  *--query-gpu=index,utilization.gpu*)    cat "$FAKE_GPU_UTIL" ;;
  *--query-gpu=index,memory.free*)        cat "$FAKE_GPU_FREE" ;;
  *) echo "consulta no prevista: $*" >&2; exit 9 ;;
esac
"""


def spawn_tree(seconds: float) -> tuple[subprocess.Popen, int]:
    """Un padre con un hijo: el hijo es quien usa la GPU, no el padre."""
    parent = subprocess.Popen(["bash", "-c", f"sleep {seconds} & echo $!; wait"],
                              stdout=subprocess.PIPE, text=True)
    return parent, int(parent.stdout.readline())


with tempfile.TemporaryDirectory() as raw:
    tmp = Path(raw)
    smi = tmp / "nvidia-smi"
    smi.write_text(FAKE_SMI); smi.chmod(0o755)
    apps, util = tmp / "apps.csv", tmp / "util.csv"
    os.environ["FAKE_GPU_APPS"], os.environ["FAKE_GPU_UTIL"] = str(apps), str(util)

    print("== 1. el árbol del ítem incluye a sus hijos ==")
    parent, child = spawn_tree(2)
    check("el hijo está en el árbol del padre", True, child in gm.tree(parent.pid))
    parent.wait()

    print("== 2. una muestra: VRAM por PID y uso por GPU ==")
    apps.write_text("4242, 300\n4343, 5000\n")
    util.write_text("0, 91\n1, 12\n")
    sample = gm.sample(str(smi))
    check("VRAM por PID", {4242: 300, 4343: 5000}, sample.vram_by_pid)
    check("uso pico entre GPUs", 91, sample.util_pct)

    print("== 3. watch cuenta SÓLO el árbol del ítem, y para cuando termina ==")
    parent, child = spawn_tree(1.5)
    apps.write_text(f"{child}, 300\n999999, 5000\n")
    out = tmp / "1.gpu"
    started = time.monotonic()
    summary = gm.watch(parent.pid, out, nvidia_smi=str(smi), interval_s=0.2)
    elapsed = time.monotonic() - started
    parent.wait()
    check("pico: los 300 MiB del hijo, no los 5000 ajenos", 300, summary.peak_mib)
    check("media", 300, summary.avg_mib)
    check("uso pico de GPU", 91, summary.peak_util_pct)
    check("varias muestras", True, summary.samples >= 3)
    check("para al terminar el árbol, no después", True, elapsed < 3.0)
    check("<n>.gpu con las cuatro cifras", f"300 300 91 {summary.samples}", out.read_text().strip())

    print("== 4. un árbol que no usó la GPU escribe CERO: eso es una medida ==")
    parent, child = spawn_tree(0.6)
    apps.write_text("999999, 5000\n")
    out = tmp / "2.gpu"
    summary = gm.watch(parent.pid, out, nvidia_smi=str(smi), interval_s=0.2)
    parent.wait()
    check("pico cero, uso cero", (0, 0), (summary.peak_mib, summary.peak_util_pct))
    check("y el archivo existe", True, out.exists())

    print("== 5. sin nvidia-smi no se escribe nada: ausente no es cero ==")
    parent, child = spawn_tree(0.3)
    out = tmp / "3.gpu"
    summary = gm.watch(parent.pid, out, nvidia_smi=str(tmp / "no-existe"), interval_s=0.1)
    parent.wait()
    check("sin resumen", None, summary)
    check("sin archivo", False, out.exists())

    print("== 7. la VRAM libre: la de la GPU con más espacio, que es donde cabe un ítem ==")
    free = tmp / "free.csv"
    os.environ["FAKE_GPU_FREE"] = str(free)
    free.write_text("0, 6000\n1, 11000\n")
    check("la mayor entre GPUs, no la suma: un ítem no se reparte", 11000, gm.free_vram_mib(str(smi)))
    check("sin nvidia-smi, None", None, gm.free_vram_mib(str(tmp / "no-existe")))

    print("== 8. TRES estados: medido 0, ausente, y error al medir ==")
    # nvidia-smi que responde las primeras N llamadas y luego falla: se intentó
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
    summary = gm.watch(parent.pid, out, nvidia_smi=str(flaky), interval_s=0.2)
    parent.wait()
    check("error al medir: sin resumen publicado", None, summary)
    # Se lee sin reventar: si el archivo falta, el caso tiene que salir FALLA,
    # no una excepción que un filtro de resumen lea como silencio.
    written = out.read_text() if out.exists() else ""
    check("el archivo declara el error y su causa", True,
          written.startswith("error ") and "mismatch" in written)
    check("read_gpu_file lo clasifica como error", "error", gm.read_gpu_file(out).state)
    check("un .gpu con ceros es una medida", "measured", gm.read_gpu_file(tmp / "2.gpu").state)
    check("sin archivo es ausente", "absent", gm.read_gpu_file(tmp / "3.gpu").state)

    print("== 9. admisión por VRAM: espera a que haya sitio antes de arrancar ==")
    free.write_text("0, 1000\n")
    check("sin sitio y sin plazo: no admite", False, gm.wait_free(2000, str(smi), timeout_s=0.5, interval_s=0.1))
    free.write_text("0, 5000\n")
    check("con sitio: admite enseguida", True, gm.wait_free(2000, str(smi), timeout_s=0.5, interval_s=0.1))
    free.write_text("0, 1000\n")
    subprocess.Popen(["bash", "-c", f"sleep 0.4; echo '0, 5000' > {free}"])
    check("se libera mientras espera: admite", True, gm.wait_free(2000, str(smi), timeout_s=3, interval_s=0.1))

    print("== 6. disponible() distingue las dos situaciones ==")
    check("con el falso: disponible", True, gm.available(str(smi)))
    check("sin él: no disponible", False, gm.available(str(tmp / "no-existe")))

print(f"\ntest_gpu_monitor: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
