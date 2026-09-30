/**
 * Aleatoriedad y mazo con anti-repetición — porte de OmniRoute `a58000c7`:
 * `src/shared/utils/secureRandom.ts` (entero) y
 * `src/shared/utils/shuffleDeck.ts` (entero).
 *
 * Los nombres `_setSecureRandomFloatSource` y `_resetAllDecks` pierden el
 * guion bajo inicial: aquí son exportaciones de prueba con nombre propio.
 */
import { randomBytes, randomInt } from 'node:crypto'

/** Flotante uniforme en [0, 1) con 48 bits de entropía criptográfica. */
function cryptoRandomFloat(): number {
  const buf = randomBytes(6)
  let value = 0
  for (let i = 0; i < buf.length; i++) value = value * 256 + buf[i]!
  return value / 2 ** 48
}

let testFloatSource: (() => number) | null = null

/** Equivale a `Math.random()`. */
export function secureRandomFloat(): number {
  return testFloatSource ? testFloatSource() : cryptoRandomFloat()
}

/** Entero uniforme en [0, maxExclusive); 0 si maxExclusive ≤ 1. */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 1) return 0
  const max = Math.floor(maxExclusive)
  if (testFloatSource) return Math.min(max - 1, Math.floor(testFloatSource() * max))
  return randomInt(max)
}

/** Sólo para pruebas: fuente determinista; `null` restaura la criptográfica. */
export function setSecureRandomFloatSource(source: (() => number) | null): void {
  testFloatSource = source ?? null
}

type ShuffleDeck = { order: readonly string[]; index: number; idsKey: string }

const decks = new Map<string, ShuffleDeck>()
const mutexes = new Map<string, Promise<void>>()

/** Fisher-Yates sobre una copia. */
export function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    const tmp = result[i]!
    result[i] = result[j]!
    result[j] = tmp
  }
  return result
}

/** El orden de un ciclo nuevo, sin repetir en su cabeza el último del anterior. */
function reshuffle(existing: ShuffleDeck | undefined, itemIds: readonly string[], idsKey: string): string[] {
  const lastUsedId =
    existing && existing.idsKey === idsKey && existing.order.length > 0
      ? existing.order[existing.order.length - 1]
      : undefined
  const order = fisherYatesShuffle(itemIds)
  if (lastUsedId !== undefined && order[0] === lastUsedId && order.length > 1) {
    const swapIdx = 1 + secureRandomInt(order.length - 1)
    const tmp = order[0]!
    order[0] = order[swapIdx]!
    order[swapIdx] = tmp
  }
  return order
}

/** Versión sin exclusión: sólo segura si quien llama ya la tiene. */
export function getNextFromDeckSync(namespace: string, itemIds: readonly string[]): string {
  if (itemIds.length === 0) return ''
  if (itemIds.length === 1) return itemIds[0]!
  const idsKey = [...itemIds].sort().join(',')
  const existing = decks.get(namespace)
  if (existing && existing.idsKey === idsKey && existing.index < existing.order.length) {
    const id = existing.order[existing.index]!
    decks.set(namespace, { ...existing, index: existing.index + 1 })
    return id
  }
  const order = reshuffle(existing, itemIds, idsKey)
  decks.set(namespace, { order, index: 1, idsKey })
  return order[0]!
}

/** Siguiente del mazo del espacio de nombres, serializado por espacio. */
export async function getNextFromDeck(namespace: string, itemIds: readonly string[]): Promise<string> {
  if (itemIds.length === 0) return ''
  if (itemIds.length === 1) return itemIds[0]!
  const current = mutexes.get(namespace) ?? Promise.resolve()
  let release: (() => void) | undefined
  mutexes.set(
    namespace,
    new Promise<void>(resolve => {
      release = resolve
    }),
  )
  try {
    await current
    return getNextFromDeckSync(namespace, itemIds)
  } finally {
    release?.()
  }
}

/** Planifica la elección sin avanzar el estado compartido hasta `commit`. */
export function planNextFromDeckSync(
  namespace: string,
  itemIds: readonly string[],
): { selectedId: string; commit: () => void } {
  if (itemIds.length === 0) return { selectedId: '', commit: () => {} }
  if (itemIds.length === 1) return { selectedId: itemIds[0]!, commit: () => {} }
  const idsKey = [...itemIds].sort().join(',')
  const existing = decks.get(namespace)
  if (existing && existing.idsKey === idsKey && existing.index < existing.order.length) {
    const selectedId = existing.order[existing.index]!
    return { selectedId, commit: () => decks.set(namespace, { ...existing, index: existing.index + 1 }) }
  }
  const order = reshuffle(existing, itemIds, idsKey)
  return { selectedId: order[0]!, commit: () => decks.set(namespace, { order, index: 1, idsKey }) }
}

/** Sólo para pruebas. */
export function resetAllDecks(): void {
  decks.clear()
  mutexes.clear()
}
