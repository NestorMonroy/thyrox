"""La GPU como capacidad opcional del anfitrión: el puerto de telemetría y la sonda.

Dos observaciones distintas (ADR-007 1.6.1):

- ``hardware-inventory`` responde «¿hay evidencia física de GPU?»;
- ``GpuMemoryBackend`` responde «¿puedo observar su memoria?».

La capa de capacidad (``probe_capability``) las combina:

    evidencia de hardware   backend          estado
    ninguna                 ninguno usable   absent
    presente o partial      ninguno usable   unavailable
    cualquiera              usable           available (la telemetría decide)

y sólo con telemetría ``available`` una lectura concreta da ``Measured`` o un
``Unmeasured`` de estado ``error``. La ausencia de backend no es una
implementación medible: se representa con ``None``, no con un backend que
devuelva ceros, y ``Unmeasured`` no tiene atributo de cantidad. Así el tipo no
permite que ``absent``, ``unavailable`` o ``error`` se lean como ``measured(0)``.

La memoria se lee POR DISPOSITIVO (ADR-007 1.7.0): cada reserva nombra el suyo
y la admisión compara contra lo libre de ese dispositivo, nunca contra la suma
del anfitrión. ``largest_free_mib`` es la cifra única que la anchura necesita.

El requisito de GPU es propiedad declarada del trabajo (``none``, ``optional``,
``required``); ``plan_route`` decide la ruta ANTES de ejecutar y nunca
convierte ``required`` en ``optional``.

Este módulo y la sonda de hardware son los únicos de ``src/session`` que
nombran el binario de NVIDIA; el resto trabaja con estado, memoria libre y uso
por proceso (``tests/session/test_gpu_backend.py``, caso de superficie).

Métrica: ``memory.free`` por GPU y ``used_memory`` por PID que publica el
binario de NVIDIA, y el veredicto de ``hardware-inventory``.
Ciega a: una GPU que otro backend (ROCm, Metal) sí podría observar —sin
implementación aquí, cuenta como ``unavailable`` si hay evidencia física—; a
los PIDs que el binario no lista (espacio de PID no compartido); y, con un
binario que no publica ``uuid``, a la identidad estable del dispositivo: se
identifica por su índice.
"""
from __future__ import annotations

import subprocess
from collections.abc import Callable, Collection, Sequence
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Protocol

#: El binario que habla con el driver de NVIDIA, y la opción de CLI que lo declara.
DEFAULT_BINARY = "nvidia-smi"
BINARY_OPTION = "--nvidia-smi"
QUERY_TIMEOUT_S = 10
CSV_FORMAT = "--format=csv,noheader,nounits"
APPS_QUERY = ["--query-compute-apps=pid,used_memory", CSV_FORMAT]
UTILIZATION_QUERY = ["--query-gpu=index,utilization.gpu", CSV_FORMAT]
#: El ``uuid`` va al final: un binario que no lo publica sigue respondiendo a
#: la consulta de ``index,memory.free``, y entonces se identifica por índice.
DEVICES_QUERY = ["--query-gpu=index,memory.free,uuid", CSV_FORMAT]
UUID_COLUMN = 2

#: La sonda de hardware del árbol, hermana de este módulo.
DEFAULT_INVENTORY_COMMAND = (str(Path(__file__).resolve().parents[2] / "bin" / "hardware-inventory"),)
INVENTORY_TIMEOUT_S = 60

MEASURED = "measured"
ABSENT = "absent"
UNAVAILABLE = "unavailable"
AVAILABLE = "available"
ERROR = "error"


class GpuReadFailed(Exception):
    """El backend no pudo dar la lectura pedida: no hay cifra que publicar."""


class EvidenceUnavailable(Exception):
    """El inventario de hardware no emitió un veredicto fiable."""


@dataclass(frozen=True)
class DeviceMemory:
    """La memoria libre de UN dispositivo, con la identidad que da el backend."""
    device: str
    free_mib: int


class GpuMemoryBackend(Protocol):
    """El puerto de telemetría de memoria de GPU. Las lecturas lanzan
    ``GpuReadFailed`` cuando no pueden medir; nunca devuelven un cero por
    defecto."""

    def available(self) -> bool: ...

    def devices(self) -> list[DeviceMemory]: ...

    def usage_by_pid(self, pids: Collection[int]) -> dict[int, int]: ...

    def utilization_pct(self) -> int: ...

    def identity(self) -> str: ...


