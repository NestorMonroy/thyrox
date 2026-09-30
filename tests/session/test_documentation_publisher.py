"""Pruebas de ``session.documentation_publisher`` y ``session.document_intent``.

Cada caso levanta un consumidor sintético —un repositorio git con la forma de
``kaupamex-docs``: ``.claude/``, ``.githooks/pre-commit`` y
``source/gestion/pm/<raíz>/iniciativas/<slug>/``—, un ``bin/`` falso cuyos
tres gates registran cada invocación, y una salida de pool cerrada con el
propio ``pool_lifecycle``. Todo vive en un temporal; el runtime y los
candados también (``THYROX_RUNTIME_DIR``).

Controles de anulación
----------------------
- Sin la comparación de procedencia (``_assert_same_provenance``), una
  intención de otra generación se publica: cae exactamente el caso 3.
- Sin la comparación del blob (``assert_expected_blob``), un objetivo que
  cambió se pisa: caen exactamente las aserciones de conflicto del caso 4.
- Sin ``core.hooksPath`` en el commit, el pre-commit del consumidor no corre:
  caen las aserciones del registro del hook (caso 1) y el rechazo del caso 6.
- Sin ``verify_closed`` en la lectura de la intención, un artefacto alterado
  tras el cierre se publica: cae exactamente el caso 2b.
"""
from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from session import document_intent as di  # noqa: E402
from session import documentation_publisher as dp  # noqa: E402
from session import pool_lifecycle as lc  # noqa: E402
from session import shared_lock  # noqa: E402

OK = 0
FAILED = 0

SLUG = "actualizar-agentic-ai-thyrox"
SUBMODULE = "thyrox"
INITIATIVE_DIR = Path("source/gestion/pm") / SUBMODULE / "iniciativas" / SLUG
TARGET = (INITIATIVE_DIR / "hallazgos" / "hallazgo-H-THYROX-900-prueba.rst").as_posix()
BODY = (".. meta::\n   :fecha_creacion: 2026-09-30T00:00:00\n   :autor: Equipo Kaupamex\n"
        "   :estado: documentado\n   :submodulo: thyrox\n   :iniciativa: " + SLUG + "\n\n"
        ".. _h-thyrox-900:\n\nH-THYROX-900 — Prueba\n=====================\n\nCuerpo.\n")
HOOK_LOG_VAR = "PUBLISHER_TEST_HOOK_LOG"
HOOK_EXIT_VAR = "PUBLISHER_TEST_HOOK_EXIT"
GATE_LOG_VAR = "PUBLISHER_TEST_GATE_LOG"
GATE_EXIT_VAR = "PUBLISHER_TEST_GATE_EXIT"


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def raises(error: type[Exception], call) -> bool:
    """``True`` sólo si ``call`` levanta exactamente ``error``; otra excepción cuenta como fallo."""
    try:
        call()
    except error:
        return True
    except Exception as other:  # noqa: BLE001 — la aserción nombra la excepción que sí llegó
        print(f"        levantó {type(other).__name__}: {str(other)[:120]}")
        return False
    return False


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True,
                          check=True).stdout.strip()


