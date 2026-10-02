#!/usr/bin/env bash
# =============================================================================
# test-bg-stdin-source.sh — `start --stdin <archivo>` entrega ese archivo como
# stdin del trabajo
# =============================================================================
# El defecto: un trabajo de `bg.sh` corre en segundo plano sin control de
# trabajos, así que su stdin es /dev/null. `headless-pool` lee sus ítems por
# stdin, y lanzado con `thyrox-bg` rehusó con «no recibio ningun item por
# stdin» (A6, 2026-10-02). Heredar el stdin del llamador no es la corrección:
# el de esta herramienta es un socket del anfitrión que no se cierra, y un
# trabajo que lo leyera esperaría para siempre. La fuente se declara.
#
# Lo que haría fallar a esta suite:
# - que el archivo declarado no llegue al trabajo (caso 1);
# - que sin --stdin el trabajo deje de leer /dev/null (caso 2, el control);
# - que un archivo ausente se acepte y el trabajo lea nada en silencio (caso 3).
# =============================================================================
set -uo pipefail
THYROX_MANAGED_EXECUTION_RUNNER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/doubles/managed-execution-runner"
export THYROX_MANAGED_EXECUTION_RUNNER
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
BG=src/session/bg.sh
passed=0; failed=0
check() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; passed=$((passed+1));
          else echo "  FAIL  $1 — expected [$3] got [$2]"; failed=$((failed+1)); fi; }
contains() { if [[ "$2" == *"$3"* ]]; then echo "  ok    $1"; passed=$((passed+1));
             else echo "  FAIL  $1 — [$2] does not contain [$3]"; failed=$((failed+1)); fi; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# Sin esto la clave por clon del .env gana a la global y la suite escribe en el hogar real.
source src/lib/test_homes.sh; thyrox_isolate_homes "$TMP"
export THYROX_JOBS_DIR="$TMP/jobs"
export THYROX_RUNTIME_DIR="$TMP/runtime"
export THYROX_SESSION_LEDGER_DIR="$THYROX_JOBS_DIR"

log_of() { printf '%s\n' "$1" | gawk -F= '/^LOG=/{print $2}'; }

echo "== 1. --stdin entrega el archivo declarado =="
printf 'alpha\nbeta\n' > "$TMP/items.txt"
output1="$(bash "$BG" start with-source --grace 0 --stdin "$TMP/items.txt" --task TASK-THYROX-0706 --kind test -- cat 2>&1)"; code1=$?
check "arranca con exit 0" "$code1" "0"
bash "$BG" wait with-source > /dev/null 2>&1
contains "el trabajo leyó el archivo" "$(cat "$(log_of "$output1")")" "alpha"

echo "== 2. CONTROL: sin --stdin el trabajo lee /dev/null y termina =="
output2="$(bash "$BG" start without-source --grace 0 --task TASK-THYROX-0706 --kind test -- wc -l 2>&1)"; code2=$?
check "arranca con exit 0" "$code2" "0"
bash "$BG" wait without-source > /dev/null 2>&1
contains "lee cero líneas" "$(cat "$(log_of "$output2")")" "0"

echo "== 3. un archivo ausente se rehúsa antes de lanzar =="
output3="$(bash "$BG" start missing-source --grace 0 --stdin "$TMP/absent.txt" --task TASK-THYROX-0706 --kind test -- cat 2>&1)"; code3=$?
check "rehúsa con exit 2" "$code3" "2"
contains "nombra el archivo" "$output3" "absent.txt"

echo "== 4. --stdin sin valor se rehúsa =="
output4="$(bash "$BG" start empty-source --grace 0 --stdin 2>&1)"; code4=$?
check "rehúsa con exit 2" "$code4" "2"
contains "nombra la bandera" "$output4" "--stdin"

echo "bg --stdin: $passed ok, $failed fallas"
(( failed == 0 ))
