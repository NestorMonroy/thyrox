#!/usr/bin/env bash
# project-status.sh
# Resumen del estado del proyecto en <50 líneas.
# Uso: bash .claude/skills/pm-thyrox/scripts/project-status.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.claude/context"

echo "=== THYROX Project Status ==="
echo ""

# 1. Session state — parallel or single agent
# Estado de agentes activos (paralelo o single)
if ls "${CONTEXT_DIR}"/now-*.md 2>/dev/null | grep -q .; then
    echo "=== Agentes activos ==="
    for f in "${CONTEXT_DIR}"/now-*.md; do
        agent_id=$(basename "$f" .md | sed 's/now-//')
        status=$(grep "^status:" "$f" 2>/dev/null | head -1 | cut -d' ' -f2-)
        work=$(grep "^current_work:" "$f" 2>/dev/null | head -1 | cut -d' ' -f2-)
        echo "  $agent_id: $status — $work"
    done
elif [ -f "${CONTEXT_DIR}/now.md" ]; then
    echo "=== Estado actual (single agent) ==="
    grep -E "^(status|current_work|phase):" "${CONTEXT_DIR}/now.md"
fi

echo ""

# 2. Focus summary (first non-YAML, non-header content line)
if [ -f "${CONTEXT_DIR}/focus.md" ]; then
    echo "--- Focus ---"
    # Extract the first paragraph after # Focus header
    sed -n '/^# Focus/,/^##/{/^#/d; /^$/d; /^```/d; /^type:/d; /^version:/d; /^updated_at:/d; p;}' "${CONTEXT_DIR}/focus.md" | head -3
fi

echo ""

# 3. Active work package — next incomplete task
if [ -f "${CONTEXT_DIR}/now.md" ]; then
    CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/current_work: *//' || echo "null")
    if [ "$CURRENT_WORK" != "null" ] && [ -n "$CURRENT_WORK" ]; then
        WP_DIR="${CONTEXT_DIR}/${CURRENT_WORK}"
        # New naming: *-task-plan.md; legacy fallback: tasks.md / plan.md
        TARGET=$(find "$WP_DIR" -maxdepth 1 -name "*-task-plan.md" 2>/dev/null | head -1)
        [ -z "$TARGET" ] && [ -f "${WP_DIR}tasks.md" ] && TARGET="${WP_DIR}tasks.md"
        [ -z "$TARGET" ] && [ -f "${WP_DIR}plan.md" ] && TARGET="${WP_DIR}plan.md"

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
