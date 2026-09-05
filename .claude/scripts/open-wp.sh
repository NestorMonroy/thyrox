#!/bin/bash
# open-wp.sh — abre un work package y fija el estado de sesión (inverso de close-wp.sh).
# Mata PAT-001: now.md::stage y focus.md ya no quedan stale al abrir (no más apertura manual).
# Uso: bash .claude/scripts/open-wp.sh <nombre-kebab> ["Phase N — NOMBRE"]
#   <nombre-kebab>  : nombre del WP (kebab-case, sin timestamp — se antepone date real I-004)
#   [stage]         : opcional; default "Phase 1 — DISCOVER"

set -u
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NOW_FILE="${PROJECT_ROOT}/.thyrox/context/now.md"
FOCUS_FILE="${PROJECT_ROOT}/.thyrox/context/focus.md"

NAME="${1:-}"
STAGE="${2:-Phase 1 — DISCOVER}"
if [ -z "$NAME" ]; then
  echo "uso: open-wp.sh <nombre-kebab> [\"Phase N — NOMBRE\"]" >&2
  exit 2
fi
if ! printf '%s' "$NAME" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "Error: nombre debe ser kebab-case (a-z 0-9 -): '$NAME'" >&2
  exit 2
fi
# E-2 fix: stage va a un `sed s|...|...|` → rechazar metacaracteres que romperían el sed
# (| delimitador, & retro-referencia, \ escape). Un label de stage nunca los necesita.
if printf '%s' "$STAGE" | grep -q '[|&\]'; then
  echo "Error: stage no puede contener | & ni \\ : '$STAGE'" >&2
  exit 2
fi
[ -f "$NOW_FILE" ] || { echo "Error: $NOW_FILE not found" >&2; exit 1; }

TS=$(date '+%Y-%m-%d-%H-%M-%S')          # I-004: timestamp real, nunca inventado
DATE=$(date '+%Y-%m-%d %H:%M:%S')
WP_REL=".thyrox/context/work/${TS}-${NAME}"
WP_ABS="${PROJECT_ROOT}/${WP_REL}"

if [ -e "$WP_ABS" ]; then echo "Error: ya existe $WP_REL" >&2; exit 1; fi
mkdir -p "${WP_ABS}/discover"

# --- now.md: fijar current_work + stage + updated_at + cuerpo Contexto ---
sed -i'' -e "s|^current_work: .*|current_work: ${WP_REL}|" \
         -e "s|^stage: .*|stage: ${STAGE} (${NAME})|" \
         -e "s|^updated_at: .*|updated_at: ${DATE}|" \
         "$NOW_FILE"
CONTEXTO_LINE=$(grep -n "^# Contexto" "$NOW_FILE" | head -1 | cut -d: -f1)
if [ -n "$CONTEXTO_LINE" ]; then
    KEEP=$((CONTEXTO_LINE - 1))
    head -n "$KEEP" "$NOW_FILE" > "${NOW_FILE}.tmp"
    printf '# Contexto\n\nWP **%s** abierto (%s). Siguiente: trabajar Phase 1 DISCOVER.\n' "$NAME" "$STAGE" >> "${NOW_FILE}.tmp"
    mv "${NOW_FILE}.tmp" "$NOW_FILE"
fi

# --- focus.md: actualizar el marcador gestionado WP-STATUS (mecánico, anti PAT-001) ---
if [ -f "$FOCUS_FILE" ] && grep -q "<!-- WP-STATUS -->" "$FOCUS_FILE"; then
    awk -v name="$NAME" -v stage="$STAGE" -v wp="$WP_REL" '
      /<!-- WP-STATUS -->/ {print; print "**WP activo:** " name " — " stage; print "WP: `" wp "/`"; skip=1; next}
      /<!-- \/WP-STATUS -->/ {skip=0; print; next}
      skip {next}
      {print}
    ' "$FOCUS_FILE" > "${FOCUS_FILE}.tmp" && mv "${FOCUS_FILE}.tmp" "$FOCUS_FILE"
    sed -i'' -e "s|^updated_at: .*|updated_at: ${DATE}|" "$FOCUS_FILE"
fi

echo "[OK] WP abierto: ${WP_REL}"
echo "   stage: ${STAGE}"
echo "   now.md y focus.md::WP-STATUS actualizados."
