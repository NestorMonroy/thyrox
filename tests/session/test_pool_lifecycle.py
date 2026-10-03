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
- Sin la guarda de generación en ``transition`` y ``publish``, el dueño
  anterior de un ítem que la recuperación tomó sigue actuando sobre él: caen
  exactamente las cuatro aserciones del caso 7h que miden el rechazo.
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

from peer_mailbox.inbox import Inbox  # noqa: E402
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
    check("el runtime de la ejecución se retira salvo su buzón", [lc.MAILBOX_DIR],
          sorted(p.name for p in live9.iterdir()))

# I5 con el fallo inyectado entre CADA operación de la publicación, no sólo
# tras la primera. Con tres artefactos en el mismo sistema de archivos son
# ocho: las tres colocaciones (un rename, que no deja fuente que retirar), el
# retiro del cierre anterior, los tres intercambios y el cierre nuevo.
with tempfile.TemporaryDirectory() as scratch:
    base = Path(scratch)
    os.environ["THYROX_RUNTIME_DIR"] = str(base / "runtime")
    print("caso 7f: I5 — una caída en cualquier punto de la publicación se retoma")
    crash_points, broken = 0, []
    for k in range(1, 40):
        out = base / f"out-k{k}"
        out.mkdir()
        live1 = lc.open_run(out, os.getpid(), run_id=f"k{k}-g1")
        run_item(live1, out, "4", {"stream.jsonl": "gen1\n", "err": "e1", "time": "1 2 3 4"})
        lc.publish(live1, out, "4", exit_code=0)
        live2 = lc.open_run(out, os.getpid(), run_id=f"k{k}-g2")
        run_item(live2, out, "4", {"stream.jsonl": "gen2\n", "err": "e2", "time": "5 6 7 8"})
        rc = publish_cli(live2, out, "4", "--exit", "0", "--fail-after-moves", str(k))
        if rc == 0:
            break
        crash_points += 1
        if lc.is_closed(out, "4") and lc.verify_closed(out, "4"):
            broken.append(f"k={k}: cierre aceptado e incoherente")
        lc.reconcile(base / "runtime" / "pool")
        if (lc.closed_generation(out, "4"), lc.verify_closed(out, "4")) != (2, []):
            broken.append(f"k={k}: reconcile no dejó la generación 2 coherente")
        elif (out / "4.stream.jsonl").read_text() != "gen2\n":
            broken.append(f"k={k}: contenido distinto de la generación 2")
        if any(p.name.startswith(".") for p in out.iterdir()):
            broken.append(f"k={k}: quedaron artefactos ocultos")
    check("la inyección recorre las ocho operaciones de la publicación", 8, crash_points)
    check("ninguna caída deja un cierre incoherente ni impide completar la generación 2", [], broken)

