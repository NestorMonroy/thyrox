#!/usr/bin/env python3
"""Cuánto pesa en la historia un archivo que cambia en cada sesión.

El sujeto tipico es un SQLite versionado: cada turno produce una version nueva,
y su coste no es el tamaño del archivo sino la suma de todas sus versiones en
el object store. Medido sobre ``kaupamex-docs``: 292 versiones del store de
agentes ocupaban 355.5 MiB en disco, el 36.2 % de todos sus blobs.

Qué mide, y por qué cada eje
-----------------------------

``clear_bytes``   la suma en claro — lo que ocuparia sin compresion ni delta.
``disk_bytes``    lo que de verdad ocupa, con delta y zlib aplicados.
``loose``/``packed``  la particion que decide si ``repack`` tiene trabajo: un
                  objeto suelto no tiene delta **por construccion**, asi que
                  cada version suelta paga su tamaño entero.
``share``         la cuota sobre TODOS los blobs del repo.

El denominador se mide, no se codifica
---------------------------------------

El comando manual del que nace este modulo llevaba el total escrito a mano
(``982.6``). Un cociente tiene dos operandos, y el defecto se cuela por el que
nadie audita: se audita el tratamiento —que es lo nuevo— y la linea base se
toma como suelo. Aqui los dos lados salen del mismo recorrido.

Qué NO mide
------------

No dice cuanto recuperaria un ``repack``: para eso hace falta ejecutarlo, y su
decision es de ``pack_headroom``. Tampoco distingue una version «real» de una
reescritura mecanica — dos commits que dejan el archivo byte a byte igual
producen un solo blob, y este modulo cuenta blobs, no commits.
"""
from __future__ import annotations

import argparse
import dataclasses
import pathlib
import subprocess
import sys

REFUSAL = 2


@dataclasses.dataclass(frozen=True)
class Footprint:
    """La huella de un pathspec en el object store de su clon."""

    pathspec: str
    versions: int
    clear_bytes: int
    disk_bytes: int
    largest_bytes: int
    loose: int
    packed: int
    total_disk_bytes: int

    @property
    def share(self) -> float:
        """Cuota sobre todos los blobs. Cero si el repo no tiene ninguno."""
        return self.disk_bytes / self.total_disk_bytes if self.total_disk_bytes else 0.0

    @property
    def mean_clear_bytes(self) -> float:
        return self.clear_bytes / self.versions if self.versions else 0.0


def _run(root: pathlib.Path, *args: str) -> str:
    done = subprocess.run(["git", *args], cwd=root, capture_output=True,
                          text=True, check=True)
    return done.stdout


def _is_clone(root: pathlib.Path) -> bool:
    try:
        _run(root, "rev-parse", "--git-dir")
    except (subprocess.CalledProcessError, FileNotFoundError, NotADirectoryError):
        return False
    return True


def _blob_oids(root: pathlib.Path, pathspec: str) -> set[str]:
    """Los oid distintos que el pathspec ha tenido en toda la historia."""
    listing = _run(root, "rev-list", "--all", "--objects")
    wanted = set()
    for line in listing.splitlines():
        oid, _, path = line.partition(" ")
        if path and pathspec in path:
            wanted.add(oid)
    return wanted


def _describe(root: pathlib.Path, oids: set[str]) -> list[tuple[int, int, bool]]:
    """Para cada oid: tamaño en claro, tamaño en disco y si está suelto.

    ``objectsize:disk`` sobre un objeto suelto devuelve su tamaño completo —
    los sueltos no llevan delta. El discriminador honesto es el tipo de
    almacenamiento, que ``%(objectsize:disk)`` no expone; se deriva del
    listado de sueltos, que es lo unico que lo dice sin ambiguedad.
    """
    if not oids:
        return []
    query = "\n".join(sorted(oids))
    fmt = "%(objecttype) %(objectsize) %(objectsize:disk)"
    done = subprocess.run(["git", "cat-file", f"--batch-check={fmt}"],
                          cwd=root, input=query, capture_output=True,
                          text=True, check=True)
    loose = _loose_oids(root)
    rows = []
    for oid, line in zip(sorted(oids), done.stdout.splitlines()):
        kind, clear, disk = line.split()
        if kind != "blob":
            continue
        rows.append((int(clear), int(disk), oid in loose))
    return rows


def _loose_oids(root: pathlib.Path) -> set[str]:
    """Los oid que viven como archivo suelto bajo ``.git/objects/xx/yyyy``."""
    git_dir = pathlib.Path(_run(root, "rev-parse", "--absolute-git-dir").strip())
    objects = git_dir / "objects"
    found = set()
    for shard in objects.glob("??"):
        if not shard.is_dir():
            continue
        for entry in shard.iterdir():
            found.add(shard.name + entry.name)
    return found


def _total_blob_disk(root: pathlib.Path) -> int:
    """El denominador: todos los blobs del repo, contados con la misma vara."""
    listing = _run(root, "rev-list", "--all", "--objects")
    oids = {line.partition(" ")[0] for line in listing.splitlines() if line}
    if not oids:
        return 0
    query = "\n".join(sorted(oids))
    done = subprocess.run(
        ["git", "cat-file", "--batch-check=%(objecttype) %(objectsize:disk)"],
        cwd=root, input=query, capture_output=True, text=True, check=True)
    total = 0
    for line in done.stdout.splitlines():
        kind, _, disk = line.partition(" ")
        if kind == "blob":
            total += int(disk)
    return total


def measure(root: pathlib.Path, pathspec: str) -> Footprint:
    """La huella del pathspec, con su denominador medido en el mismo pase."""
    rows = _describe(root, _blob_oids(root, pathspec))
    return Footprint(
        pathspec=pathspec,
        versions=len(rows),
        clear_bytes=sum(clear for clear, _, _ in rows),
        disk_bytes=sum(disk for _, disk, _ in rows),
        largest_bytes=max((clear for clear, _, _ in rows), default=0),
        loose=sum(1 for _, _, is_loose in rows if is_loose),
        packed=sum(1 for _, _, is_loose in rows if not is_loose),
        total_disk_bytes=_total_blob_disk(root),
    )


def _mib(value: float) -> str:
    return f"{value / 1048576:.2f} MiB"


def report(footprint: Footprint) -> str:
    lines = [
        f"huella de «{footprint.pathspec}»",
        f"  versiones        {footprint.versions}"
        f"   (sueltas {footprint.loose} · empaquetadas {footprint.packed})",
        f"  suma en claro    {_mib(footprint.clear_bytes)}",
        f"  ocupacion disco  {_mib(footprint.disk_bytes)}",
        f"  media/version    {_mib(footprint.mean_clear_bytes)}"
        f"   mayor {_mib(footprint.largest_bytes)}",
        f"  cuota de blobs   {100 * footprint.share:.1f} %"
        f"   (denominador medido: {_mib(footprint.total_disk_bytes)})",
    ]
    if footprint.loose:
        lines.append("  una version suelta no lleva delta: `git repack -d` "
                     "tiene trabajo aqui")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("pathspec", help="fragmento de ruta del sujeto")
    parser.add_argument("--root", default=".", help="raiz del clon")
    args = parser.parse_args(argv)

    root = pathlib.Path(args.root).resolve()
    if not _is_clone(root):
        # Rehusa sin cifra: un cero aqui no distinguiria «no hay versiones» de
        # «no mire», que es el sub-patron D.
        print(f"ERROR — «{root}» no es un clon de git; no se emite conteo.",
              file=sys.stderr)
        return REFUSAL

    print(report(measure(root, args.pathspec)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
