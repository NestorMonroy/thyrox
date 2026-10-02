#!/usr/bin/env bash
# T005, mitad del plano de control: SÓLO LEE los metadatos del almacén de
# Podman, que una unidad no ve. No mide bytes de ningún árbol (eso lo hace
# inventory_measure.sh dentro de una unidad). No borra, no crea, no detiene.
# Salida: outputs/T005-observed-podman.json
set -uo pipefail
B="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
running="$(podman ps --format '{{.Names}}' | jq -R . | jq -s .)"
volumes="$(for v in $(podman volume ls --format '{{.Name}}'); do
  podman volume inspect "$v" | jq --arg users "$(podman ps -a --filter volume="$v" --format '{{.Names}}' | paste -sd, -)" \
    '.[0] | {name: .Name, mountpoint: .Mountpoint, createdAt: .CreatedAt, labels: (.Labels // {}), users: ($users | split(",") | map(select(. != "")))}'
done | jq -s .)"
images="$(podman images --format '{{.ID}}' | sort -u | while read -r id; do
  podman image inspect "$id" | jq --arg users "$(podman ps -a --filter ancestor="$id" --format '{{.Names}}' | paste -sd, -)" \
    '.[0] | {id: .Id, tags: (.RepoTags // []), digests: (.RepoDigests // []), bytes: .Size, created: .Created, labels: (.Labels // {}), users: ($users | split(",") | map(select(. != "")))}'
done | jq -s .)"
containers="$(podman ps -a --format json | jq '[.[] | {name: .Names[0], id: .Id, state: .State, image: .Image, labels: (.Labels // {}), mounts: .Mounts}]')"
graph_root="$(podman info --format '{{.Store.GraphRoot}}')"
jq -n --argjson running "$running" --argjson volumes "$volumes" --argjson images "$images" --argjson containers "$containers" \
  --arg graphRoot "$graph_root" --arg utc "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{utc: $utc, graphRoot: $graphRoot, running: $running, volumes: $volumes, images: $images, containers: $containers}' \
  > "$B/outputs/T005-observed-podman.json"
jq -c '{volumes: (.volumes | length), images: (.images | length), containers: (.containers | length), running: (.running | length)}' "$B/outputs/T005-observed-podman.json"
