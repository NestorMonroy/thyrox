/**
 * Módulo hoja: type guards puros + predicado de "progreso efímero" de una
 * herramienta. Extraído de `sessionStorage.ts` en la fuente (#132) para que
 * un consumidor que sólo necesita los predicados no arrastre el barril
 * completo (~5K líneas) y sus dependencias transitivas pesadas.
 *
 * Adaptación fiel de ccnmt
 * `packages/storage/src/sessionStoragePredicates.ts` (57 líneas).
 *
 * Porte parcial declarado: `EPHEMERAL_PROGRESS_TYPES` en la fuente añade
 * `'sleep_progress'` cuando el flag de build `feature('PROACTIVE')` o
 * `feature('KAIROS')` está activo (macro de `bun:bundle`, resuelta en tiempo
 * de compilación del bundler de ccnmt — no existe en este árbol). Ningún test
 * de este porte ejercita esa rama; se omite el gateo y `sleep_progress` NO
 * entra al set. Si un consumidor futuro lo necesita, se añade con su propio
 * mecanismo de flag (no hay uno equivalente todavía en `@thyrox/*`).
 */

/** El subconjunto de `Entry` que este archivo necesita — sólo el campo `type`. */
export type PredicateEntry = { type: string }

/**
 * Type guard: los mensajes de transcript son user/assistant/attachment/system.
 * Fuente única de verdad de qué cuenta como mensaje de transcript — el
 * cargador de transcript la usa para decidir qué entra a la cadena.
 *
 * Los mensajes de progreso NO son mensajes de transcript. Son estado
 * efímero de UI y no deben persistirse a JSONL ni participar en las
 * cadenas de `parentUuid`; hacerlo produjo bifurcaciones de cadena que
 * dejaron huérfanos mensajes reales de conversación al reanudar (ver
 * #14373, #23537 en la fuente).
 */
export function isTranscriptMessage(
  entry: PredicateEntry,
): entry is PredicateEntry {
  return (
    entry.type === 'user' ||
    entry.type === 'assistant' ||
    entry.type === 'attachment' ||
    entry.type === 'system'
  )
}

/**
 * Entradas que participan en la cadena de `parentUuid`. Se usa en la vía de
 * escritura para saltar el progreso al asignar `parentUuid`.
 */
export function isChainParticipant(m: Pick<PredicateEntry, 'type'>): boolean {
  return m.type !== 'progress'
}

/**
 * Ticks de progreso de herramienta de alta frecuencia (1/seg para Sleep,
 * por-chunk para Bash). Sólo UI: no se envían a la API ni se renderizan
 * tras completar la herramienta.
 */
const EPHEMERAL_PROGRESS_TYPES = new Set([
  'bash_progress',
  'powershell_progress',
  'mcp_progress',
])

export function isEphemeralToolProgress(dataType: unknown): boolean {
  return typeof dataType === 'string' && EPHEMERAL_PROGRESS_TYPES.has(dataType)
}
