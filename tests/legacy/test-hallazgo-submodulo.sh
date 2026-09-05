#!/bin/bash
# =============================================================================
# test-hallazgo-submodulo.sh — prueba del gate y del hook de submódulo
# =============================================================================
#
# El control positivo es **real del repo**, no fabricado: se toma la primera
# ruta del baseline heredado —un hallazgo que de verdad vive fuera de su
# submódulo— y se comprueba que el gate la ve al sacarla del baseline. Un
# incumplidor escrito a mano por quien escribió el patrón hereda su encuadre y
# confirma el instrumento en vez de probarlo (``hallazgo-abierto-genera-sucesor.md``).
#
# Uso:  bash .claude/scripts/tests/test-hallazgo-submodulo.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
SUT="$SCRIPT_DIR/gates/check_hallazgo_submodulo.py"
HOOK="$REPO/.claude/hooks/inject_hallazgo_submodulo.py"
BASE="$SCRIPT_DIR/hallazgo_submodulo_baseline.txt"

cd "$REPO" || exit 1

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

echo "== gate: el árbol con su baseline está limpio =="
python3 "$SUT" --strict >/dev/null 2>&1
check "exit 0 con el baseline vigente" "0" "$?"
check "--quiet imprime 0" "0" "$(python3 "$SUT" --quiet 2>/dev/null | tail -1)"

echo "== gate: control positivo REAL — sacar una ruta del baseline la destapa =="
VICTIMA="$(grep -v '^#' "$BASE" | head -1)"
if [[ -z "$VICTIMA" ]]; then
  echo "  (baseline vacío: sin deuda heredada que usar como control positivo)"
else
  TMP="$(mktemp)"; cp "$BASE" "$TMP"
  grep -vxF "$VICTIMA" "$TMP" > "$BASE"
  python3 "$SUT" --strict >/dev/null 2>&1
  check "exit 1 con la ruta real fuera del baseline" "1" "$?"
  check "--quiet la cuenta" "1" "$(python3 "$SUT" --quiet 2>/dev/null | tail -1)"
  check "el reporte la nombra" "1" \
        "$(python3 "$SUT" 2>/dev/null | grep -cF "$VICTIMA")"
  cp "$TMP" "$BASE"; rm -f "$TMP"
  python3 "$SUT" --strict >/dev/null 2>&1
  check "el baseline restaurado vuelve a exit 0" "0" "$?"
fi

echo "== gate: publica su denominador =="
check "el reporte declara el alcance medido" "1" \
      "$(python3 "$SUT" 2>/dev/null | grep -c 'alcance medido')"

echo "== hook: el caso real que lo originó (H-DOCS bajo pm/api) =="
AVISO="$(printf '{"tool_input":{"file_path":"source/gestion/pm/api/iniciativas/completar-familia-base/hallazgos/hallazgo-H-DOCS-226-x.rst"}}' \
  | python3 "$HOOK" 2>/dev/null)"
check "inyecta additionalContext" "1" "$(printf '%s' "$AVISO" | grep -c additionalContext)"
check "nombra el submódulo de destino" "1" "$(printf '%s' "$AVISO" | grep -c 'pm/docs/iniciativas')"

echo "== hook: silencioso donde no aplica, y nunca rompe =="
check "hallazgo coincidente → {}" "{}" \
  "$(printf '{"tool_input":{"file_path":"source/gestion/pm/api/iniciativas/completar-familia-base/hallazgos/hallazgo-H-API-677-x.rst"}}' | python3 "$HOOK" 2>/dev/null)"
check "archivo que no es hallazgo → {}" "{}" \
  "$(printf '{"tool_input":{"file_path":"source/base-cognitiva/glosario.rst"}}' | python3 "$HOOK" 2>/dev/null)"
check "stdin vacío → {}" "{}" "$(printf '' | python3 "$HOOK" 2>/dev/null)"
printf '' | python3 "$HOOK" >/dev/null 2>&1
check "stdin vacío → exit 0" "0" "$?"

printf '\n%d ok · %d falla(s)\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]]
