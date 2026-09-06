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
