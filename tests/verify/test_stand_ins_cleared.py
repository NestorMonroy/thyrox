#!/usr/bin/env python3
"""Ratchet: a cleared package keeps no stand-in whose original it can import.

Cada paquete de `CLEARED` pasó por el retiro de sus sustitutos: todo símbolo
de su `pendingCrossPackageDeps.ts` que otro paquete exporta y que se puede
importar sin cerrar un ciclo de módulos se importa del original. Lo que queda
en el sustituto es lo que cerraría un ciclo, o lo que no tiene original.

Cada paso del retiro añade un paquete a la lista —la mitad roja— y lo limpia
—la verde—. La lista sólo crece: un paquete que vuelva a copiar un símbolo
importable cae aquí.

Que lo haría fallar: un símbolo sin ciclo en el sustituto de un paquete de la
lista, con el especificador por el que se debió importar.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()

from verify.check_stand_ins import shadowed  # noqa: E402

CLEARED = (
    "mcp-runtime",
    "app-host",
)


def package_of(stand_in: Path) -> str:
    return stand_in.relative_to(ROOT / "src" / "packages").parts[0]


def main() -> int:
    importable = [s for s in shadowed(ROOT / "src") if not s.cycle]
    offenders = [s for s in importable if package_of(s.stand_in) in CLEARED]
    for s in offenders:
        print(f"  FALLA {package_of(s.stand_in)}: {s.symbol} -> importar de {s.specifier}")
    print(f"test_stand_ins_cleared: {len(CLEARED)} paquete(s) limpio(s), "
          f"{len(offenders)} símbolo(s) importable(s) sin retirar "
          f"(alcance medido: {len(importable)} importable(s) en todo el árbol)")
    return 1 if offenders else 0


if __name__ == "__main__":
    sys.exit(main())
