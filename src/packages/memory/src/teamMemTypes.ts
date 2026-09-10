/**
 * Puerto de `ccnmt: packages/memory/src/teamMemTypes.ts` (verbatim).
 *
 * Tipos de Team Memory Sync, movidos desde
 * `app-compat/services/teamMemorySync/types.ts` al paquete `memory` (el
 * dueño canónico de la lógica de memoria de equipo).
 *
 * V7 §8 — `memory` no puede importar de `app-compat`. Estos tipos se
 * importaban antes cruzando ese límite; ahora viven aquí.
 *
 * NOTA DE DRIFT (hallazgo H-DOCS): este archivo y `teamMemSyncTypes.ts`
 * declaran, en la fuente ccnmt, esquemas y tipos casi idénticos
 * (`TeamMemoryData`, `SkippedSecretFile`, los cuatro `TeamMemorySync*Result`)
 * de forma independiente. Cada uno tiene un único consumidor real:
 * `teamMemorySync.ts` usa ÉSTE; `teamMemorySyncWatcher.ts` usa SOLO
 * `TeamMemorySyncPushResult` del otro. Se porta cada archivo fiel a sí
 * mismo — no es responsabilidad de este porte unificar una duplicación
 * preexistente de la fuente.
 *
 * `lazySchema` se duplica localmente aquí, sin exportar — es el patrón que
 * la propia fuente documenta en `config/internal/lazySchema.ts`: "V7 §11.4
 * — kept package-internal (not in a shared utils package). Each owner
 * that needs this 8-line helper duplicates it."
 */

import { z } from 'zod/v4'

function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

const TeamMemoryContentSchema = lazySchema(() =>
  z.object({
    entries: z.record(z.string(), z.string()),
    entryChecksums: z.record(z.string(), z.string()).optional(),
  }),
)

export const TeamMemoryDataSchema = lazySchema(() =>
  z.object({
    organizationId: z.string(),
    repo: z.string(),
    version: z.number(),
    lastModified: z.string(),
    checksum: z.string(),
    content: TeamMemoryContentSchema(),
  }),
)

export const TeamMemoryTooManyEntriesSchema = lazySchema(() =>
  z.object({
    error: z.object({
      details: z.object({
        error_code: z.literal('team_memory_too_many_entries'),
        max_entries: z.number().int().positive(),
        received_entries: z.number().int().positive(),
      }),
    }),
  }),
)

export type TeamMemoryData = z.infer<ReturnType<typeof TeamMemoryDataSchema>>

export type SkippedSecretFile = {
  path: string
  ruleId: string
  label: string
}

export type TeamMemorySyncFetchResult = {
  success: boolean
  data?: TeamMemoryData
  isEmpty?: boolean
  notModified?: boolean
  checksum?: string
  error?: string
  skipRetry?: boolean
  errorType?: 'auth' | 'timeout' | 'network' | 'parse' | 'unknown'
  httpStatus?: number
}

export type TeamMemoryHashesResult = {
  success: boolean
  version?: number
  checksum?: string
  entryChecksums?: Record<string, string>
  error?: string
  errorType?: 'auth' | 'timeout' | 'network' | 'parse' | 'unknown'
  httpStatus?: number
}

export type TeamMemorySyncPushResult = {
  success: boolean
  filesUploaded: number
  checksum?: string
  conflict?: boolean
  error?: string
  skippedSecrets?: SkippedSecretFile[]
  errorType?:
    | 'auth'
    | 'timeout'
    | 'network'
    | 'conflict'
    | 'unknown'
    | 'no_oauth'
    | 'no_repo'
  httpStatus?: number
}

export type TeamMemorySyncUploadResult = {
  success: boolean
  checksum?: string
  lastModified?: string
  conflict?: boolean
  error?: string
  errorType?: 'auth' | 'timeout' | 'network' | 'unknown'
  httpStatus?: number
  serverErrorCode?: 'team_memory_too_many_entries'
  serverMaxEntries?: number
  serverReceivedEntries?: number
}
