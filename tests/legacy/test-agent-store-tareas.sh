#!/usr/bin/env bash
# Pruebas del snapshot de TASK al store (H-DOCS-180).
#
# El ejecutor preguntó «¿las TASK también ya se están guardando?». Medido:
# NO. El cliente las guarda en ``/root/.claude/tasks/<session_id>/<N>.json``,
# que es efímero al contenedor **y por sesión** — un directorio nuevo por cada
# sesión, vacío. El único registro versionado (``pm/reportes/tablero-de-tareas.rst``)
# describía una sesión distinta, con id máximo 57 frente a 447 vivas.
#
# Es el mismo defecto que ``agent_sessions`` resolvió para los subagentes, y se
# cierra igual: el store es el instrumento durable, así que la tarea se registra
# como FILA. Adaptado de ``tdam: MemoryCore/src/metadata/store/sqlite-adapter.ts``,
# que modela cada eje como tabla propia con ``source`` y ``metadata_json``.
#
# Control positivo REAL (no fabricado, per hallazgo-abierto-genera-sucesor.md):
# el caso 4 usa la forma exacta de ``/root/.claude/tasks/<sesión>/447.json`` —
# el archivo que existe en este contenedor — incluido su ``blockedBy`` vacío y
# el ``activeForm`` que 327 de 442 tareas traen y 115 no.

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

leer_tarea() {  # leer_tarea <db> <task_id> <columna>
    python3 -c "
import sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
try:
    row = conn.execute('SELECT $3 FROM tasks WHERE task_id=?', (sys.argv[2],)).fetchone()
except sqlite3.OperationalError as e:
    print('<SIN-TABLA>'); raise SystemExit(0)
print('<NULO>' if (row is None or row[0] is None) else row[0])
" "$1" "$2"
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)
CLAUDE_DIR="$TMP/.claude/agent-results"
DB="$CLAUDE_DIR/agent_store.sqlite3"
TASKS="$TMP/tasks"
mkdir -p "$CLAUDE_DIR" "$TASKS"

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?

