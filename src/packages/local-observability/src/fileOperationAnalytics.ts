/**
 * Puerto de `ccnmt: packages/local-observability/src/fileOperationAnalytics.ts`
 * (71 líneas fuente, 100 % portado). Analítica preservando privacidad
 * (hashing) para operaciones de archivo. Sin dependencias de paquete
 * hermano.
 */

import { createHash } from 'crypto'
import { logEvent } from './index.js'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from './compat.js'

/**
 * Crea un hash SHA256 truncado (16 caracteres) para rutas de archivo.
 * Se usa para analítica de operaciones de archivo que preserva privacidad.
 */
function hashFilePath(
  filePath: string,
): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return createHash('sha256')
    .update(filePath)
    .digest('hex')
    .slice(0, 16) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Crea un hash SHA256 completo (64 caracteres) para el contenido de un
 * archivo. Se usa para deduplicación y detección de cambios.
 */
function hashFileContent(
  content: string,
): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return createHash('sha256')
    .update(content)
    .digest('hex') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

// Tamaño máximo de contenido a hashear (100KB) — evita agotar memoria al
// hashear archivos grandes (p. ej. imágenes en base64).
const MAX_CONTENT_HASH_SIZE = 100 * 1024

/** Loguea analítica de operación de archivo a Statsig. */
export function logFileOperation(params: {
  operation: 'read' | 'write' | 'edit'
  tool: 'FileReadTool' | 'FileWriteTool' | 'FileEditTool'
  filePath: string
  content?: string
  type?: 'create' | 'update'
}): void {
  const metadata: Record<
    string,
    | AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    | number
    | boolean
  > = {
    operation:
      params.operation as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    tool: params.tool as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    filePathHash: hashFilePath(params.filePath),
  }

  // Sólo hashea el contenido si está presente y bajo el límite de tamaño.
  if (
    params.content !== undefined &&
    params.content.length <= MAX_CONTENT_HASH_SIZE
  ) {
    metadata.contentHash = hashFileContent(params.content)
  }

  if (params.type !== undefined) {
    metadata.type =
      params.type as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  }

  logEvent('tengu_file_operation', metadata)
}
