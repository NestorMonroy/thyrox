#!/usr/bin/env bash
# Desglosa en disco la imagen de Ollama: qué directorios ocupan sus 5.5 GB.
# Contenedor efímero sin red; no toca volúmenes.
set -u
IMAGE="${1:-docker.io/ollama/ollama:0.35.0}"
podman run --rm --network none --entrypoint /bin/sh "$IMAGE" -c '
  du -sb /usr/lib/ollama/* 2>/dev/null | sort -rn | head -15
  echo "--"; du -sb /usr/bin/ollama /usr/lib/ollama /usr / 2>/dev/null'
