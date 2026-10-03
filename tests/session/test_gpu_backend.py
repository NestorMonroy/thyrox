"""La GPU como capacidad opcional: el puerto de telemetría y la sonda de capacidad.

Dos observaciones distintas (ADR-007 1.6.1): ``hardware-inventory`` responde
«¿hay evidencia física de GPU?» y ``GpuMemoryBackend`` responde «¿puedo
observar su memoria?». La capa de capacidad las combina y ninguna ausencia de
backend produce una cantidad: ``measured(0)``, ``absent``, ``unavailable`` y
``error`` son disjuntos.

Todo lo que no es el backend NVIDIA se prueba con backends falsos en Python,
sin simular el binario. El backend NVIDIA se prueba contra un ejecutable falso
porque su responsabilidad ES hablar con ese binario.

Invariantes de TASK-THYROX-0691 que cubre este guion: 1, 2, 5, 11, la
superficie del binario (contrato 7 / corrección 3), el historial sin ceros
(contrato 10) y la memoria por dispositivo (enmienda 1.7.0, punto 1).
Las de admisión y atribución (3, 4, 6, 7, 8) viven en ``test_gpu_monitor.py``.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from agents import model_catalog  # noqa: E402
from session import gpu_backend as gb  # noqa: E402
from session import pool_history as ph  # noqa: E402

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


DEFAULT_DEVICES = {"GPU-a": 5000}


class FakeBackend:
    """Un backend con memoria declarada por dispositivo; ``devices`` ``None``
    hace fallar la lectura."""

    def __init__(self, devices: dict[str, int] | None = DEFAULT_DEVICES, usable: bool = True):
        self.memory = devices
        self.usable = usable

    def available(self) -> bool:
        return self.usable

    def devices(self) -> list[gb.DeviceMemory]:
        if self.memory is None:
            raise gb.GpuReadFailed("lectura simulada fallida")
        return [gb.DeviceMemory(device, free) for device, free in self.memory.items()]

    def usage_by_pid(self, pids) -> dict[int, int]:
        return {}

    def utilization_pct(self) -> int:
        return 0

    def identity(self) -> str:
        return "fake"


class CountingEvidence:
    """Evidencia de hardware declarada que cuenta cuántas veces se consultó."""

    def __init__(self, evidence: gb.HardwareEvidence | None):
        self.evidence = evidence
        self.calls = 0

    def __call__(self) -> gb.HardwareEvidence:
        self.calls += 1
        if self.evidence is None:
            raise gb.EvidenceUnavailable("inventario simulado sin veredicto")
        return self.evidence


def fake_binary(directory: Path, name: str, free_rows: str) -> Path:
    smi = directory / name
    smi.write_text("#!/usr/bin/env bash\n"
                   'case "$*" in\n'
                   '  *--query-compute-apps=pid,used_memory*) echo "4242, 300"; echo "4343, 5000" ;;\n'
                   '  *--query-gpu=index,utilization.gpu*)    echo "0, 91"; echo "1, 12" ;;\n'
                   f"  *--query-gpu=index,memory.free*)        printf '{free_rows}' ;;\n"
                   '  *) exit 9 ;;\nesac\n')
    smi.chmod(0o755)
    return smi


def fake_inventory(directory: Path, name: str, verdict: str, code: int) -> list[str]:
    script = directory / name
    script.write_text(f"#!/usr/bin/env bash\nprintf 'signal\\tpci_nvidia\\tabsent\\t-\\n'\n"
                      f"printf 'verdict\\t{verdict}\\tmissing=-\\n'\nexit {code}\n")
    script.chmod(0o755)
    return [str(script)]


def read_outcome(backend: gb.NvidiaSmiBackend) -> str:
    """Lee los dispositivos y resume qué pasó, sin dejar escapar la excepción."""
    try:
        backend.devices()
    except gb.GpuReadFailed as error:
        return f"GpuReadFailed: {error}"
    return "devolvió dispositivos"


with tempfile.TemporaryDirectory() as raw:
    tmp = Path(raw)

    print("== 1. el backend NVIDIA habla con su binario, por dispositivo ==")
    nvidia = gb.NvidiaSmiBackend(str(fake_binary(tmp, "smi-uuid", "0, 6000, GPU-aaa\\n1, 11000, GPU-bbb\\n")))
    check("disponible con el binario que responde", True, nvidia.available())
    check("cada dispositivo con su UUID y su libre",
          [gb.DeviceMemory("GPU-aaa", 6000), gb.DeviceMemory("GPU-bbb", 11000)], nvidia.devices())
    check("la mayor libre es la de un dispositivo, no la suma", 11000, gb.largest_free_mib(nvidia))
    check("uso sólo de los PIDs pedidos", {4242: 300}, nvidia.usage_by_pid({4242, 1}))
    check("uso pico entre GPUs", 91, nvidia.utilization_pct())
    check("la identidad nombra el binario", True, str(tmp) in nvidia.identity())
    legacy = gb.NvidiaSmiBackend(str(fake_binary(tmp, "smi-index", "0, 5000\\n")))
    check("un binario sin columna uuid identifica por índice",
          [gb.DeviceMemory("index:0", 5000)], legacy.devices())
    empty = gb.NvidiaSmiBackend(str(fake_binary(tmp, "smi-empty", "")))
    check("sin ninguna GPU listada: lectura fallida, no lista vacía", True,
          read_outcome(empty).startswith("GpuReadFailed"))
    check("y no está disponible", False, empty.available())
    garbled = gb.NvidiaSmiBackend(str(fake_binary(tmp, "smi-garbled", "0, [N/A], GPU-x\\n")))
    check("una cifra ilegible es lectura fallida, no una excepción suelta", True,
          read_outcome(garbled).startswith("GpuReadFailed"))
    missing = gb.NvidiaSmiBackend(str(tmp / "no-existe"))
    check("sin binario: no disponible", False, missing.available())
    check("sin binario, la lectura lanza con la causa y no da cifra", True,
          "no responde" in read_outcome(missing))

    print("== 2. la capacidad combina evidencia de hardware y backend ==")
    evidence = CountingEvidence(gb.HardwareEvidence.NONE)
    capability = gb.probe_capability(None, evidence)
    check("ninguna evidencia, ningún backend: absent", gb.ABSENT, capability.state)
    check("absent no lleva telemetría", None, capability.telemetry)
    check("partial sin backend usable: unavailable", gb.UNAVAILABLE,
          gb.probe_capability(FakeBackend(usable=False), CountingEvidence(gb.HardwareEvidence.PARTIAL)).state)
    check("GPU usable en el inventario sin backend: unavailable", gb.UNAVAILABLE,
          gb.probe_capability(None, CountingEvidence(gb.HardwareEvidence.USABLE)).state)
    check("inventario sin veredicto y sin backend: error", gb.ERROR,
          gb.probe_capability(None, CountingEvidence(None)).state)
    lazy = CountingEvidence(gb.HardwareEvidence.NONE)
    check("backend usable sin evidencia física: la telemetría decide", gb.AVAILABLE,
          gb.probe_capability(FakeBackend(), lazy).state)
    check("con backend usable no se consulta el inventario", 0, lazy.calls)

    print("== 3. partial + backend usable: capacidad y medida son dos etapas ==")
    partial = CountingEvidence(gb.HardwareEvidence.PARTIAL)
    good = gb.probe_capability(FakeBackend({"GPU-a": 4000}), partial)
    check("etapa 1 — partial con backend usable: telemetría available", gb.AVAILABLE, good.state)
    check("etapa 2 — lectura válida: measured", gb.Measured(4000), gb.measure_free(good))
    failing = gb.probe_capability(FakeBackend(None), partial)
    check("etapa 2 — lectura que falla: error, sin cifra", gb.ERROR, gb.measure_free(failing).state)

    print("== 4. ninguna ausencia es un cero (invariantes 2, 5 y 11) ==")
    absent = gb.measure_free(capability)
    check("sin backend la medida es el estado absent", gb.ABSENT, absent.state)
    check("y lleva su causa", True, isinstance(absent, gb.Unmeasured) and "GPU" in absent.reason)
    check("y no es measured(0)", False, absent == gb.Measured(0))
    unavailable = gb.measure_free(gb.probe_capability(None, CountingEvidence(gb.HardwareEvidence.PARTIAL)))
    measured_zero = gb.measure_free(gb.probe_capability(FakeBackend({"GPU-a": 0}), lazy))
    check("measured(0) es una medida", gb.Measured(0), measured_zero)
    states = {measured_zero.state, absent.state, unavailable.state, gb.measure_free(failing).state}
    check("measured, absent, unavailable y error son cuatro estados", 4, len(states))
    check("un estado sin medida no tiene atributo de cantidad", False, hasattr(absent, "mib"))
    check("sin medida, la dimensión de anchura desaparece (None)", None, gb.free_mib_or_none(absent))
    check("measured(0) sí es una dimensión: 0", 0, gb.free_mib_or_none(measured_zero))

    print("== 5. el inventario es evidencia; su código y su veredicto tienen que coincidir ==")
    check("nvidia-usable, exit 0", gb.HardwareEvidence.USABLE,
          gb.read_inventory(fake_inventory(tmp, "inv-usable", "nvidia-usable", 0)))
    check("none, exit 1", gb.HardwareEvidence.NONE, gb.read_inventory(fake_inventory(tmp, "inv-none", "none", 1)))
    check("partial, exit 3", gb.HardwareEvidence.PARTIAL,
          gb.read_inventory(fake_inventory(tmp, "inv-partial", "partial", 3)))
    for name, verdict, code in (("inv-refused", "none", 2), ("inv-contradiction", "none", 3),
                                ("inv-unknown", "quizá", 0)):
        try:
            gb.read_inventory(fake_inventory(tmp, name, verdict, code))
            outcome = "evidencia"
        except gb.EvidenceUnavailable:
            outcome = "sin evidencia"
        check(f"rehúsa, se contradice o no se entiende: sin evidencia ({name})", "sin evidencia", outcome)
    check("el inventario real del árbol responde con un veredicto", True,
          isinstance(gb.read_inventory(gb.DEFAULT_INVENTORY_COMMAND), gb.HardwareEvidence))

    print("== 6. la ruta se decide ANTES de ejecutar, por el requisito declarado ==")
    table = {(gb.GpuRequirement.NONE, True): gb.Route.UNCONSTRAINED,
             (gb.GpuRequirement.NONE, False): gb.Route.UNCONSTRAINED,
             (gb.GpuRequirement.OPTIONAL, True): gb.Route.GPU,
             (gb.GpuRequirement.OPTIONAL, False): gb.Route.CPU_FALLBACK,
             (gb.GpuRequirement.REQUIRED, True): gb.Route.GPU,
             (gb.GpuRequirement.REQUIRED, False): gb.Route.REFUSE}
    for (requirement, usable), route in table.items():
        check(f"{requirement.value} con backend={usable}: {route.value}", route,
              gb.plan_route(requirement, FakeBackend() if usable else None))

    print("== 7. el historial conserva la ausencia de dimensión (contrato 10) ==")
    run = tmp / "run"
    run.mkdir()
    for n, content in ((1, "unavailable GPU sin telemetría\n"), (2, "error NVML: mismatch\n")):
        (run / f"{n}.time").write_text("1000 1.0 0.00 0.00\n")
        (run / f"{n}.gpu").write_text(content)
        (run / f"{n}.closed").write_text(f'{{"item": "{n}", "generation": 1, "artifacts": {{}}}}')
    row = ph.record(tmp / "history", run)
    check("sin pico de VRAM en la fila", False, row is not None and "peak_vram_mib" in row)
    check("ningún ítem cuenta como medido en VRAM", 0, row["items_gpu_measured"] if row else None)

    print("== 8. sin telemetría la anchura no se reduce (invariante 1) ==")
    decision = ph.derive(tmp / "history", "claude-sonnet-5", model_catalog.require_catalog(),
                         free_vram_mib=gb.free_mib_or_none(absent), available_ram_kb=10_000_000)
    check("sin tope de VRAM", None, decision.vram_cap)
    check("ni petición de VRAM", None, decision.vram_need_mib)
    check("el tope es sólo el de RAM", decision.ram_cap, decision.width_cap)

print("== 9. superficie: el binario de NVIDIA sólo en los archivos permitidos ==")
# Cada entrada lleva su razón; una referencia nueva en cualquier otro archivo
# de producción rompe la prueba (se comparan archivos, no un conteo).
ALLOWED = {
    "src/session/gpu_backend.py",            # el backend NVIDIA
    "src/session/hardware-inventory.sh",     # la sonda de hardware
    "src/session/gpu_trace.py",              # arnés de nivel 2: registra el binario real
    "src/session/headless-pool.sh",          # ítem B: su variable de configuración del binario
    "src/packages/config/gpuAdmission.ts",   # configuración: la opción de CLI que declara el binario
}
SCANNED = ("src/session", "src/lib", "src/packages", "bin")
SKIPPED = ("__tests__", "/dist/", "node_modules", "/tests/")
listed = subprocess.run(["git", "grep", "-l", "--untracked", "nvidia-smi", "--", *SCANNED],
                        cwd=ROOT, capture_output=True, text=True)
check("git grep respondió", True, listed.returncode in (0, 1))
found = {path for path in listed.stdout.split()
         if path.endswith((".py", ".sh", ".ts")) or path.startswith("bin/")}
found = {path for path in found if not any(skip in f"/{path}" for skip in SKIPPED)}
check("cada archivo que nombra el binario está en la lista", set(), found - ALLOWED)

print(f"\ntest_gpu_backend: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
