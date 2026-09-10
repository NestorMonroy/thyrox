/**
 * Puerto de `ccnmt: packages/voice/src/contracts.ts` (13 líneas fuente,
 * 100% portado). Contrato mínimo del runtime de voz: estado, chunk de
 * transcripción y la interfaz de control (start/stop/pushTranscript).
 */

export type VoiceState = 'idle' | 'recording' | 'processing'

export type VoiceTranscriptChunk = {
  text: string
  isFinal: boolean
}

export type VoiceRuntime = {
  state: VoiceState
  start(signal?: AbortSignal): Promise<void>
  stop(signal?: AbortSignal): Promise<void>
  pushTranscript(chunk: VoiceTranscriptChunk): void
}
