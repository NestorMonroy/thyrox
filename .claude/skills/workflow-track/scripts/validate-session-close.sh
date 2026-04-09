#!/usr/bin/env bash
# validate-session-close.sh
# Validar que la sesión se cierra con estado actualizado.
# Uso: bash .claude/skills/pm-thyrox/scripts/validate-session-close.sh
#
# Checks (soft warns):
#   1. focus.md actualizado hoy
#   2. now.md tiene campo phase
#   3. Work package activo tiene commits recientes

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.claude/context"
TODAY=$(date +%Y-%m-%d)

WARNS=0
PASSES=0

warn() {
    echo "  [WARN]  $1"
    WARNS=$((WARNS + 1))
}

pass() {
    echo "  [OK] $1"
    PASSES=$((PASSES + 1))
}

echo "=== Validación de Cierre de Sesión ==="
echo ""

# 1. focus.md actualizado hoy
if [ -f "${CONTEXT_DIR}/focus.md" ]; then
    if grep -q "$TODAY" "${CONTEXT_DIR}/focus.md"; then
        pass "focus.md actualizado hoy ($TODAY)"
    else
        warn "focus.md NO actualizado hoy — actualizar antes de cerrar"
    fi
else
    warn "focus.md no existe"
fi

# 2. now.md tiene campo phase
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    if grep -q "^phase:" "${CONTEXT_DIR}/now.md"; then
        PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" | head -1 | sed 's/phase: *//')
        pass "now.md tiene phase: $PHASE"
    else
        warn "now.md sin campo 'phase:'"
    fi
else
    warn "now.md no existe"
fi

# 3. now.md no tiene timestamps sin resolver
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    if grep -q "\[YYYY-MM-DD-HH-MM-SS\]" "${CONTEXT_DIR}/now.md"; then
        warn "now.md contiene placeholder literal [YYYY-MM-DD-HH-MM-SS] sin resolver — reemplazar con timestamp real"
    else
        pass "now.md sin placeholders de timestamp"
    fi
fi

# 4. Work package activo tiene commits recientes
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" | head -1 | sed 's/current_work: *//' || echo "null")
    if [ "$CURRENT_WORK" != "null" ] && [ -n "$CURRENT_WORK" ]; then
        WORK_PATH="${CONTEXT_DIR}/${CURRENT_WORK}"
        if [ -d "$WORK_PATH" ]; then
            # Check if there are commits today touching this work package
            RECENT_COMMITS=$(git -C "$PROJECT_ROOT" log --oneline --since="$TODAY" -- ".claude/context/${CURRENT_WORK}" 2>/dev/null | wc -l)
            if [ "$RECENT_COMMITS" -gt 0 ]; then
                pass "Work package activo tiene $RECENT_COMMITS commits hoy"
            else
                warn "Work package activo ($CURRENT_WORK) sin commits hoy"
            fi
        else
            warn "Work package activo no existe: $CURRENT_WORK"
        fi
    else
        pass "No hay work package activo (OK si no hay trabajo en curso)"
    fi
fi

# Summary
echo ""
echo "=== Resultado ==="
echo "  Passed: $PASSES"
echo "  Warns:  $WARNS"

if [ "$WARNS" -gt 0 ]; then
    echo ""
    echo "  Recomendación: actualizar focus.md + now.md antes de cerrar sesión"
    exit 1
else
    echo "  Sesión lista para cerrar."
    exit 0
fi
