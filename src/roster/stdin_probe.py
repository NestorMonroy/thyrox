"""La entrada estándar de un proceso, una línea por PID.

Por qué existe: el 2026-09-26 un ``rg`` sin ruta esperó 1 h 19 min leyendo su
stdin, que en esta herramienta es un socket que no se cierra. Se diagnosticó
a mano con ``ls -l /proc/<pid>/fd/0``. ``orphan_task`` ya leía ese destino
para emparejar tarjetas del roster, pero sin superficie de línea de comandos;
esto es esa superficie, y reutiliza su lector y su criterio de canal.

Una línea TSV por PID —pid, destino verbatim, clase, estado, segundos de
CPU— para componerla con GNU Parallel sin cambiar nada::

    pgrep -f '[r]g -n' | parallel -j8 -k bash bin/stdin_probe {}

Clases: ``channel`` (socket, tubería o anon_inode: puede esperar para
siempre), ``devnull``, ``tty``, ``file`` y ``unreadable`` (el pid no está o
no se pudo leer; no es un stdin vacío).

Ciega a: si el canal tiene escritor. Un socket con escritor es una espera
legítima; lo que separa la colgada es que su CPU no avance entre dos
sondas, y eso lo decide quien compara dos líneas, no una sola.
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

    def tsv(self) -> str:
        cpu = "-" if self.cpu_seconds is None else f"{self.cpu_seconds:.2f}"
        return "\t".join((str(self.pid), self.stdin or "-", self.kind, self.state or "-", cpu))


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


def probe(pid: int, proc_root: str = "/proc", ticks_per_second: int | None = None) -> StdinProbe:
    ticks = ticks_per_second or os.sysconf("SC_CLK_TCK")
    target = read_stdin_target(pid, proc_root)
    state, cpu = _state_and_cpu(pid, proc_root, ticks)
    return StdinProbe(pid, target, _kind(target), state, cpu)


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
