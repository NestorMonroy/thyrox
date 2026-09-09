#!/usr/bin/env python3
"""Sin bandera, el store es el HOGAR — nunca una cascara en un consumidor.

Mitad ROJA. `resolve_store_dir` declara tres peldanos y su tercero
—«nada -> el HOGAR de thyrox»— es INALCANZABLE: `add_target_args` declara
`--repo` con `default="docs"`, asi que `args.repo` nunca es None y toda
llamada sin bandera resuelve al store muerto del consumidor.

Sintoma medido: `reconcile_store.py` reportaba «7 fallidos» sin razon, y los
ocho transcripts reparables fallaban con
`ERROR: agent_id <id> no existe en /home/user/kaupamex-docs/.claude/agent-results/agent_store.sqlite3`.

CONTROL DE ANULACION, medido con mutacion de UN eje por vez:

- revertir SOLO el default de `--repo` a `"docs"` -> caen las TRES aserciones
  del caso 3, y ninguna otra (3 ok, 3 fallos);
- revertir SOLO el respaldo de `document_root` -> cae el caso 4, y solo el 4
  (5 ok, 1 fallo).

El caso 2 es inmune por construccion —fija `repo = None` a mano, asi que no
mide el parser— y el 1 mide la bandera explicita, que ningun default afecta.

Una primera version de este control muto con `sed` sobre `^        default=None,$`
y toco TRES banderas a la vez, entre ellas `--claude-dir`. Bajo esa mutacion la
asercion del prefijo `kaupamex-` sobrevivio —`Path("docs").resolve()` cae dentro
del proveedor y no lleva el prefijo— y de ahi salio la afirmacion, falsa, de que
«por si sola no discrimina». Una mutacion que toca varios ejes no dice cual de
ellos sostiene cada asercion: es el sub-patron D dentro del propio control.
"""
from __future__ import annotations

import importlib.util
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


print("== 1. la bandera explicita sigue mandando ==")
class _Explicito:
    repo = "docs"; claude_dir = None
check("--repo docs resuelve al store del consumidor",
      reach.root("docs") / ".claude" / "agent-results",
      store.resolve_store_dir(_Explicito()))

print("== 2. sin bandera, el HOGAR ==")
class _Sin:
    repo = None; claude_dir = None
check("nada declarado -> agent_store_path().parent",
      reach.agent_store_path().parent,
      store.resolve_store_dir(_Sin()))

print("== 3. el DEFAULT del parser no compone un consumidor ==")
argumentos = store.build_parser().parse_args(["init"])
check("--repo nace sin valor", None, getattr(argumentos, "repo", "AUSENTE"))
resuelto = store.resolve_store_dir(argumentos)
check("y el destino sin bandera no cae en un consumidor", False,
      any(parte.startswith("kaupamex-") for parte in resuelto.parts))
check("el destino sin bandera es el hogar",
      reach.agent_store_path().parent, resuelto)

print("== 4. el arbol documental no se rompe con --repo ausente ==")
class _Doc:
    repo = None; claude_dir = None; repo_docs = None; subtree = "source"
try:
    obtenido = store.document_root(_Doc())
except Exception as fallo:                      # noqa: BLE001 — el rehuse ES el defecto
    obtenido = f"{type(fallo).__name__}: {fallo}"
check("document_root sigue dando el arbol de docs", reach.root("docs"), obtenido)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
