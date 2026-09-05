#!/bin/bash
# =============================================================================
# test-merge-sqlite-union.sh — pruebas de merge_sqlite_union.py
# =============================================================================
# Estatico salvo por git: arma repositorios de laboratorio bajo un temporal y
# ejerce un merge real. No toca ninguno de los cinco repos.
#
# El caso 2 es el CONTROL ANULADO, y aqui no hay que fabricarlo: el control
# anulado es EL ESTADO ANTERIOR — el mismo laboratorio sin registrar el driver.
# Ese es el defecto que #742 cierra, y su forma es exacta: conflicto, y la fila
# del otro lado desaparece. Sin este caso, un verde en el caso 1 no distingue
# «el driver une» de «el merge no tenia nada que unir».
#
# Uso:  bash .claude/scripts/tests/test-merge-sqlite-union.sh
# =============================================================================
set -uo pipefail

DOCS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DRIVER="$DOCS_ROOT/.claude/scripts/agents/merge_sqlite_union.py"
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

# laboratorio <nombre> <con-driver:si|no> <ddl> -> imprime la ruta del repo
#
# Construye tres commits: una fila comun, una fila solo nuestra y una fila solo
# del otro lado. Es la forma minima en que dos sesiones divergen sobre el store.
laboratorio() {
    local nombre="$1" con_driver="$2" ddl="${3:-create table t(id text primary key, v text)}"
    local repo="$TMP/$nombre"
    mkdir -p "$repo"
    git -C "$repo" init -q
    git -C "$repo" config user.email prueba@kaupamex
    git -C "$repo" config user.name prueba

    printf '* text=auto\nstore.sqlite3 merge=sqlite-union\n' > "$repo/.gitattributes"
    if [[ "$con_driver" == "si" ]]; then
        git -C "$repo" config merge.sqlite-union.name "union de filas para una base SQLite"
        git -C "$repo" config merge.sqlite-union.driver "python3 $DRIVER %O %A %B"
    fi

    fila "$repo" "$ddl" base 0
    git -C "$repo" add -A && git -C "$repo" commit -qm "Seed"

    git -C "$repo" checkout -qb otra
    fila "$repo" "" b 1
    git -C "$repo" commit -qam "Add b"

    git -C "$repo" checkout -q -    # vuelve a la rama inicial, se llame como se llame
    fila "$repo" "" a 1
    git -C "$repo" commit -qam "Add a"

    echo "$repo"
}

fila() {  # fila <repo> <ddl-o-vacio> <id> <v>
    python3 - "$1/store.sqlite3" "$2" "$3" "$4" <<'PY'
import sqlite3, sys
destino, ddl, ident, valor = sys.argv[1:5]
conexion = sqlite3.connect(destino)
if ddl:
    conexion.execute(ddl)
conexion.execute("INSERT INTO t VALUES (?, ?)", (ident, valor))
conexion.commit()
PY
}

filas() {  # filas <repo> -> los ids, ordenados y separados por coma
    python3 -c "
import sqlite3, sys
print(','.join(sorted(r[0] for r in sqlite3.connect(sys.argv[1]).execute('select id from t'))))
" "$1/store.sqlite3"
}

# --- Caso 0: el driver existe y valida sus argumentos ----------------------
comprobar "0a. el driver existe" "si" \
    "$([[ -f "$DRIVER" ]] && echo si || echo no)"
comprobar "0b. sin los tres argumentos, aborta" "1" \
    "$(python3 "$DRIVER" solo-uno >/dev/null 2>&1; echo $?)"

# --- Caso 1: CON driver, el merge une y no conflictua ----------------------
CON="$(laboratorio con-driver si)"
SALIDA_CON="$(git -C "$CON" merge otra 2>&1)"
comprobar "1a. el merge no deja conflicto" "no" \
    "$(grep -q CONFLICT <<<"$SALIDA_CON" && echo si || echo no)"
comprobar "1b. las tres filas sobreviven" "a,b,base" "$(filas "$CON")"

# --- Caso 2: CONTROL ANULADO — el mismo laboratorio SIN registrar el driver -
# Es el estado anterior a #742, no un incumplidor fabricado.
SIN="$(laboratorio sin-driver no)"
SALIDA_SIN="$(git -C "$SIN" merge otra 2>&1)"
comprobar "2a. sin driver, el merge SI conflictua" "si" \
    "$(grep -q CONFLICT <<<"$SALIDA_SIN" && echo si || echo no)"
comprobar "2b. sin driver, la fila del otro lado se pierde" "a,base" "$(filas "$SIN")"
comprobar "2c. el driver es quien discrimina: 3 filas contra 2" "3 2" \
    "$(awk -F, '{print NF}' <<<"$(filas "$CON")") $(awk -F, '{print NF}' <<<"$(filas "$SIN")")"

# --- Caso 3: la colision de clave se informa, no se traga ------------------
# Los dos lados escriben la MISMA clave con valor distinto. El driver conserva
# la nuestra — y lo dice. Es la mitad que #436 debe decidir; lo que este caso
# fija es que no ocurra en silencio.
COL="$TMP/colision"
mkdir -p "$COL"
python3 - "$COL" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
for nombre, valor in (("ancestro", "0"), ("nuestro", "1"), ("suyo", "2")):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute("CREATE TABLE t(id text primary key, v text)")
    conexion.execute("INSERT INTO t VALUES ('k', ?)", (valor,))
    conexion.commit()
