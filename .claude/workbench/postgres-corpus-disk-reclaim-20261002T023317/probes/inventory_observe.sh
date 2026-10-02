#!/usr/bin/env bash
# T005, observación: el estado de Podman se PIDE al dueño (`podman-execution
# observe snapshot`, P3); este guion no emite ningún verbo de Podman (P4). Una
# unidad no ve el almacén, y montarle el socket la convertiría en plano de
# control: por eso la observación vive en el paquete dueño, no en la unidad.
# Proyecta la instantánea a la forma del inventario. No borra ni crea nada.
# Salida: outputs/T005-observed-podman.json
set -euo pipefail
B="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$B/../../.." && pwd)"
bash "$ROOT/bin/podman-execution-execute" observe snapshot | jq --arg utc "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{
  utc: $utc,
  source: "podman-execution observe snapshot",
  graphRoot: .storage.graphRoot,
  running: [.containers[] | select(.running) | .name],
  volumes: [.volumes[] | {name, mountpoint, createdAt, labels, users: .usedBy}],
  images: [.images[] | {id, tags, digests, bytes, uniqueBytes, created, labels, users: .usedBy}],
  containers: [.containers[] | {name, id, state, image, imageId, labels, mounts: [.mounts[] | .destination]}]
}' > "$B/outputs/T005-observed-podman.json"
jq -c '{volumes: (.volumes | length), images: (.images | length), containers: (.containers | length), running: (.running | length)}' "$B/outputs/T005-observed-podman.json"
