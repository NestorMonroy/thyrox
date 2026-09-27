#!/usr/bin/env python3
"""Todo paquete TypeScript vive bajo `src/packages/`.

Directiva del ejecutor 2026-09-27: «lo que está dentro de thyrox/src/packages/
se tiene que quedar», precisada como mover allí los cinco paquetes sueltos
(`paths`, `store`, `task`, `coordination`, `workbench`). Su cara Python se
queda en `src/<nombre>/`: es un paquete Python importado por nombre
(`from paths import reach`), y la mudanza es la de su cara TypeScript.

Que lo haría fallar: un `package.json` con `exports` fuera de `src/packages/`.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from typescript.emit_declarations import source_packages  # noqa: E402

packages = source_packages(ROOT)
outside = [p.relative_to(ROOT).as_posix() for p in packages
           if not p.is_relative_to(ROOT / "src" / "packages")]
print(f"test_packages_home: {len(packages)} paquete(s) medido(s), {len(outside)} fuera de src/packages")
for rel in outside:
    print(f"  FALLA {rel}")
sys.exit(1 if outside or not packages else 0)
