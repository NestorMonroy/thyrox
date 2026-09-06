/**
 * Metadata de evento — porte de `ccnmt: packages/agent/eventMetadata.ts`
 * (`getFileExtensionForAnalytics`).
 *
 * Parte el uso de herramienta por tipo de archivo. El valor no es la
 * extension cruda: es una CLAVE DE ANALITICA, y por eso se normaliza a
 * minusculas y se acota su cardinalidad. Una clave de alta cardinalidad no
 * particiona nada — reparte cada medicion en su propio cubo.
 */
import { extname } from 'node:path'

/**
 * Sobre esta longitud la extension deja de ser una categoria util y se
 * agrupa. Diez es el limite de la fuente y se porta verbatim: es politica
 * de analitica, no una propiedad del sistema de archivos.
 */
const MAX_EXTENSION_LENGTH = 10

/** El cubo de lo que excede el limite. */
const OVERFLOW_BUCKET = 'other'

/**
 * La extension de un archivo como clave de analitica.
 *
 * Devuelve indefinido —no cadena vacia— cuando no hay extension propia:
 * `README` no la tiene, y `.bashrc` tampoco, porque ahi el punto abre el
 * nombre en vez de separar la extension. Distinguir «sin extension» de
 * «extension vacia» es lo que impide que un cubo sin nombre acumule las
 * dos cosas.
 */
export function getFileExtensionForAnalytics(
  filePath: string,
): string | undefined {
  const extension = extname(filePath).toLowerCase()
  if (!extension || extension === '.') return undefined
  const normalized = extension.slice(1)
  return normalized.length > MAX_EXTENSION_LENGTH ? OVERFLOW_BUCKET : normalized
}
