#!/usr/bin/env bash
# Pruebas de `agent_store.py fechar-apertura` — el eje temporal, pieza 1 de 3.
#
# H-DOCS-327 midió que la fecha de apertura de una tarea no existe en ninguna
# columna: `created_at` es la INGESTIÓN al store (525 de 869 en un solo día,
# mínimo absoluto 2026-08-18) y `updated_at` es el último toque (18 registros
# `in_progress` comparten el instante de un pase de reconciliación).
#
# El hallazgo declaró como CIEGA una fuente plausible y sin medir. Medida:
# existen TRES cotas superiores, y las 863 tareas tienen las tres.
#
#   ficha-mtime   mtime de ~/.claude/tasks/<sesión>/<N>.json — gana en 709 (82 %)
#   git-tablero   primer commit del tablero donde aparece la fila — gana en 69
#   ingestion     el propio created_at — gana en 85
#
# `opened_at` es por tanto una COTA SUPERIOR: el mínimo de las disponibles. No
# es la apertura exacta salvo cuando la fuente es `hook`, que sella el instante
# real y sólo aplica hacia adelante. Por eso `opened_at_source` no es adorno:
# sin él, una cota grosera y una fecha exacta se leen igual.
#
# CASO 4 es el DISCRIMINADOR — que gane la MÁS TEMPRANA, no la primera que se
# encuentre ni la del orden de escritura. Si el comando tomara cualquiera, ése
# sería el único caso que caería.
#
# CASO 9 es el otro control que puede fallar: una tarea SIN ninguna fuente
# queda en NULL, no con una fecha inventada. Un hueco declarado y un hueco
# rellenado se leen igual en una columna, y sólo el primero es honesto.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)
CLAUDE_DIR="$TMP/.claude/agent-results"
DB="$CLAUDE_DIR/agent_store.sqlite3"
FICHAS="$TMP/fichas"
REPO="$TMP/repo"
mkdir -p "$CLAUDE_DIR" "$FICHAS"

col() {  # col <tabla> <columna> -> 1 si existe
    python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
print(1 if sys.argv[3] in [r[1] for r in c.execute(f'pragma table_info({sys.argv[2]})')] else 0)
" "$DB" "$1" "$2"
}
leer() {  # leer <task_id> <columna>
    python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
r=c.execute(f'SELECT {sys.argv[3]} FROM tasks WHERE task_id=?',(sys.argv[2],)).fetchone()
print('<NULO>' if (r is None or r[0] is None) else r[0])
" "$DB" "$1" "$2"
}

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?

echo "== 2. la migración es aditiva: las dos columnas existen tras conectar =="
python3 "$STORE" listar-sesiones --claude-dir "$CLAUDE_DIR" >/dev/null 2>&1
afirmar "columna opened_at"        1 "$(col tasks opened_at)"
afirmar "columna opened_at_source" 1 "$(col tasks opened_at_source)"

echo "== 3. siembra: fichas, tablero versionado y filas del store =="
# El tablero vive en un repo git temporal, con dos commits: en el primero
# aparecen 100 y 200; en el segundo, además, 300.
mkdir -p "$REPO/source/gestion/pm/reportes"
T="$REPO/source/gestion/pm/reportes/tablero-de-tareas.rst"
git -C "$REPO" init -q
git -C "$REPO" config user.email t@t; git -C "$REPO" config user.name t
printf '   * - 100\n   * - 200\n' > "$T"
git -C "$REPO" add -A
GIT_AUTHOR_DATE='2026-08-10T00:00:00' GIT_COMMITTER_DATE='2026-08-10T00:00:00' \
    git -C "$REPO" commit -q -m "Primero"
printf '   * - 100\n   * - 200\n   * - 300\n' > "$T"
git -C "$REPO" add -A
GIT_AUTHOR_DATE='2026-08-16T00:00:00' GIT_COMMITTER_DATE='2026-08-16T00:00:00' \
    git -C "$REPO" commit -q -m "Segundo"

# Fichas con mtime fijado a mano.
for par in "100 2026-08-05T00:00:00" "200 2026-08-20T00:00:00" "300 2026-08-14T00:00:00"; do
    set -- $par
    echo '{}' > "$FICHAS/$1.json"
    touch -d "$2" "$FICHAS/$1.json"
