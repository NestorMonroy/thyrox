/**
 * Clonado de una cache de estado de archivo — porte de
 * `ccnmt: packages/agent/internal/fileStateCache.ts`.
 *
 * El clon se construye vía el constructor de la instancia ORIGINAL, no de
 * una clase fija: si `cache` es una subclase, `cloneFileStateCache` conserva
 * el tipo de subclase en el resultado. El estado se transfiere por
 * `dump()`/`load()` — la cache no expone su Map interno, y así el clon queda
 * desacoplado del original desde el primer momento.
 */

export interface FileStateCache {
  readonly max: number
  readonly maxSize: number
  dump(): unknown
  load(entries: unknown): void
}

export function cloneFileStateCache(cache: FileStateCache): FileStateCache {
  const ctor = cache.constructor as new (
    maxEntries: number,
    maxSizeBytes: number,
  ) => FileStateCache
  const cloned = new ctor(cache.max, cache.maxSize)
  cloned.load(cache.dump())
  return cloned
}
