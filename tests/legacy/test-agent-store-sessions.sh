#!/usr/bin/env bash
# Pruebas de agent_sessions: la guarda de estado terminal en
# cmd_register_session (scripts/agents/agent_store.py).
#
# Adaptación del PRINCIPIO de TencentDB Agent Memory: src/utils/checkpoint.ts
# (namespaces runner_states/pipeline_states — ningún escritor pisa un campo
# cuyo dueño semántico es otro evento del ciclo de vida). El mecanismo literal
# (JSON blob read-modify-write) no aplica a nuestro schema por columnas SQL,
# pero el principio sí: un `registrar-sesion` (SubagentStart) posterior a un
# `actualizar-sesion` (SubagentStop) que ya cerró en terminal NO debe
# regresarlo a `running`. Ver H-DOCS-163.

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

leer_campo() {  # leer_campo <db> <agent_id> <columna>
    python3 -c "
import sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
row = conn.execute('SELECT $3 FROM agent_sessions WHERE agent_id=?', (sys.argv[2],)).fetchone()
print(row[0] if row else '<NULO>')
" "$1" "$2"
}

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?

TMP=$(mktemp -d)
DB="$TMP/.claude/agent-results/agent_store.sqlite3"
python3 "$STORE" init --claude-dir "$TMP/.claude/agent-results" >/dev/null

echo "== 2. ciclo normal: running -> completed, sin re-registro =="
python3 "$STORE" registrar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG1 --subagent-type general-purpose --session-id S1 --status running >/dev/null
afirmar "arranca en running" "running" "$(leer_campo "$DB" AG1 status)"
python3 "$STORE" actualizar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG1 --status completed --output-key out1 >/dev/null
afirmar "actualizar-sesion cierra en completed" "completed" "$(leer_campo "$DB" AG1 status)"

echo "== 3. re-registro tras terminal (SubagentStart re-disparado al reanudar) NO regresa a running =="
python3 "$STORE" registrar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG1 --subagent-type general-purpose --session-id S1 --status running >/dev/null
afirmar "status sigue completed tras re-registro" "completed" "$(leer_campo "$DB" AG1 status)"
afirmar "output_key de la terminación se conserva" "out1" "$(leer_campo "$DB" AG1 output_key)"

echo "== 4. lo mismo para failed =="
python3 "$STORE" registrar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG3 --subagent-type general-purpose --session-id S3 --status running >/dev/null
python3 "$STORE" actualizar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG3 --status failed >/dev/null
python3 "$STORE" registrar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG3 --subagent-type general-purpose --session-id S3 --status running >/dev/null
afirmar "status sigue failed tras re-registro" "failed" "$(leer_campo "$DB" AG3 status)"

echo "== 5. lo que SÍ debe seguir mutando: campos de registro (no de estado terminal) =="
python3 "$STORE" registrar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG3 --subagent-type otro-tipo --session-id S3-updated --status running >/dev/null
afirmar "subagent_type se actualiza aun con status terminal" "otro-tipo" "$(leer_campo "$DB" AG3 subagent_type)"
afirmar "session_id se actualiza aun con status terminal" "S3-updated" "$(leer_campo "$DB" AG3 session_id)"

echo "== 6. caso normal (sin terminal previo): running -> running SÍ actualiza status/output_key =="
python3 "$STORE" registrar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG2 --subagent-type general-purpose --session-id S2 --status running >/dev/null
python3 "$STORE" registrar-sesion --claude-dir "$TMP/.claude/agent-results" \
    --agent-id AG2 --subagent-type general-purpose --session-id S2-v2 --status running >/dev/null
afirmar "sin terminal previo, session_id sí se actualiza" "S2-v2" "$(leer_campo "$DB" AG2 session_id)"

rm -rf "$TMP"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
