#!/usr/bin/env bash
# Anulaciones de F2b-2: se retira cada mitad de juicio de la ruta /v1/antigravity.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages"
F="provider/src/proxy agent/effort.ts"
run() {
  {
    ( cd provider && timeout 120 bun test __tests__/proxyAntigravity.test.ts __tests__/proxyTranslatorsRequestAntigravityToOpenAI.test.ts __tests__/proxyTranslatorsResponseOpenAIToAntigravity.test.ts __tests__/proxyTranslatorsGeminiToolCallIds.test.ts 2>&1 )
    ( cd mitm && timeout 120 bun test __tests__/aliasConfig.test.ts 2>&1 )
  } 2>&1 | gawk '/^\(fail\)/{print} /^ *[0-9]+ (pass|fail)$/{n[$2]+=$1} END{print " " n["pass"]+0 " pass"; print " " n["fail"]+0 " fail"}'
}
locate() {
  local roots=$1 old=$2 hits
  hits=$(find $roots -name '*.ts' -print0 | OLD="$old" xargs -0 gawk 'BEGINFILE{RS="^$"} index($0, ENVIRON["OLD"]){print FILENAME}')
  [ "$(printf '%s\n' "$hits" | gawk 'NF' | wc -l)" = 1 ] && printf '%s' "$hits"
}
annul() {
  local f; f=$(locate "$1" "$2") || { echo "SIN COINCIDENCIA ÚNICA en $1"; return; }
  echo "   ($f)"; cp "$f" "$f.orig"
  OLD="$2" NEW="$3" bash "$T/bin/replace_literal" "$f" >/dev/null && run
  mv "$f.orig" "$f"
}
echo "== 1: sin abrir el sobre cloudcode"; annul "$F" "  const req = ((body.request as JsonRecord | undefined) ?? body) as JsonRecord" "  const req = body"
echo "== 2: el esfuerzo del alias ignorado"; annul "$F" "normalizeReasoningEffort(body.reasoningEffortOverride))" "undefined)"
echo "== 3: sin el tramo bajo del presupuesto"; annul "$F" "  if (budget <= LOW_EFFORT_MAX_BUDGET) return 'low'
" ""
echo "== 4: sin retirar resultados huérfanos"; annul "$F" "  result.messages = fixToolPairs(messages)" "  result.messages = messages"
echo "== 5: required sin conciliar"; annul "$F" "  preserveRequired(normalized)
" ""
echo "== 6: las claves de Draft 2020-12 sin retirar"; annul "$F" "  stripDraftMeta(normalized)
" ""
echo "== 7: la respuesta sin id toma cualquier llamada"; annul "$F" "      const index = open.findIndex(call => call.generated)" "      const index = -1"
echo "== 7b: la ronda nunca se cierra"; annul "$F" "      if (madeCalls && roundEnded) openCalls.clear()
" ""
echo "== 8: las llamadas acumuladas nunca salen"; annul "$F" "      parts.push({ functionCall: { name: call.name, args: parseArgs(call.arguments) } })" "      void call"
echo "== 9: sin stream, la respuesta OpenAI tal cual"; annul "$F" "Response.json(openaiCompletionToAntigravity((await chat.json()) as JsonRecord), { status: chat.status })" "chat"
echo "== 10: con stream, los trozos OpenAI tal cual"; annul "$F" "        const event = openaiToAntigravityResponse(chunk, state)" "        const event = chunk"
echo "== 11: la ruta sin montar"; annul "$F" "  if (request.method === 'POST' && pathname === ANTIGRAVITY_PATH) {" "  if (false) {"
echo "== 12: sin el sinónimo extra"; annul "$F" "  return EFFORT_SYNONYMS[lowered] ?? (isEffortLevel(lowered) ? lowered : undefined)" "  return isEffortLevel(lowered) ? lowered : undefined"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src src/packages/agent/effort.ts; run
