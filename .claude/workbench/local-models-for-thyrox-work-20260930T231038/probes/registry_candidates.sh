#!/usr/bin/env bash
# Mide en el registro de Ollama, sin descargar, cada modelo candidato: existe,
# bytes de la capa de pesos, tipo de archivo y digest del manifiesto (la
# revision que el contrato de nombre usa).
set -u
REG=https://registry.ollama.ai/v2/library
printf 'modelo\tuso\tpesos_bytes\tmanifiesto12\n'
while read -r model use; do
  [ -z "$model" ] && continue
  name=${model%%:*}; tag=${model#*:}
  manifest=$(curl -sS -m 30 -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' "$REG/$name/manifests/$tag")
  weights=$(jq -r '[.layers[]? | select(.mediaType=="application/vnd.ollama.image.model") | .size] | add // "no-existe"' <<<"$manifest" 2>/dev/null)
  digest=$(printf '%s' "$manifest" | sha256sum | cut -c1-12)
  printf '%s\t%s\t%s\t%s\n' "$model" "$use" "${weights:-no-existe}" "$digest"
done <<'LIST'
qwen2.5-coder:1.5b implementacion
qwen2.5-coder:3b implementacion
qwen2.5-coder:7b implementacion
qwen3:4b implementacion
qwen3:8b implementacion
qwen2.5:3b traduccion
qwen2.5:7b traduccion
llama3.2:3b traduccion
nomic-embed-text:latest embeddings
bge-m3:latest embeddings
qwen3-embedding:0.6b embeddings
embeddinggemma:latest embeddings
LIST
