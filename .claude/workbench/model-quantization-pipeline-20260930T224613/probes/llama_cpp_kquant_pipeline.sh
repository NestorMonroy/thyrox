#!/usr/bin/env bash
# Pipeline K-quant medido, de extremo a extremo, sobre la fuente HF ya
# descargada en el volumen del laboratorio:
#   safetensors BF16 -> convert_hf_to_gguf (F16) -> llama-quantize (Q8_0, Q4_K_M)
#   -> perplexity de cada uno -> registro en el Ollama gestionado por su API de
#   blobs -> inferencia minima y tokens/s por el servicio.
# Cada paso de llama.cpp corre en un contenedor efimero sin red; los GGUF
# quedan en el volumen del laboratorio.
set -u
IMAGE="${LLAMA_CPP_IMAGE:-ghcr.io/ggml-org/llama.cpp:full}"
SOURCES=thyrox-quantization-lab-sources
ARTIFACTS=thyrox-quantization-lab-artifacts
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:51434}"
LEVELS="${QUANT_LEVELS:-Q8_0 Q4_K_M}"
podman volume create --ignore "$ARTIFACTS" >/dev/null
src_root=$(podman volume inspect "$SOURCES" --format '{{.Mountpoint}}')
out_root=$(podman volume inspect "$ARTIFACTS" --format '{{.Mountpoint}}')
source_dir=$(ls -d "$src_root"/Qwen__Qwen2.5-0.5B-Instruct@* | head -1)
name=$(basename "$source_dir")
echo "fuente=$name"
tool() { podman run --rm --network none -v "$SOURCES:/sources:ro" -v "$ARTIFACTS:/artifacts" --entrypoint "$1" "$IMAGE" "${@:2}"; }
timed() { local t0; t0=$(date +%s.%N); "$@"; local rc=$?; echo "  exit=$rc pared_s=$(echo "$(date +%s.%N) - $t0" | bc)"; return $rc; }

echo "== convert_hf_to_gguf -> F16"
timed tool python3 /app/convert_hf_to_gguf.py "/sources/$name" --outfile /artifacts/model-F16.gguf --outtype f16 > "$out_root/convert.log" 2>&1
tail -2 "$out_root/convert.log"
for level in $LEVELS; do
  echo "== llama-quantize F16 -> $level"
  timed tool /app/llama-quantize /artifacts/model-F16.gguf "/artifacts/model-$level.gguf" "$level" > "$out_root/quantize-$level.log" 2>&1
  grep -E "model size|quant size" "$out_root/quantize-$level.log" | sed 's/^/  /'
done
ls -l --block-size=1 "$out_root"/*.gguf | gawk '{print "  " $5, $9}' | sed "s#$out_root/##"

echo "== perplexity (texto: README y LICENSE de la fuente, contexto 128)"
cat "$source_dir/README.md" "$source_dir/LICENSE" > "$out_root/eval.txt"
for level in F16 $LEVELS; do
  ppl=$(tool /app/llama-perplexity -m "/artifacts/model-$level.gguf" -f /artifacts/eval.txt -c 128 -t 4 2>&1 | grep -oE "Final estimate: PPL = [0-9.]+ \+/- [0-9.]+" | tail -1)
  echo "  $level: ${ppl:-sin estimacion}"
done

echo "== registro en el Ollama gestionado (API de blobs) e inferencia"
for level in $LEVELS; do
  file="$out_root/model-$level.gguf"
  digest="sha256:$(sha256sum "$file" | cut -d' ' -f1)"
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST --data-binary "@$file" "$OLLAMA_URL/api/blobs/$digest")
  tag="thyrox-qwen2.5-0.5b-instruct:$(echo "$level" | tr 'A-Z' 'a-z')"
  echo "  $level blob=$code digest=${digest:0:19}"
  curl -sS -m 600 "$OLLAMA_URL/api/create" -d "{\"model\":\"$tag\",\"files\":{\"model.gguf\":\"$digest\"},\"stream\":false}" | jq -c .
  curl -sS "$OLLAMA_URL/api/show" -d "{\"model\":\"$tag\"}" | jq -c '{model:"'"$tag"'", format: .details.format, quantization_level: .details.quantization_level, parameter_size: .details.parameter_size}'
  curl -sS -m 300 "$OLLAMA_URL/api/generate" -d "{\"model\":\"$tag\",\"prompt\":\"Reply with the single word: ready\",\"stream\":false,\"options\":{\"temperature\":0,\"seed\":7,\"num_predict\":16}}" \
    | jq -c '{response, load_s: (.load_duration/1e9), tokens_per_s: (if (.eval_duration // 0) > 0 then .eval_count/(.eval_duration/1e9) else null end)}'
done
echo "== comparacion con el Q4_K_M del registro de Ollama (qwen2.5:0.5b)"
curl -sS -m 300 "$OLLAMA_URL/api/generate" -d '{"model":"qwen2.5:0.5b","prompt":"Reply with the single word: ready","stream":false,"options":{"temperature":0,"seed":7,"num_predict":16}}' \
  | jq -c '{model:"qwen2.5:0.5b", response, tokens_per_s: (if (.eval_duration // 0) > 0 then .eval_count/(.eval_duration/1e9) else null end)}'
curl -sS "$OLLAMA_URL/api/tags" | jq -r '.models[] | "  \(.name) \(.size) \(.details.quantization_level)"'
