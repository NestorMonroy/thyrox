"""Emparejar una tarjeta viva del roster del harness con el proceso que la sostiene.

Cierra el hueco que ``kaupamex-docs: source/gestion/pm/docs/iniciativas/
actualizar-agentic-ai-thyrox/hallazgos/
hallazgo-H-DOCS-1111-el-proceso-colgado-sobrevive-al-turno.rst`` midió: un
``cat`` sin argumento sobrevivió a su turno 3h22 sosteniendo viva una tarjeta
del harness, y los dos módulos hermanos de este paquete pasaron sin verlo, por
razones distintas y las dos legítimas:

- ``job_liveness`` decide por la FORMA del ``.output``. El de una tarea
  colgada tiene **0 bytes**, que es exactamente la forma de una recién
  arrancada: su vocabulario no puede separarlas.
- ``process_liveness`` sondea un **PID anotado en el roster**. El roster del
  harness sólo escribe ``<id>.output``; el ``pid=``/``proc_start=`` lo anota
  nuestro ``session/wait-jobs.sh``, no el cliente.

Lo que este módulo aporta, y no está en ninguno de los dos: **el vínculo**.
Una tarjeta y un proceso se emparejan recorriendo la cadena de padres hasta el
PID del cliente — que es lo que hubo que reconstruir a mano en el episodio.

Qué NO viaja del episodio, y por qué
-------------------------------------

El diagnóstico manual leyó ``/proc/<pid>/fd/0`` para ver que la espera era un
socket. Ese literal es la señal, pero **no es el veredicto**: un socket con
escritor es una espera legítima. Por eso el discriminador que este módulo
implementa es el PAR ``fd 0`` + ``.output`` sin crecer, y el caso en que sólo
se tiene lo primero cae en ``live_unclassified`` — la misma frontera entre
evidencia positiva y mera ausencia que ``job_liveness`` traza con
``stalled_evident``/``stalled_unknown``.

Los lectores del sistema (``read_process_table``, ``read_stdin_target``) se
inyectan: el núcleo es puro y se prueba sin procesos reales, porque medir
contra los procesos vivos de la máquina haría el veredicto dependiente de qué
corría cuando se lanzó la suite.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping, Sequence

#: El veredicto — cinco valores nombrados por su causa, nunca un booleano ni
#: un «lleva mucho tiempo». Los dos del medio son el par que discrimina:
#:
#: - ``unpaired``          — la entrada no tiene proceso vivo emparejable.
#: - ``recent``            — dentro de la ventana de vejez + holgura: todavía
#:   no ha tenido ocasión de escribir.
#: - ``progressing``       — su ``.output`` creció. Un trabajo largo que
#:   avanza NO es un trabajo colgado, por muchas horas que lleve.
#: - ``blocked_no_writer`` — sin crecer, fuera de la ventana, y su entrada
#:   estándar es un canal (socket/tubería) del que nadie va a escribir:
#:   evidencia POSITIVA de una espera que no se va a satisfacer.
#: - ``live_unclassified`` — sin crecer y fuera de la ventana, pero sin la
#:   señal del canal. La ausencia de evidencia no es evidencia.
VERDICTS = ("unpaired", "recent", "progressing", "blocked_no_writer",
            "live_unclassified")

#: Segundos tras los cuales un ``.output`` que no ha crecido deja de tener
#: excusa. Mismo valor y misma razón que ``job_liveness.STALE_THRESHOLD_SECONDS``
#: — se declara aquí para que el consumidor pueda moverlo sin tocar aquél.
STALE_THRESHOLD_SECONDS = 900

#: Holgura de reloj, SEPARADA del umbral y nunca sumada a él en silencio.
#: Hermana de ``job_liveness.CLOCK_SKEW_SECONDS``.
CLOCK_SKEW_SECONDS = 60

#: Prefijos de ``/proc/<pid>/fd/0`` que denotan un canal sin escritor
#: identificable. Un archivo regular o ``/dev/null`` NO están aquí: una
#: lectura de archivo termina sola.
_CHANNEL_PREFIXES = ("socket:", "pipe:", "anon_inode:")

_STARTS_WITH_PID = re.compile(r"^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$")


class UnreadableProcessError(OSError):
    """No se pudo leer el estado de un proceso que la tabla declaraba vivo.

    Separado del veredicto por la misma razón que ``UnreadableEntryError`` en
    ``job_liveness``: un fallo de lectura no es un diagnóstico, y colapsarlo
    en ``live_unclassified`` escondería la diferencia entre «no hay señal» y
    «no pude mirar».
    """

    def __init__(self, pid: int, reason: str) -> None:
        self.pid = pid
        self.reason = reason
        super().__init__(f"pid {pid}: {reason}")


@dataclass(frozen=True)
class ProcessFacts:
    """Lo mínimo de un proceso que el veredicto necesita.

    ``stdin_target`` es el destino de ``/proc/<pid>/fd/0`` tal cual lo publica
    el sistema (``socket:[376790]``, ``pipe:[123]``, una ruta, o ``None`` si
    no se pudo leer). Se guarda **verbatim**: interpretarlo al leerlo perdería
    la procedencia que el veredicto adjunta.
    """

    pid: int
    ppid: int
    elapsed_seconds: float
    stdin_target: str | None
    command: str = ""


@dataclass(frozen=True)
class TaskEntry:
    """Una entrada del roster del harness: su id y el estado de su ``.output``."""

    task_id: str
    output_bytes: int
    output_age_seconds: float


@dataclass(frozen=True)
class Diagnosis:
    """El veredicto de UNA entrada, con su procedencia y su pid adjuntos.

    ``from_stdin`` es el ``from_marker`` de este módulo: dice si la señal
    fuerte —el canal de la entrada estándar— decidió el veredicto, o si sólo
    lo hizo la antigüedad. Quien lo lee sabe sin adivinar cuál instrumentó la
    respuesta, y por tanto si puede citar el veredicto como evidencia.
    """

    verdict: str
    task_id: str
    pid: int | None
    from_stdin: bool
    reason: str = ""


@dataclass(frozen=True)
class SweepResult:
    """Los diagnósticos por ``task_id`` y las entradas que no se pudieron leer."""

    diagnoses: Mapping[str, Diagnosis]
    quarantined: Mapping[str, str]


def _is_channel(target: str | None) -> bool:
    """¿La entrada estándar es un canal del que nadie va a escribir?"""
    return bool(target) and target.startswith(_CHANNEL_PREFIXES)


def descendants_of(root_pid: int,
                   processes: Sequence[ProcessFacts]) -> tuple[ProcessFacts, ...]:
    """Los descendientes TRANSITIVOS de ``root_pid``, en la tabla dada.

    El recorrido es por niveles y lleva un conjunto de vistos: una tabla con
    un ciclo de padres —que existe si el sistema recicla un PID entre dos
    lecturas— terminaría el barrido en un bucle infinito, y el instrumento que
    diagnostica cuelgues no puede colgarse.
    """
    by_parent: dict[int, list[ProcessFacts]] = {}
    for process in processes:
        by_parent.setdefault(process.ppid, []).append(process)

    found: list[ProcessFacts] = []
    seen: set[int] = {root_pid}
    frontier = [root_pid]
    while frontier:
        current = frontier.pop()
        for child in by_parent.get(current, ()):
            if child.pid in seen:
                continue
            seen.add(child.pid)
            found.append(child)
            frontier.append(child.pid)
    return tuple(found)


def diagnose(entry: TaskEntry,
             process: ProcessFacts | None,
             *,
             stale_after: float = STALE_THRESHOLD_SECONDS,
             clock_skew: float = CLOCK_SKEW_SECONDS) -> Diagnosis:
    """Combina la entrada y su proceso en UN veredicto.

    El orden importa, y es el que separa un trabajo largo legítimo de uno
    colgado:

    1. Sin proceso emparejable no hay nada que juzgar → ``unpaired``.
    2. Si el ``.output`` **creció**, el trabajo avanza aunque el reloj sea
       largo → ``progressing``. Este paso va ANTES del umbral a propósito:
       invertirlo marcaría como colgado a cualquier trabajo de horas.
    3. Dentro de la ventana (umbral + holgura) no se juzga → ``recent``.
    4. Fuera de la ventana, el canal de la entrada estándar decide entre
       evidencia positiva y mera ausencia.
    """
    if process is None:
        return Diagnosis("unpaired", entry.task_id, None, False,
                         "sin proceso vivo emparejable")
    if entry.output_bytes > 0:
        return Diagnosis("progressing", entry.task_id, process.pid, False,
                         f"el .output tiene {entry.output_bytes} bytes")
    if entry.output_age_seconds <= stale_after + clock_skew:
        return Diagnosis("recent", entry.task_id, process.pid, False,
                         "dentro de la ventana de vejez más la holgura de reloj")
    if _is_channel(process.stdin_target):
        return Diagnosis("blocked_no_writer", entry.task_id, process.pid, True,
                         f"entrada estándar en {process.stdin_target}, .output en cero")
    return Diagnosis("live_unclassified", entry.task_id, process.pid, False,
                     "sin crecer y fuera de la ventana, pero sin señal del canal")


def sweep(entries: Iterable[TaskEntry],
          processes: Sequence[ProcessFacts],
          *,
          client_pid: int,
          pid_by_task: Mapping[str, int] | None = None,
          stale_after: float = STALE_THRESHOLD_SECONDS,
          clock_skew: float = CLOCK_SKEW_SECONDS) -> SweepResult:
    """Diagnostica cada entrada contra los descendientes vivos del cliente.

    ``pid_by_task`` es el emparejamiento que el llamador ya conoce; sin él,
    una entrada queda ``unpaired``. **No se adivina** por orden ni por
    antigüedad: emparejar por coincidencia produciría un veredicto con la
    forma correcta sobre el proceso equivocado, que es peor que no emparejar.

    Una lista de entradas vacía NO rehúsa: un roster sin trabajo pendiente es
    un estado normal, no un error de composición.
    """
    live = {p.pid: p for p in descendants_of(client_pid, processes)}
    mapping = dict(pid_by_task or {})
    diagnoses: dict[str, Diagnosis] = {}
    quarantined: dict[str, str] = {}

    for entry in entries:
        pid = mapping.get(entry.task_id)
        process = live.get(pid) if pid is not None else None
        try:
            diagnoses[entry.task_id] = diagnose(
                entry, process, stale_after=stale_after, clock_skew=clock_skew)
        except UnreadableProcessError as error:
            quarantined[entry.task_id] = error.reason
    return SweepResult(diagnoses, quarantined)


def read_stdin_target(pid: int) -> str | None:
    """El destino de ``/proc/<pid>/fd/0``, verbatim, o ``None`` si no se pudo leer."""
    try:
        return os.readlink(f"/proc/{pid}/fd/0")
    except OSError:
        return None


def read_process_table(ps_output: str) -> tuple[ProcessFacts, ...]:
    """Parsea la salida de ``ps -eo pid,ppid,etime,args --no-headers``.

    Se recibe el texto en vez de invocar ``ps`` aquí para que el consumidor
    decida su propio filtrado —los hilos del kernel se distinguen por sus
    corchetes, no por un nombre de comando— y para que la suite pueda
    ejercitar el parseo sin procesos reales.
    """
    parsed: list[ProcessFacts] = []
    for line in ps_output.splitlines():
        match = _STARTS_WITH_PID.match(line)
        if not match:
            continue
        pid, ppid, etime, command = match.groups()
        parsed.append(ProcessFacts(pid=int(pid), ppid=int(ppid),
                                   elapsed_seconds=parse_etime(etime),
                                   stdin_target=None, command=command))
    return tuple(parsed)


def parse_etime(etime: str) -> float:
    """``[[DD-]hh:]mm:ss`` → segundos. Es el formato que ``ps`` publica."""
    days = 0
    if "-" in etime:
        head, etime = etime.split("-", 1)
        days = int(head)
    parts = [int(p) for p in etime.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0)
    hours, minutes, seconds = parts
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def read_roster(directory: Path, now: float) -> tuple[TaskEntry, ...]:
    """Las entradas ``<id>.output`` de un roster del harness, con su antigüedad."""
    entries: list[TaskEntry] = []
    for path in sorted(directory.glob("*.output")):
        try:
            stat = path.stat()
        except OSError:
            continue
        entries.append(TaskEntry(task_id=path.stem,
                                 output_bytes=stat.st_size,
                                 output_age_seconds=now - stat.st_mtime))
    return tuple(entries)
