#!/usr/bin/env bash
# Sonda: monta el mismo fixture de 8 entradas que la suite y publica el
# reporte crudo. La suite mide aserciones; esta sonda muestra la tabla,
# que es donde se vio el defecto. Vive en el run y no en un directorio
# efimero: un `/tmp` muere con el contenedor y con el la reproduccion.
set -uo pipefail
TMP=$(mktemp -d); ROSTER="$TMP/tasks"; TRANSCRIPTS="$TMP/subagents"
mkdir -p "$ROSTER" "$TRANSCRIPTS"; VIEJO='2026-01-01 00:00:00'
printf '%s\n' '{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Read"}]}}' '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Reporte final."}]}}' > "$TRANSCRIPTS/agent-cerrado.jsonl"
ln -s "$TRANSCRIPTS/agent-cerrado.jsonl" "$ROSTER/cerrado.output"
printf '%s\n' '{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Grep"}]}}' '{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"..."}]}}' > "$TRANSCRIPTS/agent-cortado.jsonl"
ln -s "$TRANSCRIPTS/agent-cortado.jsonl" "$ROSTER/cortado.output"
printf '%s\n' '{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"..."}]}}' > "$TRANSCRIPTS/agent-pegado.jsonl"
ln -s "$TRANSCRIPTS/agent-pegado.jsonl" "$ROSTER/pegado.output"
printf 'salida\n[exited with code 0]\n' > "$ROSTER/harness.output"
printf '2464 passed in 585s\nEXIT=0\n' > "$ROSTER/propio.output"
printf '88 failed, 338 passed in 163.14s\n' > "$ROSTER/mudo.output"
printf 'trabajando...\n' > "$ROSTER/fresco.output"
printf '%s\n' '{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Bash"}]}}' '{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"..."}]}}' > "$TRANSCRIPTS/agent-vivo.jsonl"
ln -s "$TRANSCRIPTS/agent-vivo.jsonl" "$ROSTER/vivo.output"
touch -h -d "$VIEJO" "$ROSTER/cortado.output" "$ROSTER/mudo.output" "$ROSTER/vivo.output"
touch    -d "$VIEJO" "$TRANSCRIPTS/agent-cortado.jsonl"
export RECONCILIAR_ROSTER="$ROSTER"
bash /home/user/thyrox/src/agents/reconcile-agents.sh 2>&1
rm -rf "$TMP"
