#!/usr/bin/env python3
"""Censo: suites que cargan un modulo POR RUTA sin poner ``src/`` en ``sys.path``.

Es el eje que el censo AST de TASK-THYROX-0214 no podia ver. Aquel mide
uso-antes-de-import DENTRO del modulo: un nombre cargado en el cuerpo en una
linea anterior al ``import`` que lo liga. Un cargador dinamico no importa el
arbol en ninguna linea — resuelve UN archivo por su ruta— asi que su forma no
aparece en ese recorrido por construccion, no por descuido.

*Metrica:* archivos de ``tests/`` cuyo AST contiene una llamada a
``spec_from_file_location`` o ``exec_module``, y cuyo texto no contiene ninguna
forma de insertar ``src`` en ``sys.path``.
*Ciega a:* el archivo que inserta la raiz a traves de un ayudante cuyo nombre
este recorrido no reconoce; y al FALSO POSITIVO legitimo — un modulo cargado
por ruta que no importa ningun hermano no necesita el arbol, y aqui aparece
igual. Por eso el veredicto de cada candidato se cierra por CONDUCTA
(ejecutarlo), no por este conteo.
"""
from __future__ import annotations

import ast
import pathlib
import sys


def loads_by_path(tree: ast.AST) -> bool:
    """Cierto si el modulo llama al cargador dinamico en cualquier profundidad."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            target = node.func
            name = getattr(target, "attr", None) or getattr(target, "id", None)
            if name in ("spec_from_file_location", "exec_module"):
                return True
    return False


def inserts_tree(text: str) -> bool:
    """Cierto si el texto pone `src` en `sys.path` por cualquier forma.

    Se mide sobre el TEXTO y no sobre el AST a proposito: la forma exacta
    varia entre suites —`insert`, `append`, dentro de un `if`— y exigir una
    sintaxis concreta convertiria una variante legitima en un falso positivo.
    """
    return ("sys.path" in text and "src" in text
            and ("sys.path.insert" in text or "sys.path.append" in text))


def census(root: pathlib.Path) -> tuple[int, list[str]]:
    universe, suspects = 0, []
    for path in sorted(root.rglob("*.py")):
        text = path.read_text(errors="ignore")
        try:
            tree = ast.parse(text)
        except SyntaxError:
            continue
        if not loads_by_path(tree):
            continue
        universe += 1
        if not inserts_tree(text):
            suspects.append(str(path))
    return universe, suspects


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    root = pathlib.Path(argv[0] if argv else "tests")
    if not root.is_dir():
        print(f"no existe la raiz {root}. NO se emite conteo: un 0 aqui no "
              f"distinguiria «no hay candidatos» de «no pude medir».",
              file=sys.stderr)
        return 2
    universe, suspects = census(root)
    print(f"cargan por ruta: {universe} | SIN poner src/ en sys.path: {len(suspects)}")
    for s in suspects:
        print("  ", s)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
