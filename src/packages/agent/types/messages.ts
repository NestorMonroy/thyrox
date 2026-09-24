/**
 * Porte de `ccnmt: packages/agent/types/messages.ts` (79 líneas, 10 símbolos):
 * la jerarquía de mensajes del bucle conversacional.
 *
 * La versión anterior era un porte MÍNIMO declarado, acotado a los campos que
 * consume `internal/abort.ts`. Ese recorte tenía un costo medido: con
 * `CoreAssistantMessage` sin `usage` y con firma de índice, `AgentCore.ts`
 * leía `event.message.usage` como `unknown` y producía 6 errores de tsc — la
 * laxitud de la firma de índice acepta la ESCRITURA del campo y no da nada
 * legible en la LECTURA, que es lo que ese consumidor hace.
 *
 * Se reconcilia con la fuente: los cinco símbolos ausentes (`TextContent`,
 * `ThinkingContent`, `ToolUseContent`, `ToolResultContent`,
 * `CoreSystemMessage`) y la forma completa de `CoreAssistantMessage`.
 *
 * DIVERGENCIAS DECLARADAS contra la fuente, las dos medidas:
 *
 *  1. `stop_reason` admite además `string`. La fuente lo cierra en
 *     `'end_turn'|'max_tokens'|'stop_sequence'|'tool_use'|null`; aquí
 *     `TurnState.stopReason` es `string | undefined` porque el valor llega
 *     crudo del proveedor (`delta.stop_reason`, `AgentLoop.ts:393`) y nadie
 *     lo valida contra el cierre. Cerrarlo aquí rompería
 *     `buildAssistantMessage`. El cierre pertenece al punto donde el valor
 *     entra desde el proveedor, no al tipo del mensaje.
 *  2. `uuid` es `string`, no el `UUID` de `crypto`. Los dos constructores del
 *     bucle usan `crypto.randomUUID()`, así que la forma estrecha se cumple
 *     de hecho; se deja abierta porque un mensaje reconstruido desde el
 *     transcript trae su uuid como string plano.
 *
 * `ToolUseBlock`/`ToolResultBlock`/`OtherContentBlock` — nombres inventados
 * por el porte mínimo — se retiran: medido, 0 importadores desde este módulo.
 * `ToolUseBlock` además colisiona en este árbol con otras tres declaraciones
 * (`messageShapes.ts:90`, `toolSearch.ts:81` y el del SDK de Anthropic), así
 * que conservarlo como alias habría añadido una cuarta.
 */

export type TextContent = {
  type: 'text'
  text: string
}

export type ToolUseContent = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export type ToolResultContent = {
  type: 'tool_result'
  tool_use_id: string
  content?: string | CoreContentBlock[]
  is_error?: boolean
}

export type ThinkingContent = {
  type: 'thinking'
  thinking: string
}

export type CoreContentBlock =
  | TextContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent
  | { type: string; [key: string]: unknown }

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

export type CoreAssistantMessage = {
  type: 'assistant'
  uuid: string
  role: 'assistant'
  content: CoreContentBlock[]
  model?: string
  usage?: Usage
  /** Ver divergencia 1 del encabezado: la fuente cierra esta unión. */
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | string | null
  timestamp?: number
  [key: string]: unknown
}

export type CoreSystemMessage = {
  type: 'system'
  uuid: string
  role?: never
  content?: string | CoreContentBlock[]
  subtype?: string
  timestamp?: number
  [key: string]: unknown
}

export type CoreMessage =
  | CoreUserMessage
  | CoreAssistantMessage
  | CoreSystemMessage
