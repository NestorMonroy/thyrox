/**
 * Porte PARCIAL de `ccnmt: packages/agent/sessionTitle.ts` — generación del
 * título de sesión vía Haiku.
 *
 * Se porta `extractConversationText` (y su constante `MAX_CONVERSATION_TEXT`),
 * único símbolo con consumidor en este árbol
 * (`__tests__/extractConversationText.test.ts`): aplana un historial de
 * mensajes a un texto único, saltando lo no-humano/meta, y recorta por la
 * COLA a 1000 caracteres — el contexto reciente pesa más que el inicial.
 *
 * DIVERGENCIA DE ALCANCE, declarada: NO se portan `generateSessionTitle`,
 * la constante `SESSION_TITLE_PROMPT` ni `titleSchema`. Su cadena de
 * dependencias no existe en este árbol: `queryHaiku` de
 * `@claude-code-how-works/provider/claude.js`, `getIsNonInteractiveSession`
 * de `@claude-code-how-works/app-host/bootstrap/state.js`, `logEvent` y
 * `logForDebugging` de `@claude-code-how-works/local-observability`, y
 * `extractTextContent` de `./messages.js` (prohibido tocar en este pase).
 * `asSystemPrompt`, `safeParseJSON` y `lazySchema` sí tienen ya puerto local
 * en `./internalUtils.js`, pero eso no cierra el resto de la cadena. Se
 * porta cuando aparezca un consumidor real de `generateSessionTitle` bajo
 * este árbol — mismo criterio que ya usa `./messageShapes.ts` para su
 * propio recorte.
 */

import type { Message } from './messageShapes.js'

const MAX_CONVERSATION_TEXT = 1000

/**
 * Aplana un arreglo de mensajes a un único texto para la entrada del título
 * vía Haiku. Salta mensajes meta/no-humanos. Recorta por la cola a los
 * últimos 1000 caracteres, de forma que el contexto reciente gane cuando la
 * conversación es larga.
 */
export function extractConversationText(messages: Message[]): string {
  const parts: string[] = []
  for (const msg of messages) {
    if (msg.type !== 'user' && msg.type !== 'assistant') continue
    if ('isMeta' in msg && msg.isMeta) continue
    // `origin` es un campo de metadata opcional que algunas fuentes de
    // mensaje añaden (canales, agentes); se estrecha una sola vez en vez
    // de dos.
    const origin = (msg as Message & { origin?: { kind: string } }).origin
    if (origin && origin.kind !== 'human') continue
    const content = msg.message.content
    if (typeof content === 'string') {
      parts.push(content)
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if ('type' in block && block.type === 'text' && 'text' in block) {
          parts.push(block.text as string)
        }
      }
    }
  }
  const text = parts.join('\n')
  return text.length > MAX_CONVERSATION_TEXT
    ? text.slice(-MAX_CONVERSATION_TEXT)
    : text
}
