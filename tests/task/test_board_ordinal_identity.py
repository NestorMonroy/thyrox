#!/usr/bin/env python3
"""La identidad de una tarjeta del board es ``(session_id, board_ordinal)``.

Complemento de ``test_task_ids.py`` (su seccion 10 trae el contrato minimo de
``ingest_board``). Aqui vive lo que necesita construir una copia MUTANTE de
la fuente para medir de verdad, no de memoria (``evidencia-antes-de-afirmar.md``):
los CUATRO controles de anulacion que la tarea exige, cada uno con el conteo
exacto de lo que cae al retirar la pieza que mide.

H-THYROX-252 — el episodio — y su reparacion completa (columna, indice
parcial, `ingest_board`, `link_board_ordinal`, `snapshot-tareas`) se miden
aqui end-to-end, no por partes: un mutante que solo tocara una pieza no
distinguiria cual de las cuatro es la que realmente protege.
"""

from __future__ import annotations

import json
import pathlib
import sqlite3
import sys
import tempfile

# Los mutantes de abajo son archivos HERMANOS reales, en `src/`: sin esto,
# cada carga via `spec_from_file_location` dejaria su `.pyc` en el
# `__pycache__` del arbol real, pese a que `.unlink()` borra el `.py`.
sys.dont_write_bytecode = True

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

MODULE_PATH = reach.thyrox_root() / "src" / "task" / "task_ids.py"
STORE_MODULE_PATH = reach.thyrox_root() / "src" / "agents" / "agent_store.py"

import importlib.util

_spec = importlib.util.spec_from_file_location("task_ids", MODULE_PATH)
assert _spec is not None and _spec.loader is not None
kx = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kx)

_spec2 = importlib.util.spec_from_file_location("agent_store", STORE_MODULE_PATH)
assert _spec2 is not None and _spec2.loader is not None
ag = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(ag)

failures: list[str] = []
checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(label)


S = "sesion-identidad"


def _store_conn(rows):
    """Un store minimo, MISMA forma que el de ``test_task_ids.py``.

    ``filas`` = ``(task_id, subject, session_id, submodule, citation_id)``
    o, con sexto elemento, ``(..., board_ordinal)`` explicito.
    """
    d = pathlib.Path(tempfile.mkdtemp())
    db = d / "s.sqlite3"
    c = sqlite3.connect(db)
    c.execute("CREATE TABLE tasks (task_id TEXT, subject TEXT, description TEXT,"
              " status TEXT, session_id TEXT, source TEXT, created_at TEXT,"
              " updated_at TEXT, submodule TEXT, submodule_source TEXT,"
              " opened_at TEXT, opened_at_source TEXT, citation_id TEXT,"
              " board_ordinal INTEGER)")
    for f in rows:
        if len(f) == 6:
            task_id, subject, session_id, submodule, citation_id, board_ordinal = f
        else:
            task_id, subject, session_id, submodule, citation_id = f
            board_ordinal = int(task_id)
        c.execute("INSERT INTO tasks (task_id, subject, session_id, submodule,"
                  " citation_id, board_ordinal) VALUES (?,?,?,?,?,?)",
                  (task_id, subject, session_id, submodule, citation_id, board_ordinal))
    c.commit(); c.close()
    return d, db


def _board_conn(cards):
    d = pathlib.Path(tempfile.mkdtemp())
    for ordinal, data in cards.items():
        (d / f"{ordinal}.json").write_text(json.dumps(data))
    return d


# ---------------------------------------------------------------------------
# 1 — `link_board_ordinal`: exito y sus TRES rehuses.
# ---------------------------------------------------------------------------
_, DB1 = _store_conn([
    ("1", "A", S, "gen", "TASK-GEN-0001", None),
    ("2", "B", S, "gen", "TASK-GEN-0002", 7),
])

kx.link_board_ordinal(DB1, S, "TASK-GEN-0001", 3)
connection = sqlite3.connect(DB1)
pinned = connection.execute("SELECT board_ordinal FROM tasks WHERE citation_id = ?",
                     ("TASK-GEN-0001",)).fetchone()[0]
connection.close()
check(pinned == 3, "1a: link_board_ordinal fija el ordinal de la fila")

try:
    kx.link_board_ordinal(DB1, S, "TASK-GEN-9999", 4)
    check(False, "1b: una cita que no existe en la sesion debe REHUSAR")
except kx.MappingError as exc:
    check("TASK-GEN-9999" in str(exc), "1b: y la nombra")

try:
    kx.link_board_ordinal(DB1, S, "TASK-GEN-0002", 8)
    check(False, "1c: una fila que YA tiene ordinal debe REHUSAR")
