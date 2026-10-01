#!/bin/bash
# =============================================================================
# test-merge-sqlite-union.sh — pruebas de merge_sqlite_union.py contra git real
# =============================================================================
# Estatico salvo por git: arma repositorios de laboratorio bajo un temporal y
# ejerce un merge real, con el driver registrado en `.git/config` como lo hace
# `install-hooks.sh` en produccion. Los casos finos de la tabla de decision
# (hash puro, contraejemplo de revision, control de anulacion con la
# contabilidad dentro del hash) ya estan en `test_merge_sqlite_union.py`, con
# `pytest` — mas rapido y sin necesitar un repo de git por caso. Lo que esta
# suite mide es la MITAD que sólo se ve con git de por medio: que el codigo de
# salida del driver marca el conflicto, que el archivo que queda en el arbol
# es recuperable (no una eleccion arbitraria), y que lo que ya funcionaba
# (FTS5 con rebuild, abortar ante esquema divergente o tabla no declarada)
# sigue funcionando.
#
# La raiz de ESTE arbol se calcula desde la propia ubicacion del script, no
# desde `THYROX_ROOT`: esta suite corre dentro de un worktree de pool
# (`headless-pool --isolation worktree`), y `THYROX_ROOT` puede declarar otro
# checkout. Medido al escribir esta suite: con `THYROX_ROOT` heredado del
# entorno, `thyrox_root()` resolvia al checkout principal y esta prueba
# habria ejercido el driver de OTRO arbol, no el que esta suite acompaña.
#
# Uso:  bash tests/agents/test-merge-sqlite-union.sh
# =============================================================================
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_ROOT="$HERE"
while [[ "$DOCS_ROOT" != "/" && ! -f "$DOCS_ROOT/src/paths/reach.py" ]]; do
    DOCS_ROOT="$(dirname "$DOCS_ROOT")"
done
if [[ ! -f "$DOCS_ROOT/src/paths/reach.py" ]]; then
    echo "test-merge-sqlite-union: no se halló la raíz de thyrox ascendiendo desde $HERE" >&2
    exit 2
fi
DRIVER="$DOCS_ROOT/src/agents/merge_sqlite_union.py"
OK=0
FALLOS=0

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

comprobar() {  # comprobar <descripcion> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        OK=$((OK + 1))
    else
        FALLOS=$((FALLOS + 1))
        printf 'FALLO: %s\n  esperado: %s\n  obtenido: %s\n' "$1" "$2" "$3" >&2
    fi
}

# lab_repo <nombre> -> imprime la ruta del repo
#
# Un repo de git de laboratorio con el driver registrado, `.gitattributes`
# declarado y un `store.sqlite3` con `agent_sessions` — la tabla real que
# store_field_classes.py declara, con su identidad `agent_id`. Una tabla
# ad-hoc sin declarar abortaría el merge por diseño (ver caso 4 más abajo),
# así que el laboratorio usa una tabla de verdad.
lab_repo() {
    local nombre="$1"
    local repo="$TMP/$nombre"
    mkdir -p "$repo"
    git -C "$repo" init -q
    git -C "$repo" config user.email prueba@kaupamex
    git -C "$repo" config user.name prueba
    printf '* text=auto\nstore.sqlite3 merge=sqlite-union\n' > "$repo/.gitattributes"
    git -C "$repo" config merge.sqlite-union.name "merge de tres vias para una base SQLite"
    git -C "$repo" config merge.sqlite-union.driver "python3 $DRIVER %O %A %B"
    echo "$repo"
}

seed_session() {  # seed_session <repo> <status> <revision>
    python3 - "$1/store.sqlite3" "$2" "$3" <<'PY'
import sqlite3, sys
destino, status, revision = sys.argv[1], sys.argv[2], sys.argv[3]
conexion = sqlite3.connect(destino)
conexion.execute(
    "CREATE TABLE IF NOT EXISTS agent_sessions (agent_id TEXT PRIMARY KEY, subagent_type TEXT, "
    "session_id TEXT, status TEXT, started_at TEXT, updated_at TEXT, revision INTEGER)"
)
conexion.execute(
    "INSERT INTO agent_sessions VALUES ('a1', 'x', 's1', ?, 't0', 't0', ?) "
    "ON CONFLICT(agent_id) DO UPDATE SET status = excluded.status, revision = excluded.revision",
    (status, revision),
)
conexion.commit()
PY
}

session_status() {  # session_status <repo> -> "status,revision"
    python3 -c "
import sqlite3, sys
row = sqlite3.connect(sys.argv[1]).execute('select status, revision from agent_sessions').fetchone()
print(f'{row[0]},{row[1]}')
" "$1/store.sqlite3"
}