# I3: un ítem no se publica mientras un proceso vivo tenga abierto en
# escritura uno de sus artefactos. reconcile publica ítems cuyo dueño murió,
# y un hijo huérfano puede seguir escribiendo en su runtime.
with tempfile.TemporaryDirectory() as scratch:
    base = Path(scratch)
    os.environ["THYROX_RUNTIME_DIR"] = str(base / "runtime")
    print("caso 7g: I3 — un escritor vivo impide publicar")
    out = base / "out"
    out.mkdir()
    live = lc.open_run(out, os.getpid(), run_id="i3")
    run_item(live, out, "4", {"stream.jsonl": "parcial\n", "err": ""})
    holder = subprocess.Popen(
        [sys.executable, "-c", "import sys\nf = open(sys.argv[1], 'a')\nprint('ready', flush=True)\n"
         "sys.stdin.read()\n", str(live / "4.stream.jsonl")],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    assert holder.stdout is not None and holder.stdin is not None
    holder.stdout.readline()
    try:
        lc.publish(live, out, "4", exit_code=0)
        refused = "no rehusó"
    except Exception as error:  # noqa: BLE001 — se mide el tipo por su nombre
        refused = type(error).__name__
    check("publicar con un escritor vivo se rehúsa", "LiveWriterError", refused)
    check("... y el ítem no queda publicado", False, lc.is_closed(out, "4"))
    check("... ni con un plan de publicación a medias", False, (live / "4.plan.json").exists())
    holder.stdin.close()
    holder.wait(timeout=10)
    lc.publish(live, out, "4", exit_code=0)
    check("sin el escritor, se publica", ([], 1), (lc.verify_closed(out, "4"), lc.closed_generation(out, "4")))

# Caso 7h: la recuperación que toma el ítem sube su generación, y desde ese
# momento el dueño anterior no puede cambiar su estado ni publicarlo.
with tempfile.TemporaryDirectory() as scratch:
    base = Path(scratch)
    os.environ["THYROX_RUNTIME_DIR"] = str(base / "runtime")
    print("caso 7h: tomar el ítem sube la generación y anula al dueño anterior")
    out = base / "out"
    out.mkdir()
    live = lc.open_run(out, os.getpid(), run_id="claim")
    run_item(live, out, "5", {"stream.jsonl": "del dueño anterior\n", "err": ""})
    old = state_of(live, "5").generation
    check("tomar un ítem con dueño se rehúsa",
          True, raises(lc.LifecycleError, lambda: lc.claim(live, out, "5", owner_pid=os.getpid())))
    lc.transition(live, "5", lc.ABANDONED_RECOVERABLE)
    claimed = lc.claim(live, out, "5", owner_pid=os.getpid())
    check("tomar el ítem abandonado sube la generación", old + 1, claimed.generation)
    check("... y lo deja a nombre del nuevo dueño en su estado persistido",
          (old + 1, os.getpid()), (state_of(live, "5").generation, state_of(live, "5").owner_pid))
    check("el dueño anterior no puede cambiar el estado",
          True, raises(lc.StaleGenerationError,
                       lambda: lc.transition(live, "5", lc.CLOSING, generation=old)))
    check("... ni publicar", True,
          raises(lc.StaleGenerationError, lambda: lc.publish(live, out, "5", exit_code=0, generation=old)))
    check("... y por la línea de órdenes rehúsa con exit 5",
          lc.EXIT_REJECTED, publish_cli(live, out, "5", "--exit", "0", "--generation", str(old)))
    check("el rechazo no publica nada", False, lc.is_closed(out, "5"))
    lc.publish(live, out, "5", exit_code=0, generation=old + 1)
    check("el nuevo dueño publica su generación", ([], old + 1),
          (lc.verify_closed(out, "5"), lc.closed_generation(out, "5")))

# Caso 10 (TASK-THYROX-0672): cada cambio del ciclo de vida deja un sobre al
# orquestador en el buzón de la ejecución, con un request_id estable.
def envelopes(live: Path) -> list[dict]:
    """Los sobres que el orquestador tiene pendientes en el buzón de la ejecución."""
    return Inbox(lc.mailbox_dir(live)).pending(lc.ORCHESTRATOR_ADDRESS)


def request_ids(live: Path) -> list[str]:
    return [message.get("request_id", "") for message in envelopes(live)]


with tempfile.TemporaryDirectory() as scratch:
    base = Path(scratch)
    os.environ["THYROX_RUNTIME_DIR"] = str(base / "runtime")
    print("caso 10: cada cambio del ciclo de vida deja un sobre al orquestador")
    out = base / "out"
    out.mkdir()
    live = lc.open_run(out, os.getpid(), run_id="m1")
    check("open-run crea el buzón de la ejecución", True, lc.mailbox_dir(live).is_dir())
    check("la dirección de un ítem es item-<n>", "item-1", lc.item_address("1"))
    lc.begin(live, out, "1", owner_pid=os.getpid())
    check("begin deja exactamente un sobre", ["m1:1:begin:1"], request_ids(live))
    body = json.loads(envelopes(live)[0]["body"])
    check("el cuerpo lleva ítem, dirección, estado, generación y hora",
          ("begin", "1", "item-1", lc.RUNNING, 1, True),
          (body["event"], body["item"], body["address"], body["state"], body["generation"],
           bool(body["at"])))
    check("el remitente es el ciclo de vida", lc.LIFECYCLE_SENDER, envelopes(live)[0]["from"])
    lc.transition(live, "1", lc.SNAPSHOTTING)
    check("transition deja su sobre", "m1:1:transition-snapshotting:1", request_ids(live)[-1])
    lc.transition(live, "1", lc.RUNNING)
    lc.transition(live, "1", lc.SNAPSHOTTING)
    check("repetir la misma transición en la misma generación no duplica", 3, len(envelopes(live)))
    lc.transition(live, "1", lc.RUNNING)
    lc.transition(live, "1", lc.ABANDONED_RECOVERABLE)
    lc.claim(live, out, "1", owner_pid=os.getpid())
    check("claim deja un sobre con la generación nueva", "m1:1:claim:2", request_ids(live)[-1])
    lc.claim(live, out, "1", owner_pid=os.getpid())
    check("un claim con otra generación nueva deja otro", "m1:1:claim:3", request_ids(live)[-1])
    before_publish = len(envelopes(live))
    lc.publish(live, out, "1", exit_code=0)
    check("publish deja un sobre, y ninguno por sus transiciones internas",
          (before_publish + 1, "m1:1:publish:3"), (len(envelopes(live)), request_ids(live)[-1]))
    lc.publish(live, out, "1", exit_code=0)
    check("publicar de nuevo no duplica", before_publish + 1, len(envelopes(live)))
    lc.close_run(live, out)
    check("close-run deja su sobre", "m1:run:close-run:0", request_ids(live)[-1])
    check("... que nombra los ítems cerrados", ["1"], json.loads(envelopes(live)[-1]["body"])["items"])
    check("el buzón sobrevive al cierre de la ejecución", True, lc.mailbox_dir(live).is_dir())

    print("caso 10b: un runtime sin buzón —anterior al buzón— sigue funcionando")
    legacy = lc.open_run(out, os.getpid(), run_id="m2")
    lc.mailbox_dir(legacy).rmdir()
    lc.begin(legacy, out, "2", owner_pid=os.getpid())
    lc.transition(legacy, "2", lc.SNAPSHOTTING)
    check("sin buzón no se crea uno ni se rehúsa", (lc.SNAPSHOTTING, False),
          (state_of(legacy, "2").state, lc.mailbox_dir(legacy).exists()))

print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
