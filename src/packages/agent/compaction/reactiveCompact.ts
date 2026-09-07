/**
 * Porte COMPLETO de `ccnmt: packages/agent/compaction/reactiveCompact.ts`.
 *
 * La fuente misma es un stub auto-generado: las cinco funciones son no-ops
 * o valores fijos (`isReactiveCompactEnabled`/`isReactiveOnlyMode` siempre
 * `false`), sin compactación reactiva real detrás. El porte lo refleja tal
 * cual.
 *
 * DIVERGENCIA DE ALCANCE en un tipo de la firma: `CompactionResult` (fuente:
 * `./compact.js`) nombra un tipo que en `ccnmt` sí existe con esa forma,
 * pero el `compaction/compact.ts` de ESTE árbol es un diseño distinto
 * (sólo declara `stripImagesFromMessages`, sin `CompactionResult`) — mismo
 * fenómeno que ya documentan `autoCompact.ts`/`microCompact.ts` (no
 * portados en este pase, ver reporte). Como el único cuerpo que lo usaría
 * (`tryReactiveCompact`) siempre devuelve `null` y `reactiveCompactOnPromptTooLong`
 * siempre devuelve `{ ok: false }` sin poblar `result`, se sustituye por
 * `unknown` sin pérdida de comportamiento observable.
 */
import type { Message } from '../messageShapes.ts'

type CompactionResult = unknown

export const isReactiveOnlyMode: () => boolean = () => false

export const reactiveCompactOnPromptTooLong: (
  messages: Message[],
  cacheSafeParams: Record<string, unknown>,
  options: { customInstructions?: string; trigger?: string },
) => Promise<{ ok: boolean; reason?: string; result?: CompactionResult }> =
  async () => ({ ok: false })

export const isReactiveCompactEnabled: () => boolean = () => false

export const isWithheldPromptTooLong: (message: Message) => boolean = () =>
  false

export const isWithheldMediaSizeError: (message: Message) => boolean = () =>
  false

export const tryReactiveCompact: (params: {
  hasAttempted: boolean
  querySource: string
  aborted: boolean
  messages: Message[]
  cacheSafeParams: Record<string, unknown>
}) => Promise<CompactionResult | null> = async () => null
