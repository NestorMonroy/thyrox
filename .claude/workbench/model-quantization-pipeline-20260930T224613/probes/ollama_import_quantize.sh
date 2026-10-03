#!/usr/bin/env bash
# Experimento del backend Ollama del pipeline de cuantizacion: descarga un
# modelo Hugging Face en safetensors (BF16), lo importa con `ollama create
# --quantize <nivel>` para cada nivel pedido y valida cada resultado
# (nivel declarado, tamaño, inferencia minima, tokens/s, memoria del cgroup).
# Contenedor de laboratorio efimero; los volumenes de laboratorio se conservan
# hasta que el ejecutor decida.
set -u
REPO="${HF_REPO:-Qwen/Qwen2.5-0.5B-Instruct}"
LEVELS="${QUANT_LEVELS:-q8_0 q4_K_M}"
IMAGE="${OLLAMA_IMAGE:-docker.io/ollama/ollama:0.35.0}"
SOURCES=thyrox-quantization-lab-sources
MODELS=thyrox-quantization-lab-models
NAME=thyrox-quantization-lab
PORT="${LAB_PORT:-11537}"
CA="${PROBE_CA_BUNDLE:-}"
api() { curl -sS -m 900 "http://127.0.0.1:$PORT/api/$1" "${@:2}"; }
cleanup() { podman rm -f "$NAME" >/dev/null 2>&1; }
trap cleanup EXIT

echo "== fuente: $REPO"
revision=$(curl -sS -m 30 "https://huggingface.co/api/models/$REPO" | jq -r .sha)
echo "revision=$revision"
podman volume create --ignore "$SOURCES" >/dev/null; podman volume create --ignore "$MODELS" >/dev/null
src_root=$(podman volume inspect "$SOURCES" --format '{{.Mountpoint}}')
dir="$src_root/${REPO//\//__}@$revision"; mkdir -p "$dir"
started=$(date +%s)
for f in $(curl -sS -m 30 "https://huggingface.co/api/models/$REPO" | jq -r '.siblings[].rfilename' | grep -E '\.(json|safetensors|txt|model)$'); do
  [ -s "$dir/$f" ] || curl -sS -fL -m 1800 -o "$dir/$f" "https://huggingface.co/$REPO/resolve/$revision/$f" || { echo "descarga fallida: $f"; exit 1; }
done
echo "descarga_s=$(( $(date +%s) - started ))"
( cd "$dir" && sha256sum ./*.safetensors ) | sed 's/^/sha256 /'
du -sb "$dir" | cut -f1 | sed 's/^/fuente_bytes=/'
jq -c '{architectures, torch_dtype, num_hidden_layers, num_key_value_heads, hidden_size, num_attention_heads, max_position_embeddings}' "$dir/config.json"

args=(--name "$NAME" --network host -e "OLLAMA_HOST=127.0.0.1:$PORT" --label io.thyrox.role=probe
      -v "$MODELS:/root/.ollama" -v "$SOURCES:/sources:ro")
[ -n "${HTTPS_PROXY:-}" ] && args+=(-e "HTTPS_PROXY=$HTTPS_PROXY" -e "NO_PROXY=localhost,127.0.0.1")
[ -n "$CA" ] && [ -r "$CA" ] && args+=(-v "$CA:/etc/ssl/certs/proxy-ca.crt:ro" -e SSL_CERT_FILE=/etc/ssl/certs/proxy-ca.crt)
podman run -d "${args[@]}" "$IMAGE" >/dev/null
for _ in $(seq 60); do api version >/dev/null 2>&1 && break; sleep 1; done
in_dir="/sources/$(basename "$dir")"

echo "== nivel invalido (para leer la lista que acepta)"
podman exec -e "OLLAMA_HOST=127.0.0.1:$PORT" "$NAME" sh -c "printf 'FROM $in_dir\n' > /tmp/Modelfile && ollama create lab-invalid -q q9_Z -f /tmp/Modelfile" 2>&1 | tail -3

for level in $LEVELS; do
  tag="lab-$(echo "$level" | tr 'A-Z_' 'a-z-')"
  echo "== $level -> $tag"
  t0=$(date +%s)
  podman exec -e "OLLAMA_HOST=127.0.0.1:$PORT" "$NAME" sh -c "printf 'FROM $in_dir\n' > /tmp/Modelfile && ollama create $tag -q $level -f /tmp/Modelfile" 2>&1 | tail -2
  echo "create_s=$(( $(date +%s) - t0 ))"
  api show -d "{\"model\":\"$tag\"}" | jq -c '{format: .details.format, family: .details.family, parameter_size: .details.parameter_size, quantization_level: .details.quantization_level}'
  api tags | jq -r --arg t "$tag:latest" '.models[] | select(.name==$t) | "gguf_bytes=\(.size)"'
  resp=$(api generate -d "{\"model\":\"$tag\",\"prompt\":\"Reply with the single word: ready\",\"stream\":false,\"options\":{\"temperature\":0,\"seed\":7,\"num_predict\":16}}")
  echo "$resp" | jq -c '{response, load_s: (.load_duration/1e9), tokens_per_s: (if .eval_duration>0 then .eval_count/(.eval_duration/1e9) else null end)}'
  podman stats --no-stream --format 'mem_usage={{.MemUsage}}' "$NAME"
done
echo "== modelos en el laboratorio"; api tags | jq -r '.models[] | "\(.name) \(.size) \(.details.quantization_level)"'
