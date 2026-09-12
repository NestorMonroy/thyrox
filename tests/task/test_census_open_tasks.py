#!/usr/bin/env python3
"""Suite de ``task/census_open_tasks.py`` — el censo de tareas abiertas por capa.

Se escribio ANTES que el instrumento. Su sujeto es el porte del probe congelado
``kaupamex-docs: .claude/eventos/close-open-docs-tasks-20260912T100232/probes/
census_open_docs_tasks.py``, que respondio la parte DOCS del encargo y que
**no se edita en su sitio**: un banco fechado cuyo ``probes/`` dejara de
contener el instrumento que produjo sus ``outputs/`` repetiria la falla de
procedencia que su propio README ya registra.

Lo que el porte añade sobre la fuente, y por que cada pieza tiene caso:

1. **``--layer`` es obligatorio y sin default.** Un default seria un universo
   silencioso: el consumidor creeria medir su capa y mediria otra.
2. **``--layer`` se valida contra el catalogo declarado**, no contra un
   literal. ``LAYERS`` y ``UNKNOWN_LAYER`` viven en ``task_ids``; copiarlos
   aqui seria la segunda fuente de verdad que
   ``calibration-verified-numbers.md`` prohibe.
3. **El filtro de capa llega al SQL.** Es el control de anulacion del porte:
   con dos capas en la misma base, el censo de una no puede contar la otra.
4. **La ERE del ``grep`` no es el patron de Python.** POSIX no conoce ``\\d``;
   reusarlo devuelve cero coincidencias SIN error, y el silencio se lee como
   ausencia (sub-patron D).
5. **``normalize_hit_path`` no usa ``lstrip('./')``.** Ese borra TODO punto o
   barra inicial, asi que ``./.claude/…`` quedaba en ``claude/…`` y el
   descuento de render nunca casaba.
6. **``/preimagen/`` se descuenta.** Tres volcados del tablero citaban 292
   tareas cada uno por construccion y producian el 94 % de las «citas en
   prosa».
7. **El alcance incluye al PROVEEDOR.** ``reach()`` resuelve los cinco clones
   consumidores y **no** thyrox: un ``TASK-THYROX-NNNN`` cerrado por un commit
   de este arbol seria invisible.
8. **El bloque ``__main__``** — sin el, el modulo no es ejecutable y el gate
   #312 lo marca.
"""

from __future__ import annotations

import importlib.util
import pathlib
import sqlite3
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "src"))
from paths import reach  # noqa: E402

SRC = reach.thyrox_root() / "src" / "task"
MODULE_PATH = SRC / "census_open_tasks.py"

sys.path.insert(0, str(SRC))
_spec = importlib.util.spec_from_file_location("census_open_tasks", MODULE_PATH)
cot = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cot)

import task_ids  # noqa: E402

failures: list[str] = []
checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(label)


TMP = pathlib.Path(tempfile.mkdtemp(prefix="census-open-tasks-"))


def make_store(path: pathlib.Path) -> None:
    """Una base con filas de DOS capas — el fixture que hace fallar al ciego."""
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE tasks (citation_id TEXT, task_id TEXT, session_id TEXT,"
        " status TEXT, subject TEXT, source TEXT, submodule TEXT,"
        " submodule_source TEXT, created_at TEXT, updated_at TEXT)"
    )
    rows = [
        # capa docs: una abierta, una cerrada (la cerrada NO entra al universo)
        ("TASK-DOCS-0001", "1", "s", "pending", "docs abierta", "x", "docs", "y", "t", "t"),
        ("TASK-DOCS-0002", "2", "s", "completed", "docs cerrada", "x", "docs", "y", "t", "t"),
        # capa api: dos abiertas — el censo de docs NO puede contarlas
        ("TASK-API-0001", "3", "s", "pending", "api abierta", "x", "api", "y", "t", "t"),
        ("TASK-API-0002", "4", "s", "in_progress", "api en curso", "x", "api", "y", "t", "t"),
    ]
    conn.executemany(
        "INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?,?,?)", rows)
    conn.commit()
    conn.close()


STORE = TMP / "store.sqlite3"
make_store(STORE)


# ---------------------------------------------------------------- 1. la capa

_docs = cot.open_tasks("docs", store=STORE)
_api = cot.open_tasks("api", store=STORE)

check([t["citation_id"] for t in _docs] == ["TASK-DOCS-0001"],
      "1a: el censo de docs devuelve solo la abierta de docs")
check(sorted(t["citation_id"] for t in _api)
      == ["TASK-API-0001", "TASK-API-0002"],
      "1b: el censo de api devuelve sus dos abiertas — el filtro llega al SQL")
check(all(t["status"] != "completed" for t in _docs + _api),
      "1c: `completed` queda fuera del universo en las dos capas")

# El catalogo es el declarado, no un literal de este modulo.
check(tuple(cot.LAYER_CHOICES)
      == tuple(task_ids.LAYERS) + (task_ids.UNKNOWN_LAYER,),
      "1d: las capas admitidas son las que `task_ids` declara, no una copia")

_bad = subprocess.run(
    [sys.executable, str(MODULE_PATH), "--layer", "no-existe", "--store", str(STORE)],
    capture_output=True, text=True)
