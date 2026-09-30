#!/usr/bin/env bash
# Qué dice el transcript de una sesión sobre hooks, goal y cwd — con jq y gawk.
#   bash probes/medir.sh <transcript.jsonl>
set -euo pipefail
T="${1:?falta el transcript}"
echo "== adjuntos por tipo =="
jq -r 'select(.attachment.type) | .attachment.type' "$T" | sort | uniq -c | sort -k1nr
echo "== adjuntos de hook (hook_*) =="
jq -r 'select(.attachment.type // "" | startswith("hook")) | .attachment.type' "$T" | sort | uniq -c
echo "== registros del harness que declaran goal o Stop hook =="
# Solo registros de sistema y adjuntos: un grep sobre el archivo entero cuenta
# tambien la conversacion que NOMBRA /goal, que es el significante.
jq -r 'select(.type=="system") | (.subtype // "sin-subtipo")' "$T" | grep -ciE 'goal|stop' || true
jq -r 'select(.attachment.type) | .attachment.type' "$T" | grep -ciE 'goal|stop' || true
echo "== cwd de arranque (primera instantanea environment) =="
jq -r 'select(.attachment.type=="environment") | .attachment.snapshot.workingDirectory' "$T" | head -1
echo "== instantaneas environment por workingDirectory (sigue al cd del shell) =="
jq -r 'select(.attachment.type=="environment") | .attachment.snapshot.workingDirectory' "$T" | sort | uniq -c | sort -k1nr
echo "== CLAUDE.md y reglas cargadas, por repo =="
jq -r 'select(.attachment.type=="instructions") | .attachment.files[].path' "$T" | sort -u \
  | gawk -F/ '{print $4}' | sort | uniq -c
