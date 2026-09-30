"""La huella del árbol que una suite mide, para saber si cambió mientras medía.

Una suite larga mide un árbol que puede cambiar mientras corre: una edición
del orquestador, un commit de otro escritor, un mutante que otra suite deja
a medias. Si el árbol del final no es el del principio, el veredicto no es
atribuible a ningún estado, y publicarlo como rojo o verde es afirmar sobre
un árbol que no existió. `tests/run.sh` toma la huella al empezar y al
terminar, y declara el veredicto «no atribuible» si difieren.

La huella es un sha256 sobre: HEAD, el diff de lo versionado contra HEAD, y
el nombre y el contenido de cada archivo nuevo sin versionar — todo dentro
del ALCANCE (``src``, ``tests``, ``bin``), que es lo que la suite mide. Lo
que la propia medición escribe fuera —``.claude/jobs``, sus logs— y lo
ignorado por ``.gitignore`` no cuentan.

Métrica: el estado versionado y el nuevo dentro del alcance, en dos instantes.
Ciega a: una edición que se deshace antes del final —la huella vuelve a ser
la misma—, y a lo que cambie fuera del alcance y la suite sí lea.
"""
from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

#: Lo que la suite mide; fuera de aquí escribe la propia medición.
SCOPE = ("src", "tests", "bin")


class NotARepository(Exception):
    """El directorio no es un árbol de git: no hay estado que fijar."""


def _git(repo: Path, *args: str) -> bytes:
    done = subprocess.run(["git", "-C", str(repo), *args], capture_output=True)
    if done.returncode != 0:
        raise NotARepository(f"{repo}: {done.stderr.decode(errors='replace').strip()}")
    return done.stdout


def fingerprint(repo: Path, scope: tuple[str, ...] = SCOPE) -> str:
    """sha256 de HEAD, del diff versionado y de lo nuevo, dentro del alcance."""
    repo = Path(repo)
    if not repo.is_dir():
        raise NotARepository(f"{repo}: no existe")
    _git(repo, "rev-parse", "--show-toplevel")
    digest = hashlib.sha256()
    digest.update(_git(repo, "rev-parse", "HEAD"))
    digest.update(_git(repo, "diff", "HEAD", "--binary", "--", *scope))
    untracked = _git(repo, "ls-files", "--others", "--exclude-standard", "-z", "--", *scope)
    for name in sorted(n for n in untracked.split(b"\0") if n):
        digest.update(name + b"\0")
        try:
            digest.update(hashlib.sha256((repo / name.decode()).read_bytes()).digest())
        except OSError:
            digest.update(b"<ilegible>")
    return digest.hexdigest()


def main(argv: list[str]) -> int:
    repo = Path(argv[0]) if argv else Path.cwd()
    try:
        print(fingerprint(repo))
    except NotARepository as error:
        print(f"tree_fingerprint: NO se pudo fijar el estado — {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
