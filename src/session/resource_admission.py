"""La admisión por recurso SIN carrera de comprobar-y-usar.

Medir y decidir no basta. Con un lock que sólo protege la lectura, A lee 5000
libres, decide que caben sus 3000 y suelta el lock; B lee lo mismo antes de
que A llegue a usar nada, y los dos arrancan. Aquí comprobar y RESERVAR son un
solo paso bajo el lock del registro, y lo comprometido que el sistema aún no
muestra —cada reserva menos lo que el árbol de su dueño ya usa— se resta de lo
libre. Lo que ya usa ya está restado de lo libre; contarlo otra vez bloquearía
recurso que sí existe.

La reserva va por pid del dueño y caduca sola cuando el dueño muere: un
contador que se repone en un `trap` pierde el hueco con SIGKILL.

El registro y el bucle no saben de qué recurso se trata. Cada recurso aporta
su medida: la VRAM, `gpu_monitor` con su backend de telemetría; la RAM, este
módulo con la memoria libre efectiva —la del cgroup cuando el proceso corre
bajo un límite, `MemAvailable` si no— y el RSS de cada árbol en `/proc` —o, si el dueño es un ítem en
contenedor, el uso de memoria del cgroup del contenedor, porque su proceso
cuelga de `conmon` y no del árbol del dueño (H-THYROX-294)—; el disco, este módulo con el
techo que publica `disk-headroom --ceiling-bytes` menos un piso de seguridad.

El disco no tiene uso por proceso que leer: lo que un pull ya escribió no se
puede atribuir a su dueño, así que su reserva cuenta entera hasta que la
suelta. Es la lectura conservadora —durante el pull esos bytes se descuentan
dos veces— y el ensure suelta en cuanto el `podman create` termina.

Métrica: lo libre que el sistema declara, menos lo reservado y aún no usado.
Ciega a: lo que un proceso ajeno al registro va a pedir y todavía no pidió
—ése no reserva—; al pico de un ítem por encima de lo que reservó; y a un
límite de cgroup que el proceso no ve montado (se lee la RAM del anfitrión).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import TypeVar

from cache.paths import cache_dir
from session import shared_lock
from session.container_measure import DEFAULT_CGROUP_ROOT, ContainerMembers, MembersUnavailable

LEDGER_LOCK_RETRIES = 50
DEFAULT_INTERVAL_S = 1.0
_MEM_AVAILABLE = re.compile(r"^MemAvailable:\s+(\d+)\s+kB$", re.M)
_VM_RSS = re.compile(r"^VmRSS:\s+(\d+)\s+kB$", re.M)
RAM_LEDGER_VAR = "THYROX_RAM_ADMISSION_LEDGER"
MEMINFO_VAR = "THYROX_RAM_ADMISSION_MEMINFO"
DISK_LEDGER_VAR = "THYROX_DISK_ADMISSION_LEDGER"
DISK_FLOOR_VAR = "THYROX_DISK_ADMISSION_FLOOR_MB"
DISK_HEADROOM_VAR = "THYROX_DISK_ADMISSION_HEADROOM"
BYTES_PER_MIB = 1024 * 1024
BYTES_PER_KB = 1024
#: El sufijo del registro lateral que asocia cada dueño con su contenedor.
CONTAINER_OWNERS_SUFFIX = ".containers.json"
#: El piso de disco que ninguna admisión reparte. Worktrees, cachés, logs y las
#: capas temporales que Podman desempaqueta durante un pull escriben en el mismo
#: sistema de archivos sin reservar; 2 GiB es del orden de una capa grande más
#: los worktrees de un pool, y deja margen para que el propio registro y el
#: `git` de la sesión no mueran con `no space left on device`.
DEFAULT_DISK_FLOOR_MB = 2048
#: El `disk-headroom` del árbol, hermano de este módulo en `src/repo/`.
DEFAULT_DISK_HEADROOM = Path(__file__).resolve().parent.parent / "repo" / "disk-headroom.sh"
#: Dónde vive el almacén de Podman: el `graphroot` medido está en el sistema de
#: archivos raíz (banco `disk-reserve-reach-20260930T191002`).
DEFAULT_DISK_PATH = "/"
DISK_HEADROOM_TIMEOUT_S = 60
EXIT_ADMITTED = 0
EXIT_UNMEASURED = 2
EXIT_TIMEOUT = 3


def ram_ledger_path() -> Path:
    """El registro de RAM comprometida. Es UNO por máquina a propósito: dos
    consumidores con registros distintos no se ven y vuelven a sobrecomprometer."""
    declared = os.environ.get(RAM_LEDGER_VAR)
    return Path(declared) if declared else cache_dir() / "ram-admission.json"


def meminfo_path() -> Path:
    """De dónde se lee ``MemAvailable``: el kernel, salvo declaración."""
    return Path(os.environ.get(MEMINFO_VAR) or "/proc/meminfo")


def is_alive(pid: int, proc_root: str = "/proc") -> bool:
    """Vivo y no zombi: un proceso terminado que nadie esperó sigue
    respondiendo a ``kill(pid, 0)``, pero su estado es ``Z``."""
    try:
        stat = Path(proc_root, str(pid), "stat").read_text()
    except OSError:
        return False
    return stat.rsplit(")", 1)[-1].split()[0] not in ("Z", "X")


def tree(pid: int, proc_root: str = "/proc") -> set[int]:
    """El PID y todos sus descendientes, por ``/proc/<pid>/task/*/children``."""
    seen, pending_pids = set(), [pid]
    while pending_pids:
        current = pending_pids.pop()
        if current in seen:
            continue
        seen.add(current)
        try:
            listings = list(Path(proc_root, str(current), "task").glob("*/children"))
        except OSError:
            # El proceso salió entre la comprobación de pathlib y su `scandir`
            # (medido en test_gpu_trace.py): sigue contando, sin hijos que leer.
            continue
        for children in listings:
            try:
                pending_pids.extend(int(c) for c in children.read_text().split())
            except OSError:
                continue
    return seen


