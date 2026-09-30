"""La sesión de un ítem es su frontera de propiedad — y se drena entera.

Por qué la sesión y no el grupo de procesos
-------------------------------------------
Cada ítem de un pool arranca con ``setsid``, así que su proceso principal es
líder de una sesión nueva y todo lo que lance hereda esa sesión. El grupo de
procesos no sirve de frontera: GNU ``timeout`` llama ``setpgid(0, 0)`` y pone
al ejecutor en un grupo propio, de modo que un ``kill`` al grupo del ítem no
lo alcanza. ``setsid`` sólo lo cambia quien crea otra sesión, cosa que un
proceso del ítem no hace sin proponérselo.

Qué garantiza
-------------
``drain_session`` no devuelve hasta que la sesión quedó vacía o hasta declarar
quién no se pudo retirar: espera a que los miembros salgan solos durante la
gracia, les manda ``SIGTERM``, espera otro plazo y manda ``SIGKILL`` a los que
queden. Un ítem no se da por terminado porque murió su proceso principal; se da
por terminado cuando su sesión está vacía.

Un proceso en estado ``Z`` ya no ejecuta ni tiene descriptores abiertos: no
cuenta como miembro.

*Ciega a:* un proceso que se escape con su propio ``setsid``; ése deja de ser
miembro y el drenaje no lo ve. Y a otro espacio de nombres de PID.
"""
from __future__ import annotations

import argparse
import os
import signal
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

#: Cada cuánto se vuelve a mirar la sesión mientras se espera.
POLL_SECONDS = 0.1
#: Cuánto se espera tras ``SIGTERM`` antes de mandar ``SIGKILL``.
KILL_AFTER_SECONDS = 5.0
#: Salida de la CLI cuando la sesión quedó vacía sólo porque se terminaron
#: procesos: el trabajo que hacían quedó a medias.
FORCED_EXIT_CODE = 3


@dataclass
class DrainReport:
    drained_naturally: bool = False
    terminated: list[int] = field(default_factory=list)
    killed: list[int] = field(default_factory=list)
    remaining: list[int] = field(default_factory=list)


def _stat_fields(pid_dir: Path) -> list[str] | None:
    try:
        text = (pid_dir / "stat").read_text()
    except OSError:
        return None
    # El nombre del comando va entre paréntesis y puede contener espacios:
    # los campos se cuentan desde el último ``)``.
    return text.rsplit(")", 1)[1].split()


def session_members(session_id: int, *, proc_root: str | os.PathLike[str] = "/proc",
                    by_session: bool = True) -> list[int]:
    """Los procesos vivos de la sesión ``session_id``.

    ``by_session=False`` mide el grupo de procesos en vez de la sesión; existe
    sólo como control de anulación de las pruebas.
    """
    # Tras el nombre: estado (0), padre (1), grupo (2), sesión (3).
    column = 3 if by_session else 2
    members = []
    for entry in Path(proc_root).iterdir():
        if not entry.name.isdigit():
            continue
        fields = _stat_fields(entry)
        if fields is None or fields[0] == "Z":
            continue
        if int(fields[column]) == session_id:
            members.append(int(entry.name))
    return sorted(members)


def _wait_until_empty(session_id: int, seconds: float, *, sleep: Callable[[float], None],
                      clock: Callable[[], float]) -> list[int]:
    deadline = clock() + seconds
    members = session_members(session_id)
    while members and clock() < deadline:
        sleep(POLL_SECONDS)
        members = session_members(session_id)
    return members


def _signal_all(pids: list[int], signum: int) -> list[int]:
    reached = []
    for pid in pids:
        try:
            os.kill(pid, signum)
            reached.append(pid)
        except ProcessLookupError:
            continue
    return reached


def drain_session(session_id: int, *, grace_seconds: float,
                  kill_after_seconds: float = KILL_AFTER_SECONDS, terminate: bool = True,
                  sleep: Callable[[float], None] = time.sleep,
                  clock: Callable[[], float] = time.monotonic) -> DrainReport:
    """Espera a que la sesión quede vacía; si no, la vacía y dice a quién retiró.

    ``terminate=False`` sólo espera; existe como control de anulación.
    """
    report = DrainReport()
    members = _wait_until_empty(session_id, grace_seconds, sleep=sleep, clock=clock)
    if not members:
        report.drained_naturally = True
        return report
    if not terminate:
        report.remaining = members
        return report
    report.terminated = _signal_all(members, signal.SIGTERM)
    members = _wait_until_empty(session_id, kill_after_seconds, sleep=sleep, clock=clock)
    if members:
        report.killed = _signal_all(members, signal.SIGKILL)
        members = _wait_until_empty(session_id, kill_after_seconds, sleep=sleep, clock=clock)
    report.remaining = members
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Espera a que una sesión de procesos quede vacía y retira a los que no salgan. "
        "Sale 0 si la sesión quedó vacía sola, 3 si hubo que terminar procesos para vaciarla "
        "y 1 si alguien sobrevivió a SIGKILL."
    )
    sub = parser.add_subparsers(dest="command", required=True)
    drain = sub.add_parser("drain", help="vacía la sesión <session-id>")
    drain.add_argument("session_id", type=int)
    drain.add_argument("--grace", type=float, required=True,
                       help="segundos que se espera a que los miembros salgan solos")
    members = sub.add_parser("members", help="lista los procesos vivos de la sesión")
    members.add_argument("session_id", type=int)
    arguments = parser.parse_args(argv)
    if arguments.command == "members":
        for pid in session_members(arguments.session_id):
            print(pid)
        return 0
    report = drain_session(arguments.session_id, grace_seconds=arguments.grace)
    if report.drained_naturally:
        print("drenaje: la sesión quedó vacía sola")
    if report.terminated:
        print("drenaje: SIGTERM a " + " ".join(map(str, report.terminated)))
    if report.killed:
        print("drenaje: SIGKILL a " + " ".join(map(str, report.killed)))
    if report.remaining:
        print("drenaje: sobreviven " + " ".join(map(str, report.remaining)), file=sys.stderr)
        return 1
    return 0 if report.drained_naturally else FORCED_EXIT_CODE


if __name__ == "__main__":
    sys.exit(main())
