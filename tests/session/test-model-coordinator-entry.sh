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
#   4. `status` mide la salud por el protocolo del coordinador (`list`): sale 0
#      con el coordinador sano y publica sus tickets; un socket que acepta pero
#      no habla el protocolo sale 1;
#   5. `stop` no detiene nada si el daemon aloja trabajos o el coordinador
#      tiene tickets vivos: rehúsa con 4 y los nombra;
#   6. `stop` sin trabajos ni tickets lo detiene y no vuelve hasta que el
#      daemon terminó —el coordinador retira sus unidades después de cerrar el
#      socket—: el socket desaparece y `status` deja de salir 0.
# Controles de anulación: sin la comprobación de vida en `start` cae el caso
# 3; con `status` midiendo sólo que el socket acepta, cae el caso 4 de un
# socket mudo; sin las guardas de `stop`, caen los dos rechazos del caso 5.
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

output="$(bash "$ROOT/bin/model_coordinator" status 2>&1)"; rc=$?
check "4 status sano sale 0" "$rc" "0"
check "4 publica los tickets del protocolo" "$(grep -c "tickets=0" <<<"$output")" "1"
touch "$MODEL_COORDINATOR_DOUBLE_DIR/mute"
bash "$ROOT/bin/model_coordinator" status >/dev/null 2>&1; check "4 un socket que no habla el protocolo sale 1" "$?" "1"
rm -f "$MODEL_COORDINATOR_DOUBLE_DIR/mute"

echo '[{"short":"job-a"}]' > "$MODEL_COORDINATOR_DOUBLE_DIR/jobs.json"
output="$(bash "$ROOT/bin/model_coordinator" stop 2>&1)"; rc=$?
check "5 con trabajos en el daemon stop rehúsa con 4" "$rc" "4"
check "5 y el coordinador sigue sano" "$(bash "$ROOT/bin/model_coordinator" status >/dev/null 2>&1; echo $?)" "0"
rm -f "$MODEL_COORDINATOR_DOUBLE_DIR/jobs.json"
echo '[{"admissionId":"a-1"}]' > "$MODEL_COORDINATOR_DOUBLE_DIR/tickets.json"
bash "$ROOT/bin/model_coordinator" stop >/dev/null 2>&1; check "5 con tickets vivos stop rehúsa con 4" "$?" "4"
rm -f "$MODEL_COORDINATOR_DOUBLE_DIR/tickets.json"

bash "$ROOT/bin/model_coordinator" stop >/dev/null 2>&1; check "6 stop sale 0" "$?" "0"
check "6 al volver stop, el daemon ya terminó (su barrido incluido)" "$(bash "$ROOT/bin/thyrox-bg" status model-coordinator 2>/dev/null)" "done:0"
for _ in $(seq 50); do [[ -S "$canonical" ]] || break; sleep 0.1; done
check "6 el socket desaparece" "$([[ -S "$canonical" ]] && echo sigue || echo retirado)" "retirado"
bash "$ROOT/bin/model_coordinator" status >/dev/null 2>&1; check "6 status detenido no sale 0" "$([[ $? -ne 0 ]] && echo detenido || echo vivo)" "detenido"
bash "$ROOT/bin/thyrox-bg" wait model-coordinator >/dev/null 2>&1

echo "model_coordinator: $ok ok, $failures fallas"
[[ $failures -eq 0 ]]
