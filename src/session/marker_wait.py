"""La espera de un marcador terminal — y el ABORTO con el error real.

Por que existe
--------------
El patron de espera mas barato no tiene guarda de muerte::

    until grep -qE "^EXIT=" "$LOG"; do sleep 2; done && tail -5 "$LOG"

Si el trabajo revienta antes de escribir su marcador —OOM, ``set -e`` en una
linea temprana, un ``kill``— el bucle gira hasta el timeout. El costo no es la
espera: es **que se aprende al final**. Un timeout no distingue «murio», «sigue
corriendo» y «el marcador nunca iba a llegar»; las tres se ven igual.

El mecanismo viene de ``ccb: bgDaemon.ts:462-469`` (``respawn_unconfirmed_bail``):
cuando el trabajo termina antes de confirmar que arranco, quien espera recibe
**el error real**, no un timeout.

Procedencia del porte
---------------------
Adaptado de ``thyrox: src/session/esperar-marcador.sh`` (retirado en este mismo
pase). Se conservan los tres codigos de salida y las siete conductas que su
suite medía; se traducen los identificadores al ingles y la bandera ``--patron``
pasa a ``--pattern``, que es lo que ``identificadores-en-ingles.md`` exige y que
aqui no rompe a nadie: medido antes de renombrar, el guion tenia **cero
invocadores vivos** — sus dos menciones en el arbol son prosa de comentario.

Las TRES salidas, que no son dos
---------------------------------
``PRESENT`` (0) el marcador aparecio · ``BAILED`` (2) el trabajo murio sin
escribirlo · ``TIMED_OUT`` (3) vencio el plazo y **no se pudo decidir por que**.
Colapsar 2 y 3 en «no salio bien» borra justo la distincion que el mecanismo
existe para producir.

Sin ``pid`` solo se puede esperar, y el resultado lo **dice** en vez de fingir
que decidio.

La sonda de vivacidad es un PARAMETRO, y por que
-------------------------------------------------
``is_alive`` se inyecta, con ``background.pid_is_alive`` por defecto: lee
``/proc/<pid>/stat`` y trata el estado ``Z`` como muerto, dejando ``kill -0``
como respaldo donde no haya ``/proc``.

**No se afirma que la version en shell fallara aqui.** Medido el 2026-09-06 en
este contenedor sobre tres formas —hijo directo, nieto huerfano y trabajo que
escribe al morir— ``esperar-marcador.sh`` con ``kill -0`` pelado devolvio el
codigo correcto en las tres: el huerfano fue cosechado y ``kill -0`` acerto. La
sonda de ``/proc`` viaja como endurecimiento cuya justificacion es el episodio
**medido en** ``background.py`` (un pool que giro sin salida contra un zombi),
no un fallo reproducido de este sujeto. Declararlo al reves seria vender como
correccion lo que es prevencion.

La carrera que el mecanismo SI tiene que atrapar
-------------------------------------------------
Un trabajo puede escribir el marcador y morir entre las dos comprobaciones. Sin
re-mirar el log despues de ver el proceso muerto, la espera declara ``BAILED``
sobre un trabajo que **termino bien**. Esa es la unica conducta con control de
anulacion real en la suite: al retirar la re-comprobacion cae exactamente ese
caso y ninguno mas.
"""

from __future__ import annotations

import argparse
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional


from session.background import pid_is_alive  # noqa: E402

#: Las DOS formas de marcador que esta familia escribe, y es una sola
#: alternancia a proposito.
#:
#: ``background.spawn_detached`` y el patron a mano de
#: ``long-running-commands.md`` R-2.0 escriben ``EXIT=``; ``bg.sh`` escribe
#: ``__BG_EXIT__=`` (su ``_MARK``). Hasta TASK-THYROX-0162 este modulo veia
#: solo la primera, asi que la composicion mas natural de la familia —lanzar
#: con ``thyrox-bg`` y esperar aqui— giraba hasta el plazo entero.
#:
#: Y el plazo MIENTE cuando eso pasa: ``TIMED_OUT`` significa «sigue vivo», y
#: el trabajo habia terminado. El instrumento no distinguia «no termino» de
#: «termino con el otro marcador» — la ceguera que
#: ``evidencia-antes-de-afirmar.md`` describe, con la propia espera de sujeto.
#: Medido: ocho minutos girando sobre un log que ya tenia su ``__BG_EXIT__=0``.
#:
#: Lo que NO se ensancho: sigue anclado a inicio de renglon y sigue exigiendo
#: al menos un digito. Un ``EXIT=`` pelado, o un ``EXIT=0`` en mitad de una
#: frase, NO son marcadores — si lo fueran, la espera declararia terminado un
#: trabajo que solo menciono la palabra.
MARKER_PATTERN = r"^(?:__BG_EXIT__|EXIT)=[0-9]+"

