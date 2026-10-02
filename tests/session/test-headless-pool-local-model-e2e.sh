#!/usr/bin/env bash
# De extremo a extremo con dobles (TASK-THYROX-0774): un ítem del pool con
# --execution unit y una política sin respaldo llega, por la primitiva (doble:
# entorno vacío salvo lo nombrado), al `thyrox -p` REAL, cuyo proxy local REAL
# pide la admisión al transporte REAL del coordinador y alcanza sólo el
# endpoint de la unidad del ticket. Dobles: el coordinador y su runtime
# (`doubles/fake-model-coordinator.ts`), el recomendador, el ensure y el runner
# de la primitiva. Prueba la selección y el camino; NO que un modelo real corrió.
#
# Qué haría fallar a esta suite:
# - que la unidad no recibiera el socket del coordinador (la admisión no llega);
# - que el ítem corriera en el anfitrión en vez de pedir la ejecución;
# - que algo invocara `claude` (hay uno falso en el PATH que se anota);
# - que el modelo pedido al runtime no fuera el que concede el grant.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POOL="$ROOT/bin/headless-pool"
F="$(mktemp -d)"; COORD_PID=""
trap '[[ -n "$COORD_PID" ]] && kill "$COORD_PID" 2>/dev/null; rm -rf "$F"' EXIT
export THYROX_RUNTIME_DIR="$F/runtime"
PASS=0; FAIL=0
check() { if [[ "$2" == "$3" ]]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fi; }

MODEL="thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95"
GRANTED="qwen2.5-7b-instruct-q4_k_m"
mkdir -p "$F/coord" "$F/bin"
bun "$ROOT/tests/session/doubles/fake-model-coordinator.ts" "$F/coord/coordinator.sock" "$F/coord.log" "$GRANTED" > "$F/coord.out" 2>&1 &
COORD_PID=$!
for _ in $(seq 1 100); do grep -q '^ready' "$F/coord.out" 2>/dev/null && break; sleep 0.1; done
check "el coordinador doble escucha" "$(grep -c '^ready' "$F/coord.out")" "1"

printf 'Traduce el ítem.\n' > "$F/prompt.md"
printf '{"allowed":[{"runtime":"ollama","repository":"Qwen/Qwen2.5-7B-Instruct-GGUF"}],"fallback":{"enabled":false}}\n' > "$F/policy.json"
printf '#!/usr/bin/env bash\necho %s\n' "'{\"runtime\":\"ollama\",\"model\":\"$MODEL\"}'" > "$F/recommend"
printf '#!/usr/bin/env bash\nexit 0\n' > "$F/ensure"
printf '#!/usr/bin/env bash\necho "$*" >> "%s"\nexit 1\n' "$F/claude.log" > "$F/bin/claude"
cat > "$F/execute" <<R
#!/usr/bin/env bash
[[ "\$1" == run ]] || exit 2
args=(); keep=(); while [[ \$# -gt 0 && "\$1" != "--" ]]; do
  [[ "\$1" == --env ]] && keep+=("\$2=\${!2}"); args+=("\$1"); shift; done; shift
printf '%s\n' "\${args[*]}" >> "$F/execute.log"
exec env -i PATH="\$PATH" HOME="\$HOME" "\${keep[@]}" "\$@"
R
chmod +x "$F/recommend" "$F/ensure" "$F/bin/claude" "$F/execute"

SALIDA="$(printf 'alfa\n' | PATH="$F/bin:$PATH" HEADLESS_POOL_RECOMMEND="$F/recommend" HEADLESS_POOL_INFRASTRUCTURE_ENSURE="$F/ensure" \
  THYROX_MANAGED_EXECUTION_RUNNER="$F/execute" THYROX_MODEL_COORDINATOR_SOCKET="$F/coord/coordinator.sock" \
  HEADLESS_POOL_TIME="$F/no-existe" HEADLESS_POOL_HISTORY_DIR="$F/hist" \
  bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --task-class mecanica --width 1 --timeout 180 \
    --execution unit --work-reference ai-course-notes:e2e --model-policy "$F/policy.json" 2>&1)"; CODE=$?
check "el pool sale 0" "$CODE" "0"
check "el ítem termina bien" "$(printf '%s' "$SALIDA" | gawk '/^items=/{print}')" "items=1 ok=1 fallidos=0"
check "el ítem pidió su ejecución con la referencia del consumidor" "$(grep -c -- '--work ai-course-notes:e2e/1' "$F/execute.log" 2>/dev/null)" "1"
check "el coordinador recibió la admisión del modelo local" "$(jq -r 'select(.kind=="admit") | .model' "$F/coord.log" 2>/dev/null | sort -u)" "$MODEL"
check "el runtime recibió el modelo que concede el grant" "$(jq -r 'select(.kind=="chat") | .model' "$F/coord.log" 2>/dev/null | sort -u)" "$GRANTED"
check "la respuesta del runtime llega al resultado del ítem" "$(jq -r '.result // empty' "$F/out/1.json" 2>/dev/null)" "traducción de prueba"
check "nada invocó claude" "$(cat "$F/claude.log" 2>/dev/null | wc -l | tr -d ' ')" "0"
[[ $FAIL -eq 0 ]] || { printf '%s\n' "$SALIDA" | tail -15; tail -20 "$F/out"/*.err 2>/dev/null; cat "$F/coord.out"; }

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: modelo local por el coordinador desde la unidad, con dobles)"
[[ $FAIL -eq 0 ]]