except kx.MappingError as exc:
    check("7" in str(exc), "1c: y nombra el ordinal que ya tenia")

_, DB1b = _store_conn([
    ("1", "A", S, "gen", "TASK-GEN-0001", None),
    ("2", "B", S, "gen", "TASK-GEN-0002", 7),
])
try:
    kx.link_board_ordinal(DB1b, S, "TASK-GEN-0001", 7)
    check(False, "1d: un ordinal que ya pertenece a OTRA fila debe REHUSAR")
except kx.MappingError as exc:
    check("TASK-GEN-0002" in str(exc), "1d: y nombra a la fila que lo ocupa")

# 1e — nada se escribio en los rehuses.
connection = sqlite3.connect(DB1)
intact = connection.execute("SELECT board_ordinal FROM tasks WHERE citation_id = ?",
                      ("TASK-GEN-0002",)).fetchone()[0]
connection.close()
check(intact == 7, "1e: los rehuses no tocan ninguna fila")


# ---------------------------------------------------------------------------
# 2 — end-to-end: el episodio completo, con `agent_store.connect()` real (no
#     el fixture minimo) — snapshot-tareas escribe el ordinal, y una tarjeta
#     renombrada no duplica su cita.
# ---------------------------------------------------------------------------
CLAUDE_DIR = pathlib.Path(tempfile.mkdtemp())
STORE_DIR = CLAUDE_DIR / "agent-results"
conn = ag.connect(STORE_DIR)
conn.close()
STORE_FILE = STORE_DIR / ag.DB_FILENAME

TASKS_DIR = pathlib.Path(tempfile.mkdtemp()) / S
TASKS_DIR.mkdir(parents=True)
(TASKS_DIR / "7.json").write_text(json.dumps(
    {"id": 7, "subject": "Sujeto original", "status": "pending",
     "description": ""}))

class _Args:
    def __init__(self, **kw):
        self.__dict__.update(kw)

ag.cmd_snapshot_tasks(_Args(
    tasks_dir=str(TASKS_DIR), claude_dir=str(CLAUDE_DIR), session_id=S,
    source="prueba", allow_reassignment=False))

connection = sqlite3.connect(STORE_FILE)
written_ordinal = connection.execute(
    "SELECT board_ordinal FROM tasks WHERE session_id = ? AND task_id = ?",
    (S, "7")).fetchone()[0]
connection.close()
check(written_ordinal == 7, "2a: snapshot-tareas escribe board_ordinal = id de la tarjeta")

# Se acuña la cita inicial.
BOARD_E2E = _board_conn({"7": {"id": 7, "subject": "Sujeto original",
                              "status": "pending", "description": ""}})
kx.ingest_board(STORE_FILE, BOARD_E2E, S, ["7"], layer="docs")
connection = sqlite3.connect(STORE_FILE)
initial_citation = connection.execute(
    "SELECT citation_id FROM tasks WHERE session_id = ? AND task_id = ?",
    (S, "7")).fetchone()[0]
connection.close()
check(initial_citation is not None and initial_citation.startswith("TASK-DOCS-"),
      "2b: la tarjeta recibe su cita inicial")

# La tarjeta se RENOMBRA en el board (el episodio real).
(TASKS_DIR / "7.json").write_text(json.dumps(
    {"id": 7, "subject": "Sujeto renombrado", "status": "pending",
     "description": ""}))
BOARD_E2E2 = _board_conn({"7": {"id": 7, "subject": "Sujeto renombrado",
                               "status": "pending", "description": ""}})
kx.ingest_board(STORE_FILE, BOARD_E2E2, S, ["7"], layer="docs")
connection = sqlite3.connect(STORE_FILE)
rows_e2e = connection.execute(
    "SELECT subject, citation_id FROM tasks WHERE session_id = ?",
    (S,)).fetchall()
connection.close()
check(len(rows_e2e) == 1,
      "2c: sigue habiendo UNA sola fila para esa tarjeta — H-THYROX-252 no reaparece")
check(rows_e2e[0][1] == initial_citation,
      "2d: la cita no se movio con el renombre")
check(rows_e2e[0][0] == "Sujeto renombrado",
      "2e: y el sujeto de la fila SI se actualizo")


# ---------------------------------------------------------------------------
# CONTROLES DE ANULACION — cada uno construye un MUTANTE hermano (nunca toca
# el original) y mide EXACTAMENTE lo que cae, con el conteo declarado en el
# label. Patron: `test-agent-store-reassignment-guard.sh` caso 5d.
# ---------------------------------------------------------------------------
import os

