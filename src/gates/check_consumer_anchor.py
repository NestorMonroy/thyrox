#!/usr/bin/env python3
"""Gate — aritmética de ruta que sale de thyrox y aterriza en un árbol ajeno.

Mide el EFECTO, no el literal: para cada ``Path(__file__).resolve().parents[N]``
declarado en ``src/``, resuelve a dónde apunta desde el archivo que lo escribe y
lo marca si cae **fuera de la raíz de thyrox**. Un umbral sobre ``N`` no serviría
—``parents[3]`` desde ``src/gates/`` sale del árbol y desde
``src/packages/harness/src/`` no—, y la profundidad del archivo es justo lo que
un porte cambia.

Por qué existe. ``paths/reach.py`` ya declara el mecanismo y su propio docstring
describe este defecto: *«siete gates componían su corpus con
Path(__file__).resolve().parents[N], calibrado para
kaupamex-docs/.claude/scripts/gates/; desde thyrox/src/gates/ eso da
/home/user»*. El mecanismo se escribió y ocho sitios nunca migraron — y el fallo
es SILENCIOSO porque ``/home/user`` existe: el gate no revienta, mide el árbol
equivocado y publica su cero.

Qué NO marca, y es deliberado: la aritmética que se queda dentro de thyrox. El
bootstrap ``sys.path.insert(0, parents[1])`` desde ``src/<pkg>/`` apunta a
``src/``, que es la raíz del paquete propio — un anclaje al proveedor, no al
consumidor.

Salidas: 0 sin anclas nuevas · 1 con anclas nuevas · 2 no pudo medir.
"""
from __future__ import annotations

import argparse
import ast
import pathlib
import sys

#: La raíz propia. Se deriva del marcador, no de `parents[N]` — un gate que
#: cometiera el defecto que mide no podría publicar un veredicto creíble.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

BASELINE = pathlib.Path(__file__).with_name("consumer_anchor_baseline.txt")

#: Sólo el árbol de producto. `tests/` tiene su propia aritmética y `_archived`
#: es el THYROX anterior, que no se lee como vigente.
MEASURED_ROOT = "src"


def anchors(tree: ast.AST) -> list[tuple[int, int]]:
    """Los ``<algo>.parents[N]`` con N constante, por AST.

    Por AST y no por grep porque el árbol cita `parents[3]` en prosa para
    explicar su retiro: contar esas menciones mediría la documentación del
    arreglo como si fuera el defecto.
    """
    found = []
    for node in ast.walk(tree):
        if (isinstance(node, ast.Subscript)
                and isinstance(node.value, ast.Attribute)
                and node.value.attr == "parents"
                and isinstance(node.slice, ast.Constant)
                and isinstance(node.slice.value, int)):
            found.append((node.lineno, node.slice.value))
    return found


def escapes(path: pathlib.Path, level: int, root: pathlib.Path) -> bool:
    """¿`parents[level]` desde `path` cae fuera de `root`?"""
    try:
        target = path.resolve().parents[level]
    except IndexError:          # sube más allá de `/`: fuera por definición
        return True
    return not target.is_relative_to(root)


def measure(root: pathlib.Path) -> tuple[list[str], int]:
    """Devuelve (hallazgos como `ruta:linea:N`, archivos medidos)."""
    found, measured = [], 0
    base = root / MEASURED_ROOT
    for path in sorted(base.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except (SyntaxError, UnicodeDecodeError):
            continue
        measured += 1
        for line, level in anchors(tree):
            if escapes(path, level, root):
                found.append(f"{path.relative_to(root)}:{line}:{level}")
    return found, measured


def read_baseline() -> set[str]:
    if not BASELINE.is_file():
        return set()
    return {l.strip() for l in BASELINE.read_text().splitlines()
            if l.strip() and not l.startswith("#")}


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", help="raíz de thyrox (por defecto, la derivada)")
    p.add_argument("--strict", action="store_true", help="exit 1 si hay nuevas")
    p.add_argument("--write-baseline", action="store_true")
    args = p.parse_args(argv)

    root = pathlib.Path(args.root).resolve() if args.root else reach.thyrox_root()
    if not (root / MEASURED_ROOT).is_dir():
        print(f"check-consumer-anchor: no existe {root / MEASURED_ROOT} — "
              "NO se emite conteo: un 0 aquí sería un verde falso.",
              file=sys.stderr)
        return 2

    found, measured = measure(root)
    baseline = read_baseline()

    if args.write_baseline:
        BASELINE.write_text(
            "# Anclas que salen de thyrox, congeladas al cablear el gate.\n"
            "# Una listada no bloquea; una nueva sí. Se paga al tocar.\n"
            + "".join(f"{f}\n" for f in found))
        print(f"baseline escrito: {len(found)} ancla(s)")
        return 0

    new = [f for f in found if f not in baseline]
    print(f"check-consumer-anchor: {len(new)} ancla(s) nueva(s) que salen de "
          f"thyrox (alcance medido: {measured} archivo(s) en {MEASURED_ROOT}/; "
          f"{len(found)} en total; {len(baseline)} en baseline)")
    for f in new:
        path, line, level = f.rsplit(":", 2)
        print(f"  {path}:{line} — parents[{level}] sale del árbol; usar "
              "reach.consumer_root() / reach.thyrox_root() / reach.root(<repo>)")
    return 1 if (new and args.strict) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
