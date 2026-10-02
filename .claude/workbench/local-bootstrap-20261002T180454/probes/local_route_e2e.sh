#!/usr/bin/env bash
# LB3: prueba de extremo a extremo de `thyrox -p` con un modelo del catálogo
# local. No exporta ninguna credencial ni URL de proveedor: retira del entorno
# las variables de la cadena de credenciales, así que `thyrox -p` entra por la
# ruta sin credencial (printDelegation: proxy local, `--local-model`, admisión
# del coordinador, unidad del modelo). Arranca el coordinador del daemon si
# falta, como run_qualification.sh.
# Uso: local_route_e2e.sh <salida> <modelo> <prompt>
set -uo pipefail
out="$1" model="$2" prompt="$3"; mkdir -p "$out"
root=/home/user/thyrox; sock="$(bash "$root/bin/model-scheduling-socket-path")"
cd "$root" || exit 2
if [ ! -S "$sock" ]; then
  THYROX_CODE_DAEMON_TRANSIENT=1 setsid bun --feature=DAEMON --feature=UDS_INBOX \
    src/packages/cli/src/entry/cli.tsx daemon bg run > "$out/daemon.log" 2>&1 &
  for _ in $(seq 90); do [ -S "$sock" ] && break; sleep 1; done
fi
[ -S "$sock" ] || { echo "coordinator socket never appeared"; exit 2; }
started=$(date +%s)
env -u ANTHROPIC_BASE_URL -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u THYROX_CODE_OAUTH_TOKEN -u ANTHROPIC_UNIX_SOCKET \
  timeout 900 bash bin/cli -p --model "$model" --max-turns 2 --output-format stream-json --verbose "$prompt" \
  > "$out/stream.jsonl" 2> "$out/stderr.log"
rc=$?
echo "exit=$rc seconds=$(( $(date +%s) - started ))" > "$out/verdict.txt"
echo "E2E EXIT=$rc"
