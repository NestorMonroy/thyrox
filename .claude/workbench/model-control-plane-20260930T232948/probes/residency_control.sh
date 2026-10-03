#!/usr/bin/env bash
# Mide si thyrox puede decidir la residencia de un modelo en Ollama por
# peticion: keep_alive 0 lo descarga al terminar, keep_alive -1 lo deja
# residente sin caducidad, y una peticion vacia con keep_alive 0 lo descarga
# sin generar. Observado en /api/ps (lo que Ollama tiene cargado).
set -u
URL="${OLLAMA_URL:-http://127.0.0.1:51434}"
M="${1:-thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701}"
ps_state() { curl -sS "$URL/api/ps" | jq -c '[.models[] | {name, size_vram, expires_at}]'; }
gen() { curl -sS -m 300 "$URL/api/generate" -d "{\"model\":\"$M\",\"prompt\":\"hi\",\"stream\":false,\"keep_alive\":$1,\"options\":{\"num_predict\":1}}" >/dev/null; }
echo "inicial: $(ps_state)"
gen 0;  echo "tras keep_alive 0:  $(ps_state)"
gen -1; echo "tras keep_alive -1: $(ps_state)"
curl -sS "$URL/api/generate" -d "{\"model\":\"$M\",\"keep_alive\":0}" >/dev/null
echo "tras descarga explicita (sin prompt, keep_alive 0): $(ps_state)"
