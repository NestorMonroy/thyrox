#!/usr/bin/env python3
"""Sonda — particion de los recorridos recursivos por la EXPRESION de su raiz.

No decide nada: mide. La pregunta que responde es si la segunda condicion del
detector —la raiz pesada— es estaticamente decidible en un archivo, y con que
reparto. Si el cubo «raiz desnuda» es un punado, un gate estatico discrimina;
si casi todo cae en «opaca», no puede ver el fenomeno y eso es el resultado.

Reusa ``UNBOUNDED_SHAPES`` del detector en vez de copiarlo: una segunda fuente
de verdad de un recorrido es lo que el corolario de
``calibration-verified-numbers.md`` prohibe para una cifra.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src"))
from hooks.detect_unbounded_traversal import UNBOUNDED_SHAPES  # noqa: E402

SHAPES = [(label, re.compile(pattern)) for label, pattern in UNBOUNDED_SHAPES]

#: Llamadas de pathlib/os que descienden sin limite declarado.
TRAVERSAL_CALLS = {"rglob", "walk", "glob", "iglob"}

#: Una raiz ESTRECHADA por un join ligero: el subarbol no lleva el volumen.
#: Son los nombres que este arbol usa para sus propias raices de trabajo.
LIGHT_SEGMENTS = {
    "src", "tests", "source", "bin", "docs", "scripts", "addons",
    "hooks", "verify", "session", "agents", "task", "packages",
    ".claude", "workbench", "eventos", "baselines", "rules", "skills",
}

#: Productores de una raiz DESNUDA: la raiz del arbol, el home, un literal.
BARE_ROOT_CALLS = {"thyrox_root", "consumer_root", "repo_root", "home", "cwd"}


def _receiver_chain(node: ast.AST) -> list[str]:
    """Los nombres de la cadena que produce el receptor, de dentro a fuera."""
    out: list[str] = []
    cur = node
    while True:
        if isinstance(cur, ast.Call):
            cur = cur.func
        elif isinstance(cur, ast.Attribute):
            out.append(cur.attr)
            cur = cur.value
        elif isinstance(cur, ast.BinOp) and isinstance(cur.op, ast.Div):
            # Path / "src" — el lado derecho es el estrechamiento
            if isinstance(cur.right, ast.Constant) and isinstance(cur.right.value, str):
                out.append(f"/{cur.right.value}")
            cur = cur.left
        elif isinstance(cur, ast.Name):
            out.append(cur.id)
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


def classify(chain: list[str], args_src: str) -> str:
    """El cubo del recorrido, por la expresion que produce su receptor."""
    joined = " ".join(chain)
    # Un join ligero en la cadena, o en el patron del glob, estrecha la raiz.
    for seg in LIGHT_SEGMENTS:
        if f"/{seg}" in joined or re.search(rf"\b{re.escape(seg)}\b", args_src):
            return "estrechada-ligera"
    for literal in chain:
        if literal.startswith("=") and ("/home/user" in literal or literal == "=/"):
            return "raiz-desnuda"
    if any(c in BARE_ROOT_CALLS for c in chain):
        return "raiz-desnuda"
    if any(c.startswith("=") and c[1:].startswith("/") for c in chain):
        return "raiz-desnuda"
    return "opaca"


def scan(path: Path) -> list[tuple[str, str, int, str]]:
    """Los recorridos de un ``.py``, con su cubo. Vacio si no parsea."""
    try:
        tree = ast.parse(path.read_text(encoding="utf-8", errors="replace"))
    except SyntaxError:
        return []
    src = path.read_text(encoding="utf-8", errors="replace").splitlines()
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        name = None
        if isinstance(node.func, ast.Attribute):
            name = node.func.attr
        elif isinstance(node.func, ast.Name):
            name = node.func.id
        if name not in TRAVERSAL_CALLS:
            continue
        line = src[node.lineno - 1] if node.lineno <= len(src) else ""
        # glob/iglob sin `**` ni recursive=True no desciende
        if name in {"glob", "iglob"} and "**" not in line and "recursive" not in line:
            continue
        receiver = node.func.value if isinstance(node.func, ast.Attribute) else node
        chain = _receiver_chain(receiver)
        args_src = line
        found.append((name, "·".join(chain), node.lineno, classify(chain, args_src)))
    return found


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/user/thyrox")
    cubos: dict[str, list[str]] = {"estrechada-ligera": [], "raiz-desnuda": [], "opaca": []}
    archivos = 0
    import subprocess
    listado = subprocess.run(
        ["git", "-C", str(root), "ls-files", "*.py"],
        capture_output=True, text=True, check=True,
    ).stdout.split()
    for rel in listado:
        p = root / rel
        hits = scan(p)
        if not hits:
            continue
        archivos += 1
        for name, chain, lineno, cubo in hits:
            cubos[cubo].append(f"{rel}:{lineno} {name}({chain})")
    total = sum(len(v) for v in cubos.values())
    print(f"archivos con recorrido: {archivos} · recorridos: {total} "
          f"· .py medidos: {len(listado)}")
    for cubo, items in cubos.items():
        print(f"\n=== {cubo}: {len(items)} ===")
        for it in items if cubo != "estrechada-ligera" else items[:0]:
            print(f"  {it}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
