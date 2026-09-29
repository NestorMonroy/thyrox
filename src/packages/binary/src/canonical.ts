/**
 * La versión de la referencia contra la que se mide la paridad.
 *
 * Se declara aquí y no se deriva del corpus más reciente: si el ejecutable
 * vivo se actualiza y alguien extrae la versión nueva, las herramientas de
 * lectura (`symbol`, `literal`, `references`, `declarations`) seguirían
 * midiendo contra la canónica. Cambiarla es una decisión explícita, con su
 * propio commit, no el efecto lateral de una extracción.
 */
import { join } from 'node:path'

export const CANONICAL_REFERENCE_VERSION = '2.1.283'

/** El `bunfs-root` de la versión canónica dentro de un directorio de corpus. */
export function canonicalRoot(corpusDir: string): string {
  return join(corpusDir, CANONICAL_REFERENCE_VERSION, 'bunfs-root')
}
