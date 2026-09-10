/**
 * Puerto fiel de `ccnmt: packages/storage/src/testing/index.ts` (2161
 * bytes fuente, 1 clase + re-export de 6 tipos — porte completo). Sin
 * divergencias: su único import (`../contracts.js`) ya existe en este
 * árbol (no mío, portado en un pase anterior) con la misma forma exacta.
 *
 * @claude-code-how-works/storage/testing
 *
 * V7 §9.11 — in-memory fake for the storage package.
 * Must NOT import from ../internal/ (V7 §9.11 hard rule).
 */
import type {
  StorageBackend,
  StorageReadResult,
  StorageWriteData,
  TranscriptStore,
  SessionMetadataStore,
  ArtifactStore,
} from '../contracts.js'

export type {
  StorageBackend,
  StorageReadResult,
  StorageWriteData,
  TranscriptStore,
  SessionMetadataStore,
  ArtifactStore,
}

export class MemoryStorageBackend implements StorageBackend {
  private readonly _data = new Map<string, Uint8Array | string>()

  async read(path: string, _signal?: AbortSignal): Promise<StorageReadResult> {
    return this._data.get(path) ?? null
  }

  async write(path: string, data: StorageWriteData, _signal?: AbortSignal): Promise<void> {
    this._data.set(path, data)
  }

  async append(path: string, data: StorageWriteData, _signal?: AbortSignal): Promise<void> {
    const existing = this._data.get(path)
    if (existing === undefined) {
      this._data.set(path, data)
    } else {
      const existingStr = typeof existing === 'string' ? existing : new TextDecoder().decode(existing)
      const appendStr = typeof data === 'string' ? data : new TextDecoder().decode(data)
      this._data.set(path, existingStr + appendStr)
    }
  }

  async delete(path: string, _signal?: AbortSignal): Promise<void> {
    this._data.delete(path)
  }

  async list(path: string, _signal?: AbortSignal): Promise<string[]> {
    const prefix = path.endsWith('/') ? path : `${path}/`
    const results: string[] = []
    for (const key of this._data.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length)
        const firstSlash = rest.indexOf('/')
        const entry = firstSlash === -1 ? rest : rest.slice(0, firstSlash)
        if (entry && !results.includes(entry)) {
          results.push(entry)
        }
      }
    }
    return results
  }

  /** Direct access for test assertions. */
  getData(path: string): StorageReadResult {
    return this._data.get(path) ?? null
  }

  /** Clear all stored data. */
  reset(): void {
    this._data.clear()
  }
}