PY
AVISO="$(python3 "$DRIVER" "$COL/ancestro.sqlite3" "$COL/nuestro.sqlite3" "$COL/suyo.sqlite3" 2>&1)"
comprobar "3a. la omision por clave presente se informa" "si" \
    "$(grep -q 'omitidas por clave ya presente' <<<"$AVISO" && echo si || echo no)"
comprobar "3b. se conserva nuestro valor" "1" \
    "$(python3 -c "
import sqlite3, sys
print(sqlite3.connect(sys.argv[1]).execute(\"select v from t where id='k'\").fetchone()[0])
" "$COL/nuestro.sqlite3")"

# --- Caso 4: la union NO esta definida -> aborta, no adivina ---------------
ESQ="$TMP/esquema"
mkdir -p "$ESQ"
python3 - "$ESQ" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
for nombre, ddl in (
    ("ancestro", "CREATE TABLE t(id text primary key, v text)"),
    ("nuestro",  "CREATE TABLE t(id text primary key, v text)"),
    ("suyo",     "CREATE TABLE t(id text primary key, v text, extra text)"),
):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute(ddl)
    conexion.commit()
PY
# La salida se captura ANTES de greppearla: con `set -o pipefail`, un
# `driver | grep -q` hereda el exit 1 del driver y el `&&` de despues nunca
# corre — el caso daria "no" con el mensaje correcto delante.
SALIDA_ESQ="$(python3 "$DRIVER" "$ESQ/ancestro.sqlite3" "$ESQ/nuestro.sqlite3" "$ESQ/suyo.sqlite3" 2>&1)"
comprobar "4a. columnas distintas: aborta con exit 1" "1" \
    "$(python3 "$DRIVER" "$ESQ/ancestro.sqlite3" "$ESQ/nuestro.sqlite3" "$ESQ/suyo.sqlite3" >/dev/null 2>&1; echo $?)"
comprobar "4b. y nombra la tabla y el motivo" "si" \
    "$(grep -q "columnas distintas" <<<"$SALIDA_ESQ" && echo si || echo no)"

SPK="$TMP/sin-clave"
mkdir -p "$SPK"
python3 - "$SPK" <<'PY'
import sqlite3, sys
raiz = sys.argv[1]
for nombre in ("ancestro", "nuestro", "suyo"):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute("CREATE TABLE t(v text)")   # sin clave primaria
    conexion.commit()
PY
comprobar "4c. tabla sin clave primaria: aborta con exit 1" "1" \
    "$(python3 "$DRIVER" "$SPK/ancestro.sqlite3" "$SPK/nuestro.sqlite3" "$SPK/suyo.sqlite3" >/dev/null 2>&1; echo $?)"

# --- Caso 5: POSITIVO REAL — el esquema del store de verdad ----------------
# No lo inventa la prueba: se copia agent_store.sqlite3 y se le anade una fila
# por lado en su tabla mas poblada.
STORE="$DOCS_ROOT/.claude/agent-results/agent_store.sqlite3"
if [[ ! -f "$STORE" ]]; then
    printf 'AVISO: no existe %s — el caso 5 no midio nada\n' "$STORE" >&2
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
# Una tarea nueva por lado. La clave primaria real es (session_id, task_id):
# dos sesiones distintas es exactamente el caso que el driver existe para unir.
for nombre in ("nuestro", "suyo"):
    conexion = sqlite3.connect(f"{raiz}/{nombre}.sqlite3")
    conexion.execute(
        "INSERT INTO tasks (task_id, subject, status, session_id, created_at, updated_at)"
        " VALUES (?, ?, 'pending', ?, '2026-01-01T00:00:00', '2026-01-01T00:00:00')",
        (f"prueba-{nombre}", f"fila de prueba {nombre}", f"sesion-{nombre}"),
    )
    conexion.commit()
PY
    python3 "$DRIVER" "$REAL/ancestro.sqlite3" "$REAL/nuestro.sqlite3" "$REAL/suyo.sqlite3" >/dev/null 2>&1
    DESPUES="$(python3 -c "
import sqlite3, sys
print(sqlite3.connect(sys.argv[1]).execute('select count(*) from tasks').fetchone()[0])
" "$REAL/nuestro.sqlite3")"
    comprobar "5a. sobre el esquema real, las dos filas nuevas conviven ($ANTES -> +2)" \
        "$((ANTES + 2))" "$DESPUES"

    # 5b. El indice FTS5 del store es una tabla VIRTUAL sin clave primaria. La
    # primera version del driver la trataba como tabla normal y abortaba el
    # merge entero — lo destapo este mismo caso contra el esquema de verdad, no
    # un insumo fabricado. Ahora se regenera, y esta asercion mide que quedo
    # consistente con su tabla de contenido.
    comprobar "5b. el indice FTS queda consistente con su tabla de contenido" "si" \
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