MUTANT_SUFFIX = f"_mutant_{os.getpid()}"


def _mutant_of(path: pathlib.Path, old: str, new: str, count_expected: int):
    """Escribe una copia HERMANA con `old` -> `new`, y devuelve su ruta.

    Hermana y no en /tmp: el bootstrap de `paths` de ambos modulos asciende
    desde `__file__` hasta encontrar el marcador del arbol, y una copia en
    /tmp nunca lo encuentra (mismo motivo que el mutante de
    test-agent-store-reassignment-guard.sh es hermano, no un fixture suelto).
    """
    text = path.read_text()
    mutated = text.replace(old, new)
    landed = text.count(old) - mutated.count(old)
    check(landed == count_expected,
          f"anulacion: el mutante de {path.name} SI aplico ({count_expected} "
          f"reemplazo(s) — si no, el control no mide nada)")
    mutant_path = path.parent / f"{path.stem}{MUTANT_SUFFIX}.py"
    mutant_path.write_text(mutated)
    return mutant_path


def _load(path: pathlib.Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"no se puede cargar {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# --- A. Retirar el INDICE PARCIAL — dos filas de la MISMA sesion pueden
#     compartir board_ordinal sin que SQLite se queje.
mutant_a = _mutant_of(
    STORE_MODULE_PATH,
    '    conn.execute(\n        "CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_board_ordinal "\n        "ON tasks(session_id, board_ordinal) WHERE board_ordinal IS NOT NULL")\n',
    "    pass  # anulacion: indice parcial retirado\n",
    1,
)
ag_without_index = _load(mutant_a, "agent_store_sin_indice")
d_a = pathlib.Path(tempfile.mkdtemp())
conn_a = ag_without_index.connect(d_a)
conn_a.execute(
    "INSERT INTO tasks (task_id, subject, status, session_id, created_at, "
    "  updated_at, board_ordinal) VALUES ('1','x','pending',?,?,?,5)",
    (S, "t", "t"))
conn_a.commit()
try:
    conn_a.execute(
        "INSERT INTO tasks (task_id, subject, status, session_id, created_at, "
        "  updated_at, board_ordinal) VALUES ('2','y','pending',?,?,?,5)",
        (S, "t", "t"))
    conn_a.commit()
    duplicated = True
except sqlite3.IntegrityError:
    duplicated = False
n_rows_ord5 = conn_a.execute(
    "SELECT COUNT(*) FROM tasks WHERE session_id = ? AND board_ordinal = 5",
    (S,)).fetchone()[0]
conn_a.close()
check(duplicated is True and n_rows_ord5 == 2,
      "A: SIN el indice, dos filas de la MISMA sesion comparten board_ordinal "
      "(2 filas con el mismo ordinal — 1 asercion cae respecto del original)")
mutant_a.unlink()

# El control de que el ORIGINAL SI protege — sin esto, A no discrimina nada.
d_a2 = pathlib.Path(tempfile.mkdtemp())
conn_a2 = ag.connect(d_a2)
conn_a2.execute(
    "INSERT INTO tasks (task_id, subject, status, session_id, created_at, "
    "  updated_at, board_ordinal) VALUES ('1','x','pending',?,?,?,5)",
    (S, "t", "t"))
conn_a2.commit()
try:
    conn_a2.execute(
        "INSERT INTO tasks (task_id, subject, status, session_id, created_at, "
        "  updated_at, board_ordinal) VALUES ('2','y','pending',?,?,?,5)",
        (S, "t", "t"))
    conn_a2.commit()
    protected = False
except sqlite3.IntegrityError:
    protected = True
conn_a2.close()
check(protected is True,
      "A-control: CON el indice (original), la misma insercion REHUSA — "
      "el mutante SI anulo la proteccion")


# --- B. Hacer que `ingest_board` vuelva a deduplicar por SUJETO — la prueba
#     de la tarjeta renombrada (2c/2d de arriba) tiene que CAER: por sujeto,
#     el renombre se lee como una tarjeta nueva.
mutant_b = _mutant_of(
    MODULE_PATH,
    '                " WHERE session_id = ? AND board_ordinal = ?",\n'
    "                (session_id, ordinal_int)\n",
    '                " WHERE session_id = ? AND subject = ?",\n'
    "                (session_id, subject)\n",
    1,
)
kx_subject = _load(mutant_b, "task_ids_subject_dedup")

_, DB_B = _store_conn([("5", "Cron A", S, "gen", "TASK-GEN-0500")])
BOARD_B = _board_conn({"5": {"subject": "Cron A renombrado", "submodule": "docs"}})
kx_subject.ingest_board(DB_B, BOARD_B, S, ["5"])
connection = sqlite3.connect(DB_B)
rows_b = connection.execute("SELECT subject, citation_id FROM tasks WHERE session_id = ?",
                      (S,)).fetchall()
connection.close()
check(len(rows_b) == 2,
      "B: CON dedup por sujeto, la tarjeta renombrada SI duplica — 2 filas "
      "donde el original deja 1 (exactamente 2c y 2d de arriba caen: la "
      "fila deja de ser unica y la segunda cita es NUEVA, no la original)")
mutant_b.unlink()


# --- C. Retirar el RECHAZO de la sesion no reconciliada — una fila con
#     `board_ordinal IS NULL` deja de bloquear el ingest, y puede recibir una
#     segunda cita en silencio.
mutant_c = _mutant_of(
    MODULE_PATH,
    "        if missing_ordinal:\n"
    "            raise MappingError(\n"
    f"                f\"la sesion {{session_id!r}} tiene {{missing_ordinal}} fila(s) sin \"\n"
    f"                f\"board_ordinal: no esta reconciliada. NO se ingiere nada: \"\n"
    f"                f\"ingerir aqui repetiria el defecto que esta identidad cierra \"\n"
    f"                f\"— una fila sin ordinal es indistinguible de «no existe» y su \"\n"
    f"                f\"tarjeta recibiria una segunda cita. Fijar el ordinal de cada \"\n"
    f"                f\"fila con link_board_ordinal antes de ingerir el board.\"\n"
    "            )\n",
    "        if False:\n"
    "            pass\n",
    1,
)
kx_without_guard = _load(mutant_c, "task_ids_sin_guard")

_, DB_C = _store_conn([("1", "A", S, "gen", "TASK-GEN-0900", None)])
BOARD_C = _board_conn({"9": {"subject": "Tarjeta nueva", "submodule": "api"}})
try:
    kx_without_guard.ingest_board(DB_C, BOARD_C, S, ["9"])
    reho = False
except kx_without_guard.MappingError:
    reho = True
check(reho is False,
      "C: SIN el rechazo, una sesion no reconciliada YA NO REHUSA — ingiere "
      "igual (1 asercion cae: el rehuse del original desaparece)")
mutant_c.unlink()

# El control de que el ORIGINAL SI rehusa — sin esto, C no discrimina nada.
_, DB_C2 = _store_conn([("1", "A", S, "gen", "TASK-GEN-0900", None)])
try:
    kx.ingest_board(DB_C2, BOARD_C, S, ["9"])
    reho2 = False
except kx.MappingError:
    reho2 = True
check(reho2 is True,
      "C-control: CON el rechazo (original), la misma sesion SI rehusa")


# --- D. Retirar la escritura de `board_ordinal` en `snapshot-tareas` — la
#     columna vuelve a nacer NULA, y toda sesion queda "no reconciliada" para
#     siempre.
mutant_d = _mutant_of(
    STORE_MODULE_PATH,
    "            board_ordinal = _board_ordinal_of(task_id)\n",
    "            board_ordinal = None\n",
    1,
)
ag_without_ordinal = _load(mutant_d, "agent_store_sin_board_ordinal")

D_CLAUDE_DIR = pathlib.Path(tempfile.mkdtemp())
D_STORE_DIR = D_CLAUDE_DIR / "agent-results"
d_conn = ag_without_ordinal.connect(D_STORE_DIR)
d_conn.close()
D_TASKS = pathlib.Path(tempfile.mkdtemp()) / S
D_TASKS.mkdir(parents=True)
(D_TASKS / "3.json").write_text(json.dumps(
    {"id": 3, "subject": "x", "status": "pending", "description": ""}))
ag_without_ordinal.cmd_snapshot_tasks(_Args(
    tasks_dir=str(D_TASKS), claude_dir=str(D_CLAUDE_DIR), session_id=S,
    source="prueba", allow_reassignment=False))
connection = sqlite3.connect(D_STORE_DIR / ag_without_ordinal.DB_FILENAME)
ordinal_d = connection.execute(
    "SELECT board_ordinal FROM tasks WHERE session_id = ? AND task_id = ?",
    (S, "3")).fetchone()[0]
connection.close()
check(ordinal_d is None,
      "D: SIN la escritura, snapshot-tareas deja board_ordinal NULO (1 "
      "asercion cae: 2a de arriba, que exige el ordinal escrito)")
mutant_d.unlink()


print(f"{checks} aserciones")
if failures:
    for f in failures:
        print(f"  FALLA — {f}")
    raise SystemExit(1)
print("OK: todas las aserciones pasan")
