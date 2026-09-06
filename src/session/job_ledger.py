"""El registro de trabajos y su barrera — bloquear el turno hasta que TODOS
se asienten, con veredicto por trabajo.

Adaptación del ledger, ``verdict()`` y ``cmd_wait`` de ``kaupamex-docs:
.claude/scripts/session/wait-jobs.sh`` (550 líneas). El reparto que decide qué
viaja está en ``kaupamex-docs: source/gestion/pm/docs/iniciativas/
actualizar-agentic-ai-thyrox/analisis-reparto-de-la-familia-session.rst``:
viaja el **registro** (alta, baja, listado) y la **barrera**; NO viaja el
**control de proceso** (``adopt``/``kill``/``continue``, sobre el mismo
registro) ni el **archivado** (empaquetar el ledger vivo en un ``.tar.gz`` de
evidencia) — otro eje, deliberadamente fuera de este pase.

Los cinco hechos que gobiernan esta forma, y no se pueden inventar
--------------------------------------------------------------------

1. **La escritura es tmp + rename, no una escritura directa**
   (``wait-jobs.sh:118-122``). ``jobs()``/``wait()`` reglobean ``*.job`` en
   caliente, y truncar el archivo antes de llenarlo deja a un lector
   concurrente ver un ``.job`` vacío. ``os.replace`` dentro del mismo
   directorio es atómico (``rename(2)``), así que nunca hay un ``.job`` a
   medio escribir — ver ``_write``.

2. **``settle`` trae la re-comprobación de la carrera**
   (``wait-jobs.sh::verdict``, ``:100-111``). El orden es: ¿ya hay marcador? →
   ``"collected"``. Si no, y el trabajo ya no vive → se vuelve a mirar el
   marcador ANTES de declarar ``"bailed"``, porque el proceso puede escribirlo
   y morir entre las dos preguntas. Aislada en ``_recheck_after_death`` para
   que la segunda mirada tenga un único punto de fallo, no disperso dentro de
   ``settle``.

3. **"Pendiente" es «no recogido», NO «no asentado»** (H-DOCS-155: el marcador
   **estaba** escrito y el resultado nunca se leyó; el turno murió sin
   commitear). ``settle()`` sola nunca retira nada del registro — sólo
   ``wait()`` (que recoge) o ``forget()`` (que declara el abandono) lo hacen.
   Un porte que borrara el ``.job`` al ver el marcador sería más simple y
   reintroduciría exactamente ese defecto.

4. **``forget`` sobre una etiqueta ausente REHÚSA**
   (``wait-jobs.sh::cmd_forget``): un abandono sobre nada no es un abandono.
   Y ``forget`` no toca el proceso — suelta la anotación y deja el trabajo
   corriendo; terminarlo de verdad es cosa del control de proceso que este
   módulo no porta.

5. **``alive`` se INYECTA (DEC-04).** Este módulo no sabe diagnosticar
   vivacidad — recibe un invocable ``Callable[[Job], bool]`` que, dado un
   ``Job``, dice si sigue vivo. El consumidor decide con cuál de los dos
   diagnosticadores de ``roster/`` responde (``job_liveness`` por contenido y
   antigüedad cuando no hay pid, ``process_liveness`` por pid cuando sí lo
   hay) sin que este módulo importe ninguno de los dos. Lo mismo con ``now`` y
   ``sleep`` en ``wait``: se inyectan para que la suite pruebe el timeout sin
   dormir de verdad.

Qué es PARÁMETRO y no se codifica aquí dentro
------------------------------------------------

El patrón ``^EXIT=[0-9]+`` (es la convención R-2.0 de kaupamex, no una
propiedad de una barrera), la ruta del ledger, el intervalo de sondeo, cuánta
cola se imprime al recoger, y la prosa de cada mensaje son del consumidor —
mismo criterio que ``LABELS`` en ``repo.pending_work``. Este módulo no
imprime nada: ``wait`` devuelve el veredicto por etiqueta y quien llama lo
publica.

``wait`` es todo-o-nada, como el guion que se adapta
------------------------------------------------------

En ``cmd_wait`` el bloque que retira del ledger e imprime la cola sólo se
alcanza cuando ``settled == total`` (todos asentaron). Si vence el plazo con
alguno vivo, la función **retorna sin retirar ni siquiera a los que ya
asentaron** — la barrera es todo-o-nada: o se recoge el lote entero, o queda
íntegro en el registro para el próximo intento. Este módulo reproduce esa
forma en ``wait()``: al vencer el plazo no se llama ``_path_for(...).unlink``
sobre ningún trabajo, así que los ya asentados quedan registrados igual que
los que siguen esperando.
"""
from __future__ import annotations

import os
import re
import tempfile
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

