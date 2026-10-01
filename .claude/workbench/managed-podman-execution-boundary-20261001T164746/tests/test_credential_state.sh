#!/usr/bin/env bash
# Separa los tres estados de una credencial; la deuda de rotación no la vuelve inutilizable.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
probe="${CREDENTIAL_STATE_PROBE:-$here/probes/credential_state.sh}"
total=0 failures=0
check() { total=$((total + 1)); if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FALLA $1: «$2» != «$3»"; failures=$((failures + 1)); fi; }
check "pendiente de rotación + presente + auth aceptada => usable" "$(bash "$probe" yes pending success)" "pending_rotation usable=yes warning=rotation_pending"
check "sin deuda + presente + auth aceptada => activa" "$(bash "$probe" yes none success)" "active usable=yes"
check "ausente => no_candidate (unavailable)" "$(bash "$probe" no pending untested)" "unavailable reason=missing"
check "revocada => unavailable" "$(bash "$probe" yes revoked success)" "unavailable reason=revoked"
check "auth rechazada => unavailable" "$(bash "$probe" yes pending failed)" "unavailable reason=auth_failed"
check "expuesta + auth aceptada => no se entrega a trabajadores" "$(bash "$probe" yes exposed success)" "exposed usable_for_workers=no"
check "pendiente sigue usable aunque otra esté expuesta" "$(bash "$probe" yes pending success)" "pending_rotation usable=yes warning=rotation_pending"
echo "$((total - failures))/$total aserciones"
[[ "$failures" -eq 0 ]]
