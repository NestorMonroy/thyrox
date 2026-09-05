#!/usr/bin/env bash
# Pruebas del hook SubagentStop — alta implícita y campo del transcript.
#
# Cubren los dos defectos que dejaron a 5 de 5 agentes de una tanda real fuera
# de agent_sessions (H-DOCS-190):
#
#   A. `actualizar-sesion` era un UPDATE puro: con rowcount 0 salía 1 y el
#      agente no quedaba registrado. Sin SubagentStart no hay fila que
#      actualizar, y SubagentStart no dispara en este entorno (H-DOCS-167).
#      La bandera `--crear-si-falta` cierra el hueco, como bgDaemon.ts:839-846
#      hace al apagarse: escribir el estado final aunque el ciclo de vida no
#      haya pasado por donde debía.
#
#   B. El hook leía `transcript_path`, que `createBaseHookInput` rellena con
#      el transcript de la SESIÓN PRINCIPAL en todo payload. El del subagente
#      llega en `agent_transcript_path` (ccb: packages/agent/hooks.ts:4074-4078).
#      Leer el campo equivocado no vacía el dato — lo llena con el uso de la
#      sesión entera, que es peor que no tenerlo.
#
# Control positivo REAL (no fabricado, per hallazgo-abierto-genera-sucesor.md):
# el caso 3 se ejercitó primero contra el transcript real de un subagente de
# esta sesión con la sesión principal como señuelo, y la fila aterrizó con las
# cifras del subagente (turns 37, equiv_cost 2 689 380) y no con las de la
# principal (equiv_cost 1 582 293 503, factor ~588x). La transcripción verbatim
# de esa corrida vive en el hallazgo. Aquí el fixture es sintético para que la
# suite no dependa de que ese transcript siga en el filesystem del contenedor.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
HOOK=.claude/hooks/register_agent_session.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

leer_campo() {  # leer_campo <db> <agent_id> <columna>
    python3 -c "
import sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
row = conn.execute('SELECT $3 FROM agent_sessions WHERE agent_id=?', (sys.argv[2],)).fetchone()
print('' if row is None or row[0] is None else row[0])
" "$1" "$2"
}

leer_clave_meta() {  # leer_clave_meta <db> <agent_id> <clave-de-metadata_json>
    python3 -c "
import json, sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
row = conn.execute('SELECT metadata_json FROM agent_sessions WHERE agent_id=?', (sys.argv[2],)).fetchone()
meta = json.loads(row[0]) if row and row[0] else {}
valor = meta.get(sys.argv[3])
print('' if valor is None else json.dumps(valor))
" "$1" "$2" "$3"
}

# Un transcript JSONL mínimo con el `usage` que el hook suma. Dos turnos con
# `message.id` distinto; el dedup ya lo cubre test-agent-store-usage-columns.sh.
escribir_transcript() {  # escribir_transcript <ruta> <cache_read_por_turno>
    python3 -c "
import json, sys
ruta, cr = sys.argv[1], int(sys.argv[2])
with open(ruta, 'w') as fh:
    for i in (1, 2):
        fh.write(json.dumps({'type': 'assistant', 'message': {
            'role': 'assistant', 'id': f'msg_{i}',
            'usage': {'input_tokens': 10, 'cache_creation_input_tokens': 0,
                      'cache_read_input_tokens': cr, 'output_tokens': 4},
        }}) + '\n')
" "$1" "$2"
}

