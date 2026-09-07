/**
 * Lectores puros de variables de entorno.
 *
 * PORTE PARCIAL, ampliado dos veces sobre la excepción declarada de
 * TASK-DOCS-0200 (porte de `@thyrox/shell`). La fuente
 * (`ccnmt: packages/config/env/utils.ts`, 224 líneas) declara 17 exports
 * —`getClaudeConfigHomeDir`, `getTeamsDir`, `hasNodeOption`, `isEnvTruthy`,
 * `isEnvDefinedFalsy`, `parseEnvVars`, `getAWSRegion`,
 * `getDefaultVertexRegion`, `shouldMaintainProjectWorkingDir`,
 * `isRunningOnHomespace`, `setCheckProtectedNamespaceFn`,
 * `isInProtectedNamespace`, `getVertexRegionForModel`, `readEnv`,
 * `getAllEnv`, `setEnv`, `deleteEnv`—.
 *
 * Cobertura, 5 de 17: `@thyrox/shell`'s `subprocessEnv.ts` consumía tres
 * (`getAllEnv`, `isEnvTruthy`, `readEnv`). El porte de `config/env/git-settings.ts`
 * y `config/env/paths.ts` (mismo pase que amplía este archivo) añadió dos
 * consumidores más: `isEnvDefinedFalsy` y `getClaudeConfigHomeDir` — se
 * completan aquí en vez de fabricarlos en el sitio, siguiendo el mismo
 * criterio que `paths/reach.ts: consumerRoot` («un porte parcial declarado
 * se completa cuando aparece su consumidor» — `porte-completo-no-parcial.md`).
 * El resto sigue OMITIDO por no estar ejercitado por ningún consumidor de
 * este árbol.
 *
 * @module
 */
import memoize from 'lodash-es/memoize.js'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Interpreta un valor de variable de entorno como verdadero/falso, con la
 * misma tolerancia de forma que usa el resto del proyecto: `1`, `true`,
 * `yes`, `on` (sin distinguir mayúsculas, con espacios al margen) cuentan
 * como verdadero; cualquier otra cosa, incluida la cadena vacía o
 * `undefined`, como falso. */
export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalized = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

/** Lector genérico de una variable de entorno arbitraria. */
export function readEnv(name: string): string | undefined {
  return process.env[name]
}

/** Fotografía del entorno completo — para pasarlo a un subproceso o
 * mezclarlo con settings, en vez de esparcir `{ ...process.env }` a mano. */
export function getAllEnv(): Record<string, string | undefined> {
  return { ...process.env }
}

/** El inverso booleano de `isEnvTruthy`: verdadero sólo cuando la variable
 * está DECLARADA y su valor la marca falsa (`0`, `false`, `no`, `off`). Una
 * variable ausente no cuenta — no equivale a "declarada como falsa". */
export function isEnvDefinedFalsy(
  envVar: string | boolean | undefined,
): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  const normalized = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalized)
}

/** El directorio de configuración del usuario: `CLAUDE_CONFIG_DIR`, o
 * `~/.claude`. Memoizado — se lee en cientos de sitios y se normaliza a NFC
 * una sola vez; la clave del memo es el propio valor de la variable, así que
 * un test que la cambie ve el nuevo valor sin `cache.clear()` explícito. */
export const getClaudeConfigHomeDir = memoize(
  (): string => {
    return (
      process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
    ).normalize('NFC')
  },
  () => process.env.CLAUDE_CONFIG_DIR,
)
