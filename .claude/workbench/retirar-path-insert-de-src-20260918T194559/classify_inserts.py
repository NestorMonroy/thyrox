"""Clasifica cada `sys.path.insert` de un arbol por la FORMA de su argumento.

No mide si la ruta resuelve: mide que expresion se inserta y que `import` la
consume, que es lo que decide el reemplazo. La clasificacion por AST evita el
falso positivo del literal dentro de un docstring, que un grep si cuenta.
"""
import ast
import pathlib
import sys


def insert_calls(tree):
    """Rinde cada llamada a ``sys.path.insert`` del modulo, con su linea."""
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        f = node.func
        if (isinstance(f, ast.Attribute) and f.attr == "insert"
                and isinstance(f.value, ast.Attribute) and f.value.attr == "path"
                and isinstance(f.value.value, ast.Name) and f.value.value.id == "sys"):
            yield node


def shape(call):
    """Nombra la forma del argumento insertado."""
    if len(call.args) < 2:
        return "raro"
    src = ast.unparse(call.args[1])
    if "parents[1] / " in src or 'parents[1]/"' in src:
        return "parents1-subdir"
    if "parents[1]" in src:
        return "parents1"
    if "parents[" in src:
        return "parentsN"
    if "__file__" in src and "parent" in src:
        return "dirname-propio"
    if "__file__" in src:
        return "dirname-propio"
    return "otro"


def main(root):
    base = pathlib.Path(root)
    for path in sorted(base.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError as exc:
            print(f"SYNTAX\t{path}\t{exc}")
            continue
        for call in insert_calls(tree):
            arg = ast.unparse(call.args[1]) if len(call.args) > 1 else "?"
            print(f"{shape(call)}\t{path}\t{call.lineno}\t{arg}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "src")
