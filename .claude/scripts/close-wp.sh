#!/bin/bash
# close-wp.sh — limpia now.md al cerrar un WP al final de Phase 7
# Uso: bash .claude/scripts/close-wp.sh
# Llamar DESPUES del ultimo Write al WP (lessons-learned, final-report)
# Fix de Bug 4: cierre determinista, no LLM-dependiente
# Nota: no modifica cold_boot, last_session ni blockers (gestionados por session-start.sh)

NOW_FILE=".thyrox/context/now.md"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

if [ ! -f "$NOW_FILE" ]; then
  echo "Error: $NOW_FILE not found" >&2
  exit 1
fi

sed -i \
  -e "s|^current_work: .*|current_work: null|" \
  -e "s|^phase: .*|phase: null|" \
  -e "s|^updated_at: .*|updated_at: $DATE|" \
  "$NOW_FILE"
