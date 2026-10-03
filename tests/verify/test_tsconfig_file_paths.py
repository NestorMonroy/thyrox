#!/usr/bin/env python3
"""Cada ruta que un ``tsconfig.json`` versionado declara en ``files`` o
``extends`` existe (TASK-THYROX-0922).

Qué haría fallar a este control: un ``tsconfig`` que apunte a un archivo que
no está en el árbol. Con esa forma ``tsc`` muere con TS6053 antes de tipar
nada, y el typecheck del paquete deja de medir sin que ningún verde lo diga.
Episodio: cinco paquetes listaban ``../@ant/ink/src/types/*.d.ts`` —un
directorio que sólo existió sin versionar en el disco que los generó— desde el
commit ``597bec85c``, que versionó el paquete como ``src/packages/ink``.

Métrica: rutas de ``files``/``extends`` resueltas contra el árbol versionado.
Ciega a: ``include`` con comodines y a ``references`` (un patrón que no casa
nada no es un error de ``tsc``).
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def versioned_tsconfigs(root: Path) -> list[Path]:
    """Los ``tsconfig*.json`` versionados bajo ``src/``."""
    listed = subprocess.run(["git", "-C", str(root), "ls-files", "src/**/tsconfig*.json", "src/*/tsconfig*.json"],
                            capture_output=True, text=True, check=True).stdout.split()
    return sorted({root / path for path in listed})


def declared_paths(config: Path) -> list[str]:
    """Las rutas literales que el ``tsconfig`` exige: ``files`` y un ``extends`` relativo."""
    document = json.loads(config.read_text(encoding="utf-8"))
    paths = list(document.get("files", []))
    extends = document.get("extends")
    for parent in ([extends] if isinstance(extends, str) else extends or []):
        if parent.startswith("."):
            paths.append(parent)
    return paths


def missing_paths(root: Path) -> list[str]:
    missing = []
    for config in versioned_tsconfigs(root):
        for declared in declared_paths(config):
            if not (config.parent / declared).exists():
                missing.append(f"{config.relative_to(root)}: {declared}")
    return missing


def main() -> int:
    configs = versioned_tsconfigs(ROOT)
    missing = missing_paths(ROOT)
    for line in missing:
        print(f"  FALLA no existe {line}")
    print(f"{len(missing)} ruta(s) ausente(s) (alcance medido: {len(configs)} tsconfig versionado(s))")
    if not configs:
        print("  FALLA no se midió ningún tsconfig: el listado de git vino vacío")
        return 2
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
