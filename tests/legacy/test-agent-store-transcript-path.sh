#!/usr/bin/env bash
# Pruebas del registro de la ruta de transcript que el cliente declara (H-DOCS-481).
#
# El defecto que cierra: el payload de `SubagentStop` trae
# `agent_transcript_path`, y el hook lo consume para leer el uso — pero no lo
# GUARDA. Cuando la lectura no da nada, la fila queda idéntica a la de un
# agente que no gastó, y se pierde el único dato que distingue las causas:
# qué ruta calculó el cliente, y si esa ruta existía.
#
# Por qué importa, medido: de 394 filas con `source='hook'`, **0** tienen
# contraparte en disco, mientras las 278 de reconciliación coinciden 278 de
# 278. Sin la ruta declarada no se puede separar «el cliente apunta a una raíz
# que no miramos» de «el subagente no dejó transcript».
#
# CONTROL QUE PUEDE FALLAR (sub-patrón D de `metrica-decide-la-conclusion.md`):
# el caso 6 anula el registro —vacía `metadata_json`— y comprueba que las dos
# filas DEJAN de distinguirse. Sin ese caso, los tres anteriores pasarían igual
# con un campo que nadie lee.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

HOOK=.claude/hooks/register_agent_session.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
CLAUDE_DIR="$TMP/agent-results"; mkdir -p "$CLAUDE_DIR"
DB="$CLAUDE_DIR/agent_store.sqlite3"

consulta() { python3 -c "
import sqlite3, sys
c = sqlite3.connect('$DB')
f = c.execute(sys.argv[1]).fetchone()
print('' if f is None or f[0] is None else f[0])
" "$1"; }

meta() {  # meta <agent_id> <clave> — lee una clave de metadata_json
    python3 -c "
import sqlite3, json, sys
c = sqlite3.connect('$DB')
f = c.execute('select metadata_json from agent_sessions where agent_id=?', (sys.argv[1],)).fetchone()
d = json.loads(f[0]) if f and f[0] else {}
v = d.get(sys.argv[2])
print('' if v is None else json.dumps(v) if not isinstance(v, str) else v)
" "$1" "$2"; }

alta() {  # alta <agent_id> <ruta-de-transcript>
    printf '{"hook_event_name":"SubagentStop","agent_id":"%s","agent_type":"general-purpose","session_id":"s1","agent_transcript_path":"%s"}' \
        "$1" "$2" | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop >/dev/null 2>&1
}

alta_con_tareas() {  # alta_con_tareas <agent_id> <json de background_tasks>
    printf '{"hook_event_name":"SubagentStop","agent_id":"%s","agent_type":"","session_id":"s1","agent_transcript_path":"/no/existe.jsonl","background_tasks":%s}' \
        "$1" "$2" | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop >/dev/null 2>&1
}

# Un transcript real, con la forma mínima que `_extract_usage` sabe leer.
REAL="$TMP/agent-a1111111111111111.jsonl"
printf '%s\n' '{"type":"assistant","message":{"model":"claude-sonnet-5","usage":{"input_tokens":10,"output_tokens":20,"cache_read_input_tokens":30,"cache_creation_input_tokens":40}}}' > "$REAL"

echo "== Caso 1: el transcript declarado EXISTE"
alta a1111111111111111 "$REAL"
afirmar "guarda la ruta declarada" "$REAL"  "$(meta a1111111111111111 agent_transcript_path)"
afirmar "declara que estaba"       "true"   "$(meta a1111111111111111 transcript_presente)"

echo "== Caso 2 (EL QUE DISCRIMINA): la ruta declarada NO existe"
# Es la forma de las 394 filas fantasma: el cliente calcula la ruta con
# `getAgentTranscriptPath(subagentId)` sin comprobar que el archivo esté.
AUSENTE="$TMP/subagents/agent-a2222222222222222.jsonl"
alta a2222222222222222 "$AUSENTE"
afirmar "guarda la ruta declarada" "$AUSENTE" "$(meta a2222222222222222 agent_transcript_path)"
afirmar "declara que NO estaba"    "false"    "$(meta a2222222222222222 transcript_presente)"
afirmar "sin uso medido"           ""         "$(consulta "select usage_source from agent_sessions where agent_id='a2222222222222222'")"

echo "== Caso 3: las dos filas se distinguen en el agregado"
afirmar "con transcript" "1" "$(consulta "select count(*) from agent_sessions where json_extract(metadata_json,'\$.transcript_presente') = 1")"
afirmar "sin transcript" "1" "$(consulta "select count(*) from agent_sessions where json_extract(metadata_json,'\$.transcript_presente') = 0")"

echo "== Caso 4: la clase de la tarea de fondo homónima queda registrada"
# El payload de todo Stop/SubagentStop trae `background_tasks`, y cada entrada
# declara su `kind` — `agent`, `dream`, `auto_mode_scan`, `monitor_ws`,
# `in_process_teammate`, `local_workflow`… Es el único campo del payload que
# NOMBRA la clase del emisor, y hoy el hook lo descarta.
alta_con_tareas a3333333333333333 '[{"id":"a3333333333333333","kind":"dream"},{"id":"otra","kind":"local_bash"}]'
afirmar "guarda la entrada homónima" '{"id": "a3333333333333333", "kind": "dream"}' "$(meta a3333333333333333 tarea_de_fondo)"
afirmar "censa las clases presentes" '{"dream": 1, "local_bash": 1}' "$(meta a3333333333333333 clases_de_fondo)"

echo "== Caso 5 (EL QUE DISCRIMINA): el agente NO figura entre las tareas de fondo"
# Que no figure también es respuesta: descarta que el emisor sea una tarea del
# registro, y deja el veredicto en el otro cubo. Sin distinguir los dos casos,
# la ausencia del campo se leería como «no se midió».
alta_con_tareas a4444444444444444 '[{"id":"otra","kind":"local_bash"}]'
afirmar "declara que no figura"     "false"                 "$(meta a4444444444444444 figura_en_fondo)"
afirmar "y aun así censa las clases" '{"local_bash": 1}'    "$(meta a4444444444444444 clases_de_fondo)"

echo "== Caso 6 (CONTROL ANULADO): sin el registro las dos colapsan"
python3 -c "
import sqlite3
c = sqlite3.connect('$DB'); c.execute('UPDATE agent_sessions SET metadata_json = NULL'); c.commit()"
afirmar "anulado: con transcript deja de verse" "0" "$(consulta "select count(*) from agent_sessions where json_extract(metadata_json,'\$.transcript_presente') is not null")"
afirmar "anulado: las 4 quedan indistinguibles" "4" "$(consulta "select count(*) from agent_sessions where metadata_json is null")"

echo
echo "$OK ok · $FALLO falla(s)  (alcance medido: $((OK+FALLO)) aserciones)"
[[ "$FALLO" -eq 0 ]]
