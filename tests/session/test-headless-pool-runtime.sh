#!/usr/bin/env bash
# Suite del runtime de los ítems de src/session/headless-pool.sh: el selector
# devuelve `runtime` ("ollama" | "claude-cli") junto al modelo, y el pool
# asegura el Ollama gestionado o cae a `claude-cli` declarándolo. Al ítem no le
# exporta ningún upstream compatible con OpenAI: su proxy pide el modelo al
# coordinador (ADR-007 1.14.0, M8).
#
# Ni Ollama ni podman reales: el selector es un doble por
# HEADLESS_POOL_RECOMMEND, el arranque del servicio otro por
# HEADLESS_POOL_INFRASTRUCTURE_ENSURE, y el ejecutor del ítem uno que publica
# el modelo y el entorno que recibió.
set -uo pipefail
# Esta suite mide la mecánica del pool, no la política de ejecución: la declara
# sin restricción (sin ella regiría la versionada del árbol, que no admite respaldo).
THYROX_EXECUTION_POLICY="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)/execution_policy_unrestricted.json"
export THYROX_EXECUTION_POLICY
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
POOL="$ROOT/src/session/headless-pool.sh"
failures=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; failures=$((failures+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
export THYROX_RUNTIME_DIR="$F/runtime"
unset THYROX_OPENAI_COMPAT_BASE_URL THYROX_OPENAI_COMPAT_MODEL THYROX_INFRA_OLLAMA_PORT

# El selector responde lo que diga RECOMMEND_REPLY; con `--runtime claude-cli`
# responde el respaldo forzado. Cada llamada queda en su registro.
cat > "$F/recommend" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$RECOMMEND_LOG"
case " $* " in
  *" --runtime claude-cli "*) printf '{"runtime":"claude-cli","model":"claude-sonnet-5","taskClass":"%s"}\n' "$1" ;;
  *) printf '%s\n' "$RECOMMEND_REPLY" ;;
