/**
 * Configuración de jitter de cron — porte de
 * `ccnmt: packages/agent/misc/cronJitterConfig.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada. La fuente lee
 * `tengu_kairos_cron_config` de GrowthBook
 * (`@claude-code-how-works/config/feature-flags`,
 * `getFeatureValue_CACHED_WITH_REFRESH`) y lo valida con un schema Zod
 * construido vía `lazySchema`
 * (`@claude-code-how-works/tool-registry/utils/lazySchema.js`) —
 * ninguno de los dos paquetes vive en este árbol (monorepo de 32
 * paquetes, fuera de alcance de este porte). Esta función devuelve
 * `DEFAULT_CRON_JITTER_CONFIG` (ya portado en `internal/cronTasksCore.ts`)
 * directamente: el camino dinámico (config remoto validado) no lo
 * ejercita ningún test portado — sólo lo consume
 * `internal/loopDynamicCore.ts` como un lector de configuración con
 * fallback, y el fallback ES el default.
 */
import type { CronJitterConfig } from '../internal/cronTasksCore.ts'
import { DEFAULT_CRON_JITTER_CONFIG } from '../internal/cronTasksCore.ts'

export function getCronJitterConfig(): CronJitterConfig {
  return DEFAULT_CRON_JITTER_CONFIG
}