def largest_free_mib(backend: GpuMemoryBackend) -> int:
    """La VRAM libre del dispositivo con MÁS espacio: un ítem corre en una GPU
    y no se reparte, así que la suma prometería un sitio que no existe."""
    return max(device.free_mib for device in backend.devices())


def parse_mib(cell: str) -> int:
    """Una cifra del CSV; ``GpuReadFailed`` si el binario publica otra cosa
    (``[N/A]``, ``[Not Supported]``)."""
    try:
        return int(float(cell))
    except ValueError as error:
        raise GpuReadFailed(f"cifra ilegible del binario: {cell!r}") from error


def device_identity(row: list[str]) -> str:
    has_uuid = len(row) > UUID_COLUMN and row[UUID_COLUMN]
    return row[UUID_COLUMN] if has_uuid else f"index:{row[0]}"


class NvidiaSmiBackend:
    """El backend de NVIDIA: consulta su binario por CSV."""

    def __init__(self, binary: str = DEFAULT_BINARY):
        self.binary = binary

    def _query(self, args: list[str]) -> list[list[str]]:
        try:
            done = subprocess.run([self.binary, *args], capture_output=True, text=True, timeout=QUERY_TIMEOUT_S)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise GpuReadFailed(f"{DEFAULT_BINARY} no responde ({self.binary}): {error}") from error
        if done.returncode != 0:
            cause = done.stderr.strip() or f"exit {done.returncode}"
            raise GpuReadFailed(f"{DEFAULT_BINARY} no responde ({self.binary}): {cause}")
        return [[cell.strip() for cell in line.split(",")] for line in done.stdout.splitlines() if line.strip()]

    def available(self) -> bool:
        return telemetry_failure(self) is None

    def devices(self) -> list[DeviceMemory]:
        rows = self._query(DEVICES_QUERY)
        if not rows:
            raise GpuReadFailed(f"{self.binary} no listó ninguna GPU")
        return [DeviceMemory(device_identity(row), parse_mib(row[1])) for row in rows]

    def listed_usage(self) -> dict[int, int]:
        """La VRAM de TODOS los procesos que el binario lista, por PID del anfitrión."""
        return {int(pid): parse_mib(mib) for pid, mib, *_ in self._query(APPS_QUERY)}

    def usage_by_pid(self, pids: Collection[int]) -> dict[int, int]:
        wanted = set(pids)
        return {pid: mib for pid, mib in self.listed_usage().items() if pid in wanted}

    def utilization_pct(self) -> int:
        """El uso máximo entre las GPUs: el binario lo da por GPU, no por proceso."""
        return max((parse_mib(pct) for _index, pct, *_ in self._query(UTILIZATION_QUERY)), default=0)

    def identity(self) -> str:
        return f"{DEFAULT_BINARY}:{self.binary}"


def telemetry_failure(backend: GpuMemoryBackend) -> str | None:
    """La causa por la que el backend no da telemetría; ``None`` si la da.
    Quien rehúsa por falta de GPU tiene que poder nombrar esa causa."""
    try:
        backend.devices()
    except GpuReadFailed as error:
        return str(error)
    return None


def usable_backend(backend: GpuMemoryBackend) -> GpuMemoryBackend | None:
    """El backend si da telemetría; ``None`` —«no hay backend»— si no."""
    return backend if backend.available() else None


class HardwareEvidence(Enum):
    """El veredicto de ``hardware-inventory``."""
    NONE = "none"
    PARTIAL = "partial"
    USABLE = "nvidia-usable"


#: El código de salida con que ``hardware-inventory`` publica cada veredicto.
INVENTORY_EXIT_CODES = {HardwareEvidence.USABLE: 0, HardwareEvidence.NONE: 1, HardwareEvidence.PARTIAL: 3}


def parse_verdict(stdout: str) -> HardwareEvidence:
    for line in stdout.splitlines():
        fields = line.split("\t")
        if fields[0] == "verdict" and len(fields) > 1:
            try:
                return HardwareEvidence(fields[1])
            except ValueError as error:
                raise EvidenceUnavailable(f"veredicto desconocido: {fields[1]!r}") from error
    raise EvidenceUnavailable("el inventario no emitió línea verdict")


