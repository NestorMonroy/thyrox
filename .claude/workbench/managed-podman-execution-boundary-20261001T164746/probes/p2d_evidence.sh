#!/usr/bin/env bash
# Evidencia de p2d sobre el cambio ya escrito: RED (la medición del verificador contra la base),
# GREEN (las pruebas cambiadas sobre el árbol) y dos anulaciones, una por mitad del cambio:
# sin el --env de bg.sh y sin el valor por defecto de managed_execution.sh. Cada anulación
# restaura el archivo al terminar.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root=/home/user/thyrox; cd "$root" || exit 2
out="$wb/outputs"
cp "$out/p2d-red-verified.log" "$out/p2d-red.log"
run_tests() {
  echo "== tests/session/test-bg-managed-execution.sh"; bash tests/session/test-bg-managed-execution.sh 2>&1 | tail -15; echo "exit=${PIPESTATUS[0]}"
  echo "== test_manifest_identity.py"; uv run --frozen --no-sync python "$wb/tests/test_manifest_identity.py" 2>&1 | tail -8; echo "exit=${PIPESTATUS[0]}"
}
run_tests > "$out/p2d-green.log" 2>&1
annul() {
  local file="$1" pattern="$2" label="$3"
  cp "$file" "$file.p2d-annulment"
  grep -v -F "$pattern" "$file.p2d-annulment" > "$file"
  echo "== anulación: $label"
  run_tests
  mv "$file.p2d-annulment" "$file"
}
{
  annul src/session/bg.sh 'environment+=("THYROX_EXECUTION_ENTRY")' 'bg.sh no pasa THYROX_EXECUTION_ENTRY como --env'
  annul src/lib/managed_execution.sh 'export THYROX_EXECUTION_ENTRY=' 'managed_execution.sh sin valor por defecto'
} > "$out/p2d-annulment.log" 2>&1
git diff --quiet -- src/session/bg.sh src/lib/managed_execution.sh && echo "RESTORE CHECK: unexpected clean" || echo "restored (P2d diff still present)"
echo "EVIDENCE EXIT=0"
