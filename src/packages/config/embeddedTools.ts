/**
 * Puerto de `ccnmt: packages/config/embeddedTools.ts` (29 líneas fuente).
 * Reimplementación fiel VERBATIM.
 */
import { isEnvTruthy, readEnv } from './env/utils.ts'

/**
 * Si este build tiene bfs/ugrep embebidos en el binario de bun (sólo builds
 * nativos de ant).
 *
 * Cuando es verdadero:
 * - `find` y `grep` en la shell Bash de Claude quedan sombreados por
 *   funciones de shell que invocan el binario de bun con
 *   `argv0='bfs'` / `argv0='ugrep'` (mismo truco que ripgrep embebido).
 * - Las herramientas dedicadas Glob/Grep se retiran del registro de
 *   herramientas.
 * - La guía de prompt que aleja a Claude de find/grep se omite.
 *
 * Se fija como `define` en tiempo de build en
 * `scripts/build-with-plugins.ts` para builds nativos de ant.
 */
export function hasEmbeddedSearchTools(): boolean {
  if (!isEnvTruthy(readEnv('EMBEDDED_SEARCH_TOOLS'))) return false
  const e = readEnv('CLAUDE_CODE_ENTRYPOINT')
  return (
    e !== 'sdk-ts' && e !== 'sdk-py' && e !== 'sdk-cli' && e !== 'local-agent'
  )
}

/**
 * Ruta al binario de bun que contiene las herramientas de búsqueda
 * embebidas. Sólo tiene sentido cuando `hasEmbeddedSearchTools()` es
 * verdadero.
 */
export function embeddedSearchToolsBinaryPath(): string {
  return process.execPath
}
