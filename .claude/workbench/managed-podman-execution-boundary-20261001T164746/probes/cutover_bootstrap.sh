#!/usr/bin/env bash
# Calificación bootstrap de un modelo por API, dentro de una ExecutionUnit.
# La clave llega montada en /run/secrets/<NOMBRE> (ExecutionSecret); se lee a
# un archivo de cabecera 0600 que nunca se imprime, y a una variable de entorno
# del proceso `thyrox -p`, nunca a argv. Escribe una línea JSON por criterio en
# <banco>/outputs/cutover-bootstrap-<modelo>.jsonl y una línea de corte.
# Uso: cutover_bootstrap.sh <banco> <modelo>
set -uo pipefail
workbench="$1" model="$2"
credential=THYROX_OPENAI_COMPAT_API_KEY
secret_file="/run/secrets/$credential"
openai_base=https://token-plan.maas.qwencloudapi.com/compatible-mode/v1
anthropic_base=https://token-plan.maas.qwencloudapi.com/apps/anthropic
out="$workbench/outputs/cutover-bootstrap-$model.jsonl"
: > "$out"
scratch="$(mktemp -d)"; trap 'rm -rf -- "${scratch:?}"' EXIT
record() { jq -cn --arg model "$model" --arg check "$1" --arg ok "$2" --argjson detail "${3:-null}" '{model: $model, check: $check, ok: ($ok == "yes"), detail: $detail}' >> "$out"; }
headers="$scratch/headers"; umask 077
if [[ -s "$secret_file" ]]; then
  printf 'Authorization: Bearer %s\nContent-Type: application/json\n' "$(cat "$secret_file")" > "$headers"
  record secret_visible yes '{"credential": "THYROX_OPENAI_COMPAT_API_KEY", "rotationStatus": "pending"}'
else
  record secret_visible no '{"credential": "THYROX_OPENAI_COMPAT_API_KEY"}'; exit 2
fi
chat() { curl -sS --max-time 120 -H @"$headers" -d @- "$openai_base/chat/completions"; }
usage_of() { jq -c '{prompt: .usage.prompt_tokens, completion: .usage.completion_tokens, cached: (.usage.prompt_tokens_details.cached_tokens // 0)}' 2>/dev/null; }
# 2-3: autenticación y respuesta simple
reply="$(jq -cn --arg m "$model" '{model: $m, messages: [{role: "user", content: "Responde exactamente: listo"}], max_tokens: 1024}' | chat)"
if jq -e '.choices[0].message' >/dev/null 2>&1 <<<"$reply"; then
  record authentication yes '{"result": "success"}'
  content="$(jq -r '.choices[0].message.content // ""' <<<"$reply")"
  record simple_request "$( [[ "${content,,}" == *listo* ]] && echo yes || echo no )" "$(jq -c '{content: .choices[0].message.content, usage: {prompt: .usage.prompt_tokens, completion: .usage.completion_tokens}}' <<<"$reply")"
else
  record authentication no "$(jq -c '{error: (.error // .)}' <<<"$reply" 2>/dev/null || echo '{"error": "respuesta ilegible"}')"; exit 3
fi
# 4: contexto (dos veces, para ver la caché del proveedor)
context="$(head -c 24000 /home/user/thyrox/src/session/headless-pool.sh)"
for attempt in 1 2; do
  reply="$(jq -cn --arg m "$model" --arg c "$context" '{model: $m, messages: [{role: "system", content: $c}, {role: "user", content: "¿Qué variable de entorno declara el doble del ejecutor de ítems? Responde sólo el nombre."}], max_tokens: 1024}' | chat)"
  answer="$(jq -r '.choices[0].message.content // ""' <<<"$reply")"
  [[ "$answer" == *HEADLESS_POOL_RUNNER* ]] && ok=yes || ok=no
  record "context_request_$attempt" "$ok" "$(jq -c --arg a "$answer" '{answer: $a, usage: {prompt: .usage.prompt_tokens, completion: .usage.completion_tokens, cached: (.usage.prompt_tokens_details.cached_tokens // 0)}}' <<<"$reply")"
