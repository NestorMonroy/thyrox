#!/bin/bash
# close-wp.sh — limpia now.md al cerrar un WP
# Uso: bash .claude/scripts/task/close-wp.sh (script manual — NO es hook)
# Llamar DESPUES del ultimo Write al WP (lessons-learned, final-report)

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
PROJECT_ROOT="$(thyrox_root)" || exit 2
NOW_FILE="${PROJECT_ROOT}/.thyrox/context/now.md"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

if [ ! -f "$NOW_FILE" ]; then
  echo "Error: $NOW_FILE not found" >&2
  exit 1
fi

# A-4: resetear campos de estado (stage: primario, phase: retrocompat, flow, methodology_step)
sed -i'' -e "s|^current_work: .*|current_work: null|" \
         -e "s|^stage: .*|stage: null|" \
         -e "s|^phase: .*|phase: null|" \
         -e "s|^flow: .*|flow: null|" \
         -e "s|^methodology_step: .*|methodology_step: null|" \
         -e "s|^updated_at: .*|updated_at: $DATE|" \
         "$NOW_FILE"

# A-5: limpiar body "# Contexto" — bash-puro sin python3 (DS-02)
CONTEXTO_LINE=$(grep -n "^# Contexto" "$NOW_FILE" | head -1 | cut -d: -f1)
if [ -n "$CONTEXTO_LINE" ]; then
    KEEP=$((CONTEXTO_LINE - 1))
    head -n "$KEEP" "$NOW_FILE" > "${NOW_FILE}.tmp"
    printf '# Contexto\n\n' >> "${NOW_FILE}.tmp"
    mv "${NOW_FILE}.tmp" "$NOW_FILE"
fi

# A-6: sincronizar project-state.md
bash "${PROJECT_ROOT}/.claude/scripts/task/update-state.sh" || true
