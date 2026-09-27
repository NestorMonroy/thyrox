#!/usr/bin/env python3
"""Gate: el workspace, sus dependencias y su lockfile se declaran en la raiz.

Tarea #62. ``src/packages/package.json`` repetia a mano la lista que la raiz
declara por glob, con su propio ``bun.lock``; cinco paquetes versionaban otro
lockfile cada uno. Nadie los regeneraba, y bun, lanzado desde un paquete,
tomaba el agregador anidado como raiz de workspace: el ``bun install`` que
``check-cli-typecheck.sh`` recomendaba fallaba por su culpa. El defecto no era
un archivo viejo sino una segunda fuente de verdad, y este gate impide que
vuelva.

Falla ante un ``package.json`` que declare ``workspaces`` o un lockfile
(``bun.lock``, ``bun.lockb``, ``package-lock.json``, ``yarn.lock``,
``pnpm-lock.yaml``) fuera de la raiz. Uno se admite solo si el allowlist lo
nombra con una justificacion: ``<ruta>\\t<razon>``. Una linea sin razon no
cuenta.

*Metrica:* rutas del indice de git bajo la raiz, fuera de ``_references/``
(corpus vendorizados, que traen sus propios manifiestos) y ``.claude/``
(evidencia).
*Ciega a:* un archivo sin anadir al indice —en el pre-commit el indice es lo
que se va a commitear, asi que es la cota correcta— y a un manifiesto de
workspace con otro nombre de archivo.

Salida: 0 limpio · 1 hay segundas raices · 2 no pudo medir (fuera de git).
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

LOCKFILES = {"bun.lock", "bun.lockb", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"}
EXCLUDED_PREFIXES = ("_references/", ".claude/")
ALLOWLIST = Path(".claude/baselines/nested_workspace_allowlist.txt")


@dataclass(frozen=True)
class Offender:
    path: PurePosixPath
    kind: str


def versioned(root: Path) -> list[str] | None:
    """Las rutas del indice, o ``None`` si ``root`` no es un repositorio."""
    done = subprocess.run(["git", "-C", str(root), "ls-files", "-z"],
                          capture_output=True, text=True, check=False)
    if done.returncode != 0:
        return None
    return [p for p in done.stdout.split("\0") if p]


def read_allowlist(path: Path) -> dict:
    """Ruta -> razon. Una entrada sin razon no se admite: se descarta."""
    allowed = {}
    if not path.is_file():
        return allowed
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        entry, _, reason = line.partition("\t")
        if reason.strip():
            allowed[entry.strip()] = reason.strip()
    return allowed


def declares_workspaces(file: Path) -> bool:
    try:
        return "workspaces" in json.loads(file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False


def offenders(root: Path, allowed: dict, paths: list[str] | None = None) -> list[Offender]:
    found = []
    for rel in paths if paths is not None else (versioned(root) or []):
        posix = PurePosixPath(rel)
        if len(posix.parts) == 1 or rel.startswith(EXCLUDED_PREFIXES) or rel in allowed:
            continue
        if posix.name in LOCKFILES:
            found.append(Offender(posix, "lockfile"))
        elif posix.name == "package.json" and declares_workspaces(root / rel):
            found.append(Offender(posix, "workspaces"))
    return found


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").strip().splitlines()[0])
    parser.add_argument("--root", type=Path, default=None)
    parser.add_argument("--allowlist", type=Path, default=None)
    args = parser.parse_args(argv)
    root = (args.root or Path.cwd()).resolve()
    paths = versioned(root)
    if paths is None:
        print(f"check-single-workspace-root: {root} no es un repositorio git; "
              "NO se emite conteo.", file=sys.stderr)
        return 2
    allowed = read_allowlist(args.allowlist or root / ALLOWLIST)
    found = offenders(root, allowed, paths)
    for offender in found:
        what = "lockfile" if offender.kind == "lockfile" else "manifiesto con workspaces"
        print(f"  {offender.path}: {what} fuera de la raiz")
    print(f"check-single-workspace-root: {len(found)} segunda(s) raiz(ces) "
          f"(alcance medido: {len(paths)} ruta(s) versionada(s), {len(allowed)} admitida(s))")
    if found:
        print("  El workspace, sus dependencias y su lockfile viven en la raiz. Para",
              file=sys.stderr)
        print(f"  admitir uno, nombralo con su razon en {ALLOWLIST}.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