# Un transcript rico: timestamps, usos de herramienta y DOS mensajes de
# usuario. El primero es un eco de `tool_result` — la trampa que separa el
# encargo de la salida de un comando. Va PRIMERO a propósito: un lector que
# tome «el primer type: user» guardaría la salida del `ls` como si fuera el
# prompt, y la aserción lo delata con el texto, no con una ausencia.
escribir_transcript_rico() {  # escribir_transcript_rico <ruta>
    python3 -c "
import json, sys
ruta = sys.argv[1]
lineas = [
    {'type': 'user', 'timestamp': '2026-08-26T10:00:00.000Z', 'message': {
        'role': 'user', 'content': [
            {'type': 'tool_result', 'tool_use_id': 'tu_0', 'content': 'ECO-DE-TOOL-RESULT'}]}},
    {'type': 'user', 'timestamp': '2026-08-26T10:00:01.000Z', 'message': {
        'role': 'user', 'content': [{'type': 'text', 'text': 'Mide el flujo en el binario'}]}},
    {'type': 'assistant', 'timestamp': '2026-08-26T10:01:00.000Z', 'message': {
        'role': 'assistant', 'id': 'msg_r1',
        'usage': {'input_tokens': 10, 'cache_creation_input_tokens': 0,
                  'cache_read_input_tokens': 500, 'output_tokens': 4},
        'content': [{'type': 'tool_use', 'id': 'tu_1', 'name': 'Bash', 'input': {}},
                    {'type': 'tool_use', 'id': 'tu_2', 'name': 'Read', 'input': {}}]}},
    {'type': 'assistant', 'timestamp': '2026-08-26T10:02:30.000Z', 'message': {
        'role': 'assistant', 'id': 'msg_r2',
        'usage': {'input_tokens': 10, 'cache_creation_input_tokens': 0,
                  'cache_read_input_tokens': 500, 'output_tokens': 4},
        'content': [{'type': 'tool_use', 'id': 'tu_3', 'name': 'Bash', 'input': {}}]}},
]
with open(ruta, 'w') as fh:
    for obj in lineas:
        fh.write(json.dumps(obj) + '\n')
" "$1"
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
CLAUDE_DIR="$TMP/.claude/agent-results"; mkdir -p "$CLAUDE_DIR"
DB="$CLAUDE_DIR/agent_store.sqlite3"
python3 "$STORE" init --claude-dir "$CLAUDE_DIR" >/dev/null

# ---------------------------------------------------------------------------
# 1. Sin la bandera, el comportamiento previo se conserva: no inventa filas.
# ---------------------------------------------------------------------------
python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE_DIR" \
    --agent-id aSIN --status completed >/dev/null 2>&1
afirmar "sin --crear-si-falta, un agent_id ausente sigue fallando" "1" "$?"
afirmar "sin --crear-si-falta, no se creó ninguna fila" "" "$(leer_campo "$DB" aSIN status)"

# ---------------------------------------------------------------------------
# 2. Con la bandera, el cierre crea la fila y la puebla con lo que traiga.
# ---------------------------------------------------------------------------
python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE_DIR" \
    --agent-id aCON --status completed --crear-si-falta \
    --session-id S-alta --subagent-type general-purpose \
    --turns 7 --equiv-cost 1234 >/dev/null
afirmar "--crear-si-falta crea la fila que el alta nunca escribió" "completed" \
        "$(leer_campo "$DB" aCON status)"
afirmar "la fila creada conserva el session_id del payload" "S-alta" \
        "$(leer_campo "$DB" aCON session_id)"
afirmar "la fila creada conserva el subagent_type del payload" "general-purpose" \
        "$(leer_campo "$DB" aCON subagent_type)"
afirmar "el UPDATE puebla las columnas de uso sobre la fila recién creada" "7" \
        "$(leer_campo "$DB" aCON turns)"

# Segunda pasada: idempotente — no duplica ni pisa con el placeholder.
python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE_DIR" \
    --agent-id aCON --status completed --crear-si-falta \
    --session-id desconocida --subagent-type desconocido >/dev/null
afirmar "una segunda pasada no pisa el session_id con el placeholder" "S-alta" \
        "$(leer_campo "$DB" aCON session_id)"
afirmar "una segunda pasada no pisa el subagent_type con el placeholder" \
        "general-purpose" "$(leer_campo "$DB" aCON subagent_type)"

# ---------------------------------------------------------------------------
# 3. El hook punta a punta: `agent_transcript_path` gana al señuelo.
#
# El señuelo lleva 100x el cache_read del subagente — si el hook leyera el
# campo equivocado, la cifra publicada sería la de la sesión entera y la
# aserción lo delata con un número, no con una ausencia.
# ---------------------------------------------------------------------------
escribir_transcript "$TMP/sub.jsonl"  1000
escribir_transcript "$TMP/main.jsonl" 100000

printf '{"hook_event_name":"SubagentStop","agent_id":"aE2E","agent_type":"Explore","session_id":"S-e2e","agent_transcript_path":"%s","transcript_path":"%s"}' \
    "$TMP/sub.jsonl" "$TMP/main.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop
afirmar "el hook nunca rompe el flujo" "0" "$?"
afirmar "el cierre registra al agente aunque no hubiera alta previa" "completed" \
        "$(leer_campo "$DB" aE2E status)"
# 2 turnos x 1000 = 2000 del subagente; 200000 sería el de la sesión principal.
afirmar "lee agent_transcript_path, no el señuelo transcript_path" "2000" \
        "$(leer_campo "$DB" aE2E cache_read_tokens)"
afirmar "el conteo de turnos sale del transcript del subagente" "2" \
        "$(leer_campo "$DB" aE2E turns)"
afirmar "marca el origen como hook" "hook" "$(leer_campo "$DB" aE2E source)"

# Retrocompatibilidad: un payload sin `agent_transcript_path` (p. ej. un build
# anterior del cliente) sigue cayendo a `transcript_path` en vez de quedarse
# sin cifras. La degradación es peor dato, no ausencia de dato — y es
# deliberada: sin fallback, un cambio de nombre de campo dejaría la columna
# vacía sin que nada lo delate.
printf '{"hook_event_name":"SubagentStop","agent_id":"aOLD","agent_type":"Explore","session_id":"S-old","transcript_path":"%s"}' \
    "$TMP/sub.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop
afirmar "sin agent_transcript_path cae a transcript_path" "2000" \
        "$(leer_campo "$DB" aOLD cache_read_tokens)"

# ---------------------------------------------------------------------------
# 4. La telemetría se escribe EN EL MOMENTO, no en un pase posterior (#587).
#
# Las cuatro columnas salen del mismo transcript que el hook ya lee para el
# costo. Hasta #587 las poblaba `reconciliar_store.py` en un barrido posterior,
# así que su ventana dependía de cuándo se recicla ~/.claude/projects — medido
# en H-DOCS-427: 353 de 353 filas del hook sin un solo token, y ninguna con su
# transcript aún en disco. El agente que muere sin transcript no es
# recuperable; el que cierra bien sí, y es el que este caso mide.
# ---------------------------------------------------------------------------
escribir_transcript_rico "$TMP/rico.jsonl"
printf '{"hook_event_name":"SubagentStop","agent_id":"aTEL","agent_type":"Explore","session_id":"S-tel","agent_transcript_path":"%s","last_assistant_message":"listo"}' \
    "$TMP/rico.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop
afirmar "el hook nunca rompe el flujo con el transcript rico" "0" "$?"
# 10:00:00 -> 10:02:30 = 150 s. Se mide entre el primer y el último timestamp
# del transcript, no con updated_at - started_at: aquéllas dicen cuándo el
# store vio al agente, no cuánto trabajó (H-DOCS-208).
afirmar "el hook escribe duration_s del transcript" "150" \
        "$(leer_campo "$DB" aTEL duration_s)"
afirmar "el hook escribe tool_uses_total" "3" \
        "$(leer_campo "$DB" aTEL tool_uses_total)"
afirmar "el hook escribe el desglose por herramienta" '{"Bash": 2, "Read": 1}' \
        "$(leer_campo "$DB" aTEL tool_uses_json)"
# El control que discrimina: si el lector tomara el primer `type: user`, aquí
# habría un ECO-DE-TOOL-RESULT en vez del encargo.
afirmar "el prompt es el encargo, no el eco del tool_result" \
        "Mide el flujo en el binario" "$(leer_campo "$DB" aTEL prompt)"
afirmar "el nivel de retención sigue saliendo del payload" "3" \
        "$(leer_campo "$DB" aTEL retention_level)"

# ---------------------------------------------------------------------------
# 5. Un transcript sin las señales deja las columnas en NULL, no en cero.
#
# El fixture pobre de los casos anteriores no tiene timestamps, ni tool_use,
# ni mensaje de usuario. Su ausencia es legítima y se distingue de un cero
# medido: `0 s de duración` y `nunca se midió` no son lo mismo, que es el
# defecto que :ref:`h-docs-427` cierra un nivel más arriba.
# ---------------------------------------------------------------------------
afirmar "sin timestamps, duration_s queda NULL" "" \
        "$(leer_campo "$DB" aE2E duration_s)"
afirmar "sin tool_use, tool_uses_total queda NULL" "" \
        "$(leer_campo "$DB" aE2E tool_uses_total)"
afirmar "sin mensaje de usuario, prompt queda NULL" "" \
        "$(leer_campo "$DB" aE2E prompt)"

# ---------------------------------------------------------------------------
# 6. El conjunto de claves del payload se guarda, y es lo que discrimina.
#
# El emisor de SubagentStop no se puede identificar leyendo sólo los cuatro
# campos que el hook fue a buscar: un instrumento sólo ve lo que nombra. La
# medición de :ref:`h-docs-499` dejó la pregunta abierta con dos poblaciones
# DISJUNTAS —0 identificadores comunes entre 426 filas del hook y 279
# transcripts en disco— y ningún campo que las separe.
#
# Se guardan los NOMBRES, nunca los valores: un valor puede traer contenido de
# la sesión (tarea #662) y para separar dos formas basta con el conjunto.
#
# El control que discrimina: un payload SIN `background_tasks` tiene que dar
# una lista de claves distinta de uno que sí lo trae. Si el hook guardara una
# constante, los dos casos darían lo mismo y el campo no informaría nada.
# ---------------------------------------------------------------------------
printf '{"hook_event_name":"SubagentStop","agent_id":"aCLA","session_id":"S-cla","novedad_del_emisor":1}' \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop
afirmar "el hook guarda el conjunto de claves del payload" \
        '["agent_id", "hook_event_name", "novedad_del_emisor", "session_id"]' \
        "$(leer_clave_meta "$DB" aCLA claves_de_payload)"
printf '{"hook_event_name":"SubagentStop","agent_id":"aCLB","session_id":"S-cla","background_tasks":[]}' \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop
afirmar "un payload de otra forma da otro conjunto de claves" \
        '["agent_id", "background_tasks", "hook_event_name", "session_id"]' \
        "$(leer_clave_meta "$DB" aCLB claves_de_payload)"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
