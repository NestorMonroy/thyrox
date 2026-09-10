#!/usr/bin/env python3
"""El arbol documental sale del consumidor DECLARADO, no del cwd.

Mitad ROJA. `fechar-documentos` y `clasificar-documentos` reciben ya el
consumidor en `--repo`/`--claude-dir`, y aun asi resuelven su arbol con
`--repo-docs` cuyo default es `"."`. Corridos desde el proveedor componen
`thyrox/source`, que no existe, y rehusan con exit 2 — por eso la tabla
`documents` lleva dias sin una fila.

Es la misma forma que `check_workbench.py` tenia: el mecanismo compone la
ruta del consumidor desde su propia posicion en vez de desde lo declarado.

CONTROL DE ANULACION: si el default volviera a `"."`, el caso 2 cae —y solo
el 2—. El 1 mide la bandera explicita, que ningun default afecta.
"""
from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE / "src"))
from paths import reach  # noqa: E402

spec = importlib.util.spec_from_file_location("agent_store", HERE / "src" / "agents" / "agent_store.py")
store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]"); FAILED += 1


print("== 1. la bandera explicita manda ==")
class _Args:
    repo = "docs"; claude_dir = None; repo_docs = "/un/arbol/declarado"; subtree = "source"
check("con --repo-docs se usa tal cual", Path("/un/arbol/declarado"),
      store.document_root(_Args()))

print("== 2. sin bandera, se DERIVA del consumidor ya nombrado en --repo ==")
class _Sin:
    repo = "docs"; claude_dir = None; repo_docs = None; subtree = "source"
check("--repo docs resuelve al arbol de docs", reach.root("docs"),
      store.document_root(_Sin()))

print("== 3. --claude-dir tambien lo determina ==")
class _Cd:
    repo = None; claude_dir = str(reach.root("api") / ".claude"); repo_docs = None; subtree = "source"
check("el padre de .claude es la raiz", reach.root("api"), store.document_root(_Cd()))

print("== 4. corrido DESDE el proveedor ya no compone thyrox/source ==")
hecho = subprocess.run(
    [sys.executable, str(HERE / "src" / "agents" / "agent_store.py"),
     "clasificar-documentos", "--repo", "docs", "--dry-run"],
    capture_output=True, text=True, cwd=str(HERE), timeout=300)
check("no rehusa por ruta inexistente", False, "no existe" in hecho.stderr)
check("y no nombra el arbol del proveedor", False, "thyrox/source" in hecho.stderr)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
