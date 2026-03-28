#!/usr/bin/env bash
# project-status.sh
# Resumen del estado del proyecto en <50 líneas.
# Uso: bash .claude/skills/pm-thyrox/scripts/project-status.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.claude/context"

echo "=== THYROX Project Status ==="
echo ""

# 1. Session state from now.md
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//' || echo "unknown")
    CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/current_work: *//' || echo "none")
    COLD_BOOT=$(grep "^cold_boot:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/cold_boot: *//' || echo "unknown")
    BLOCKERS=$(grep "^blockers:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/blockers: *//' || echo "[]")

    echo "Phase:        $PHASE"
    echo "Work package: $CURRENT_WORK"
    echo "Cold boot:    $COLD_BOOT"
    echo "Blockers:     $BLOCKERS"
else
    echo "⚠️  now.md not found"
fi

echo ""

# 2. Focus summary (first non-YAML, non-header content line)
if [ -f "${CONTEXT_DIR}/focus.md" ]; then
    echo "--- Focus ---"
    # Extract the first paragraph after # Focus header
    sed -n '/^# Focus/,/^##/{/^#/d; /^$/d; /^```/d; /^Tipo:/d; /^Versión:/d; /^Última/d; p;}' "${CONTEXT_DIR}/focus.md" | head -3
fi

echo ""

# 3. Active work package — next incomplete task
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/current_work: *//' || echo "null")
    if [ "$CURRENT_WORK" != "null" ] && [ -n "$CURRENT_WORK" ]; then
        PLAN_FILE="${CONTEXT_DIR}/${CURRENT_WORK}plan.md"
        TASKS_FILE="${CONTEXT_DIR}/${CURRENT_WORK}tasks.md"

        TARGET=""
        [ -f "$PLAN_FILE" ] && TARGET="$PLAN_FILE"
        [ -f "$TASKS_FILE" ] && TARGET="$TASKS_FILE"

        if [ -n "$TARGET" ]; then
            TOTAL=$(grep -c '^\- \[' "$TARGET" 2>/dev/null || echo 0)
            DONE=$(grep -c '^\- \[x\]' "$TARGET" 2>/dev/null || echo 0)
            NEXT=$(grep '^\- \[ \]' "$TARGET" 2>/dev/null | head -1 || echo "none")

            echo "--- Work Package Progress ---"
            echo "Tasks: $DONE/$TOTAL completed"
            echo "Next:  $NEXT"
        fi
    fi
fi

echo ""

# 4. Recent commits (last 5)
echo "--- Recent Commits ---"
git -C "$PROJECT_ROOT" log --oneline -5 2>/dev/null || echo "No git history"

echo ""

# 5. ROADMAP progress summary
if [ -f "${PROJECT_ROOT}/ROADMAP.md" ]; then
    echo "--- ROADMAP ---"
    grep -E '^\s*(FASE|FASE )' "${PROJECT_ROOT}/ROADMAP.md" 2>/dev/null | head -10 || true
fi
