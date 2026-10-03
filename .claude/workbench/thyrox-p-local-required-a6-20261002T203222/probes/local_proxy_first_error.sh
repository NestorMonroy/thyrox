#!/usr/bin/env bash
# Sonda: el primer error del relé local, que `thyrox -p` no muestra (lee el
# stderr del proxy sólo si no arranca). Levanta el proxy con el modelo local,
# manda dos peticiones por su socket y deja respuestas y stderr del proxy.
# Uso: local_proxy_first_error.sh <modelo-contractual> <directorio-de-salida>
set -uo pipefail
model="$1" out="$2"
socket="$(mktemp -u "${TMPDIR:-/tmp}/a6-proxy.XXXXXX").sock"
bash bin/provider-local-proxy --socket "$socket" --local-model "$model" \
  --coordinator-socket "$THYROX_MODEL_COORDINATOR_SOCKET" > "$out/proxy.stdout" 2> "$out/proxy.stderr" &
proxy=$!
for _ in $(seq 1 60); do [[ -S "$socket" ]] && break; sleep 1; done
[[ -S "$socket" ]] || { echo "sonda: el proxy no anunció su socket" > "$out/result.txt"; kill "$proxy"; exit 1; }
body="{\"model\":\"$model\",\"max_tokens\":64,\"messages\":[{\"role\":\"user\",\"content\":\"17 + 25 = ? Responde sólo el número.\"}]}"
for attempt in 1 2; do
  printf 'intento %s: ' "$attempt" >> "$out/result.txt"
  curl -sS --max-time 900 --unix-socket "$socket" http://localhost/v1/messages \
    -H 'content-type: application/json' -H 'x-api-key: ssh-placeholder' -H 'anthropic-version: 2023-06-01' \
    -d "$body" -w ' http=%{http_code}\n' >> "$out/result.txt" 2>&1
done
kill "$proxy" 2>/dev/null; wait "$proxy" 2>/dev/null
