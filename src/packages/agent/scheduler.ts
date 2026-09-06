/**
 * Facade del subsistema de scheduling — puerto MÍNIMO de
 * `ccnmt: packages/agent/scheduler.ts` (67 líneas, re-exporta seis
 * módulos internos: `cronCore`, `cronTasksCore`, `cronTasksLockCore`,
 * `cronSchedulerCore`, `loopDynamicCore`, `loopSentinelCore`).
 *
 * PORTE PARCIAL, declarado. Este archivo re-exporta únicamente lo que
 * `__tests__/cronJitterConfig.test.ts` importa de él —
 * `DEFAULT_CRON_JITTER_CONFIG` (y el tipo `CronJitterConfig` que lo
 * acompaña)— desde `./internal/cronTasksCore.ts`, ya portado en este
 * árbol. Ninguno de los símbolos de `cronCore.ts`, `loopDynamicCore.ts` ni
 * `loopSentinelCore.ts` (los otros tres módulos internos que sí existen
 * aquí) se re-exporta: el test que este porte cubre no los ejercita, y
 * `cronTasksLockCore` / `cronSchedulerCore` (los dos que la fuente
 * también re-exporta) no tienen puerto todavía en `internal/`. Ampliar
 * este facade a la forma completa de la fuente es trabajo de un porte
 * posterior, cuando aparezca un consumidor de esos símbolos.
 *
 * Además de la reexportación, este archivo aporta
 * `getFeatureValue_CACHED_WITH_REFRESH` — un símbolo que NO existe en la
 * fuente real de `scheduler.ts`. Por qué vive aquí de todos modos:
 *
 * La fuente de `misc/cronJitterConfig.ts` importa esa función de
 * `@claude-code-how-works/config/feature-flags`, que no existe en este
 * árbol (medido: `ls src/packages/` sólo trae `agent`, `binary`,
 * `command-runtime`, `config`, `harness`, `tasks`; el único paquete
 * `config` es `@thyrox/config`, sin ningún módulo de feature flags). El
 * sustituto no puede vivir DENTRO de `cronJitterConfig.ts` mismo: el test
 * portado intercepta esta función con `mock.module` antes de importar
 * `getCronJitterConfig`, y `mock.module` sólo intercepta una importación
 * entre DOS módulos distintos — si la función viviera en el mismo archivo
 * que la invoca, `getCronJitterConfig` seguiría cerrando sobre la
 * referencia real de su propio scope léxico, y el mock nunca la
 * alcanzaría. Es el mismo patrón ya establecido en este árbol entre
 * `./featureFlags.ts` y `./agentSwarmsEnabled.ts` (con su test
 * `agentSwarmsEnabled.test.ts` mockeando `../featureFlags.ts`).
 *
 * Con el alcance de este porte cerrado a exactamente tres archivos
 * (`toolSearch.ts`, `misc/cronJitterConfig.ts`, `scheduler.ts` — no se
 * puede crear un cuarto archivo tipo `misc/featureFlagsRefresh.ts`), este
 * facade — que de todos modos es el módulo del que `misc/cronJitterConfig.ts`
 * ya importaría `DEFAULT_CRON_JITTER_CONFIG` según la estructura pública
 * de la fuente — es el único límite de archivo disponible para alojarla.
 *
 * El comportamiento reproduce el mismo criterio que
 * `./featureFlags.ts::getFeatureValue_CACHED_MAY_BE_STALE` ya declara
 * para este árbol: sin cliente GrowthBook instalado (despliegue
 * self-hosted de un solo operador), toda lectura remota devuelve el
 * `fallback` que pasa quien llama. El parámetro `refreshMs` se conserva
 * en la firma — fidelidad de forma con la fuente — y se ignora, porque no
 * hay caché remota que refrescar.
 */
export type { CronJitterConfig } from './internal/cronTasksCore.ts'
export { DEFAULT_CRON_JITTER_CONFIG } from './internal/cronTasksCore.ts'

export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  _key: string,
  fallback: T,
  _refreshMs: number,
): T {
  return fallback
}
