"""La foto de un árbol de trabajo guardada en objetos de git, sin tocarlo.

Por qué existe
--------------
Un ítem de pool que se cancela o muere a mitad deja su trabajo en un árbol de
trabajo. Antes de hacer nada con ese árbol hay que poder guardarlo tal como
está —lo preparado para commit, lo modificado sin preparar, lo nuevo sin
seguir, lo binario— sin cambiar ``HEAD``, la rama ni el índice de quien lo
usa. ``git stash`` no sirve: ``refs/stash`` es compartido entre worktrees y un
ítem pisaría el de otro.

Cómo lo guarda
--------------
1. ``original_index_tree``: el árbol de lo preparado, escrito desde una COPIA
   del índice real. ``git write-tree`` sobre el índice real actualizaría su
   extensión de caché; sobre la copia no lo toca.
2. El árbol de trabajo completo: otra copia del índice, ``git add -A`` sobre
   ella con ``GIT_INDEX_FILE`` y ``git write-tree``.
3. Dos commits con ``git commit-tree``: uno del índice sobre ``HEAD`` y el de
   la foto con dos padres, ``HEAD`` y el del índice, para que los dos árboles
   queden alcanzables desde una sola ref.
4. La ref ``refs/thyrox/snapshots/<run>/<item>/<gen>`` se crea con
   ``git update-ref <ref> <commit> ""``: el valor viejo vacío exige que no
   exista, así que dos fotos nunca se reemplazan entre sí, ni desde dos
   worktrees del mismo repositorio.
5. Un manifiesto JSON con ``run``, ``item``, ``generation``, ``base_head``,
   ``snapshot_commit``, ``original_index_tree``, ``created_at`` y el
   ``sha256`` de esos campos, junto al runtime.

*Ciega a:* lo ignorado por ``.gitignore`` —``add -A`` lo respeta, y es lo que
se quiere: el runtime y los cachés no son trabajo del ítem— y a los
submódulos, cuyo contenido no entra en el árbol del repositorio que los
contiene.
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
from dataclasses import asdict, dataclass
from pathlib import Path

from session.pool_lifecycle import runtime_root

REF_PREFIX = "refs/thyrox/snapshots"
#: Identidad de los commits de foto: no se publican ni se integran.
SNAPSHOT_IDENTITY = {
    "GIT_AUTHOR_NAME": "thyrox-snapshot", "GIT_AUTHOR_EMAIL": "thyrox-snapshot@localhost",
    "GIT_COMMITTER_NAME": "thyrox-snapshot", "GIT_COMMITTER_EMAIL": "thyrox-snapshot@localhost",
}
EXIT_REF_EXISTS = 5


class SnapshotError(Exception):
    """La foto no se pudo tomar; el árbol quedó como estaba."""


class SnapshotRefExistsError(SnapshotError):
    """La ref de esa generación ya existe: una foto no reemplaza a otra."""


class SnapshotSupersededError(SnapshotError):
    """Ya existe la foto de una generación posterior del mismo ítem (I4)."""


@dataclass(frozen=True)
class SnapshotManifest:
    run: str
    item: str
    generation: int
    base_head: str
    snapshot_commit: str
    original_index_tree: str
    created_at: str
    sha256: str = ""

    def digest(self) -> str:
        fields = {k: v for k, v in asdict(self).items() if k != "sha256"}
        return hashlib.sha256(json.dumps(fields, sort_keys=True).encode()).hexdigest()

    def sealed(self) -> SnapshotManifest:
        return SnapshotManifest(**{**asdict(self), "sha256": self.digest()})

    def is_intact(self) -> bool:
        return self.sha256 == self.digest()


def snapshot_ref(run: str, item: str, generation: int) -> str:
    return f"{REF_PREFIX}/{run}/{item}/{generation}"


def _git(repo: Path, *args: str, env: dict[str, str] | None = None, check: bool = True) -> str:
    result = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True,
                            env={**os.environ, **(env or {})})
    if check and result.returncode != 0:
        raise SnapshotError(f"git {' '.join(args)} salió {result.returncode}: {result.stderr.strip()}")
    return result.stdout.strip()


def newer_generations(repo: Path, run: str, item: str, generation: int) -> list[int]:
    """Generaciones del mismo ítem con foto, posteriores a ``generation``."""
    listing = _git(repo, "for-each-ref", "--format=%(refname)", f"{REF_PREFIX}/{run}/{item}/")
    found = (ref.rsplit("/", 1)[-1] for ref in listing.splitlines())
    return sorted(int(name) for name in found if name.isdigit() and int(name) > generation)


def _index_path(repo: Path) -> Path:
    return Path(_git(repo, "rev-parse", "--path-format=absolute", "--git-path", "index"))


def _copy_index(repo: Path, into: Path) -> Path:
    """Copia el índice real; si aún no existe (repositorio vacío) deja la copia sin crear."""
    source = _index_path(repo)
    target = into / "index"
    if source.exists():
        shutil.copy2(source, target)
    return target


def manifest_path(run: str, item: str, generation: int) -> Path:
    return runtime_root() / "snapshots" / run / item / f"{generation}.json"


def take_snapshot(repo: Path, run: str, item: str, generation: int, *,
                  capture_worktree: bool = True, create_only: bool = True,
                  refuse_superseded: bool = True, advance_from: str | None = None) -> SnapshotManifest:
    """Guarda el árbol de trabajo y el índice de ``repo`` bajo su ref, sin tocarlos.

    Si el ítem ya tiene la foto de una generación posterior, su dueño anterior
    fue desplazado y la foto se rehúsa sin escribir ref ni manifiesto (I4).

    ``capture_worktree``, ``create_only`` y ``refuse_superseded`` existen sólo
    como controles de anulación: sin el primero la foto se queda en lo
    preparado; sin el segundo una ref existente se reemplaza; sin el tercero
    la generación desplazada escribe su foto.

    ``advance_from`` es la foto periódica de un ítem que sigue corriendo: la
    ref de su generación avanza sólo si todavía apunta a ese commit, con el
    valor viejo de ``update-ref`` como comparación atómica. Una ref ausente o
    movida por otro actor se rehúsa, así que ninguna foto reemplaza a otra que
    no conocía.

    *Ciega a:* una foto de la generación posterior creada entre la consulta y
    ``update-ref``. La frontera que cierra esa ventana es la generación del
    estado del ítem, que el pool comprueba antes de tomar la foto.
    """
    repo = Path(repo).resolve()
    ref = snapshot_ref(run, item, generation)
    if refuse_superseded:
        newer = newer_generations(repo, run, item, generation)
        if newer:
            raise SnapshotSupersededError(
                f"{run}/{item} ya tiene la foto de la generación {newer[-1]}; "
                f"la generación {generation} ya no puede tomar la suya")
    base_head = _git(repo, "rev-parse", "--verify", "--quiet", "HEAD", check=False)
    with tempfile.TemporaryDirectory(prefix="thyrox-snapshot-") as scratch:
        scratch_dir = Path(scratch)
        index_copy = _copy_index(repo, scratch_dir)
        index_env = {"GIT_INDEX_FILE": str(index_copy)}
        original_index_tree = _git(repo, "write-tree", env=index_env)
        work_dir = scratch_dir / "work"
        work_dir.mkdir()
        work_index = _copy_index(repo, work_dir)
        work_env = {"GIT_INDEX_FILE": str(work_index)}
        if capture_worktree:
            _git(repo, "add", "-A", env=work_env)
        worktree_tree = _git(repo, "write-tree", env=work_env)
    parents = ["-p", base_head] if base_head else []
    message = f"thyrox snapshot {run}/{item}/{generation}"
    index_commit = _git(repo, "commit-tree", original_index_tree, *parents, "-m", f"{message} (index)",
                        env=SNAPSHOT_IDENTITY)
    snapshot_commit = _git(repo, "commit-tree", worktree_tree, *parents, "-p", index_commit,
                           "-m", message, env=SNAPSHOT_IDENTITY)
    update = ["update-ref", "-m", message, ref, snapshot_commit]
    if advance_from is not None:
        update.append(advance_from)
    elif create_only:
        update.append("")
    result = subprocess.run(["git", "-C", str(repo), *update], capture_output=True, text=True)
    if result.returncode != 0:
        if _git(repo, "rev-parse", "--verify", "--quiet", ref, check=False):
            raise SnapshotRefExistsError(f"la foto {ref} ya existe; no se reemplaza")
        raise SnapshotError(f"git update-ref salió {result.returncode}: {result.stderr.strip()}")
    manifest = SnapshotManifest(run=run, item=item, generation=generation, base_head=base_head,
                                snapshot_commit=snapshot_commit, original_index_tree=original_index_tree,
                                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())).sealed()
    path = manifest_path(run, item, generation)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    tmp.write_text(json.dumps(asdict(manifest), sort_keys=True) + "\n")
    os.replace(tmp, path)
    return manifest


def read_manifest(run: str, item: str, generation: int) -> SnapshotManifest | None:
    try:
        data = json.loads(manifest_path(run, item, generation).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    return SnapshotManifest(**data)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("take", help="guarda la foto de un árbol de trabajo")
    p.add_argument("repo", type=Path)
    p.add_argument("run")
    p.add_argument("item")
    p.add_argument("generation", type=int)
    p.add_argument("--advance-from", metavar="COMMIT",
                   help="avanza la ref de la generación sólo si todavía apunta a COMMIT")
    p = sub.add_parser("show", help="imprime el manifiesto de una foto")
    p.add_argument("run")
    p.add_argument("item")
    p.add_argument("generation", type=int)
    args = parser.parse_args(argv)
    try:
        if args.command == "take":
            manifest = take_snapshot(args.repo, args.run, args.item, args.generation,
                                     advance_from=args.advance_from)
            print(json.dumps(asdict(manifest), sort_keys=True))
        else:
            manifest = read_manifest(args.run, args.item, args.generation)
            if manifest is None:
                print("snapshot_store: no hay manifiesto de esa foto", file=sys.stderr)
                return 1
            if not manifest.is_intact():
                print("snapshot_store: el manifiesto no coincide con su sha256", file=sys.stderr)
                return 2
            print(json.dumps(asdict(manifest), sort_keys=True))
    except (SnapshotRefExistsError, SnapshotSupersededError) as error:
        print(f"snapshot_store: REHÚSA — {error}", file=sys.stderr)
        return EXIT_REF_EXISTS
    except SnapshotError as error:
        print(f"snapshot_store: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
