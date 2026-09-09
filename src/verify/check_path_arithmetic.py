#!/usr/bin/env python3
"""Gate — aritmética de ruta `.parents[N]` que cruza la frontera sin bootstrap.

Tarea #228: `parents[N]` no se prohíbe por costumbre, se prohíbe porque falla
EN SILENCIO. El episodio que la fundó (H-DOCS-1103) es exacto: un guion
resolvía ``parents[3] / 'tools'`` y apuntaba a ``/home/user/tools/`` — un
directorio que nunca existió, y nada lo delataba porque el guion no revienta,
mide el árbol equivocado y publica su cero.

El discriminador, medido sobre los 85 sitios de ``src/``, ``tests/`` y
``.claude/`` que este árbol tenía al fijar la regla
(:ref:`analisis-clasificacion-de-parents-n-en-src-y-tests`)::

    admitida   — resuelve un MÓDULO HERMANO dentro de la distribución, vía un
                 `sys.path.insert(...)` que la contiene. Si el archivo se
                 mueve, el `import` que sigue falla con RUIDO
                 (`ModuleNotFoundError`), no en silencio.
    prohibida  — cualquier otro uso: un default de configuración, la ruta de
                 un script para invocarlo por subproceso, el store de
                 agentes, el banco de scratch. Ahí el fallo es mudo — el
                 consumidor recibe una `Path` que no resuelve a nada y sigue
                 corriendo con datos vacíos.

Este gate implementa el discriminador tal cual: marca todo
``<algo>.parents[N]`` (N constante, N >= 1) cuyo statement envolvente NO sea,
en ningún nivel de anidamiento, una llamada a ``sys.path.insert``. No mide si
la ruta resuelta CAE fuera del árbol —eso ya lo hace
``check_consumer_anchor.py``, y sólo sobre ``src/``—: mide la FORMA, porque la
forma es lo que decide si un futuro cambio de profundidad falla con ruido o
en silencio, incluso cuando hoy resuelve por casualidad al lugar correcto.

Qué NO marca, y es deliberado
-----------------------------
El bootstrap ``sys.path.insert(0, str(Path(__file__).resolve().parents[N] /
'src'))`` —o su forma partida en dos líneas, variable y luego inserción— que
es como TODO módulo de este árbol se hace a sí mismo importable antes de
poder llamar a ``paths.reach``. Es la única aritmética que el propio
localizador no puede reemplazar: no se puede pedir `reach.thyrox_root()`
antes de que `import reach` funcione.

Sin ninguna de las tres raíces medibles bajo la raíz declarada, rehúsa con
exit 2 y sin publicar conteo: un 0 ahí no distinguiría «no queda aritmética
prohibida» de «no medí nada».

Salidas: 0 sin incumplidores nuevos · 1 con incumplidores nuevos (--strict) ·
2 no pudo medir.
"""
from __future__ import annotations

import argparse
import ast
import pathlib
import sys

#: La raíz propia se deriva del localizador, no de `parents[N]` — un gate que
#: cometiera el defecto que audita no podría publicar un veredicto creíble.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

BASELINE = pathlib.Path(__file__).with_name("path_arithmetic_baseline.txt")

#: Las tres raíces que el análisis de la tarea #228 midió. `_archived` es el
#: THYROX anterior (no vigente) y `node_modules` es material de terceros;
#: ninguno de los dos entra al alcance por la misma razón que en los demás
#: gates de este árbol.
MEASURED_ROOTS = ("src", "tests", ".claude")
SKIP_DIRS = {"__pycache__", "node_modules", "_archived"}


def parents_subscripts(tree: ast.AST) -> list[ast.Subscript]:
    """Los ``<algo>.parents[N]`` con N constante >= 1, por AST.

    Por AST y no por texto: el propio módulo que declara esta regla y sus
    pruebas CITAN el literal ``parents[`` en prosa y en cadenas de prueba —
    un `grep` los contaría como si fueran código.
    """
    found = []
    for node in ast.walk(tree):
        if (isinstance(node, ast.Subscript)
                and isinstance(node.value, ast.Attribute)
                and node.value.attr == "parents"
                and isinstance(node.slice, ast.Constant)
                and isinstance(node.slice.value, int)
                and node.slice.value >= 1):
            found.append(node)
    return found


