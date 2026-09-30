#!/usr/bin/env bash
# Criterio de aceptacion de la politica de loopback: la cadena completa
#   thyrox -p -> proxy local -> 127.0.0.1:51434/v1 -> thyrox-ollama -> modelo
# con la configuracion normal de thyrox, SIN ninguna variable de excepcion de
# seguridad en el entorno. Retira del entorno la variable antigua por si la
# hereda de un shell, para que un verde no dependa de ella.
set -u
MODEL="${1:-thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701}"
unset THYROX_GATEWAY_ALLOW_LOOPBACK
env | grep -c GATEWAY_ALLOW_LOOPBACK | sed 's/^/variables_de_excepcion_en_el_entorno=/'
start=$(date +%s)
THYROX_OPENAI_COMPAT_BASE_URL=http://127.0.0.1:51434/v1 THYROX_OPENAI_COMPAT_MODEL="$MODEL" \
  timeout 300 bash bin/cli -p --model "$MODEL" "Reply with the single word: ready"
echo "exit=$? pared_s=$(( $(date +%s) - start ))"
