/**
 * Un candado por clave que serializa: cada llamada ejecuta su propia función,
 * una tras otra dentro de la clave, y recibe su propio resultado o su propio
 * error. No deduplica — para compartir un resultado entre llamadas
 * concurrentes está el mutex de refresco de `tokenRefresh`.
 *
 * Porte de `omniroute: src/shared/utils/keyedMutex.ts` (MIT).
 */

export interface KeyedMutex<T> {
  run(key: string, fn: () => Promise<T>): Promise<T>
  /** Las claves con alguna llamada todavía en cola. */
  pendingKeys(): string[]
}

export function createKeyedMutex<T = unknown>(): KeyedMutex<T> {
  const queue = new Map<string, Promise<void>>()

  function run(key: string, fn: () => Promise<T>): Promise<T> {
    const prior = queue.get(key) ?? Promise.resolve()
    const result = prior.then(fn)
    // El marcador nunca rechaza: encadena a la siguiente llamada y dice, por
    // identidad, si esta llamada sigue siendo la última de la clave.
    const marker: Promise<void> = result.then(
      () => undefined,
      () => undefined,
    )
    queue.set(key, marker)
    void marker.finally(() => {
      if (queue.get(key) === marker) queue.delete(key)
    })
    return result
  }

  return { run, pendingKeys: () => [...queue.keys()] }
}
