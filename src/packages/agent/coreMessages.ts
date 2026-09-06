/**
 * Porte MINIMO de `ccnmt: packages/agent/types/messages.ts`, acotado a los
 * campos que consume `internal/abort.ts` (`createSyntheticToolResults`).
 *
 * La fuente declara ahí la jerarquía completa de mensajes del bucle
 * conversacional (`CoreUserMessage`, `CoreAssistantMessage`,
 * `CoreSystemMessage`, `Usage`, ...). DIVERGENCIA DE ALCANCE, declarada:
 * aquí sólo se portan los campos que `createSyntheticToolResults` lee o
 * escribe — el discriminante `type`, `content` como arreglo de bloques, y
 * los bloques `tool_use`/`tool_result` con sus claves propias. El resto de
 * la jerarquía de la fuente no tiene consumidor todavía en este paquete;
 * se porta cuando lo tenga.
 */

export type ToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content?: string | CoreContentBlock[]
  is_error?: boolean
}

/** Cualquier otro bloque de contenido — texto, thinking, o desconocido. */
export type OtherContentBlock = {
  type: string
  [key: string]: unknown
}

export type CoreContentBlock = ToolUseBlock | ToolResultBlock | OtherContentBlock

export type CoreAssistantMessage = {
  type: 'assistant'
  content: CoreContentBlock[] | string
  [key: string]: unknown
}

/** Un mensaje del turno — sólo se distingue `type: 'assistant'` de todo lo demás. */
export type CoreMessage =
  | CoreAssistantMessage
  | { type: string; content?: unknown; [key: string]: unknown }
