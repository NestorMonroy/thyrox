/**
 * Amplía `ccnmt: packages/agent/types/messages.ts` con lo que `coreMessages.ts`
 * dejó fuera a propósito de su porte mínimo (`Usage`, `CoreUserMessage`).
 *
 * `coreMessages.ts` ya cubre `CoreContentBlock`, `CoreAssistantMessage` y
 * `CoreMessage` con firma de índice — suficientemente laxa para aceptar los
 * campos que este archivo añade (`usage`, `stop_reason`, `timestamp`, …) sin
 * tener que reabrirlo. Se re-exportan aquí para que `core/AgentCore.ts` y
 * `core/AgentLoop.ts` importen de un solo sitio, como en la fuente.
 */
export type { CoreContentBlock, CoreAssistantMessage, CoreMessage } from './coreMessages.ts'
import type { CoreContentBlock } from './coreMessages.ts'

export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export type CoreUserMessage = {
  type: 'user'
  uuid: string
  role: 'user'
  content: string | CoreContentBlock[]
  timestamp?: number
  [key: string]: unknown
}
