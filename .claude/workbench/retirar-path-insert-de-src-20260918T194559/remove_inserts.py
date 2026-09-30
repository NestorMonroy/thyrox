"""Retira los `sys.path.insert` de `src/` y reescribe el import que dependia.

Con `PYTHONPATH=src` —que es lo que exportan `bin/` y `tests/run.sh`— un
insert cuyo destino cae dentro de `src/` es un no-op para el paquete raiz y
una via alterna para un subpaquete. El retiro tiene dos mitades:

  * borrar la llamada (y el comentario que la explica, que de otro modo
    describe una linea que ya no existe);
  * reescribir el `import X` que dependia de esa via alterna a su forma
    de paquete, `from <paquete> import X`.

Un insert cuyo destino NO cae dentro de `src/` se deja intacto y se reporta:
esos exigen decision, no barrido.
"""
import argparse
import ast
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = ROOT / "src"


def insert_calls(tree):
    for node in ast.walk(tree):
        if (isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute) and node.func.attr == "insert"
                and isinstance(node.func.value, ast.Attribute) and node.func.value.attr == "path"
                and isinstance(node.func.value.value, ast.Name)
                and node.func.value.value.id == "sys"):
            yield node


def package_of(module_name, search_dirs, self_path=None):
    """Devuelve el paquete de `src/` donde vive `module_name`, o None.

    `SRC` se consulta PRIMERO porque es lo que `PYTHONPATH` ofrece: un nombre
    que ya resuelve desde la raiz no necesita reescritura, y buscarlo antes en
    el directorio propio lo reescribiria a un paquete que lo ensombrece. El
    control que lo destapo: `src/workbench/paths.py` resolvia `paths` contra si
    mismo y emitia `from workbench.paths.reach`, que no es un paquete.
    """
    for directory in search_dirs:
        if self_path is not None and (
                (directory / f"{module_name}.py").resolve() == self_path):
            continue
        if (directory / f"{module_name}.py").is_file() or (directory / module_name).is_dir():
            try:
                rel = directory.resolve().relative_to(SRC)
            except ValueError:
                return None
            return "" if str(rel) == "." else str(rel).replace("/", ".")
    return None


def candidate_dirs(path):
    """Los destinos que los inserts de este archivo alcanzan, mas su propio dir."""
    here = path.parent
    return [SRC, here, here.parent] + sorted(p for p in SRC.iterdir() if p.is_dir())


def rewrite(path, apply_changes):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return None

    calls = list(insert_calls(tree))
    if not calls:
        return None

    # El `if` cuyo UNICO cuerpo es el insert se va entero: dejar su cabecera
    # produce un bloque vacio, que es un SyntaxError. El control que lo destapo
    # fue re-parsear el arbol tras el barrido — 20 archivos en la primera pasada.
    guardias = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and all(
                isinstance(s, ast.Expr) and s.value in calls for s in node.body) and not node.orelse:
            guardias[node.lineno - 1] = node

    drop = set()
    for header, node in guardias.items():
        drop.add(header)
    for call in calls:
        drop.add(call.lineno - 1)
        # El comentario inmediatamente anterior que NOMBRA `sys.path` explica
        # la llamada, no el import: se va con ella.
        probe = call.lineno - 2
        while probe >= 0 and lines[probe].lstrip().startswith("#") and "sys.path" in lines[probe]:
            drop.add(probe)
            probe -= 1

    dirs = candidate_dirs(path)
    own = {p.stem for p in path.parent.glob("*.py")} | {p.name for p in path.parent.iterdir() if p.is_dir()}
    changed = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                pkg = package_of(alias.name, dirs, path.resolve())
                if pkg and "." not in alias.name:
                    changed.append((node.lineno - 1, alias.name, pkg, "import"))
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            head = node.module.split(".")[0]
            pkg = package_of(head, dirs, path.resolve())
            if pkg:
                changed.append((node.lineno - 1, node.module, pkg, "from"))

    for index, name, pkg, kind in changed:
        line = lines[index]
        if kind == "import":
            lines[index] = re.sub(rf"^(\s*)import {re.escape(name)}\b",
                                  rf"\1from {pkg} import {name}", line, count=1)
        else:
            lines[index] = re.sub(rf"^(\s*)from {re.escape(name)}\b",
                                  rf"\1from {pkg}.{name}", line, count=1)
        # El comentario que explicaba la via alterna describe una linea muerta.
        lines[index] = re.sub(r"#\s*noqa: E402\s*[—-].*$", "# noqa: E402", lines[index].rstrip()) + "\n"

    out = "".join(l for i, l in enumerate(lines) if i not in drop)
    if "sys.path" not in out and re.search(r"^import sys$", out, re.M):
        usa_sys = re.search(r"\bsys\.(?!path)", out)
        if not usa_sys:
            out = re.sub(r"^import sys\n", "", out, count=1, flags=re.M)
    if apply_changes and out != text:
        path.write_text(out, encoding="utf-8")
    return len(drop), len(changed)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("targets", nargs="*", help="archivos; vacio = todo src/")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    paths = ([pathlib.Path(t).resolve() for t in args.targets]
             or [p for p in sorted(SRC.rglob("*.py")) if "__pycache__" not in p.parts])
    total_drop = total_import = touched = 0
    for path in paths:
        result = rewrite(path, args.apply)
        if not result:
            continue
        dropped, imports = result
        touched += 1
        total_drop += dropped
        total_import += imports
        print(f"{path.relative_to(ROOT)}\tlineas_retiradas={dropped}\timports_reescritos={imports}")
    print(f"--- archivos {touched} | lineas retiradas {total_drop} | imports reescritos {total_import}")


if __name__ == "__main__":
    main()
