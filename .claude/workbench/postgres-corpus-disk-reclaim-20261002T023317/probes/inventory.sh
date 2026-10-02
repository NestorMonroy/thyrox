#!/usr/bin/env bash
# T005 — inventario de disco. SÓLO LEE: no borra, no crea, no detiene nada.
# Las medidas del almacén de Podman son observación del plano de control (una
# unidad no ve /var/lib/containers); las del árbol, `du` acotado por ruta.
# Salidas: outputs/T005-volumes.tsv, -images.tsv, -containers.tsv, -paths.tsv, -filesystem.txt
set -uo pipefail
ROOT=/home/user/thyrox
B="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
O="$B/outputs"
cd "$ROOT"
{ df -B1 /; echo; podman system df; } > "$O/T005-filesystem.txt" 2>&1

# Volúmenes: bytes, quién los monta (vivos y detenidos), etiquetas de dueño.
running="$(podman ps --format '{{.Names}}')"
printf 'volume\tbytes\tmounted_by_running_container\treferenced_by_stopped_container\towner_kind\towner_id\tresource_name\n' > "$O/T005-volumes.tsv"
for volume in $(podman volume ls --format '{{.Name}}'); do
  mountpoint="$(podman volume inspect "$volume" --format '{{.Mountpoint}}')"
  bytes="$(du -sb "$mountpoint" 2>/dev/null | cut -f1)"
  users="$(podman ps -a --filter volume="$volume" --format '{{.Names}}' | paste -sd, -)"
  live="" stopped=""
  for user in ${users//,/ }; do
    if grep -qx "$user" <<<"$running"; then live+="$user,"; else stopped+="$user,"; fi
  done
  labels="$(podman volume inspect "$volume" --format '{{index .Labels "thyrox.owner-kind"}}	{{index .Labels "thyrox.owner-id"}}	{{index .Labels "thyrox.resource-name"}}')"
  printf '%s\t%s\t%s\t%s\t%s\n' "$volume" "${bytes:-unknown}" "${live%,}" "${stopped%,}" "$labels" >> "$O/T005-volumes.tsv"
done

# Imágenes: tamaño y contenedores que la usan.
printf 'image\tid\tbytes\tcontainers_using\tlifecycle\n' > "$O/T005-images.tsv"
podman images --format '{{.Repository}}:{{.Tag}}	{{.ID}}	{{.Size}}' | while IFS=$'\t' read -r name id _; do
  bytes="$(podman image inspect "$id" --format '{{.Size}}' 2>/dev/null | head -1)"
  using="$(podman ps -a --filter ancestor="$id" --format '{{.Names}}' | paste -sd, -)"
  lifecycle="$(podman image inspect "$id" --format '{{index .Labels "io.thyrox.image.lifecycle"}}' 2>/dev/null | head -1)"
  printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$id" "$bytes" "$using" "$lifecycle" >> "$O/T005-images.tsv"
done

# Contenedores detenidos.
printf 'container\tstatus\timage\towner_kind\n' > "$O/T005-containers.tsv"
podman ps -a --filter status=exited --filter status=created --format '{{.Names}}	{{.Status}}	{{.Image}}	{{index .Labels "thyrox.owner-kind"}}' >> "$O/T005-containers.tsv"

# Rutas del árbol y del anfitrión, una a una (sin recorrer raíces pesadas sin cota).
printf 'path\tbytes\n' > "$O/T005-paths.tsv"
for path in .claude/worktrees .claude/workbench .claude/jobs .claude/cache .thyrox/runtime node_modules _references _archived agent-results \
            /home/user/kaupamex-docs /root/.cache /root/.bun /root/.npm /tmp /var/tmp; do
  [[ -e "$path" ]] || continue
  printf '%s\t%s\n' "$path" "$(timeout 120 du -sb "$path" 2>/dev/null | cut -f1)" >> "$O/T005-paths.tsv"
done
for dir in .thyrox/runtime/*/ .claude/cache/*/; do
  [[ -d "$dir" ]] && printf '%s\t%s\n' "${dir%/}" "$(timeout 60 du -sb "$dir" 2>/dev/null | cut -f1)" >> "$O/T005-paths.tsv"
done
echo "inventory: $(($(wc -l < "$O/T005-volumes.tsv") - 1)) volúmenes, $(($(wc -l < "$O/T005-images.tsv") - 1)) imágenes, $(($(wc -l < "$O/T005-containers.tsv") - 1)) contenedores detenidos, $(($(wc -l < "$O/T005-paths.tsv") - 1)) rutas"
