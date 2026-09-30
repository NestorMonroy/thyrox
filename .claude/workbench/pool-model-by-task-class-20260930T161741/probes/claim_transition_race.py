"""Sonda: `transition` lee el estado, `claim` escribe la generación nueva y
`transition` vuelve a escribir la vieja. Se intercala `claim` exactamente entre
la lectura y la escritura de `transition` para no depender del planificador."""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src"))
from session import pool_lifecycle as lc  # noqa: E402

with tempfile.TemporaryDirectory() as scratch:
    os.environ["THYROX_RUNTIME_DIR"] = str(Path(scratch) / "runtime")
    out = Path(scratch) / "out"
    out.mkdir()
    live = lc.open_run(out, os.getpid(), run_id="race")
    lc.begin(live, out, "1", owner_pid=os.getpid())
    lc.transition(live, "1", lc.ABANDONED_RECOVERABLE)
    old = lc.read_state(live, "1").generation

    real_read = lc.read_state
    fired = False

    def read_then_claim(live_dir, item):
        global fired
        current = real_read(live_dir, item)
        if not fired:
            fired = True
            lc.claim(live_dir, out, item, owner_pid=os.getpid())
        return current

    lc.read_state = read_then_claim
    try:
        lc.transition(live, "1", lc.CLOSING, generation=old)
        verdict = "el dueño viejo NO fue rehusado"
    except lc.StaleGenerationError:
        verdict = "el dueño viejo fue rehusado"
    lc.read_state = real_read
    after = lc.read_state(live, "1")
    print(f"generacion del dueño viejo={old}; {verdict}; estado final={after.state} generacion={after.generation}")

# Control: la misma secuencia, con `claim` ANTES de la lectura de `transition`.
with tempfile.TemporaryDirectory() as scratch:
    os.environ["THYROX_RUNTIME_DIR"] = str(Path(scratch) / "runtime")
    out = Path(scratch) / "out"
    out.mkdir()
    live = lc.open_run(out, os.getpid(), run_id="control")
    lc.begin(live, out, "1", owner_pid=os.getpid())
    lc.transition(live, "1", lc.ABANDONED_RECOVERABLE)
    old = lc.read_state(live, "1").generation
    lc.claim(live, out, "1", owner_pid=os.getpid())
    try:
        lc.transition(live, "1", lc.CLOSING, generation=old)
        verdict = "el dueño viejo NO fue rehusado"
    except lc.StaleGenerationError:
        verdict = "el dueño viejo fue rehusado"
    after = lc.read_state(live, "1")
    print(f"control sin intercalar: {verdict}; estado final={after.state} generacion={after.generation}")
