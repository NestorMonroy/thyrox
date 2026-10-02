#!/usr/bin/env bash
# =============================================================================
# test-model-coordinator-entry.sh — el coordinador del anfitrión tiene una
# entrada declarada del plano de control (TASK-THYROX-0910)
# =============================================================================
# Casos:
#   1. `bin/model_coordinator` es una entrada declarada del plano de control;
#   2. `start` sin coordinador lo lanza por `thyrox-bg` (queda en el ledger),
#      con origen `service`, y espera el socket canónico de
#      `model-scheduling-socket-path`;
#   3. un segundo `start` con el coordinador vivo no lanza otro daemon;
#   4. `status` sale 0 con el coordinador vivo;
#   5. `stop` lo detiene: el socket desaparece y `status` deja de salir 0.
# Control de anulación: sin la comprobación de vida en `start`, cae el caso 3.
# =============================================================================
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
ROOT="$PWD"
ok=0; failures=0
check() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — esperado [$3] obtenido [$2]"; failures=$((failures+1)); fi; }

TMP="$(mktemp -d)"
cleanup() { bash "$ROOT/bin/model_coordinator" stop >/dev/null 2>&1; rm -rf "${TMP:?}"; }
trap cleanup EXIT
source "$ROOT/src/lib/test_homes.sh"; thyrox_isolate_homes "$TMP/homes"
export MODEL_COORDINATOR_DOUBLE_DIR="$TMP/double"; mkdir -p "$MODEL_COORDINATOR_DOUBLE_DIR"
export THYROX_MODEL_COORDINATOR_SOCKET="$TMP/coordinator.sock"
export THYROX_MODEL_COORDINATOR_DAEMON="$ROOT/tests/session/doubles/model-coordinator-daemon"

source "$ROOT/src/lib/managed_execution.sh"
thyrox_control_plane_entry "$ROOT/bin/model_coordinator"; check "1 es entrada declarada del plano de control" "$?" "0"

canonical="$(bash "$ROOT/bin/model-scheduling-socket-path")"
output="$(bash "$ROOT/bin/model_coordinator" start 2>&1)"; rc=$?
check "2 start sale 0" "$rc" "0"
check "2 imprime el socket canónico" "$(tail -1 <<<"$output")" "$canonical"
check "2 el socket acepta conexiones" "$(python3 -c 'import socket,sys; s=socket.socket(socket.AF_UNIX); s.connect(sys.argv[1]); print("vivo")' "$canonical" 2>/dev/null)" "vivo"
check "2 el daemon corre con origen service" "$(grep -c '^run --origin service' "$MODEL_COORDINATOR_DOUBLE_DIR/calls")" "1"
check "2 el trabajo está en el ledger de thyrox-bg" "$(bash "$ROOT/bin/thyrox-bg" status model-coordinator 2>/dev/null)" "running"

bash "$ROOT/bin/model_coordinator" start >/dev/null 2>&1; rc=$?
check "3 un segundo start sale 0" "$rc" "0"
check "3 no lanza un segundo daemon" "$(grep -c '^run ' "$MODEL_COORDINATOR_DOUBLE_DIR/calls")" "1"

bash "$ROOT/bin/model_coordinator" status >/dev/null 2>&1; check "4 status vivo sale 0" "$?" "0"

bash "$ROOT/bin/model_coordinator" stop >/dev/null 2>&1; check "5 stop sale 0" "$?" "0"
for _ in $(seq 50); do [[ -S "$canonical" ]] || break; sleep 0.1; done
check "5 el socket desaparece" "$([[ -S "$canonical" ]] && echo sigue || echo retirado)" "retirado"
bash "$ROOT/bin/model_coordinator" status >/dev/null 2>&1; check "5 status detenido no sale 0" "$([[ $? -ne 0 ]] && echo detenido || echo vivo)" "detenido"
bash "$ROOT/bin/thyrox-bg" wait model-coordinator >/dev/null 2>&1

echo "model_coordinator: $ok ok, $failures fallas"
[[ $failures -eq 0 ]]
