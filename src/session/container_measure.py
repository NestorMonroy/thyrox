"""La medida de un contenedor, desde su cgroup y no desde el cliente.

El proceso de un contenedor de Podman cuelga de ``conmon`` → ``init``, no del
``podman run`` que lo lanzó: el árbol ``/proc`` del wrapper de un ítem no lo
alcanza, y GNU Time sobre ``podman run`` midió 41 MB con el contenedor
reteniendo ~200 MB (banco ``podman-execution-primitive-20260930T215755``,
H-THYROX-294). Este módulo da, por el nombre del contenedor, el conjunto de
PIDs y la memoria de SU cgroup, la ruta que publica ``podman inspect``.

Tres estados que no se colapsan: ``measured``; ``absent`` (el contenedor no
existe o su cgroup ya no está: no hay nada que medir); ``error`` (se intentó y
falló: ``podman`` no responde o el cgroup no es legible). Un ausente o un error
nunca se leen como cero.

Disposición del cgroup, medida en este contenedor (Podman 4.9.3 rootful,
``cgroupfs``, cgroups v1): ``/sys/fs/cgroup/memory/<ruta>`` con
``cgroup.procs``, ``memory.max_usage_in_bytes`` y ``memory.usage_in_bytes``.
En v2 la misma ruta cuelga de la raíz unificada con ``memory.peak`` y
``memory.current``.

Métrica: los PIDs de ``cgroup.procs`` y el pico y el uso de memoria que el
kernel contabiliza al cgroup del contenedor.
Ciega a: la memoria de ``conmon`` (vive fuera del cgroup del contenedor); la
caché de páginas que el kernel carga al cgroup (el uso v1 la incluye); y, en
v2 con un kernel anterior a 5.19, el pico (no existe ``memory.peak``: error).
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

MEASURED = "measured"
ABSENT = "absent"
ERROR = "error"
DEFAULT_CGROUP_ROOT = Path("/sys/fs/cgroup")
PODMAN_TIMEOUT_S = 30
EXIT_MEASURED = 0
EXIT_NOT_MEASURED = 2
#: Lo que ``podman inspect`` imprime: si corre y la ruta de su cgroup.
INSPECT_FORMAT = "{{.State.Running}} {{.State.CgroupPath}}"
EXIT_EXISTS = 0
EXIT_MISSING = 1


class MembersUnavailable(Exception):
    """La fuente de miembros no pudo dar los PIDs: no se sabe a quién medir."""


@dataclass(frozen=True)
class ContainerReading:
    """Una lectura del cgroup de un contenedor, en uno de los tres estados."""
    state: str
    pids: frozenset[int] = frozenset()
    peak_bytes: int | None = None
    usage_bytes: int | None = None
    reason: str | None = None


@dataclass(frozen=True)
class CgroupFiles:
    """Los tres archivos de un cgroup que la medida lee."""
    procs: Path
    peak: Path
    usage: Path


def v1_files(root: Path, relative: str) -> CgroupFiles:
    memory = root / "memory" / relative.lstrip("/")
    return CgroupFiles(memory / "cgroup.procs", memory / "memory.max_usage_in_bytes",
                       memory / "memory.usage_in_bytes")


def v2_files(root: Path, relative: str) -> CgroupFiles:
    unified = root / relative.lstrip("/")
    return CgroupFiles(unified / "cgroup.procs", unified / "memory.peak", unified / "memory.current")


def is_v2_cgroup(root: Path, relative: str) -> bool:
    return (root / relative.lstrip("/") / "cgroup.controllers").is_file()


def locate_files(root: Path, relative: str) -> CgroupFiles | None:
    """Los archivos del cgroup según la jerarquía que exista; ``None`` si el
    cgroup ya no está en ninguna."""
    v1 = v1_files(root, relative)
    if v1.procs.parent.is_dir():
        return v1
    if is_v2_cgroup(root, relative):
        return v2_files(root, relative)
    return None


class PodmanFailed(Exception):
    """``podman inspect`` no respondió por una causa que no es la ausencia."""


def run_podman(podman: str, *args: str) -> subprocess.CompletedProcess:
    """Una orden de ``podman``; ``PodmanFailed`` si no se pudo ejecutar."""
    try:
        return subprocess.run([podman, *args], capture_output=True, text=True, timeout=PODMAN_TIMEOUT_S)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise PodmanFailed(f"podman {' '.join(args)}: {error}") from error


def container_exists(name: str, podman: str) -> bool:
    """``podman container exists``: 0 existe, 1 no existe, otro código es un
    fallo de ``podman`` y no una ausencia."""
    done = run_podman(podman, "container", "exists", name)
    if done.returncode not in (EXIT_EXISTS, EXIT_MISSING):
        raise PodmanFailed(f"podman container exists {name}: {done.stderr.strip() or f'exit {done.returncode}'}")
    return done.returncode == EXIT_EXISTS


def inspect_cgroup(name: str, podman: str) -> str | None:
    """La ruta del cgroup del contenedor en marcha; ``None`` si no existe o no
    corre. Lanza ``PodmanFailed`` si ``podman`` no pudo responder."""
    if not container_exists(name, podman):
        return None
    done = run_podman(podman, "inspect", "-f", INSPECT_FORMAT, name)
    if done.returncode != 0:
        raise PodmanFailed(f"podman inspect {name}: {done.stderr.strip() or f'exit {done.returncode}'}")
    running, _, relative = done.stdout.strip().partition(" ")
    return relative if running == "true" and relative else None


def read_integer(path: Path) -> int:
    """Un entero de un archivo de cgroup; ``ValueError`` si no lo es."""
    return int(path.read_text().strip())


def read_pids(path: Path) -> frozenset[int]:
    return frozenset(int(line) for line in path.read_text().split())


def read_files(files: CgroupFiles) -> ContainerReading:
    """Lee los tres archivos. Un cgroup que desaparece entre la localización
    y la lectura es un contenedor que salió: ausente, no error."""
    try:
        return ContainerReading(MEASURED, read_pids(files.procs), read_integer(files.peak),
                                read_integer(files.usage))
    except FileNotFoundError:
        return ContainerReading(ABSENT, reason=f"el cgroup {files.procs.parent} ya no existe")
    except (OSError, ValueError) as error:
        return ContainerReading(ERROR, reason=f"cgroup ilegible en {files.procs.parent}: {error}")


def read_container(name: str, podman: str = "podman",
                   cgroup_root: Path = DEFAULT_CGROUP_ROOT) -> ContainerReading:
    """Los PIDs y la memoria del cgroup del contenedor ``name``."""
    try:
        relative = inspect_cgroup(name, podman)
    except PodmanFailed as error:
        return ContainerReading(ERROR, reason=str(error))
    if relative is None:
        return ContainerReading(ABSENT, reason=f"el contenedor {name} no existe o no corre")
    files = locate_files(Path(cgroup_root), relative)
    if files is None:
        return ContainerReading(ABSENT, reason=f"sin cgroup para {name} bajo {cgroup_root}")
    return read_files(files)


class ContainerMembers:
    """Fuente de miembros de un contenedor: vive mientras su cgroup existe, y
    sus miembros son los PIDs de ``cgroup.procs``. Vida y miembros salen de la
    MISMA lectura: dos lecturas separadas dejarían una ventana en la que el
    contenedor sale entre ambas. Un cgroup ilegible sigue vivo —hay algo
    corriendo que no se pudo leer— y se declara con ``MembersUnavailable`` en
    vez de devolver un conjunto vacío."""

    def __init__(self, name: str, podman: str = "podman", cgroup_root: Path = DEFAULT_CGROUP_ROOT):
        self.name = name
        self.podman = podman
        self.cgroup_root = Path(cgroup_root)

    def reading(self) -> ContainerReading:
        return read_container(self.name, self.podman, self.cgroup_root)

    def current_members(self) -> set[int] | None:
        """Los PIDs de ``cgroup.procs`` en una sola lectura; ``None`` si el
        contenedor ya no existe (terminó o aún no arrancó)."""
        current = self.reading()
        if current.state == ERROR:
            raise MembersUnavailable(current.reason or current.state)
        return set(current.pids) if current.state == MEASURED else None

    def used_bytes(self) -> int:
        """Lo que el cgroup usa ahora; 0 si está ausente (aún no arrancó o ya
        salió: su reserva cuenta entera). Un error lanza ``MembersUnavailable``."""
        current = self.reading()
        if current.state == ERROR:
            raise MembersUnavailable(current.reason or current.state)
        return current.usage_bytes or 0


def reading_line(reading: ContainerReading) -> str:
    """Una línea por estado: ``measured <pico> <uso> <pids>``, ``absent
    <causa>`` o ``error <causa>``."""
    if reading.state == MEASURED:
        pids = ",".join(str(pid) for pid in sorted(reading.pids))
        return f"{MEASURED} {reading.peak_bytes} {reading.usage_bytes} {pids}"
    return f"{reading.state} {reading.reason}"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="container_measure", description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="order", required=True)
    p_read = sub.add_parser("read", help="imprime el estado del cgroup de NAME; sale 0 medido, 2 si no")
    p_read.add_argument("name")
    p_read.add_argument("--podman", default="podman")
    p_read.add_argument("--cgroup-root", type=Path, default=DEFAULT_CGROUP_ROOT)
    args = parser.parse_args(argv)
    reading = read_container(args.name, args.podman, args.cgroup_root)
    print(reading_line(reading))
    return EXIT_MEASURED if reading.state == MEASURED else EXIT_NOT_MEASURED


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
