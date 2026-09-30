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

from paths import reach
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
    assert parent.stdout is not None  # se pidio con stdout=PIPE
    return parent, int(parent.stdout.readline())


with tempfile.TemporaryDirectory() as raw:
    tmp = Path(raw)
    smi = tmp / "nvidia-smi"
    smi.write_text(FAKE_SMI); smi.chmod(0o755)
    apps, utilization = tmp / "apps.csv", tmp / "util.csv"
    os.environ["FAKE_GPU_APPS"], os.environ["FAKE_GPU_UTIL"] = str(apps), str(utilization)

    print("== 1. el árbol del ítem incluye a sus hijos ==")
    parent, child = spawn_tree(2)
    check("el hijo está en el árbol del padre", True, child in gm.tree(parent.pid))
    parent.wait()

    print("== 2. una muestra: VRAM por PID y uso por GPU ==")
    apps.write_text("4242, 300\n4343, 5000\n")
    utilization.write_text("0, 91\n1, 12\n")
    sample = gm.sample(str(smi))
    check("VRAM por PID", {4242: 300, 4343: 5000}, sample.vram_by_pid)
    check("uso pico entre GPUs", 91, sample.utilization_pct)

    print("== 3. watch cuenta SÓLO el árbol del ítem, y para cuando termina ==")
    parent, child = spawn_tree(1.5)
    apps.write_text(f"{child}, 300\n999999, 5000\n")
    out = tmp / "1.gpu"
    started = time.monotonic()
    summary = gm.watch(parent.pid, out, nvidia_smi=str(smi), interval_s=0.2)
    elapsed = time.monotonic() - started
    parent.wait()
    assert summary is not None
    check("pico: los 300 MiB del hijo, no los 5000 ajenos", 300, summary.peak_mib)
    # La media NO se fija en 300: entre que el hijo termina y el padre sale hay
    # una ventana de milisegundos, y una muestra ahí mide 0 MiB, que es verdad
    # (el árbol no usaba VRAM en ese instante). Fijarla en 300 suponía una
    # sincronización que el test no controla: salió 262 de forma intermitente.
    check("media: positiva y no mayor que el pico", True, 0 < summary.avg_mib <= 300)
    check("uso pico de GPU", 91, summary.peak_utilization_pct)
    check("varias muestras", True, summary.samples >= 3)
    check("para al terminar el árbol, no después", True, elapsed < 3.0)
    check("<n>.gpu con las cuatro cifras", f"300 {summary.avg_mib} 91 {summary.samples}", out.read_text().strip())

    print("== 4. un árbol que no usó la GPU escribe CERO: eso es una medida ==")
    parent, child = spawn_tree(0.6)
    apps.write_text("999999, 5000\n")
    out = tmp / "2.gpu"
    summary = gm.watch(parent.pid, out, nvidia_smi=str(smi), interval_s=0.2)
    parent.wait()
    assert summary is not None
    check("pico cero, uso cero", (0, 0), (summary.peak_mib, summary.peak_utilization_pct))
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
    # Se lee sin lanzar una excepción: si el archivo falta, el caso sale FALLA,
    # no una excepción que un filtro de resumen lea como silencio.
    written = out.read_text() if out.exists() else ""
    check("el archivo declara el error y su causa", True,
          written.startswith("error ") and "mismatch" in written)
    check("read_gpu_file lo clasifica como error", "error", gm.read_gpu_file(out).state)
    check("un .gpu con ceros es una medida", "measured", gm.read_gpu_file(tmp / "2.gpu").state)
    check("sin archivo es ausente", "absent", gm.read_gpu_file(tmp / "3.gpu").state)

    print("== 9. admisión por VRAM: espera a que haya sitio antes de arrancar ==")
    ledger9 = tmp / "ledger9.json"
    owner9 = os.getpid()
    free.write_text("0, 1000\n")
    check("sin sitio y sin plazo: no admite", False,
          gm.admit(2000, ledger9, owner9, str(smi), timeout_s=0.5, interval_s=0.1))
    free.write_text("0, 5000\n")
    check("con sitio: admite enseguida", True,
          gm.admit(2000, ledger9, owner9, str(smi), timeout_s=0.5, interval_s=0.1))
    gm.release(ledger9, owner9)
    free.write_text("0, 1000\n")
    subprocess.Popen(["bash", "-c", f"sleep 0.4; echo '0, 5000' > {free}"])
    check("se libera mientras espera: admite", True,
          gm.admit(2000, ledger9, owner9, str(smi), timeout_s=3, interval_s=0.1))
    gm.release(ledger9, owner9)

    print("== 9b. el registro vive en un directorio que aún no existe: admit lo crea ==")
    # La primera ejecución de un pool con una base de historial nueva: el
    # directorio del registro no existe todavía, y el lock no podía crearse.
    fresh = tmp / "base-nueva" / "sub" / "vram.json"
    free.write_text("0, 5000\n")
    check("admite aunque el directorio no exista", True,
          gm.admit(2000, fresh, os.getpid(), str(smi), timeout_s=0.5, interval_s=0.1))
    gm.release(fresh, os.getpid())
    check("y release deja el registro vacío", {}, gm.VramLedger(fresh).live())
    check("release sobre un directorio inexistente no lanza", None,
          gm.release(tmp / "otra-base" / "vram.json", os.getpid()))

    print("== 9c. sin nvidia-smi que responda, admit rehúsa al instante: una ausencia no es una espera ==")
    # Sin GPU que medir no falta sitio, falta GPU: esperar el plazo informaría
    # una causa falsa. El registro no se escribe.
    absent_ledger = tmp / "absent" / "vram.json"
    started = time.monotonic()
    try:
        gm.admit(100, absent_ledger, os.getpid(), str(tmp / "no-existe"), timeout_s=5, interval_s=0.1)
        refusal = "admitió o venció"
    except gm.GpuUnavailable:
        refusal = "GpuUnavailable"
    check("sin nvidia-smi: GpuUnavailable, no un plazo vencido", "GpuUnavailable", refusal)
    check("y en menos de un segundo", True, time.monotonic() - started < 1.0)
    check("el registro no se escribe", False, absent_ledger.parent.exists())

    print("== 10. TOCTOU: dos admisiones simultáneas no reservan la misma VRAM ==")
    # 5000 libres y dos ítems de 3000 a la vez: comprobar sin reservar deja
    # arrancar a los dos (3000 + 3000 > 5000). Con el registro de lo comprometido,
    # uno entra y el otro espera. Sonda de shell que lo reprodujo:
    # `.claude/workbench/vram-toctou-*/probe-toctou.sh`.
    free.write_text("0, 5000\n")
    apps.write_text("")
    ledger = tmp / "vram.json"
    go = tmp / "go"
    racer = (f"import sys, time\nfrom pathlib import Path\nfrom session import gpu_monitor as gm\n"
             f"while not Path({str(go)!r}).exists(): time.sleep(0.001)\n"
             f"ok = gm.admit(3000, Path({str(ledger)!r}), owner_pid=int(sys.argv[1]), nvidia_smi={str(smi)!r},"
             f" timeout_s=0.8, interval_s=0.1)\n"
             f"print('admitido' if ok else 'esperó')\n")
    env = {**os.environ, "PYTHONPATH": str(reach.thyrox_root() / "src")}
    holders = [subprocess.Popen(["sleep", "5"]) for _ in range(2)]
    racers = [subprocess.Popen([sys.executable, "-c", racer, str(h.pid)], stdout=subprocess.PIPE, text=True, env=env)
              for h in holders]
    time.sleep(0.5); go.touch()
    outcomes = sorted(r.communicate(timeout=30)[0].strip() for r in racers)
    check("uno admitido y el otro esperó", ["admitido", "esperó"], outcomes)

    print("== 11. una reserva cuenta sólo lo que su árbol aún no usa: sin doble conteo ==")
    # El dueño ya ocupa sus 3000 y nvidia-smi ya los resta de lo libre: su
    # reserva no puede volver a restarse, o se bloquea VRAM que sí existe.
    ledger2 = tmp / "vram2.json"
    parent, child = spawn_tree(5)
    check("el primero reserva", True, gm.admit(3000, ledger2, owner_pid=parent.pid, nvidia_smi=str(smi), timeout_s=0.2))
    apps.write_text(f"{child}, 3000\n")
    free.write_text("0, 2000\n")
    check("con los 3000 ya visibles, 1500 caben en los 2000 libres", True,
          gm.admit(1500, ledger2, owner_pid=holders[0].pid, nvidia_smi=str(smi), timeout_s=0.2))

    print("== 12. soltar y dueños muertos liberan lo comprometido ==")
    free.write_text("0, 5000\n"); apps.write_text("")
    ledger3 = tmp / "vram3.json"
    check("A reserva 3000", True, gm.admit(3000, ledger3, owner_pid=holders[0].pid, nvidia_smi=str(smi), timeout_s=0.2))
    check("B no cabe mientras A tenga su reserva", False,
          gm.admit(3000, ledger3, owner_pid=holders[1].pid, nvidia_smi=str(smi), timeout_s=0.2, interval_s=0.05))
    gm.release(ledger3, holders[0].pid)
    check("soltada la de A, B cabe", True, gm.admit(3000, ledger3, owner_pid=holders[1].pid, nvidia_smi=str(smi), timeout_s=0.2))
    holders[1].kill(); holders[1].wait()
    check("con el dueño de B muerto, su reserva no cuenta", True,
          gm.admit(3000, ledger3, owner_pid=holders[0].pid, nvidia_smi=str(smi), timeout_s=0.2))
    for h in holders: h.kill(); h.wait()
    parent.kill(); parent.wait()

    print("== 13. la decisión es pura: se prueba sin nvidia-smi ni registro ==")
    check("5000 libres, nada comprometido, pide 3000: cabe", True, gm.admissible(5000, 0, 3000))
    check("5000 libres, 3000 comprometidos, pide 3000: no cabe", False, gm.admissible(5000, 3000, 3000))
    check("sin lectura de VRAM libre: no se admite", False, gm.admissible(None, 0, 1))
    usage = {10: 1000, 11: 500, 99: 7000}
    check("pendiente: cada reserva menos lo que su árbol ya usa", 1500 + 3000,
          gm.pending({"1": 3000, "2": 3000}, usage, trees={1: {1, 10, 11}, 2: {2}}))
    check("una reserva ya visible entera no cuenta", 0, gm.pending({"1": 1500}, usage, trees={1: {1, 10, 11}}))

    print("== 14. el registro: reservar, soltar, descartar dueños muertos ==")
    book = gm.VramLedger(tmp / "libro.json")
    alive = subprocess.Popen(["sleep", "5"])
    dead = subprocess.Popen(["true"]); dead.wait()
    book.reserve(alive.pid, 3000); book.reserve(dead.pid, 2000)
    check("sólo cuentan los dueños vivos", {str(alive.pid): 3000}, book.live())
    book.release(alive.pid)
    check("soltada, no queda nada", {}, book.live())
    alive.kill(); alive.wait()

    print("== 5b. un proceso que sale a mitad del recorrido no tumba tree() ==")
    # La carrera medida en test_gpu_trace.py: pathlib 3.11 comprueba que
    # `/proc/<pid>/task` es directorio y luego lo lista; si el proceso salió en
    # medio, `scandir` da FileNotFoundError. Se fuerza aquí, sin carrera real.
    fake_proc = tmp / "proc"
    (fake_proc / "4242" / "task" / "4242").mkdir(parents=True)
    (fake_proc / "4242" / "task" / "4242" / "children").write_text("4243\n")
    (fake_proc / "4243" / "task").mkdir(parents=True)
    real_scandir = os.scandir

    def vanishing_scandir(path=".", *rest):
        if str(path).endswith(os.path.join("4243", "task")):
            raise FileNotFoundError(2, "No such file or directory", str(path))
        return real_scandir(path, *rest)

    os.scandir = vanishing_scandir
    try:
        try:
            walked = gm.tree(4242, proc_root=str(fake_proc))
        except OSError as error:
            walked = f"{type(error).__name__}"
    finally:
        os.scandir = real_scandir
    check("el hijo que desapareció cuenta y el recorrido sigue", {4242, 4243}, walked)

    print("== 6. disponible() distingue las dos situaciones ==")
    check("con el falso: disponible", True, gm.available(str(smi)))
    check("sin él: no disponible", False, gm.available(str(tmp / "no-existe")))

print(f"\ntest_gpu_monitor: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
