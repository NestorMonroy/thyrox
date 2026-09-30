#!/usr/bin/env bash
# Extrae los conceptos de UNA nota con claude -p (sin subagente): cwd en el repo
# de notas, sólo la herramienta Read, sin fuentes de settings del usuario.
# Uso: extraer-conceptos.sh <ruta-relativa-de-la-nota> <dir-salida> [modelo]
set -u
NOTA="$1"; OUT="$2"; MODELO="${3:-claude-haiku-4-5}"
REPO=/home/user/nestormonroy/ai-course-notes
PROMPT="$(dirname "$0")/prompt-conceptos.md"
ID="$(printf '%s' "$NOTA" | tr '/' '_' | sed 's/-notes\.tex$//')"
cd "$REPO" || exit 2
{ cat "$PROMPT"; printf '\nNota: %s\n' "$REPO/$NOTA"; } \
  | timeout 600 claude -p --model "$MODELO" --setting-sources project \
      --tools Read --allowedTools Read --max-turns 12 \
      --no-session-persistence --output-format json \
      > "$OUT/$ID.json" 2> "$OUT/$ID.err"
code=$?
jq -r '.result // ""' "$OUT/$ID.json" 2>/dev/null | gawk '/^\{.*\}$/' > "$OUT/$ID.jsonl"
echo "$NOTA	exit=$code	conceptos=$(wc -l < "$OUT/$ID.jsonl")"
exit $code