#: Segundos entre sondeos. Es politica del consumidor, no del mecanismo.
DEFAULT_INTERVAL = 2

#: El plazo por defecto. Un plazo largo convierte un ``TIMED_OUT`` en un
#: ``PRESENT`` aparente para quien no lo mira, asi que se declara.
DEFAULT_TIMEOUT = 1800

PRESENT = 0
BAILED = 2
TIMED_OUT = 3

#: Las salidas de la espera por PID (``wait_for_pid``), que es el OTRO eje.
#:
#: Comparten numero con las de arriba a proposito: quien las lee desde un guion
#: ya trata 0 como «siguio bien», 2 como «no hay resultado que recoger» y 3 como
#: «no termino». Lo que NO comparten es significado, y por eso llevan nombre
#: propio: ``BAILED`` afirma que el trabajo MURIO sin escribir su marcador —una
#: afirmacion sobre el trabajo—, mientras ``UNDECIDABLE`` afirma que no se puede
#: saber nada —una afirmacion sobre el instrumento—.
ENDED = 0
UNDECIDABLE = 2


@dataclass
class MarkerWaitResult:
    """El veredicto, su cola de log y por que se emitio."""

    code: int
    tail: str
    reason: str

    @property
    def present(self) -> bool:
        return self.code == PRESENT


def _tail(log: Path, lines: int) -> str:
    try:
        return "\n".join(log.read_text(errors="replace").splitlines()[-lines:])
    except OSError:
        return ""


def _has_marker(log: Path, pattern: "re.Pattern[str]") -> bool:
    """El marcador se busca sobre el ARCHIVO, nunca por tuberia.

    ``grep -q`` cierra la tuberia al primer acierto y bajo ``pipefail`` el
    pipeline sale 141 aunque el patron haya coincidido. Leyendo el archivo no
    hay productor al que matar — y en Python el riesgo no existe, pero la razon
    se conserva porque explica por que NO se compone con un pipe.
    """
    try:
        return any(pattern.search(linea) for linea in log.read_text(errors="replace").splitlines())
    except OSError:
        return False