done
# 400 no tiene ficha ni sale en el tablero: sólo tendrá ingestión.
# 500 no tiene NINGUNA fuente — se le borra el created_at a mano.
python3 - "$DB" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
filas = [("100","cota mas temprana en la ficha","2026-08-12T00:00:00"),
         ("200","cota mas temprana en la ingestion","2026-08-09T00:00:00"),
         ("300","cota mas temprana en el tablero","2026-08-22T00:00:00"),
         ("400","solo tiene ingestion","2026-08-21T00:00:00"),
         ("500","sin ninguna fuente","2026-08-21T00:00:00")]
c.executemany("INSERT INTO tasks (task_id, subject, status, blocks_json, blocked_by_json,"
              " session_id, source, created_at, updated_at) "
              "VALUES (?,?,'pending','[]','[]','s','prueba',?,?)",
              [(i,s,f,f) for i,s,f in filas])
c.execute("UPDATE tasks SET created_at='' WHERE task_id='500'")
c.commit()
PY
afirmar "siembra sin error" 0 $?

echo "== 4. DISCRIMINADOR — gana la cota MÁS TEMPRANA, no cualquiera =="
salida=$(python3 "$STORE" fechar-apertura --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$FICHAS" --repo-tablero "$REPO" 2>&1)
#   100: ficha 08-05 · tablero 08-10 · ingestion 08-12  -> ficha
#   200: ficha 08-20 · tablero 08-10 · ingestion 08-09  -> ingestion
#   300: ficha 08-14 · tablero 08-16 · ingestion 08-22  -> ficha
afirmar "#100 gana ficha"      "2026-08-05T00:00:00" "$(leer 100 opened_at)"
afirmar "#100 declara fuente"  "ficha-mtime"         "$(leer 100 opened_at_source)"
afirmar "#200 gana ingestion"  "2026-08-09T00:00:00" "$(leer 200 opened_at)"
afirmar "#200 declara fuente"  "ingestion"           "$(leer 200 opened_at_source)"
afirmar "#300 gana ficha"      "2026-08-14T00:00:00" "$(leer 300 opened_at)"

echo "== 5. la fuente git existe y gana cuando es la más temprana =="
# 300 sin ficha: entonces gana el tablero (08-16) sobre la ingestión (08-22).
rm "$FICHAS/300.json"
python3 "$STORE" fechar-apertura --claude-dir "$CLAUDE_DIR" --tasks-dir "$FICHAS" \
    --repo-tablero "$REPO" --reescribir >/dev/null 2>&1
afirmar "#300 gana tablero"     "2026-08-16T00:00:00" "$(leer 300 opened_at)"
afirmar "#300 declara fuente"   "git-tablero"         "$(leer 300 opened_at_source)"

echo "== 6. sin más fuente que la ingestión, ésa se usa y se declara =="
afirmar "#400 usa ingestion"    "2026-08-21T00:00:00" "$(leer 400 opened_at)"
afirmar "#400 declara fuente"   "ingestion"           "$(leer 400 opened_at_source)"

echo "== 7. la fuente exacta NO se pisa con una cota =="
python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
c.execute(\"UPDATE tasks SET opened_at='2026-08-01T09:00:00', opened_at_source='hook' WHERE task_id='400'\")
c.commit()" "$DB"
python3 "$STORE" fechar-apertura --claude-dir "$CLAUDE_DIR" --tasks-dir "$FICHAS" \
    --repo-tablero "$REPO" --reescribir >/dev/null 2>&1
afirmar "#400 conserva hook"    "2026-08-01T09:00:00" "$(leer 400 opened_at)"
afirmar "#400 conserva fuente"  "hook"                "$(leer 400 opened_at_source)"

echo "== 8. idempotencia — el segundo pase no cambia nada =="
antes=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
print(list(c.execute('SELECT task_id,opened_at,opened_at_source FROM tasks ORDER BY task_id')))" "$DB")
python3 "$STORE" fechar-apertura --claude-dir "$CLAUDE_DIR" --tasks-dir "$FICHAS" \
    --repo-tablero "$REPO" >/dev/null 2>&1
despues=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
print(list(c.execute('SELECT task_id,opened_at,opened_at_source FROM tasks ORDER BY task_id')))" "$DB")
afirmar "estado idéntico" "$antes" "$despues"

echo "== 9. sin ninguna fuente queda NULO, no una fecha inventada =="
afirmar "#500 opened_at nulo"   "<NULO>" "$(leer 500 opened_at)"
afirmar "#500 fuente nula"      "<NULO>" "$(leer 500 opened_at_source)"

echo "== 10. --dry-run no escribe, y la salida publica su denominador =="
python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
c.execute(\"UPDATE tasks SET opened_at=NULL, opened_at_source=NULL WHERE task_id='100'\")
c.commit()" "$DB"
seco=$(python3 "$STORE" fechar-apertura --claude-dir "$CLAUDE_DIR" --tasks-dir "$FICHAS" \
    --repo-tablero "$REPO" --dry-run 2>&1)
afirmar "dry-run no escribió"   "<NULO>" "$(leer 100 opened_at)"
afirmar "publica alcance"       1 "$(grep -c 'alcance medido' <<<"$seco")"

echo "== 11. DISCRIMINADOR 2 — la PK es (session_id, task_id), no task_id =="
# Control positivo REAL: el store de este repo tiene 869 filas de DOS sesiones
# con ids que colisionan. Un UPDATE que resuelva la sesión con un subselect
# actualiza UNA de las dos y deja la otra en NULL — medido: `0 sin ninguna
# fuente` junto a `None: 6` en la columna, que es la contradicción que lo
# destapó. Sólo este caso cae si el UPDATE vuelve al subselect.
echo '{}' > "$FICHAS/600.json"; touch -d '2026-08-02T00:00:00' "$FICHAS/600.json"
python3 - "$DB" <<'PY2'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
c.executemany("INSERT INTO tasks (task_id, subject, status, blocks_json, blocked_by_json,"
              " session_id, source, created_at, updated_at) "
              "VALUES (?,?,'pending','[]','[]',?,'prueba',?,?)",
              [("600","misma id, sesion A","ses-A","2026-08-19T00:00:00","2026-08-19T00:00:00"),
               ("600","misma id, sesion B","ses-B","2026-08-19T00:00:00","2026-08-19T00:00:00")])
c.commit()
PY2
python3 "$STORE" fechar-apertura --claude-dir "$CLAUDE_DIR" --tasks-dir "$FICHAS" \
    --repo-tablero "$REPO" >/dev/null 2>&1
ambas=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
print(sum(1 for r in c.execute(\"SELECT opened_at FROM tasks WHERE task_id='600'\") if r[0]))" "$DB")
afirmar "las DOS filas quedan fechadas" 2 "$ambas"

echo "== 12. el conteo no cuenta dos veces la misma fila =="
python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
c.execute('UPDATE tasks SET opened_at=NULL, opened_at_source=NULL'); c.commit()" "$DB"
linea=$(python3 "$STORE" fechar-apertura --claude-dir "$CLAUDE_DIR" --tasks-dir "$FICHAS" \
    --repo-tablero "$REPO" 2>&1)
fechadas=$(sed -n 's/^fechar-apertura: \([0-9]*\) fechada.*/\1/p' <<<"$linea")
reales=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
print(c.execute('SELECT COUNT(*) FROM tasks WHERE opened_at IS NOT NULL').fetchone()[0])" "$DB")
afirmar "lo reportado == lo escrito" "$reales" "$fechadas"

echo "== 13. el hook sella la fecha EXACTA, no una cota =="
# La mitad prospectiva: mientras la única fuente sean cotas, `opened_at` nunca
# mejora. Cuando el volcado viene del hook PostToolUse —segundos después del
# TaskCreate— el instante SÍ es la apertura, y se sella como tal para que las
# cotas no lo pisen nunca (caso 7).
#
# Discrimina contra un ingestión masiva: ese mismo `snapshot-tareas` corrió el
# 2026-08-18 sobre 525 fichas viejas, y ahí `now` NO era la apertura. Por eso
# el sellado depende del --source, no de que la fila sea nueva.
VIVAS="$TMP/vivas"; mkdir -p "$VIVAS"
echo '{"id":"700","subject":"nacida por el hook","status":"pending","blocks":[],"blockedBy":[]}' \
    > "$VIVAS/700.json"
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" --tasks-dir "$VIVAS" \
    --session-id ses-viva --source hook-post-tool >/dev/null 2>&1
afirmar "#700 sellada por hook" "hook" "$(leer 700 opened_at_source)"
sellada=$(leer 700 opened_at)
[[ -n "$sellada" && "$sellada" != "<NULO>" ]]; afirmar "#700 trae instante" 0 $?

echo "== 14. una ingestión masiva NO sella: su instante no es la apertura =="
echo '{"id":"800","subject":"ingerida en lote","status":"pending","blocks":[],"blockedBy":[]}' \
    > "$VIVAS/800.json"
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" --tasks-dir "$VIVAS" \
    --session-id ses-viva --source reconciliacion >/dev/null 2>&1
afirmar "#800 NO sellada" "<NULO>" "$(leer 800 opened_at_source)"

echo
echo "$OK ok · $FALLO fallas"
[[ $FALLO -eq 0 ]]
