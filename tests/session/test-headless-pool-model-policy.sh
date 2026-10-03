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
  local-fallbacks:*) echo '{"runtime":"ollama","model":"thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95","fallbackModels":["thyrox-b","thyrox-c"]}' ;;
  blocked:*) echo '{"runtime":"blocked","taskClass":"analisis","blockedReason":"ningún modelo permitido cumple"}'; exit 3 ;;
  *) echo '{"runtime":"ollama","model":"thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95"}' ;;
esac
R
printf '#!/usr/bin/env bash\nexit "${ENSURE_EXIT:-0}"\n' > "$F/ensure"
cat > "$F/thyrox-p" <<R
#!/usr/bin/env bash
cat > /dev/null; printf '%s\n' "\$*" >> "$F/runner.log"
printf 'fallbacks=%s\n' "\${THYROX_LOCAL_MODEL_FALLBACKS:-}" >> "$F/runner.env"
echo '{"type":"result","subtype":"success","result":"ok","usage":{}}'
R
chmod +x "$F/recommend" "$F/ensure" "$F/thyrox-p"
pool() {
  : > "$F/recommend.log"; : > "$F/runner.log"
  printf 'alfa\n' | HEADLESS_POOL_RECOMMEND="$F/recommend" HEADLESS_POOL_INFRASTRUCTURE_ENSURE="$F/ensure" \
    HEADLESS_POOL_RUNNER="$F/thyrox-p" HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_HISTORY_DIR="$F/hist" \
    bash "$POOL" --prompt "$F/prompt.md" --task-class analisis --width 1 --out "$F/out-$RANDOM" "$@" 2>&1
}

OUTPUT="$(pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 1: con la política y un Qwen permitido, el pool sale 0" "$CODE" "0"
check "caso 1: la política llega al recomendador" "$(grep -c -- "--policy $F/policy.json" "$F/recommend.log")" "1"

OUTPUT="$(RECOMMEND_MODE=blocked pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 2: una recomendación bloqueada rehúsa con 2" "$CODE" "2"
check "caso 2: y nombra la causa de la política" "$([[ "$OUTPUT" == *"ningún modelo permitido cumple"* ]] && echo si)" "si"
check "caso 2: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

OUTPUT="$(ENSURE_EXIT=1 pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 3: Ollama caído y política sin respaldo rehúsa con 2" "$CODE" "2"
check "caso 3: no pide claude-cli al recomendador" "$(grep -c -- '--runtime claude-cli' "$F/recommend.log")" "0"
check "caso 3: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

# Una política que declara el proveedor en su cadena: el respaldo a claude-cli
# no cambia. Abierta y sin cadena no lo alcanza (casos 15 y 16).
printf '{"allowed":[{"runtime":"ollama","repository":"Qwen/Qwen2.5-7B-Instruct-GGUF"}],"fallback":{"enabled":true,"chain":[{"runtime":"claude-cli"}]}}\n' > "$F/con-respaldo.json"
OUTPUT="$(THYROX_EXECUTION_POLICY="$F/con-respaldo.json" ENSURE_EXIT=1 pool)"; CODE=$?
check "caso 4: con respaldo admitido, el respaldo de hoy no cambia (pide claude-cli)" "$(grep -c -- '--runtime claude-cli' "$F/recommend.log")" "1"

OUTPUT="$(RECOMMEND_MODE=provider pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 5: un proveedor devuelto contra una política sin respaldo rehúsa con 2" "$CODE" "2"
check "caso 5: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

printf '{"allowed":[]}\n' > "$F/sin-respaldo.json"
OUTPUT="$(pool --model-policy "$F/sin-respaldo.json")"; CODE=$?
check "caso 6: una política sin fallback.enabled declarado rehúsa con 2" "$CODE" "2"

# --context-tokens (TASK-THYROX-0781): el contexto que el ítem necesita viaja al
# recomendador. Sin declararlo, el recomendador usa su piso de 126 029 tokens.
OUTPUT="$(pool --model-policy "$F/policy.json" --context-tokens 32768)"; CODE=$?
check "caso 7: con --context-tokens el pool sale 0" "$CODE" "0"
check "caso 7: el recomendador recibe --context 32768" "$(grep -c -- '--context 32768' "$F/recommend.log")" "1"

OUTPUT="$(pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 8: sin --context-tokens el recomendador no recibe --context" "$(grep -c -- '--context' "$F/recommend.log")" "0"

OUTPUT="$(pool --model-policy "$F/policy.json" --context-tokens mucho)"; CODE=$?
check "caso 9: un --context-tokens que no es entero positivo rehúsa con 2" "$CODE" "2"
check "caso 9: y dice que exige un entero positivo" "$([[ "$OUTPUT" == *"--context-tokens exige un entero positivo"* ]] && echo si)" "si"
check "caso 9: sin preguntar al recomendador" "$(wc -l < "$F/recommend.log" | tr -d ' ')" "0"

