#!/usr/bin/env bash
# Construye la imagen CPU aplanada, mide su tamaño y prueba que sirve el mismo
# modelo del volumen gestionado (contenedor temporal, otro puerto, volumen en
# sólo lectura para no competir con thyrox-ollama por la escritura).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
TAG=localhost/thyrox-ollama-cpu:0.35.0
start=$(date +%s)
podman build --squash-all -t "$TAG" "$HERE/ollama-cpu-image" >/dev/null 2>&1; echo "build_exit=$? build_s=$(( $(date +%s) - start ))"
podman image inspect "$TAG" --format 'size={{.Size}} id={{.Id}}'
podman image inspect docker.io/ollama/ollama:0.35.0 --format 'oficial_size={{.Size}}'
cleanup() { podman rm -f thyrox-ollama-cpu-probe >/dev/null 2>&1; }; trap cleanup EXIT
podman run -d --name thyrox-ollama-cpu-probe --network host -e OLLAMA_HOST=127.0.0.1:11541 \
  -v thyrox-ollama-probe-models:/root/.ollama:ro --label io.thyrox.role=probe "$TAG" >/dev/null
for _ in $(seq 60); do curl -sf http://127.0.0.1:11541/api/version >/dev/null && break; sleep 1; done
curl -sS -m 300 http://127.0.0.1:11541/api/chat -d '{"model":"thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701","messages":[{"role":"user","content":"What is 2+2? Answer with only the number."}],"stream":false,"options":{"temperature":0,"seed":7,"num_predict":8}}' | jq -c '{response: .message.content, done_reason}'
