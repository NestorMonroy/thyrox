/**
 * Puerto fiel de `ccnmt: packages/storage/src/filePersistence/types.ts`
 * (464 bytes fuente, 4 interfaces + 3 constantes exportadas — porte
 * completo, sin dependencias externas).
 */
export const FILE_COUNT_LIMIT = 10000
export const OUTPUTS_SUBDIR = ".claude-code-how-works-how-works/outputs"
export const DEFAULT_UPLOAD_CONCURRENCY = 5

export interface FailedPersistence {
  filename: string
  error: string
}

export interface PersistedFile {
  filename: string
  file_id: string
}

export interface FilesPersistedEventData {
  files: PersistedFile[]
  failed: FailedPersistence[]
}

export interface TurnStartTime {
  turnStartTime: number
}
