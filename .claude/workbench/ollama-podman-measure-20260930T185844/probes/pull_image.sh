#!/usr/bin/env bash
# Baja la imagen versionada de Ollama y mide pared y tamaño.
set -u
IMAGE="${OLLAMA_IMAGE:-docker.io/ollama/ollama:0.35.0}"
started=$(date +%s)
podman pull "$IMAGE"; code=$?
echo "pull_exit=$code pull_seconds=$(( $(date +%s) - started ))"
podman image inspect "$IMAGE" --format 'size_bytes={{.Size}} digest={{.Digest}}'
df -h / | tail -1
exit $code
