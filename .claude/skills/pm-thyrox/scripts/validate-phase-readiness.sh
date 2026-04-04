#!/usr/bin/env bash
# validate-phase-readiness.sh
# Verifica que los artefactos requeridos existen para avanzar a una fase.
# Retorna exit 0 si ready, exit 1 si falta algo.
#
# Uso:
#   ./validate-phase-readiness.sh <phase-number> [wp-dir]
#   ./validate-phase-readiness.sh 2                          # ¿Listo para Phase 2?
#   ./validate-phase-readiness.sh 5 context/work/2026-04-01-18-39-56-mi-feature/

set -euo pipefail

PHASE="${1:-}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
WP_DIR="${2:-}"

if [ -z "$PHASE" ]; then
    echo "Usage: validate-phase-readiness.sh <phase-number> [wp-dir]"
    echo "Phases: 1=ANALYZE, 2=SOLUTION_STRATEGY, 3=PLAN, 4=STRUCTURE, 5=DECOMPOSE, 6=EXECUTE, 7=TRACK"
    exit 1
fi

# Auto-detect latest work package if not provided
if [ -z "$WP_DIR" ]; then
    WP_DIR=$(find "$REPO_ROOT/.claude/context/work" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort -r | head -1)
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

check_glob() {
    local desc="$1"
    local dir="$2"
    local pattern="$3"

    local match
    match=$(find "$dir" -maxdepth 1 -name "$pattern" 2>/dev/null | head -1)
    if [ -n "$match" ]; then
        echo -e "  ${GREEN}✓${NC} $desc ($match)"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $desc — ${RED}no file matching '$pattern' in $dir${NC}"
        FAIL=$((FAIL + 1))
    fi
}

