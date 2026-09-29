#!/usr/bin/env bash
# headless-pool corre cada ítem con `thyrox -p` (TASK-THYROX-0257).
#
# El pool lanza cada ítem con una línea de comando fija
# (`--setting-sources project --tools --allowedTools --max-turns
# --no-session-persistence --output-format stream-json --verbose`). Esta suite
# comprueba que `thyrox -p` la acepta tal cual y que lo que el pool lee
# después —la línea `result` en `<n>.json` y el uso por petición en el
# stream— sale de él. El modelo es un proveedor grabado: este contenedor no
# tiene credencial, y lo que se prueba es el contrato, no el servicio.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POOL="$ROOT/bin/headless-pool"
F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
# El pool de prueba abre su runtime aquí, no en el runtime real del árbol.
export THYROX_RUNTIME_DIR="$F/runtime"
PASS=0; FAIL=0
check() { if [[ "$2" == "$3" ]]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fi; }

cat > "$F/turnos.json" <<'JSON'
[{"id":"m1","model":"claude-sonnet-5","stop_reason":"end_turn",
  "content":[{"type":"text","text":"concepto: admisión"}],
  "usage":{"input_tokens":7,"output_tokens":3,"cache_creation_input_tokens":0,"cache_read_input_tokens":500}}]
JSON
printf 'Extrae el concepto del ítem.\n' > "$F/prompt.md"
# El «claude» que el pool lanza: thyrox -p con el proveedor grabado. Todo lo
# demás llega del pool sin tocar.
printf '#!/usr/bin/env bash\nexec bash "%s/bin/cli" "$@" --provider recorded --grabacion "%s/turnos.json"\n' \
    "$ROOT" "$F" > "$F/thyrox-p"
chmod +x "$F/thyrox-p"

SALIDA="$(printf 'alfa\nbeta\n' | HEADLESS_POOL_RUNNER="$F/thyrox-p" HEADLESS_POOL_TIME="$F/no-existe" \
    HEADLESS_POOL_HISTORY_DIR="$F/hist" bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" \
    --model claude-sonnet-5 --width 2 2>&1)"; CODE=$?

check "el pool sale 0" "$CODE" "0"
check "resumen del pool" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=2 ok=2 fallidos=0"
check "un .json por ítem" "$(find "$F/out" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')" "2"
check "el .json es la línea result, de éxito" "$(cat "$F/out"/*.json | jq -r '"\(.type)/\(.subtype)"' | sort -u)" "result/success"
check "con el texto del modelo" "$(cat "$F/out"/*.json | jq -r .result | sort -u)" "concepto: admisión"
check "el stream abre con system/init" "$(head -1 "$F/out/1.stream.jsonl" | jq -r '"\(.type)/\(.subtype)"')" "system/init"
check "las herramientas del pool llegan acotadas" "$(head -1 "$F/out/1.stream.jsonl" | jq -c .tools)" '["Read"]'
check "una línea assistant por petición, con su uso" "$(cat "$F/out"/*.stream.jsonl | jq -rR 'fromjson? | select(.type=="assistant") | .message.usage.cache_read_input_tokens' | sort | uniq -c | gawk '{print $1"x"$2}')" "2x500"
[[ $FAIL -eq 0 ]] || printf '%s\n' "$SALIDA" | tail -20

# --- extremo a extremo por el túnel: pool → proxy real → servicio de loopback ---
# `thyrox -p` con su proveedor HTTP real. La credencial del pool es un marcador
# local que nunca sale del loopback; el servicio registra la CLASE de
# credencial que le llegó, no su valor.
"$ROOT/bin/provider-anthropic-mock-server" --requests-log "$F/requests.log" > "$F/mock.out" 2>&1 &
MOCK_PID=$!
for _ in $(seq 1 100); do grep -q '^url=' "$F/mock.out" 2>/dev/null && break; sleep 0.1; done
MOCK_URL="$(sed -n 's/^url=//p' "$F/mock.out")"
SALIDA_PROXY="$(printf 'alfa\n' | env -u ANTHROPIC_AUTH_TOKEN -u THYROX_CODE_OAUTH_TOKEN -u THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR \
    ANTHROPIC_BASE_URL="$MOCK_URL" ANTHROPIC_API_KEY=local-loopback-marker \
    HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_HISTORY_DIR="$F/hist-proxy" \
    bash "$POOL" --prompt "$F/prompt.md" --out "$F/out-proxy" --model claude-sonnet-5 --width 1 --credential-proxy 2>&1)"; CODE_PROXY=$?
kill "$MOCK_PID" 2>/dev/null; wait "$MOCK_PID" 2>/dev/null
check "por el túnel: el pool sale 0" "$CODE_PROXY" "0"
check "por el túnel: el ítem termina bien" "$(printf '%s' "$SALIDA_PROXY" | gawk '/^items=/{print}')" "items=1 ok=1 fallidos=0"
check "por el túnel: el servicio recibe la llave que puso el proxy" \
    "$(gawk '/\/v1\/messages/{print $4}' "$F/requests.log" | sort -u)" "auth=x-api-key"
check "por el túnel: el socket no queda al terminar" "$([[ -S "$F/out-proxy/.credential-proxy.sock" ]] && echo queda || echo retirado)" "retirado"
[[ $FAIL -eq 0 ]] || { printf '%s\n' "$SALIDA_PROXY" | tail -20; cat "$F/out-proxy"/*.err 2>/dev/null | tail -20; }

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: headless-pool con thyrox -p)"
[[ $FAIL -eq 0 ]]