#: Los cuatro veredictos de ``settle`` — nunca un booleano.
#:
#: - ``collected``  — el marcador ya está en el log.
#: - ``bailed``      — no hay marcador y el trabajo ya no vive (con la
#:   re-comprobación del hecho 2 ya aplicada).
#: - ``waiting``     — no hay marcador y el trabajo sigue vivo.
#: - ``forgotten``   — el ``.job`` desapareció del registro entre el momento en
#:   que ``wait()`` tomó su instantánea y esta comprobación — alguien lo
#:   soltó con ``forget()`` mientras la barrera esperaba.
SETTLEMENTS = ("collected", "bailed", "waiting", "forgotten")


class EmptyLabelError(ValueError):
    """Una etiqueta vacía no nombra un trabajo."""


class UnknownJobError(KeyError):
    """Olvidar (``forget``) algo que no está registrado no es un abandono."""


@dataclass(frozen=True)
class Job:
    """Un trabajo anotado en el ledger — la unidad que la barrera espera.

    ``pid``/``proc_start`` son opcionales: un trabajo registrado sin pid
    (``cmd_register`` de la fuente lo admite) no tiene sondeo por proceso
    posible, y es el propio ``alive`` inyectado el que decide cómo
    diagnosticarlo — este módulo no distingue el caso.
    """

    label: str
    log: Path
    pid: int | None = None
    proc_start: str | None = None
    command: str = ""


def _serialize(job: Job) -> str:
    return (
        f"label={job.label}\n"
        f"log={job.log}\n"
        f"pid={job.pid if job.pid is not None else ''}\n"
        f"proc_start={job.proc_start or ''}\n"
        f"command={job.command}\n"
    )


def _deserialize(text: str) -> Job:
    values: dict[str, str] = {}
    for line in text.splitlines():
        key, sep, value = line.partition("=")
        if sep:
            values[key] = value
    pid_raw = values.get("pid", "")
    return Job(
        label=values.get("label", ""),
        log=Path(values.get("log", "")),
        pid=int(pid_raw) if pid_raw else None,
        proc_start=values.get("proc_start") or None,
        command=values.get("command", ""),
    )


def _has_marker(log: Path, pattern: str) -> bool:
    """¿El log ya trae el marcador? Un log ilegible (aún no existe, sin
    permiso) cuenta como "todavía no" — igual que ``grep -qE ... 2>/dev/null``
    en la fuente, que traga el error de lectura en vez de propagarlo.
    """
    try:
        text = Path(log).read_text()
    except OSError:
        return False
    # `re.MULTILINE` para que `^` ancle a cada línea, como el `grep` de la
    # fuente (que opera línea a línea por defecto), no sólo al inicio del
    # archivo entero.
    return re.search(pattern, text, re.MULTILINE) is not None


def _recheck_after_death(job: Job, marker_pattern: str) -> bool:
    """La segunda mirada del hecho 2, aislada en su propio punto de fallo.

    Sin ella, un trabajo que escribió su marcador y murió justo después se
    publica como muerto sin haber terminado (``"bailed"`` en vez de
    ``"collected"``) — exactamente el defecto que la re-comprobación de
    ``wait-jobs.sh::verdict`` existe para cerrar.
    """
    return _has_marker(job.log, marker_pattern)


