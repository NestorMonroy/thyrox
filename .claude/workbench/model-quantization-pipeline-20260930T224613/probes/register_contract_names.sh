#!/usr/bin/env bash
# Registra en el Ollama gestionado cada modelo con el NOMBRE del contrato
# (`thyrox-<org>--<repo>:<quant>-<source>-<revision12>`), mide que Ollama lo
# acepta, y para los GGUF convertidos aquí fija la plantilla Go y el system de
# la misma familia (los del modelo del registro): el import por `files` sólo
# copia la plantilla Jinja del GGUF.
set -u
URL="${OLLAMA_URL:-http://127.0.0.1:51434}"
REGISTRY_MODEL=qwen2.5:0.5b
registry_digest=$(curl -sS "$URL/api/tags" | jq -r --arg m "$REGISTRY_MODEL" '.models[] | select(.name==$m) | .digest')
registry_name="thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-${registry_digest:0:12}"
echo "== registro -> $registry_name"
curl -sS -o /dev/null -w 'copy=%{http_code}\n' "$URL/api/copy" -d "{\"source\":\"$REGISTRY_MODEL\",\"destination\":\"$registry_name\"}"
template=$(curl -sS "$URL/api/show" -d "{\"model\":\"$REGISTRY_MODEL\"}" | jq '.template')
system=$(curl -sS "$URL/api/show" -d "{\"model\":\"$REGISTRY_MODEL\"}" | jq '.system')
for level in q8_0 q4_k_m; do
  provisional="thyrox-qwen2.5-0.5b-instruct:$level"
  digest=$(curl -sS "$URL/api/tags" | jq -r --arg m "$provisional" '.models[] | select(.name==$m) | .digest')
  name="thyrox-qwen--qwen2.5-0.5b-instruct:${level}-hf-7ae557604adf"
  blob=$(curl -sS "$URL/api/show" -d "{\"model\":\"$provisional\",\"verbose\":false}" | jq -r '.modelfile' | gawk '/^FROM /{print $2; exit}')
  echo "== $provisional -> $name (manifiesto ${digest:0:12})"
  gguf_digest="sha256:$(basename "$blob" | sed 's/^sha256-//')"
  curl -sS -m 600 "$URL/api/create" -d "{\"model\":\"$name\",\"files\":{\"model.gguf\":\"$gguf_digest\"},\"template\":$template,\"system\":$system,\"stream\":false}" | jq -c .
  curl -sS "$URL/api/show" -d "{\"model\":\"$name\"}" | jq -c '{quantization_level: .details.quantization_level, template_bytes: (.template|length), system: (.system // "" | .[0:30])}'
  curl -sS -m 300 "$URL/api/chat" -d "{\"model\":\"$name\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with the single word: ready\"}],\"stream\":false,\"options\":{\"temperature\":0,\"seed\":7,\"num_predict\":16}}" | jq -c '{response: .message.content}'
  curl -sS -o /dev/null -w "retira_provisional=%{http_code}\n" -X DELETE "$URL/api/delete" -d "{\"model\":\"$provisional\"}"
done
curl -sS -o /dev/null -w "retira_nombre_ambiguo=%{http_code}\n" -X DELETE "$URL/api/delete" -d "{\"model\":\"$REGISTRY_MODEL\"}"
echo "== modelos servidos"; curl -sS "$URL/api/tags" | jq -r '.models[] | "  \(.name) \(.size) \(.details.quantization_level)"'
curl -sS -m 300 "$URL/api/chat" -d "{\"model\":\"$registry_name\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with the single word: ready\"}],\"stream\":false,\"options\":{\"temperature\":0,\"seed\":7,\"num_predict\":8}}" | jq -c '{model:"'"$registry_name"'", response: .message.content}'
