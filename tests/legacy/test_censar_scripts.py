#!/usr/bin/env python3
"""Suite de ``corpus/censar_scripts.py`` — el censo ve el fondo REORGANIZADO.

Origen: H-DOCS-1020. La mudanza ``d566c180`` agrupó el fondo por clase
(``gates/ session/ agents/ task/ corpus/ graph/``) y el censo siguió leyendo
a profundidad 1: publicaba 21 guiones donde el árbol tiene más de cien, y su
``--huerfanos`` daba «0 en baseline» porque ``BASELINE`` apuntaba a la ruta
anterior a la mudanza. Dos verdes que medían el universo equivocado.

Los casos corren sobre un repo git SINTÉTICO —el censo cita con ``git grep``—
y el control positivo del baseline se mide contra el repo REAL, porque ahí es
donde el archivo tiene que existir.
"""
from __future__ import annotations

import importlib.util
import os
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("censar", HERE / "corpus" / "censar_scripts.py")
censar = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(censar)

PASS = 0
FAIL = 0


def check(condition: bool, label: str, detail: str = "") -> None:
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ok   {label}")
    else:
        FAIL += 1
        print(f"  FAIL {label}" + (f"\n       {detail}" if detail else ""))


def synthetic_repo() -> pathlib.Path:
    """Un repo con el fondo ya agrupado por clase, más las tres carpetas que quedan fuera."""
    root = pathlib.Path(tempfile.mkdtemp(prefix="censo-"))
    files = {
        ".claude/scripts/root_tool.sh": "#!/bin/bash\n",
        ".claude/scripts/gates/check_something.py": "print(1)\n",
        ".claude/scripts/agents/nested/deep_tool.py": "print(2)\n",
        ".claude/scripts/tests/test-something.sh": "#!/bin/bash\n",
        ".claude/scripts/docs/note.py": "print(3)\n",
        ".claude/scripts/__pycache__/cached.py": "\n",
        "scripts/build.sh": "#!/bin/bash\n",
        "scripts/utils/logging.sh": "#!/bin/bash\n",
        "source/a.rst": "cita ``check_something.py`` y ``logging.sh``\n",
    }
    for rel, body in files.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body)
    env = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t",
           "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"}
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "seed"], cwd=root, env=env, check=True)
    return root


print("== censar_scripts.py — descubrimiento sobre el fondo agrupado por clase ==")
repo = synthetic_repo()
real_root = censar.ROOT
censar.ROOT = repo
try:
    paths = {r["path"] for r in censar.survey()}
finally:
    censar.ROOT = real_root

check(".claude/scripts/gates/check_something.py" in paths,
      "ve un guion en una subcarpeta de clase (gates/)", f"paths={sorted(paths)}")
check(".claude/scripts/agents/nested/deep_tool.py" in paths,
      "recurre más de un nivel (agents/nested/)")
check(".claude/scripts/root_tool.sh" in paths,
      "sigue viendo la raíz de .claude/scripts")
check("scripts/utils/logging.sh" in paths,
      "recurre también bajo scripts/ (producto)")
check(not any("/tests/" in p for p in paths),
      "CONTROL — tests/ queda fuera del universo, como declara su Ciega a")
check(not any("/docs/" in p for p in paths),
      "CONTROL — docs/ queda fuera del universo, como declara su Ciega a")
check(not any("__pycache__" in p for p in paths),
      "CONTROL — __pycache__ nunca es un guion")

print("== la clase se deriva del citante también con la ruta anidada ==")
censar.ROOT = repo
try:
    rows = {r["path"]: r for r in censar.survey()}
finally:
    censar.ROOT = real_root
check(rows.get(".claude/scripts/gates/check_something.py", {}).get("class") == "gate-de-reporte",
      "gates/check_something.py citado desde docs → gate-de-reporte",
      f"class={rows.get('.claude/scripts/gates/check_something.py', {}).get('class')}")
check(rows.get(".claude/scripts/agents/nested/deep_tool.py", {}).get("class") == "huerfano",
      "deep_tool.py sin citante → huerfano (el instrumento sí puede fallar)")

print("== el baseline de huérfanos apunta a un archivo que EXISTE en el repo real ==")
check(censar.BASELINE.exists(),
      f"BASELINE existe: {censar.BASELINE.relative_to(real_root)}",
      "el generador declara una ruta anterior a la mudanza; --huerfanos lee 0 en baseline")

print(f"\nresultado: {PASS} ok, {FAIL} fallas")
sys.exit(1 if FAIL else 0)