def executable(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


def make_consumer(base: Path) -> Path:
    """Un ``kaupamex-docs`` sintético: git, ``.claude``, hook y una iniciativa en su sitio."""
    consumer = base / "kaupamex-docs"
    consumer.mkdir()
    git(consumer, "init", "-q", "-b", "main")
    git(consumer, "config", "user.name", "Fixture")
    git(consumer, "config", "user.email", "fixture@example.invalid")
    (consumer / ".claude").mkdir()
    (consumer / ".claude" / "keep").write_text("", encoding="utf-8")
    executable(consumer / ".githooks" / "pre-commit",
               "#!/usr/bin/env bash\n"
               f'printf "pre-commit %s\\n" "$(git diff --cached --name-only)" >> "${HOOK_LOG_VAR}"\n'
               f'exit "${{{HOOK_EXIT_VAR}:-0}}"\n')
    initiative = consumer / INITIATIVE_DIR
    (initiative / "hallazgos").mkdir(parents=True)
    (initiative / "index.rst").write_text(
        ".. meta::\n   :estado: en-ejecucion\n\nIniciativa\n==========\n", encoding="utf-8")
    (initiative / "hallazgos" / "index.rst").write_text("Hallazgos\n=========\n", encoding="utf-8")
    (consumer / "otro.rst").write_text("otro\n", encoding="utf-8")
    git(consumer, "add", "-A")
    git(consumer, "commit", "-q", "-m", "Initial")
    return consumer


def make_bin(base: Path) -> Path:
    """Los tres gates como dobles: registran ``nombre argumentos`` y salen según el entorno."""
    bin_dir = base / "bin"
    for name in ("check_rst_sintaxis", "check_vocabulario_prosa", "check-artefactos-minimos"):
        executable(bin_dir / name,
                   "#!/usr/bin/env bash\n"
                   f'printf "%s %s\\n" "$(basename "$0")" "$*" >> "${GATE_LOG_VAR}"\n'
                   f'exit "${{{GATE_EXIT_VAR}:-0}}"\n')
    return bin_dir


def close_item(out: Path, item: str, *, intent: dict, body: str = BODY,
               run_id: str | None = None) -> dict:
    """Cierra un ítem con ``pool_lifecycle`` y devuelve su manifiesto.

    Las claves de procedencia que falten en ``intent`` se rellenan con las del
    ítem que se está cerrando; las presentes ganan, para poder declarar una
    generación o una ejecución ajena.
    """
    live = lc.open_run(out, os.getpid(), run_id=run_id or f"run-{item}")
    state = lc.begin(live, out, item, owner_pid=os.getpid())
    (live / f"{item}.json").write_text("{}\n", encoding="utf-8")
    (live / f"{item}.document.rst").write_text(body, encoding="utf-8")
    provenance = {"source_run": live.name, "source_item": item,
                  "source_generation": state.generation, "source_snapshot": None}
    (live / f"{item}{di.INTENT_SUFFIX}").write_text(
        json.dumps({**provenance, **intent}) + "\n", encoding="utf-8")
    return lc.publish(live, out, item, exit_code=0)


def base_intent(**changes) -> dict:
    intent = {"consumer": "docs", "initiative": SLUG, "document_kind": "hallazgo",
              "target": TARGET, "expected_blob": None, "body_artifact": None}
    intent.update(changes)
    return intent


def environment(base: Path, consumer: Path) -> None:
    os.environ.update({
        "THYROX_RUNTIME_DIR": str(base / "runtime"),
        "THYROX_ENV_FILE": "/dev/null",
        "THYROX_REACH_ROOTS": "docs",
        "THYROX_CLONE_PREFIX": "kaupamex-",
        "THYROX_REACH_DOCS": str(consumer),
        "THYROX_COMMIT_AUTHOR": "Nestor Monroy <46802445+NestorMonroy@users.noreply.github.com>",
        "THYROX_COMMIT_COMMITTER": "jcg-admin <169318663+jcg-admin@users.noreply.github.com>",
        HOOK_LOG_VAR: str(base / "hook.log"),
        GATE_LOG_VAR: str(base / "gate.log"),
    })
    os.environ.pop(HOOK_EXIT_VAR, None)
    os.environ.pop(GATE_EXIT_VAR, None)


def log_lines(base: Path, name: str) -> list[str]:
    path = base / name
    return path.read_text(encoding="utf-8").splitlines() if path.exists() else []


def published(consumer: Path, branch: str = dp.PUBLISHER_BRANCH) -> list[str]:
    """Los commits de la rama del publicador que ``main`` no tiene, del más nuevo al más viejo."""
    if not branch_files(consumer, branch):
        return []
    return git(consumer, "rev-list", f"main..{branch}").splitlines()


def branch_files(consumer: Path, branch: str = dp.PUBLISHER_BRANCH) -> list[str]:
    if subprocess.run(["git", "-C", str(consumer), "rev-parse", "--verify", "--quiet",
                       f"refs/heads/{branch}"], capture_output=True).returncode != 0:
        return []
    return git(consumer, "ls-tree", "-r", "--name-only", branch).splitlines()


class Scene:
    """Un escenario completo: consumidor, bin falso, salida y entorno."""

    def __init__(self, base: Path):
        self.base = base
        self.consumer = make_consumer(base)
        self.bin_dir = make_bin(base)
        self.out = base / "out"
        self.out.mkdir()
        environment(base, self.consumer)

    def publisher(self, item: str) -> dp.DocumentationPublisher:
        return dp.DocumentationPublisher(self.out, item, bin_dir=self.bin_dir)

    def cli(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(ROOT / "src/session/documentation_publisher.py"),
                               *args], capture_output=True, text=True,
                              env={**os.environ, "PYTHONPATH": str(ROOT / "src")})


