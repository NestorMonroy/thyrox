#!/usr/bin/env bash
# verify.sh — gate de no-regresión de las ÉPICAs 44/45/46 (COSMIC).
# Corre N checks ejecutables contra el repo. Sale 1 si algo regresó.
# Uso: bash .thyrox/context/work/2026-06-03-05-13-33-cosmic-calibration-review/track/verify.sh
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
cd "$ROOT" || exit 2
pass=0; fail=0
chk(){ if eval "$2"; then echo "  ✓ $1"; pass=$((pass+1)); else echo "  ✗ FALLA: $1"; fail=$((fail+1)); fi; }

echo "=== 1. Skill cosmic — anatomía ==="
chk "SKILL.md"                    '[ -f .claude/skills/cosmic/SKILL.md ]'
chk "scripts/tally-cfp.py (F-1)"  '[ -f .claude/skills/cosmic/scripts/tally-cfp.py ]'
chk ">=4 references"              '[ $(ls .claude/skills/cosmic/references/*.md | wc -l) -ge 4 ]'
chk "2 assets template"           '[ $(ls .claude/skills/cosmic/assets/*.template | wc -l) -eq 2 ]'
chk "allowed-tools Write Edit (F-2)" 'grep -q "allowed-tools: Read Glob Grep Bash Write Edit" .claude/skills/cosmic/SKILL.md'
chk "regla de cambios (F-3)"      'grep -qi "Dimensionamiento de un CAMBIO" .claude/skills/cosmic/SKILL.md'

echo "=== 2. tally-cfp.py reconcilia ==="
chk "total=675 e invariantes OK"  'python3 .claude/skills/cosmic/scripts/tally-cfp.py --expect 675 docs/requisitos/casos-uso/*-ucs.md >/dev/null 2>&1'

echo "=== 3. 123 UCs formales ==="
chk "123 UCs"                     '[ $(grep -hcE "^## UC-" docs/requisitos/casos-uso/*-ucs.md | paste -sd+ | bc) -eq 123 ]'
chk "123 con criterios aceptación" '[ $(grep -hcE "Criterios de aceptación" docs/requisitos/casos-uso/*-ucs.md | paste -sd+ | bc) -eq 123 ]'

echo "=== 4. Calibración (H-1..H-3) ==="
chk "H-1 INFERRED/SPECULATIVE"    'grep -qi "INFERRED vs SPECULATIVE" .claude/skills/cosmic/references/estimation.md'
chk "H-3 tamaño != esfuerzo"      'grep -qi "Tamaño ≠ esfuerzo" .claude/skills/cosmic/references/calibration.md'
chk "H-2 bandas THYROX (6.16)"    'grep -q "6.16" .claude/skills/cosmic/references/calibration.md'

echo "=== 5. Deuda técnica ==="
chk "TD-044 resuelto"             'grep -A6 "## TD-044" .thyrox/context/technical-debt.md | grep -qi "Resuelto"'
chk "TD-045 (F-4)"                'grep -q "## TD-045" .thyrox/context/technical-debt.md'
chk "TD-046 (F-5)"                'grep -q "## TD-046" .thyrox/context/technical-debt.md'
chk "deep-review.yml con Write"   'grep -q "Write" .thyrox/registry/agents/deep-review.yml'

echo "=== 6. Propagación baseline 675 ==="
chk "ARCHITECTURE 675"            'grep -q "675" ARCHITECTURE.md'
chk "ROADMAP ÉPICAs 44/45/46"     '[ $(grep -cE "^## ÉPICA 4[456]:" ROADMAP.md) -eq 3 ]'
chk "sin 677/378 sueltos en docs" '[ -z "$(grep -rn "677 CFP\|378 CFP" docs/ ARCHITECTURE.md 2>/dev/null | grep -viE "corrección|corregido|→|no 67|no 37|desde 67|desde 37")" ]'

echo ""
echo "RESUMEN: $pass PASS, $fail FALLA"
[ "$fail" -eq 0 ] && { echo "[OK] sin regresiones"; exit 0; } || { echo "[FAIL] hay regresiones"; exit 1; }
