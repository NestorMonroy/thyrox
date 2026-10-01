#!/usr/bin/env bash
# Porta las suites de contextManager de OmniRoute (a58000c7) a bun:test.
# Cabecera nueva por archivo; el cuerpo se copia de los tramos indicados.
set -euo pipefail
REF=/home/user/nestormonroy/omniroute/tests/unit
DST=/home/user/thyrox/src/packages/provider/__tests__
IMPORT="const CM = (await import(process.env.CONTEXT_MANAGER_MODULE ?? '../src/proxy/context/contextManager.ts')) as typeof import('../src/proxy/context/contextManager.ts')"
ALL='const { compressContext, estimateTokens, getTokenLimit, fixToolPairs, fixToolAdjacency, stripTrailingAssistantOrphanToolUse, stripTrailingAssistantForProvider, isInlineBase64DocumentBlock, isInlineBase64ImageBlock, pruneOlderInlineImages } = CM'
TEST="import { test } from 'bun:test'"
SUITE="import { describe, it } from 'bun:test'"
ASSERT="import assert from 'node:assert/strict'"

emit() { # destino, fuente, tramos «a,b» separados por espacio, cabecera...
  local dst="$1" src="$2" ranges="$3"; shift 3
  { printf '%s\n' "$@"; for r in $ranges; do sed -n "${r}p" "$REF/$src"; done; } > "$DST/$dst"
}

emit proxyContextManager.test.ts context-manager.test.ts '22,38 44,51 90,339' \
  '/**' \
  ' * El gestor de contexto del proxy — casos de OmniRoute `tests/unit/context-manager.test.ts`' \
  ' * (a58000c7). Quedan fuera los que leen el registro de proveedores o el' \
  ' * catálogo sincronizado de la referencia (Gemini a 1 048 576, hyperagent,' \
  ' * windsurf): thyrox no los tiene, y el límite de un modelo lo inyecta quien' \
  ' * construye el proxy.' ' */' \
  "$TEST" "$ASSERT" "$IMPORT" "$ALL"

emit proxyContextManagerService.test.ts service-context-manager.test.ts '5,$' \
  '/** Ayudantes del gestor de contexto — casos de OmniRoute `tests/unit/service-context-manager.test.ts` (a58000c7). */' \
  "$SUITE" "$ASSERT" "$IMPORT" 'const mod = CM'

emit proxyContextPurifySystemFirst.test.ts context-manager-purify-system-first.test.ts '14,$' \
  '/**' \
  ' * El aviso de historia recortada va dentro del primer mensaje de sistema, o' \
  ' * como un único mensaje de sistema al principio: varias pasarelas rechazan un' \
  ' * mensaje de sistema que no esté en la posición 0. Casos de OmniRoute' \
  ' * `tests/unit/context-manager-purify-system-first.test.ts` (a58000c7).' ' */' \
  "$TEST" "$ASSERT" "$IMPORT" "$ALL"

emit proxyContextFileTokens.test.ts 10840-file-token-context.test.ts '9,$' \
  '/** Documentos en línea en la estimación de tokens — casos de OmniRoute `tests/unit/10840-file-token-context.test.ts` (a58000c7). */' \
  "$TEST" "$ASSERT" "$IMPORT" "$ALL"

emit proxyContextImageTokens.test.ts 8368-image-token-context.test.ts '4,$' \
  '/** Imágenes en línea en la estimación de tokens — casos de OmniRoute `tests/unit/8368-image-token-context.test.ts` (a58000c7). */' \
  "$TEST" "$ASSERT" "$IMPORT" "$ALL"

emit proxyContextImagePrune.test.ts 8560-responses-image-compaction.test.ts '19,117' \
  '/**' \
  ' * Las imágenes en línea más antiguas se sustituyen por un aviso y se conservan' \
  ' * las más recientes, antes de recortar historia. Casos de OmniRoute' \
  ' * `tests/unit/8560-responses-image-compaction.test.ts` (a58000c7); quedan fuera' \
  ' * los dos del adaptador de la API de Responses (`compression/bodyAdapter.ts`),' \
  ' * que el proxy no tiene.' ' */' \
  "$TEST" "$ASSERT" "$IMPORT" "$ALL"

emit proxyContextImageStringify.test.ts 8594-compress-image-token-stringify.test.ts '4,$' \
  '/** Compresión con imágenes medidas por estructura — casos de OmniRoute `tests/unit/8594-compress-image-token-stringify.test.ts` (a58000c7). */' \
  "$TEST" "$ASSERT" "$IMPORT" "$ALL"

emit proxyContextToolAdjacency.test.ts fix-tool-adjacency.test.ts '6,$' \
  '/** Pares y adyacencia de herramientas — casos de OmniRoute `tests/unit/fix-tool-adjacency.test.ts` (a58000c7). */' \
  "$TEST" "$ASSERT" "$IMPORT" "$ALL"

emit proxyContextTrailingAssistant.test.ts mistral-trailing-assistant.test.ts '19,$' \
  '/**' \
  ' * Un asistente de sólo texto al final se retira para los proveedores que exigen' \
  ' * terminar en usuario o herramienta. Casos de OmniRoute' \
  ' * `tests/unit/mistral-trailing-assistant.test.ts` (a58000c7).' ' */' \
  "$SUITE" "$ASSERT" "$IMPORT" "$ALL"

# El cuerpo copiado recorre bloques de un arreglo de uniones; el tsconfig de
# pruebas de thyrox es estricto y la referencia no, así que se tipan los
# recorridos donde el compilador no puede estrecharlos solo.
gawk -i inplace '{ print gensub(/for \(const block of msg\.content\) \{/, "for (const block of msg.content as Record<string, unknown>[]) {", "g") }' "$DST/proxyContextManager.test.ts"
gawk -i inplace '{ print gensub(/const assistantContent = fixed\[([0-9]+)\]\.content;/, "const assistantContent = fixed[\\1]!.content as Record<string, unknown>[];", "g") }' "$DST/proxyContextToolAdjacency.test.ts"

# Todo texto de thyrox dice thyrox, y el formato se nombra por su dueño: Anthropic.
gawk -i inplace '{ print gensub(/\<Claude\>/, "Anthropic", "g") }' "$DST"/proxyContext*.test.ts
