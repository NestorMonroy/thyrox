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
from session.snapshot_store import SnapshotError, read_manifest

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


def recover_to_worktree(repo: Path, run: str, item: str, generation: int, *,
                        into: Path | None = None) -> Path:
    """Abre la foto en un worktree temporal y desacoplado; el árbol del usuario no cambia."""
    manifest = read_manifest(run, item, generation)
    if manifest is None:
        raise RecoveryError(f"no hay foto de {run}/{item}/{generation}")
    if not manifest.is_intact():
        raise RecoveryError(f"el manifiesto de {run}/{item}/{generation} no coincide con su sha256")
    target = Path(into) if into else recovery_path(run, item, generation)
    if target.exists():
        raise RecoveryError(f"{target} ya existe; no se reutiliza un destino de recuperación")
    target.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(["git", "-C", str(repo), "worktree", "add", "-q", "--detach", str(target),
                             manifest.snapshot_commit], capture_output=True, text=True)
    if result.returncode != 0:
        raise RecoveryError(f"git worktree add salió {result.returncode}: {result.stderr.strip()}")
    return target


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
