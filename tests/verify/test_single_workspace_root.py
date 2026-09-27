#!/usr/bin/env python3
"""Una sola raíz de workspace: ni manifiesto de workspaces ni lockfile anidados.

El defecto que cierra (tarea #62): ``src/packages/package.json`` repetía a
mano la lista que la raíz declara por glob, con su propio ``bun.lock``. Nadie
lo regeneraba, así que se quedó sin ``@thyrox/finding`` ni los cinco paquetes
movidos desde ``@ant``; y desde dentro de un paquete, bun lo tomaba como raíz
de workspace y el ``bun install`` que un check recomendaba fallaba. El
problema no era el archivo viejo: era una segunda fuente de verdad.

``check_single_workspace_root`` mide lo versionado (el índice de git, así que
en el pre-commit ve también lo que está en staging) y falla ante un
``package.json`` con ``workspaces`` o un lockfile fuera de la raíz. Uno se
admite sólo si el allowlist lo nombra CON una justificación escrita.

Controles de anulación, medidos: sin exigir la justificación cae el caso 5
(«sin razón no se admite») y nada más; sin mirar lockfiles cae el caso 3 y la
primera comprobación del 5, que también usa un lockfile.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from verify import check_single_workspace_root as gate

ok_count = 0
fail_count = 0


def check(label, expected, seen):
    global ok_count, fail_count
    if expected == seen:
        ok_count += 1
        print(f"  ok   {label}")
    else:
        fail_count += 1
        print(f"  FALLO {label}\n       esperado: {expected!r}\n       obtenido: {seen!r}")


def repo(tmp: str) -> Path:
    root = Path(tmp)
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    (root / "package.json").write_text(json.dumps({"name": "r", "workspaces": ["src/packages/*"]}))
    (root / "bun.lock").write_text("{}\n")
    pkg = root / "src" / "packages" / "a"
    pkg.mkdir(parents=True)
    (pkg / "package.json").write_text(json.dumps({"name": "@t/a", "exports": {".": "./i.ts"}}))
    return root


def stage(root: Path) -> None:
    subprocess.run(["git", "-C", str(root), "add", "-A"], check=True)


def run(root: Path, allowlist: Path | None = None) -> int:
    argv = ["--root", str(root)]
    if allowlist is not None:
        argv += ["--allowlist", str(allowlist)]
    return gate.main(argv)


print("\n1. la raíz con su manifiesto y su lockfile, y paquetes sin workspaces: limpio")
with tempfile.TemporaryDirectory() as tmp:
    root = repo(tmp)
    stage(root)
    check("sale 0", 0, run(root))

print("\n2. un manifiesto anidado que declara workspaces: falla")
with tempfile.TemporaryDirectory() as tmp:
    root = repo(tmp)
    (root / "src" / "packages" / "package.json").write_text(json.dumps({"name": "agg", "workspaces": ["a"]}))
    stage(root)
    check("sale 1", 1, run(root))
    check("lo nombra", ["src/packages/package.json"], [str(o.path) for o in gate.offenders(root, {})])

print("\n3. un lockfile anidado: falla, aunque no haya manifiesto que lo acompañe")
with tempfile.TemporaryDirectory() as tmp:
    root = repo(tmp)
    (root / "src" / "packages" / "bun.lock").write_text("{}\n")
    stage(root)
    check("sale 1", 1, run(root))

print("\n4. sólo cuenta lo versionado: un lockfile sin añadir no se mide")
with tempfile.TemporaryDirectory() as tmp:
    root = repo(tmp)
    stage(root)
    (root / "src" / "packages" / "bun.lock").write_text("{}\n")
    check("sale 0", 0, run(root))

print("\n5. el allowlist admite sólo con justificación escrita")
with tempfile.TemporaryDirectory() as tmp:
    root = repo(tmp)
    (root / "src" / "packages" / "bun.lock").write_text("{}\n")
    stage(root)
    bare = root / "allow-bare.txt"
    bare.write_text("src/packages/bun.lock\n")
    check("sin razón no se admite", 1, run(root, bare))
    reasoned = root / "allow-reasoned.txt"
    reasoned.write_text("src/packages/bun.lock\tfixture de otra herramienta, medido\n")
    check("con razón se admite", 0, run(root, reasoned))

print("\n6. fuera de un repositorio git rehúsa sin conteo")
with tempfile.TemporaryDirectory() as tmp:
    check("sale 2", 2, run(Path(tmp)))

print(f"\ntest_single_workspace_root: {ok_count} ok, {fail_count} falla(s)")
sys.exit(1 if fail_count else 0)
