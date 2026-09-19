#!/usr/bin/env python3
"""Enlaza cada paquete de workspace en node_modules, por su nombre DECLARADO.

Es lo que hace un `install` de workspace y nada mas: un symlink por paquete.
NO se corre `bun install` — el disco esta al 98 % y TASK-THYROX-0372 ya
registro que un `git gc` muere out of disk en este arbol. Un symlink cuesta
cero bytes; resolver e instalar el arbol externo no.

El nombre sale del `name` de cada package.json, no del nombre del directorio:
son distintos en los @ant (el directorio es `ink`, el nombre `@anthropic/ink`),
y enlazar por directorio dejaria el specifier real sin resolver.
"""
import json
import os
import pathlib
import sys


def workspace_packages(root: pathlib.Path):
    """Los paquetes que los globs de `workspaces` alcanzan, con su nombre."""
    manifest = json.loads((root / "package.json").read_text())
    for pattern in manifest.get("workspaces", []):
        for path in sorted(root.glob(pattern)):
            package_json = path / "package.json"
            if not package_json.is_file():
                continue
            name = json.loads(package_json.read_text()).get("name")
            if name:
                yield name, path


def link(root: pathlib.Path, dry_run: bool) -> tuple[int, int, int]:
    created = existing = skipped = 0
    for name, path in workspace_packages(root):
        destination = root / "node_modules" / name
        if destination.is_symlink() or destination.exists():
            existing += 1
            continue
        if dry_run:
            print(f"  crearia  {name} -> {path.relative_to(root)}")
            created += 1
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Relativo al directorio del enlace: sobrevive a mover el arbol entero.
        os.symlink(os.path.relpath(path, destination.parent), destination)
        created += 1
    return created, existing, skipped


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    root = pathlib.Path(os.environ.get("THYROX_ROOT", ".")).resolve()
    created, existing, skipped = link(root, dry_run)
    verb = "crearia" if dry_run else "creados"
    print(f"link_workspaces: {created} {verb}, {existing} ya estaban "
          f"(alcance medido: {len(list(workspace_packages(root)))} paquetes "
          f"de workspace)")
