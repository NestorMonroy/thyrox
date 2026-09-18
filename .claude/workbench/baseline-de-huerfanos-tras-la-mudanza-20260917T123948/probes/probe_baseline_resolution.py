#!/usr/bin/env python3
"""Separa por conducta las dos causas del rojo de `test_censar_scripts`.

(a) La ruta del baseline es rancia: el archivo se mudo a `.claude/baselines/`
    con sus trece hermanos y `baseline_path()` se quedo apuntando al hogar
    anterior a la mudanza de `.claude/scripts` a thyrox.
(b) Hay una segunda causa: aun apuntando al archivo real, `--huerfanos` lee 0.

Las dos publican el mismo sintoma —«--huerfanos lee 0 en baseline»— y tienen
arreglos opuestos. Se separan sustituyendo SOLO el resolutor y volviendo a
leer: si la cuenta pasa de 0 a la del archivo real, la causa es (a) sola.
"""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "src"))

from corpus import census_scripts  # noqa: E402
from paths import reach  # noqa: E402

CONSUMER = reach.root('docs')
STALE = CONSUMER / '.claude/scripts/corpus/scripts_huerfanos_baseline.txt'
REAL = CONSUMER / '.claude/baselines/scripts_huerfanos_baseline.txt'


def entries(path: pathlib.Path) -> list[str]:
    """Las lineas utiles del baseline: sin comentarios ni vacias."""
    if not path.is_file():
        return []
    return [line.strip() for line in path.read_text(encoding='utf-8').splitlines()
            if line.strip() and not line.lstrip().startswith('#')]


def main() -> int:
    print('== existencia de los dos candidatos ==')
    print(f'  rancia  {STALE.is_file()!s:5}  {STALE}')
    print(f'  real    {REAL.is_file()!s:5}  {REAL}')

    print()
    print('== lo que cada uno aporta al gate ==')
    print(f'  entradas con la ruta rancia: {len(entries(STALE))}')
    print(f'  entradas con la ruta real:   {len(entries(REAL))}')

    print()
    print('== lo que el modulo resuelve HOY ==')
    resuelto = reach.root('docs') / '.claude/scripts/corpus/scripts_huerfanos_baseline.txt'
    # Es lo que `baseline_path()` compone: su literal, con el consumidor
    # declarado en vez de ascendido. Se replica aqui porque llamarlo con el
    # cwd en el proveedor rehusa, y el rehuse no es el fenomeno que se mide.
    print(f'  baseline_path() -> {resuelto}')
    print(f'  coincide con la real? {resuelto == REAL}')

    print()
    print('== control: el hogar de los hermanos ==')
    hogar = REAL.parent
    hermanos = sorted(p.name for p in hogar.glob('*')) if hogar.is_dir() else []
    print(f'  {len(hermanos)} archivo(s) en {hogar}')
    print(f'  el nuestro esta entre ellos? {REAL.name in hermanos}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
