#!/usr/bin/env bash
# validate-phase-readiness.sh
# Verifica que los artefactos requeridos existen para avanzar a una fase.
# Retorna exit 0 si ready, exit 1 si falta algo.
#
# Uso:
#   ./validate-phase-readiness.sh <phase-number> [epic-dir]
#   ./validate-phase-readiness.sh 2                          # ¿Listo para Phase 2?
#   ./validate-phase-readiness.sh 5 context/epics/2026-03-28-feature/

set -euo pipefail

PHASE="${1:-}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
EPIC_DIR="${2:-}"

if [ -z "$PHASE" ]; then
    echo "Usage: validate-phase-readiness.sh <phase-number> [epic-dir]"
    echo "Phases: 1=ANALYZE, 2=SOLUTION_STRATEGY, 3=PLAN, 4=STRUCTURE, 5=DECOMPOSE, 6=EXECUTE, 7=TRACK"
    exit 1
fi

# Auto-detect latest epic if not provided
if [ -z "$EPIC_DIR" ]; then
    EPIC_DIR=$(find "$REPO_ROOT/.claude/context/epics" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort -r | head -1)
fi

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
    local desc="$1"
    local path="$2"

    if [ -e "$path" ]; then
        echo -e "  ${GREEN}✓${NC} $desc"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $desc — ${RED}MISSING: $path${NC}"
        FAIL=$((FAIL + 1))
    fi
}

check_content() {
    local desc="$1"
    local path="$2"
    local pattern="$3"

    if [ -e "$path" ] && grep -qi "$pattern" "$path" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $desc"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $desc — ${RED}pattern '$pattern' not found in $path${NC}"
        FAIL=$((FAIL + 1))
    fi
}

PHASE_NAMES=("" "ANALYZE" "SOLUTION_STRATEGY" "PLAN" "STRUCTURE" "DECOMPOSE" "EXECUTE" "TRACK")
echo -e "${BOLD}Checking readiness for Phase $PHASE: ${PHASE_NAMES[$PHASE]}${NC}"
echo -e "Epic dir: ${EPIC_DIR:-none detected}"
echo ""

case "$PHASE" in
    1)
        echo "Phase 1: ANALYZE requires constitution + 8 analysis documents"
        check "constitution.md" "$REPO_ROOT/.claude/context/constitution.md"
        if [ -n "$EPIC_DIR" ]; then
            check "introduction.md" "$EPIC_DIR/introduction.md"
            check "requirements-analysis.md" "$EPIC_DIR/requirements-analysis.md"
            check "use-cases.md" "$EPIC_DIR/use-cases.md"
            check "quality-goals.md" "$EPIC_DIR/quality-goals.md"
            check "stakeholders.md" "$EPIC_DIR/stakeholders.md"
            check "basic-usage.md" "$EPIC_DIR/basic-usage.md"
            check "constraints.md" "$EPIC_DIR/constraints.md"
            check "context.md" "$EPIC_DIR/context.md"
        else
            echo -e "  ${RED}✗${NC} No epic directory found"
            FAIL=$((FAIL + 8))
        fi
        ;;
    2)
        echo "Phase 2: SOLUTION_STRATEGY requires solution-strategy with research"
        if [ -n "$EPIC_DIR" ]; then
            check "solution-strategy.md" "$EPIC_DIR/solution-strategy.md"
            check_content "Research Step documented" "$EPIC_DIR/solution-strategy.md" "research\|alternatives\|unknown"
            check_content "Constitution check done" "$EPIC_DIR/solution-strategy.md" "constitution\|principles"
        else
            echo -e "  ${RED}✗${NC} No epic directory found"
            FAIL=$((FAIL + 3))
        fi
        ;;
    3)
        echo "Phase 3: PLAN requires ROADMAP updated + epic created"
        check "ROADMAP.md" "$REPO_ROOT/ROADMAP.md"
        check_content "ROADMAP has current epic" "$REPO_ROOT/ROADMAP.md" "Epic:"
        if [ -n "$EPIC_DIR" ]; then
            check "Epic directory exists" "$EPIC_DIR"
        else
            echo -e "  ${RED}✗${NC} No epic directory found"
            FAIL=$((FAIL + 1))
        fi
        ;;
    4)
        echo "Phase 4: STRUCTURE requires spec + checklist passed"
        if [ -n "$EPIC_DIR" ]; then
            check "structure.md or epic.md" "$EPIC_DIR/structure.md"
            # Check for [NEEDS CLARIFICATION] in any md file
            NC_COUNT=$(grep -rl "\[NEEDS CLARIFICATION" "$EPIC_DIR"/*.md 2>/dev/null | wc -l || echo 0)
            if [ "$NC_COUNT" -eq 0 ]; then
                echo -e "  ${GREEN}✓${NC} Zero [NEEDS CLARIFICATION] markers"
                PASS=$((PASS + 1))
            else
                echo -e "  ${RED}✗${NC} $NC_COUNT files with [NEEDS CLARIFICATION] markers"
                FAIL=$((FAIL + 1))
            fi
        else
            echo -e "  ${RED}✗${NC} No epic directory found"
            FAIL=$((FAIL + 2))
        fi
        ;;
    5)
        echo "Phase 5: DECOMPOSE requires tasks.md with IDs"
        if [ -n "$EPIC_DIR" ]; then
            check "tasks.md" "$EPIC_DIR/tasks.md"
            check_content "Tasks have IDs" "$EPIC_DIR/tasks.md" "T-\|TASK-\|\[T"
        else
            echo -e "  ${RED}✗${NC} No epic directory found"
            FAIL=$((FAIL + 2))
        fi
        ;;
    6)
        echo "Phase 6: EXECUTE requires tasks completed"
        if [ -n "$EPIC_DIR" ] && [ -e "$EPIC_DIR/tasks.md" ]; then
            TOTAL=$(grep -c "^\- \[" "$EPIC_DIR/tasks.md" 2>/dev/null || echo 0)
            DONE=$(grep -c "^\- \[x\]" "$EPIC_DIR/tasks.md" 2>/dev/null || echo 0)
            if [ "$TOTAL" -gt 0 ] && [ "$TOTAL" -eq "$DONE" ]; then
                echo -e "  ${GREEN}✓${NC} All tasks complete ($DONE/$TOTAL)"
                PASS=$((PASS + 1))
            else
                echo -e "  ${RED}✗${NC} Tasks incomplete ($DONE/$TOTAL)"
                FAIL=$((FAIL + 1))
            fi
        else
            echo -e "  ${RED}✗${NC} No tasks.md found"
            FAIL=$((FAIL + 1))
        fi
        check_content "ROADMAP updated" "$REPO_ROOT/ROADMAP.md" "\[x\]"
        ;;
    7)
        echo "Phase 7: TRACK requires ROADMAP + CHANGELOG updated"
        check "ROADMAP.md" "$REPO_ROOT/ROADMAP.md"
        check "CHANGELOG.md" "$REPO_ROOT/CHANGELOG.md"
        check_content "CHANGELOG has current version" "$REPO_ROOT/CHANGELOG.md" "0\.\|1\.\|2\."
        ;;
    *)
        echo "Invalid phase: $PHASE (use 1-7)"
        exit 1
        ;;
esac

echo ""
echo -e "${BOLD}Result: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}PASS: Ready for Phase $PHASE${NC}"
    exit 0
else
    echo -e "${RED}FAIL: Not ready for Phase $PHASE — $FAIL items missing${NC}"
    exit 1
fi
