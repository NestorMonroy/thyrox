#!/usr/bin/env bash
# Mide si el endpoint Anthropic-compatible del Token Plan responde 502 según el tamaño de la
# petición: una petición por tamaño, max_tokens mínimo, mismo modelo. Corre en una unidad.
set -uo pipefail
model="$1"; shift
secret=/run/secrets/THYROX_OPENAI_COMPAT_API_KEY
for kilotokens in "$@"; do
  # Relleno de alta entropía (palabras hexadecimales aleatorias): un texto repetido se tokeniza
  # en pocos tokens y no mide el tamaño en tokens (medido: 480 KB repetidos = 22 k tokens).
  python3 -c "
import json,sys
n=int(sys.argv[1])*1000*4
body={'model':sys.argv[2],'max_tokens':int(sys.argv[3]),'stream':sys.argv[4]=='1','messages':[{'role':'user','content':' '.join(__import__('secrets').token_hex(3) for _ in range(n//7))+' Responde OK.'}]}
open('/tmp/body.json','w').write(json.dumps(body))" "$kilotokens" "$model" "${PROBE_MAX_TOKENS:-16}" "${PROBE_STREAM:-0}"
  code=$(curl -s -o /tmp/resp.json -w '%{http_code}' -X POST https://token-plan.maas.qwencloudapi.com/apps/anthropic/v1/messages \
    -H "x-api-key: $(cat $secret)" -H 'anthropic-version: 2023-06-01' -H 'content-type: application/json' \
    --data-binary @/tmp/body.json --max-time 180)
  echo "$model ${kilotokens}k max=${PROBE_MAX_TOKENS:-16} stream=${PROBE_STREAM:-0} bytes=$(stat -c%s /tmp/body.json) http=$code body=$(head -c 160 /tmp/resp.json | tr '\n' ' ')"
done
