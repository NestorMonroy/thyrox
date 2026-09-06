/**
 * Porte PARCIAL de `ccnmt: packages/storage/src/glob.ts` — sólo
 * `extractGlobBaseDirectory`, el helper puro que separa un patrón glob en
 * un directorio base estático + un patrón relativo. No se porta la función
 * `glob()` (la que de verdad invoca ripgrep): depende de
 * `@claude-code-how-works/tool-registry` (`Tool.js`, `ripgrep.js`) y de
 * `@claude-code-how-works/permission/filesystem` y
 * `@claude-code-how-works/config/plugin/orphanedPluginFilter` — ninguno
 * tiene hogar en este árbol todavía, y ningún test de este porte la
 * ejercita. Declarado, no diferido en silencio (ver
 * `hallazgo-abierto-genera-sucesor.md` de kaupamex-docs, mismo criterio).
 *
 * `getPlatform` sustituye a `@claude-code-how-works/config/platform` (ver
 * `./internal/pendingCrossPackageDeps.ts`); la rama Windows-drive-root que
 * consume no está ejercitada por `extractGlobBaseDirectory.test.ts`, pero
 * se conserva fiel a la fuente.
 */

import { basename, dirname, sep } from 'path'
import { getPlatform } from './internal/pendingCrossPackageDeps.js'

/**
 * Extrae el directorio base estático de un patrón glob.
 * El directorio base es todo lo anterior al primer carácter especial de
 * glob (* ? [ {). Retorna la porción de directorio y el patrón relativo
 * restante.
 */
export function extractGlobBaseDirectory(pattern: string): {
  baseDir: string
  relativePattern: string
} {
  // Encuentra el primer carácter especial de glob: *, ?, [, {
  const globChars = /[*?[{]/
  const match = pattern.match(globChars)

  if (!match || match.index === undefined) {
    // Sin caracteres de glob — es una ruta literal.
    // Retorna la porción de directorio y el nombre de archivo como patrón.
    const dir = dirname(pattern)
    const file = basename(pattern)
    return { baseDir: dir, relativePattern: file }
  }

  // Todo lo anterior al primer carácter de glob.
  const staticPrefix = pattern.slice(0, match.index)

  // Encuentra el último separador de ruta en el prefijo estático.
  const lastSepIndex = Math.max(
    staticPrefix.lastIndexOf('/'),
    staticPrefix.lastIndexOf(sep),
  )

  if (lastSepIndex === -1) {
    // Sin separador de ruta antes del glob — el patrón es relativo a cwd.
    return { baseDir: '', relativePattern: pattern }
  }

  let baseDir = staticPrefix.slice(0, lastSepIndex)
  const relativePattern = pattern.slice(lastSepIndex + 1)

  // Maneja patrones de directorio raíz (p. ej. /*.txt en Unix o C:/*.txt en
  // Windows). Cuando lastSepIndex es 0, baseDir queda vacío pero
  // necesitamos usar '/' como raíz.
  if (baseDir === '' && lastSepIndex === 0) {
    baseDir = '/'
  }

  // Maneja rutas de raíz de unidad de Windows (p. ej. C:/*.txt).
  // 'C:' significa "directorio actual en la unidad C" (relativo), no raíz.
  // Se necesita 'C:/' o 'C:\' para la raíz real de la unidad.
  if (getPlatform() === 'windows' && /^[A-Za-z]:$/.test(baseDir)) {
    baseDir = baseDir + sep
  }

  return { baseDir, relativePattern }
}
