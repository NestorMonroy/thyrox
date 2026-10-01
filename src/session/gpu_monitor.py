"""La VRAM de un ítem del pool y su admisión, sobre el puerto de telemetría.

``--memfree`` de GNU Parallel es memoria del SISTEMA; la de la GPU es otro
recurso y GNU Time no la ve. Este monitor muestrea un ``GpuMemoryBackend``
(``gpu_backend``) mientras vive el ÁRBOL de procesos del ítem y deja
``<n>.gpu``, una línea::

    <vram pico MiB> <vram media MiB> <uso pico de GPU %> <muestras>

Cuenta la VRAM de los procesos que da su FUENTE DE MIEMBROS, no la de los
demás que compartan la GPU. En local la fuente es el árbol ``/proc`` del ítem
(``HostTree``); en contenedor, el cgroup del contenedor (``ContainerMembers``,
``--container``), porque su proceso cuelga de ``conmon`` y no del wrapper
(H-THYROX-294). Los PIDs son siempre los del anfitrión: la telemetría los
publica así. Una fuente que no puede dar los PIDs deja ``error <causa>``,
nunca un cero. El uso de GPU sólo se atribuye a una muestra en la que el
árbol tenía VRAM: el backend lo da por GPU, no por proceso.

Sin telemetría no se escribe una cifra: ``absent`` no deja archivo,
``unavailable`` deja ``unavailable <causa>``. Un árbol que no usó la GPU
escribe ceros, que sí son una medida.

La admisión reserva en un registro de VRAM comprometida, uno por anfitrión
(ADR-007 1.7.0). Cada reserva nombra su DISPOSITIVO y su TIPO: ``worker``
(el ítem de un pool o un contenedor, dueño por PID), ``residency`` (un modelo
residente, dueño por instancia y generación) y ``request`` (una petición que
apunta a su ``residency``). Se admite contra lo libre de un dispositivo, nunca
contra la suma del anfitrión. El requisito del trabajo (``none``,
``optional``, ``required``) decide antes de ejecutar si la VRAM entra en la
admisión (``admit_for``).

Métrica: el uso por PID del árbol (o del cgroup) que publica el backend,
sumado por muestra; el uso de GPU máximo entre GPUs; y lo libre por
dispositivo menos lo reservado que aún no se usa.
Ciega a: un pico más corto que el intervalo de muestreo; la VRAM de un
proceso que el backend no lista; el uso de GPU de OTRO proceso en la misma
muestra; y el uso real de una ``residency`` o una ``request``, que cuentan
enteras hasta que el grant de su runtime las atribuya.
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import statistics
import sys
import time
from collections.abc import Callable, Collection
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import ClassVar, Protocol

from session import gpu_backend as gb
from session import shared_lock
from session.container_measure import DEFAULT_CGROUP_ROOT, ContainerMembers, MembersUnavailable
from session.resource_admission import (  # noqa: F401 — superficie pública de gpu_monitor
    LEDGER_LOCK_RETRIES,
    admissible,
    admit_locked,
    is_alive,
    tree,
)

DEFAULT_INTERVAL_S = 0.5
DEFAULT_TIMEOUT_S = 600.0
RUN_ID = "vram-admission"


class MemberSource(Protocol):
    """A quién se mide. ``current_members`` da los PIDs que lo forman, o
    ``None`` si ya no vive; lanza ``MembersUnavailable`` cuando no puede
    saberlo."""

    def current_members(self) -> set[int] | None: ...


class HostTree:
    """El ítem local: ``pid`` y sus descendientes por ``/proc``."""

    def __init__(self, pid: int):
        self.pid = pid

    def current_members(self) -> set[int] | None:
        return tree(self.pid) if is_alive(self.pid) else None


@dataclass(frozen=True)
class Sample:
    vram_by_pid: dict[int, int]
    utilization_pct: int


@dataclass(frozen=True)
class Summary:
    peak_mib: int
    avg_mib: int
    peak_utilization_pct: int
    samples: int

    def line(self) -> str:
        return f"{self.peak_mib} {self.avg_mib} {self.peak_utilization_pct} {self.samples}"


def sample(backend: gb.GpuMemoryBackend, pids: Collection[int]) -> Sample:
    """Una lectura: la VRAM de ``pids`` y el uso máximo entre las GPUs."""
    return Sample(backend.usage_by_pid(pids), backend.utilization_pct())


def measure(binary: str) -> tuple[Sample | None, int | None]:
    """La GPU entera por el backend de NVIDIA, para el arnés de nivel 2
    (``gpu_trace``): la VRAM de TODOS los PIDs listados y la libre mayor.
    ``(None, None)`` sin lectura."""
    backend = gb.NvidiaSmiBackend(binary)
    try:
        return Sample(backend.listed_usage(), backend.utilization_pct()), gb.largest_free_mib(backend)
    except gb.GpuReadFailed:
        return None, None


def write_state(out: Path, state: str, cause: object) -> None:
    """No hubo cifra: el estado y su causa, sin resumen parcial."""
    Path(out).write_text(f"{state} {cause}\n")


def watch(source: MemberSource, out: Path, capability: gb.Capability,
          interval_s: float = DEFAULT_INTERVAL_S) -> Summary | None:
    """Muestrea mientras vive ``source`` y escribe ``out``."""
    backend = capability.telemetry
    if backend is None:
        if capability.state != gb.ABSENT:
            write_state(out, capability.state, capability.reason)
        return None
    totals, utils = [], []
    try:
        members = source.current_members()
        while members is not None:
            current = sample(backend, members)
            # La vida se comprueba DESPUÉS de muestrear: una muestra tomada con
            # el árbol ya terminado vale 0 MiB y bajaría la media de una medida
            # que no le pertenece.
            members = source.current_members()
            if members is None:
                break
            used = sum(current.vram_by_pid.values())
            totals.append(used)
            utils.append(current.utilization_pct if used > 0 else 0)
            time.sleep(interval_s)
    except (gb.GpuReadFailed, MembersUnavailable) as error:
        write_state(out, gb.ERROR, error)
        return None
    if not totals:
        return None
    summary = Summary(max(totals), round(statistics.mean(totals)), max(utils), len(totals))
    Path(out).write_text(summary.line() + "\n")
    return summary


@dataclass(frozen=True)
class GpuReading:
    """Los estados de un ``<n>.gpu``, que no se colapsan: ``measured``
    (incluido el cero, que es una medida), ``absent`` (no se midió),
    ``unavailable`` (hay GPU sin telemetría) y ``error`` (se intentó y falló)."""
    state: str
    summary: Summary | None = None
    reason: str | None = None


UNMEASURED_STATES = (gb.ERROR, gb.UNAVAILABLE)


def read_gpu_file(path: Path) -> GpuReading:
    try:
        text = Path(path).read_text(errors="replace").strip()
    except FileNotFoundError:
        return GpuReading(gb.ABSENT)
    for state in UNMEASURED_STATES:
        if text.startswith(state):
            return GpuReading(state, reason=text[len(state):].strip())
    fields = text.split()
    if len(fields) == 4 and all(f.isdigit() for f in fields):
        return GpuReading(gb.MEASURED, Summary(*(int(f) for f in fields)))
    return GpuReading(gb.ERROR, reason=f"ilegible: {text[:80]!r}")


# --- el registro de VRAM comprometida ------------------------------------------


class ResidencyBusy(Exception):
    """Se pidió liberar una ``residency`` que aún tiene ``request`` vivas."""


class ResidencyMissing(Exception):
    """Una ``request`` apunta a una ``residency`` que no está en el registro."""


@dataclass(frozen=True)
class WorkerReservation:
    """La reserva de un trabajo: su dueño es un PID y su árbol es su uso."""
    owner_pid: int
    mib: int
    device: str | None = None
    kind: ClassVar[str] = "worker"

    @property
    def key(self) -> str:
        return f"{self.kind}:{self.owner_pid}"

    def is_live(self) -> bool:
        return is_alive(self.owner_pid)

    def attributed_pids(self) -> set[int]:
        return tree(self.owner_pid)

    def pinned_device(self, live: dict[str, Reservation]) -> str | None:
        return self.device

    def owned_by(self, pid: int) -> bool:
        return self.owner_pid == pid


@dataclass(frozen=True)
class ResidencyReservation:
    """Un modelo residente: su dueño es una instancia con generación, no un
    PID efímero, y vive en el registro hasta que se libera."""
    instance: str
    generation: int
    mib: int
    device: str | None = None
    kind: ClassVar[str] = "residency"

    @property
    def key(self) -> str:
        return f"{self.kind}:{self.instance}:{self.generation}"

    def is_live(self) -> bool:
        return True

    def attributed_pids(self) -> set[int]:
        return set()

    def pinned_device(self, live: dict[str, Reservation]) -> str | None:
        return self.device

    def owned_by(self, pid: int) -> bool:
        return False


@dataclass(frozen=True)
class RequestReservation:
    """Una petición sobre una ``residency``: va al dispositivo de ésta y
    vive mientras vive su dueño."""
    request_id: str
    owner_pid: int
    residency: str
    mib: int
    device: str | None = None
    kind: ClassVar[str] = "request"

    @property
    def key(self) -> str:
        return f"{self.kind}:{self.request_id}"

    def is_live(self) -> bool:
        return is_alive(self.owner_pid)

    def attributed_pids(self) -> set[int]:
        return set()

    def pinned_device(self, live: dict[str, Reservation]) -> str | None:
        target = live.get(self.residency)
        if target is None:
            raise ResidencyMissing(f"la request {self.request_id} apunta a {self.residency}, que no está reservada")
        return target.device

    def owned_by(self, pid: int) -> bool:
        return self.owner_pid == pid


Reservation = WorkerReservation | ResidencyReservation | RequestReservation
RESERVATION_KINDS: dict[str, type[Reservation]] = {
    cls.kind: cls for cls in (WorkerReservation, ResidencyReservation, RequestReservation)}


def reservation_to_json(reservation: Reservation) -> dict:
    return {"kind": reservation.kind, **dataclasses.asdict(reservation)}


def reservation_from_json(key: str, data: object) -> Reservation:
    """Una entrada del registro. Un entero es el formato anterior al tipo y al
    dispositivo: un ``worker`` sin dispositivo, que cuenta en todos."""
    if isinstance(data, int):
        return WorkerReservation(int(key), data)
    if not isinstance(data, dict):
        raise ValueError(f"entrada ilegible: {key}")
    cls = RESERVATION_KINDS[data["kind"]]
    return cls(**{field.name: data[field.name] for field in dataclasses.fields(cls)})


class VramLedger:
    """El registro de lo comprometido: ``{clave: reserva}``. Sólo persiste; no
    bloquea — quien lo usa sostiene el lock del archivo."""

    def __init__(self, path: Path):
        self.path = Path(path)

    def _read(self) -> dict[str, Reservation]:
        try:
            raw = json.loads(self.path.read_text())
            return {key: reservation_from_json(key, data) for key, data in raw.items()}
        except (OSError, ValueError, KeyError, TypeError):
            return {}

    def live(self) -> dict[str, Reservation]:
        """Las reservas vigentes: la de un dueño muerto ya no compromete nada."""
        return {key: r for key, r in self._read().items() if r.is_live()}

    def save(self, reservations: dict[str, Reservation]) -> None:
        """Escribe las reservas; sin ninguna, retira el registro: en reposo no
        deja archivo en el árbol."""
        if not reservations:
            self.path.unlink(missing_ok=True)
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        shared_lock.write_atomic(self.path, json.dumps(
            {key: reservation_to_json(r) for key, r in reservations.items()}, sort_keys=True))


def device_headroom(backend: gb.GpuMemoryBackend, live: dict[str, Reservation]) -> dict[str, int] | None:
    """Lo admisible por dispositivo: lo libre menos lo reservado que aún no se
    usa. Lo que un ``worker`` ya usa ya está restado de lo libre; contarlo
    otra vez bloquearía VRAM que sí existe. Una reserva sin dispositivo cuenta
    en todos. ``None`` sin lectura: sin medida no hay margen, y un cero lo
    afirmaría. Es una consulta: no reserva."""
    try:
        devices = backend.devices()
        attributed = {key: r.attributed_pids() for key, r in live.items()}
        usage = backend.usage_by_pid(set().union(*attributed.values()))
    except gb.GpuReadFailed:
        return None
    unused = {key: max(0, r.mib - sum(usage.get(pid, 0) for pid in attributed[key])) for key, r in live.items()}
    return {d.device: d.free_mib - sum(unused[key] for key, r in live.items() if r.device in (d.device, None))
            for d in devices}


def choose_device(headroom: dict[str, int], need_mib: int, pinned: str | None) -> str | None:
    """El dispositivo donde cabe ``need_mib``: el fijado si se fijó, y si no
    el de más margen. ``None`` si no cabe en ninguno — la suma de márgenes no
    cuenta: un trabajo no se reparte entre GPUs."""
    candidates = {pinned: headroom[pinned]} if pinned in headroom else {} if pinned is not None else headroom
    fitting = {device: room for device, room in candidates.items() if admissible(room, 0, need_mib)}
    return max(fitting, key=lambda device: fitting[device]) if fitting else None


def admit(reservation: Reservation, ledger: Path, backend: gb.GpuMemoryBackend,
          timeout_s: float = DEFAULT_TIMEOUT_S, interval_s: float = DEFAULT_INTERVAL_S) -> Reservation | None:
    """Comprobar y reservar bajo el lock del registro, sin la carrera de
    comprobar-y-usar: con 5000 MiB libres dos ítems de 3000 veían sitio los
    dos (sonda: ``.claude/workbench/vram-toctou-*/probe-toctou.sh``). Devuelve
    la reserva con su dispositivo, o ``None`` al vencer el plazo. Una lectura
    que falla a mitad de la espera es «sin medida» y no admite."""
    book = VramLedger(ledger)

    def attempt() -> Reservation | None:
        live = book.live()
        pinned = reservation.pinned_device(live)
        headroom = device_headroom(backend, live)
        device = choose_device(headroom, reservation.mib, pinned) if headroom is not None else None
        if device is None:
            book.save(live)
            return None
        placed = dataclasses.replace(reservation, device=device)
        book.save({**live, placed.key: placed})
        return placed

    return admit_locked(book.path, RUN_ID, timeout_s, interval_s, attempt)


def rewrite(ledger: Path, change: Callable[[dict[str, Reservation]], dict[str, Reservation]]) -> None:
    """Aplica ``change`` a las reservas vivas bajo el lock del registro."""
    book = VramLedger(ledger)
    if not book.path.exists():
        return
    with shared_lock.held(book.path, run_id=RUN_ID, retries=LEDGER_LOCK_RETRIES,
                          min_wait_s=0.01, max_wait_s=0.2):
        book.save(change(book.live()))


def release(ledger: Path, owner_pid: int) -> None:
    """Suelta las reservas cuyo dueño es ``owner_pid`` (su ``worker`` y sus
    ``request``), bajo el lock del registro."""
    rewrite(ledger, lambda live: {key: r for key, r in live.items() if not r.owned_by(owner_pid)})


def release_residency(ledger: Path, instance: str, generation: int) -> None:
    """Suelta una ``residency``; se rehúsa mientras una ``request`` viva
    apunte a ella, porque el runtime aún la está sirviendo."""
    target = ResidencyReservation(instance, generation, 0).key

    def without_residency(live: dict[str, Reservation]) -> dict[str, Reservation]:
        waiting = sorted(key for key, r in live.items() if isinstance(r, RequestReservation) and r.residency == target)
        if waiting:
            raise ResidencyBusy(f"{target} tiene requests vivas: {', '.join(waiting)}")
        return {key: r for key, r in live.items() if key != target}

    rewrite(ledger, without_residency)


# --- la admisión por requisito ---------------------------------------------------


@dataclass(frozen=True)
class AdmissionRequest:
    """Lo que un trabajo pide al admitirse como ``worker``."""
    need_mib: int
    ledger: Path
    owner_pid: int
    timeout_s: float = DEFAULT_TIMEOUT_S
    interval_s: float = DEFAULT_INTERVAL_S


class Outcome(Enum):
    """Qué decide la admisión, antes de ejecutar el trabajo."""
    RESERVED = "reserved"
    UNCONSTRAINED = "unconstrained"   # requisito none: la VRAM no es dimensión
    CPU_FALLBACK = "cpu-fallback"     # la ruta CPU que el trabajo declaró
    TIMEOUT = "timeout"
    REFUSED = "refused"               # required sin telemetría


#: Las rutas que se deciden sin tocar el registro.
ROUTE_OUTCOMES = {gb.Route.UNCONSTRAINED: Outcome.UNCONSTRAINED, gb.Route.CPU_FALLBACK: Outcome.CPU_FALLBACK,
                  gb.Route.REFUSE: Outcome.REFUSED}
#: Qué significa no encontrar sitio en el plazo, por requisito.
NO_ROOM_OUTCOMES = {gb.GpuRequirement.OPTIONAL: Outcome.CPU_FALLBACK, gb.GpuRequirement.REQUIRED: Outcome.TIMEOUT}


def admit_for(requirement: gb.GpuRequirement, request: AdmissionRequest,
              telemetry: gb.GpuMemoryBackend | None) -> Outcome:
    """La admisión de un trabajo según su requisito declarado. Sólo la ruta
    GPU con telemetría reserva; ``required`` nunca se rebaja a CPU."""
    route = gb.plan_route(requirement, telemetry)
    if telemetry is None or route in ROUTE_OUTCOMES:
        return ROUTE_OUTCOMES[route]
    placed = admit(WorkerReservation(request.owner_pid, request.need_mib), request.ledger, telemetry,
                   request.timeout_s, request.interval_s)
    return Outcome.RESERVED if placed is not None else NO_ROOM_OUTCOMES[requirement]


EXIT_ADMITTED = 0
EXIT_ABSENT = 2
EXIT_TIMEOUT = 3
EXIT_CPU_FALLBACK = 4
OUTCOME_EXITS = {Outcome.RESERVED: EXIT_ADMITTED, Outcome.UNCONSTRAINED: EXIT_ADMITTED,
                 Outcome.CPU_FALLBACK: EXIT_CPU_FALLBACK, Outcome.TIMEOUT: EXIT_TIMEOUT,
                 Outcome.REFUSED: EXIT_ABSENT}


def admit_exit_code(args: argparse.Namespace) -> int:
    """``admit`` como código de salida: 0 reservó (o ``none``), 3 venció el
    plazo sin sitio, 4 ruta CPU de un ``optional``, 2 ``required`` sin
    telemetría — con la causa por stderr y sin cifra."""
    backend = gb.NvidiaSmiBackend(args.binary)
    cause = gb.telemetry_failure(backend)
    requirement = gb.GpuRequirement(args.requirement)
    outcome = admit_for(requirement, AdmissionRequest(args.need, args.ledger, args.owner, args.timeout, args.interval),
                        None if cause else backend)
    if outcome is Outcome.REFUSED:
        print(f"gpu_monitor admit: {cause}; sin GPU que medir no se espera", file=sys.stderr)
    if outcome is Outcome.CPU_FALLBACK:
        print(f"gpu_monitor admit: ruta CPU declarada: {cause or 'sin sitio en el plazo'}", file=sys.stderr)
    return OUTCOME_EXITS[outcome]


def member_source(args: argparse.Namespace) -> MemberSource:
    """La fuente de ``watch``: el contenedor declarado, o el árbol de PID. En
    contenedor, PID es el wrapper que lo lanzó y no se mide: el proceso del
    contenedor no cuelga de él."""
    if args.container:
        return ContainerMembers(args.container, args.podman, args.cgroup_root)
    return HostTree(args.pid)


def watched_capability(binary: str) -> gb.Capability:
    return gb.probe_capability(gb.NvidiaSmiBackend(binary), gb.inventory_evidence())


def watch_exit_code(args: argparse.Namespace) -> int:
    summary = watch(member_source(args), args.out, watched_capability(args.binary), args.interval)
    return 0 if summary else EXIT_ABSENT


def free_exit_code(args: argparse.Namespace) -> int:
    try:
        print(gb.largest_free_mib(gb.NvidiaSmiBackend(args.binary)))
    except gb.GpuReadFailed:
        return EXIT_ABSENT
    return 0


def available_exit_code(args: argparse.Namespace) -> int:
    return 0 if gb.telemetry_failure(gb.NvidiaSmiBackend(args.binary)) is None else EXIT_ABSENT


def capability_exit_code(args: argparse.Namespace) -> int:
    capability = watched_capability(args.binary)
    print(f"{capability.state}\t{capability.reason}")
    return 0 if capability.state == gb.AVAILABLE else EXIT_ABSENT


def release_exit_code(args: argparse.Namespace) -> int:
    release(args.ledger, args.owner)
    return 0


def add_binary_option(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(gb.BINARY_OPTION, dest="binary", default=gb.DEFAULT_BINARY,
                        help="el binario del backend de telemetría")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="gpu_monitor", description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="order", required=True)
    p_watch = sub.add_parser("watch", help="muestrea el árbol de PID (o el contenedor) y escribe OUT")
    p_watch.add_argument("pid", type=int)
    p_watch.add_argument("out", type=Path)
    p_watch.add_argument("--container", default=None,
                         help="mide el cgroup de este contenedor en vez del árbol de PID")
    p_watch.add_argument("--podman", default="podman")
    p_watch.add_argument("--cgroup-root", type=Path, default=DEFAULT_CGROUP_ROOT)
    p_watch.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_watch.set_defaults(handler=watch_exit_code)
    p_avail = sub.add_parser("available", help="sale 0 si hay telemetría, 2 si no")
    p_avail.set_defaults(handler=available_exit_code)
    p_capability = sub.add_parser("capability", help="imprime el estado de la GPU y su causa; sale 0 sólo si available")
    p_capability.set_defaults(handler=capability_exit_code)
    p_admit = sub.add_parser("admit", help="reserva NEED MiB en el registro; sale 0, 3 al vencer el plazo, "
                                           "4 ruta CPU de un optional, o 2 si required no tiene telemetría")
    p_admit.add_argument("need", type=int)
    p_admit.add_argument("--ledger", type=Path, required=True)
    p_admit.add_argument("--owner", type=int, required=True)
    p_admit.add_argument("--requirement", choices=[r.value for r in gb.GpuRequirement],
                         default=gb.GpuRequirement.REQUIRED.value)
    p_admit.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_S)
    p_admit.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_admit.set_defaults(handler=admit_exit_code)
    p_release = sub.add_parser("release", help="suelta las reservas de OWNER")
    p_release.add_argument("--ledger", type=Path, required=True)
    p_release.add_argument("--owner", type=int, required=True)
    p_release.set_defaults(handler=release_exit_code)
    p_free = sub.add_parser("free", help="imprime la VRAM libre (MiB) del dispositivo con más espacio")
    p_free.set_defaults(handler=free_exit_code)
    for sub_parser in (p_watch, p_avail, p_capability, p_admit, p_free):
        add_binary_option(sub_parser)
    return parser


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
