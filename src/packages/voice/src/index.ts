/**
 * Puerto de `ccnmt: packages/voice/src/index.ts` (25 líneas fuente,
 * 100% portado). Superficie pública V7 §8.20 de integración de voz:
 * re-exporta contrato + errores, y ofrece un runtime de voz mínimo
 * basado en cierre.
 */

export * from './contracts.js'
export * from './errors.js'

import type { VoiceRuntime, VoiceTranscriptChunk } from './contracts.js'

export function createVoiceRuntime(): VoiceRuntime {
  let state: VoiceRuntime['state'] = 'idle'
  const chunks: VoiceTranscriptChunk[] = []
  return {
    get state() {
      return state
    },
    async start(_signal?: AbortSignal) {
      state = 'recording'
    },
    async stop(_signal?: AbortSignal) {
      state = 'idle'
    },
    pushTranscript(chunk: VoiceTranscriptChunk) {
      chunks.push(chunk)
      state = chunk.isFinal ? 'idle' : 'processing'
    },
  }
}
