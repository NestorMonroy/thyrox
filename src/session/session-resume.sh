#!/usr/bin/env bash
# session-resume.sh — Hook PostCompact: re-inyecta contexto del WP activo
# Input: JSON via stdin { "hook_event_name": "PostCompact", "compact_summary": string }
# Output: contexto WP si compact_summary no lo menciona | nada
# Siempre exit 0 (nunca bloquear)
# DA-002: duplica mínima lógica de detección de WP (no hacer source de session-start.sh)

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
CONTEXT_DIR="${PROJECT_ROOT}/.thyrox/context"

INPUT=$(cat)

# Extraer compact_summary con python3 (DA-001 patrón consistente)
COMPACT_SUMMARY=""
PARSE_FAILED=false
if command -v python3 &>/dev/null; then
    COMPACT_SUMMARY=$(echo "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('compact_summary', ''))
except Exception:
    sys.exit(1)
" 2>/dev/null)
    [ $? -ne 0 ] && PARSE_FAILED=true
else
    # Fallback grep — permissive: si no se puede parsear, re-inyectar siempre
    PARSE_FAILED=true
fi

# Detectar work package activo (lógica duplicada de session-start.sh — DA-002)
ACTIVE_WP=""
PHASE=""

if [ -f "${CONTEXT_DIR}/now.md" ]; then
    PHASE=$(grep "^stage:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/stage: *//')
    [ -z "$PHASE" ] && PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//')
    if [ "$PHASE" != "complete" ] && [ -n "$PHASE" ]; then
        CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/current_work: *//')
        if [ -n "$CURRENT_WORK" ] && [ "$CURRENT_WORK" != "null" ]; then
            ACTIVE_WP=$(basename "$CURRENT_WORK")
        fi
    fi
fi

# Sin WP activo → salir silenciosamente
if [ -z "$ACTIVE_WP" ]; then
    exit 0
fi

# Si compact_summary menciona el WP → no duplicar contexto
if [ "$PARSE_FAILED" = "false" ] && echo "$COMPACT_SUMMARY" | grep -qF "$ACTIVE_WP"; then
    exit 0
fi

# Re-inyectar contexto del WP activo
echo ""
echo "=== CONTEXTO RESTAURADO POST-COMPACTACIÓN ==="
echo ""
echo "  Work package activo: context/work/${ACTIVE_WP}/"
[ -n "$PHASE" ] && echo "  Fase actual: ${PHASE}"

# Próxima tarea pendiente
WP_DIR="${CONTEXT_DIR}/work/${ACTIVE_WP}"
TASK_PLAN=$(find "$WP_DIR" -maxdepth 2 -name "*-task-plan.md" 2>/dev/null | head -1)
[ -z "$TASK_PLAN" ] && [ -f "${WP_DIR}/plan.md" ] && TASK_PLAN="${WP_DIR}/plan.md"
if [ -n "$TASK_PLAN" ]; then
    NEXT=$(grep -m1 "^\- \[ \]" "$TASK_PLAN" 2>/dev/null | sed 's/- \[ \] //')
    [ -n "$NEXT" ] && echo "  Próxima tarea: ${NEXT}"
fi

echo ""
echo "  Continúa con el work package activo. Activa thyrox SKILL si es necesario."
echo ""
echo "=============================================="
echo ""

exit 0
