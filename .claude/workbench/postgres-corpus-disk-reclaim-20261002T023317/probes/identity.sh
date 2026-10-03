#!/usr/bin/env bash
# Identidad de thyrox-postgres y de su volumen, pedida al dueño de Podman
# (`podman-execution observe`, P3). Ningún verbo de Podman aquí (P4).
# Uso: identity.sh <fase>   → una línea JSON a stdout
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
observe() { bash "$ROOT/bin/podman-execution-execute" observe "$@"; }
jq -cn --arg phase "${1:?fase}" --argjson container "$(observe container thyrox-postgres)" --argjson volume "$(observe volume thyrox-postgres-data)" \
  '{phase: $phase, containerId: $container.id, created: $container.created, port: $container.portBindings["5432/tcp"][0].hostPort,
    volume: $volume.name, volumeCreatedAt: $volume.createdAt, mountpoint: $volume.mountpoint,
    mountedVolume: ([$container.mounts[] | select(.destination == "/var/lib/postgresql/data") | .name][0])}'
