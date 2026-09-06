/**
 * Configuración de jitter de cron, respaldada por GrowthBook — puerto de
 * `ccnmt: packages/agent/misc/cronJitterConfig.ts`.
 *
 * Separado de `scheduler.ts` para que el scheduler pueda empaquetarse en
 * un build público sin arrastrar analytics/growthbook y su árbol grande
 * de dependencias transitivas (ciclo settings/hooks/config).
 *
 * DIVERGENCIA DE ALCANCE, declarada. La fuente importa
 * `getFeatureValue_CACHED_WITH_REFRESH` de
 * `@claude-code-how-works/config/feature-flags` y `lazySchema` de
 * `@claude-code-how-works/tool-registry/utils/lazySchema.js` — ninguno
 * de los dos vive en este árbol (medido: `ls src/packages/`). El
 * primero se sustituye por el homónimo de `../scheduler.ts` — ver la
 * cabecera de ese archivo para el porqué del límite de archivo; el
 * segundo se reimplementa localmente en 4 líneas, mismo criterio que ya
 * usa `../tasks.ts` para el mismo caso ("Reimplementaciones locales de
 * utilidades de paquetes hermanos ausentes"), en vez de importar la
 * versión ya portada en `../internalUtils.ts` — evita sumar un borde de
 * dependencia hacia un archivo que este porte no necesita tocar.
 *
 * Uso:
 *   REPL (useScheduledTasks.ts): pasar `getJitterConfig: getCronJitterConfig`
 *   Daemon/SDK: omitir getJitterConfig → aplica DEFAULT_CRON_JITTER_CONFIG.
 */
import { z } from 'zod'
import {
  type CronJitterConfig,
  DEFAULT_CRON_JITTER_CONFIG,
} from '../internal/cronTasksCore.ts'
import { getFeatureValue_CACHED_WITH_REFRESH } from '../scheduler.ts'

/** ≙ `tool-registry/utils/lazySchema.ts` — memoiza la construcción al primer uso. */
function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

// Cada cuánto releer tengu_kairos_cron_config de GrowthBook. Corto porque es
// una palanca de incidente — cuando se empuja un cambio de config para
// descargar el pico de las :00, se quiere que la flota converja en un minuto,
// no en el próximo reinicio de proceso. La llamada subyacente es una lectura
// de caché síncrona; el refresh sólo limpia la entrada memoizada para que la
// siguiente lectura dispare un fetch en segundo plano.
const JITTER_CONFIG_REFRESH_MS = 60 * 1000

// Las cotas superiores aquí son defensa en profundidad contra un push de
// GrowthBook con un dedo torcido. Igual que pollConfig.ts, Zod rechaza el
// objeto entero ante cualquier violación en vez de confiar parcialmente en
// él — una config con un solo campo malo cae por completo a
// DEFAULT_CRON_JITTER_CONFIG. oneShotFloorMs comparte el techo de
// oneShotMaxMs (floor > max invertiría el rango de jitter) y se
// cruza-verifica en el refine; el techo compartido deja explícita la cota
// individual en la ruta de error. recurringMaxAgeMs usa `.default()` para
// que una config de GB preexistente sin el campo no se rechace en bloque —
// los demás campos se agregaron juntos al concebir la config y no
// necesitan esto.
const HALF_HOUR_MS = 30 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const cronJitterConfigSchema = lazySchema(() =>
  z
    .object({
      recurringFrac: z.number().min(0).max(1),
      recurringCapMs: z.number().int().min(0).max(HALF_HOUR_MS),
      oneShotMaxMs: z.number().int().min(0).max(HALF_HOUR_MS),
      oneShotFloorMs: z.number().int().min(0).max(HALF_HOUR_MS),
      oneShotMinuteMod: z.number().int().min(1).max(60),
      recurringMaxAgeMs: z
        .number()
        .int()
        .min(0)
        .max(THIRTY_DAYS_MS)
        .default(DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs),
      cacheLeadMs: z
        .number()
        .int()
        .min(0)
        .max(60_000)
        .default(DEFAULT_CRON_JITTER_CONFIG.cacheLeadMs),
    })
    .refine(c => c.oneShotFloorMs <= c.oneShotMaxMs),
)

/**
 * Lee `tengu_kairos_cron_config` de GrowthBook, valida, y cae a los
 * defaults ante config ausente/malformada/fuera de rango. Se llama desde
 * check() en cada tick vía el callback `getJitterConfig` — barato (hit de
 * caché síncrono). Ventana de refresh: JITTER_CONFIG_REFRESH_MS.
 *
 * Exportada para que los runbooks de ops puedan apuntar a una sola
 * función al documentar la palanca, y para que los tests puedan espiarla
 * sin mockear GrowthBook mismo.
 *
 * Pasar esto como `getJitterConfig` al llamar createCronScheduler en
 * contextos REPL. Los llamadores de Daemon/SDK omiten getJitterConfig y
 * obtienen los defaults.
 */
export function getCronJitterConfig(): CronJitterConfig {
  const raw = getFeatureValue_CACHED_WITH_REFRESH<unknown>(
    'tengu_kairos_cron_config',
    DEFAULT_CRON_JITTER_CONFIG,
    JITTER_CONFIG_REFRESH_MS,
  )
  const parsed = cronJitterConfigSchema().safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_CRON_JITTER_CONFIG
}