class JobLedger:
    """El registro de trabajos de una sesión, en un directorio propio.

    Un directorio = un ledger. El consumidor real usa un directorio por
    sesión (de ahí el nombre del paquete); aquí es sólo un parámetro.
    """

    def __init__(self, directory: Path) -> None:
        self._directory = Path(directory)
        self._directory.mkdir(parents=True, exist_ok=True)

    def _path_for(self, label: str) -> Path:
        # El guion original sanea la barra (`${label//\//_}`) porque el
        # nombre de archivo no puede contener subdirectorios implícitos; la
        # etiqueta EXACTA se conserva dentro del contenido (`label=`), así
        # que `jobs()` la recupera intacta pese al saneo del nombre.
        return self._directory / f"{label.replace('/', '_')}.job"

    def register(self, label: str, log: Path, *, pid: int | None = None,
                  proc_start: str | None = None, command: str = "") -> Job:
        """Anota un trabajo. Sobrescribe si la etiqueta ya existía —igual
        que la fuente, que no distingue alta de actualización.
        """
        if not label:
            raise EmptyLabelError(
                "una etiqueta vacía no nombra un trabajo; no se registra nada")
        # La ruta se ANCLA al cwd del registro. Una ruta relativa se resuelve
        # contra el cwd de quien la usa, y el escritor y el lector rara vez
        # comparten el suyo: un trabajo lanzado con `cd X && …` escribe en X,
        # y la barrera —o el Stop gate, o una persona— lo busca desde donde
        # esté parada. Medido 2026-09-06: un log de 141 559 bytes se leyó como
        # vacío por eso, y de ese «vacío» salió un diagnóstico falso.
        #
        # `abspath` y no `resolve()`: hace falta anclar al cwd, no seguir
        # symlinks. `resolve()` reescribiría `/tmp/x` a `/private/tmp/x` donde
        # `/tmp` sea enlace, y el ledger dejaría de devolver la ruta que el
        # llamador nombró.
        job = Job(label=label, log=Path(os.path.abspath(log)), pid=pid,
                   proc_start=proc_start, command=command)
        self._write(job)
        return job

    def _write(self, job: Job) -> None:
        """tmp + rename (hecho 1). Si el ``os.replace`` falla a medio camino
        —disco lleno, permiso revocado— el ``.job`` anterior (si lo había)
        queda intacto: nunca se escribe directamente sobre el destino.
        """
        # El sufijo es `.part`, NUNCA `.job`: `pathlib.Path.glob("*.job")` SÍ
        # hace match de archivos ocultos (a diferencia del glob de shell), así
        # que un temporal `.tmp-xxx.job` que sobreviviera a un crash entre el
        # `write` y el `replace` se colaría en `jobs()` como un trabajo
        # fantasma con la misma etiqueta que el real. Con `.part` el glob de
        # `jobs()` no lo ve nunca, sobreviva o no.
        fd, tmp_name = tempfile.mkstemp(
            dir=self._directory, prefix=".tmp-", suffix=".part")
        try:
            with os.fdopen(fd, "w") as handle:
                handle.write(_serialize(job))
            os.replace(tmp_name, self._path_for(job.label))
        except BaseException:
            Path(tmp_name).unlink(missing_ok=True)
            raise

    def forget(self, label: str) -> Job:
        """Declara un abandono a propósito y retira la anotación (hecho 4).

        NO toca el proceso: el trabajo sigue corriendo, huérfano de
        seguimiento. Terminarlo de verdad es control de proceso, que este
        módulo no porta en este pase (ver el docstring del módulo).
        """
        path = self._path_for(label)
        if not path.exists():
            raise UnknownJobError(
                f"'{label}' no está en el ledger; nada que soltar")
        job = _deserialize(path.read_text())
        path.unlink()
        return job

    def jobs(self) -> list[Job]:
        """Los trabajos anotados ahora mismo, en orden estable por nombre."""
        return [_deserialize(path.read_text())
                for path in sorted(self._directory.glob("*.job"))]

    def settle(self, job: Job, *, marker_pattern: str,
               alive: Callable[[Job], bool]) -> str:
        """El veredicto de UN trabajo — uno de ``SETTLEMENTS``.

        No retira nada del registro (hecho 3): sólo diagnostica. El orden
        reproduce ``wait-jobs.sh::verdict``:

        1. ¿Sigue anotado? Si el ``.job`` ya no está (alguien lo olvidó
           mientras se preguntaba) → ``"forgotten"``.
        2. ¿Ya hay marcador? → ``"collected"``, sin mirar ``alive`` para
           nada: un trabajo terminado hace rato sigue terminado.
        3. Si no, y ``alive(job)`` dice que ya no vive → la re-comprobación
           del hecho 2 antes de declarar ``"bailed"``.
        4. Si vive → ``"waiting"``.
        """
        if not self._path_for(job.label).exists():
            return "forgotten"
        if _has_marker(job.log, marker_pattern):
            return "collected"
        if not alive(job):
            if _recheck_after_death(job, marker_pattern):
                return "collected"
            return "bailed"
        return "waiting"

    def wait(self, *, marker_pattern: str, alive: Callable[[Job], bool],
              timeout: float, interval: float,
              now: Callable[[], float] = time.monotonic,
              sleep: Callable[[float], None] = time.sleep) -> dict[str, str]:
        """La barrera: gira hasta que TODOS asienten o venza el plazo.

        Instantánea de trabajos tomada UNA vez al empezar (como
        ``jobs=("$LEDGER"/*.job)`` en la fuente): un trabajo registrado
        DESPUÉS de esta llamada no entra en esta espera.

        Sin trabajos registrados devuelve ``{}`` de inmediato — no es un
        vacío ambiguo (a diferencia de ``repo.pending_work.sweep([])``): un
        ledger sin nada que esperar es un estado legítimo y frecuente, no
        una lista de configuración vacía por descuido.

        Al vencer el plazo con alguno sin asentar, la función retorna SIN
        retirar a NINGUNO del registro — ni siquiera a los que ya asentaron
        (ver "``wait`` es todo-o-nada" en el docstring del módulo). El valor
        de retorno sí informa el veredicto individual de cada uno, aunque el
        registro no se haya tocado: es información adicional sobre lo que la
        fuente hace, no una divergencia de la invariante todo-o-nada.
        """
        pending_jobs = self.jobs()
        if not pending_jobs:
            return {}

        started_at = now()
        settled: dict[str, str] = {}
        while True:
            for job in pending_jobs:
                if job.label in settled:
                    continue
                outcome = self.settle(
                    job, marker_pattern=marker_pattern, alive=alive)
                if outcome != "waiting":
                    settled[job.label] = outcome

            if len(settled) == len(pending_jobs):
                break
            if now() - started_at >= timeout:
                return {job.label: settled.get(job.label, "waiting")
                        for job in pending_jobs}
            sleep(interval)

        for job in pending_jobs:
            self._path_for(job.label).unlink(missing_ok=True)
        return settled
