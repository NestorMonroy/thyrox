/**
 * Puerto FIEL y COMPLETO de
 * `ccnmt: packages/tool-registry/src/fileStateCache.ts` (TASK #232, porte
 * de `tool-registry`). Depende de `lru-cache` (npm) y de `node:path`.
 */
import { LRUCache } from 'lru-cache'
import { normalize } from 'path'

export type FileState = {
  content: string
  timestamp: number
  offset: number | undefined
  limit: number | undefined
  // Verdadero cuando esta entrada se pobló por auto-inyección (p. ej.
  // CLAUDE.md) y el contenido inyectado no coincidía con el disco
  // (comentarios HTML recortados, frontmatter recortado, MEMORY.md
  // truncado). El modelo sólo vio una vista parcial; Edit/Write deben
  // exigir un Read explícito antes. `content` aquí guarda los bytes CRUDOS
  // del disco (para el diff de getChangedFiles), no lo que el modelo vio.
  isPartialView?: boolean
}

// Tamaño máximo por defecto para las cachés de estado de archivos leídos
export const READ_FILE_STATE_CACHE_SIZE = 100

// Límite de tamaño por defecto para las cachés de estado de archivos (25MB)
// Evita el crecimiento sin límite de memoria por contenidos grandes.
const DEFAULT_MAX_CACHE_SIZE_BYTES = 25 * 1024 * 1024

/**
 * Una caché de estado de archivo que normaliza toda clave de ruta antes de
 * acceder. Esto asegura hits de caché consistentes sin importar si quien
 * llama pasa rutas relativas o absolutas con segmentos redundantes (p. ej.
 * /foo/../bar) o separadores de ruta mixtos en Windows (/ vs \).
 */
export class FileStateCache {
  private cache: LRUCache<string, FileState>

  constructor(maxEntries: number, maxSizeBytes: number) {
    this.cache = new LRUCache<string, FileState>({
      max: maxEntries,
      maxSize: maxSizeBytes,
      sizeCalculation: value => {
        const c = value.content
        const s =
          typeof c === 'string'
            ? c
            : c === null || c === undefined
              ? ''
              : typeof c === 'object'
                ? JSON.stringify(c)
                : String(c)
        return Math.max(1, Buffer.byteLength(s, 'utf8'))
      },
    })
  }

  get(key: string): FileState | undefined {
    return this.cache.get(normalize(key))
  }

  set(key: string, value: FileState): this {
    this.cache.set(normalize(key), value)
    return this
  }

  has(key: string): boolean {
    return this.cache.has(normalize(key))
  }

  delete(key: string): boolean {
    return this.cache.delete(normalize(key))
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  get max(): number {
    return this.cache.max
  }

  get maxSize(): number {
    return this.cache.maxSize
  }

  get calculatedSize(): number {
    return this.cache.calculatedSize
  }

  keys(): Generator<string> {
    return this.cache.keys()
  }

  entries(): Generator<[string, FileState]> {
    return this.cache.entries()
  }

  dump(): ReturnType<LRUCache<string, FileState>['dump']> {
    return this.cache.dump()
  }

  load(entries: ReturnType<LRUCache<string, FileState>['dump']>): void {
    this.cache.load(entries)
  }
}

/**
 * Factory para crear una FileStateCache con límite de tamaño.
 * Usa el desalojo por tamaño incorporado de LRUCache para evitar el
 * crecimiento de memoria. Nota: las imágenes no se cachean (ver
 * FileReadTool), así que el límite de tamaño es sobre todo para archivos
 * de texto grandes, notebooks y otro contenido editable.
 */
export function createFileStateCacheWithSizeLimit(
  maxEntries: number,
  maxSizeBytes: number = DEFAULT_MAX_CACHE_SIZE_BYTES,
): FileStateCache {
  return new FileStateCache(maxEntries, maxSizeBytes)
}

// Convierte la caché a un objeto plano (lo usa compact.ts en la fuente).
export function cacheToObject(
  cache: FileStateCache,
): Record<string, FileState> {
  return Object.fromEntries(cache.entries())
}

// Devuelve todas las claves de la caché (lo usan varios componentes).
export function cacheKeys(cache: FileStateCache): string[] {
  return Array.from(cache.keys())
}

// Clona una FileStateCache, preservando la configuración de límite de
// tamaño de la caché origen.
export function cloneFileStateCache(cache: FileStateCache): FileStateCache {
  const cloned = createFileStateCacheWithSizeLimit(cache.max, cache.maxSize)
  cloned.load(cache.dump())
  return cloned
}

// Combina dos cachés de estado de archivo; las entradas más recientes (por
// timestamp) sobrescriben a las más viejas.
export function mergeFileStateCaches(
  first: FileStateCache,
  second: FileStateCache,
): FileStateCache {
  const merged = cloneFileStateCache(first)
  for (const [filePath, fileState] of second.entries()) {
    const existing = merged.get(filePath)
    // Sólo sobrescribe si la entrada nueva es más reciente.
    if (!existing || fileState.timestamp > existing.timestamp) {
      merged.set(filePath, fileState)
    }
  }
  return merged
}