def main() -> int:
    with tempfile.TemporaryDirectory() as scratch:
        scene = Scene(Path(scratch))
        print("caso 1: un ítem cerrado con intención válida se publica en la rama del publicador")
        item = "1"
        manifest = close_item(scene.out, item, intent=base_intent(body_artifact=f"{item}.document.rst"))
        closed_before = (scene.out / f"{item}{lc.CLOSED_SUFFIX}").read_bytes()
        result = scene.publisher(item).publish()
        check("el commit queda en la rama del publicador", [result.commit],
              published(scene.consumer))
        check("... y la rama contiene el objetivo", True, TARGET in branch_files(scene.consumer))
        check("... con el cuerpo del artefacto, verbatim", BODY,
              git(scene.consumer, "show", f"{dp.PUBLISHER_BRANCH}:{TARGET}") + "\n")
        check("la rama principal del consumidor no se mueve", "Initial",
              git(scene.consumer, "log", "-1", "--format=%s", "main"))
        check("el árbol de trabajo del consumidor queda limpio", "", git(scene.consumer, "status", "--porcelain"))
        check("el worktree temporal se retiró", 1, len(git(scene.consumer, "worktree", "list").splitlines()))
        gates = [line.split()[0] for line in log_lines(scene.base, "gate.log")]
        check("los tres gates se invocan una vez cada uno, por su envoltorio",
              ["check_rst_sintaxis", "check_vocabulario_prosa", "check-artefactos-minimos"], gates)
        check("el pre-commit del consumidor corrió sobre el objetivo",
              [f"pre-commit {TARGET}"], log_lines(scene.base, "hook.log"))
        check("el author y el committer son los declarados",
              "Nestor Monroy|jcg-admin",
              git(scene.consumer, "log", "-1", "--format=%an|%cn", dp.PUBLISHER_BRANCH))
        check("el mensaje cita la procedencia", True,
              f"generation {manifest['generation']}" in git(scene.consumer, "log", "-1", "--format=%B", dp.PUBLISHER_BRANCH))
        check("<n>.closed queda byte a byte igual", closed_before,
              (scene.out / f"{item}{lc.CLOSED_SUFFIX}").read_bytes())
        record = json.loads((scene.out / f"{item}{dp.PUBLISHED_SUFFIX}").read_text())
        check("el resultado se publica junto al ítem", (result.commit, manifest["generation"], None),
              (record["commit"], record["generation"], record["blob_before"]))
        check("... y el resultado no es un artefacto de ítem para quien lee la salida",
              None, lc.item_of_artifact(f"{item}{dp.PUBLISHED_SUFFIX}"))
        again = scene.publisher(item).publish()
        check("publicar de nuevo la misma generación no crea otro commit", result.commit, again.commit)
        check("... ni vuelve a invocar los gates", 3, len(log_lines(scene.base, "gate.log")))

        print("caso 2: sin <n>.closed válido no se lee ninguna intención")
        before = len(published(scene.consumer))
        check("un ítem sin cerrar se rehúsa", True,
              raises(di.IntentError, lambda: scene.publisher("9").publish()))
        item = "2"
        close_item(scene.out, item, intent=base_intent(body_artifact=f"{item}.document.rst"))
        (scene.out / f"{item}.document.rst").write_text(BODY + "\nAlterado tras el cierre.\n", encoding="utf-8")
        check("2b: un artefacto alterado tras el cierre se rehúsa", True,
              raises(di.IntentError, lambda: scene.publisher(item).publish()))
        check("... y nada llega a la rama", before, len(published(scene.consumer)))

        print("caso 3: una intención de otra generación o de otra ejecución se rehúsa")
        item = "3"
        close_item(scene.out, item, intent=base_intent(body_artifact=f"{item}.document.rst",
                                                        source_generation=0))
        check("generación rancia", True, raises(di.StaleIntentError, lambda: scene.publisher(item).publish()))
        item = "3b"
        close_item(scene.out, item, intent=base_intent(body_artifact=f"{item}.document.rst",
                                                        source_run="otra-ejecucion"))
        check("ejecución ajena", True, raises(di.StaleIntentError, lambda: scene.publisher(item).publish()))
        check("... y ninguna de las dos toca el ítem cerrado", ([], []),
              (lc.verify_closed(scene.out, "3"), lc.verify_closed(scene.out, "3b")))

        print("caso 4: la concurrencia optimista mira el blob del objetivo, no la punta del repositorio")
        before = len(published(scene.consumer))
        blob_target = git(scene.consumer, "rev-parse", f"{dp.PUBLISHER_BRANCH}:{TARGET}")
        item = "4"
        close_item(scene.out, item, body=BODY + "\nSegunda versión.\n",
                   intent=base_intent(body_artifact=f"{item}.document.rst", expected_blob=blob_target))
        # Otro archivo cambia en la rama: no es conflicto.
        wt = scene.base / "wt-other"
        git(scene.consumer, "worktree", "add", "-q", wt.as_posix(), dp.PUBLISHER_BRANCH)
        (wt / "otro.rst").write_text("otro cambió\n", encoding="utf-8")
        git(wt, "commit", "-q", "-a", "-m", "Change another file")
        git(scene.consumer, "worktree", "remove", "--force", wt.as_posix())
        result = scene.publisher(item).publish()
        check("con otro archivo cambiado, se publica sobre la punta nueva", "Change another file",
              git(scene.consumer, "log", "-1", "--format=%s", f"{result.commit}~1"))
        check("... y el blob previo es el esperado", blob_target, result.blob_before)
        item = "4b"
        close_item(scene.out, item, intent=base_intent(body_artifact=f"{item}.document.rst",
                                                        expected_blob=blob_target))
        check("el objetivo ya cambió: conflicto", True,
              raises(dp.BlobConflictError, lambda: scene.publisher(item).publish()))
        item = "4c"
        close_item(scene.out, item, intent=base_intent(body_artifact=f"{item}.document.rst",
                                                        expected_blob=None))
        check("esperar que no exista cuando existe: conflicto", True,
              raises(dp.BlobConflictError, lambda: scene.publisher(item).publish()))
        check("un conflicto no deja commit ni resultado", (before + 2, False),
              (len(published(scene.consumer)),
               (scene.out / f"4b{dp.PUBLISHED_SUFFIX}").exists()))

        print("caso 5: un gate rojo rehúsa sin commit y sin tocar el ítem")
        before = len(published(scene.consumer))
        item = "5"
        close_item(scene.out, item, intent=base_intent(
            target=(INITIATIVE_DIR / "hallazgos" / "hallazgo-H-THYROX-901-otro.rst").as_posix(),
            body_artifact=f"{item}.document.rst"))
        os.environ[GATE_EXIT_VAR] = "1"
        closed_before = (scene.out / f"{item}{lc.CLOSED_SUFFIX}").read_bytes()
        check("gate rojo", True, raises(dp.GateFailedError, lambda: scene.publisher(item).publish()))
        os.environ.pop(GATE_EXIT_VAR)
        check("... sin commit", before, len(published(scene.consumer)))
        check("... con <n>.closed intacto y coherente", (closed_before, []),
              ((scene.out / f"{item}{lc.CLOSED_SUFFIX}").read_bytes(), lc.verify_closed(scene.out, item)))
        check("... y el worktree temporal retirado", 1, len(git(scene.consumer, "worktree", "list").splitlines()))

        print("caso 6: el pre-commit del consumidor rehúsa el commit")
        os.environ[HOOK_EXIT_VAR] = "1"
        check("hook rojo", True, raises(dp.CommitRefusedError, lambda: scene.publisher(item).publish()))
        os.environ.pop(HOOK_EXIT_VAR)
        check("... sin commit", before, len(published(scene.consumer)))
        result = scene.publisher(item).publish()
        check("con el hook en verde, el mismo ítem se publica", before + 1,
              len(published(scene.consumer)))

        print("caso 7: el candado es por archivo objetivo")
        before = len(published(scene.consumer))
        item = "7"
        close_item(scene.out, item, intent=base_intent(
            target=(INITIATIVE_DIR / "hallazgos" / "hallazgo-H-THYROX-902-lock.rst").as_posix(),
            body_artifact=f"{item}.document.rst"))
        target_lock = dp.lock_target(scene.consumer, (INITIATIVE_DIR / "hallazgos" / "hallazgo-H-THYROX-902-lock.rst").as_posix())
        held = shared_lock.acquire(target_lock)
        try:
            check("con el candado del objetivo tomado, se rehúsa", True,
                  raises(shared_lock.LockHeld, lambda: scene.publisher(item).publish()))
        finally:
            held.release()
        other_lock = dp.lock_target(scene.consumer, TARGET)
        held = shared_lock.acquire(other_lock)
        try:
            check("el candado de OTRO objetivo no estorba", before + 1,
                  len(git(scene.consumer, "rev-list", f"main..{scene.publisher(item).publish().commit}").splitlines()))
        finally:
            held.release()

        print("caso 8: la intención se valida contra la estructura real")
        for label, changes, error in (
                ("objetivo fuera de la iniciativa", {"target": "source/gestion/pm/thyrox/suelto.rst"}, di.IntentError),
                ("markdown nunca", {"target": (INITIATIVE_DIR / "hallazgos" / "hallazgo-x.md").as_posix()}, di.IntentError),
                ("clase desconocida", {"document_kind": "poema"}, di.IntentError),
                ("nombre que no lleva su clase", {"target": (INITIATIVE_DIR / "nota.rst").as_posix()}, di.IntentError),
                ("cuerpo sin cabecera meta", {}, di.IntentError)):
            item = f"8-{len(label)}"
            body = "Sin meta\n" if label == "cuerpo sin cabecera meta" else BODY
            close_item(scene.out, item, body=body,
                       intent=base_intent(body_artifact=f"{item}.document.rst", **changes))
            check(label, True, raises(error, lambda: scene.publisher(item).publish()))
        item = "8-elsewhere"
        close_item(scene.out, item, intent=base_intent(
            target="source/gestion/pm/api/iniciativas/" + SLUG + "/hallazgos/hallazgo-H-API-1.rst",
            body_artifact=f"{item}.document.rst"))
        check("una iniciativa alojada en otra raíz se rehúsa nombrándola", True,
              raises(dp.PlacementError, lambda: scene.publisher(item).publish()))

        print("caso 9: la línea de órdenes")
        item = "9a"
        close_item(scene.out, item, intent=base_intent(
            target=(INITIATIVE_DIR / "hallazgos" / "hallazgo-H-THYROX-903-cli.rst").as_posix(),
            body_artifact=f"{item}.document.rst"))
        done = scene.cli("publish", str(scene.out), item, "--bin", str(scene.bin_dir))
        check("publica y sale 0 imprimiendo el commit", (0, True),
              (done.returncode, done.stdout.strip() in git(scene.consumer, "rev-list", dp.PUBLISHER_BRANCH)))
        done = scene.cli("publish", str(scene.out), "4b", "--bin", str(scene.bin_dir))
        check("un conflicto sale con el código de rechazo", dp.EXIT_REFUSED, done.returncode)
        done = scene.cli("publish", str(scene.out), "no-existe", "--bin", str(scene.bin_dir))
        check("sin <n>.closed sale con el código de rechazo", dp.EXIT_REFUSED, done.returncode)
        intent_path = scene.base / "intent.json"
        done = subprocess.run(
            [sys.executable, str(ROOT / "src/session/documentation_publisher.py"), "write-intent",
             str(intent_path), "--consumer", "docs", "--initiative", SLUG, "--kind", "hallazgo",
             "--target", TARGET, "--body-artifact", "7.document.rst", "--expected-blob", "abc"],
            capture_output=True, text=True,
            env={**os.environ, "PYTHONPATH": str(ROOT / "src"), di.RUN_ID_VAR: "run-x",
                 di.ITEM_VAR: "7", di.GENERATION_VAR: "2", di.SNAPSHOT_VAR: "snap-1"})
        written = json.loads(intent_path.read_text()) if intent_path.exists() else {}
        check("write-intent toma la procedencia del entorno del ítem",
              (0, "run-x", "7", 2, "snap-1", "abc"),
              (done.returncode, written.get("source_run"), written.get("source_item"),
               written.get("source_generation"), written.get("source_snapshot"), written.get("expected_blob")))
        done = subprocess.run(
            [sys.executable, str(ROOT / "src/session/documentation_publisher.py"), "write-intent",
             str(intent_path), "--consumer", "docs", "--initiative", SLUG, "--kind", "hallazgo",
             "--target", TARGET, "--body-artifact", "7.document.rst"],
            capture_output=True, text=True,
            env={k: v for k, v in {**os.environ, "PYTHONPATH": str(ROOT / "src")}.items()
                 if k not in (di.RUN_ID_VAR, di.ITEM_VAR, di.GENERATION_VAR)})
        check("... y sin ese entorno rehúsa nombrando la variable", (dp.EXIT_UNMEASURED, True),
              (done.returncode, di.RUN_ID_VAR in done.stderr))
        # El contrato entre quien exporta y quien lee: los nombres van literales,
        # así que renombrar uno de los dos lados sin el otro hace caer este caso.
        contract = ("THYROX_POOL_DOCUMENT_INTENT", "THYROX_POOL_RUN_ID", "THYROX_POOL_ITEM",
                    "THYROX_POOL_ITEM_GENERATION")
        pool_source = (ROOT / "src/session/headless-pool.sh").read_text()
        check("el pool exporta a cada ítem los nombres que lee document_intent",
              (contract, (True,) * len(contract)),
              ((di.INTENT_PATH_VAR, di.RUN_ID_VAR, di.ITEM_VAR, di.GENERATION_VAR),
               tuple(f"{name}=" in pool_source for name in contract)))
        shutil.rmtree(scene.base / "runtime", ignore_errors=True)

    print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
