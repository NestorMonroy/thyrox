#!/usr/bin/env python3
"""Un árbol de medición aparte para el lazo tsc cero.

POR QUÉ: el paso de tsc aplica y revierte candidatos sobre los archivos, y el
pool de propuestas lee esos mismos archivos. Con un solo árbol las dos cosas
van en serie: el pool entero (≈10 min con 166 ítems, ocupación medida 11.2 de
12) y después el paso (2-3 min). Con un worktree aparte el paso mide lotes
mientras el pool sigue leyendo un árbol quieto.

`node_modules` no se copia (870 MB): se refleja. Una entrada que en el árbol
principal es un enlace RELATIVO (los paquetes del workspace, `../../src/...`)
se recrea igual, así resuelve al `src/` del worktree; una entrada real (un
paquete de terceros) se enlaza por ruta absoluta al principal. Los
`node_modules` anidados en `src/packages/*` sólo traen paquetes reales y
`.bin`, así que se enlazan enteros.

Ciego a: un enlace relativo de workspace dentro de un `node_modules`
anidado —hoy no hay ninguno, medido— resolvería al árbol principal.

Uso:
  measure_worktree.py prepare <main> <wt>     crea o reusa el worktree y lo sincroniza
  measure_worktree.py sync <main> <wt>        el worktree = HEAD del principal + sus cambios sin commitear
  measure_worktree.py export <wt> <main> <archivo>...   copia archivos del worktree al principal
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


def _git(cwd: Path, *args: str, stdin: bytes | None = None) -> bytes:
    return subprocess.run(["git", *args], cwd=cwd, input=stdin, check=True, capture_output=True).stdout


def mirror_node_modules(main: Path, wt: Path) -> int:
    """Refleja `node_modules` del principal en el worktree; devuelve cuántas
    entradas creó."""
    created = 0

    def mirror(src_dir: Path, dst_dir: Path) -> None:
        nonlocal created
        dst_dir.mkdir(parents=True, exist_ok=True)
        for entry in src_dir.iterdir():
            target = dst_dir / entry.name
            # Un alcance (`@types`) se recorre SIEMPRE, antes de mirar si ya
            # existe: un paquete instalado después de la primera preparación
            # vive dentro de un alcance que ya está reflejado.
            if entry.name.startswith("@") and entry.is_dir() and not entry.is_symlink():
                mirror(entry, target)
                continue
            if target.exists() or target.is_symlink():
                continue
            if entry.is_symlink():
                target.symlink_to(os.readlink(entry))
            else:
                target.symlink_to(entry.resolve())
            created += 1

    mirror(main / "node_modules", wt / "node_modules")
    for nested in main.glob("src/packages/*/node_modules"):
        target = wt / nested.relative_to(main)
        if not target.exists() and not target.is_symlink():
            target.symlink_to(nested.resolve())
            created += 1
    return created


def sync(main: Path, wt: Path) -> None:
    """El worktree queda en el HEAD del principal más sus cambios sin commitear
    de `src/` y `tests/`: el mismo árbol que el principal mide."""
    head = _git(main, "rev-parse", "HEAD").decode().strip()
    _git(wt, "checkout", "--quiet", "--force", "--detach", head)
    _git(wt, "clean", "-fdq", "--", "src", "tests")
    diff = _git(main, "diff", "--binary", "HEAD", "--", "src", "tests")
    if diff:
        _git(wt, "apply", "--whitespace=nowarn", stdin=diff)
    for rel in _git(main, "ls-files", "--others", "--exclude-standard", "--", "src", "tests").decode().split():
        dst = wt / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(main / rel, dst)


def prepare(main: Path, wt: Path) -> None:
    if not (wt / ".git").exists():
        _git(main, "worktree", "add", "--detach", str(wt), "HEAD")
    sync(main, wt)
    mirror_node_modules(main, wt)


def export(wt: Path, main: Path, files: list[str]) -> None:
    for rel in files:
        # Un porte puede crear un archivo en un directorio que el árbol
        # principal todavía no tiene.
        (main / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(wt / rel, main / rel)


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[0] not in ("prepare", "sync", "export"):
        print(__doc__, file=sys.stderr)
        return 2
    command, a, b = argv[0], Path(argv[1]).resolve(), Path(argv[2]).resolve()
    if command == "prepare":
        prepare(a, b)
    elif command == "sync":
        sync(a, b)
    else:
        export(a, b, argv[3:])
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