check_no_pattern() {
    local desc="$1"
    local dir="$2"
    local pattern="$3"

    if grep -qlr "$pattern" "$dir" 2>/dev/null; then
        local count
        count=$(grep -rl "$pattern" "$dir" 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  ${RED}✗${NC} $desc — ${RED}$count files with '$pattern'${NC}"
        FAIL=$((FAIL + 1))
    else
        echo -e "  ${GREEN}✓${NC} $desc"
        PASS=$((PASS + 1))
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
echo -e "Work package: ${WP_DIR:-none detected}"
echo ""

case "$PHASE" in
    1)
        echo "Phase 1: ANALYZE — analysis document + risk register"
        if [ -n "$WP_DIR" ]; then
            check_glob "*-analysis.md" "$WP_DIR/analysis" "*-analysis.md"
            check_glob "*-risk-register.md" "$WP_DIR" "*-risk-register.md"
            if [ -d "$WP_DIR/analysis" ]; then
                check_no_pattern "No [NEEDS CLARIFICATION] in analysis" "$WP_DIR/analysis" "\[NEEDS CLARIFICATION\]"
            fi
        else
            echo -e "  ${RED}✗${NC} No work package directory found in context/work/"
            FAIL=$((FAIL + 3))
        fi
        ;;
    2)
        echo "Phase 2: SOLUTION_STRATEGY — solution strategy with research"
        if [ -n "$WP_DIR" ]; then
            check_glob "*-solution-strategy.md" "$WP_DIR" "*-solution-strategy.md"
            local_file=$(find "$WP_DIR" -maxdepth 1 -name "*-solution-strategy.md" 2>/dev/null | head -1)
            if [ -n "$local_file" ]; then
                check_content "Research documented" "$local_file" "research\|alternatives\|unknown\|alternativ"
                check_content "Decisions documented" "$local_file" "decision\|Decision"
            fi
        else
            echo -e "  ${RED}✗${NC} No work package directory found"
            FAIL=$((FAIL + 3))
        fi
        ;;
    3)
        echo "Phase 3: PLAN — plan.md con scope aprobado + ROADMAP actualizado"
        check "ROADMAP.md" "$REPO_ROOT/ROADMAP.md"
        if [ -n "$WP_DIR" ]; then
            WP_NAME=$(basename "$WP_DIR")
            check_content "ROADMAP references work package" "$REPO_ROOT/ROADMAP.md" "$WP_NAME"
            check_glob "*-plan.md exists" "$WP_DIR" "*-plan.md"
            local_plan=$(find "$WP_DIR" -maxdepth 1 -name "*-plan.md" 2>/dev/null | head -1)
            if [ -n "$local_plan" ]; then
                check_content "Scope aprobado [x] en plan.md" "$local_plan" "\[x\].*[Aa]probado\|[Aa]probado.*[0-9]\{4\}"
            fi
        else
            echo -e "  ${RED}✗${NC} No work package directory found"
            FAIL=$((FAIL + 3))
        fi
        ;;
    4)
        echo "Phase 4: STRUCTURE — requirements spec without [NEEDS CLARIFICATION]"
        if [ -n "$WP_DIR" ]; then
            check_glob "*-requirements-spec.md" "$WP_DIR" "*-requirements-spec.md"
            check_no_pattern "No [NEEDS CLARIFICATION] markers" "$WP_DIR" "\[NEEDS CLARIFICATION\]"
        else
            echo -e "  ${RED}✗${NC} No work package directory found"
            FAIL=$((FAIL + 2))
        fi
        ;;
    5)
        echo "Phase 5: DECOMPOSE — task plan with IDs and checkboxes"
        if [ -n "$WP_DIR" ]; then
            check_glob "*-task-plan.md" "$WP_DIR" "*-task-plan.md"
            local_file=$(find "$WP_DIR" -maxdepth 1 -name "*-task-plan.md" 2>/dev/null | head -1)
            if [ -n "$local_file" ]; then
                check_content "Tasks have IDs [T-NNN]" "$local_file" "\[T-[0-9]"
                check_content "Tasks have checkboxes" "$local_file" "^\- \["
            fi
        else
            echo -e "  ${RED}✗${NC} No work package directory found"
            FAIL=$((FAIL + 3))
        fi
        ;;
    6)
        echo "Phase 6: EXECUTE — all tasks completed"
        if [ -n "$WP_DIR" ]; then
            local_file=$(find "$WP_DIR" -maxdepth 1 -name "*-task-plan.md" 2>/dev/null | head -1)
            if [ -n "$local_file" ]; then
                TOTAL=$(grep -c '^\- \[' "$local_file" 2>/dev/null || echo 0)
                DONE=$(grep -c '^\- \[x\]' "$local_file" 2>/dev/null || echo 0)
                if [ "$TOTAL" -gt 0 ] && [ "$TOTAL" -eq "$DONE" ]; then
                    echo -e "  ${GREEN}✓${NC} All tasks complete ($DONE/$TOTAL)"
                    PASS=$((PASS + 1))
                else
                    echo -e "  ${RED}✗${NC} Tasks incomplete ($DONE/$TOTAL)"
                    FAIL=$((FAIL + 1))
                fi
            else
                echo -e "  ${RED}✗${NC} No *-task-plan.md found in $WP_DIR"
                FAIL=$((FAIL + 1))
            fi
        else
            echo -e "  ${RED}✗${NC} No work package directory found"
            FAIL=$((FAIL + 1))
        fi
        check_content "ROADMAP has completed tasks" "$REPO_ROOT/ROADMAP.md" "\[x\]"
        ;;
    7)
        echo "Phase 7: TRACK — lessons learned + changelog"
        if [ -n "$WP_DIR" ]; then
            check_glob "*-lessons-learned.md" "$WP_DIR" "*-lessons-learned.md"
        else
            echo -e "  ${RED}✗${NC} No work package directory found"
            FAIL=$((FAIL + 1))
        fi
        check "CHANGELOG.md" "$REPO_ROOT/CHANGELOG.md"
        check_content "CHANGELOG has version entry" "$REPO_ROOT/CHANGELOG.md" "## \[0\.\|## \[1\.\|## \[2\."
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
