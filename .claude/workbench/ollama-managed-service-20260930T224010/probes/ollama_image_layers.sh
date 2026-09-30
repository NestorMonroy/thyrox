#!/usr/bin/env bash
# Mide los bytes comprimidos de las capas linux/amd64 de la imagen de Ollama
# (la cifra que infrastructure.sh declara para la admision de disco).
# Podman 4 rehusa `manifest inspect` sobre una imagen simple y vuelca el
# manifiesto en el mensaje de error; sin skopeo, las capas se leen de ahi.
set -u
IMAGE="${1:-docker.io/ollama/ollama:0.35.0}"
digest=$(podman manifest inspect "$IMAGE" | jq -r '.manifests[] | select(.platform.architecture=="amd64" and .platform.os=="linux") | .digest')
echo "imagen=$IMAGE amd64_digest=$digest"
podman manifest inspect "${IMAGE%%:*}@$digest" 2>&1 >/dev/null | python3 -c '
import re, sys
text = sys.stdin.read().encode().decode("unicode_escape")
layers = text.split("\"layers\"", 1)[1]
sizes = [int(s) for s in re.findall(r"\"size\":\s*(\d+)", layers)]
print(f"capas={len(sizes)} capas_comprimidas_bytes={sum(sizes)}")'
podman image inspect "$IMAGE" --format 'local_digest={{.Digest}} local_size={{.Size}}'