def read_inventory(command: Sequence[str]) -> HardwareEvidence:
    """Corre el inventario y exige que su veredicto y su código de salida
    coincidan: si discrepan, ninguno es fiable."""
    try:
        done = subprocess.run(list(command), capture_output=True, text=True, timeout=INVENTORY_TIMEOUT_S)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise EvidenceUnavailable(f"hardware-inventory no corrió: {error}") from error
    evidence = parse_verdict(done.stdout)
    if INVENTORY_EXIT_CODES[evidence] != done.returncode:
        raise EvidenceUnavailable(f"hardware-inventory da {evidence.value!r} con exit {done.returncode}")
    return evidence


def inventory_evidence(command: Sequence[str] = DEFAULT_INVENTORY_COMMAND) -> Callable[[], HardwareEvidence]:
    """La evidencia como consulta diferida: sólo se paga si el backend falla."""
    return lambda: read_inventory(command)


@dataclass(frozen=True)
class Capability:
    """Qué se puede observar de la GPU. ``telemetry`` existe sólo en ``available``."""
    state: str
    reason: str
    telemetry: GpuMemoryBackend | None = None


def probe_capability(backend: GpuMemoryBackend | None,
                     evidence: Callable[[], HardwareEvidence]) -> Capability:
    """Combina las dos observaciones. Con backend usable la telemetría decide y
    el inventario no se consulta; sin él, la evidencia física separa
    ``absent`` de ``unavailable``, y un inventario sin veredicto es ``error``."""
    telemetry = usable_backend(backend) if backend is not None else None
    if telemetry is not None:
        return Capability(AVAILABLE, f"telemetría de {telemetry.identity()}", telemetry)
    try:
        found = evidence()
    except EvidenceUnavailable as error:
        return Capability(ERROR, f"sin telemetría y sin evidencia de hardware: {error}")
    if found is HardwareEvidence.NONE:
        return Capability(ABSENT, "sin evidencia física de GPU ni backend")
    return Capability(UNAVAILABLE, f"hardware {found.value} sin backend que observe su memoria")


@dataclass(frozen=True)
class Measured:
    """Una lectura hecha: el cero incluido es una medida."""
    mib: int
    state: str = MEASURED


@dataclass(frozen=True)
class Unmeasured:
    """No hubo lectura: ``absent``, ``unavailable`` o ``error``, con su causa."""
    state: str
    reason: str


def measure_free(capability: Capability) -> Measured | Unmeasured:
    """La VRAM libre, en dos etapas: sin telemetría devuelve el estado de la
    capacidad; con ella, la lectura o ``error``."""
    if capability.telemetry is None:
        return Unmeasured(capability.state, capability.reason)
    try:
        return Measured(largest_free_mib(capability.telemetry))
    except GpuReadFailed as error:
        return Unmeasured(ERROR, str(error))


def free_mib_or_none(measure: Measured | Unmeasured) -> int | None:
    """La VRAM libre como dimensión de anchura: ``None`` quita la dimensión en
    ``pool_history.derive``, que es lo que una lectura ausente significa."""
    return measure.mib if isinstance(measure, Measured) else None


class GpuRequirement(Enum):
    """Lo que el trabajo declara que necesita de la GPU."""
    NONE = "none"
    OPTIONAL = "optional"
    REQUIRED = "required"


class Route(Enum):
    """Por dónde corre el trabajo, decidido antes de ejecutarlo."""
    UNCONSTRAINED = "unconstrained"   # la VRAM no es dimensión de admisión
    CPU_FALLBACK = "cpu-fallback"     # la ruta CPU que el trabajo declaró
    GPU = "gpu"
    REFUSE = "refuse"


def plan_route(requirement: GpuRequirement, telemetry: GpuMemoryBackend | None) -> Route:
    """``none`` no mira la GPU; ``optional`` va a la GPU sólo con telemetría;
    ``required`` sin ella rehúsa. Nunca se rebaja ``required``."""
    if requirement is GpuRequirement.NONE:
        return Route.UNCONSTRAINED
    if telemetry is not None:
        return Route.GPU
    return Route.CPU_FALLBACK if requirement is GpuRequirement.OPTIONAL else Route.REFUSE
