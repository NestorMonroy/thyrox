#!/usr/bin/env python3
"""Sonda v2 — la misma particion, resolviendo UN nivel de ligadura.

La v1 dejo 90 de 104 en «opaca» porque el receptor casi nunca es la expresion:
es un nombre (`base`, `FUENTE`, `raiz`) ligado una linea antes. Resolver esa
ligadura —constante de modulo o asignacion en la misma funcion— es lo que
separa «no se puede ver» de «mi clasificador no miraba».
"""
from __future__ import annotations

import ast
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src"))

TRAVERSAL_CALLS = {"rglob", "walk", "glob", "iglob"}

LIGHT_SEGMENTS = {
    "src", "tests", "source", "bin", "docs", "scripts", "addons", "hooks",
    "verify", "session", "agents", "task", "packages", "workbench", "eventos",
    "baselines", "rules", "skills", "corpus", "hallazgo", "roster", "cache",
}
BARE_ROOT_CALLS = {"thyrox_root", "consumer_root", "repo_root", "home", "cwd",
                   "provider_root", "docs_root"}


class Bindings(ast.NodeVisitor):
    """name -> expresion asignada, por modulo y por funcion."""

    def __init__(self) -> None:
        self.module: dict[str, ast.AST] = {}
        self.local: dict[str, dict[str, ast.AST]] = {}
        self._fn: str | None = None

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        prev, self._fn = self._fn, node.name
        self.local.setdefault(node.name, {})
        self.generic_visit(node)
        self._fn = prev

    visit_AsyncFunctionDef = visit_FunctionDef  # type: ignore[assignment]

    def visit_Assign(self, node: ast.Assign) -> None:
        for t in node.targets:
            if isinstance(t, ast.Name):
                (self.local[self._fn] if self._fn else self.module)[t.id] = node.value
        self.generic_visit(node)

    def visit_For(self, node: ast.For) -> None:
        if isinstance(node.target, ast.Name):
            (self.local[self._fn] if self._fn else self.module)[node.target.id] = node.iter
        self.generic_visit(node)


def describe(node: ast.AST, binds: Bindings, fn: str | None, depth: int = 0) -> list[str]:
    """La cadena de nombres que produce la expresion, con UNA resolucion."""
    out: list[str] = []
    cur = node
    while True:
        if isinstance(cur, ast.Call):
            cur = cur.func
        elif isinstance(cur, ast.Attribute):
            out.append(cur.attr)
            cur = cur.value
        elif isinstance(cur, ast.BinOp) and isinstance(cur.op, ast.Div):
            if isinstance(cur.right, ast.Constant) and isinstance(cur.right.value, str):
                out.append(f"/{cur.right.value}")
            elif isinstance(cur.right, ast.Name):
                out.append(f"/<{cur.right.id}>")
            cur = cur.left
        elif isinstance(cur, ast.Name):
            out.append(cur.id)
            if depth < 2:
                src = (binds.local.get(fn or "", {}).get(cur.id)
                       or binds.module.get(cur.id))
                if src is not None:
                    out.extend(describe(src, binds, fn, depth + 1))
            break
        elif isinstance(cur, ast.Constant) and isinstance(cur.value, str):
            out.append(f"={cur.value}")
            break
        elif isinstance(cur, ast.Subscript):
            cur = cur.value
        else:
            out.append(type(cur).__name__)
            break
    return out


def classify(chain: list[str], pattern: str) -> str:
    joined = " ".join(chain)
    for seg in LIGHT_SEGMENTS:
        if f"/{seg}" in joined:
            return "estrechada-ligera"
    if "/<" in joined:                      # estrechada por variable
        return "estrechada-por-variable"
    for c in chain:
        if c.startswith("=") and c[1:].startswith("/"):
            return "raiz-desnuda"
    if any(c in BARE_ROOT_CALLS for c in chain):
        return "raiz-desnuda"
    return "opaca"


def scan(path: Path):
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(text)
    except SyntaxError:
        return []
    lines = text.splitlines()
    binds = Bindings()
    binds.visit(tree)
    fn_of: dict[int, str] = {}
    for n in ast.walk(tree):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for sub in ast.walk(n):
                if hasattr(sub, "lineno"):
                    fn_of.setdefault(sub.lineno, n.name)
    out = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        name = node.func.attr if isinstance(node.func, ast.Attribute) else (
            node.func.id if isinstance(node.func, ast.Name) else None)
        if name not in TRAVERSAL_CALLS:
            continue
        # ``ast.walk`` recorre un AST, no un arbol de directorios. Contarlo
        # bajo la misma etiqueta es el sub-patron A: un rotulo sobre dos
        # fenomenos. ``walk`` cuenta SOLO anclado a ``os``.
        if name == "walk":
            recv = node.func.value if isinstance(node.func, ast.Attribute) else None
            if not (isinstance(recv, ast.Name) and recv.id == "os"):
                continue
        line = lines[node.lineno - 1] if node.lineno <= len(lines) else ""
        if name in {"glob", "iglob"} and "**" not in line and "recursive" not in line:
            continue
        receiver = node.func.value if isinstance(node.func, ast.Attribute) else node
        if name == "walk" and node.args:
            receiver = node.args[0]
        chain = describe(receiver, binds, fn_of.get(node.lineno))
        out.append((name, "·".join(chain), node.lineno, classify(chain, line)))
    return out


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/user/thyrox")
    cubos: dict[str, list[str]] = {}
    listado = subprocess.run(["git", "-C", str(root), "ls-files", "*.py"],
                             capture_output=True, text=True, check=True).stdout.split()
    total = 0
    for rel in listado:
        for name, chain, lineno, cubo in scan(root / rel):
            total += 1
            cubos.setdefault(cubo, []).append(f"{rel}:{lineno} {name}({chain})")
    print(f"recorridos: {total} · .py medidos: {len(listado)}")
    for cubo in sorted(cubos, key=lambda c: -len(cubos[c])):
        print(f"\n=== {cubo}: {len(cubos[cubo])} ===")
        if cubo != "estrechada-ligera":
            for it in cubos[cubo]:
                print(f"  {it}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