def wait_for_marker(
    log: Path | str,
    *,
    pid: Optional[int] = None,
    pattern: str = MARKER_PATTERN,
    timeout: float = DEFAULT_TIMEOUT,
    interval: float = DEFAULT_INTERVAL,
    is_alive: Callable[[int], bool] = pid_is_alive,
    recheck_after_death: bool = True,
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> MarkerWaitResult:
    """Esperar el marcador; abortar con el error real si el trabajo muere.

    ``recheck_after_death`` existe para poder ANULARLO en la suite: con ``False``
    se retira la guarda de carrera y tiene que caer exactamente el caso del
    trabajo que escribe al morir. Un control que no puede fallar no mide nada.
    """
    ruta = Path(log)
    compilado = re.compile(pattern)
    inicio = clock()

    while True:
        if _has_marker(ruta, compilado):
            return MarkerWaitResult(PRESENT, _tail(ruta, 5), "marcador presente")

        if pid is not None and not is_alive(pid):
            if recheck_after_death:
                # La carrera: escribir el marcador y morir entre las dos
                # comprobaciones. Se vuelve a mirar antes de declarar el BAIL.
                sleep(1)
                if _has_marker(ruta, compilado):
                    return MarkerWaitResult(
                        PRESENT, _tail(ruta, 5), "marcador presente (escrito al salir)"
                    )
            cola = _tail(ruta, 15)
            razon = (
                f"BAIL — el proceso {pid} ya no corre y el log no tiene "
                f"'{pattern}'. El trabajo murio sin escribir su marcador. Esto "
                f"NO es un timeout: es el error real, disponible ahora y no en "
                f"{timeout:g}s."
            )
            if not cola.strip():
                razon += " El log esta vacio — murio antes de emitir nada."
            return MarkerWaitResult(BAILED, cola, razon)

        if clock() - inicio >= timeout:
            if pid is None:
                razon = (
                    f"TIMEOUT — {timeout:g}s sin '{pattern}' en {ruta}. Sin pid no "
                    f"se puede distinguir 'sigue corriendo' de 'murio callado'. "
                    f"Repetir la espera con pid lo decide."
                )
            else:
                razon = (
                    f"TIMEOUT — {timeout:g}s sin '{pattern}' en {ruta}. El proceso "
                    f"{pid} sigue vivo: el trabajo no termino."
                )
            return MarkerWaitResult(TIMED_OUT, _tail(ruta, 5), razon)

        sleep(interval)


@dataclass
class PidWaitResult:
    """El veredicto de una espera por PID y por que se emitio.

    No lleva ``tail``: un proceso ajeno no tiene log nuestro que leer. Ese es
    justo el motivo de que este eje exista aparte y no como una bandera de
    ``wait_for_marker``.
    """

    code: int
    reason: str

    @property
    def ended(self) -> bool:
        return self.code == ENDED


def wait_for_pid(
    pid: int,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    interval: float = DEFAULT_INTERVAL,
    is_alive: Callable[[int], bool] = pid_is_alive,
    require_alive_at_start: bool = True,
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> PidWaitResult:
    """Esperar a que un proceso AJENO deje de correr, observando su pid.

    Es el eje que ``wait_for_marker`` no cubre. Aquella exige un ``log`` y un
    marcador porque su sujeto es un trabajo que nosotros lanzamos; un proceso
    ajeno —o uno que el cliente promovio a segundo plano despues de fijar su
    linea de comando— no tiene ninguno de los dos que enganchar.

    Sin esta forma sancionada, la mano alcanza el ``until ! pgrep -f <literal>``,
    y ese bucle **se casa a si mismo**: ``pgrep -f`` compara contra la linea de
    comando COMPLETA, asi que la del propio bucle, que contiene el literal,
    coincide con el patron y la espera no termina nunca (``H-THYROX-103``). Aqui
    el sujeto es un entero, y un entero no puede aparecer en su propia
    coincidencia.

    ``require_alive_at_start`` existe para poder ANULARLO en la suite: con
    ``False`` un pid que no corre publica ``ENDED``, que es el verde falso que la
    comprobacion inicial impide. Un control que no puede fallar no mide nada.
    """
    start = clock()

    if require_alive_at_start and not is_alive(pid):
        return PidWaitResult(
            UNDECIDABLE,
            f"INDECIDIBLE — el proceso {pid} no corre al arrancar la espera. "
            f"Eso NO es «ya termino»: el sistema reutiliza los pid, asi que un "
            f"pid que no corre puede ser uno que acaba de terminar, uno que "
            f"termino hace dias, o uno que nunca existio. Declararlo terminado "
            f"seria afirmar sobre un trabajo del que no se sabe nada.",
        )

    while True:
        if not is_alive(pid):
            return PidWaitResult(
                ENDED,
                f"TERMINADO — el proceso {pid} dejo de correr tras "
                f"{clock() - start:.1f}s. Su codigo de salida NO se conoce: no "
                f"somos su padre, asi que nadie lo cosecho aqui.",
            )

        if clock() - start >= timeout:
            return PidWaitResult(
                TIMED_OUT,
                f"TIMEOUT — {timeout:g}s y el proceso {pid} sigue vivo. El "
                f"trabajo no termino; repetir la espera con mas plazo, o "
                f"decidir que se abandona.",
            )

        sleep(interval)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="marker_wait",
        description="Esperar el marcador terminal de un trabajo; abortar con el error real.",
    )
    parser.add_argument("log", nargs="?", default=None,
                        help="el archivo de log del trabajo (no aplica con --pid-only)")
    parser.add_argument("--pid", type=int, default=None, help="pid del trabajo (decide BAIL vs TIMEOUT)")
    parser.add_argument("--pid-only", action="store_true",
                        help="esperar a un proceso AJENO por su pid, sin log ni marcador")
    parser.add_argument("--pattern", default=MARKER_PATTERN, help="expresion del marcador")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="plazo en segundos")
    parser.add_argument("--interval", type=float, default=DEFAULT_INTERVAL, help="segundos entre sondeos")
    args = parser.parse_args(argv)

    if args.pid_only:
        # Se rehusa NOMBRANDO lo que falta: el codigo de salida por si solo no
        # discrimina — argparse tambien sale 2 ante cualquier argumento invalido.
        if args.pid is None:
            parser.error("--pid-only exige --pid: sin pid no hay nada que observar")
        if args.log is not None:
            parser.error("--pid-only no admite un log: su sujeto es el proceso, no un archivo")
        pid_result = wait_for_pid(
            args.pid,
            timeout=args.timeout,
            interval=args.interval,
        )
        print(f"== {pid_result.reason} ==")
        return pid_result.code

    if args.log is None:
        parser.error("falta el log del trabajo (o usar --pid-only para un proceso ajeno)")

    resultado = wait_for_marker(
        args.log,
        pid=args.pid,
        pattern=args.pattern,
        timeout=args.timeout,
        interval=args.interval,
    )
    print(f"== {resultado.reason} ==")
    if resultado.tail:
        print(resultado.tail)
    return resultado.code


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
