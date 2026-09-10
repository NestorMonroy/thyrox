/**
 * Reimplementación mínima de los dos utilitarios de `lodash-es` que
 * `exampleCommands.ts` usa (`memoize`, `sample`). No es un porte de
 * `ccnmt` — es una sustitución para no depender de un paquete npm que
 * este paquete no tiene instalado (`command-runtime` no declara
 * `lodash-es` como dependencia y no hay `bun install` disponible en esta
 * tarea para materializar el symlink; ver `pendingCrossPackageDeps.ts`
 * para el mismo problema con `@thyrox/*`).
 *
 * Semántica replicada de la documentación pública de lodash (no de su
 * código fuente, que tampoco es material de este porte):
 *
 * - `memoize(fn)` — cachea por la clave que da el primer argumento
 *   (`JSON`-libre: usa el propio valor como clave de un `Map`, igual que
 *   el resolver por defecto de lodash). Expone `.cache` como el `Map`.
 * - `sample(array)` — un elemento aleatorio del array, `undefined` si
 *   está vacío.
 */
export type MemoizedFunction<Args extends unknown[], R> = ((...args: Args) => R) & {
  cache: Map<unknown, R>
}

export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): MemoizedFunction<Args, R> {
  const cache = new Map<unknown, R>()
  const memoized = ((...args: Args): R => {
    const key = args[0]
    if (cache.has(key)) return cache.get(key) as R
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as MemoizedFunction<Args, R>
  memoized.cache = cache
  return memoized
}

export function sample<T>(array: readonly T[] | undefined): T | undefined {
  if (!array || array.length === 0) return undefined
  return array[Math.floor(Math.random() * array.length)]
}
