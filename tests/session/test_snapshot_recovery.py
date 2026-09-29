"""Pruebas de ``session.snapshot_store`` y ``session.recovery_controller``.

Todo corre sobre repositorios de git temporales, con ``THYROX_RUNTIME_DIR``
apuntando a un directorio temporal.

Casos (numeración de la especificación de TASK-THYROX-0601):
  5. la foto guarda lo preparado, lo modificado, lo nuevo sin seguir y lo
     binario, y deja intactos HEAD, la rama y el índice real;
  6. dos fotos concurrentes desde dos worktrees crean sus dos refs, ninguna
     reemplaza a la otra, y repetir una ref existente se rehúsa;
 11. recuperar abre un worktree aparte y no toca el árbol del usuario;
 13. un ítem cancelado se clasifica recuperable, su foto sobrevive, y ``prune``
     rehúsa retirar su runtime.

Controles de anulación:
- ``capture_worktree=False``: la foto se queda en lo preparado y caen
  exactamente las aserciones de lo modificado, lo nuevo y lo binario.
- ``create_only=False``: repetir una ref la reemplaza.
- ``restore_in_place(confirm=True)``: la operación destructiva sí pisa el árbol,
  que es lo que la recuperación por defecto evita.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from session import pool_lifecycle as lc  # noqa: E402
from session import recovery_controller as rc  # noqa: E402
from session import snapshot_store as ss  # noqa: E402

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


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout.strip()


def make_repo(path: Path) -> Path:
    subprocess.run(["git", "init", "-q", str(path)], check=True)
    git(path, "config", "user.name", "t")
    git(path, "config", "user.email", "t@t")
    (path / "staged.txt").write_text("base\n")
    (path / "unstaged.txt").write_text("base\n")
    git(path, "add", "-A")
    git(path, "commit", "-qm", "seed")
    return path


def dirty(repo: Path) -> None:
    (repo / "staged.txt").write_text("preparado\n")
    git(repo, "add", "staged.txt")
    (repo / "unstaged.txt").write_text("sin preparar\n")
    (repo / "untracked.txt").write_text("nuevo\n")
    (repo / "blob.bin").write_bytes(bytes(range(256)))


def fingerprint(repo: Path) -> tuple[str, str, str]:
    index = Path(git(repo, "rev-parse", "--path-format=absolute", "--git-path", "index"))
    return (git(repo, "rev-parse", "HEAD"), git(repo, "symbolic-ref", "-q", "HEAD"),
            __import__("hashlib").sha256(index.read_bytes()).hexdigest())


def show(repo: Path, rev: str) -> bytes:
    return subprocess.run(["git", "-C", str(repo), "show", rev], capture_output=True, check=False).stdout


with tempfile.TemporaryDirectory() as scratch:
    base = Path(scratch)
    os.environ["THYROX_RUNTIME_DIR"] = str(base / "runtime")

    print("caso 5: la foto guarda todo y no toca HEAD, rama ni índice")
    repo = make_repo(base / "repo")
    dirty(repo)
    before = fingerprint(repo)
    status_before = git(repo, "status", "--porcelain")
    m = ss.take_snapshot(repo, "r1", "1", 1)
    check("HEAD, rama e índice real intactos", before, fingerprint(repo))
    check("git status intacto", status_before, git(repo, "status", "--porcelain"))
    check("lo preparado está en la foto", b"preparado\n", show(repo, f"{m.snapshot_commit}:staged.txt"))
    check("lo modificado sin preparar está en la foto", b"sin preparar\n",
          show(repo, f"{m.snapshot_commit}:unstaged.txt"))
    check("lo nuevo sin seguir está en la foto", b"nuevo\n", show(repo, f"{m.snapshot_commit}:untracked.txt"))
    check("lo binario está en la foto, byte a byte", bytes(range(256)), show(repo, f"{m.snapshot_commit}:blob.bin"))
    check("el árbol del índice guarda sólo lo preparado", (b"preparado\n", b"base\n"),
          (show(repo, f"{m.original_index_tree}:staged.txt"), show(repo, f"{m.original_index_tree}:unstaged.txt")))
    check("la ref apunta a la foto", m.snapshot_commit, git(repo, "rev-parse", ss.snapshot_ref("r1", "1", 1)))
    check("el manifiesto está íntegro y en disco", True,
          m.is_intact() and ss.read_manifest("r1", "1", 1) == m)
    check("base_head es el HEAD de partida", before[0], m.base_head)

    print("caso 5c: control — sin capturar el árbol, la foto se queda en lo preparado")
    mc = ss.take_snapshot(repo, "r1c", "1", 1, capture_worktree=False)
    check("control: lo modificado sin preparar falta", b"base\n", show(repo, f"{mc.snapshot_commit}:unstaged.txt"))
    check("control: lo nuevo sin seguir falta", b"", show(repo, f"{mc.snapshot_commit}:untracked.txt"))
    check("control: lo binario falta", b"", show(repo, f"{mc.snapshot_commit}:blob.bin"))

    print("caso 6: dos fotos concurrentes desde dos worktrees no chocan")
    repo6 = make_repo(base / "repo6")
    wt_a, wt_b = base / "wt-a", base / "wt-b"
    git(repo6, "worktree", "add", "-q", "-b", "a", str(wt_a))
    git(repo6, "worktree", "add", "-q", "-b", "b", str(wt_b))
    (wt_a / "a.txt").write_text("a\n")
    (wt_b / "b.txt").write_text("b\n")
    before_a, before_b, before_main = fingerprint(wt_a), fingerprint(wt_b), fingerprint(repo6)
    results: dict[str, ss.SnapshotManifest] = {}
    barrier = threading.Barrier(2)

    def snap(label: str, tree: Path, item: str) -> None:
        barrier.wait()
        results[label] = ss.take_snapshot(tree, "r6", item, 1)

    threads = [threading.Thread(target=snap, args=("a", wt_a, "1")),
               threading.Thread(target=snap, args=("b", wt_b, "2"))]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    refs = git(repo6, "for-each-ref", "--format=%(refname) %(objectname)", "refs/thyrox/snapshots/r6").splitlines()
    check("las dos refs existen", 2, len(refs))
    check("cada ref apunta a su propia foto", {f"{ss.snapshot_ref('r6', '1', 1)} {results['a'].snapshot_commit}",
                                              f"{ss.snapshot_ref('r6', '2', 1)} {results['b'].snapshot_commit}"},
          set(refs))
    check("cada foto trae el archivo de su worktree", (b"a\n", b"b\n"),
          (show(repo6, f"{results['a'].snapshot_commit}:a.txt"), show(repo6, f"{results['b'].snapshot_commit}:b.txt")))
    check("ningún HEAD, rama o índice cambió", (before_a, before_b, before_main),
          (fingerprint(wt_a), fingerprint(wt_b), fingerprint(repo6)))
    first = results["a"].snapshot_commit
    (wt_a / "a.txt").write_text("otra\n")
    try:
        ss.take_snapshot(wt_a, "r6", "1", 1)
        check("repetir una ref existente se rehúsa", "SnapshotRefExistsError", "no rehusó")
    except ss.SnapshotRefExistsError:
        check("repetir una ref existente se rehúsa", True, True)
    check("... y la ref sigue en la primera foto", first, git(repo6, "rev-parse", ss.snapshot_ref("r6", "1", 1)))

    print("caso 6c: control — sin exigir que la ref no exista, la segunda la reemplaza")
    replaced = ss.take_snapshot(wt_a, "r6", "1", 1, create_only=False)
    check("control: la ref ya no apunta a la primera foto", True,
          git(repo6, "rev-parse", ss.snapshot_ref("r6", "1", 1)) == replaced.snapshot_commit != first)

    print("caso 11: recuperar abre un worktree aparte y no toca el árbol del usuario")
    repo11 = make_repo(base / "repo11")
    dirty(repo11)
    status11 = git(repo11, "status", "--porcelain")
    m11 = ss.take_snapshot(repo11, "r11", "1", 1)
    (repo11 / "unstaged.txt").write_text("trabajo posterior del usuario\n")
    before11 = fingerprint(repo11)
    target = rc.recover_to_worktree(repo11, "r11", "1", 1)
    check("el árbol del usuario conserva su trabajo posterior", "trabajo posterior del usuario\n",
          (repo11 / "unstaged.txt").read_text())
    check("HEAD, rama e índice del usuario intactos", before11, fingerprint(repo11))
    check("el worktree de recuperación trae la foto", ("sin preparar\n", "nuevo\n"),
          ((target / "unstaged.txt").read_text(), (target / "untracked.txt").read_text()))
    check("la recuperación trabaja en una rama temporal propia", rc.recovery_branch("r11", "1", 1),
          git(target, "symbolic-ref", "-q", "HEAD"))
    check("la rama temporal parte de base_head", m11.base_head, git(target, "rev-parse", "HEAD"))
    check("el índice recuperado es original_index_tree", m11.original_index_tree, git(target, "write-tree"))
    check("preparado, sin preparar y sin seguir quedan como estaban al tomar la foto", status11,
          git(target, "status", "--porcelain"))
    try:
        rc.recover_to_worktree(repo11, "r11", "1", 1)
        check("recuperar dos veces al mismo destino se rehúsa", "RecoveryError", "no rehusó")
    except rc.RecoveryError:
        check("recuperar dos veces al mismo destino se rehúsa", True, True)
    try:
        rc.restore_in_place(repo11, "r11", "1", 1)
        check("restaurar en el árbol sin confirmar se rehúsa", "RecoveryError", "no rehusó")
    except rc.RecoveryError:
        check("restaurar en el árbol sin confirmar se rehúsa", True, True)
    check("... y el árbol sigue intacto", "trabajo posterior del usuario\n", (repo11 / "unstaged.txt").read_text())

    print("caso 11c: control — restaurar en el árbol con confirmación pisa el trabajo del usuario")
    rc.restore_in_place(repo11, "r11", "1", 1, confirm=True)
    check("control: el trabajo posterior se perdió", "sin preparar\n", (repo11 / "unstaged.txt").read_text())
    check("control: la foto de m11 era la restaurada", m11.snapshot_commit,
          git(repo11, "rev-parse", ss.snapshot_ref("r11", "1", 1)))

    print("caso 13: un ítem cancelado queda recuperable y su runtime no se retira")
    out13 = base / "out13"
    out13.mkdir()
    live13 = lc.open_run(out13, os.getpid(), run_id="r13")
    dead = subprocess.Popen(["true"])
    dead.wait()
    lc.begin(live13, out13, "1", owner_pid=dead.pid)
    (live13 / "1.stream.jsonl").write_text("parcial\n")
    lc.begin(live13, out13, "2", owner_pid=os.getpid())
    check("con dueño muerto: abandoned-recoverable", rc.ABANDONED_RECOVERABLE, rc.classify(live13, out13, "1"))
    check("con dueño vivo: active", rc.ACTIVE, rc.classify(live13, out13, "2"))
    try:
        rc.prune(live13, out13)
        check("prune rehúsa un runtime sin publicar", "RecoveryError", "no rehusó")
    except rc.RecoveryError:
        check("prune rehúsa un runtime sin publicar", True, True)
    check("... y el runtime sigue", "parcial\n", (live13 / "1.stream.jsonl").read_text())
    lc.publish(live13, out13, "1", exit_code=130)
    lc.publish(live13, out13, "2", exit_code=0)
    check("publicados, los dos se clasifican closed", (rc.CLOSED, rc.CLOSED),
          (rc.classify(live13, out13, "1"), rc.classify(live13, out13, "2")))
    rc.prune(live13, out13)
    check("prune retira el runtime ya publicado", False, live13.exists())

print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
