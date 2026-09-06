/**
 * Lectores puros de variables de entorno.
 *
 * PORTE PARCIAL, y por excepción declarada de TASK-DOCS-0200 (porte de
 * `@thyrox/shell`). La fuente
 * (`claude-code-nestor-monroy-tools: packages/config/env/utils.ts`,
 * 224 líneas) declara 17 exports —`getClaudeConfigHomeDir`, `getTeamsDir`,
 * `hasNodeOption`, `isEnvTruthy`, `isEnvDefinedFalsy`, `parseEnvVars`,
 * `getAWSRegion`, `getDefaultVertexRegion`,
 * `shouldMaintainProjectWorkingDir`, `isRunningOnHomespace`,
 * `setCheckProtectedNamespaceFn`, `isInProtectedNamespace`,
 * `getVertexRegionForModel`, `readEnv`, `getAllEnv`, `setEnv`,
 * `deleteEnv`—. `@thyrox/shell`'s `subprocessEnv.ts` sólo consume tres:
 * `getAllEnv`, `isEnvTruthy`, `readEnv`. Se portan sólo esas tres; el resto
 * se OMITE por no estar ejercitado por ningún test de esta tarea.
 *
 * @module
 */

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