conflict_count() {  # conflict_count <repo> -> filas en merge_conflicts
    python3 -c "
import sqlite3, sys
print(sqlite3.connect(sys.argv[1]).execute('select count(*) from merge_conflicts').fetchone()[0])
" "$1/store.sqlite3" 2>/dev/null || echo 0
}

# --- Caso 0: el driver existe y valida sus argumentos ----------------------
comprobar "0a. el driver existe" "si" \
    "$([[ -f "$DRIVER" ]] && echo si || echo no)"
comprobar "0b. sin los tres argumentos, aborta" "1" \
    "$(python3 "$DRIVER" solo-uno >/dev/null 2>&1; echo $?)"

# --- Caso 1 (§10, caso obligatorio 1): el contraejemplo de la revisión -----
# base rev 11 running; nuestro rev 13 completed; suyo rev 12 cancelled.
# `max(revision)` diría "gana nuestro" (13 > 12); el contrato exige CONFLICTO
# porque nuestro lado nunca vio la edición del otro.
REV="$(lab_repo revision-counterexample)"
seed_session "$REV" running 11
git -C "$REV" add -A && git -C "$REV" commit -qm base

git -C "$REV" checkout -qb otra
seed_session "$REV" cancelled 12
git -C "$REV" commit -qam "suyo: cancelled rev 12"

git -C "$REV" checkout -q -
seed_session "$REV" completed 13
git -C "$REV" commit -qam "nuestro: completed rev 13"

SALIDA_REV="$(git -C "$REV" merge otra 2>&1)"
CODIGO_REV=$?
comprobar "1a. max(revision) NO es el criterio: git marca CONFLICT" "si" \
    "$(grep -q CONFLICT <<<"$SALIDA_REV" && echo si || echo no)"
comprobar "1b. el merge de git sale con codigo distinto de 0" "si" \
    "$([[ "$CODIGO_REV" -ne 0 ]] && echo si || echo no)"
comprobar "1c. el driver clasifico la fila como conflicto, no como 'gana nuestro'" "si" \
    "$(grep -q 'conflict=1' <<<"$SALIDA_REV" && echo si || echo no)"
comprobar "1d. las dos versiones quedan recuperables en merge_conflicts" "1" \
    "$(conflict_count "$REV")"

# --- Control de anulación del caso 1: SIN ancestro, cae el contraejemplo ---
# El mismo par (nuestro rev 13, suyo rev 12) pero comparado sin base común
# (tratada como vacía): ya no hay "misma fila editada dos veces sin verse" —
# lo que hay es "dos lados insertan contenido distinto bajo la misma
# identidad", otra rama de la tabla de decisión. Sigue dando CONFLICTO, pero
# la ANULACION mide que decide_row toma la rama de fila NUEVA, no la de
# edición sobre una base conocida — ver test_merge_sqlite_union.py, que lo
# prueba directo contra decide_row() sin pasar por git.
SIN_BASE="$TMP/sin-ancestro"
mkdir -p "$SIN_BASE"
python3 - "$SIN_BASE" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
sqlite3.connect(f"{raiz}/ancestro.sqlite3").close()   # base vacia: sin la tabla siquiera
for nombre, status, revision in (("nuestro", "completed", 13), ("suyo", "cancelled", 12)):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute(
        "CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY, subagent_type TEXT, "
        "session_id TEXT, status TEXT, started_at TEXT, updated_at TEXT, revision INTEGER)"
    )
    conexion.execute("INSERT INTO agent_sessions VALUES ('a1', 'x', 's1', ?, 't0', 't0', ?)", (status, revision))
    conexion.commit()
PY
SALIDA_SIN_BASE="$(python3 "$DRIVER" "$SIN_BASE/ancestro.sqlite3" "$SIN_BASE/nuestro.sqlite3" "$SIN_BASE/suyo.sqlite3" 2>&1)"
comprobar "1e. control de anulación: sin ancestro, sigue habiendo conflicto (por otra rama)" "si" \
    "$(grep -q 'conflict=1' <<<"$SALIDA_SIN_BASE" && echo si || echo no)"

# --- Caso 2 (§10, caso obligatorio 2): misma modificación, contabilidad
# distinta -> SIN conflicto ----------------------------------------------
MOD="$(lab_repo same-modification)"
seed_session "$MOD" running 11
git -C "$MOD" add -A && git -C "$MOD" commit -qm base

git -C "$MOD" checkout -qb otra
seed_session "$MOD" completed 15
git -C "$MOD" commit -qam "suyo: completed rev 15"

git -C "$MOD" checkout -q -
seed_session "$MOD" completed 12
git -C "$MOD" commit -qam "nuestro: completed rev 12"

SALIDA_MOD="$(git -C "$MOD" merge otra 2>&1)"
comprobar "2a. misma modificación con revision/updated_at distintos: sin conflicto" "no" \
    "$(grep -q CONFLICT <<<"$SALIDA_MOD" && echo si || echo no)"
