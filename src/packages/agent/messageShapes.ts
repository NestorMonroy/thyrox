/**
 * Porte MINIMO de `ccnmt: packages/agent/messageShapes.ts`, acotado a los
 * campos que consume `messagePredicates.ts` (`isHumanTurn`).
 *
 * La fuente declara ahi la jerarquia COMPLETA de tipos de mensaje del bucle
 * conversacional del agente (decenas de tipos: AssistantMessage,
 * SystemMessage, GroupedToolUseMessage, RenderableMessage, ...), varios
 * dependientes de paquetes que no viven en este arbol
 * (`@anthropic-ai/sdk`, `@claude-code-how-works/tool-registry/...`).
 *
 * DIVERGENCIA DE ALCANCE, declarada: aqui solo se portan `Message` y
 * `UserMessage` — los dos tipos que `isHumanTurn` referencia — con los
 * campos que su discriminante usa (`type`, `isMeta`, `toolUseResult`,
 * `message.content`). El resto de la jerarquia de la fuente no tiene
 * consumidor en este paquete todavia; se porta cuando lo tenga.
 *
 * AMPLIADO: `AssistantMessage`, que consumen `getLastAssistantMessage` y
 * `hasToolCallsInLastAssistantTurn` de `messages.ts`. Se anade su forma
 * minima —el discriminante y `message.content`— por el mismo criterio: el
 * tipo entra cuando aparece su primer consumidor.
 */

export type MessageType = 'user' | 'assistant' | 'system' | 'attachment' | 'progress' | 'grouped_tool_use' | 'collapsed_read_search'

export type Message = {
  type: MessageType
  isMeta?: boolean
  toolUseResult?: unknown
  message?: {
    content?: unknown
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type UserMessage = Message & { type: 'user' }

export type AssistantMessage = Message & {
  type: 'assistant'
  message: {
    content?: unknown
    id?: string
    [key: string]: unknown
  }
}

/**
 * AMPLIADO: `ProgressMessage`, que devuelve `createProgressMessage`. Se porta
 * con la forma exacta de la fuente (`ccnmt: packages/agent/messageShapes.ts:54`),
 * incluido su parametro por defecto `unknown`.
 */
export type ProgressMessage<T = unknown> = Message & {
  type: 'progress'
  data: T
}

/**
 * DIVERGENCIA DECLARADA: la fuente toma `ToolResultBlockParam` del SDK de
 * Anthropic (`@anthropic-ai/sdk`), que este arbol no tiene. Se declara aqui
 * la forma estructural que el protocolo exige —los cuatro campos que
 * `createToolResultStopMessage` emite— en vez de arrastrar el SDK entero por
 * un tipo. Cuando el SDK entre al arbol, este alias se sustituye por el suyo.
 */
export type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  content?: unknown
  is_error?: boolean
}

/**
 * AMPLIADO: `NormalizedMessage`, que consumen `getToolUseID` y
 * `getToolResultIDs` de `messages.ts`. En la fuente
 * (`ccnmt: packages/agent/messageShapes.ts:80`) es un simple alias de
 * `Message` — un mensaje ya separado por bloque tras `normalizeMessages`
 * (no portada aqui). Se reproduce igual: el alias no le agrega forma
 * propia, asi que no hay divergencia que declarar.
 */
export type NormalizedMessage = Message

/**
 * AMPLIADO: `ToolUseBlock`, el bloque que consume `getToolUseID` en la
 * rama de asistente.
 *
 * DIVERGENCIA DECLARADA: la fuente lo toma del SDK de Anthropic
 * (`@anthropic-ai/sdk`), ausente de este arbol. Se declara aqui la forma
 * estructural minima — el discriminante `type`, `id`, y un indice para el
 * resto de campos (`name`, `input`) que `getToolUseID` no necesita leer.
 */
export type ToolUseBlock = {
  type: 'tool_use'
  id: string
  [key: string]: unknown
}
