/**
 * Puerto fiel de `ccnmt: packages/bridge/src/pollConfig.ts`.
 * `getFeatureValue_CACHED_WITH_REFRESH` y `lazySchema` son sustitutos —
 * ver `internal/pendingCrossPackageDeps.ts`. `zod` es dependencia npm
 * real.
 */
import { z } from 'zod/v4'
import {
  getFeatureValue_CACHED_WITH_REFRESH,
  lazySchema,
} from './internal/pendingCrossPackageDeps.js'
import {
  DEFAULT_POLL_CONFIG,
  type PollIntervalConfig,
} from './pollConfigDefaults.js'

// .min(100) en los intervalos de búsqueda de trabajo restaura el viejo
// piso Math.max(..., 100) como defensa en profundidad contra valores mal
// tecleados de GrowthBook. A diferencia de un clamp, Zod rechaza el
// objeto entero ante una violación — una config con un campo malo cae
// enteramente a DEFAULT_POLL_CONFIG en vez de confiarse parcialmente.
//
// Los intervalos at_capacity usan un refinamiento 0-o-≥100: 0 significa
// "deshabilitado" (modo sólo-heartbeat), ≥100 es el piso anti-typo. Los
// valores 1-99 se rechazan para que una confusión de unidad (ops piensa
// en segundos, entra 10) no haga poll cada 10ms contra el camino de BD
// de VerifyEnvironmentSecretAuth.
//
// Los refines a nivel de objeto exigen al menos un mecanismo de vida
// en capacidad habilitado: heartbeat U el intervalo de poll relevante.
// Sin esto, la config con drift hb=0, atCapMs=0 (ops deshabilita el
// heartbeat sin restaurar at_capacity) se cuela por cada sitio de
// throttle sin ningún sleep — haciendo tight-loop de /poll a velocidad
// de round-trip HTTP.
const zeroOrAtLeast100 = {
  message: 'must be 0 (disabled) or ≥100ms',
}
const pollIntervalConfigSchema = lazySchema(() =>
  z
    .object({
      poll_interval_ms_not_at_capacity: z.number().int().min(100),
      // 0 = sin polling en capacidad. Independiente del heartbeat —
      // ambos pueden estar habilitados (el heartbeat corre, sale
      // periódicamente a hacer poll).
      poll_interval_ms_at_capacity: z
        .number()
        .int()
        .refine(v => v === 0 || v >= 100, zeroOrAtLeast100),
      // 0 = deshabilitado; valor positivo = heartbeat a este intervalo
      // mientras se está en capacidad. Corre junto al polling en
      // capacidad, no en su lugar. Se llama non_exclusive para
      // distinguirlo del viejo campo heartbeat_interval_ms (semántica
      // either-or en clientes pre-#22145). .default(0) para que las
      // configs de GrowthBook existentes sin este campo parseen con éxito.
      non_exclusive_heartbeat_interval_ms: z.number().int().min(0).default(0),
      // Intervalos multisesión (bridgeMain.ts). Los defaults coinciden
      // con los valores single-session para que las configs existentes
      // sin estos campos preserven el comportamiento actual.
      multisession_poll_interval_ms_not_at_capacity: z
        .number()
        .int()
        .min(100)
        .default(
          DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_not_at_capacity,
        ),
      multisession_poll_interval_ms_partial_capacity: z
        .number()
        .int()
        .min(100)
        .default(
          DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_partial_capacity,
        ),
      multisession_poll_interval_ms_at_capacity: z
        .number()
        .int()
        .refine(v => v === 0 || v >= 100, zeroOrAtLeast100)
        .default(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_at_capacity),
      // .min(1) coincide con la restricción ge=1 del servidor (work_v1.py:230).
      reclaim_older_than_ms: z.number().int().min(1).default(5000),
      session_keepalive_interval_v2_ms: z
        .number()
        .int()
        .min(0)
        .default(120_000),
    })
    .refine(
      cfg =>
        cfg.non_exclusive_heartbeat_interval_ms > 0 ||
        cfg.poll_interval_ms_at_capacity > 0,
      {
        message:
          'at-capacity liveness requires non_exclusive_heartbeat_interval_ms > 0 or poll_interval_ms_at_capacity > 0',
      },
    )
    .refine(
      cfg =>
        cfg.non_exclusive_heartbeat_interval_ms > 0 ||
        cfg.multisession_poll_interval_ms_at_capacity > 0,
      {
        message:
          'at-capacity liveness requires non_exclusive_heartbeat_interval_ms > 0 or multisession_poll_interval_ms_at_capacity > 0',
      },
    ),
)

/**
 * Obtiene la config de intervalo de poll del bridge desde GrowthBook con
 * una ventana de refresco de 5 minutos. Valida el JSON servido contra el
 * schema; cae a los defaults si la bandera está ausente, malformada, o
 * parcialmente especificada.
 *
 * Compartido por bridgeMain.ts (standalone) y replBridge.ts (REPL) para
 * que ops pueda ajustar ambas tasas de poll fleet-wide con un solo push
 * de config.
 */
export function getPollIntervalConfig(): PollIntervalConfig {
  const raw = getFeatureValue_CACHED_WITH_REFRESH<unknown>(
    'tengu_bridge_poll_interval_config',
    DEFAULT_POLL_CONFIG,
    5 * 60 * 1000,
  )
  const parsed = pollIntervalConfigSchema().safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_POLL_CONFIG
}
