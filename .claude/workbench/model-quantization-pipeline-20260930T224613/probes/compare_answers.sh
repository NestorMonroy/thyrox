#!/usr/bin/env bash
# Compara la respuesta de cada modelo servido a tres preguntas cerradas,
# temperatura 0 y semilla fija: distingue «el modelo no sirve» de «el modelo
# eligió otra palabra ante una instrucción ambigua».
set -u
URL="${OLLAMA_URL:-http://127.0.0.1:51434}"
questions=("What is 2+2? Answer with only the number." "What is the capital of France? Answer with one word." "Reply with the single word: ready")
for model in $(curl -sS "$URL/api/tags" | jq -r '.models[].name' | sort); do
  echo "== $model"
  for q in "${questions[@]}"; do
    body=$(jq -nc --arg m "$model" --arg q "$q" '{model:$m,messages:[{role:"user",content:$q}],stream:false,options:{temperature:0,seed:7,num_predict:12}}')
    curl -sS -m 300 "$URL/api/chat" -d "$body" | jq -r --arg q "$q" '"  \($q) -> \(.message.content | gsub("\n";" ")) [\(.done_reason)]"'
  done
done
