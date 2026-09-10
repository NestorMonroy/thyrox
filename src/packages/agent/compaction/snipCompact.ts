/**
 * Porte COMPLETO de `ccnmt: packages/agent/compaction/snipCompact.ts`.
 *
 * La fuente misma es un stub auto-generado: las cuatro funciones son no-ops
 * o valores fijos (`isSnipRuntimeEnabled` siempre `false`,
 * `snipCompactIfNeeded` siempre devuelve el mismo arreglo sin ejecutar
 * nada), sin runtime real de "snip" detrás. El porte lo refleja tal cual.
 *
 * Distinto de `snipCompactCore.ts` (hermano, también ausente, con lógica
 * real) y de `snipProjection.ts` (ya presente en este árbol, con su propio
 * diseño) — este archivo es sólo el punto de entrada stub.
 */
import type { Message } from '../messageShapes.ts'

export const isSnipMarkerMessage: (message: Message) => boolean = () => false

export const snipCompactIfNeeded: (
  messages: Message[],
  options?: { force?: boolean },
) => {
  messages: Message[]
  executed: boolean
  tokensFreed: number
  boundaryMessage?: Message
} = messages => ({
  messages,
  executed: false,
  tokensFreed: 0,
})

export const isSnipRuntimeEnabled: () => boolean = () => false

export const shouldNudgeForSnips: (messages: Message[]) => boolean = () =>
  false

export const SNIP_NUDGE_TEXT: string = ''
