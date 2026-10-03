#!/usr/bin/env bash
# Control real de H-THYROX-448: con el coordinador vivo, tres residencias de
# contexto creciente, cada una soltada al admitirse. Antes de cada admisión y al
# final publica la holgura de RAM y las unidades de modelo vivas, observadas por
# la primitiva (`observe containers`), nunca con un verbo de Podman propio.
set -u
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
model="${1:?modelo contractual}"
admit="$root/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/probes/coordinator_admit.ts"
units() {
  bash "$root/bin/podman-execution-execute" observe containers \
    | jq -r '[.[] | select(.running and (.labels["thyrox.model.residency"] // "") != "") | .labels["thyrox.model.residency"] | sub(".*/"; "")] | join(",")'
}
export THYROX_MODEL_COORDINATOR_SOCKET="${THYROX_MODEL_COORDINATOR_SOCKET:-/root/.claude/model-scheduling/coordinator.sock}"
for ctx in 16384 24576 32768; do
  echo "antes de ctx$ctx: holgura_kB=$(bash "$root/bin/resource_admission" headroom-ram) unidades=$(units)"
  bun "$admit" "$model" "$ctx" 2>&1 | cut -c1-160
done
echo "final: holgura_kB=$(bash "$root/bin/resource_admission" headroom-ram) unidades=$(units)"