class ReservationLedger:
    """El registro de lo comprometido: ``{pid del dueño: unidades reservadas}``.
    Sólo persiste; no bloquea — quien lo usa sostiene el lock del archivo."""

    def __init__(self, path: Path):
        self.path = Path(path)

    def _read(self) -> dict[str, int]:
        try:
            return {pid: int(amount) for pid, amount in json.loads(self.path.read_text()).items()}
        except (OSError, ValueError):
            return {}

    def live(self) -> dict[str, int]:
        """Las reservas de dueños vivos: la de uno muerto ya no compromete nada."""
        return {pid: amount for pid, amount in self._read().items() if is_alive(int(pid))}

    def save(self, reservations: dict[str, int]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        shared_lock.write_atomic(self.path, json.dumps(reservations, sort_keys=True))

    def reserve(self, owner_pid: int, amount: int) -> None:
        self.save({**self.live(), str(owner_pid): amount})

    def release(self, owner_pid: int) -> None:
        """Suelta la reserva de ``owner_pid``. Sin ninguna reserva viva más, el
        registro se retira: en reposo no deja archivo en el árbol."""
        reservations = self._read()
        reservations.pop(str(owner_pid), None)
        if any(is_alive(int(pid)) for pid in reservations):
            self.save(reservations)
        else:
            self.path.unlink(missing_ok=True)


def pending(reservations: dict[str, int], usage: dict[int, int], trees: dict[int, set[int]]) -> int:
    """Lo comprometido que el sistema aún NO muestra: de cada reserva, la parte
    que su árbol todavía no usa."""
    total = 0
    for pid, amount in reservations.items():
        used = sum(usage.get(p, 0) for p in trees.get(int(pid), {int(pid)}))
        total += max(0, amount - used)
    return total


def admissible(free: int | None, pending_amount: int, need: int) -> bool:
    """La decisión, pura: cabe si lo libre menos lo comprometido alcanza."""
    return free is not None and free - pending_amount >= need


Headroom = Callable[[dict[str, int]], "int | None"]


Admitted = TypeVar("Admitted")


def admit_locked(ledger_path: Path, run_id: str, timeout_s: float, interval_s: float,
                 attempt: Callable[[], Admitted | None]) -> Admitted | None:
    """El bucle de comprobar-y-reservar: ``attempt`` corre bajo el lock del
    registro y devuelve lo que reservó, o ``None`` si no cabe; se reintenta
    hasta el plazo. Qué se lee y qué se escribe es de ``attempt``: el registro
    escalar de la RAM y el disco, o el de VRAM por dispositivo."""
    ledger_path = Path(ledger_path)
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + timeout_s
    while True:
        with shared_lock.held(ledger_path, run_id=run_id, retries=LEDGER_LOCK_RETRIES,
                              min_wait_s=0.01, max_wait_s=0.2):
            admitted = attempt()
        if admitted is not None:
            return admitted
        if time.monotonic() >= deadline:
            return None
        time.sleep(interval_s)


def admit_with(ledger_path: Path, need: int, owner_pid: int, headroom: Headroom, run_id: str,
               timeout_s: float, interval_s: float = DEFAULT_INTERVAL_S) -> bool:
    """Comprobar y reservar en el registro escalar. ``headroom`` recibe las
    reservas vivas y devuelve lo libre menos lo comprometido aún no usado;
    ``None`` es «sin medida», y no admite."""
    book = ReservationLedger(ledger_path)

    def attempt() -> bool | None:
        live = book.live()
        if admissible(headroom(live), 0, need):
            book.reserve(owner_pid, need)
            return True
        book.save(live)
        return None

    return admit_locked(book.path, run_id, timeout_s, interval_s, attempt) is not None


def release_from(ledger_path: Path, owner_pid: int, run_id: str) -> None:
    """Suelta la reserva de un dueño que terminó, bajo el lock del registro."""
    book = ReservationLedger(ledger_path)
    if not book.path.exists():
        return
    with shared_lock.held(book.path, run_id=run_id, retries=LEDGER_LOCK_RETRIES,
                          min_wait_s=0.01, max_wait_s=0.2):
        book.release(owner_pid)


def proc_rss_kb(pids: set[int], proc_root: str = "/proc") -> int:
    """La memoria residente de un conjunto de procesos; el que ya salió no suma."""
    total = 0
    for pid in pids:
        try:
            match = _VM_RSS.search(Path(proc_root, str(pid), "status").read_text())
        except OSError:
            continue
        total += int(match.group(1)) if match else 0
    return total


def available_ram_kb(meminfo: Path = Path("/proc/meminfo")) -> int | None:
    """``MemAvailable`` del kernel; ``None`` sin lectura."""
    try:
        match = _MEM_AVAILABLE.search(Path(meminfo).read_text())
    except OSError:
        return None
    return int(match.group(1)) if match else None


#: La pertenencia de este proceso a sus cgroups.
SELF_CGROUP = Path("/proc/self/cgroup")
#: v1 publica «sin límite» como el mayor múltiplo de página bajo 2**63
#: (medido aquí: 9223372036854771712). Todo límite por encima de 2**62 es ese
#: sentinela con otro tamaño de página, no una memoria que exista.
V1_UNLIMITED_FLOOR = 1 << 62
V2_UNLIMITED = "max"
V1_MEMORY_CONTROLLER = "memory"
V2_HIERARCHY_ID = "0"


class Unlimited:
    """«Sin límite» de cgroup: un estado, no ``0`` ni un número enorme."""

    def __repr__(self) -> str:
        return "UNLIMITED"


UNLIMITED = Unlimited()


class CgroupUnreadable(Exception):
    """El cgroup existe pero sus archivos no se pudieron leer: sin medida."""


@dataclass(frozen=True)
class CgroupView:
    """De dónde se lee el cgroup: la pertenencia del proceso y la raíz montada."""
    membership: Path = SELF_CGROUP
    root: Path = DEFAULT_CGROUP_ROOT


@dataclass(frozen=True)
class MemoryHierarchy:
    """La jerarquía que lleva el controlador de memoria, con sus archivos."""
    root: Path
    own: str
    limit_file: str
    usage_file: str

    def levels(self) -> list[Path]:
        """El cgroup propio y sus ancestros, sin la raíz de la jerarquía: la
        raíz no tiene límite en v2 y en v1 lleva el sentinela."""
        parts = PurePosixPath(self.own).parts[1:]
        return [self.root.joinpath(*parts[:depth]) for depth in range(len(parts), 0, -1)]


def memory_hierarchy(view: CgroupView) -> MemoryHierarchy | None:
    """La jerarquía de memoria del proceso: v1 si un controlador ``memory``
    aparece en su pertenencia, v2 si sólo está la unificada; ``None`` si no
    hay ninguna."""
    try:
        lines = [line.split(":", 2) for line in view.membership.read_text().splitlines() if line.count(":") >= 2]
    except OSError as error:
        raise CgroupUnreadable(f"pertenencia ilegible en {view.membership}: {error}") from error
    for _hierarchy, controllers, own in lines:
        if V1_MEMORY_CONTROLLER in controllers.split(","):
            return MemoryHierarchy(view.root / V1_MEMORY_CONTROLLER, own,
                                   "memory.limit_in_bytes", "memory.usage_in_bytes")
    for hierarchy, controllers, own in lines:
        if hierarchy == V2_HIERARCHY_ID and not controllers:
            return MemoryHierarchy(view.root, own, "memory.max", "memory.current")
    return None


def read_limit(path: Path) -> int | Unlimited:
    """Un límite normalizado: el sentinela de v1 y el ``max`` de v2 son ``UNLIMITED``."""
    text = path.read_text().strip()
    if text == V2_UNLIMITED:
        return UNLIMITED
    value = int(text)
    return UNLIMITED if value >= V1_UNLIMITED_FLOOR else value


def level_headroom(level: Path, hierarchy: MemoryHierarchy) -> int | Unlimited:
    """Lo que queda bajo el límite de UN nivel: ``max(0, límite − uso)``."""
    try:
        limit = read_limit(level / hierarchy.limit_file)
        if isinstance(limit, Unlimited):
            return UNLIMITED
        return max(0, limit - int((level / hierarchy.usage_file).read_text().strip()))
    except (OSError, ValueError) as error:
        raise CgroupUnreadable(f"cgroup ilegible en {level}: {error}") from error


def cgroup_headroom_bytes(view: CgroupView = CgroupView()) -> int | Unlimited:
    """Lo que el cgroup del proceso y sus ancestros aún dejan usar, en bytes.

    El límite aplicable es el MÁS RESTRICTIVO de la cadena, y se mide por lo
    que cada nivel deja libre (límite − uso de ese nivel): un ancestro cuenta
    también lo que usan los hermanos. Sin cgroup de memoria observable —sin
    controlador en la pertenencia, o con el cgroup propio fuera del montaje
    que este proceso ve— no hay límite que leer: ``UNLIMITED``."""
    hierarchy = memory_hierarchy(view)
    if hierarchy is None:
        return UNLIMITED
    levels = hierarchy.levels()
    if not levels or not levels[0].is_dir():
        return UNLIMITED
    bounded = [room for room in (level_headroom(level, hierarchy) for level in levels)
               if not isinstance(room, Unlimited)]
    return min(bounded) if bounded else UNLIMITED


def effective_available_ram_kb(meminfo: Path = Path("/proc/meminfo"),
                               cgroup: CgroupView = CgroupView()) -> int | None:
    """La RAM que este proceso puede pedir: bajo un límite de cgroup, lo que
    el límite deja; sin límite, ``MemAvailable``. Con límite se toma además el
    menor de los dos: un límite holgado (medido aquí: 14.3 GB de límite con
    8.7 GB disponibles en el anfitrión) no crea memoria que el anfitrión no
    tiene. ``None`` sin lectura de cualquiera de los dos."""
    host = available_ram_kb(meminfo)
    try:
        room = cgroup_headroom_bytes(cgroup)
    except CgroupUnreadable:
        return None
    if host is None or isinstance(room, Unlimited):
        return host
    return min(host, room // BYTES_PER_KB)


OwnerUsage = Callable[[int], int]


def host_tree_usage_kb(owner_pid: int) -> int:
    """Lo que reside el árbol ``/proc`` de un dueño local."""
    return proc_rss_kb(tree(owner_pid))


def container_aware_usage(containers: dict[int, ContainerMembers],
                          host_usage: OwnerUsage = host_tree_usage_kb) -> OwnerUsage:
    """El uso por dueño: el del cgroup de su contenedor si lo tiene, el de su
    árbol si no. El RSS del cliente ``podman run`` no es lo que el contenedor
    usa, así que un dueño en contenedor nunca se mide por su árbol. Un cgroup
    ilegible propaga ``MembersUnavailable``."""
    def usage_kb(owner_pid: int) -> int:
        source = containers.get(owner_pid)
        if source is None:
            return host_usage(owner_pid)
        return source.used_bytes() // BYTES_PER_KB
    return usage_kb


def ram_headroom(live: dict[str, int], meminfo: Path = Path("/proc/meminfo"),
                 usage: OwnerUsage = host_tree_usage_kb, cgroup: CgroupView = CgroupView()) -> int | None:
    """Lo libre de RAM —la efectiva, con el límite del cgroup— menos lo
    reservado que los dueños aún no usan. ``None`` sin lectura de lo libre o
    sin poder medir el uso de un dueño."""
    free = effective_available_ram_kb(meminfo, cgroup)
    if free is None:
        return None
    try:
        used = {int(pid): usage(int(pid)) for pid in live}
    except MembersUnavailable:
        return None
    return free - pending(live, used, {pid: {pid} for pid in used})


def bounded_need(need_kb: int, memory_limit_kb: int | None) -> int:
    """Lo que reserva un ítem: su necesidad, acotada por el ``--memory`` de su
    contenedor si se declaró — el kernel no le deja usar más."""
    return need_kb if memory_limit_kb is None else min(need_kb, memory_limit_kb)


def container_owners_path(ledger_path: Path) -> Path:
    return Path(ledger_path).with_name(Path(ledger_path).name + CONTAINER_OWNERS_SUFFIX)


def read_container_owners(ledger_path: Path) -> dict[int, str]:
    """``{pid del dueño: nombre del contenedor}``; vacío sin registro lateral."""
    try:
        return {int(pid): name for pid, name in json.loads(container_owners_path(ledger_path).read_text()).items()}
    except (OSError, ValueError):
        return {}


def record_container_owner(ledger_path: Path, owner_pid: int, name: str) -> None:
    """Declara que ``owner_pid`` reserva para el contenedor ``name``. Se
    escribe antes de reservar: una entrada sin reserva no compromete nada, y
    las de dueños muertos se retiran al escribir."""
    path = container_owners_path(ledger_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with shared_lock.held(path, run_id="ram-admission-containers", retries=LEDGER_LOCK_RETRIES,
                          min_wait_s=0.01, max_wait_s=0.2):
        owners = {pid: owner for pid, owner in read_container_owners(ledger_path).items() if is_alive(pid)}
        owners[owner_pid] = name
        shared_lock.write_atomic(path, json.dumps({str(pid): owner for pid, owner in owners.items()},
                                                  sort_keys=True))


def ledger_usage(ledger_path: Path, podman: str, cgroup_root: Path) -> OwnerUsage:
    """El uso por dueño según el registro lateral de contenedores del registro."""
    containers = {pid: ContainerMembers(name, podman, cgroup_root)
                  for pid, name in read_container_owners(ledger_path).items()}
    return container_aware_usage(containers)


def disk_ledger_path() -> Path:
    """El registro de disco comprometido; uno por máquina, como el de RAM."""
    declared = os.environ.get(DISK_LEDGER_VAR)
    return Path(declared) if declared else cache_dir() / "disk-admission.json"


def disk_floor_bytes() -> int:
    """El piso de seguridad en bytes, declarado en MiB."""
    return int(os.environ.get(DISK_FLOOR_VAR) or DEFAULT_DISK_FLOOR_MB) * BYTES_PER_MIB


def disk_headroom_command() -> Path:
    """El medidor del techo: el `disk-headroom` del árbol, salvo declaración."""
    declared = os.environ.get(DISK_HEADROOM_VAR)
    return Path(declared) if declared else DEFAULT_DISK_HEADROOM


def ceiling_bytes(headroom_command: Path, target: str) -> int | None:
    """El techo real de ``target`` según ``disk-headroom --ceiling-bytes``.
    ``None`` si rehúsa, no responde o no publica un entero: sin medida."""
    try:
        result = subprocess.run([str(headroom_command), "--path", target, "--ceiling-bytes"],
                                capture_output=True, text=True, timeout=DISK_HEADROOM_TIMEOUT_S)
    except (OSError, subprocess.TimeoutExpired):
        return None
    published = result.stdout.strip()
    if result.returncode == EXIT_UNMEASURED or not published.isdigit():
        return None
    return int(published)


def disk_headroom(live: dict[str, int], ceiling: int | None, floor: int) -> int | None:
    """Lo admisible de disco: el techo menos el piso y lo que los dueños vivos
    reservaron. Sin uso por proceso que leer, cada reserva cuenta entera."""
    if ceiling is None:
        return None
    return ceiling - floor - pending(live, {}, {})


def admit_disk(args: argparse.Namespace) -> int:
    """``disk-admit`` como código de salida: 0 reservó, 3 venció el plazo sin
    sitio, 2 ``disk-headroom`` no midió — y entonces no se toca el registro."""
    command, floor = disk_headroom_command(), disk_floor_bytes()
    if ceiling_bytes(command, args.path) is None:
        print(f"resource_admission disk-admit: disk-headroom no midió el techo de {args.path} "
              f"({command}); sin medida no se espera", file=sys.stderr)
        return EXIT_UNMEASURED
    admitted = admit_with(disk_ledger_path(), args.need_bytes, args.owner,
                          lambda live: disk_headroom(live, ceiling_bytes(command, args.path), floor),
                          "disk-admission", args.timeout, args.interval)
    if admitted:
        return EXIT_ADMITTED
    report_disk_refusal(args.need_bytes, ceiling_bytes(command, args.path), floor)
    return EXIT_TIMEOUT


def report_disk_refusal(need: int, ceiling: int | None, floor: int) -> None:
    """Publica por stderr las cifras con que se decidió: quien rehúsa un pull
    tiene que poder nombrar la necesidad y el techo sin volver a medir."""
    reserved = pending(ReservationLedger(disk_ledger_path()).live(), {}, {})
    print(f"resource_admission disk-admit: no cabe la necesidad {need} bytes; techo {ceiling} bytes, "
          f"piso {floor} bytes, reservado por otros {reserved} bytes", file=sys.stderr)


def release_disk(args: argparse.Namespace) -> int:
    release_from(disk_ledger_path(), args.owner, "disk-admission")
    return EXIT_ADMITTED


def admit_ram(args: argparse.Namespace) -> int:
    meminfo = args.meminfo or meminfo_path()
    ledger = args.ledger or ram_ledger_path()
    if args.container:
        record_container_owner(ledger, args.owner, args.container)
    admitted = admit_with(ledger, bounded_need(args.need, args.memory_limit_kb), args.owner,
                          lambda live: ram_headroom(live, meminfo,
                                                    ledger_usage(ledger, args.podman, args.cgroup_root),
                                                    CgroupView(args.self_cgroup, args.cgroup_root)),
                          "ram-admission", args.timeout, args.interval)
    if admitted:
        return EXIT_ADMITTED
    report_ram_refusal(bounded_need(args.need, args.memory_limit_kb), meminfo, ledger,
                       CgroupView(args.self_cgroup, args.cgroup_root))
    return EXIT_TIMEOUT


def report_ram_refusal(need_kb: int, meminfo: Path, ledger: Path, cgroup: CgroupView) -> None:
    """Publica por stderr las cifras con que se decidió, como ``report_disk_refusal``:
    sin ellas quien rehúsa sólo puede decir «admisión de memoria» y volver a medir."""
    free = effective_available_ram_kb(meminfo, cgroup)
    reserved = pending(ReservationLedger(ledger).live(), {}, {})
    print(f"resource_admission admit-ram: no cabe la necesidad {need_kb} kB; libre {free} kB, "
          f"reservado por otros {reserved} kB", file=sys.stderr)


def release_ram(args: argparse.Namespace) -> int:
    release_from(args.ledger or ram_ledger_path(), args.owner, "ram-admission")
    return EXIT_ADMITTED


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="resource_admission", description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="order", required=True)
    p_admit = sub.add_parser("admit-ram", help="reserva NEED kB de RAM; sale 0, o 3 al vencer el plazo")
    p_admit.add_argument("need", type=int)
    p_admit.add_argument("--ledger", type=Path, default=None)
    p_admit.add_argument("--owner", type=int, required=True)
    p_admit.add_argument("--meminfo", type=Path, default=None)
    p_admit.add_argument("--timeout", type=float, default=600.0)
    p_admit.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_admit.add_argument("--container", default=None,
                         help="el dueño reserva para este contenedor: su uso se mide en su cgroup")
    p_admit.add_argument("--memory-limit-kb", type=int, default=None,
                         help="el --memory del contenedor en kB: acota lo que se reserva")
    p_admit.add_argument("--podman", default="podman")
    p_admit.add_argument("--cgroup-root", type=Path, default=DEFAULT_CGROUP_ROOT)
    p_admit.add_argument("--self-cgroup", type=Path, default=SELF_CGROUP,
                         help="la pertenencia a cgroups cuyo límite acota la RAM libre")
    p_admit.set_defaults(handler=admit_ram)
    p_release = sub.add_parser("release", help="suelta la reserva de RAM de OWNER")
    p_release.add_argument("--ledger", type=Path, default=None)
    p_release.add_argument("--owner", type=int, required=True)
    p_release.set_defaults(handler=release_ram)
    p_disk = sub.add_parser("disk-admit", help="reserva NEED bytes de disco; sale 0, 3 al vencer el plazo, "
                                               "o 2 si disk-headroom no mide")
    p_disk.add_argument("--need-bytes", type=int, required=True)
    p_disk.add_argument("--owner", type=int, required=True)
    p_disk.add_argument("--path", default=DEFAULT_DISK_PATH)
    p_disk.add_argument("--timeout", type=float, default=600.0)
    p_disk.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_disk.set_defaults(handler=admit_disk)
    p_disk_release = sub.add_parser("disk-release", help="suelta la reserva de disco de OWNER")
    p_disk_release.add_argument("--owner", type=int, required=True)
    p_disk_release.set_defaults(handler=release_disk)
    return parser


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
