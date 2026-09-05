"""Diagnosticar si una entrada del roster sigue viva — CON un PID que sondear.

Adaptación de ``probeDaemonJob``/``dbt``/``S6e`` del cliente Claude Code
(``kaupamex-docs:
source/gestion/pm/docs/iniciativas/actualizar-agentic-ai-thyrox/
analisis-roster-de-trabajos-en-el-binario.rst``, build 2.1.261), hermana de
``job_liveness`` (léela primero: fija el vocabulario — veredicto por causa,
procedencia adjunta, holgura declarada aparte del umbral, cuarentena
distinta de un vacío legítimo — que este módulo reutiliza sin repetirlo).

Lo que ``job_liveness`` dejó fuera, y por qué éste lo cubre
------------------------------------------------------------

Su cabecera dice: *"Nuestros trabajos —subagentes y tareas de
``Bash(run_in_background)``— no son procesos: no hay PID que sondear"*. Eso es
cierto para la MITAD del universo. La otra mitad sí tiene PID: el roster de
``kaupamex-docs: .claude/scripts/session/wait-jobs.sh``, que anota
``pid=``/``proc_start=`` en cada ``.job`` (``:132``) y cuya función ``class()``
(``:309``) decide con esos dos datos. Este módulo adapta la vía del PID que
``job_liveness`` declinó portar — la FORMA del binario, no su sustrato: el
binario sondea un daemon único (``roblox``… no, un proceso de Claude Code);
aquí se sondea CUALQUIER PID que un roster de archivos haya anotado.

Del binario (verbatim, la misma cita que ``job_liveness``):

.. code-block:: js

    async function dbt(e,t){
      if(!qs(e))return"dead_pid";
      if(!await Rm(e,t))return"procstart_mismatch";
      if(await cCn(e))return"zombie";
      return"live"}
    async function S6e(e,t){return await dbt(e,t)==="live"}

Cuatro veredictos por causa y un booleano encima — la misma forma que
``job_liveness.diagnose``/``is_alive``. Lo que aquí SÍ viaja, a diferencia de
``job_liveness``, es el sondeo por PID mismo: ``kill -0`` (existencia),
comparación de ``starttime`` (discriminador fuerte contra un PID reciclado) y
lectura del estado (``Z``/``T``/resto) — leídos los tres de
``/proc/<pid>/stat``, exactamente como ``wait-jobs.sh`` ya los lee para su
propio ledger.

``stopped`` es un QUINTO valor que el binario no declara — lo exige el
consumidor: ``wait-jobs.sh::class()`` distingue ``DETENIDO`` (estado ``T``,
SIGSTOP: se reactiva con ``continue`` o se mata) de ``ZOMBIE`` (estado ``Z``:
ya terminó, sólo falta soltarlo con ``kill``). Colapsarlos perdería esa
distinción operativa, que es la razón de ser de la columna en el ledger real.

Qué se inyecta (DEC-04)
------------------------

El consumidor aporta:

- ``read_state``/``read_start`` — cómo leer el ESTADO y el ``starttime`` de un
  PID dado. El valor por defecto (``read_process_state``/``read_proc_start``)
  lee ``/proc/<pid>/stat`` de este mismo sistema; un consumidor que sondee otro
  host o simule un roster inyecta los suyos, igual que ``job_liveness`` inyecta
  ``read_shape``.
- ``recorded_proc_start`` — el ``starttime`` que el ledger anotó AL REGISTRAR
  el trabajo (``wait-jobs.sh::cmd_register``, línea ``proc_start=``). Sin él no
  hay con qué comparar, y la comparación NO se hace — no se lee como
  discrepancia; se lee como "no hay dato para desempatar" (ver ``diagnose``).
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

#: El veredicto — cinco valores nombrados por su causa, nunca un booleano.
#: Los primeros cuatro son ``dead_pid``/``procstart_mismatch``/``zombie``/
#: ``live`` del binario (``dbt``, ver el docstring del módulo); ``stopped`` es
#: el quinto, propio de este roster (ver arriba, "Qué se inyecta").
#:
#: - ``dead_pid``            — el PID ya no existe. No hay nada más que leer.
#: - ``procstart_mismatch``  — el PID existe, pero su ``starttime`` no
#:   coincide con el registrado: es OTRO proceso que heredó el número.
#: - ``zombie``               — el PID es el nuestro (o no se pudo desmentir)
#:   y su estado es ``Z``: terminó, nadie lo cosechó.
#: - ``stopped``              — estado ``T``: detenido por señal, no avanza
#:   solo.
#: - ``live``                 — el PID es el nuestro y sigue corriendo.
VERDICTS = ("dead_pid", "procstart_mismatch", "zombie", "stopped", "live")


class UnreadableProcessError(OSError):
    """La lectura de ``/proc/<pid>/stat`` falló por algo que NO es "no existe".

    Un pid ausente devuelve ``None`` desde ``read_process_state``/
    ``read_proc_start`` (ver sus docstrings) y ESO se traduce en el veredicto
    legítimo ``dead_pid`` — no es un fallo del instrumento, es la respuesta.
    Esta clase es para el otro caso: el lector INYECTADO lanza (permiso
    denegado, un simulacro de prueba que fuerza el fallo) y ese fallo no puede
    leerse en silencio como "vivo" ni colarse en ``VERDICTS`` — es la misma
    cuarentena que ``UnreadableEntryError`` de ``job_liveness`` separa de
    ``shape="pending"``, aplicada aquí al sondeo por PID.
    """

    def __init__(self, pid: int, reason: str) -> None:
        self.pid = pid
        self.reason = reason
        super().__init__(f"pid {pid}: {reason}")


@dataclass(frozen=True)
class Diagnosis:
    """El veredicto de UN pid, con su procedencia adjunta.

    ``from_procstart`` es el ``from_marker`` de ``job_liveness`` trasladado al
    discriminador fuerte de este módulo: ``True`` sólo cuando la comparación de
    ``starttime`` fue lo que decidió el veredicto (``procstart_mismatch``).
    En los otros cuatro casos la decisión la tomó la existencia o el estado del
    proceso — la señal más débil, la que un PID reciclado puede falsificar —,
    así que ``from_procstart`` queda en ``False``.
    """

    verdict: str
    from_procstart: bool


def _remainder_fields(stat_text: str) -> list[str] | None:
    """Los campos de ``/proc/<pid>/stat`` DESPUÉS de ``pid (comm) ``.

    El nombre del ejecutable va entre paréntesis y puede traer espacios y
    paréntesis propios (``mi (raro) prog``), así que el corte se hace por el
    ÚLTIMO ``') '`` — no el primero — para que los campos numéricos que siguen
    queden alineados. Es la misma aritmética que
    ``kaupamex-docs: .claude/scripts/session/wait-jobs.sh::read_proc_start``
    (``${stat##*') '} | awk '{print $20}'``): ``##`` en bash despoja el prefijo
    MÁS LARGO que termine en ``') '``, que es exactamente lo que
    ``rsplit(') ', 1)[-1]`` hace en Python.
    """
    if not stat_text:
        return None
    remainder = stat_text.rsplit(") ", 1)[-1]
    fields = remainder.split()
    return fields or None


def _parse_process_state(stat_text: str) -> str | None:
    """El estado (``R``/``S``/``Z``/``T``/…) — primer campo del remanente."""
    fields = _remainder_fields(stat_text)
    return fields[0] if fields else None


def _parse_proc_start(stat_text: str) -> str | None:
    """El ``starttime`` — campo 22 del ``stat`` completo, campo 20 del
    remanente (los dos primeros campos, ``pid`` y ``comm``, ya se cortaron).
    """
    fields = _remainder_fields(stat_text)
    if fields is None or len(fields) < 20:
        return None
    return fields[19]


def _read_stat(pid: int) -> str | None:
    """Lectura cruda de ``/proc/<pid>/stat``. ``None`` si el pid no existe o
    ``/proc`` no es legible — NO lanza: la ausencia es datos, no un fallo.
    """
    try:
        return Path(f"/proc/{pid}/stat").read_text()
    except OSError:
        return None


def read_process_state(pid: int) -> str | None:
    """El estado del proceso, o ``None`` si el pid no existe (lector default)."""
    stat_text = _read_stat(pid)
    return _parse_process_state(stat_text) if stat_text is not None else None


def read_proc_start(pid: int) -> str | None:
    """El ``starttime`` del proceso, o ``None`` si el pid no existe.

    Lector por defecto que ``diagnose`` inyecta cuando el consumidor no aporta
    el suyo (DEC-04). Análogo a ``wait-jobs.sh::read_proc_start``, mismo
    campo, misma razón para cortar por el ÚLTIMO ``') '`` (ver
    ``_remainder_fields``).
    """
    stat_text = _read_stat(pid)
    return _parse_proc_start(stat_text) if stat_text is not None else None


def diagnose(pid: int,
             recorded_proc_start: str | None = None,
             *,
             read_state: Callable[[int], str | None] = read_process_state,
             read_start: Callable[[int], str | None] = read_proc_start) -> Diagnosis:
    """Combina existencia, ``starttime`` y estado en UN veredicto de 5 valores.

    El orden importa y reproduce el de ``dbt`` (ver el docstring del módulo):

    1. Si ``read_state`` no devuelve nada, el pid no existe — ``dead_pid``, y
       ahí termina: no hay ``starttime`` que comparar ni estado que leer.
    2. Si se aportó ``recorded_proc_start``, se compara contra el
       ``starttime`` actual (vía ``read_start``). Un pid vivo puede ser OTRO
       proceso que heredó el número — ``procstart_mismatch`` — y esto se
       comprueba ANTES de mirar el estado: un pid reciclado en estado ``R``
       (que "parece" vivo) sigue siendo el proceso equivocado.
    3. Si ``recorded_proc_start`` es ``None``, este paso se SALTA por
       completo — ``read_start`` ni se llama. No hay con qué comparar, y
       tratar la ausencia de dato como si fuera una discrepancia sería
       inventar evidencia que no existe (mismo principio que
       ``job_liveness.diagnose`` aplica a un ``shape`` sin marcador).
    4. Con el pid confirmado (o sin nada que lo desmienta), el ESTADO decide
       entre ``zombie`` (``Z``), ``stopped`` (``T``) y ``live`` (cualquier
       otro: ``R``, ``S``, ``D``, …).

    Un ``OSError`` que ``read_state`` o ``read_start`` LANCEN (no que
    devuelvan ``None``) se re-envuelve en ``UnreadableProcessError`` — un
    fallo del lector inyectado no es evidencia de nada y no puede colarse
    como uno de los cinco veredictos.
    """
    try:
        current_state = read_state(pid)
    except OSError as err:
        raise UnreadableProcessError(pid, str(err)) from err

    if current_state is None:
        return Diagnosis(verdict="dead_pid", from_procstart=False)

    if recorded_proc_start is not None:
        try:
            current_start = read_start(pid)
        except OSError as err:
            raise UnreadableProcessError(pid, str(err)) from err
        if current_start != recorded_proc_start:
            return Diagnosis(verdict="procstart_mismatch", from_procstart=True)

    if current_state == "Z":
        return Diagnosis(verdict="zombie", from_procstart=False)
    if current_state == "T":
        return Diagnosis(verdict="stopped", from_procstart=False)
    return Diagnosis(verdict="live", from_procstart=False)


def is_alive(diagnosis: Diagnosis) -> bool:
    """El resumen booleano — análogo a ``S6e`` encima de ``dbt``.

    Sólo ``"live"`` cuenta como vivo. ``dead_pid``, ``procstart_mismatch``,
    ``zombie`` y ``stopped`` no van a escribir su marcador nunca por sí
    solos — afirmar lo contrario sería el mismo sobre-reclamo que
    ``react-verification-gate.md`` prohíbe para cualquier otra afirmación de
    estado.
    """
    return diagnosis.verdict == "live"
