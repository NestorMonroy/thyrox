"""Qué quedó de un ítem de pool, y cómo recuperarlo sin pisar a nadie.

Por qué existe
--------------
Un pool que muere, o un ítem cancelado, deja dos rastros: su runtime
(``pool_lifecycle``) y, si se tomó, su foto en git (``snapshot_store``). La
recuperación tiene que poder leer los dos y devolver el trabajo al usuario
SIN tocar el árbol donde el usuario sigue trabajando. Por eso la forma por
defecto es un worktree temporal y desacoplado sobre la foto: el trabajo
reaparece al lado, y quien recupera decide qué integra.

Clasificación
-------------
``classify`` reduce el estado del ítem a lo que decide qué se puede hacer:

- ``active``: su dueño vive y el ítem aún corre;
- ``closing``: su dueño vive y está cerrando o publicando;
- ``abandoned-recoverable``: el dueño murió sin publicar; su runtime existe;
- ``partially-published``: una publicación se interrumpió; ``reconcile`` la
  completa;
- ``closed``: publicado y coherente.

Tomar la propiedad
-------------------
``recover_to_worktree`` sólo lee la foto; no dice nada sobre quién es el
dueño del ítem en ``pool_lifecycle``. Cuando la recuperación DECIDE
continuar el trabajo de un ítem ``abandoned-recoverable``, ``claim_and_recover``
toma la propiedad con ``pool_lifecycle.claim`` ANTES de abrir el worktree: el
ítem pasa a una generación mayor que la abandonada, y cualquier actor que
siga citando la generación vieja queda rechazado con ``StaleGenerationError``
en su próxima transición o publicación, sin que le haga falta enterarse del
worktree nuevo. El destino y la rama se nombran con la generación tomada;
el contenido que reproducen sigue siendo el de la foto de la generación
abandonada, que es la última que existe.

Lo que nunca hace
-----------------
No borra un runtime sin publicar: ``prune`` rehúsa mientras quede un ítem de
la ejecución que no esté ``closed``. Y no sobrescribe el árbol de trabajo
salvo que se pida ``restore_in_place`` con ``confirm=True``.

*Ciega a:* un trabajo que el ítem hizo fuera de su árbol y de su runtime.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from session import pool_lifecycle as lc
from session.snapshot_store import SnapshotError, SnapshotManifest, read_manifest

ACTIVE = "active"
CLOSING = "closing"
ABANDONED_RECOVERABLE = "abandoned-recoverable"
PARTIALLY_PUBLISHED = "partially-published"
CLOSED = "closed"

EXIT_REFUSED = 5


class RecoveryError(Exception):
    """La recuperación pedida pondría en riesgo trabajo que no se ha guardado."""


def classify(live_dir: Path, out_dir: Path, item: str) -> str:
    state = lc.read_state(live_dir, item)
    if state is None:
        if lc.is_closed(out_dir, item):
            return CLOSED
        raise RecoveryError(f"el ítem {item} no tiene estado en {live_dir} ni cierre en {out_dir}")
    if state.state == lc.CLOSED:
        return CLOSED
    if state.state in (lc.PARTIALLY_PUBLISHED,):
        return PARTIALLY_PUBLISHED
    owner_alive = lc.pid_alive(state.owner_pid)
    if state.state == lc.PUBLISHING:
        return CLOSING if owner_alive else PARTIALLY_PUBLISHED
    if state.state == lc.ABANDONED_RECOVERABLE:
        return ABANDONED_RECOVERABLE
    if state.state == lc.CLOSING:
        return CLOSING if owner_alive else ABANDONED_RECOVERABLE
    return ACTIVE if owner_alive else ABANDONED_RECOVERABLE


def recovery_path(run: str, item: str, generation: int) -> Path:
    return lc.runtime_root() / "recovery" / f"{run}-{item}-g{generation}"


def recovery_branch(run: str, item: str, generation: int) -> str:
    return f"refs/heads/thyrox/recovery/{run}/{item}/{generation}"


def _open_worktree_from_manifest(repo: Path, manifest: SnapshotManifest, target: Path, branch: str, *,
                                 restore_index: bool) -> Path:
    """Crea el worktree y la rama de recuperación, y reproduce la foto en su árbol.

    Deja el worktree como estaba el del ítem al tomar la foto: ``HEAD`` en
    ``base_head``, el índice en ``original_index_tree`` y los archivos del
    ``snapshot_commit``. Así lo preparado y lo no preparado siguen separados.
    Compartida por ``recover_to_worktree`` y ``claim_and_recover``: la única
    diferencia entre ambas es de dónde sale la generación con la que se nombran
    el destino y la rama.
    """
    if target.exists():
        raise RecoveryError(f"{target} ya existe; no se reutiliza un destino de recuperación")
    target.parent.mkdir(parents=True, exist_ok=True)
    base = manifest.base_head or manifest.snapshot_commit
    steps = [["git", "-C", str(repo), "worktree", "add", "-q", "-b", branch, str(target), base]]
    if restore_index:
        steps.append(["git", "-C", str(target), "read-tree", manifest.original_index_tree])
    steps.append(["git", "-C", str(target), "restore", f"--source={manifest.snapshot_commit}",
                  "--worktree", "--", "."])
    for command in steps:
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise RecoveryError(f"{' '.join(command[3:5])} salió {result.returncode}: {result.stderr.strip()}")
    return target


def recover_to_worktree(repo: Path, run: str, item: str, generation: int, *,
                        into: Path | None = None, restore_index: bool = True) -> Path:
    """Reproduce la foto en un worktree y una rama temporales; el árbol del usuario no cambia.

    No toma la propiedad del ítem en ``pool_lifecycle``: es la lectura simple
    de una foto ya tomada, y su destino se nombra con la misma generación que
    la foto. ``claim_and_recover`` es la forma que sí toma la propiedad antes
    de abrir el worktree. ``restore_index`` existe sólo como control de
    anulación.
    """
    manifest = read_manifest(run, item, generation)
    if manifest is None:
        raise RecoveryError(f"no hay foto de {run}/{item}/{generation}")
    if not manifest.is_intact():
        raise RecoveryError(f"el manifiesto de {run}/{item}/{generation} no coincide con su sha256")
    target = Path(into) if into else recovery_path(run, item, generation)
    branch = recovery_branch(run, item, generation).removeprefix("refs/heads/")
    return _open_worktree_from_manifest(repo, manifest, target, branch, restore_index=restore_index)


def claim_and_recover(repo: Path, live_dir: Path, out_dir: Path, run: str, item: str,
                      owner_pid: int, *, into: Path | None = None, restore_index: bool = True) -> Path:
    """La recuperación decide continuar: toma el ítem antes de abrir su foto.

    ``pool_lifecycle.claim`` mueve el ítem a una generación mayor que la
    abandonada y que la publicada ANTES de abrir ningún worktree: desde ese
    momento cualquier actor que siga citando la generación abandonada queda
    rechazado con ``StaleGenerationError`` en su próxima transición o
    publicación, exista o no exista ya el worktree de recuperación. El destino
    y la rama se nombran con la generación nueva; el contenido que reproducen
    sigue siendo el de la última foto tomada, la de la generación abandonada.
    Sólo se puede tomar un ítem ``ABANDONED_RECOVERABLE`` (la precondición de
    ``claim``); si no hay foto íntegra de la generación abandonada, se rehúsa
    sin tomar la propiedad. ``recover_to_worktree`` es la forma sin esta toma
    de propiedad, para una foto que ya se sabe cerrada y sin dueño que disputar.
    """
    stale = lc.read_state(live_dir, item)
    if stale is None:
        raise RecoveryError(f"el ítem {item} no tiene estado en {live_dir}")
    manifest = read_manifest(run, item, stale.generation)
    if manifest is None:
        raise RecoveryError(f"no hay foto de {run}/{item}/{stale.generation}")
    if not manifest.is_intact():
        raise RecoveryError(f"el manifiesto de {run}/{item}/{stale.generation} no coincide con su sha256")
    try:
        claimed = lc.claim(live_dir, out_dir, item, owner_pid)
    except lc.LifecycleError as error:
        raise RecoveryError(str(error)) from error
    target = Path(into) if into else recovery_path(run, item, claimed.generation)
    branch = recovery_branch(run, item, claimed.generation).removeprefix("refs/heads/")
    return _open_worktree_from_manifest(repo, manifest, target, branch, restore_index=restore_index)


def restore_in_place(repo: Path, run: str, item: str, generation: int, *, confirm: bool = False) -> None:
    """Sobrescribe el árbol de ``repo`` con la foto. Sólo con ``confirm=True``.

    Es la operación destructiva que ``recover_to_worktree`` evita: los cambios
    del árbol que la foto no contiene se pierden.
    """
    if not confirm:
        raise RecoveryError("restaurar en el árbol sobrescribe cambios; pide confirm=True o usa un worktree")
    manifest = read_manifest(run, item, generation)
    if manifest is None or not manifest.is_intact():
        raise RecoveryError(f"no hay foto íntegra de {run}/{item}/{generation}")
    result = subprocess.run(["git", "-C", str(repo), "checkout", manifest.snapshot_commit, "--", "."],
                            capture_output=True, text=True)
    if result.returncode != 0:
        raise RecoveryError(f"git checkout salió {result.returncode}: {result.stderr.strip()}")


def prune(live_dir: Path, out_dir: Path) -> None:
    """Retira el runtime de una ejecución sólo si todos sus ítems están cerrados."""
    pending = []
    for state_file in live_dir.glob(f"*{lc.STATE_SUFFIX}"):
        item = state_file.name[: -len(lc.STATE_SUFFIX)]
        if classify(live_dir, out_dir, item) != CLOSED:
            pending.append(item)
    if pending:
        raise RecoveryError(f"el runtime {live_dir} tiene ítems sin publicar: {' '.join(sorted(pending))}")
    shutil.rmtree(live_dir)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("classify", help="el estado recuperable de un ítem")
    p.add_argument("live_dir", type=Path)
    p.add_argument("out_dir", type=Path)
    p.add_argument("item")
    p = sub.add_parser("recover", help="abre la foto en un worktree temporal")
    p.add_argument("repo", type=Path)
    p.add_argument("run")
    p.add_argument("item")
    p.add_argument("generation", type=int)
    p.add_argument("--into", type=Path)
    p = sub.add_parser("prune", help="retira el runtime de una ejecución ya publicada")
    p.add_argument("live_dir", type=Path)
    p.add_argument("out_dir", type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == "classify":
            print(classify(args.live_dir, args.out_dir, args.item))
        elif args.command == "recover":
            print(recover_to_worktree(args.repo, args.run, args.item, args.generation, into=args.into))
        else:
            prune(args.live_dir, args.out_dir)
    except (RecoveryError, SnapshotError, json.JSONDecodeError) as error:
        print(f"recovery_controller: REHÚSA — {error}", file=sys.stderr)
        return EXIT_REFUSED
    return 0


if __name__ == "__main__":
    sys.exit(main())
