#!/usr/bin/env bash
# Porta las suites de streamRecovery de OmniRoute (a58000c7) a bun:test.
# Cabecera nueva por archivo; el cuerpo se copia desde la línea indicada.
set -euo pipefail
REF=/home/user/nestormonroy/omniroute/tests/unit
DST=/home/user/thyrox/src/packages/provider/__tests__
IMPORT="const SR = (await import(process.env.STREAM_RECOVERY_MODULE ?? '../src/proxy/resilience/streamRecovery.ts')) as typeof import('../src/proxy/resilience/streamRecovery.ts')"
WD="const TW = (await import(process.env.THROUGHPUT_WATCHDOG_MODULE ?? '../src/proxy/resilience/throughputWatchdog.ts')) as typeof import('../src/proxy/resilience/throughputWatchdog.ts')"

emit() { # destino, fuente, desde, hasta, cabecera...
  local dst="$1" src="$2" from="$3" to="$4"; shift 4
  { printf '%s\n' "$@"; sed -n "${from},${to}p" "$REF/$src" \
      | sed 's/"STREAM_RECOVERY_TOOLCALL_ORDER_FIX"/"THYROX_STREAM_RECOVERY_TOOLCALL_ORDER_FIX"/'; } > "$DST/$dst"
}

emit proxyStreamRecovery.test.ts stream-recovery.test.ts 12 '$' \
  "/** Recuperación de stream del proxy — casos de OmniRoute \`tests/unit/stream-recovery.test.ts\` (a58000c7). */" \
  "import { test } from 'bun:test'" "import assert from 'node:assert/strict'" "$IMPORT" \
  "const { STREAM_RECOVERY, HoldbackBuffer, TruncatedStreamError, isRetryableStreamError, hasTerminalMarker, createRecoverableStream } = SR"

emit proxyStreamContinuation.test.ts stream-continuation.test.ts 9 '$' \
  "/** Continuación a mitad de stream — casos de OmniRoute \`tests/unit/stream-continuation.test.ts\` (a58000c7). */" \
  "import { test } from 'bun:test'" "import assert from 'node:assert/strict'" "$IMPORT" \
  "const { scanOpenAiSseText, makeContinuationBody, trimContinuationOverlap } = SR"

emit proxyThroughputWatchdog.test.ts stream-throughput-watchdog.test.ts 9 120 \
  "/**" " * Vigilante de caudal — casos de OmniRoute \`tests/unit/stream-throughput-watchdog.test.ts\`" \
  " * (a58000c7). Queda fuera el último, que prueba los ajustes de resiliencia" \
  " * de la referencia (\`src/lib/resilience/settings.ts\`): thyrox no los tiene." " */" \
  "import { test } from 'bun:test'" "import assert from 'node:assert/strict'" "$WD" \
  "const { createThroughputWatchdog } = TW"

emit proxyThroughputWatchdogRecovery.test.ts stream-throughput-watchdog-recovery.test.ts 8 '$' \
  "/** Vigilante de caudal dentro de la recuperación — casos de OmniRoute \`tests/unit/stream-throughput-watchdog-recovery.test.ts\` (a58000c7). */" \
  "import { test } from 'bun:test'" "import assert from 'node:assert/strict'" "$IMPORT" \
  "const { createRecoverableStream, ThroughputWatchdogError } = SR"

emit proxyStreamRecoveryToolCall.test.ts stream-recovery-toolcall.test.ts 10 '$' \
  "/** Llamadas a herramienta y continuación — casos de OmniRoute \`tests/unit/stream-recovery-toolcall.test.ts\` (a58000c7). */" \
  "import { afterAll as after, afterEach, describe, it } from 'bun:test'" "import assert from 'node:assert/strict'" "$IMPORT" \
  "const { createRecoverableStream, TruncatedStreamError, scanOpenAiSseText, STREAM_RECOVERY } = SR" \
  "const resetDbInstance = () => {}"

emit proxyStreamContinuationResponses.test.ts stream-continuation-responses.test.ts 13 349 \
  "/**" " * Continuación sobre la API de Responses — casos de OmniRoute" \
  " * \`tests/unit/stream-continuation-responses.test.ts\` (a58000c7). Quedan fuera" \
  " * los tres últimos, que prueban el traductor Responses→chat de la referencia" \
  " * (\`open-sse/translator/response/openai-responses.ts\`): thyrox no lo tiene." " */" \
  "import { afterAll as after, afterEach, test } from 'bun:test'" "import assert from 'node:assert/strict'" "$IMPORT" \
  "const { createRecoverableStream, hasTerminalMarker, makeContinuationBody, scanOpenAiSseText, TruncatedStreamError } = SR" \
  "const resetDbInstance = () => {}"
