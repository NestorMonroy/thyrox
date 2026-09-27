#!/usr/bin/env bash
# headless-pool con `thyrox -p` en lugar de `claude -p` (TASK-THYROX-0257).
#
# El pool lanza cada ítem con la línea de comando fija de `claude -p`
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
printf '#!/usr/bin/env bash\nexec bash "%s/bin/cli-main" "$@" --provider recorded --grabacion "%s/turnos.json"\n' \
    "$ROOT" "$F" > "$F/thyrox-p"
chmod +x "$F/thyrox-p"

SALIDA="$(printf 'alfa\nbeta\n' | HEADLESS_POOL_CLAUDE="$F/thyrox-p" HEADLESS_POOL_TIME="$F/no-existe" \
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

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: headless-pool con thyrox -p)"
[[ $FAIL -eq 0 ]]
