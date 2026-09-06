import { createHash, randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Genera una ruta de archivo temporal.
 *
 * Adaptación fiel de `ccnmt: packages/storage/src/tempfile.ts` — sin deps
 * externas al paquete (sólo built-ins de Node), portada verbatim.
 *
 * @param prefix Prefijo opcional para el nombre del archivo temporal
 * @param extension Extensión de archivo opcional (por defecto '.md')
 * @param options.contentHash Cuando se provee, el identificador se deriva de
 *   un hash SHA-256 de esta cadena (primeros 16 hex). Esto produce una ruta
 *   ESTABLE entre procesos: cualquier proceso con el mismo contenido obtiene
 *   la misma ruta. Se usa cuando la ruta termina en contenido enviado a la
 *   API de Anthropic (p. ej. listas de denegación del sandbox en
 *   descripciones de herramienta), porque un UUID al azar cambiaría en cada
 *   spawn de subproceso e invalidaría el prefijo cacheado del prompt.
 * @returns Ruta del archivo temporal
 */
export function generateTempFilePath(
  prefix: string = 'claude-prompt',
  extension: string = '.md',
  options?: { contentHash?: string },
): string {
  const id = options?.contentHash
    ? createHash('sha256')
        .update(options.contentHash)
        .digest('hex')
        .slice(0, 16)
    : randomUUID()
  return join(tmpdir(), `${prefix}-${id}${extension}`)
}
