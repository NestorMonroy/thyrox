#!/usr/bin/env bash
# Controles de anulación de check_model_execution_grant: cada mutación retira
# una mitad de juicio sobre una copia del módulo y tiene que tumbar exactamente
# su aserción gemela. Uso: bash annul_execution_grant.sh (desde la raíz de thyrox).
set -u
export PYTHONDONTWRITEBYTECODE=1
run_mutation() {
  local label=$1 old=$2 new=$3 copy
  copy=$(mktemp -d)
  mkdir -p "$copy/verify"
  cp src/verify/check_model_execution_grant.py "$copy/verify/"
  touch "$copy/verify/__init__.py"
  OLD=$old NEW=$new bash bin/replace_literal "$copy/verify/check_model_execution_grant.py" >/dev/null || { echo "$label: la mutación no se aplicó"; return; }
  echo "== $label"
  PYTHONPATH="$copy" python3 tests/verify/test_check_model_execution_grant.py | grep FALLA || echo "  (ninguna falla: el control no discrimina)"
  rm -rf "${copy:?}"
}
run_mutation "sin exigir la unidad materializada" 'BOUNDARY_SYMBOLS = ("ExecutionGrant", "ExecutionUnit")' 'BOUNDARY_SYMBOLS = ("ExecutionGrant",)'
run_mutation "sin saltar comentarios" '        if is_comment(line, shell):
            continue' '        pass'
run_mutation "sin exigir OllamaApi para .chat" 'calls_ollama = not shell and "OllamaApi" in text' 'calls_ollama = not shell'
run_mutation "sin excluir pruebas, dobles y dist" 'return not EXCLUDED_PARTS.intersection(relative)' 'return True'
