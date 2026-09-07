/**
 * Puerto de `ccnmt: packages/memory/src/teamMemSyncTypes.ts` (verbatim,
 * salvo `lazySchema` — ver más abajo).
 *
 * Tipos de Team Memory Sync.
 *
 * Esquemas Zod y tipos para la API de sync de memoria de equipo, con
 * alcance por repo. Basado en el contrato de API del backend de
 * anthropic/anthropic#250711.
 *
 * Único consumidor real: `teamMemorySyncWatcher.ts` (solo
 * `TeamMemorySyncPushResult`). Ver la nota de drift en `teamMemTypes.ts`
 * — los dos archivos declaran tipos casi idénticos de forma independiente
 * en la fuente; se portan ambos fieles a sí mismos.
 *
 * `lazySchema` NO se importa de `@claude-code-how-works/config/lazySchema`
 * (ese subpath no existe en `@thyrox/config`): se duplica localmente,
 * igual que ya hace `teamMemTypes.ts` — es el patrón que la propia fuente
 * documenta como intencional (`config/internal/lazySchema.ts`: "kept
 * package-internal … each owner duplicates it").
 */

import { z } from 'zod/v4'

function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

/**
 * Porción de contenido de los datos de memoria de equipo — almacenamiento
 * plano clave-valor. Las claves son rutas de archivo relativas al
 * directorio de memoria de equipo (p. ej. "MEMORY.md", "patterns.md"). Los
 * valores son contenido de cadena UTF-8 (típicamente Markdown).
 */
const TeamMemoryContentSchema = lazySchema(() =>
  z.object({
    entries: z.record(z.string(), z.string()),
    // SHA-256 por clave del contenido de la entrada (`sha256:<hex>`).
    // Agregado en anthropic/anthropic#283027. Opcional para compatibilidad
    // hacia adelante con despliegues de servidor más viejos; mapa vacío
    // cuando entries está vacío.
    entryChecksums: z.record(z.string(), z.string()).optional(),
  }),
)

/**
 * Respuesta completa de GET /api/claude_code/team_memory
 */
const TeamMemoryDataSchema = lazySchema(() =>
  z.object({
    organizationId: z.string(),
    repo: z.string(),
    version: z.number(),
    lastModified: z.string(), // ISO 8601 timestamp
    checksum: z.string(), // SHA256 with 'sha256:' prefix
    content: TeamMemoryContentSchema(),
  }),
)

/**
 * Cuerpo de error 413 estructurado del servidor
 * (anthropic/anthropic#293258). El `RequestTooLargeException` del servidor
 * serializa `error_code` y el dict `extra_details` aplanado en
 * `error.details`. Solo modelamos el caso too-many-entries; entry-too-large
 * se maneja vía el pre-chequeo `MAX_FILE_SIZE_BYTES` del lado cliente y
 * necesitaría un esquema separado.
 */
const TeamMemoryTooManyEntriesSchema = lazySchema(() =>
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

type TeamMemoryData = z.infer<ReturnType<typeof TeamMemoryDataSchema>>

/**
 * Un archivo saltado durante el push porque contiene un secreto
 * detectado. La ruta es relativa al directorio de memoria de equipo. Solo
 * se registra el ID de regla de gitleaks que coincidió — nunca el valor
 * del secreto en sí.
 */
export type SkippedSecretFile = {
  path: string
  /** ID de regla de gitleaks (p. ej. "github-pat", "aws-access-token"). */
  ruleId: string
  /** Label legible derivado del ID de regla. */
  label: string
}

/**
 * Resultado de obtener la memoria de equipo.
 */
type TeamMemorySyncFetchResult = {
  success: boolean
  data?: TeamMemoryData
  isEmpty?: boolean // true si 404 (no existen datos)
  notModified?: boolean // true si 304 (ETag coincidió, sin cambios)
  checksum?: string // ETag del header de la respuesta
  error?: string
  skipRetry?: boolean
  errorType?: 'auth' | 'timeout' | 'network' | 'parse' | 'unknown'
  httpStatus?: number
}

/**
 * Resultado de una sonda ligera de solo-metadata (GET ?view=hashes).
 * Contiene checksums por clave sin los cuerpos de entrada. Se usa para
 * refrescar `serverChecksums` barato durante la resolución de conflictos
 * 412.
 */
type TeamMemoryHashesResult = {
  success: boolean
  version?: number
  checksum?: string
  entryChecksums?: Record<string, string>
  error?: string
  errorType?: 'auth' | 'timeout' | 'network' | 'parse' | 'unknown'
  httpStatus?: number
}

/**
 * Resultado de subir memoria de equipo, con información de conflicto.
 */
export type TeamMemorySyncPushResult = {
  success: boolean
  filesUploaded: number
  checksum?: string
  conflict?: boolean // true si 412 Precondition Failed
  error?: string
  /** Archivos saltados por contener secretos detectados (PSR M22174). */
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

/**
 * Resultado de subir memoria de equipo.
 */
type TeamMemorySyncUploadResult = {
  success: boolean
  checksum?: string
  lastModified?: string
  conflict?: boolean // true si 412 Precondition Failed
  error?: string
  errorType?: 'auth' | 'timeout' | 'network' | 'unknown'
  httpStatus?: number
  /**
   * `error_code` estructurado de un cuerpo 413 parseado
   * (anthropic/anthropic#293258). Hoy solo se modela
   * 'team_memory_too_many_entries'; si el servidor agrega más
   * (entry_too_large, total_bytes_exceeded) extenderían esta unión. Se pasa
   * directo al evento tengu_team_mem_sync_push como faceta filtrable en
   * Datadog.
   */
  serverErrorCode?: 'team_memory_too_many_entries'
  /**
   * `max_entries` impuesto por el servidor, poblado cuando serverErrorCode
   * es team_memory_too_many_entries. Permite que el llamador cachee el
   * límite efectivo (posiblemente por-org) para los próximos pushes.
   */
  serverMaxEntries?: number
  /**
   * Cuántas entradas habría producido el push rechazado tras el merge.
   * Se puebla junto con serverMaxEntries.
   */
  serverReceivedEntries?: number
}
