#!/usr/bin/env bash
# validate-session-close.sh — Valida artefactos de WP antes de cerrar sesión
# TD-001: detecta timestamps incompletos (created_at sin hora)
# Uso: bash .claude/scripts/validate-session-close.sh
# Exit 0 → todo OK | Exit 1 → hay problemas (no bloquea Stop hook)

ERRORS=0

# TD-001: detectar created_at con fecha sin hora (YYYY-MM-DD sin HH:MM:SS)
if [ -d ".claude/context/work" ]; then
  INCOMPLETE=$(grep -rlE "^created_at: [0-9]{4}-[0-9]{2}-[0-9]{2}$" .claude/context/work/ 2>/dev/null)
  if [ -n "$INCOMPLETE" ]; then
    echo "⚠ TD-001: timestamps incompletos encontrados (fecha sin hora):"
    echo "$INCOMPLETE" | sed 's/^/  /'
    echo "  Corregir: created_at: YYYY-MM-DD → created_at: YYYY-MM-DD HH:MM:SS"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ "$ERRORS" -eq 0 ]; then
  echo "✓ validate-session-close: sin problemas detectados"
fi

exit 0  # Nunca bloquear Stop hook
