#!/usr/bin/env bash
# Delega un ítem del banco a `thyrox -p` con un modelo por API, dentro de la
# ExecutionUnit que lo ejecuta. La clave llega montada (ExecutionSecret) y pasa
# sólo al entorno del proceso `thyrox -p`. Deja el stream y una línea en el
# libro del corte con el proveedor que hizo el juicio.
# Uso: delegate.sh <banco> <ítem> <modelo> <prompt.md> [max-turns]
set -uo pipefail
workbench="$1" item="$2" model="$3" prompt="$4" turns="${5:-150}"
secret=/run/secrets/THYROX_OPENAI_COMPAT_API_KEY
[[ -s "$secret" ]] || { echo "delegate: credencial ausente en la unidad" >&2; exit 2; }
bash "$workbench/probes/unit_identity.sh" "$workbench" "$item" "delegate-$model"
stream="$workbench/outputs/$item-$model.stream.jsonl"
cd /home/user/thyrox
ANTHROPIC_BASE_URL=https://token-plan.maas.qwencloudapi.com/apps/anthropic ANTHROPIC_API_KEY="$(cat "$secret")" \
  THYROX_CODE_PROMPT_CACHE_TTL=5m \
  bash bin/cli -p --model "$model" --setting-sources project --tools Read,Bash --allowedTools Read,Bash \
  --max-turns "$turns" --no-session-persistence --output-format stream-json --verbose \
  "$(cat "$prompt")" < /dev/null > "$stream" 2> "$workbench/outputs/$item-$model.stderr.log"
code=$?
result="$(jq -c 'select(.type == "result")' "$stream" 2>/dev/null | tail -1)"
container="$(gawk -F: '$1 == "0" { print $3 }' /proc/self/cgroup | gawk 'match($0, /libpod-[0-9a-f]+/) { print substr($0, RSTART + 7, RLENGTH - 7) }')"
jq -cn --arg item "$item" --arg model "$model" --arg container "$container" --arg code "$code" --argjson r "${result:-null}" '{
  utc: (now | todate), kind: "delegated-judgment", executionId: $container[0:12], item: $item,
  provider: "token-plan", model: $model, containerId: $container, judgmentProvider: ("token-plan:" + $model),
  inputTokens: ($r.usage.input_tokens // null), outputTokens: ($r.usage.output_tokens // null),
  cachedTokens: ($r.usage.cache_read_input_tokens // null), exit: ($code | tonumber),
  result: ($r.subtype // "sin resultado"), turns: ($r.num_turns // null), claudeInvocations: 0}' >> "$workbench/outputs/cutover-executions.jsonl"
exit "$code"
