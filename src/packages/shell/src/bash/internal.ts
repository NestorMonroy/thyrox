/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/internal.ts` — utilidades
 * internas de logging (`_logError`, `_logForDebugging`, `_logEvent`),
 * serialización tolerante (`_jsonStringify`) y memoización LRU
 * (`_memoizeWithLRU`) que consume `bash/registry.ts` para cachear
 * `getCommandSpec`.
 *
 * Porte COMPLETO: los cinco símbolos exportados de la fuente están
 * presentes. `_logForDebugging` y `_logEvent` son no-ops en la fuente
 * misma (cuerpo vacío) — no es una omisión del porte, es el
 * comportamiento medido.
 *
 * @module
 */

export function _logError(error: unknown): void {
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  } else {
    console.error(String(error))
  }
}

export function _logForDebugging(_msg: string): void {
  // No-op en la fuente: placeholder para telemetría no cableada aquí.
}

export function _logEvent(_name: string, _data: Record<string, unknown>): void {
  // No-op en la fuente: placeholder para telemetría no cableada aquí.
}

export function _jsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Memoiza `fn` con una caché LRU acotada a `maxSize` entradas, indexada por
 * `keyFn(...args)`. Al llegar al tope, descarta la entrada de acceso menos
 * reciente (orden de inserción de `Map`, reinsertada en cada hit).
 *
 * Divergencia medida: la fuente declara `maxSize: number` sin valor por
 * defecto, pero su único invocador (`getCommandSpec` en `./registry.ts`)
 * la llama con sólo dos argumentos — inconsistencia del propio origen.
 * Aquí `maxSize` lleva default `100` para que la llamada de dos argumentos
 * siga siendo válida sin alterar el comportamiento observable.
 */
export function _memoizeWithLRU<T extends (...args: any[]) => any>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string,
  maxSize: number = 100,
): T & { cache: Map<string, ReturnType<T>> } {
  const cache = new Map<string, ReturnType<T>>()
  const wrapped = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args)
    const cached = cache.get(key)
    if (cached !== undefined) {
      cache.delete(key)
      cache.set(key, cached)
      return cached
    }
    const result = fn(...args)
    cache.set(key, result)
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) cache.delete(firstKey)
    }
    return result
  }) as T & { cache: Map<string, ReturnType<T>> }
  wrapped.cache = cache
  return wrapped
}
