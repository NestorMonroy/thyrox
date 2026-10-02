#!/usr/bin/env bash
# headless-pool con --model-policy (TASK-THYROX-0773): la política del
# consumidor viaja al recomendador, y sin respaldo permitido el pool rehúsa
# en vez de caer a claude-cli —por el recomendador, por el Ollama que no
# arranca, o por un recomendador que devuelva igual un proveedor—.
#
# Qué haría fallar a esta suite:
# - que la política no llegara al recomendador;
# - que una recomendación bloqueada lanzara ítems;
# - que un Ollama caído llevara a pedir --runtime claude-cli pese a la política;
# - que un runtime de proveedor se aceptara contra una política sin respaldo.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POOL="$ROOT/bin/headless-pool"
F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
export THYROX_RUNTIME_DIR="$F/runtime"
PASS=0; FAIL=0
check() { if [[ "$2" == "$3" ]]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fi; }

printf 'Traduce el ítem.\n' > "$F/prompt.md"
printf '{"allowed":[{"runtime":"ollama","repository":"Qwen/Qwen2.5-7B-Instruct-GGUF"}],"fallback":{"enabled":false}}\n' > "$F/policy.json"
# El recomendador: anota sus argumentos y responde según RECOMMEND_MODE.
cat > "$F/recommend" <<R
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$F/recommend.log"
case "\${RECOMMEND_MODE:-local}:\$*" in
  *"--runtime claude-cli"*|provider:*) echo '{"runtime":"claude-cli","model":"claude-haiku-4-5"}' ;;
  blocked:*) echo '{"runtime":"blocked","taskClass":"analisis","blockedReason":"ningún modelo permitido cumple"}'; exit 3 ;;
  *) echo '{"runtime":"ollama","model":"thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95"}' ;;
esac
R
printf '#!/usr/bin/env bash\nexit "${ENSURE_EXIT:-0}"\n' > "$F/ensure"
cat > "$F/thyrox-p" <<R
#!/usr/bin/env bash
cat > /dev/null; printf '%s\n' "\$*" >> "$F/runner.log"
echo '{"type":"result","subtype":"success","result":"ok","usage":{}}'
R
chmod +x "$F/recommend" "$F/ensure" "$F/thyrox-p"
pool() {
  : > "$F/recommend.log"; : > "$F/runner.log"
  printf 'alfa\n' | HEADLESS_POOL_RECOMMEND="$F/recommend" HEADLESS_POOL_INFRASTRUCTURE_ENSURE="$F/ensure" \
    HEADLESS_POOL_RUNNER="$F/thyrox-p" HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_HISTORY_DIR="$F/hist" \
    bash "$POOL" --prompt "$F/prompt.md" --task-class analisis --width 1 --out "$F/out-$RANDOM" "$@" 2>&1
}

SALIDA="$(pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 1: con la política y un Qwen permitido, el pool sale 0" "$CODE" "0"
check "caso 1: la política llega al recomendador" "$(grep -c -- "--policy $F/policy.json" "$F/recommend.log")" "1"

SALIDA="$(RECOMMEND_MODE=blocked pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 2: una recomendación bloqueada rehúsa con 2" "$CODE" "2"
check "caso 2: y nombra la causa de la política" "$([[ "$SALIDA" == *"ningún modelo permitido cumple"* ]] && echo si)" "si"
check "caso 2: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

SALIDA="$(ENSURE_EXIT=1 pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 3: Ollama caído y política sin respaldo rehúsa con 2" "$CODE" "2"
check "caso 3: no pide claude-cli al recomendador" "$(grep -c -- '--runtime claude-cli' "$F/recommend.log")" "0"
check "caso 3: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

SALIDA="$(ENSURE_EXIT=1 pool)"; CODE=$?
check "caso 4: sin política, el respaldo de hoy no cambia (pide claude-cli)" "$(grep -c -- '--runtime claude-cli' "$F/recommend.log")" "1"

SALIDA="$(RECOMMEND_MODE=provider pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 5: un proveedor devuelto contra una política sin respaldo rehúsa con 2" "$CODE" "2"
check "caso 5: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

printf '{"allowed":[]}\n' > "$F/sin-respaldo.json"
SALIDA="$(pool --model-policy "$F/sin-respaldo.json")"; CODE=$?
check "caso 6: una política sin fallback.enabled declarado rehúsa con 2" "$CODE" "2"

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: headless-pool --model-policy)"
[[ $FAIL -eq 0 ]]
