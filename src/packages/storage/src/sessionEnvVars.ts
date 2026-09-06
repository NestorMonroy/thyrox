/**
 * Variables de entorno con alcance de sesión, fijadas vía `/env`.
 * Se aplican SÓLO a los procesos hijos generados (overrides de entorno del
 * proveedor de bash), NUNCA al propio proceso del REPL.
 *
 * Adaptación fiel de ccnmt `packages/storage/src/sessionEnvVars.ts` — porte
 * completo, el archivo fuente tiene 22 líneas y cuatro símbolos.
 */
const sessionEnvVars = new Map<string, string>()

export function getSessionEnvVars(): ReadonlyMap<string, string> {
  return sessionEnvVars
}

export function setSessionEnvVar(name: string, value: string): void {
  sessionEnvVars.set(name, value)
}

export function deleteSessionEnvVar(name: string): void {
  sessionEnvVars.delete(name)
}

export function clearSessionEnvVars(): void {
  sessionEnvVars.clear()
}
