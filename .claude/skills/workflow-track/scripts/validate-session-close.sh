#!/usr/bin/env bash
# validate-session-close.sh
# Validar que la sesión se cierra con estado actualizado.
# Uso: bash .claude/skills/thyrox/scripts/validate-session-close.sh
#
# Checks (soft warns):
#   1. focus.md actualizado hoy
#   2. now.md tiene campo phase
#   3. Work package activo tiene commits recientes

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.thyrox/context"
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
            RECENT_COMMITS=$(git -C "$PROJECT_ROOT" log --oneline --since="$TODAY" -- ".thyrox/context/${CURRENT_WORK}" 2>/dev/null | wc -l)
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

# 5. Timestamps en artefactos WP — verificar placeholders sin resolver (TD-018)
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" | head -1 | sed 's/current_work: *//' || echo "null")
    if [ "$CURRENT_WORK" != "null" ] && [ -n "$CURRENT_WORK" ]; then
        WORK_PATH="${CONTEXT_DIR}/${CURRENT_WORK}"
        if [ -d "$WORK_PATH" ]; then
            # Buscar placeholders de timestamp sin resolver en artefactos WP
            PLACEHOLDER_FILES=$(grep -rl "\[YYYY-MM-DD" "$WORK_PATH" 2>/dev/null | head -5 || true)
            if [ -n "$PLACEHOLDER_FILES" ]; then
                warn "Artefactos WP con timestamps sin resolver (TD-018): $PLACEHOLDER_FILES"
            else
                pass "Artefactos WP sin placeholders de timestamp"
            fi
        fi
    fi
fi

# 6. PAT-004: checkboxes T-NNN sincronizados con commits del WP (TD-042)
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" | head -1 | sed 's/current_work: *//' || echo "null")
    if [ "$CURRENT_WORK" != "null" ] && [ -n "$CURRENT_WORK" ]; then
        WORK_PATH="${CONTEXT_DIR}/${CURRENT_WORK}"
        if [ -d "$WORK_PATH" ]; then
            # Buscar task-plan en plan-execution/
            TASK_PLAN=$(find "$WORK_PATH/plan-execution" -name "*task-plan*.md" 2>/dev/null | head -1 || true)
            if [ -n "$TASK_PLAN" ]; then
                # T-NNN marcados [x] en el task-plan
                CHECKED_TASKS=$(grep -oP '\[x\] \K(T-[0-9]+)' "$TASK_PLAN" 2>/dev/null || true)
                PAT004_WARNS=0
                for TASK_ID in $CHECKED_TASKS; do
                    # Verificar que existe al menos un commit que menciona ese T-NNN
                    COMMIT_COUNT=$(git -C "$PROJECT_ROOT" log --oneline --all -- ".thyrox/context/${CURRENT_WORK}" 2>/dev/null | grep -c "$TASK_ID" || true)
                    if [ "$COMMIT_COUNT" -eq 0 ]; then
                        echo "  [WARN]  PAT-004: $TASK_ID marcado [x] sin commit correspondiente en el WP"
                        PAT004_WARNS=$((PAT004_WARNS + 1))
                        WARNS=$((WARNS + 1))
                    fi
                done
                if [ "$PAT004_WARNS" -eq 0 ]; then
                    pass "PAT-004: checkboxes T-NNN sincronizados con commits del WP"
                fi
            else
                pass "PAT-004: no hay task-plan en plan-execution/ (skip)"
            fi
        fi
    fi
fi

# 7. I-001: WP con plan-execution/ debe tener discover/ (I-001)
WORK_BASE="${CONTEXT_DIR}/work"
if [ -d "$WORK_BASE" ]; then
    for WP_DIR in "$WORK_BASE"/*/; do
        WP_NAME=$(basename "$WP_DIR")
        if [ -d "${WP_DIR}plan-execution" ] && [ ! -d "${WP_DIR}discover" ]; then
            echo "  [WARN]  WP ${WP_NAME}: task-plan sin DISCOVER — viola I-001"
            WARNS=$((WARNS + 1))
        fi
    done
    pass "I-001: verificación discover/ completada para todos los WPs"
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
