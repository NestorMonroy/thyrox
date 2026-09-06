/**
 * Registro global de funciones de limpieza que deben correr durante el
 * apagado ordenado (graceful shutdown). Este módulo está separado de
 * `gracefulShutdown.ts` para evitar dependencias circulares.
 *
 * ADVERTENCIA DE SINGLETON: `cleanupFunctions` es un Set a nivel de módulo.
 * Los consumidores deben pasar por este archivo canónico (o su fachada
 * `src/utils/cleanupRegistry.ts`) — nunca duplicar el registro.
 *
 * Porte de `ccnmt: packages/app-host/src/bootstrap/cleanupRegistry.ts`.
 */

const cleanupFunctions = new Set<() => Promise<void>>()

/**
 * Registra una función de limpieza para correr durante el apagado ordenado.
 * @param cleanupFn - Función a correr durante la limpieza (puede ser sync o async)
 * @returns Función de desregistro que quita el handler de limpieza
 */
export function registerCleanup(cleanupFn: () => Promise<void>): () => void {
  cleanupFunctions.add(cleanupFn)
  return () => cleanupFunctions.delete(cleanupFn)
}

/**
 * Corre todas las funciones de limpieza registradas.
 * Usado internamente por gracefulShutdown.
 */
export async function runCleanupFunctions(): Promise<void> {
  await Promise.all(Array.from(cleanupFunctions).map(fn => fn()))
}
