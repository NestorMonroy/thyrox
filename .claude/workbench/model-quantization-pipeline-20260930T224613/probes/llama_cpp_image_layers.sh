#!/usr/bin/env bash
# Mide las imagenes oficiales de llama.cpp candidatas para convertir y
# cuantizar (bytes comprimidos linux/amd64), sin descargarlas.
set -u
for IMAGE in ${IMAGES:-ghcr.io/ggml-org/llama.cpp:full ghcr.io/ggml-org/llama.cpp:light ghcr.io/ggml-org/llama.cpp:server}; do
  list=$(podman manifest inspect "$IMAGE" 2>&1) || { echo "$IMAGE: no inspeccionable: ${list:0:200}"; continue; }
  digest=$(jq -r '.manifests[]? | select(.platform.architecture=="amd64" and .platform.os=="linux") | .digest' <<<"$list" | head -1)
  if [ -z "$digest" ]; then echo "$IMAGE: sin variante amd64 en la lista"; continue; fi
  podman manifest inspect "${IMAGE%%:*}@$digest" 2>&1 >/dev/null | python3 -c '
import re, sys
text = sys.stdin.read().encode().decode("unicode_escape")
layers = text.split("\"layers\"", 1)[1] if "\"layers\"" in text else ""
sizes = [int(s) for s in re.findall(r"\"size\":\s*(\d+)", layers)]
print(f"'"$IMAGE"' amd64={'"'$digest'"'[:19]} capas={len(sizes)} comprimidas_bytes={sum(sizes)}")'
done
