/**
 * Compactación automática (T-023): umbral, resumen y frontera.
 *
 * Tres piezas, y las tres tienen que ser explícitas:
 *
 * 1. **El umbral** sale del catálogo, no de una constante. La ventana de
 *    `claude-opus-5` es de 1 M y la de `claude-haiku-4-5` de 200 k: un umbral
 *    fijo compactaría cinco veces antes de tiempo en uno y tarde en el otro.
 * 2. **La reserva de salida** es la mitad que se olvida. Compactar exige que el
 *    modelo escriba el resumen, y ese resumen sale del mismo presupuesto: si la
 *    ventana se llena hasta el borde, no queda sitio para escribirlo.
 * 3. **La frontera nunca parte un `tool_use` de su `tool_result`.** El API
 *    rechaza la petición entera cuando una llamada queda sin respuesta, así que
 *    la frontera se corre hacia atrás hasta que el par vuelve a estar completo.
 *
 * Un modelo que el catálogo no conoce devuelve `null`, y `shouldAutoCompact`
 * responde `false`: el silencio del instrumento no es permiso para compactar.
 */
import { MODELS } from '@kaupamex/agent/models'
import type { ContentBlock, Message } from '../types.ts'
import { estimateTokens } from './systemPrompt.ts'

/**
 * Lo que se reserva para que el modelo pueda escribir el resumen.
 *
 * Porte de `qZt=20000` del ejecutable 2.1.258. Lo consume su ventana efectiva:
 * `function MF(e,n){let r=Math.min(xMe(e),qZt), {window:d}=wv(e,o); return d-r}`
 * — el tope se aplica sobre la salida máxima del modelo, no la sustituye.
 */
export const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000
/**
 * El colchón entre el umbral y la ventana efectiva.
 *
 * Porte de `BZt=13000` (`chunk-czaspe53.js`) del ejecutable 2.1.258, que su
 * barra de contexto consume como `MF(n,we)-BZt`.
 */
export const AUTOCOMPACT_BUFFER_TOKENS = 13_000

/** Ventana del modelo menos lo reservado para el resumen. `null` si no está en el catálogo. */
export function effectiveContextWindow(model: string): number | null {
  const registro = MODELS[model]
  const ventana = registro?.context?.window
  if (typeof ventana !== 'number') return null
  const salida = registro?.max_output_tokens?.default
  const reserva = Math.min(typeof salida === 'number' ? salida : MAX_OUTPUT_TOKENS_FOR_SUMMARY, MAX_OUTPUT_TOKENS_FOR_SUMMARY)
  return ventana - reserva
}

/** El punto a partir del cual conviene compactar. `null` si el modelo no se conoce. */
export function autoCompactThreshold(model: string): number | null {
  const efectiva = effectiveContextWindow(model)
  return efectiva === null ? null : efectiva - AUTOCOMPACT_BUFFER_TOKENS
}

/** Dispara AL alcanzar el umbral. Sin umbral conocido, no dispara. */
export function shouldAutoCompact(tokens: number, model: string): boolean {
  const umbral = autoCompactThreshold(model)
  return umbral !== null && tokens >= umbral
}

/** Estimación del contexto que ocupan los mensajes, por bloque. */
export function estimateMessagesTokens(messages: Message[]): number {
  let total = 0
  for (const m of messages) {
    for (const b of m.content) {
      if (b.type === 'text') total += estimateTokens(b.text)
      else if (b.type === 'tool_result') total += estimateTokens(b.content)
      else if (b.type === 'tool_use') total += estimateTokens(b.name + JSON.stringify(b.input ?? {}))
    }
  }
  return total
}

export type CompactOptions = {
  /** El resumen de lo que queda detrás de la frontera. */
  summary: string
  /** Cuántos mensajes recientes sobreviven sin resumir. */
  keepLast: number
}

export type CompactResult = { messages: Message[]; boundary: number; compacted: number }

const bloques = (m: Message, tipo: ContentBlock['type']) => m.content.some((b) => b.type === tipo)

/**
 * Corre la frontera hacia atrás hasta que la cola no empiece con un
 * `tool_result` huérfano — su `tool_use` vive en el mensaje anterior.
 */
function fronteraSegura(messages: Message[], propuesta: number): number {
  let i = propuesta
  while (i > 0 && bloques(messages[i], 'tool_result')) i -= 1
  return i
}

/** Sustituye todo lo anterior a la frontera por un único mensaje de resumen. */
export function compactMessages(messages: Message[], opts: CompactOptions): CompactResult {
  if (messages.length <= opts.keepLast) {
    return { messages, boundary: 0, compacted: 0 }
  }
  const boundary = fronteraSegura(messages, messages.length - opts.keepLast)
  if (boundary <= 0) {
    return { messages, boundary: 0, compacted: 0 }
  }
  const resumen: Message = {
    role: 'user',
    content: [{ type: 'text', text: `Resumen de la conversación anterior:\n\n${opts.summary}` }],
  }
  const cola = messages.slice(boundary).map((m) => ({ role: m.role, content: [...m.content] }))
  return { messages: [resumen, ...cola], boundary, compacted: boundary }
}
