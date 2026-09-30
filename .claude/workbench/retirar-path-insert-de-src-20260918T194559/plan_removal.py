"""Resuelve el DESTINO de cada `sys.path.insert` de `src/` y planea su retiro.

El reemplazo no lo decide la FORMA del argumento —hay 34 formas distintas para
cuatro destinos— sino a qué directorio apunta. Con `PYTHONPATH=src`:

  destino `src/`            -> el insert es no-op: se borra y el `import` no cambia
  destino `src/<paquete>`   -> se borra y el `import X` pasa a `from <paquete> import X`
  destino fuera de `src/`   -> NO se toca: exige decision, no barrido

La resolucion es estatica: se sustituyen los literales conocidos del archivo
por su valor. Un destino que no se pueda resolver cae al cubo `indecidible`,
que es lo contrario de resolverlo mal en silencio.
"""
import ast
import pathlib
import re
import sys

SRC = pathlib.Path(__file__).resolve().parents[3] / "src"


def insert_calls(tree):
    for node in ast.walk(tree):
        if (isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute) and node.func.attr == "insert"
                and isinstance(node.func.value, ast.Attribute) and node.func.value.attr == "path"
                and isinstance(node.func.value.value, ast.Name)
                and node.func.value.value.id == "sys"):
            yield node


def resolve_target(expression, path):
    """Devuelve la ruta absoluta que la expresion inserta, o None."""
    here = path.parent
    # Los tres ascensos que el arbol usa, normalizados a su directorio.
    text = expression
    text = re.sub(r"(pathlib\.)?Path\(__file__\)(\.resolve\(\))?", "@HERE_FILE", text)
    text = re.sub(r"os\.path\.abspath\(__file__\)", "@HERE_FILE", text)
    replacements = {
        "@HERE_FILE.parents[1]": here.parent,
        "@HERE_FILE.parent.parent": here.parent,
        "@HERE_FILE.parent": here,
        "os.path.dirname(os.path.dirname(@HERE_FILE))": here.parent,
        "os.path.dirname(@HERE_FILE)": here,
        "HERE.parent": here.parent,
        "HERE": here,
        "AQUI.parent": here.parent,
        "AQUI": here,
    }
    for token, base in sorted(replacements.items(), key=lambda kv: -len(kv[0])):
        if text.startswith(f"str({token}") or text.startswith(token):
            rest = text.split(token, 1)[1]
            rest = rest.rstrip(")").strip()
            sub = re.findall(r"['\"]([a-z_]+)['\"]", rest)
            return base.joinpath(*sub)
    return None


def bucket(target):
    if target is None:
        return "indecidible", ""
    try:
        rel = target.resolve().relative_to(SRC)
    except ValueError:
        return "fuera-de-src", str(target)
    return ("raiz-src" if str(rel) == "." else "subpaquete"), str(rel)


def main():
    for path in sorted(SRC.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        for call in insert_calls(tree):
            if len(call.args) < 2:
                continue
            expression = ast.unparse(call.args[1])
            name, detail = bucket(resolve_target(expression, path))
            rel = path.relative_to(SRC.parent)
            print(f"{name}\t{rel}\t{call.lineno}\t{detail}\t{expression}")


if __name__ == "__main__":
    main()
