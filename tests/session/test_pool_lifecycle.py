"""Pruebas de ``session.pool_lifecycle``: estados, generaciones y publicación.

Cada caso crea su salida y su runtime en un directorio temporal, con
``THYROX_RUNTIME_DIR`` apuntando allí para que los candados tampoco toquen el
árbol.

Controles de anulación
----------------------
- Sin la comprobación de generación (``closed_generation`` devolviendo 0), una
  recuperación tardía de la generación 1 pisa a la 2: cae exactamente el caso
  de la generación rancia.
- Sin el plan persistido, una publicación interrumpida no se puede retomar:
  ``reconcile`` tiene que dejarla sin cerrar y no escribir ``<n>.closed``.
- Sin la etapa oculta (``--direct``: cada artefacto va directo a su nombre
  final), una caída a mitad deja la generación anterior cerrada y con
  artefactos que ya no coinciden con su manifiesto.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from session import pool_lifecycle as lc  # noqa: E402

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


def raises(error: type[Exception], call) -> bool:
    try:
        call()
    except error:
        return True
    return False


def state_of(live: Path, item: str) -> lc.ItemState:
    """El estado del ítem; la prueba falla aquí mismo si no lo tiene."""
    state = lc.read_state(live, item)
    assert state is not None, f"el ítem {item} no tiene estado en {live}"
    return state


def run_item(live: Path, out: Path, item: str, contents: dict[str, str]) -> None:
    """Un ítem que arranca, escribe sus artefactos en el runtime y queda RUNNING."""
    lc.begin(live, out, item, owner_pid=os.getpid())
    for name, text in contents.items():
        path = live / f"{item}.{name}"
        if name.endswith("/"):
            path = live / f"{item}.{name.rstrip('/')}"
            path.mkdir()
            (path / "inner.txt").write_text(text)
        else:
            path.write_text(text)


def publish_cli(live: Path, out: Path, item: str, *extra: str) -> int:
    return subprocess.run(
        [sys.executable, str(ROOT / "src/session/pool_lifecycle.py"), "publish", str(live), str(out), item, *extra],
        env={**os.environ, "PYTHONPATH": str(ROOT / "src")}, capture_output=True, text=True).returncode


with tempfile.TemporaryDirectory() as scratch:
    base = Path(scratch)
    os.environ["THYROX_RUNTIME_DIR"] = str(base / "runtime")
    out = base / "out"
    out.mkdir()

    print("caso 1: la máquina de estados rehúsa lo que su tabla no admite")
    live = lc.open_run(out, os.getpid(), run_id="r1")
    lc.begin(live, out, "1", owner_pid=os.getpid())
    check("begin deja el ítem en RUNNING", lc.RUNNING, state_of(live, "1").state)
    check("RUNNING → CLOSED no se admite", True,
          raises(lc.LifecycleError, lambda: lc.transition(live, "1", lc.CLOSED)))
    lc.transition(live, "1", lc.SNAPSHOTTING)
    lc.transition(live, "1", lc.RUNNING)
    check("RUNNING ⇄ SNAPSHOTTING se admite", lc.RUNNING, state_of(live, "1").state)
    check("un segundo begin sobre un ítem vivo se rehúsa", True,
          raises(lc.LifecycleError, lambda: lc.begin(live, out, "1", owner_pid=os.getpid())))

    print("caso 2: mientras corre, la salida no tiene nada del ítem (I1)")
    (live / "1.stream.jsonl").write_text('{"type":"result"}\n')
    (live / "1.err").write_text("")
    (live / "1.jobs").mkdir()
    (live / "1.jobs" / "a.log").write_text("x")
    check("la salida sigue vacía", [], sorted(p.name for p in out.iterdir()))
    check("closed_items no ve el ítem", [], lc.closed_items(out))

    print("caso 3: publicar mueve, verifica y deja <n>.closed al final (I2)")
    manifest = lc.publish(live, out, "1", exit_code=0)
    check("el ítem queda CLOSED", lc.CLOSED, state_of(live, "1").state)
    check("closed_items lo ve", ["1"], lc.closed_items(out))
    check("verify_closed no encuentra discrepancias", [], lc.verify_closed(out, "1"))
    check("el manifiesto lleva la generación 1", 1, manifest["generation"])
    check("el manifiesto enumera los tres artefactos", ["1.err", "1.jobs", "1.stream.jsonl"],
          sorted(manifest["artifacts"]))
    check("el runtime ya no tiene artefactos del ítem", [], lc.item_artifacts(live, "1"))
    check("no queda plan en el runtime", False, (live / "1.plan.json").exists())

    print("caso 4: publicar dos veces es idempotente (prueba 10)")
    again = lc.publish(live, out, "1", exit_code=0)
    check("la segunda publicación devuelve el mismo manifiesto", manifest, again)
    check("la salida sigue coherente", [], lc.verify_closed(out, "1"))

    print("caso 5: un artefacto alterado después de publicar se detecta")
    (out / "1.err").write_text("alterado")
    check("verify_closed nombra el artefacto", ["1.err: sha256 distinto del manifiesto"],
          lc.verify_closed(out, "1"))
    (out / "1.err").write_text("")

    print("caso 6: una generación nueva sucede a la cerrada; una rancia se rehúsa (prueba 7, I4)")
    live_old = lc.open_run(out, os.getpid(), run_id="r2-old")
    run_item(live_old, out, "1", {"stream.jsonl": "old\n"})
    check("la ejecución que arranca sobre gen 1 recibe gen 2", 2, state_of(live_old, "1").generation)
    live_new = lc.open_run(out, os.getpid(), run_id="r3-new")
    # Una segunda ejecución concurrente sobre la misma salida: begin mira la
    # salida, no el runtime ajeno, así que también recibe la 2. Se fuerza la 3
    # para modelar la ejecución posterior que cerró primero.
    run_item(live_new, out, "1", {"stream.jsonl": "new\n"})
    state = state_of(live_new, "1")
    lc.write_state(live_new, lc.ItemState("1", state.state, 3, state.owner_pid))
    lc.publish(live_new, out, "1", exit_code=0)
    check("la salida queda en la generación 3", 3, lc.closed_generation(out, "1"))
    check("publicar la generación 2 después de la 3 se rehúsa", True,
          raises(lc.StaleGenerationError, lambda: lc.publish(live_old, out, "1", exit_code=0)))
    check("la salida sigue siendo la de la generación 3", "new\n", (out / "1.stream.jsonl").read_text())
    check("el runtime rancio se conserva", True, (live_old / "1.stream.jsonl").exists())

    print("caso 6c: control — sin la comprobación de generación, la rancia pisa a la nueva")
    original = lc.closed_generation
    lc.closed_generation = lambda *_: 0  # type: ignore[assignment]
    try:
        lc.publish(live_old, out, "1", exit_code=0)
        check("control: la salida quedó con el contenido rancio", "old\n", (out / "1.stream.jsonl").read_text())
    finally:
        lc.closed_generation = original  # type: ignore[assignment]

    print("caso 7: una caída a mitad de la publicación se retoma (prueba 8, I5)")
    out2 = base / "out2"
    out2.mkdir()
    live7 = lc.open_run(out2, os.getpid(), run_id="r7")
    run_item(live7, out2, "4", {"stream.jsonl": "gen1\n", "err": "e1", "time": "1 2 3 4"})
    lc.publish(live7, out2, "4", exit_code=0)
    live7b = lc.open_run(out2, os.getpid(), run_id="r7b")
    run_item(live7b, out2, "4", {"stream.jsonl": "gen2\n", "err": "e2", "time": "5 6 7 8"})
    rc = publish_cli(live7b, out2, "4", "--exit", "0", "--fail-after-moves", "1")
    check("el publicador murió a mitad (exit 9)", 9, rc)
    check("la generación 1 sigue cerrada y coherente", ([], 1),
          (lc.verify_closed(out2, "4"), lc.closed_generation(out2, "4")))
    check("el ítem quedó en PUBLISHING", lc.PUBLISHING, state_of(live7b, "4").state)
    report = lc.reconcile(base / "runtime" / "pool")
    check("reconcile lo publica", True, "r7b\t4\tpublicado" in report)
    check("tras reconcile, la generación 2 está cerrada y coherente", ([], 2),
          (lc.verify_closed(out2, "4"), lc.closed_generation(out2, "4")))
    check("y su contenido es el de la generación 2", "gen2\n", (out2 / "4.stream.jsonl").read_text())
    check("no quedan artefactos preparados en la salida", [],
          sorted(p.name for p in out2.iterdir() if p.name.startswith(".")))

    print("caso 7c: control — sin plan persistido, la caída no se puede retomar")
    live7c = lc.open_run(out2, os.getpid(), run_id="r7c")
    run_item(live7c, out2, "4", {"stream.jsonl": "gen3\n", "err": "e3"})
    rc = publish_cli(live7c, out2, "4", "--exit", "0", "--fail-after-moves", "1")
    (live7c / "4.plan.json").unlink()
    lc.reconcile(base / "runtime" / "pool")
    check("control: el ítem no se cierra sin plan", 2, lc.closed_generation(out2, "4"))
    check("control: el estado queda sin cerrar", lc.PUBLISHING, state_of(live7c, "4").state)

    print("caso 7d: control — sin la etapa oculta, la caída deja incoherente la generación cerrada")
    out5 = base / "out5"
    out5.mkdir()
    live7d = lc.open_run(out5, os.getpid(), run_id="r7d")
    run_item(live7d, out5, "4", {"stream.jsonl": "gen1\n", "err": "e1", "time": "1 2 3 4"})
    lc.publish(live7d, out5, "4", exit_code=0)
    live7e = lc.open_run(out5, os.getpid(), run_id="r7e")
    run_item(live7e, out5, "4", {"stream.jsonl": "gen2\n", "err": "e2", "time": "5 6 7 8"})
    publish_cli(live7e, out5, "4", "--exit", "0", "--fail-after-moves", "1", "--direct")
    check("control: la generación 1 sigue cerrada pero ya no coincide con su manifiesto", True,
          lc.is_closed(out5, "4") and lc.verify_closed(out5, "4") != [])

    print("caso 8: reconcile declara huérfano al ítem cuyo dueño murió y no borra nada")
    out3 = base / "out3"
    out3.mkdir()
    live8 = lc.open_run(out3, os.getpid(), run_id="r8")
    dead = subprocess.Popen(["true"])
    dead.wait()
    lc.begin(live8, out3, "9", owner_pid=dead.pid)
    (live8 / "9.stream.jsonl").write_text("partial\n")
    lc.begin(live8, out3, "10", owner_pid=os.getpid())
    lc.reconcile(base / "runtime" / "pool")
    check("el ítem sin dueño vivo queda ABANDONED_RECOVERABLE", lc.ABANDONED_RECOVERABLE,
          state_of(live8, "9").state)
    check("su runtime se conserva", "partial\n", (live8 / "9.stream.jsonl").read_text())
    check("el ítem con dueño vivo no cambia", lc.RUNNING, state_of(live8, "10").state)
    check("close-run rehúsa con ítems sin cerrar y conserva el runtime", (["10", "9"], True),
          (lc.close_run(live8, out3), live8.is_dir()))
    check("sin run.closed en la salida", False, (out3 / lc.RUN_CLOSED).exists())

    print("caso 9: close-run publica index/joblog y run.closed al final")
    out4 = base / "out4"
    out4.mkdir()
    live9 = lc.open_run(out4, os.getpid(), run_id="r9")
    (live9 / "index.tsv").write_text("1\ta\n")
    (live9 / "joblog.tsv").write_text("Seq\n")
    run_item(live9, out4, "1", {"json": "{}"})
    lc.publish(live9, out4, "1", exit_code=0)
    check("close-run no deja pendientes", [], lc.close_run(live9, out4))
    check("index y joblog llegan a la salida", (True, True),
          ((out4 / "index.tsv").exists(), (out4 / "joblog.tsv").exists()))
    closed = json.loads((out4 / lc.RUN_CLOSED).read_text())
    check("run.closed nombra los ítems cerrados", ["1"], closed["items"])
    check("el runtime de la ejecución se retira", False, live9.exists())

print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