# Sin --model-policy rige la declarada (THYROX_EXECUTION_POLICY, o la versionada
# del árbol): el pool la entrega al recomendador y defiende su frontera igual.
OUTPUT="$(THYROX_EXECUTION_POLICY="$F/policy.json" RECOMMEND_MODE=provider pool)"; CODE=$?
check "caso 10: la política declarada sin --model-policy rechaza un proveedor con 2" "$CODE" "2"
OUTPUT="$(THYROX_EXECUTION_POLICY="$F/policy.json" pool)"; CODE=$?
check "caso 10: y el recomendador recibe esa política" "$(grep -c -- "--policy $F/policy.json" "$F/recommend.log")" "1"

# TASK-THYROX-0920: el interruptor abierto no basta. Una cadena sin claude-cli
# no deja llegar al proveedor ni por Ollama caído ni por un selector que lo devuelva.
printf '{"allowed":[{"runtime":"ollama","repository":"Qwen/Qwen2.5-7B-Instruct-GGUF"}],"fallback":{"enabled":true,"chain":[{"runtime":"ollama","repository":"Qwen/Qwen2.5-7B-Instruct-GGUF"}]}}\n' > "$F/cadena-local.json"
OUTPUT="$(ENSURE_EXIT=1 pool --model-policy "$F/cadena-local.json")"; CODE=$?
check "caso 11: Ollama caído y cadena sin claude-cli rehúsa con 2" "$CODE" "2"
check "caso 11: no pide claude-cli al recomendador" "$(grep -c -- '--runtime claude-cli' "$F/recommend.log")" "0"
OUTPUT="$(RECOMMEND_MODE=provider pool --model-policy "$F/cadena-local.json")"; CODE=$?
check "caso 12: un proveedor devuelto contra una cadena sin claude-cli rehúsa con 2" "$CODE" "2"
check "caso 12: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"

# TASK-THYROX-0921: los respaldos locales de la recomendación llegan al ítem
# como THYROX_LOCAL_MODEL_FALLBACKS, en su orden; sin respaldos, la variable no se fija.
: > "$F/runner.env"
OUTPUT="$(RECOMMEND_MODE=local-fallbacks pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 13: con respaldos locales el pool sale 0" "$CODE" "0"
check "caso 13: el ítem recibe THYROX_LOCAL_MODEL_FALLBACKS en orden" "$(cat "$F/runner.env")" "fallbacks=thyrox-b,thyrox-c"
check "caso 13: y el anuncio los nombra" "$([[ "$OUTPUT" == *"respaldos locales: thyrox-b,thyrox-c"* ]] && echo si)" "si"
: > "$F/runner.env"
OUTPUT="$(pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 14: sin respaldos, el ítem no recibe la variable" "$(cat "$F/runner.env")" "fallbacks="

# TASK-THYROX-0923: abierto y sin cadena, la cadena se deriva de los locales y
# no alcanza al proveedor: ni por Ollama caído ni por un selector que lo devuelva.
printf '{"allowed":[{"runtime":"ollama","repository":"Qwen/Qwen2.5-7B-Instruct-GGUF"}],"fallback":{"enabled":true}}\n' > "$F/abierta-sin-cadena.json"
OUTPUT="$(ENSURE_EXIT=1 pool --model-policy "$F/abierta-sin-cadena.json")"; CODE=$?
check "caso 15: abierta sin cadena y Ollama caído rehúsa con 2" "$CODE" "2"
check "caso 15: no pide claude-cli al recomendador" "$(grep -c -- '--runtime claude-cli' "$F/recommend.log")" "0"
OUTPUT="$(RECOMMEND_MODE=provider pool --model-policy "$F/abierta-sin-cadena.json")"; CODE=$?
check "caso 16: un proveedor devuelto contra una política sin claude-cli declarado rehúsa con 2" "$CODE" "2"

# TASK-THYROX-0930: --local-only es el modo de la aceptación local. Exige la
# unidad (la ejecución host hereda credenciales) y un runtime local; nunca cae
# al proveedor, ni por el selector ni por un Ollama caído.
OUTPUT="$(pool --model-policy "$F/policy.json" --local-only)"; CODE=$?
check "caso 17: --local-only sin --execution unit rehúsa con 2" "$CODE" "2"
check "caso 17: y lo dice" "$([[ "$OUTPUT" == *"--local-only exige --execution unit"* ]] && echo si)" "si"
check "caso 17: ningún ítem se lanza" "$(wc -l < "$F/runner.log" | tr -d ' ')" "0"
OUTPUT="$(RECOMMEND_MODE=provider pool --model-policy "$F/con-respaldo.json" --local-only --execution unit --work-reference ai-course-notes:cs224r)"; CODE=$?
check "caso 18: --local-only con un proveedor recomendado rehúsa con 2" "$CODE" "2"
check "caso 18: y lo dice" "$([[ "$OUTPUT" == *"--local-only"*"runtime local"* ]] && echo si)" "si"

OUTPUT="$(ENSURE_EXIT=1 pool --model-policy "$F/con-respaldo.json" --local-only --execution unit --work-reference ai-course-notes:cs224r)"; CODE=$?
check "caso 19: --local-only con Ollama caído rehúsa con 2 aunque la política declare el proveedor" "$CODE" "2"
check "caso 19: no pide claude-cli al recomendador" "$(grep -c -- '--runtime claude-cli' "$F/recommend.log")" "0"

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: headless-pool --model-policy)"
[[ $FAIL -eq 0 ]]
