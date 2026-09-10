"""Lanzar un proceso hijo con plazo, sin dejarlo corriendo al agotarlo.

Extraído de ``hooks.maintenance_chain`` cuando apareció el segundo consumidor
(``hooks.stop_gate``). Es el mismo criterio con que ``is_reentry`` salió a
``hooks.stop_payload``: la tercera copia de un mecanismo delicado es la que
diverge en silencio, y ésta lo es por partida doble —el grupo de procesos y la
escalera de señales—.

Por qué NO basta ``subprocess.run(..., timeout=)``
--------------------------------------------------

``run`` con ``timeout=`` manda **SIGKILL al proceso que se lanzó**, y sólo a
él. Si ese proceso es un shell que forkeó —y los motores de los dos consumidores
son guiones de shell— el hijo **sobrevive**: quien llama reporta «agotado»
mientras el trabajo sigue tocando la base. Es un informe falso, y de los caros:
el fenómeno que se reporta y el que ocurre son distintos.

Por eso el hijo arranca en su propia sesión (``start_new_session=True``) y se
señala al **grupo**. Sin grupo propio, un ``killpg`` alcanzaría también a quien
invoca.

La escalera TERM→KILL es una divergencia declarada frente a ``subprocess``:
recupera la señal que ``timeout(1)`` manda por defecto, y con ella el cierre
ordenado del hijo —cerrar una transacción, soltar un lock— que un SIGKILL
directo le niega.

Por qué se cosecha al hijo incluso cuando ya murió
---------------------------------------------------

``os.killpg`` lanza ``ProcessLookupError`` cuando el grupo ya no existe. Salir
ahí sin un ``communicate()`` final deja al hijo **zombi**: terminó, y nadie leyó
su estado. En un hook que corre una vez por turno el zombi se lo lleva el
intérprete al salir; en un proceso de vida larga, no. La cosecha es barata y la
diferencia sólo se nota tarde.
"""
from __future__ import annotations

import os
import signal
import subprocess
from dataclasses import dataclass

#: Segundos que se le conceden al grupo entre SIGTERM y SIGKILL, y de nuevo
#: entre el SIGKILL y darlo por perdido.
GRACE_SECONDS = 2

#: Código sintético del hijo que agotó su plazo. No lo emitió el hijo — el
#: campo ``timed_out`` es el que discrimina, no este número.
TIMEOUT_EXIT = 124

#: Código sintético del hijo que nunca arrancó (binario ausente, sin permiso).
NOT_FOUND_EXIT = 127


@dataclass
class Completed:
    """El desenlace de un hijo: su código, sus dos flujos y por qué terminó."""

    exit_code: int
    stdout: str
    stderr: str
    #: Agotó su plazo y se le mató el grupo.
    timed_out: bool = False
    #: Llegó a arrancar. En ``False``, ``exit_code`` es sintético.
    started: bool = True

    def both(self) -> str:
        """Los dos flujos fundidos, como haría un ``2>&1`` en el shell.

        Se ofrece porque hay consumidores que **sí** lo quieren así —el motivo
        de un bloqueo suele leerse mejor con el aviso del motor incluido— pero
        NO es el default: fundirlos para **decidir** hace que un no-cero con
        stdout vacío y un aviso en stderr se lea como incumplimiento. Quien
        decide elige el flujo; quien redacta el motivo puede querer los dos.
        """
        return (self.stdout + self.stderr).strip()


def run_guarded(command: list[str], timeout: int) -> Completed:
    """Corre ``command`` con plazo. NUNCA lanza: devuelve el desenlace."""
    try:
        proc = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
    except OSError as err:
        return Completed(NOT_FOUND_EXIT, "", str(err), started=False)

    try:
        stdout, stderr = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        kill_group(proc)
        return Completed(TIMEOUT_EXIT, "", "", timed_out=True)
    return Completed(proc.returncode, stdout or "", stderr or "")


def kill_group(proc: subprocess.Popen) -> None:
    """Termina el grupo entero: SIGTERM, gracia, SIGKILL — y cosecha al hijo."""
    for number, wait in ((signal.SIGTERM, GRACE_SECONDS),
                         (signal.SIGKILL, GRACE_SECONDS)):
        try:
            os.killpg(os.getpgid(proc.pid), number)
        except (ProcessLookupError, PermissionError):
            _reap(proc)
            return
        try:
            proc.communicate(timeout=wait)
            return
        except subprocess.TimeoutExpired:
            continue


def _reap(proc: subprocess.Popen) -> None:
    """Lee el estado de un hijo que ya no está, para no dejarlo zombi."""
    try:
        proc.communicate(timeout=GRACE_SECONDS)
    except (subprocess.TimeoutExpired, ValueError, OSError):
        pass
