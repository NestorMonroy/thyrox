/**
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `logError` de
 * `local-observability/logging` (`ccnmt: packages/local-observability/src/
 * logging/error-log.ts`), que delega en un sink de error-log con cola de
 * eventos y comprobaciones de `--hard-fail`/Bedrock/Vertex/Foundry/
 * `DISABLE_ERROR_REPORTING`. Aquí `@thyrox/local-observability` depende de
 * este paquete (`cache-paths`, `fsOperations`), así que importarlo cerraría
 * el ciclo en carga; queda un envoltorio sobre `console.error`, el mismo
 * respaldo que `agent/internal/logging.ts` usa sin host instalado.
 * Retirarlo exige romper ese ciclo (#53).
 */
export function logError(error: unknown): void {
  console.error(error)
}
