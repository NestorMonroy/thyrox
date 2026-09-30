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
su medida: la VRAM, `gpu_monitor` con `nvidia-smi`; la RAM, este módulo con
`MemAvailable` y el RSS de cada árbol en `/proc`; el disco, este módulo con el
techo que publica `disk-headroom --ceiling-bytes` menos un piso de seguridad.

El disco no tiene uso por proceso que leer: lo que un pull ya escribió no se
puede atribuir a su dueño, así que su reserva cuenta entera hasta que la
suelta. Es la lectura conservadora —durante el pull esos bytes se descuentan
dos veces— y el ensure suelta en cuanto el `podman create` termina.

Métrica: lo libre que el sistema declara, menos lo reservado y aún no usado.
Ciega a: lo que un proceso ajeno al registro va a pedir y todavía no pidió
—ése no reserva—, y al pico de un ítem por encima de lo que reservó.
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
from pathlib import Path

from cache.paths import cache_dir
from session import shared_lock

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


def admit_with(ledger_path: Path, need: int, owner_pid: int, headroom: Headroom, run_id: str,
               timeout_s: float, interval_s: float = DEFAULT_INTERVAL_S) -> bool:
    """Comprobar y reservar bajo el lock del registro, reintentando hasta el
    plazo. ``headroom`` recibe las reservas vivas y devuelve lo libre menos lo
    comprometido aún no usado; ``None`` es «sin medida», y no admite."""
    book = ReservationLedger(ledger_path)
    book.path.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + timeout_s
    while True:
        with shared_lock.held(book.path, run_id=run_id, retries=LEDGER_LOCK_RETRIES,
                              min_wait_s=0.01, max_wait_s=0.2):
            live = book.live()
            if admissible(headroom(live), 0, need):
                book.reserve(owner_pid, need)
                return True
            book.save(live)
        if time.monotonic() >= deadline:
            return False
        time.sleep(interval_s)


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


def ram_headroom(live: dict[str, int], meminfo: Path = Path("/proc/meminfo"),
                 rss_kb: Callable[[set[int]], int] = proc_rss_kb,
                 tree: Callable[[int], set[int]] = tree) -> int | None:
    """Lo libre de RAM menos lo reservado que los árboles dueños aún no residen."""
    free = available_ram_kb(meminfo)
    if free is None:
        return None
    trees = {int(pid): tree(int(pid)) for pid in live}
    usage = {int(pid): rss_kb(trees[int(pid)]) for pid in live}
    return free - pending(live, usage, {pid: {pid} for pid in trees})


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
    admitted = admit_with(args.ledger or ram_ledger_path(), args.need, args.owner,
                          lambda live: ram_headroom(live, meminfo), "ram-admission",
                          args.timeout, args.interval)
    return EXIT_ADMITTED if admitted else EXIT_TIMEOUT


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
