#!/usr/bin/env bash
# Suite de `refresh-board.sh` — los tres estados, cada uno con su control.
#
# Por qué la suite existe y qué la haría fallar
# ---------------------------------------------
# El aporte del sucesor es el estado 2: renderizar DECLARANDO la diferencia en
# vez de rehusar del todo. Un test que sólo comprobara «sale 0» no distingue
# «declaró la degradación» de «no había ninguna que declarar» — el verde que no
# discrimina del sub-patrón D de `metrica-decide-la-conclusion.md`.
#
# Por eso cada caso mide el ARTEFACTO, no el código de salida solo: el estado 1
# exige que el `.rst` NO lleve el aviso, y el 2 que SÍ lo lleve con su conteo.
# El estado 1 es el control positivo del estado 2: si el aviso apareciera
# también sin colisión, el instrumento estaría midiendo otra cosa.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUION="$RAIZ/.claude/scripts/task/refresh-board.sh"
STORE_CLI="$RAIZ/.claude/scripts/agents/agent_store.py"

OK=0; FALLOS=0
comprobar() { # <descripción> <condición-ya-evaluada:0|1>
    if [[ "$2" -eq 0 ]]; then OK=$((OK+1)); echo "  ok   — $1"
    else FALLOS=$((FALLOS+1)); echo "  FALLA — $1" >&2; fi
}

BANCO=$(mktemp -d)
trap 'rm -rf "$BANCO"' EXIT
STORE="$BANCO/store"; mkdir -p "$STORE"
TASKS_ROOT="$BANCO/tasks"; SESION="sesion-de-prueba"
mkdir -p "$TASKS_ROOT/$SESION"
SALIDA="$BANCO/tablero.rst"

tarea() { # <id> <subject>
    printf '{"id":"%s","subject":"%s","status":"pending"}\n' "$1" "$2" \
        > "$TASKS_ROOT/$SESION/$1.json"
}

echo "caso 1 — estado PLENO: sin citas acuñadas, el volcado no mueve nada"
tarea 1 "Portar el primer simbolo"
tarea 2 "Portar el segundo simbolo"
CLAUDE_TASKS_ROOT="$TASKS_ROOT" bash "$GUION" -t "$SESION" \
    --claude-dir "$STORE" -o "$SALIDA" >/dev/null 2>&1
comprobar "sale 0" $?
grep -q 'Este tablero está incompleto' "$SALIDA"; [[ $? -ne 0 ]]
comprobar "el .rst NO lleva el aviso de degradación (control positivo)" $?
grep -q 'Portar el primer simbolo' "$SALIDA"
comprobar "el .rst incorporó la tarea viva" $?

echo "caso 2 — estado DECLARADO: una cita acuñada cuyo sujeto cambia debajo"
python3 - "$STORE" "$SESION" <<'PY'
import sqlite3, sys, pathlib
# `resolve_store_dir` cuelga la base de `<claude-dir>/agent-results/`,
# así que se busca en el árbol y no en la raíz que se le pasó.
db = next(pathlib.Path(sys.argv[1]).rglob('agent_store.sqlite3'))
c = sqlite3.connect(db)
c.execute("UPDATE tasks SET citation_id='TASK-TEST-0001' "
          "WHERE session_id=? AND task_id='1'", (sys.argv[2],))
c.commit()
PY
tarea 1 "OTRO sujeto bajo el mismo ordinal"
CLAUDE_TASKS_ROOT="$TASKS_ROOT" bash "$GUION" -t "$SESION" \
    --claude-dir "$STORE" -o "$SALIDA" >/dev/null 2>&1
comprobar "sale 0: el tablero SÍ se produce, degradado y declarado" $?
grep -q 'Este tablero está incompleto' "$SALIDA"
comprobar "el .rst lleva el aviso de degradación" $?
grep -q 'TASK-TEST-0001' "$SALIDA"
comprobar "el aviso NOMBRA la cita que habría cambiado de sujeto" $?
# La afirmación es «no se escribió nada», y eso se mide en el STORE, no en el
# `.rst`: el sujeto vivo SÍ aparece en el render, dentro del propio aviso y como
# ejemplo de la colisión. Buscarlo en el archivo mediría el significante y daría
# rojo sobre una conducta correcta (sub-patrón C de
# `metrica-decide-la-conclusion.md`).
python3 - "$STORE" "$SESION" <<'SONDA'
import sqlite3, sys, pathlib
db = next(pathlib.Path(sys.argv[1]).rglob('agent_store.sqlite3'))
fila = sqlite3.connect(db).execute(
    "SELECT subject FROM tasks WHERE session_id=? AND task_id='1'", (sys.argv[2],)
).fetchone()
sys.exit(0 if fila and fila[0] == 'Portar el primer simbolo' else 1)
SONDA
comprobar "el store conserva el sujeto acuñado: no se escribió nada" $?

echo "caso 3 — --strict convierte la degradación en fallo para el llamador"
CLAUDE_TASKS_ROOT="$TASKS_ROOT" bash "$GUION" -t "$SESION" \
    --claude-dir "$STORE" -o "$SALIDA" --strict >/dev/null 2>&1
[[ $? -eq 5 ]]
comprobar "sale 5 con --strict" $?

echo "caso 4 — estado REHUSADO: sin directorio vivo"
CLAUDE_TASKS_ROOT="$BANCO/no-existe" bash "$GUION" \
    --claude-dir "$STORE" -o "$SALIDA" >/dev/null 2>&1
[[ $? -eq 2 ]]
comprobar "sale 2 sin directorio vivo" $?
CLAUDE_TASKS_ROOT="$TASKS_ROOT" bash "$GUION" -t "vacia" \
    --claude-dir "$STORE" -o "$SALIDA" >/dev/null 2>&1
[[ $? -eq 2 ]]
comprobar "sale 2 con un team que no existe" $?

echo
echo "test-refresh-board: $OK ok, $FALLOS falla(s)"
[[ "$FALLOS" -eq 0 ]]
