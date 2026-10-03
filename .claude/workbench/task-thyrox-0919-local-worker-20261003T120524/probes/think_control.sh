#!/usr/bin/env bash
# EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
# no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
# ¿Qué campo de /v1/chat/completions apaga el razonamiento de Qwen3 en Ollama?
# Uso: think_control.sh <puerto> <modelo>
port="$1" model="$2"
for variant in default 'reasoning_effort:"none"' 'think:false' 'reasoning_effort:"low"'; do
  extra=""; [[ "$variant" == default ]] || extra=",$variant"
  body="{\"model\":\"$model\",\"max_tokens\":400,\"messages\":[{\"role\":\"user\",\"content\":\"¿Cuánto es 17 + 25? Responde sólo el número.\"}]$extra}"
  start=$(date +%s)
  out=$(curl -s --max-time 900 "127.0.0.1:$port/v1/chat/completions" -H 'content-type: application/json' -d "$body")
  printf '%s\tsegundos=%s\tcompletion_tokens=%s\treasoning_chars=%s\tcontent=%s\n' "$variant" "$(( $(date +%s) - start ))" \
    "$(jq -r '.usage.completion_tokens // "?"' <<< "$out")" "$(jq -r '(.choices[0].message.reasoning // "") | length' <<< "$out")" \
    "$(jq -r '.choices[0].message.content // .error.message // "?"' <<< "$out" | tr '\n' ' ' | cut -c1-80)"
done
