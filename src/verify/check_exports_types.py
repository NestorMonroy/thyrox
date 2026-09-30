#!/usr/bin/env python3
"""Gate: cada `exports.types` de un paquete del workspace resuelve en el disco.

TASK-THYROX-0256. Un `types` que apunta a un archivo inexistente no falla en
ningun lado: tsc cae a la condicion siguiente —la fuente— y la frontera
publica del paquete queda inerte sin emitir un byte. Este gate lo hace
visible, y exige ademas que TODO paquete del workspace tenga con que
construirlo (`tsconfig.build.json`) y con que probarlo (`tsconfig.test.json`).

La resolucion es la MISMA que usa el repunte (`_declaration_exists`): un
comodin se comprueba archivo por archivo contra su fuente, no con «hay
alguno». Los paquetes salen de `source_packages` —todo `package.json` bajo
`src/` que declara `exports`—, la misma lista que usa el emisor; no de
`workspaces`, que los proyectos por paquete existen para retirar.

Salida: 0 todo resuelve · 1 hay destinos o proyectos ausentes · 2 no pudo
medir (sin `src/` o sin paquetes), y entonces no publica conteo.

Uso:
    check_exports_types [--root R]

*Metrica:* entradas `types` de `exports` (y el `types` de raiz) de cada
paquete bajo `src/`, resueltas contra el disco.
*Ciega a:* que la declaracion emitida corresponda a la fuente actual —un
`dist/` viejo resuelve igual—; eso lo mide reconstruir, no este gate.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from typescript.emit_declarations import SOURCE_ROOT, _declaration_exists, source_packages

BUILD_PROJECT = "tsconfig.build.json"
TEST_PROJECT = "tsconfig.test.json"



def typed_entries(manifest: dict) -> list[tuple[str, str, str | None]]:
    """`(subpath, types, default)` de cada entrada que declara `types`."""
    entries = []
    exports = manifest.get("exports")
    if isinstance(exports, dict):
        for subpath, entry in exports.items():
            if isinstance(entry, dict) and isinstance(entry.get("types"), str):
                default = entry.get("default")
                entries.append((subpath, entry["types"],
                                default if isinstance(default, str) else None))
    if isinstance(manifest.get("types"), str):
        entries.append(("(types de raiz)", manifest["types"], None))
    return entries


def measure(root: Path) -> tuple[list[str], int, int]:
    """Hallazgos, entradas medidas y paquetes medidos."""
    findings: list[str] = []
    measured_entries = 0
    packages = source_packages(root)
    for pkg in packages:
        manifest = json.loads((pkg / "package.json").read_text(encoding="utf8"))
        name = manifest.get("name", pkg.name)
        entries = typed_entries(manifest)
        measured_entries += len(entries)
        for subpath, types, default in entries:
            if not _declaration_exists(pkg, types, default):
                findings.append(f"{name}: {subpath} -> {types} no existe")
        # Todo paquete del workspace se construye y se prueba con sus propios
        # proyectos, declare o no `dist/`: uno sólo-fuente es uno que nunca
        # pasó por el emisor, no uno que no lo necesite.
        missing = [p for p in (BUILD_PROJECT, TEST_PROJECT) if not (pkg / p).is_file()]
        if missing:
            findings.append(f"{name}: sin {' ni '.join(missing)}")
    return findings, measured_entries, len(packages)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args(argv)
    root = args.root.resolve()
    if not (root / SOURCE_ROOT).is_dir():
        print(f"check_exports_types: sin {SOURCE_ROOT}/ en {root}; no se mide", file=sys.stderr)
        return 2
    findings, entries, packages = measure(root)
    if packages == 0:
        print("check_exports_types: ningun paquete con exports bajo src/; no se mide",
              file=sys.stderr)
        return 2
    for finding in findings:
        print(f"  {finding}")
    print(f"check_exports_types: {len(findings)} destino(s) o proyecto(s) ausente(s) "
          f"(alcance medido: {entries} entrada(s) types en {packages} paquete(s))")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