done
# 5: tool call estructurado
reply="$(jq -cn --arg m "$model" '{model: $m, max_tokens: 1024,
  tools: [{type: "function", function: {name: "read_file", description: "Lee un archivo del repositorio", parameters: {type: "object", properties: {path: {type: "string"}}, required: ["path"]}}}],
  messages: [{role: "user", content: "Usa la herramienta read_file para leer README.md."}]}' | chat)"
tool="$(jq -c '.choices[0].message.tool_calls[0].function // empty' <<<"$reply")"
if [[ -n "$tool" ]] && jq -e '.name == "read_file" and ((.arguments | fromjson).path | test("README"))' >/dev/null 2>&1 <<<"$tool"; then ok=yes; else ok=no; fi
record structured_tool_call "$ok" "$(jq -c --argjson t "${tool:-null}" '{toolCall: $t, usage: {prompt: .usage.prompt_tokens, completion: .usage.completion_tokens}}' <<<"$reply")"
# 6-8: thyrox -p contra el endpoint Anthropic-compatible: leer un archivo y modificarlo de forma controlada
repo="$scratch/repo"; mkdir -p "$repo"; git -C "$repo" init -q
printf 'linea uno\nmarcador: alfa\n' > "$repo/notes.txt"
git -C "$repo" add notes.txt; git -C "$repo" -c user.name=t -c user.email=t@t commit -qm seed
stream="$scratch/stream.jsonl"
(cd "$repo" && ANTHROPIC_BASE_URL="$anthropic_base" ANTHROPIC_API_KEY="$(cat "$secret_file")" THYROX_CODE_PROMPT_CACHE_TTL=5m \
  timeout 240 bash /home/user/thyrox/bin/cli -p --model "$model" --setting-sources project --tools Read,Bash --allowedTools Read,Bash \
  --max-turns 6 --no-session-persistence --output-format stream-json --verbose \
  "Lee notes.txt. Luego añade al final del archivo, con Bash, exactamente una línea nueva con el texto: marcador: beta. No cambies nada más. Al terminar responde sólo: hecho" \
  < /dev/null > "$stream" 2> "$scratch/stderr")
exit_code=$?
result="$(jq -c 'select(.type == "result")' "$stream" 2>/dev/null | tail -1)"
reads="$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .name' "$stream" 2>/dev/null | sort | uniq -c | tr -s ' \n' ' ')"
diff="$(git -C "$repo" diff -U0 -- notes.txt | grep -E '^[+-][^+-]' | tr '\n' '|')"
record file_read "$( [[ "$reads" == *Read* || "$reads" == *Bash* ]] && echo yes || echo no )" "$(jq -cn --arg r "$reads" '{toolUses: $r}')"
record controlled_modification "$( [[ "$diff" == "+marcador: beta|" ]] && echo yes || echo no )" "$(jq -cn --arg d "$diff" --arg e "$exit_code" '{diff: $d, exit: ($e | tonumber)}')"
record parseable_result "$( [[ -n "$result" ]] && echo yes || echo no )" "$(jq -c '{subtype, is_error, result: (.result // "" | .[0:80]), usage: .usage}' <<<"${result:-{\}}" 2>/dev/null || echo null)"
[[ -n "$result" ]] || record thyrox_stderr no "$(grep -v -F -f "$secret_file" "$scratch/stderr" | tail -c 600 | jq -Rs '{tail: .}')"
# 10: ninguna invocación de Claude
claude_bin="$(command -v claude || true)"
record claude_invocations "$( [[ -z "$claude_bin" ]] && echo yes || echo no )" "$(jq -cn --arg b "$claude_bin" --arg u "$anthropic_base" '{claudeBinary: (if $b == "" then null else $b end), anthropicBaseUrl: $u, count: 0}')"
