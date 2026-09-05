"""Diagnosticar si una entrada del roster sigue viva — sin sondear un PID.

Adaptación de ``probeDaemonJob``/``dbt``/``S6e`` del cliente Claude Code
(``kaupamex-docs:
source/gestion/pm/docs/iniciativas/actualizar-agentic-ai-thyrox/
analisis-roster-de-trabajos-en-el-binario.rst``, build 2.1.261). El binario
resuelve la vivacidad de un trabajo con un veredicto de cuatro valores por
causa (``dead_pid``/``procstart_mismatch``/``zombie``/``live``), la procedencia
del veredicto viajando con él, una holgura de reloj declarada aparte del
umbral de vejez, y un vacío-corrupto que no se confunde con un vacío legítimo.

Lo que NO viaja, con su razón
------------------------------

La vía del daemon y el sondeo por PID. Nuestros trabajos —subagentes y tareas
de ``Bash(run_in_background)``— **no son procesos**: no hay PID que sondear ni
daemon al que preguntar (``kaupamex-docs:
.claude/scripts/agents/reconciliar-agentes.sh:73-74``). Se porta la FORMA —el
veredicto por causa, la procedencia, la holgura, la cuarentena— no el sustrato
que la produce allá.

Qué viaja, adaptado a un roster de archivos
---------------------------------------------

En vez de un PID, la señal es el **contenido** de la entrada (¿terminó con su
reporte final, o quedó cortada a media frase?) combinado con su **antigüedad**
(``mtime``). El binario tiene un solo instrumento que puede fallar (leer
``roster.json``); aquí cada entrada individual puede fallar por separado —un
symlink roto, un contenido no parseable— y ESO es lo que la cuarentena de esta
regla cubre: no se descarta en silencio como si fuera "sin marcador", se separa
con su razón (``UnreadableEntryError``) en vez de contaminar el diagnóstico.

Qué se inyecta (DEC-04)
------------------------

El consumidor aporta:

- ``read_shape`` — cómo leer el contenido de UNA entrada y decidir si terminó,
  si quedó cortada, o si no hay marcador. Es sustrato: un subagente se lee
  como JSONL y una tarea de ``Bash`` se lee con ``tail``/grep de su marcador
  ``EXIT=``; ninguna de las dos formas vive aquí.
- ``stale_after``/``clock_skew`` en ``diagnose`` — los umbrales tienen un
  valor por defecto (los medidos en el binario), pero el consumidor puede
  imponer los suyos.
- ``entries``/``now`` en ``sweep`` — de dónde salen las entradas del roster y
  qué hora rige la medición son decisión de quien llama, nunca de este módulo.
"""
from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

#: Los tres estados de CONTENIDO que una entrada puede declarar. "unreadable"
#: NO está aquí a propósito: no es un contenido que ``read_shape`` devuelva,
#: es un fallo que ``read_shape`` LANZA (``UnreadableEntryError``) — así el
#: vocabulario de retorno normal no puede, por descuido, incluir la cuarentena.
SHAPES = ("terminated", "cut", "pending")

#: El veredicto — cuatro valores nombrados por su causa, nunca un booleano.
#: Análogo a ``dead_pid``/``procstart_mismatch``/``zombie``/``live`` del
#: binario, pero con causas propias de un roster sin PID:
#:
#: - ``terminated``      — el contenido ya declara el cierre (shape="terminated").
#: - ``recent``           — sin marcador de cierre, pero dentro de la ventana
#:   de vejez + holgura de reloj: pudo seguir escribiendo hace un instante.
#: - ``stalled_evident``  — fuera de la ventana Y el contenido muestra un corte
#:   (shape="cut"): evidencia POSITIVA, no sólo ausencia.
#: - ``stalled_unknown``  — fuera de la ventana y sin marcador ninguno
#:   (shape="pending"): la ausencia de evidencia NO es evidencia de nada.
VERDICTS = ("terminated", "recent", "stalled_evident", "stalled_unknown")

#: Segundos a partir de los cuales una entrada sin marcador de cierre se
#: considera vieja. Análogo a ``STALE_THRESHOLD_MS`` (120000 en el binario);
#: aquí el valor por defecto es el de ``reconciliar-agentes.sh`` (``WINDOW_
#: SECONDS``, "ciclo largo del loop" = 900s), overridable por el consumidor.
STALE_THRESHOLD_SECONDS = 900

#: Holgura de reloj entre quien escribe la entrada y quien la mide — SEPARADA
#: del umbral de vejez, nunca sumada a él en silencio. Análogo a
#: ``CLOCK_SKEW_ALLOWANCE_MS`` (60000 en el binario). Sin esta constante propia
#: un desfase de reloj entre contenedores se lee como falta de avance, que es
#: exactamente la ceguera que ``reconciliar-agentes.sh`` tiene hoy (no la
#: declara en absoluto).
CLOCK_SKEW_SECONDS = 60


class UnknownShapeError(ValueError):
    """``read_shape`` devolvió algo fuera del vocabulario declarado en ``SHAPES``."""


class UnreadableEntryError(OSError):
    """El contenido de una entrada no se pudo leer.

    NO es lo mismo que ``shape="pending"`` (contenido leído, sin marcador). Es
    el vacío-con-bandera del binario (``parseFailed: true``) aplicado a UNA
    entrada: un symlink roto, un JSON truncado, un archivo sin permiso de
    lectura. Tratarlo como "pending" —lo que ``reconciliar-agentes.sh``
    ``terminal_shape()`` hace hoy con un symlink de destino perdido, que
    devuelve el mismo ``sin-marcador`` que un archivo vacío— es la ceguera que
    esta clase existe para cerrar: la razón del fallo (``reason``) es el
    "código de error" que viaja con la cuarentena.
    """

    def __init__(self, entry: Path, reason: str) -> None:
        self.entry = entry
        self.reason = reason
        super().__init__(f"{entry}: {reason}")


