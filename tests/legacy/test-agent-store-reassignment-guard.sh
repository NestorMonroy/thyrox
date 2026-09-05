#!/usr/bin/env bash
# Pruebas del guard de reasignación de cita en `agent_store.py::snapshot-tareas`
# (H-DOCS-1042 / H-DOCS-1044).
#
# Qué protege, y por qué el marcador de deprecación no bastaba
# ------------------------------------------------------------
# El `citation_id` cuelga de `(session_id, task_id)` y el `subject` es MUTABLE
# bajo él: el upsert lo reescribe sin tocar la cita. Volcar un directorio vivo
# sobre una sesión que ya tiene otras filas con los mismos ordinales no mueve
# el id — mueve el SUJETO debajo, y `TASK-API-0001` pasa a nombrar otra cosa
# sin que nada falle.
#
# Se marcó `refrescar-tablero.sh` como DEPRECATED por esto, y eso no cerró el
# defecto: `stop-gate-tablero-desactualizado.sh` corre la MISMA cadena en cada
# turno. Por eso el guard vive en el escritor compartido y no en un guion.
#
# El caso 3 es el que hace verificable la suite
# ----------------------------------------------
# Sin un caso que EXIJA el volcado normal, un guard que rehusara siempre
# pasaría los casos 1 y 2 igual de verde. El caso 3 es el control que puede
# fallar por exceso de celo, no sólo por defecto.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)
DIR="$TMP/store"; mkdir -p "$DIR"
DB="$DIR/agent-results/agent_store.sqlite3"
VIVO="$TMP/tasks"; mkdir -p "$VIVO"
SES=sesion-de-prueba

ficha() {  # ficha <id> <subject>
    printf '{"id":"%s","subject":"%s","status":"pending","description":"d"}\n' \
        "$1" "$2" > "$VIVO/$1.json"
}

sujeto_de() {  # sujeto_de <citation_id>
    python3 -c "
import sqlite3
c=sqlite3.connect('file:$DB?mode=ro',uri=True)
f=c.execute('select subject from tasks where citation_id=?',('$1',)).fetchone()
print(f[0] if f else '(sin fila)')"
}

# --------------------------------------------------------------- preparación
# Una sesión con dos filas ya acuñadas, como el tablero real.
ficha 1 "sujeto original uno"
ficha 2 "sujeto original dos"
python3 "$STORE" snapshot-tareas --claude-dir "$DIR" --tasks-dir "$VIVO" \
    --session-id "$SES" --source preparacion >/dev/null 2>&1
python3 - <<PY
import sqlite3
c = sqlite3.connect("$DB")
c.execute("update tasks set citation_id='TASK-X-0001' where task_id='1' and session_id=?", ("$SES",))
c.execute("update tasks set citation_id='TASK-X-0002' where task_id='2' and session_id=?", ("$SES",))
c.commit()
PY
afirmar "preparación: la cita 1 nombra su sujeto" "sujeto original uno" "$(sujeto_de TASK-X-0001)"

# ------------------------------------------------------------------- caso 1
# El defecto real: el directorio vivo trae OTRO sujeto bajo el mismo ordinal.
ficha 1 "sujeto intruso"
SALIDA=$(python3 "$STORE" snapshot-tareas --claude-dir "$DIR" --tasks-dir "$VIVO" \
    --session-id "$SES" --source caso-1 2>&1)
afirmar "rehúsa cuando un id cambiaría de sujeto (exit 4)" "4" "$?"
afirmar "y NO escribió: la cita sigue nombrando lo suyo" \
    "sujeto original uno" "$(sujeto_de TASK-X-0001)"
afirmar "y nombra la cita afectada" "1" \
    "$(grep -qF 'TASK-X-0001' <<<"$SALIDA" && echo 1 || echo 0)"

# ------------------------------------------------------------------- caso 2
# La escotilla: con la bandera explícita el volcado procede.
python3 "$STORE" snapshot-tareas --claude-dir "$DIR" --tasks-dir "$VIVO" \
    --session-id "$SES" --source caso-2 --permitir-reasignacion >/dev/null 2>&1
afirmar "con --permitir-reasignacion sí vuelca (exit 0)" "0" "$?"
afirmar "y entonces la cita cambia de sujeto" "sujeto intruso" "$(sujeto_de TASK-X-0001)"

# ------------------------------------------------------------------- caso 3
# CONTROL POSITIVO: un volcado legítimo NO debe tropezar con el guard. Sin
# este caso, un guard que rehusara siempre pasaría los dos anteriores.
ficha 3 "tarea nueva, sin cita"                 # alta pura
ficha 2 "sujeto original dos"                   # idéntico al store
python3 "$STORE" snapshot-tareas --claude-dir "$DIR" --tasks-dir "$VIVO" \
    --session-id "$SES" --source caso-3 >/dev/null 2>&1
afirmar "un volcado sin reasignación pasa (exit 0)" "0" "$?"
afirmar "y el alta nueva aterrizó" "1" \
    "$(python3 -c "
import sqlite3
c=sqlite3.connect('file:$DB?mode=ro',uri=True)
print(c.execute('select count(*) from tasks where task_id=\"3\" and session_id=?',('$SES',)).fetchone()[0])")"

# ------------------------------------------------------------------- caso 4
# Una fila SIN acuñar puede cambiar de sujeto libremente: el guard mide citas,
# no ediciones. Sin esta distinción bloquearía el uso normal del tablero.
ficha 3 "tarea nueva, con el sujeto editado"
python3 "$STORE" snapshot-tareas --claude-dir "$DIR" --tasks-dir "$VIVO" \
    --session-id "$SES" --source caso-4 >/dev/null 2>&1
afirmar "editar el sujeto de una fila sin cita pasa (exit 0)" "0" "$?"

