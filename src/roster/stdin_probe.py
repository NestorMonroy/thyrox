"""La entrada estándar de un proceso, una línea por PID.

Por qué existe: el 2026-09-26 un ``rg`` sin ruta esperó 1 h 19 min leyendo su
stdin, que en esta herramienta es un socket que no se cierra. Se diagnosticó
a mano con ``ls -l /proc/<pid>/fd/0``. ``orphan_task`` ya leía ese destino
para emparejar tarjetas del roster, pero sin superficie de línea de comandos;
esto es esa superficie, y reutiliza su lector y su criterio de canal.

Una línea TSV por PID —pid, destino verbatim, clase, estado, segundos de
CPU, escritores— para componerla con GNU Parallel sin cambiar nada::

    pgrep -f '[r]g -n' | parallel -j8 -k bash bin/stdin_probe {}

Clases: ``channel`` (socket, tubería o anon_inode: puede esperar para
siempre), ``devnull``, ``tty``, ``file`` y ``unreadable`` (el pid no está o
no se pudo leer; no es un stdin vacío).

La sexta columna son los escritores de una tubería: cuántos OTROS procesos
la tienen abierta para escribir (``fdinfo``, modo de acceso). Sin ninguno,
leer da EOF —cada ítem del pool: ``{ cat plantilla; printf item; } |
claude -p``—; con uno vivo que no escribe, espera para siempre (``sleep |
cat``). ``-`` si no es tubería.

Ciega a: el otro extremo de un socket, que no se ve en ``/proc/<pid>/fd``
—su espera puede ser legítima; lo que separa la colgada es que su CPU no
avance entre dos sondas—; y a un escritor vivo que sí va a escribir.
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass

from roster.orphan_task import _is_channel, read_stdin_target

_TTY_PREFIXES = ("/dev/pts/", "/dev/tty")


@dataclass(frozen=True)
class StdinProbe:
    pid: int
    stdin: str | None
    kind: str
    state: str | None
    cpu_seconds: float | None
    #: Otros procesos con la tubería abierta para escribir; ``None`` si no es
    #: una tubería (un socket no se mide así, un archivo no espera).
    writers: int | None = None

    def tsv(self) -> str:
        cpu = "-" if self.cpu_seconds is None else f"{self.cpu_seconds:.2f}"
        writers = "-" if self.writers is None else str(self.writers)
        return "\t".join((str(self.pid), self.stdin or "-", self.kind, self.state or "-", cpu, writers))


def _kind(target: str | None) -> str:
    if target is None:
        return "unreadable"
    if _is_channel(target):
        return "channel"
    if target == "/dev/null":
        return "devnull"
    if target.startswith(_TTY_PREFIXES):
        return "tty"
    return "file"


def _state_and_cpu(pid: int, proc_root: str, ticks_per_second: int) -> tuple[str | None, float | None]:
    """El estado y el CPU acumulado (utime + stime) de ``/proc/<pid>/stat``.

    El nombre del programa va entre paréntesis y puede llevar espacios: los
    campos se cuentan desde el último ``)``."""
    try:
        stat = open(f"{proc_root}/{pid}/stat", encoding="utf-8").read()
    except OSError:
        return None, None
    fields = stat[stat.rfind(")") + 2:].split()
    return fields[0], (int(fields[11]) + int(fields[12])) / ticks_per_second


#: Los dos bits bajos de ``flags`` en ``fdinfo``: 1 ``O_WRONLY``, 2 ``O_RDWR``.
_WRITE_ACCESS = {1, 2}


def _pipe_writers(pid: int, target: str, proc_root: str) -> int:
    """Cuántos OTROS procesos tienen abierta ``target`` para escribir. Sin
    ninguno, leer la tubería da EOF; con uno vivo que no escribe, espera."""
    writers = 0
    for other in os.listdir(proc_root):
        if not other.isdigit() or int(other) == pid:
            continue
        fd_dir = f"{proc_root}/{other}/fd"
        try:
            fds = os.listdir(fd_dir)
        except OSError:
            continue
        for fd in fds:
            try:
                if os.readlink(f"{fd_dir}/{fd}") != target:
                    continue
                info = open(f"{proc_root}/{other}/fdinfo/{fd}", encoding="utf-8").read()
            except OSError:
                continue
            flags = next((line.split()[1] for line in info.splitlines() if line.startswith("flags:")), "0")
            if int(flags, 8) & 3 in _WRITE_ACCESS:
                writers += 1
                break
    return writers


def probe(pid: int, proc_root: str = "/proc", ticks_per_second: int | None = None) -> StdinProbe:
    ticks = ticks_per_second or os.sysconf("SC_CLK_TCK")
    target = read_stdin_target(pid, proc_root)
    state, cpu = _state_and_cpu(pid, proc_root, ticks)
    writers = _pipe_writers(pid, target, proc_root) if target and target.startswith("pipe:[") else None
    return StdinProbe(pid, target, _kind(target), state, cpu, writers)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("pids", nargs="+")
    parser.add_argument("--proc-root", default="/proc", help="raíz de /proc (para probar sin procesos reales)")
    args = parser.parse_args(argv)
    if not all(pid.isdigit() for pid in args.pids):
        print("stdin_probe: REHÚSA — los pids son enteros", file=sys.stderr)
        return 2
    for pid in args.pids:
        print(probe(int(pid), args.proc_root).tsv())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