@dataclass(frozen=True)
class Diagnosis:
    """El veredicto de UNA entrada, con su procedencia adjunta.

    ``from_marker`` es el ``daemonUp`` de este módulo: dice si el CONTENIDO
    (la señal fuerte) decidió el veredicto, o si sólo la antigüedad del
    archivo lo hizo (la señal débil, heurística). Quien lee el veredicto sabe
    sin adivinar cuál de las dos instrumentó la respuesta — ``ORIGEN_ROSTER``
    en ``reconciliar-agentes.sh`` describe la RUTA del roster, nunca esto.
    """

    verdict: str
    from_marker: bool


def diagnose(shape: str,
             age_seconds: float,
             *,
             stale_after: float = STALE_THRESHOLD_SECONDS,
             clock_skew: float = CLOCK_SKEW_SECONDS) -> Diagnosis:
    """Combina el contenido (``shape``) y la antigüedad en UN veredicto.

    El orden importa y reproduce el del guion que se adapta:

    1. Si el contenido ya declara el cierre, ESE es el veredicto — la
       antigüedad no lo cambia (un archivo terminado hace una hora sigue
       terminado).
    2. Si no, y la antigüedad cabe dentro de ``stale_after + clock_skew``,
       el veredicto es ``"recent"`` — sin importar si el contenido lucía
       cortado: un ``shape="cut"`` a media escritura es indistinguible de
       una escritura en curso, y confundirlos declararía muerto a un trabajo
       vivo.
    3. Sólo cuando la antigüedad excede esa suma se pregunta qué decía el
       contenido: ``"cut"`` es evidencia positiva (``stalled_evident``);
       ``"pending"`` es sólo ausencia de evidencia (``stalled_unknown``), y
       las dos NO se colapsan en una — es el eje que separa "seguro relanzar"
       de "no se puede confirmar" en ``reconciliar-agentes.sh``.
    """
    if shape not in SHAPES:
        raise UnknownShapeError(shape)
    if shape == "terminated":
        return Diagnosis(verdict="terminated", from_marker=True)
    if age_seconds <= stale_after + clock_skew:
        return Diagnosis(verdict="recent", from_marker=False)
    if shape == "cut":
        return Diagnosis(verdict="stalled_evident", from_marker=True)
    return Diagnosis(verdict="stalled_unknown", from_marker=False)


def is_alive(diagnosis: Diagnosis) -> bool:
    """El resumen booleano — análogo a ``S6e`` encima de ``dbt``.

    Sólo ``"recent"`` cuenta como vivo. ``"stalled_unknown"`` NO lo es: la
    ausencia de evidencia de muerte no es evidencia de vida, y afirmar lo
    contrario aquí sería el mismo sobre-reclamo que
    ``react-verification-gate.md`` prohíbe para cualquier otra afirmación de
    estado.
    """
    return diagnosis.verdict == "recent"


@dataclass(frozen=True)
class SweepResult:
    """Lo que un barrido del roster produjo — diagnósticos y cuarentena aparte.

    Las dos listas son disjuntas por construcción: una entrada aparece en
    ``diagnoses`` O en ``quarantined``, nunca en las dos ni en ninguna.
    """

    diagnoses: Mapping[str, Diagnosis]
    quarantined: Mapping[str, str]


def sweep(entries: Sequence[Path],
          read_shape: Callable[[Path], str],
          *,
          now: float,
          stale_after: float = STALE_THRESHOLD_SECONDS,
          clock_skew: float = CLOCK_SKEW_SECONDS) -> SweepResult:
    """Diagnostica cada entrada; separa las ilegibles en cuarentena.

    Una lista de entradas VACÍA no rehúsa —a diferencia de
    ``repo.pending_work.sweep([])``—: aquí el vacío es un estado legítimo y
    frecuente (ningún trabajo en curso ahora mismo), no una lista de
    configuración que alguien olvidó llenar. Confundir los dos casos sería
    aplicar la forma de un primitivo a un dominio donde la premisa que la
    sostiene —"cero configurado y cero con trabajo publican el mismo vacío"—
    no aplica: aquí "cero entradas" no es ambiguo, sólo describe un roster
    tranquilo.

    Antes de leer el contenido de una entrada, se lee su ``mtime`` con
    ``Path.stat()`` (sigue symlinks, a diferencia de ``Path.lstat()``) — es
    el ``stat -L`` que ``reconciliar-agentes.sh`` adoptó tras H-DOCS-1004
    (seis agentes vivos leídos como "atascados" por medir el enlace y no su
    destino). Si el ``stat`` falla —symlink roto, entrada borrada a mitad del
    barrido— la entrada se pone en cuarentena ANTES de intentar leer su
    contenido: sin ``mtime`` no hay antigüedad que combinar, así que seguir
    leyendo el contenido no serviría de nada.
    """
    diagnoses: dict[str, Diagnosis] = {}
    quarantined: dict[str, str] = {}
    for entry in entries:
        try:
            mtime = entry.stat().st_mtime
        except OSError as err:
            quarantined[entry.name] = f"no se pudo leer su antigüedad: {err}"
            continue
        try:
            shape = read_shape(entry)
        except UnreadableEntryError as err:
            quarantined[entry.name] = err.reason
            continue
        diagnoses[entry.name] = diagnose(
            shape, now - mtime, stale_after=stale_after, clock_skew=clock_skew)
    return SweepResult(diagnoses=diagnoses, quarantined=quarantined)
