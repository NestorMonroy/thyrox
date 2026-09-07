/**
 * Puerto de `ccnmt: packages/voice/testing/index.ts` (22 líneas fuente,
 * 100% portado). Helpers de testing: runtime nulo y generador de
 * chunks de transcripción escritos para fixtures de consumidores.
 */

import type {
  VoiceRuntime,
  VoiceTranscriptChunk,
} from '../src/contracts.js'

export function createNullVoiceRuntime(): VoiceRuntime {
  return {
    state: 'idle',
    async start() {},
    async stop() {},
    pushTranscript(_chunk: VoiceTranscriptChunk) {},
  }
}

export function createScriptedVoiceChunks(
  texts: string[],
): VoiceTranscriptChunk[] {
  return texts.map((text, index) => ({
    text,
    isFinal: index === texts.length - 1,
  }))
}