echo "== 2. la tabla tasks existe tras conectar (migrado aditivo, como las columnas de uso) =="
python3 "$STORE" listar-sesiones --claude-dir "$CLAUDE_DIR" >/dev/null 2>&1
tiene=$(python3 -c "
import sqlite3
c = sqlite3.connect('$DB')
print('si' if c.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'\").fetchone() else 'no')
")
afirmar "la tabla tasks se crea sola" "si" "$tiene"

echo "== 3. snapshot de un directorio de TASK: 3 archivos -> 3 filas =="
cat > "$TASKS/1.json" <<'EOF'
{"id":"1","subject":"Primera","description":"desc 1","status":"completed","blocks":[],"blockedBy":[]}
EOF
cat > "$TASKS/2.json" <<'EOF'
{"id":"2","subject":"Segunda","description":"desc 2","status":"in_progress",
 "activeForm":"Haciendo la segunda","blocks":["3"],"blockedBy":[]}
EOF
# Control positivo: forma verbatim de 447.json de este contenedor.
cat > "$TASKS/447.json" <<'EOF'
{"id":"447","subject":"DECISIÓN: dónde vive el corpus","description":"cuerpo largo",
 "status":"pending","blocks":[],"blockedBy":[]}
EOF
salida=$(python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
         --tasks-dir "$TASKS" --session-id SES1 2>&1)
afirmar "el snapshot reporta 3 tareas" "3" \
        "$(python3 -c "
import sqlite3
print(sqlite3.connect('$DB').execute('SELECT COUNT(*) FROM tasks').fetchone()[0])
")"
afirmar "subject se conserva con acentos" "DECISIÓN: dónde vive el corpus" \
        "$(leer_tarea "$DB" 447 subject)"
afirmar "status se conserva" "in_progress" "$(leer_tarea "$DB" 2 status)"
afirmar "session_id queda en la fila" "SES1" "$(leer_tarea "$DB" 1 session_id)"

echo "== 4. campos opcionales: activeForm presente en unas y ausente en otras =="
# Medido en el contenedor: 327 de 442 traen activeForm, 115 no. Una columna
# NOT NULL habría reventado con el 26% del universo real.
afirmar "activeForm se guarda cuando viene" "Haciendo la segunda" \
        "$(leer_tarea "$DB" 2 active_form)"
afirmar "activeForm ausente queda NULO, no rompe" "<NULO>" \
        "$(leer_tarea "$DB" 1 active_form)"
afirmar "blocks se guarda como JSON" '["3"]' "$(leer_tarea "$DB" 2 blocks_json)"

echo "== 5. idempotencia: re-correr no duplica, y un cambio de status SÍ se refleja =="
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 >/dev/null 2>&1
afirmar "segunda ejecución no duplica filas" "3" \
        "$(python3 -c "
import sqlite3
print(sqlite3.connect('$DB').execute('SELECT COUNT(*) FROM tasks').fetchone()[0])
")"
cat > "$TASKS/447.json" <<'EOF'
{"id":"447","subject":"DECISIÓN: dónde vive el corpus","description":"cuerpo largo",
 "status":"completed","blocks":[],"blockedBy":[]}
EOF
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 >/dev/null 2>&1
afirmar "un cambio de status se refleja en la fila" "completed" \
        "$(leer_tarea "$DB" 447 status)"

echo "== 6. una clave nueva del cliente NO se pierde: va a metadata_json =="
# Misma ranura abierta que agent_sessions (H-DOCS-178). El cliente ya introdujo
# `owner` en 1 de 442 archivos sin avisar; la próxima clave no debe perderse.
cat > "$TASKS/9.json" <<'EOF'
{"id":"9","subject":"Con clave nueva","description":"d","status":"pending",
 "blocks":[],"blockedBy":[],"owner":"alguien","claveFutura":"x"}
EOF
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 >/dev/null 2>&1
afirmar "owner tiene columna propia (el cliente ya lo emite)" "alguien" \
        "$(leer_tarea "$DB" 9 owner)"
afirmar "la clave sin columna va a metadata_json" '{"claveFutura": "x"}' \
        "$(leer_tarea "$DB" 9 metadata_json)"

echo "== 7. dos sesiones con el MISMO id de tarea NO se pisan (H-DOCS-175) =="
# El id de tarea NO es único entre sesiones: el espacio arranca en 1 en cada
# una. Medido en H-DOCS-175 sobre dos stores reales: `#5` era "Portar los
# cuatro puentes de portal/signup" en uno y "Migrate CI workflow from MariaDB
# to PostgreSQL" en el otro. Con `task_id` como PK sola, la segunda sesión
# BORRA la primera — justo lo contrario de "el tablero describe todas las
# sesiones".
OTRA="$TMP/tasks-sesion-b"
mkdir -p "$OTRA"
cat > "$OTRA/447.json" <<'EOF'
{"id":"447","subject":"Otra cosa completamente distinta","description":"d",
 "status":"pending","blocks":[],"blockedBy":[]}
EOF
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$OTRA" --session-id SES2 >/dev/null 2>&1
afirmar "la tarea 447 de SES1 sobrevive al alta de la 447 de SES2" \
        "DECISIÓN: dónde vive el corpus" \
        "$(python3 -c "
import sqlite3
c = sqlite3.connect('$DB')
r = c.execute(\"SELECT subject FROM tasks WHERE task_id='447' AND session_id='SES1'\").fetchone()
print(r[0] if r else '<PERDIDA>')
")"
afirmar "las dos filas 447 coexisten, una por sesión" "2" \
        "$(python3 -c "
import sqlite3
c = sqlite3.connect('$DB')
print(c.execute(\"SELECT COUNT(*) FROM tasks WHERE task_id='447'\").fetchone()[0])
")"

echo "== 8. directorio inexistente: reporta 0, no revienta =="
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TMP/no-existe" --session-id SES1 >/dev/null 2>&1
afirmar "un directorio ausente sale 0 (nada que snapshotear)" "0" "$?"

echo "== 9. compara antes de escribir: sobre un árbol sin cambios, 0 escrituras =="
# El control que #705 pide, aplicado aquí. Es el sub-patrón D: hasta H-DOCS-279
# el resumen decía «N tareas» tanto si daba de alta como si sólo tocaba la fila,
# y el `DO UPDATE` movía `updated_at` en todas — un diff del binario versionado
# por turno. Un caso que sólo contara filas habría pasado en verde entonces y
# ahora: lo que discrimina es el BYTE del archivo, no el conteo.
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 >/dev/null 2>&1
MD5_ANTES=$(md5sum "$DB" | cut -d' ' -f1)
SALIDA=$(python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 2>&1)
MD5_DESPUES=$(md5sum "$DB" | cut -d' ' -f1)
afirmar "el archivo no cambia ni un byte" "$MD5_ANTES" "$MD5_DESPUES"
afirmar "el resumen separa los tres desenlaces" "0 nuevas · 0 actualizadas" \
        "$(echo "$SALIDA" | grep -oE '[0-9]+ nuevas · [0-9]+ actualizadas')"

echo "== 10. y una tarea REALMENTE cambiada sí se cuenta como actualizada =="
# El contra-control del caso 9: sin él, un guion que no escribiera NUNCA
# también daría verde arriba. Lo que hace útil al 9 es que el 10 pueda fallar.
cat > "$TASKS/447.json" <<'EOF'
{"id":"447","subject":"DECISIÓN: dónde vive el corpus","description":"cuerpo largo",
 "status":"pending","blocks":[],"blockedBy":[]}
EOF
SALIDA=$(python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 2>&1)
afirmar "una sola fila cambiada se reporta como 1 actualizada" "1 actualizadas" \
        "$(echo "$SALIDA" | grep -oE '[0-9]+ actualizadas')"
afirmar "y el status nuevo aterriza" "pending" "$(leer_tarea "$DB" 447 status)"

echo "== 11. DOS llamadores con source distinto NO se pisan (H-DOCS-279) =="
# El caso que faltaba, y que costó un defecto en producción: la suite daba
# 20 ok mientras dos hooks reescribían 702 filas por turno. Los casos 9 y 10
# miden UN llamador con UN source, así que son estructuralmente incapaces de
# verlo — sub-patrón D de metrica-decide-la-conclusion.md.
#
# `source` describe QUIÉN escribió la fila, no QUÉ dice la tarea, así que un
# cambio sólo de procedencia no debe producir escritura.
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 --source hook-stop >/dev/null 2>&1
MD5_A=$(md5sum "$DB" | cut -d' ' -f1)
SALIDA=$(python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 2>&1)          # default: `snapshot`
MD5_B=$(md5sum "$DB" | cut -d' ' -f1)
afirmar "cambiar sólo la procedencia no escribe" "$MD5_A" "$MD5_B"
afirmar "y se reporta como sin cambio" "0 actualizadas" \
        "$(echo "$SALIDA" | grep -oE '[0-9]+ actualizadas')"

echo "== 12. pero el contenido SÍ gana, aunque venga por otra vía =="
# Contra-control del 11: sin él, excluir `source` de la comparación podría
# haber apagado la detección entera y el 11 seguiría en verde.
cat > "$TASKS/447.json" <<'EOF'
{"id":"447","subject":"DECISIÓN: dónde vive el corpus","description":"cuerpo largo",
 "status":"in_progress","blocks":[],"blockedBy":[]}
EOF
SALIDA=$(python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 --source hook-stop 2>&1)
afirmar "un cambio real por la otra vía sí se cuenta" "1 actualizadas" \
        "$(echo "$SALIDA" | grep -oE '[0-9]+ actualizadas')"
afirmar "y el status nuevo aterriza" "in_progress" "$(leer_tarea "$DB" 447 status)"

echo "== 13. blocks/blockedBy nulos: DESCONOCIDO se guarda como null, no como [] =="
# Una transcripción del tablero da id, estado y subject — y nada más. Escribir
# `[]` ahí afirmaría «no la bloquea nadie», que es distinto de «no se sabe» y
# puede ser falso (sub-patrón D de metrica-decide-la-conclusion.md).
cat > "$TASKS/900.json" <<'EOF'
{"id":"900","subject":"Tarea transcrita del tablero","status":"pending",
 "blocks":null,"blockedBy":null}
EOF
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TASKS" --session-id SES1 --source transcripcion-tablero >/dev/null 2>&1
afirmar "blocks nulo NO se guarda como lista vacia" "null" "$(leer_tarea "$DB" 900 blocks_json)"
afirmar "blockedBy nulo tampoco"                    "null" "$(leer_tarea "$DB" 900 blocked_by_json)"
# Control positivo: la MISMA columna sigue guardando [] cuando el dato SÍ dice
# «vacío». Sin este par, un guion que escribiera null siempre pasaria el de arriba.
afirmar "y el vacio conocido sigue siendo []" "[]" "$(leer_tarea "$DB" 447 blocked_by_json)"

echo "== 14. la celda del tablero distingue el desconocido del vacio =="
# `", ".join(None)` levanta TypeError, que el `except json.JSONDecodeError` no
# atrapaba: representar el desconocido exigia el paso intermedio, no solo
# escribir null en la columna.
celda=$(python3 -c "
import importlib.util, sys
spec = importlib.util.spec_from_file_location('st', '$STORE')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print(m._celda_bloqueada('null'), '|', repr(m._celda_bloqueada('[]')), '|',
      m._celda_bloqueada('[\"3\", \"7\"]'), '|', repr(m._celda_bloqueada(None)))
")
afirmar "null->sin dato, []->vacio, lista->ids, None->vacio" \
        "sin dato | '' | 3, 7 | ''" "$celda"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