check(_bad.returncode != 0, "1e: una capa fuera del catalogo no corre")

_sin = subprocess.run(
    [sys.executable, str(MODULE_PATH), "--store", str(STORE)],
    capture_output=True, text=True)
check(_sin.returncode != 0,
      "1f: sin `--layer` el programa rehusa — un default seria un universo silencioso")


# ------------------------------------------------- 2. la ERE del grep

check("\\d" not in cot.CITATION_ERE,
      "2a: la ERE no lleva `\\d` — POSIX no lo conoce y devolveria cero sin error")

_repo = TMP / "repo"
(_repo / "sub").mkdir(parents=True)
subprocess.run(["git", "init", "-q", str(_repo)], check=True)
(_repo / "sub" / "archivo.txt").write_text("nada\n", encoding="utf-8")
subprocess.run(["git", "-C", str(_repo), "add", "-A"], check=True)
subprocess.run(["git", "-C", str(_repo), "-c", "user.email=t@t", "-c", "user.name=t",
                "commit", "-q", "-m", "Cerrar el porte\n\nRefs: TASK-API-0001"],
               check=True)

_commits = cot.commit_citations(roots=(_repo,))
check("TASK-API-0001" in _commits,
      "2b: la ERE encuentra la cita en el mensaje de un commit real")
check(_commits["TASK-API-0001"] and _commits["TASK-API-0001"][0].startswith("repo@"),
      "2c: el commit se cita como `repo@hash`, no como hash suelto")


# --------------------------------------- 3. el descuento de render

check(cot.normalize_hit_path("kaupamex-docs", "./.claude/tasks/x.json")
      == "kaupamex-docs/.claude/tasks/x.json",
      "3a: `./` se recorta como prefijo, no con `lstrip` — ese borra todo punto inicial")
check(cot.is_render(cot.normalize_hit_path("kaupamex-docs", "./.claude/tasks/x.json")),
      "3b: y por eso el volcado del tablero SI queda descontado")
check(cot.is_render("kaupamex-docs/source/preimagen/tasks-s.tsv"),
      "3c: `/preimagen/` se descuenta — sus volcados citan el tablero entero")
check(not cot.is_render("kaupamex-api/src/addons/base/models/ir_cron.py"),
      "3d: un archivo de codigo NO es render — el descuento tiene que poder no aplicar")


# ------------------------------------ 4. el alcance incluye al proveedor

_roots = cot.census_roots()
_names = {p.name for p in _roots}
check(reach.thyrox_root().name in _names,
      "4a: el alcance incluye al PROVEEDOR — `reach()` solo resuelve consumidores")
check(all(reach.root(r).name in _names for r in reach.reach_roots()),
      "4b: y tambien los cinco clones consumidores que `reach()` declara")
check(len(_roots) == len(set(_roots)),
      "4c: sin raices repetidas — una cita contada dos veces infla `closed_in_tree`")


# ------------------------------------------------- 5. los tres cubos

#: Poblacion PROPIA, no `_api`: este bloque mide el reparto en cubos, que es
#: ortogonal al filtro de capa. Reusar `_api` encadenaba cuatro aserciones al
#: mismo defecto y la anulacion dejaba de discriminar cual media que.
_poblacion = [
    {"citation_id": "TASK-API-0001", "status": "pending", "subject": "con commit"},
    {"citation_id": "TASK-API-0002", "status": "pending", "subject": "solo prosa"},
]
_buckets = cot.build_buckets(
    _poblacion,
    {"TASK-API-0001": ["repo@abc12345"]},
    {"TASK-API-0002": {"kaupamex-api/src/x.py"}},
)
check([t["citation_id"] for t in _buckets["closed_in_tree"]] == ["TASK-API-0001"],
      "5a: con commit que la nombra -> `closed_in_tree`")
check([t["citation_id"] for t in _buckets["owned_but_open"]] == ["TASK-API-0002"],
      "5b: citada en prosa y sin commit -> `owned_but_open`")
check(_buckets["orphan"] == [],
      "5c: `orphan` es el resto, y aqui no hay resto")

_huerfana = cot.build_buckets(_docs, {}, {})
check([t["citation_id"] for t in _huerfana["orphan"]] == ["TASK-DOCS-0001"],
      "5d: sin commit ni prosa -> `orphan`")


# -------------------------------------------- 6. el programa corre

_ok = subprocess.run(
    [sys.executable, str(MODULE_PATH), "--layer", "api", "--store", str(STORE),
     "--out-dir", str(TMP / "salidas")],
    capture_output=True, text=True)
check(_ok.returncode == 0, f"6a: el programa corre y sale 0 ({_ok.stderr[-300:]})")
check("submodule='api'" in _ok.stdout,
      "6b: declara su universo en la salida — la capa medida, no «las tareas»")
check((TMP / "salidas" / "census_open_api_tasks.json").is_file(),
      "6c: el detalle aterriza en un archivo; el resumen no lo sustituye")

_src = MODULE_PATH.read_text(encoding="utf-8")
check('if __name__ == "__main__":' in _src,
      "6d: el modulo declara su bloque `__main__` (#312)")

print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    sys.exit(1)
print("OK: todas las aserciones pasan")
