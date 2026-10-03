"""El publicador de documentación: de un ítem CERRADO del pool a un commit en el consumidor.

Es un consumidor de ``<n>.closed`` y nada más: no forma parte del ciclo de
vida del ítem ni del daemon. Lee la intención documental que el ítem dejó
(``document_intent``), y sólo si el cierre es coherente y la intención es de
esa misma generación; un fallo aquí deja el ítem exactamente como estaba,
porque este módulo no escribe nunca en la salida del pool salvo su propio
resultado, ``<n>.published``.

El recorrido, bajo el candado del archivo objetivo
--------------------------------------------------
1. Resolver el consumidor por ``reach`` (``THYROX_CONSUMER`` /
   ``THYROX_REACH_ROOT(S)``): la documentación no tiene variable propia.
2. Comprobar que la iniciativa está en su sitio (``initiative_placement``),
   que es el mismo instrumento con que ``scaffold_initiative`` decide dónde
   crearla; aquí no se crea ninguna.
3. Tomar el candado del objetivo (``shared_lock``), en el runtime y no en el
   árbol del consumidor, que ``git status`` vería.
4. Un worktree temporal del consumidor desde la punta de la rama del
   publicador —o de ``HEAD`` si aún no existe—, retirado siempre.
5. La concurrencia optimista mira el BLOB del objetivo en esa base, no la
   punta del repositorio: otro archivo que cambió no es un conflicto; el
   objetivo que cambió sí, y se rehúsa sin escribir.
6. Escribir el cuerpo tal cual lo cerró el ítem y correr los gates del
   consumidor por sus envoltorios de ``bin/`` —``check_rst_sintaxis``,
   ``check_vocabulario_prosa``, ``check-artefactos-minimos``— y después el
   ``pre-commit`` del propio consumidor, activado con ``core.hooksPath`` en
   el commit. Ninguno se reimplementa; un rojo de cualquiera rehúsa.
7. Commit por pathspec con la identidad declarada, y avance de la rama del
   publicador por comparar-e-intercambiar (``update-ref`` con valor previo):
   si otro objetivo la movió entre la base y el avance, se reintenta desde
   la base nueva, con el blob comprobado otra vez.

Cómo lo hace la referencia
--------------------------
El ejecutable crea sus worktrees con ``worktree add --detach <dir> <base>``
y los retira con ``worktree remove --force`` (``chunk-rbjwg9yh.js:29``,
``chunk-csayct82.js:988``); se porta igual. Su concurrencia optimista sobre
archivos compara ``mtime`` y tamaño (``lastReadFileStats``,
``chunk-t6pwageh.js:61``); aquí se diverge a propósito y se compara el id de
blob, porque el objetivo es contenido versionado y su ``mtime`` cambia con
cada checkout.

*Métrica:* el blob del objetivo en la base, los códigos de salida de los
gates y del commit, y el resultado del ``update-ref`` condicional.
*Ciega a:* un cambio del objetivo en la rama principal del consumidor que
nadie llevó a la rama del publicador; la base es la rama del publicador
desde que existe.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath

from docs import initiative_placement as placement
from paths import reach
from session import document_intent as intents
from session import pool_lifecycle as lifecycle
from session import shared_lock
from verify.commit_identity import IdentityUndeclared, declared_identities

PUBLISHER_BRANCH = "docs-publisher"
PUBLISHED_SUFFIX = ".published"
#: Reintentos cuando OTRO objetivo avanzó la rama entre la base y el ``update-ref``.
MAX_PUBLISH_ATTEMPTS = 3
#: El valor previo con que ``update-ref`` exige que la rama aún no exista.
ZERO_OID = "0" * 40
HOOKS_DIR = ".githooks"
PRE_COMMIT_HOOK = "pre-commit"
LOCKS_DIR = Path("docs-publisher") / "locks"
#: Los gates del consumidor, por su envoltorio de ``bin/`` y en este orden.
GATE_NAMES = ("check_rst_sintaxis", "check_vocabulario_prosa", "check-artefactos-minimos")
EXIT_OK = 0
EXIT_UNMEASURED = 2
EXIT_REFUSED = lifecycle.EXIT_REJECTED


class PublisherError(Exception):
    """No se pudo medir: el consumidor, su iniciativa o su hook no están donde deben."""


class PublishRefused(Exception):
    """La publicación no procede; el ítem cerrado queda como estaba."""


class PlacementError(PublishRefused):
    """La iniciativa no existe en la raíz que la intención nombra."""


class BlobConflictError(PublishRefused):
    """El objetivo ya no es el que el ítem leyó."""


class GateFailedError(PublishRefused):
    """Un gate del consumidor salió rojo sobre el documento."""


class CommitRefusedError(PublishRefused):
    """El commit no se hizo: el pre-commit del consumidor lo rehusó, o git."""


class BranchMovedError(PublishRefused):
    """La rama del publicador avanzó más veces de las que se reintenta."""


@dataclass(frozen=True)
class PublishResult:
    item: str
    generation: int
    run_id: str
    consumer: str
    target: str
    branch: str
    commit: str
    blob_before: str | None
    blob_after: str
    published_at: str

    def to_json(self) -> dict[str, object]:
        return asdict(self)


def _git(repo: Path, *args: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, env=env)


def consumer_root_of(intent: intents.DocumentIntent) -> Path:
    """La raíz del consumidor por ``reach``; tiene que ser un árbol de trabajo de git."""
    try:
        root = reach.root(intent.consumer)
    except (KeyError, reach.ReachRootError) as error:
        raise PublisherError(f"no se resuelve el consumidor {intent.consumer!r}: {error}") from None
    if _git(root, "rev-parse", "--is-inside-work-tree").returncode != 0:
        raise PublisherError(f"el consumidor {intent.consumer!r} en {root} no es un árbol de trabajo de git")
    return root


def assert_initiative_in_place(consumer: Path, intent: intents.DocumentIntent) -> None:
    """La iniciativa existe bajo la raíz que el objetivo nombra; no se crea ninguna."""
    try:
        survey = placement.survey_initiative(consumer, intent.initiative)
        verdict = placement.decide_placement(survey, intent.submodule)
    except (placement.ManagementRootError, placement.SurveyTruncatedError) as error:
        raise PublisherError(f"no se pudo ubicar la iniciativa {intent.initiative}: {error}") from None
    if verdict.verdict == placement.IN_PLACE:
        return
    located = ", ".join(hit.path.as_posix() for hit in verdict.hits) or "en ninguna raíz"
    raise PlacementError(f"la iniciativa {intent.initiative} no está bajo pm/{intent.submodule}/ "
                         f"({verdict.verdict}: {located}); el publicador no la crea")


def lock_target(consumer: Path, target: str) -> Path:
    """La clave del candado de un objetivo, en el runtime para no ensuciar el consumidor."""
    key = hashlib.sha1(str((consumer / target).resolve()).encode()).hexdigest()
    locks = lifecycle.runtime_root() / LOCKS_DIR
    locks.mkdir(parents=True, exist_ok=True)
    return locks / key


def base_commit(consumer: Path, branch: str) -> tuple[str, bool]:
    """La punta de la rama del publicador y si existe; sin ella, ``HEAD`` del consumidor."""
    tip = _git(consumer, "rev-parse", "--verify", "--quiet", f"refs/heads/{branch}")
    if tip.returncode == 0:
        return tip.stdout.strip(), True
    return _git(consumer, "rev-parse", "HEAD").stdout.strip(), False


def assert_branch_not_checked_out(consumer: Path, branch: str) -> None:
    """Avanzar una rama que algún worktree tiene activa desalinearía ese worktree."""
    listing = _git(consumer, "worktree", "list", "--porcelain").stdout.splitlines()
    if f"branch refs/heads/{branch}" in listing:
        raise PublisherError(f"la rama {branch} está activa en un worktree del consumidor; "
                             "el publicador no la mueve por debajo de un checkout")


@contextmanager
def temporary_worktree(consumer: Path, base: str) -> Iterator[Path]:
    """Un worktree desprendido desde ``base``; se retira siempre, también si algo falla."""
    directory = Path(tempfile.mkdtemp(prefix="docs-publisher-"))
    added = _git(consumer, "worktree", "add", "-q", "--detach", str(directory), base)
    if added.returncode != 0:
        shutil.rmtree(directory, ignore_errors=True)
        raise PublisherError(f"no se pudo crear el worktree temporal: {added.stderr.strip()}")
    try:
        yield directory
    finally:
        removed = _git(consumer, "worktree", "remove", "--force", str(directory))
        if removed.returncode != 0:
            shutil.rmtree(directory, ignore_errors=True)
            _git(consumer, "worktree", "prune")


def blob_at(worktree: Path, revision: str, target: str) -> str | None:
    """El id de blob del objetivo en una revisión, o ``None`` si allí no existe."""
    found = _git(worktree, "rev-parse", "--verify", "--quiet", f"{revision}:{target}")
    return found.stdout.strip() if found.returncode == 0 else None


def assert_expected_blob(intent: intents.DocumentIntent, current: str | None) -> None:
    if current != intent.expected_blob:
        raise BlobConflictError(f"el objetivo {intent.target} tiene el blob {current or 'ausente'} "
                                f"y la intención esperaba {intent.expected_blob or 'ausente'}")


def write_document(worktree: Path, target: str, body: str) -> Path:
    path = worktree / target
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    return path


def gate_commands(bin_dir: Path, document: Path) -> list[list[str]]:
    """Cada gate por su envoltorio; los de archivo reciben el documento, el de iniciativas no."""
    per_file = [str(bin_dir / name) for name in GATE_NAMES[:2]]
    return ([["bash", wrapper, "--strict", str(document)] for wrapper in per_file]
            + [["bash", str(bin_dir / GATE_NAMES[2]), "--strict"]])


def run_gates(bin_dir: Path, worktree: Path, document: Path) -> None:
    for command in gate_commands(bin_dir, document):
        done = subprocess.run(command, cwd=worktree, capture_output=True, text=True)
        if done.returncode != 0:
            raise GateFailedError(f"{Path(command[1]).name} salió {done.returncode} sobre "
                                  f"{document.relative_to(worktree)}:\n{done.stdout}{done.stderr}")


def commit_environment(consumer: Path) -> dict[str, str]:
    """El entorno del commit con la identidad que el consumidor declara; sin declaración, el de git."""
    env = dict(os.environ)
    try:
        identities = declared_identities(start=consumer)
    except IdentityUndeclared:
        return env
    for role, prefix in (("author", "GIT_AUTHOR"), ("committer", "GIT_COMMITTER")):
        env[f"{prefix}_NAME"], env[f"{prefix}_EMAIL"] = identities[role]
    return env


def commit_message(intent: intents.DocumentIntent, blob_before: str | None) -> str:
    stem = PurePosixPath(intent.target).stem
    return (f"Publish {intent.document_kind} to {intent.initiative}\n\n"
            f"Document {stem} written by pool run {intent.source_run}, item "
            f"{intent.source_item}, generation {intent.source_generation}"
            f"{', snapshot ' + intent.source_snapshot if intent.source_snapshot else ''}.\n"
            f"Target {intent.target}; previous blob {blob_before or 'none'}.\n")


def commit_document(worktree: Path, target: str, message: str, env: dict[str, str]) -> str:
    """Commit por pathspec con los hooks del consumidor activos; devuelve su sha."""
    hooks = worktree / HOOKS_DIR
    if not (hooks / PRE_COMMIT_HOOK).is_file():
        raise PublisherError(f"el consumidor no trae {HOOKS_DIR}/{PRE_COMMIT_HOOK}: "
                             "sin su gate no se emite ningún commit")
    _git(worktree, "add", "--", target)
    done = _git(worktree, "-c", f"core.hooksPath={hooks}", "commit", "-q", "-m", message,
                "--", target, env=env)
    if done.returncode != 0:
        raise CommitRefusedError(f"el commit de {target} se rehusó (exit {done.returncode}):\n"
                                 f"{done.stdout}{done.stderr}")
    return _git(worktree, "rev-parse", "HEAD").stdout.strip()


def advance_branch(consumer: Path, branch: str, new: str, base: str, existed: bool) -> bool:
    """Comparar-e-intercambiar sobre la rama: sólo avanza si sigue en ``base``."""
    previous = base if existed else ZERO_OID
    done = _git(consumer, "update-ref", "-m", f"docs-publisher: {new}", f"refs/heads/{branch}",
                new, previous)
    return done.returncode == 0


def read_published(out_dir: Path, item: str) -> dict | None:
    path = out_dir / f"{item}{PUBLISHED_SUFFIX}"
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_published(out_dir: Path, result: PublishResult) -> None:
    shared_lock.write_atomic(out_dir / f"{result.item}{PUBLISHED_SUFFIX}",
                             json.dumps(result.to_json(), sort_keys=True) + "\n")


class DocumentationPublisher:
    """Publica la intención documental de UN ítem cerrado en el consumidor."""

    def __init__(self, out_dir: Path, item: str, *, bin_dir: Path | None = None,
                 branch: str = PUBLISHER_BRANCH):
        self.out_dir = Path(out_dir)
        self.item = item
        self.bin_dir = Path(bin_dir) if bin_dir else reach.thyrox_root() / "bin"
        self.branch = branch

    def publish(self) -> PublishResult:
        intent, manifest = intents.read_intent(self.out_dir, self.item)
        generation = int(manifest["generation"])
        previous = read_published(self.out_dir, self.item)
        if previous is not None and int(previous["generation"]) == generation:
            return PublishResult(**previous)
        consumer = consumer_root_of(intent)
        assert_initiative_in_place(consumer, intent)
        assert_branch_not_checked_out(consumer, self.branch)
        body = intents.read_body(self.out_dir, intent)
        with shared_lock.held(lock_target(consumer, intent.target),
                              run_id=str(manifest["run_id"]), step_id=f"item {self.item}"):
            result = self._publish_locked(consumer, intent, generation, body)
        write_published(self.out_dir, result)
        return result

    def _publish_locked(self, consumer: Path, intent: intents.DocumentIntent, generation: int,
                        body: str) -> PublishResult:
        for _attempt in range(MAX_PUBLISH_ATTEMPTS):
            base, existed = base_commit(consumer, self.branch)
            with temporary_worktree(consumer, base) as worktree:
                blob_before = blob_at(worktree, base, intent.target)
                assert_expected_blob(intent, blob_before)
                document = write_document(worktree, intent.target, body)
                run_gates(self.bin_dir, worktree, document)
                commit = commit_document(worktree, intent.target,
                                         commit_message(intent, blob_before), commit_environment(consumer))
                if advance_branch(consumer, self.branch, commit, base, existed):
                    return PublishResult(
                        item=self.item, generation=generation, run_id=intent.source_run,
                        consumer=intent.consumer, target=intent.target, branch=self.branch,
                        commit=commit, blob_before=blob_before,
                        blob_after=str(blob_at(worktree, commit, intent.target)),
                        published_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        raise BranchMovedError(f"la rama {self.branch} avanzó {MAX_PUBLISH_ATTEMPTS} veces mientras "
                               f"se publicaba {intent.target}; se rehúsa sin escribir")


def _write_intent_command(args: argparse.Namespace) -> int:
    """La cara del ítem: compone su intención con la procedencia que el pool le exportó."""
    try:
        provenance = intents.provenance_from_environment(dict(os.environ))
        intent = intents.DocumentIntent(
            consumer=args.consumer, initiative=args.initiative, document_kind=args.kind,
            target=args.target, expected_blob=args.expected_blob, body_artifact=args.body_artifact,
            source_run=str(provenance["source_run"]), source_item=str(provenance["source_item"]),
            source_generation=int(str(provenance["source_generation"])),
            source_snapshot=None if provenance["source_snapshot"] is None else str(provenance["source_snapshot"]))
        intents.write_intent(args.path, intent)
    except intents.IntentError as error:
        print(f"documentation_publisher: no se escribió la intención — {error}", file=sys.stderr)
        return EXIT_UNMEASURED
    return EXIT_OK


def _publish_command(args: argparse.Namespace) -> int:
    publisher = DocumentationPublisher(args.out_dir, args.item, bin_dir=args.bin, branch=args.branch)
    try:
        result = publisher.publish()
    except (intents.IntentError, PublishRefused, shared_lock.LockHeld) as error:
        print(f"documentation_publisher: REHÚSA — {error}", file=sys.stderr)
        return EXIT_REFUSED
    except PublisherError as error:
        print(f"documentation_publisher: {error}", file=sys.stderr)
        return EXIT_UNMEASURED
    print(result.commit)
    return EXIT_OK


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("publish", help="publica la intención de un ítem cerrado e imprime el commit")
    p.add_argument("out_dir", type=Path)
    p.add_argument("item")
    p.add_argument("--bin", type=Path, help="el bin/ con los envoltorios de los gates (por defecto el de thyrox)")
    p.add_argument("--branch", default=PUBLISHER_BRANCH, help="la rama del consumidor que avanza")
    p = sub.add_parser("write-intent", help="escribe la intención de un ítem con la procedencia del entorno")
    p.add_argument("path", type=Path)
    p.add_argument("--consumer", required=True)
    p.add_argument("--initiative", required=True)
    p.add_argument("--kind", required=True, choices=sorted(intents.DOCUMENT_KINDS))
    p.add_argument("--target", required=True)
    p.add_argument("--body-artifact", required=True)
    p.add_argument("--expected-blob", default=None)
    args = parser.parse_args(argv)
    if args.command == "write-intent":
        return _write_intent_command(args)
    return _publish_command(args)


if __name__ == "__main__":
    sys.exit(main())
