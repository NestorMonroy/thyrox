"""Pruebas de ``session.process_ownership`` contra procesos reales.

Un ítem del pool corre en su propia sesión (``setsid``), y la sesión es la
frontera de propiedad: GNU ``timeout`` pone al ejecutor en un grupo de
procesos nuevo, así que el grupo no alcanza a todos, pero la sesión sí. Lo que
el módulo tiene que garantizar es que, al terminar el drenaje, no queda ningún
proceso de la sesión.

Controles de anulación
----------------------
- ``session_members`` con ``by_session=False`` mide el grupo de procesos en
  vez de la sesión: tiene que caer exactamente el caso del nieto que cambió de
  grupo, que es la forma real en que ``timeout`` escapa.
- ``drain_session`` con ``terminate=False`` sólo espera: tiene que caer
  exactamente el caso del superviviente que no sale solo.
"""
from __future__ import annotations

import os
import signal
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session.process_ownership import drain_session, session_members  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def leader_with_descendant(descendant_script: str) -> tuple[subprocess.Popen, int]:
    """Un líder de sesión que deja un descendiente vivo y sale.

    El líder imprime el pid del descendiente y termina; el descendiente queda
    en la sesión del líder. Devuelve el proceso líder y el pid del
    descendiente.
    """
    # El líder espera el ``ready`` del descendiente —impreso cuando ya instaló
    # su manejador o cambió de grupo— antes de anunciar su pid: sin esa
    # barrera, la prueba mediría al descendiente antes de que haga lo que el
    # caso quiere observar.
    leader_script = (
        "import subprocess, sys\n"
        f"child = subprocess.Popen([sys.executable, '-c', {descendant_script!r}],"
        " stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)\n"
        "assert child.stdout.readline().strip() == 'ready'\n"
        "print(child.pid, flush=True)\n"
    )
    leader = subprocess.Popen([sys.executable, "-c", leader_script], stdout=subprocess.PIPE,
                              text=True, start_new_session=True)
    assert leader.stdout is not None
    descendant = int(leader.stdout.readline().strip())
    leader.wait(timeout=10)
    return leader, descendant


def alive(pid: int) -> bool:
    try:
        state = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[0]
    except OSError:
        return False
    return state != "Z"


WAITS_FOR_SIGNAL = "import signal, time\nsignal.signal(signal.SIGTERM, signal.SIG_DFL)\nprint('ready', flush=True)\ntime.sleep(3600)\n"
IGNORES_TERM = "import signal, time\nsignal.signal(signal.SIGTERM, signal.SIG_IGN)\nprint('ready', flush=True)\ntime.sleep(3600)\n"
CHANGES_GROUP = "import os, time\nos.setpgid(0, 0)\nprint('ready', flush=True)\ntime.sleep(3600)\n"

print("caso 1: un descendiente sobrevive al líder y se le ve por la sesión")
leader, descendant = leader_with_descendant(WAITS_FOR_SIGNAL)
check("el descendiente es miembro de la sesión", [descendant], session_members(leader.pid))
report = drain_session(leader.pid, grace_seconds=0.2)
check("el drenaje lo terminó", [descendant], report.terminated)
check("no queda nadie en la sesión", [], session_members(leader.pid))
check("el descendiente ya no vive", False, alive(descendant))

print("caso 2: un descendiente que cambió de grupo sigue en la sesión")
leader, descendant = leader_with_descendant(CHANGES_GROUP)
check("se ve por la sesión", [descendant], session_members(leader.pid))
check("anulado: por grupo no se ve (control)", [], session_members(leader.pid, by_session=False))
drain_session(leader.pid, grace_seconds=0.2)
check("el drenaje lo alcanzó", False, alive(descendant))

print("caso 3: un descendiente que ignora TERM recibe KILL")
leader, descendant = leader_with_descendant(IGNORES_TERM)
report = drain_session(leader.pid, grace_seconds=0.2, kill_after_seconds=0.5)
check("recibió KILL", [descendant], report.killed)
check("no queda nadie", [], report.remaining)
leader, descendant = leader_with_descendant(WAITS_FOR_SIGNAL)
report = drain_session(leader.pid, grace_seconds=0.2, terminate=False)
check("sin terminar, el superviviente queda declarado", [descendant], report.remaining)
os.kill(descendant, signal.SIGKILL)

print("caso 4: una sesión que ya está vacía drena sin tocar nada")
quick = subprocess.Popen([sys.executable, "-c", "pass"], start_new_session=True)
quick.wait(timeout=10)
report = drain_session(quick.pid, grace_seconds=0.2)
check("salió sola", True, report.drained_naturally)
check("nadie terminado", [], report.terminated)

print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
