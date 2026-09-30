#!/usr/bin/env bash
# Anulaciones de F2b-1: se retira cada mitad de juicio del handler antigravity.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
F="src/handlers src/targets"
run() { timeout 120 bun test __tests__/handlers/antigravity.test.ts __tests__/targets/targetsAdaptation.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin abrir el sobre cloudcode-pa"; annul "$F" "  return holdsConversation ? inner : body" "  return body"
echo "== 2: el turno model como user"; annul "$F" "role: content.role === 'model' ? 'assistant' : 'user'" "role: 'user'"
echo "== 3: sin traducir generationConfig"; annul "$F" "  if (config.maxOutputTokens != null) openaiBody.max_tokens = config.maxOutputTokens
" ""
echo "== 4: stream fijo"; annul "$F" "url.includes(':streamGenerateContent')" "true"
echo "== 5: un modelo dinámico pisa al nativo"; annul "$F" "    if (!model.id || merged[model.id]) continue" "    if (!model.id) continue"
echo "== 6: los inyectados al final del grupo"; annul "$F" "  firstGroup.modelIds = [...injected, ...existing.filter(id => !injected.includes(id))]" "  firstGroup.modelIds = [...existing, ...injected]"
echo "== 7: fetchAvailableModels como conversación"; annul "$F" "      if (url.includes(':fetchAvailableModels')) {" "      if (false) {"
echo "== 8: la copia del inspector sin nombres del CLI"; annul "$F" "sink.push(withCliToolNames(chunk.toString()))" "sink.push(chunk.toString())"
echo "== 9: el catálogo del proxy sin su clave"; annul "$F" "      headers: key ? { authorization: \`Bearer \${key}\` } : {}," "      headers: {},"
echo "== 10: el destino sin su handler"; annul "$F" "  handler: () => Promise.resolve({ default: AntigravityHandler })," "  handler: () => Promise.reject(new Error('x')),"
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