# ------------------------------------------------------------------- caso 5
# #104 — LA RENUMERACIÓN, que es el caso para el que existe el re-anclaje y el
# único que el guard NO tenía. El cliente reordena su lista: los mismos sujetos
# aparecen bajo otro ordinal. Sin anclaje por sujeto el guard lo lee como
# reasignación masiva y el tablero se congela; con él, la cita VIAJA a la fila
# que lleva su sujeto y no cambia de sujeto en absoluto.
#
# Sesión PROPIA: los casos 1-4 dejan el ordinal 1 con «sujeto intruso», así que
# reusar $SES mediría el estado que ellos produjeron, no la renumeración.
SES5=sesion-renumerada
VIVO5="$TMP/tasks5"; mkdir -p "$VIVO5"

ficha5() {  # ficha5 <id> <subject>
    printf '{"id":"%s","subject":"%s","status":"pending","description":"d"}\n' \
        "$1" "$2" > "$VIVO5/$1.json"
}

volcar5() {  # volcar5 <source> [flags...]
    local origen="$1"; shift
    python3 "$STORE" snapshot-tareas --claude-dir "$DIR" --tasks-dir "$VIVO5" \
        --session-id "$SES5" --source "$origen" "$@" >/dev/null 2>&1
}

en5() {  # en5 <columna> <predicado-extra>
    python3 -c "
import sqlite3, sys
c = sqlite3.connect('file:$DB?mode=ro', uri=True)
sql = 'select ' + sys.argv[1] + ' from tasks where session_id = ? and ' + sys.argv[2]
f = c.execute(sql, ('$SES5',)).fetchone()
print(f[0] if f and f[0] is not None else '(sin fila)')" "$1" "$2"
}

ficha5 1 "primer sujeto"
ficha5 2 "segundo sujeto"
volcar5 preparacion-5
python3 - <<PY5
import sqlite3
c = sqlite3.connect("$DB")
c.execute("update tasks set citation_id='TASK-Y-0001' where task_id='1' and session_id=?", ("$SES5",))
c.execute("update tasks set citation_id='TASK-Y-0002' where task_id='2' and session_id=?", ("$SES5",))
c.commit()
PY5
afirmar "caso 5 · preparación: la cita 1 nombra su sujeto" "primer sujeto" \
    "$(en5 subject "citation_id = 'TASK-Y-0001'")"

# La renumeración: una tarea nueva se cuela en el ordinal 1 y empuja a las dos.
rm -f "$VIVO5"/*.json
ficha5 1 "tarea nueva que se colo primero"
ficha5 2 "primer sujeto"          # estaba en el ordinal 1
ficha5 3 "segundo sujeto"         # estaba en el ordinal 2
volcar5 caso-5
afirmar "una renumeración pura NO dispara el guard (exit 0)" "0" "$?"
afirmar "y la cita viajó CON su sujeto" "primer sujeto" \
    "$(en5 subject "citation_id = 'TASK-Y-0001'")"
afirmar "al ordinal nuevo (2), no al 1 que reciclaron" "2" \
    "$(en5 task_id "citation_id = 'TASK-Y-0001'")"
afirmar "y la segunda cita también, al ordinal 3" "3" \
    "$(en5 task_id "citation_id = 'TASK-Y-0002'")"
afirmar "ninguna cita quedó duplicada" "2" \
    "$(en5 "count(distinct citation_id)" "citation_id is not null")"

# 5d — CONTROL QUE DISCRIMINA: sin el re-anclaje la cita se queda en el ordinal
# y pasa a nombrar lo que hoy vive ahí. Se mide anulando la función que hace el
# trabajo, sobre una COPIA del guion — el original no se toca. Un control que no
# pudiera fallar no probaría nada (sub-patrón D).
# El mutante NO puede vivir en cualquier sitio: `agent_store.py` resuelve su
# hermano `corpus/tipos_documentales` con `Path(__file__).parents[1]`, así que
# una copia suelta muere en el import y su silencio se leería como «la cita no
# se movió» — un verde falso del propio control. Se replica la forma del árbol.
MUT_RAIZ="$TMP/scripts_mut"; mkdir -p "$MUT_RAIZ/agents"
ln -sfn "$PWD/.claude/scripts/corpus" "$MUT_RAIZ/corpus"
MUTANTE="$MUT_RAIZ/agents/agent_store_mutante.py"
sed 's/^        reancladas = _reanchor_citations_by_subject(.*/        reancladas = 0/' \
    "$STORE" > "$MUTANTE"
afirmar "5d: el mutante SÍ anuló la línea (si no, el control no mide nada)" "1" \
    "$(grep -c '^        reancladas = 0$' "$MUTANTE")"
afirmar "5d: y el mutante ARRANCA (si muriera en el import, su silencio mentiría)" "0" \
    "$(python3 "$MUTANTE" --help >/dev/null 2>&1; echo $?)"
cp "$DB" "$DB.antes-del-mutante"
rm -f "$VIVO5"/*.json
ficha5 1 "otro que se colo en el ordinal uno"
ficha5 2 "tarea nueva que se colo primero"
ficha5 3 "primer sujeto"
python3 "$MUTANTE" snapshot-tareas --claude-dir "$DIR" --tasks-dir "$VIVO5" \
    --session-id "$SES5" --source mutante --permitir-reasignacion >/dev/null 2>&1
afirmar "5d: sin re-anclaje la cita se queda en el ordinal y cambia de sujeto" \
    "tarea nueva que se colo primero" \
    "$(en5 subject "citation_id = 'TASK-Y-0001'")"
mv "$DB.antes-del-mutante" "$DB"      # el mutante no sobrevive al caso
rm -rf "$MUT_RAIZ"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