esac
EOF
# El arranque del servicio: registra su argumento y sale con ENSURE_EXIT.
cat > "$F/ensure" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$ENSURE_LOG"
exit "${ENSURE_EXIT:-0}"
EOF
cat > "$F/runner" <<'EOF'
#!/usr/bin/env bash
cat >/dev/null
model=""
while [[ $# -gt 0 ]]; do case "$1" in --model) model="$2"; shift 2 ;; *) shift ;; esac; done
r="model=$model|base=${THYROX_OPENAI_COMPAT_BASE_URL:-none}|open=${THYROX_OPENAI_COMPAT_MODEL:-none}"
jq -cn --arg r "$r" '{type:"result",result:$r}'
EOF
chmod +x "$F/recommend" "$F/ensure" "$F/runner"
printf 'Lee.\n' > "$F/prompt.md"
export HEADLESS_POOL_RECOMMEND="$F/recommend" HEADLESS_POOL_INFRASTRUCTURE_ENSURE="$F/ensure" HEADLESS_POOL_RUNNER="$F/runner"
export RECOMMEND_LOG="$F/recommend.log" ENSURE_LOG="$F/ensure.log"

run_pool() {
    rm -rf "$F/out" "$RECOMMEND_LOG" "$ENSURE_LOG"
    OUTPUT="$(printf 'alfa\n' | HEADLESS_POOL_TIME="$F/missing" HEADLESS_POOL_HISTORY_DIR="$(mktemp -d -p "$F")" \
        bash "$POOL" --prompt "$F/prompt.md" --out "$F/out" --task-class analisis --width 1 "$@" 2>&1)"; CODE=$?
}
item_result() { cat "$F"/out/*.json 2>/dev/null | jq -r .result; }
model_line() { printf '%s\n' "$OUTPUT" | gawk '/^modelo: /{print; exit}'; }
lines_of() { [[ -f "$1" ]] && wc -l < "$1" || echo 0; }

# 1 — ollama: asegura thyrox-ollama y el ítem recibe el upstream abierto.
RECOMMEND_REPLY='{"runtime":"ollama","model":"thyrox-qwen","taskClass":"analisis"}' run_pool
check "ollama: exit 0" "$CODE" "0"
check "ollama: asegura el servicio gestionado" "$(cat "$ENSURE_LOG" 2>/dev/null)" "thyrox-ollama"
# M8 (ADR-007 1.14.0): el ítem recibe sólo el modelo; su proxy lo pide al
# coordinador. Ninguna base URL ni modelo abierto viajan por el entorno.
check "ollama: el ítem recibe el modelo y ningún upstream por entorno" "$(item_result)" "model=thyrox-qwen|base=none|open=none"
check "ollama: la línea modelo dice el runtime" "$(model_line)" "modelo: thyrox-qwen (derivado de --task-class analisis) runtime: ollama"

# 2 — el puerto del servicio es el declarado.
RECOMMEND_REPLY='{"runtime":"ollama","model":"thyrox-qwen","taskClass":"analisis"}' THYROX_INFRA_OLLAMA_PORT=6123 run_pool
check "puerto declarado: tampoco viaja al ítem" "$(item_result)" "model=thyrox-qwen|base=none|open=none"

# 3 — el servicio no arranca: cae a claude-cli con el selector forzado y lo dice.
RECOMMEND_REPLY='{"runtime":"ollama","model":"thyrox-qwen","taskClass":"analisis"}' ENSURE_EXIT=3 run_pool
check "respaldo por servicio: exit 0" "$CODE" "0"
check "respaldo por servicio: pide el proveedor forzado" "$(gawk 'index($0, "--runtime claude-cli"){n++} END{print n+0}' "$RECOMMEND_LOG")" "1"
check "respaldo por servicio: el ítem va a claude sin upstream abierto" "$(item_result)" "model=claude-sonnet-5|base=none|open=none"
check "respaldo por servicio: la línea nombra runtime y motivo" "$(model_line)" "modelo: claude-sonnet-5 (derivado de --task-class analisis) runtime: claude-cli — respaldo: thyrox-ollama no arrancó (infrastructure_ensure salió 3)"

# 4 — el selector ya cae: el motivo llega a la línea y no se toca el servicio.
RECOMMEND_REPLY='{"runtime":"claude-cli","model":"claude-sonnet-5","taskClass":"analisis","fallbackReason":"catálogo vacío"}' run_pool
check "respaldo del selector: exit 0" "$CODE" "0"
check "respaldo del selector: no asegura el servicio" "$(lines_of "$ENSURE_LOG")" "0"
check "respaldo del selector: la línea lleva su motivo" "$(model_line)" "modelo: claude-sonnet-5 (derivado de --task-class analisis) runtime: claude-cli — respaldo: catálogo vacío"
check "respaldo del selector: sin upstream abierto" "$(item_result)" "model=claude-sonnet-5|base=none|open=none"

# 5 — runtime y modelo tienen que casar; un runtime desconocido rehúsa.
RECOMMEND_REPLY='{"runtime":"ollama","model":"claude-sonnet-5"}' run_pool
check "ollama con id claude: exit 2" "$CODE" "2"
check "ollama con id claude: no asegura el servicio" "$(lines_of "$ENSURE_LOG")" "0"
RECOMMEND_REPLY='{"runtime":"claude-cli","model":"thyrox-qwen"}' run_pool
check "claude-cli con nombre thyrox: exit 2" "$CODE" "2"
RECOMMEND_REPLY='{"runtime":"vllm","model":"thyrox-qwen"}' run_pool
check "runtime desconocido: exit 2" "$CODE" "2"
check "runtime desconocido: lo nombra" "$(printf '%s' "$OUTPUT" | gawk 'index($0, "vllm"){n++} END{print n+0}')" "1"

# 6 — sin `runtime` el registro es el del selector de catálogo: claude-cli.
RECOMMEND_REPLY='{"kind":"analisis","model":"claude-sonnet-5"}' run_pool
check "sin runtime: exit 0" "$CODE" "0"
check "sin runtime: claude-cli sin motivo" "$(model_line)" "modelo: claude-sonnet-5 (derivado de --task-class analisis) runtime: claude-cli"

# 7 — `claude -p` no habla con Ollama: rehúsa antes de asegurar nada.
RECOMMEND_REPLY='{"runtime":"ollama","model":"thyrox-qwen"}' run_pool --runner claude
check "runner claude con ollama: exit 2" "$CODE" "2"
check "runner claude con ollama: no asegura el servicio" "$(lines_of "$ENSURE_LOG")" "0"

echo "$((total - failures))/$total aserciones"
[[ "$failures" -eq 0 ]]
