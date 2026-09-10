/**
 * Puerto de `ccnmt: packages/config/sync/types.ts` (67 líneas fuente).
 * Reimplementación fiel VERBATIM.
 *
 * Tipos de Settings Sync.
 *
 * Esquemas y tipos Zod para la API de sync de settings de usuario. Basado
 * en el contrato de API del backend de anthropic/anthropic#218817.
 */

import { z } from 'zod/v4'
import { lazySchema } from '../internal/lazySchema.ts'

/**
 * Porción de contenido de los datos de sync de usuario — almacenamiento
 * plano clave-valor. Las claves son cadenas opacas (típicamente rutas de
 * archivo). Los valores son contenido de cadena UTF-8 (JSON, Markdown,
 * etc).
 */
export const UserSyncContentSchema = lazySchema(() =>
  z.object({
    entries: z.record(z.string(), z.string()),
  }),
)

/**
 * Respuesta completa de GET /api/claude_code/user_settings.
 */
export const UserSyncDataSchema = lazySchema(() =>
  z.object({
    userId: z.string(),
    version: z.number(),
    lastModified: z.string(), // timestamp ISO 8601
    checksum: z.string(), // hash MD5
    content: UserSyncContentSchema(),
  }),
)

export type UserSyncData = z.infer<ReturnType<typeof UserSyncDataSchema>>

/**
 * Resultado de obtener los settings de usuario.
 */
export type SettingsSyncFetchResult = {
  success: boolean
  data?: UserSyncData
  isEmpty?: boolean // verdadero si 404 (no hay datos)
  error?: string
  skipRetry?: boolean
}

/**
 * Resultado de subir los settings de usuario.
 */
export type SettingsSyncUploadResult = {
  success: boolean
  checksum?: string
  lastModified?: string
  error?: string
}

/**
 * Claves usadas para entradas de sync.
 */
export const SYNC_KEYS = {
  USER_SETTINGS: '~/.claude/settings.json',
  USER_MEMORY: '~/.claude/CLAUDE.md',
  projectSettings: (projectId: string) =>
    `projects/${projectId}/.claude/settings.local.json`,
  projectMemory: (projectId: string) => `projects/${projectId}/CLAUDE.local.md`,
} as const
