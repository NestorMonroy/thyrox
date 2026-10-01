#!/usr/bin/env bash
# Delega un ítem del banco a `thyrox -p` con un modelo por API, dentro de la
# ExecutionUnit que lo ejecuta. La clave llega montada (ExecutionSecret) y pasa
# sólo al entorno del proceso `thyrox -p`. Deja el stream, el transcript en vivo
# y una línea en el libro del corte con el proveedor que hizo el juicio.
# Uso: delegate.sh <banco> <ítem> <modelo> <prompt.md> [max-turns]
# Salidas: la de thyrox -p; 124 si vence DELEGATE_TIMEOUT_SECONDS; 125 si no hubo
# actividad medida durante DELEGATE_STALL_SECONDS (ver más abajo).
set -uo pipefail
workbench="$1" item="$2" model="$3" prompt="$4" turns="${5:-150}"
timeout_seconds="${DELEGATE_TIMEOUT_SECONDS:-2700}"
# Actividad = el transcript cambió, o el árbol de procesos del trabajador
# consumió CPU desde el sondeo anterior (una herramienta larga no escribe el
# transcript, pero corre). Un stream vacío NO es inactividad: thyrox -p
# construye el stream-json al terminar.
stall_seconds="${DELEGATE_STALL_SECONDS:-900}"
poll_seconds="${DELEGATE_POLL_SECONDS:-30}"
# Techo operativo de contexto para los modelos del Token Plan, que el catálogo
# no conoce: no es su ventana real (una petición de 344 k tokens responde 200)
# sino un límite por debajo de donde los trabajadores midieron 502 (102 k,
# 111 k, 114 k; outputs/p2-provider-502-size.txt). Con 110 000 el bucle compacta
# hacia los 77 k.
declared_window="${DELEGATE_CONTEXT_WINDOW:-110000}"
secret="${DELEGATE_SECRET_FILE:-/run/secrets/THYROX_OPENAI_COMPAT_API_KEY}"
# Doble de prueba: otra orden en lugar de `bash bin/cli` (tests/test_delegate_stall.sh).
cli="${DELEGATE_CLI:-bin/cli}"
[[ -s "$secret" ]] || { echo "delegate: credencial ausente en la unidad" >&2; exit 2; }
bash "$workbench/probes/unit_identity.sh" "$workbench" "$item" "delegate-$model"
stream="$workbench/outputs/$item-$model.stream.jsonl"
# thyrox -p persiste el transcript turno a turno en ~/.harness/<slug>; el enlace
# lo deja en el banco mientras corre, así sobrevive a la unidad y mide actividad.
transcript="$workbench/outputs/$item-$model.transcript"
mkdir -p "$transcript"
[[ -e "$HOME/.harness" ]] || ln -s "$transcript" "$HOME/.harness"
cd /home/user/thyrox
ANTHROPIC_BASE_URL=https://token-plan.maas.qwencloudapi.com/apps/anthropic ANTHROPIC_API_KEY="$(cat "$secret")" \
  THYROX_CODE_PROMPT_CACHE_TTL=5m THYROX_CODE_DECLARED_CONTEXT_WINDOW="$declared_window" \
  timeout "$timeout_seconds" bash "$cli" -p --model "$model" --setting-sources project --tools Read,Bash --allowedTools Read,Bash \
  --max-turns "$turns" --output-format stream-json --verbose \
  "$(cat "$prompt")" < /dev/null > "$stream" 2> "$workbench/outputs/$item-$model.stderr.log" &
worker=$!
cpu_ticks() { local pid total=0; for pid in "$@"; do
  total=$(( total + $(gawk '{ print $14 + $15 }' "/proc/$pid/stat" 2>/dev/null || echo 0) )); done; echo "$total"; }
descendants() { local pid="$1" child; for child in $(pgrep -P "$pid"); do echo "$child"; descendants "$child"; done; }
last_activity=$(date +%s) stalled=0 seen=""
while kill -0 "$worker" 2>/dev/null; do
  sleep "$poll_seconds"
  newest="$(find "$transcript" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)"
  # Las herramientas son nietos: timeout -> bash bin/cli -> bun -> herramienta.
  ticks="$(cpu_ticks "$worker" $(descendants "$worker"))"
  state="${newest:-0}:$ticks"
  if [[ "$state" != "$seen" ]]; then
    seen="$state" last_activity=$(date +%s)
  elif (( $(date +%s) - last_activity >= stall_seconds )); then
    echo "delegate: sin actividad medida durante ${stall_seconds}s; se detiene" >&2
    stalled=1
    kill -TERM "$worker" 2>/dev/null
    for child in $(descendants "$worker"); do kill -TERM "$child" 2>/dev/null; done
    break
  fi
done
wait "$worker"
code=$?
(( stalled )) && code=125
result="$(jq -c 'select(.type == "result")' "$stream" 2>/dev/null | tail -1)"
container="$(gawk -F: '$1 == "0" { print $3 }' /proc/self/cgroup | gawk 'match($0, /libpod-[0-9a-f]+/) { print substr($0, RSTART + 7, RLENGTH - 7) }')"
jq -cn --arg item "$item" --arg model "$model" --arg container "$container" --arg code "$code" --argjson r "${result:-null}" '{
  utc: (now | todate), kind: "delegated-judgment", executionId: $container[0:12], item: $item,
  provider: "token-plan", model: $model, containerId: $container, judgmentProvider: ("token-plan:" + $model),
  inputTokens: ($r.usage.input_tokens // null), outputTokens: ($r.usage.output_tokens // null),
  cachedTokens: ($r.usage.cache_read_input_tokens // null), exit: ($code | tonumber),
  result: ($r.subtype // "sin resultado"), turns: ($r.num_turns // null), claudeInvocations: 0}' >> "$workbench/outputs/cutover-executions.jsonl"
exit "$code"