comprobar "2b. el contenido de dominio queda unificado" "completed,12" "$(session_status "$MOD")"

# --- Caso 3 (§4/§10, ya en verde): la colisión de un id local ya no se
# pierde — findings_history se empareja por finding_id ---------------------
COL="$TMP/findings-collision"
mkdir -p "$COL"
python3 - "$COL" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
ddl = (
    "CREATE TABLE findings_history (id INTEGER PRIMARY KEY AUTOINCREMENT, finding_id TEXT NOT NULL UNIQUE, "
    "submodule TEXT NOT NULL, initiative TEXT NOT NULL, finding_type TEXT NOT NULL DEFAULT 'finding', "
    "severity TEXT, summary TEXT NOT NULL, content TEXT NOT NULL, source_ref TEXT, metadata_json TEXT, "
    "session_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
)
sqlite3.connect(f"{raiz}/ancestro.sqlite3").execute(ddl)
for nombre, finding_id in (("nuestro", "H-OURS-1"), ("suyo", "H-THEIRS-1")):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute(ddl)
    # El mismo `id` AUTOINCREMENT local (1) en los dos lados: es la colisión
    # que §4 midió que la unión antigua perdía en silencio.
    conexion.execute(
        "INSERT INTO findings_history (id, finding_id, submodule, initiative, summary, content, "
        "created_at, updated_at) VALUES (1, ?, 'thyrox', 'd4-a', 'r', 'c', 't0', 't0')",
        (finding_id,),
    )
    conexion.commit()
PY
python3 "$DRIVER" "$COL/ancestro.sqlite3" "$COL/nuestro.sqlite3" "$COL/suyo.sqlite3" >/dev/null 2>&1
comprobar "3a. los dos hallazgos con id local igual conviven (finding_id como identidad)" "2" \
    "$(python3 -c "
import sqlite3, sys
print(sqlite3.connect(sys.argv[1]).execute('select count(*) from findings_history').fetchone()[0])
" "$COL/nuestro.sqlite3")"

# --- Caso 4 (§10, caso obligatorio 4): borrado contra cambio -> CONFLICTO --
DEL="$TMP/delete-vs-change"
mkdir -p "$DEL"
python3 - "$DEL" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
ddl = (
    "CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY, subagent_type TEXT, session_id TEXT, "
    "status TEXT, started_at TEXT, updated_at TEXT, revision INTEGER)"
)
conexion = sqlite3.connect(f"{raiz}/ancestro.sqlite3")
conexion.execute(ddl)
conexion.execute("INSERT INTO agent_sessions VALUES ('a1', 'x', 's1', 'running', 't0', 't0', 11)")
conexion.commit()

conexion = sqlite3.connect(f"{raiz}/nuestro.sqlite3")
conexion.execute(ddl)   # nuestro lado borró la fila: la tabla queda vacía
conexion.commit()

conexion = sqlite3.connect(f"{raiz}/suyo.sqlite3")
conexion.execute(ddl)
conexion.execute("INSERT INTO agent_sessions VALUES ('a1', 'x', 's1', 'completed', 't0', 't0', 12)")
conexion.commit()
PY
SALIDA_DEL="$(python3 "$DRIVER" "$DEL/ancestro.sqlite3" "$DEL/nuestro.sqlite3" "$DEL/suyo.sqlite3" 2>&1)"
comprobar "4a. borrado de un lado contra cambio del otro: CONFLICTO" "si" \
    "$(grep -q 'conflict=1' <<<"$SALIDA_DEL" && echo si || echo no)"
comprobar "4b. y el driver sale distinto de 0" "1" \
    "$(python3 "$DRIVER" "$DEL/ancestro.sqlite3" "$DEL/nuestro.sqlite3" "$DEL/suyo.sqlite3" >/dev/null 2>&1; echo $?)"

# --- Conserva lo que hoy funciona: columnas distintas o tabla sin declarar -
ESQ="$TMP/esquema"
mkdir -p "$ESQ"
python3 - "$ESQ" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
base_ddl = "CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY, subagent_type TEXT, session_id TEXT, status TEXT, started_at TEXT, updated_at TEXT, revision INTEGER)"
otro_ddl = base_ddl[:-1] + ", extra TEXT)"
for nombre, ddl in (("ancestro", base_ddl), ("nuestro", base_ddl), ("suyo", otro_ddl)):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute(ddl)
    conexion.commit()
PY
SALIDA_ESQ="$(python3 "$DRIVER" "$ESQ/ancestro.sqlite3" "$ESQ/nuestro.sqlite3" "$ESQ/suyo.sqlite3" 2>&1)"
comprobar "5a. columnas distintas: aborta con exit 1" "1" \
    "$(python3 "$DRIVER" "$ESQ/ancestro.sqlite3" "$ESQ/nuestro.sqlite3" "$ESQ/suyo.sqlite3" >/dev/null 2>&1; echo $?)"
