#!/usr/bin/env bash
# Corre un payload de un paso del batch por la ruta gestionada y deja las dos
# evidencias de contención: la atestación del primitivo (--attest) y la
# identidad vista desde dentro (unit_attest.sh).
# Uso: managed_step.sh <paso> <kind> [opciones de run...] -- <payload...>
set -uo pipefail
ROOT=/home/user/thyrox
B="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
step="${1:?paso}" kind="${2:?kind}"
shift 2
options=()
while (( $# > 0 )) && [[ "$1" != "--" ]]; do options+=("$1"); shift; done
shift
cd "$ROOT"
exec bash bin/podman-execution-execute run --task TASK-THYROX-0758 --kind "$kind" \
  --attest "$B/outputs/executions.jsonl" "${options[@]}" -- \
  bash src/session/unit_attest.sh "$B/outputs/units.jsonl" TASK-THYROX-0758 "$step" -- "$@"
