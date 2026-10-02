#!/usr/bin/env bash
# E2E real de ManagedExecutionContainmentGate, con Podman: el MISMO payload por
# la ruta gestionada (primitivo + unidad) y por un subproceso del anfitrión.
# La salida funcional es idéntica en los dos; el gate tiene que dar PASS al
# primero y FAIL al segundo (la anulación: run_in_unit sustituido por el host).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 2
work="$(mktemp -d "$ROOT/.thyrox/runtime/containment-e2e.XXXXXX")"
trap 'rm -rf "${work:?}"' EXIT
OK=0 FAILED=0
check() { if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); echo "ok   $1"; else FAILED=$((FAILED + 1)); echo "FAIL $1 (esperado $2, obtenido $3)"; fi; }
payload=(sh -c 'echo result=42')

managed="$(bash bin/podman-execution-execute run --task TASK-THYROX-0758 --kind test --attest "$work/executions.jsonl" -- \
  bash src/session/unit_attest.sh "$work/units.jsonl" TASK-THYROX-0758 managed -- "${payload[@]}" 2>/dev/null)"
host="$(bash src/session/unit_attest.sh "$work/units.jsonl" TASK-THYROX-0758 host -- "${payload[@]}")"
check "la salida funcional es la misma por las dos rutas" "$managed" "$host"

python3 src/verify/managed_execution_containment.py --task-step managed --primitive "$work/executions.jsonl" --unit "$work/units.jsonl" > "$work/managed.json"
check "ruta gestionada: PASS" 0 $?
python3 src/verify/managed_execution_containment.py --task-step host --primitive "$work/executions.jsonl" --unit "$work/units.jsonl" > "$work/host.json"
check "subproceso del anfitrión (anulación): FAIL" 1 $?
check "el FAIL nombra hostPayload" true "$(jq -r '[.reasons[] | test("hostPayload")] | any' "$work/host.json")"
check "la atestación del primitivo nombra su contenedor" true "$(jq -rs '.[0].containerId | test("^[0-9a-f]{64}$")' "$work/executions.jsonl")"

# Una imagen invitada sin gawk ni jq (pgvector): la atestación no puede depender
# de las herramientas de la imagen que se prueba.
GUEST_IMAGE="${CONTAINMENT_E2E_GUEST_IMAGE:-docker.io/pgvector/pgvector:0.8.0-pg16}"
guest="$(bash bin/podman-execution-execute run --task TASK-THYROX-0758 --kind test --image "$GUEST_IMAGE" --attest "$work/executions.jsonl" -- \
  sh src/session/unit_attest.sh "$work/units.jsonl" TASK-THYROX-0758 guest -- "${payload[@]}" 2>/dev/null)"
check "imagen sin gawk ni jq: misma salida funcional" "$managed" "$guest"
python3 src/verify/managed_execution_containment.py --task-step guest --primitive "$work/executions.jsonl" --unit "$work/units.jsonl" > "$work/guest.json"
check "imagen sin gawk ni jq: PASS" 0 $?
sh src/session/unit_attest.sh "$work/units.jsonl" TASK-THYROX-0758 guest-host -- "${payload[@]}" >/dev/null
python3 src/verify/managed_execution_containment.py --task-step guest-host --primitive "$work/executions.jsonl" --unit "$work/units.jsonl" > /dev/null
check "el mismo guion fuera de la unidad (anulación): FAIL" 1 $?
echo
echo "$((OK + FAILED)) casos: $OK ok, $FAILED fallos"
(( FAILED == 0 ))
