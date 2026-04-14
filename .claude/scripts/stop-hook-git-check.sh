#!/usr/bin/env bash
# stop-hook-git-check.sh — Hook Stop: verifica cambios sin commitear
# Input: JSON via stdin { "stop_hook_active": bool, ... }
# Output: recordatorio si hay cambios sin commitear
# Siempre exit 0 (nunca bloquear)

INPUT=$(cat)

# Parsear stop_hook_active con python3 (DA-001)
STOP_HOOK_ACTIVE="false"
if command -v python3 &>/dev/null; then
    STOP_HOOK_ACTIVE=$(echo "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print('true' if d.get('stop_hook_active', False) else 'false')
except Exception:
    print('false')
" 2>/dev/null || echo "false")
else
    # Fallback: grep
    if echo "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
        STOP_HOOK_ACTIVE="true"
    fi
fi

# Si stop_hook_active=true → salir silenciosamente (previene loop)
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    exit 0
fi

# Verificar cambios sin commitear
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "⚠ Hay cambios sin commitear. Considera hacer commit antes de cerrar."
fi

# TD-001: validar artefactos de WP (timestamps, etc.)
if [ -f ".claude/scripts/validate-session-close.sh" ]; then
    bash .claude/scripts/validate-session-close.sh
fi

exit 0
