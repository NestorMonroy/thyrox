/**
 * Puerto fiel de `ccnmt: packages/storage/src/fileEncoding.ts` (1164 bytes
 * fuente, 1 símbolo exportado — porte completo).
 *
 * Extracted from file.ts to break the file ↔ fileReadCache import cycle:
 * fileReadCache needs detectFileEncoding, file.ts needs fileReadCache.
 * Putting detectFileEncoding in its own leaf module lets both depend on
 * the same module without forming a cycle.
 *
 * Divergencias declaradas — tres dependencias de paquete hermano ausente,
 * sustituidas localmente (DEC-04):
 *
 * - `logForDebugging` — la de `../internal/pendingCrossPackageDeps.js`
 *   (ya establecida por ese módulo).
 * - `isFsInaccessible` (de
 *   `@claude-code-how-works/local-observability/errorHelpers.js`) — se
 *   reimplementa aquí verbatim (`errorHelpers.ts:155-162`), sobre el
 *   `getErrnoCode` que ya exporta `./fsOperations.js` de este mismo
 *   paquete (mismo `getErrnoCode`, una sola definición).
 * - `logError` (de
 *   `@claude-code-how-works/local-observability/logging` →
 *   `logging/error-log.ts:125`) — sustituido por un `console.error`
 *   mínimo; ningún test de este pase ejercita la telemetría real, sólo
 *   que la rama de error inesperado (no-ENOENT/EACCES/etc.) se reporte y
 *   caiga al fallback `'utf8'`.
 */

import { getFsImplementation, getErrnoCode, safeResolvePath } from './fsOperations.js'
import { detectEncodingForResolvedPath } from './fileRead.js'
import { logForDebugging } from './internal/pendingCrossPackageDeps.js'

/**
 * Sustituto local de
 * `@claude-code-how-works/local-observability/errorHelpers.js`'s
 * `isFsInaccessible` — verbatim a `errorHelpers.ts:155-162`, sobre el
 * `getErrnoCode` de `./fsOperations.js`.
 */
function isFsInaccessible(e: unknown): e is NodeJS.ErrnoException {
  const code = getErrnoCode(e)
  return (
    code === 'ENOENT' ||
    code === 'EACCES' ||
    code === 'EPERM' ||
    code === 'ENOTDIR' ||
    code === 'ELOOP'
  )
}

/**
 * Sustituto local de
 * `@claude-code-how-works/local-observability/logging`'s `logError`.
 */
function logError(error: unknown): void {
  console.error(error)
}

export function detectFileEncoding(filePath: string): BufferEncoding {
  try {
    const fs = getFsImplementation()
    const { resolvedPath } = safeResolvePath(fs, filePath)
    return detectEncodingForResolvedPath(resolvedPath)
  } catch (error) {
    if (isFsInaccessible(error)) {
      // La fuente pasa `{ level: 'debug' }`; el sustituto de
      // `logForDebugging` (`internal/pendingCrossPackageDeps.ts`) sólo
      // distingue 'warn'/'error' (sin nivel 'debug'), así que se omite la
      // opción — cae a su rama por defecto (`console.error`).
      logForDebugging(
        `detectFileEncoding failed for expected reason: ${(error as { code?: string }).code}`,
      )
    } else {
      logError(error)
    }
    return 'utf8'
  }
}
