export interface FileStateCache {
  readonly max: number
  readonly maxSize: number
  dump(): unknown
  load(entries: unknown): void
}

/**
 * Genérico sobre el tipo concreto de la caché: el clon es de la misma
 * clase que el original (se construye con su `constructor`), así que el
 * llamador recibe de vuelta el tipo que entregó — la clase real del
 * registro de herramientas en QueryEngine, un stub en los tests.
 */
export function cloneFileStateCache<T extends FileStateCache>(cache: T): T {
  const ctor = cache.constructor as new (
    maxEntries: number,
    maxSizeBytes: number,
  ) => T
  const cloned = new ctor(cache.max, cache.maxSize)
  cloned.load(cache.dump())
  return cloned
}
