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
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from session.background import pid_is_alive  # noqa: E402

#: El marcador que el envoltorio de ``background.spawn_detached`` escribe.
MARKER_PATTERN = r"^EXIT=[0-9]+"

#: Segundos entre sondeos. Es politica del consumidor, no del mecanismo.
DEFAULT_INTERVAL = 2

#: El plazo por defecto. Un plazo largo convierte un ``TIMED_OUT`` en un
#: ``PRESENT`` aparente para quien no lo mira, asi que se declara.
DEFAULT_TIMEOUT = 1800

PRESENT = 0
BAILED = 2
TIMED_OUT = 3


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


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="marker_wait",
        description="Esperar el marcador terminal de un trabajo; abortar con el error real.",
    )
    parser.add_argument("log", help="el archivo de log del trabajo")
    parser.add_argument("--pid", type=int, default=None, help="pid del trabajo (decide BAIL vs TIMEOUT)")
    parser.add_argument("--pattern", default=MARKER_PATTERN, help="expresion del marcador")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="plazo en segundos")
    parser.add_argument("--interval", type=float, default=DEFAULT_INTERVAL, help="segundos entre sondeos")
    args = parser.parse_args(argv)

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