comprobar "5b. y nombra la tabla y el motivo" "si" \
    "$(grep -q "columnas distintas" <<<"$SALIDA_ESQ" && echo si || echo no)"

SND="$TMP/sin-declarar"
mkdir -p "$SND"
python3 - "$SND" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
for nombre in ("ancestro", "nuestro", "suyo"):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute("CREATE TABLE tabla_no_declarada (id TEXT PRIMARY KEY, v TEXT)")
    conexion.commit()
PY
SALIDA_SND="$(python3 "$DRIVER" "$SND/ancestro.sqlite3" "$SND/nuestro.sqlite3" "$SND/suyo.sqlite3" 2>&1)"
comprobar "5c. tabla sin declarar en store_field_classes: aborta con exit 1" "1" \
    "$(python3 "$DRIVER" "$SND/ancestro.sqlite3" "$SND/nuestro.sqlite3" "$SND/suyo.sqlite3" >/dev/null 2>&1; echo $?)"
comprobar "5d. y lo dice, en vez de adivinar" "si" \
    "$(grep -q "no tiene declarada su clasificación" <<<"$SALIDA_SND" && echo si || echo no)"

# --- POSITIVO REAL: el esquema del store de verdad -------------------------
# No lo inventa la prueba: se copia agent_store.sqlite3 de ESTE árbol (nunca
# se escribe el original) y se le añade una tarea nueva por lado — la clave
# real es (session_id, task_id), y dos sesiones distintas es exactamente el
# caso que el driver existe para unir.
STORE="$DOCS_ROOT/agent-results/agent_store.sqlite3"
if [[ ! -f "$STORE" ]]; then
    printf 'AVISO: no existe %s — el caso real no midió nada\n' "$STORE" >&2
    FALLOS=$((FALLOS + 1))
else
    REAL="$TMP/real"
    mkdir -p "$REAL"
    cp "$STORE" "$REAL/nuestro.sqlite3"
    cp "$STORE" "$REAL/suyo.sqlite3"
    cp "$STORE" "$REAL/ancestro.sqlite3"
    ANTES="$(python3 -c "
import sqlite3, sys
print(sqlite3.connect(sys.argv[1]).execute('select count(*) from tasks').fetchone()[0])
" "$REAL/nuestro.sqlite3")"
    python3 - "$REAL" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
for nombre in ("nuestro", "suyo"):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute(
        "INSERT INTO tasks (task_id, subject, status, session_id, created_at, updated_at)"
        " VALUES (?, ?, 'pending', ?, '2026-01-01T00:00:00', '2026-01-01T00:00:00')",
        (f"prueba-{nombre}", f"fila de prueba {nombre}", f"sesion-{nombre}"),
    )
    conexion.commit()
PY
    python3 "$DRIVER" "$REAL/ancestro.sqlite3" "$REAL/nuestro.sqlite3" "$REAL/suyo.sqlite3" >/dev/null 2>&1 || true
    DESPUES="$(python3 -c "
import sqlite3, sys
print(sqlite3.connect(sys.argv[1]).execute('select count(*) from tasks').fetchone()[0])
" "$REAL/nuestro.sqlite3")"
    comprobar "6a. sobre el esquema real, las dos tareas nuevas conviven ($ANTES -> +2)" \
        "$((ANTES + 2))" "$DESPUES"
    comprobar "6b. el merge sobre el esquema real no rompe (exit 0, sin conflicto)" "0" \
        "$(python3 "$DRIVER" "$REAL/ancestro.sqlite3" "$REAL/nuestro.sqlite3" "$REAL/suyo.sqlite3" >/dev/null 2>&1; echo $?)"

    # El índice FTS5 del store es una tabla VIRTUAL sin identidad propia: se
    # regenera con 'rebuild', no se une fila a fila. Esto ya funcionaba antes
    # de este contrato y el rediseño no lo puede romper.
    comprobar "6c. el índice FTS queda consistente con su tabla de contenido" "si" \
        "$(python3 -c "
import sqlite3, sys
conexion = sqlite3.connect(sys.argv[1])
fts = conexion.execute('select count(*) from findings_fts').fetchone()[0]
contenido = conexion.execute('select count(*) from findings_history').fetchone()[0]
print('si' if fts == contenido else f'no ({fts} contra {contenido})')
" "$REAL/nuestro.sqlite3")"
fi

printf 'test-merge-sqlite-union: %d de %d aserciones en verde\n' "$OK" "$((OK + FALLOS))"
[[ "$FALLOS" -eq 0 ]]