def parent_map(tree: ast.AST) -> dict[ast.AST, ast.AST | None]:
    """Mapa nodo -> padre, para poder subir desde un `Subscript` cualquiera."""
    parents: dict[ast.AST, ast.AST | None] = {}

    def visit(node: ast.AST, parent: ast.AST | None) -> None:
        parents[node] = parent
        for child in ast.iter_child_nodes(node):
            visit(child, node)

    visit(tree, None)
    return parents


def feeds_path_insert(node: ast.AST, parents: dict[ast.AST, ast.AST | None]) -> bool:
    """¿`node` alimenta, en algún nivel de anidamiento, un `sys.path.insert(...)`?

    Sube por los ancestros hasta encontrar la llamada que lo envuelve. El
    primer `Call` que se encuentra casi nunca es `sys.path.insert` — suele
    ser el `str(...)` que lo rodea— así que detenerse en el primer `Call` sin
    más clasificaría como prohibido el patrón admitido más común del árbol
    (el propio bootstrap de este gate lo comete si no se corrige: probado en
    la suite con el control de anulación).
    """
    cur = parents.get(node)
    while cur is not None:
        if isinstance(cur, ast.Call):
            func = cur.func
            if (isinstance(func, ast.Attribute) and func.attr == "insert"
                    and isinstance(func.value, ast.Attribute)
                    and func.value.attr == "path"):
                return True
        if isinstance(cur, ast.stmt):
            return False
        cur = parents.get(cur)
    return False


def measure(root: pathlib.Path) -> tuple[list[str], int]:
    """Devuelve (incumplidores como ``ruta:línea``, archivos medidos)."""
    found: list[str] = []
    measured = 0
    for sub in MEASURED_ROOTS:
        base = root / sub
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.py")):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            try:
                tree = ast.parse(path.read_text(encoding="utf-8", errors="replace"))
            except SyntaxError:
                continue
            measured += 1
            parents = parent_map(tree)
            for node in parents_subscripts(tree):
                if not feeds_path_insert(node, parents):
                    found.append(f"{path.relative_to(root)}:{node.lineno}")
    return found, measured


def read_baseline(path: pathlib.Path) -> set[str]:
    """La deuda congelada. Una entrada listada no bloquea; una nueva sí."""
    if not path.is_file():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")}


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", help="raíz a medir (por defecto, thyrox_root())")
    parser.add_argument("--baseline", default=str(BASELINE),
                        help="archivo de deuda congelada")
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 si hay incumplidores nuevos")
    parser.add_argument("--write-baseline", action="store_true",
                        help="congela lo que hay hoy y sale 0")
    parser.add_argument("--quiet", action="store_true",
                        help="emitir sólo el conteo, como entero pelado")
    args = parser.parse_args(argv)

    root = pathlib.Path(args.root).resolve() if args.root else reach.thyrox_root()
    if not any((root / sub).is_dir() for sub in MEASURED_ROOTS):
        print(f"check-path-arithmetic: ninguna de {MEASURED_ROOTS} bajo {root}. "
              "NO se emite un conteo: un 0 aquí no distinguiría «no queda "
              "aritmética prohibida» de «no medí nada».", file=sys.stderr)
        return 2

    found, measured = measure(root)
    baseline_path = pathlib.Path(args.baseline)

    if args.write_baseline:
        header = ("# Deuda congelada de check_path_arithmetic (tarea #228).\n"
                   "# Una entrada listada no bloquea; una nueva sí. Se paga\n"
                   "# al tocar el archivo — nunca en un barrido.\n")
        baseline_path.write_text(
            header + "".join(f"{f}\n" for f in found), encoding="utf-8")
        print(f"baseline escrito: {len(found)} incumplidor(es)")
        return 0

    baseline = read_baseline(baseline_path)
    new = [f for f in found if f not in baseline]
    inherited = len(found) - len(new)

    if args.quiet:
        print(len(new))
        return 1 if (new and args.strict) else 0

    for finding in new:
        print(f"  {finding} — no alimenta un sys.path.insert; usar "
              "reach.thyrox_root() / reach.consumer_root() / "
              "reach.agent_store_path() / reach.scratch_root() / reach.root(<repo>)")

    print(f"check-path-arithmetic: {len(new)} incumplidor(es) nuevo(s), "
          f"{inherited} congelado(s) (alcance medido: {measured} archivo(s) en "
          f"{', '.join(MEASURED_ROOTS)})")
    return 1 if (new and args.strict) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
