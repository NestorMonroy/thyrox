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
`MemAvailable` y el RSS de cada árbol en `/proc`.

Métrica: lo libre que el sistema declara, menos lo reservado y aún no usado.
Ciega a: la memoria que un proceso ajeno al registro va a pedir y todavía no
pidió —ése no reserva—, y al pico de un ítem por encima de lo que reservó.
"""
from __future__ import annotations

import argparse
import json
import os
import re
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


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="resource_admission", description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="order", required=True)
    p_admit = sub.add_parser("admit-ram", help="reserva NEED kB de RAM; sale 0, o 3 al vencer el plazo")
    p_admit.add_argument("need", type=int)
    p_admit.add_argument("--ledger", type=Path, default=None)
    p_admit.add_argument("--owner", type=int, required=True)
    p_admit.add_argument("--meminfo", type=Path, default=None)
    p_admit.add_argument("--timeout", type=float, default=600.0)
    p_admit.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S)
    p_release = sub.add_parser("release", help="suelta la reserva de OWNER")
    p_release.add_argument("--ledger", type=Path, default=None)
    p_release.add_argument("--owner", type=int, required=True)
    args = parser.parse_args(argv)
    ledger = args.ledger or ram_ledger_path()
    if args.order == "release":
        release_from(ledger, args.owner, "ram-admission")
        return 0
    meminfo = args.meminfo or meminfo_path()
    admitted = admit_with(ledger, args.need, args.owner,
                          lambda live: ram_headroom(live, meminfo), "ram-admission",
                          args.timeout, args.interval)
    return 0 if admitted else 3


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
