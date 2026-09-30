#!/usr/bin/env bash
# Controles de anulación: cada uno retira una rama, mide qué cae y restaura el archivo desde su copia.
set -u
RL=../../../bin/replace_literal
T=src/proxy/__tests__/claudeCliUpstream.test.ts
run() { timeout 120 bun test "$T" 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$' | sed 's/^/    /'; }
control() {
  local name="$1" file="$2" old="$3" new="$4"
  local copy; copy="$(mktemp)"; cp "$file" "$copy"
  echo "== $name"
  if OLD="$old" NEW="$new" bash "$RL" "$file" >/dev/null; then run; else echo "    (no se pudo aplicar la anulación)"; fi
  cp "$copy" "$file"; rm -f "$copy"
}
F=src/proxy/claudeCli/forwarder.ts
S=src/proxy/server.ts
control "A: sin descartar ANTHROPIC_BASE_URL del entorno del hijo" "$F" \
  "  for (const name of STRIPPED_CHILD_ENV) delete env[name]" "  void STRIPPED_CHILD_ENV"
control "B: el plazo del turno suspendido no abandona nada" "$F" \
  "      registry.hold(turn, upstream.pendingResultTtlMs ?? DEFAULT_PENDING_RESULT_TTL_MS, held => abandon(held, ABANDONED_REASON))
      return respond" "      registry.hold(turn, upstream.pendingResultTtlMs ?? DEFAULT_PENDING_RESULT_TTL_MS, () => {})
      return respond"
control "C: el tool_result no localiza la conversación por el id del tool_use" "$F" \
  "      const sessionId = registry.sessionOf(toolUseIds.map(toolUseAlias))" "      const sessionId = undefined as string | undefined"
control "D: al terminar no se registra la clave de prefijo de la historia" "$F" \
  "    registry.bind(turn.sessionId, [prefixAlias(conversationPrefixKey([...messages, { role: 'assistant', content }]))])
    return respond" "    return respond"
control "F: el puente no se sirve antes del control de acceso" "$S" \
  "  if (bridgeToken !== undefined && config.claudeCliBridge) return config.claudeCliBridge(bridgeToken, request)" "  void bridgeToken"
echo "== restaurado: git diff --stat de los dos archivos frente a la copia de trabajo previa"
