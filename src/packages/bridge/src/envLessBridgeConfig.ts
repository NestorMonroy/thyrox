/**
 * Puerto fiel de `ccnmt: packages/bridge/src/envLessBridgeConfig.ts`.
 * `getFeatureValue_CACHED_MAY_BE_STALE`/`lazySchema`/`lt`/`getMacroVersion`
 * son sustitutos — ver `internal/pendingCrossPackageDeps.ts`.
 */
import { z } from 'zod/v4'
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getMacroVersion,
  lazySchema,
  lt,
} from './internal/pendingCrossPackageDeps.js'
import { isEnvLessBridgeEnabled } from './bridgeEnabled.js'

export type EnvLessBridgeConfig = {
  // withRetry — backoff en fase de init (createSession, POST /bridge, recovery /bridge)
  init_retry_max_attempts: number
  init_retry_base_delay_ms: number
  init_retry_jitter_fraction: number
  init_retry_max_delay_ms: number
  // timeout de axios para POST /sessions, POST /bridge, POST /archive
  http_timeout_ms: number
  // tamaño del ring de BoundedUUIDSet (dedup de echo + re-entrega)
  uuid_dedup_buffer_size: number
  // Cadencia de heartbeat del worker de CCRClient. El TTL del servidor es 60s — 20s da 3× de margen.
  heartbeat_interval_ms: number
  // ±fracción del intervalo — jitter por beat para repartir la carga de la flota.
  heartbeat_jitter_fraction: number
  // Dispara el refresh proactivo de JWT esto antes de expires_in. Buffer más
  // grande = refresh más frecuente (cadencia de refresh ≈ expires_in - buffer).
  token_refresh_buffer_ms: number
  // Timeout del POST de archive en teardown(). Distinto de http_timeout_ms
  // porque gracefulShutdown corre runCleanupFunctions() contra un tope de
  // 2s — un timeout de axios de 10s en un archive lento/colgado quema todo
  // el presupuesto en un request que forceExit va a matar de todos modos.
  teardown_archive_timeout_ms: number
  // Deadline para onConnect tras transport.connect(). Si ni onConnect ni
  // onClose disparan antes de esto, emite
  // tengu_bridge_repl_connect_timeout — la única telemetría para el ~1%
  // de sesiones que emiten `started` y luego quedan en silencio (sin
  // error, sin evento, sólo nada).
  connect_timeout_ms: number
  // Piso semver para el camino env-less del bridge. Separado de la
  // config v1 tengu_bridge_min_version para que un bug específico de v2
  // pueda forzar upgrades sin bloquear a los clientes v1 (basados en
  // env), y viceversa.
  min_version: string
  // Cuando es true, avisa a los usuarios que su app claude.ai puede ser
  // demasiado vieja para ver sesiones v2 — permite lanzar el bridge v2
  // antes de que la app envíe la nueva query de lista de sesiones.
  should_show_app_upgrade_message: boolean
}

export const DEFAULT_ENV_LESS_BRIDGE_CONFIG: EnvLessBridgeConfig = {
  init_retry_max_attempts: 3,
  init_retry_base_delay_ms: 500,
  init_retry_jitter_fraction: 0.25,
  init_retry_max_delay_ms: 4000,
  http_timeout_ms: 10_000,
  uuid_dedup_buffer_size: 2000,
  heartbeat_interval_ms: 20_000,
  heartbeat_jitter_fraction: 0.1,
  token_refresh_buffer_ms: 300_000,
  teardown_archive_timeout_ms: 1500,
  connect_timeout_ms: 15_000,
  min_version: '0.0.0',
  should_show_app_upgrade_message: false,
}

// Los pisos rechazan el objeto entero ante una violación (caen a
// DEFAULT) en vez de confiar parcialmente — misma defensa en
// profundidad que pollConfig.ts.
const envLessBridgeConfigSchema = lazySchema(() =>
  z.object({
    init_retry_max_attempts: z.number().int().min(1).max(10).default(3),
    init_retry_base_delay_ms: z.number().int().min(100).default(500),
    init_retry_jitter_fraction: z.number().min(0).max(1).default(0.25),
    init_retry_max_delay_ms: z.number().int().min(500).default(4000),
    http_timeout_ms: z.number().int().min(2000).default(10_000),
    uuid_dedup_buffer_size: z.number().int().min(100).max(50_000).default(2000),
    // El TTL del servidor es 60s. Piso 5s previene thrashing; tope 30s
    // mantiene ≥2× de margen.
    heartbeat_interval_ms: z
      .number()
      .int()
      .min(5000)
      .max(30_000)
      .default(20_000),
    // ±fracción por beat. Tope 0.5: al intervalo máximo (30s) × 1.5 =
    // 45s peor caso, todavía bajo el TTL de 60s.
    heartbeat_jitter_fraction: z.number().min(0).max(0.5).default(0.1),
    // Piso 30s previene tight-looping. Tope 30min rechaza la inversión
    // semántica buffer-vs-delay: ops entrando expires_in-5min (el
    // *delay hasta el refresh*) en vez de 5min (el *buffer antes de
    // expirar*) da delayMs = expires_in - buffer ≈ 5min en vez de ≈4h.
    // Ambos son duraciones positivas así que .min() solo no puede
    // distinguirlas; .max() atrapa el valor invertido porque un buffer
    // ≥ 30min no tiene sentido para un JWT de varias horas.
    token_refresh_buffer_ms: z
      .number()
      .int()
      .min(30_000)
      .max(1_800_000)
      .default(300_000),
    // Tope 2000 mantiene esto bajo la carrera de limpieza de 2s de
    // gracefulShutdown — un timeout más alto sólo le mentiría a axios ya
    // que forceExit mata el socket de todos modos.
    teardown_archive_timeout_ms: z
      .number()
      .int()
      .min(500)
      .max(2000)
      .default(1500),
    // El p99 de connect observado es ~2-3s; 15s es ~5× de margen. Piso
    // 5s acota la tasa de falsos positivos ante lentitud transitoria;
    // tope 60s acota cuánto tiempo una sesión verdaderamente colgada
    // queda a oscuras.
    connect_timeout_ms: z.number().int().min(5_000).max(60_000).default(15_000),
    min_version: z
      .string()
      .refine(v => {
        try {
          lt(v, '0.0.0')
          return true
        } catch {
          return false
        }
      })
      .default('0.0.0'),
    should_show_app_upgrade_message: z.boolean().default(false),
  }),
)

/**
 * Obtiene la config de timing del bridge env-less desde GrowthBook. Se
 * lee una vez por llamada a initEnvLessBridgeCore — la config queda
 * fija por la vida de una sesión de bridge.
 *
 * GrowthBook está stubeado en este build; el getter cacheado cae a
 * `defaultValue` (la config default del bridge env-less) cuando no hay
 * override fijado. Se queda async para preservar la firma existente de
 * la función para sus llamadores.
 */
export async function getEnvLessBridgeConfig(): Promise<EnvLessBridgeConfig> {
  const raw = getFeatureValue_CACHED_MAY_BE_STALE<unknown>(
    'tengu_bridge_repl_v2_config',
    DEFAULT_ENV_LESS_BRIDGE_CONFIG,
  )
  const parsed = envLessBridgeConfigSchema().safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_ENV_LESS_BRIDGE_CONFIG
}

/**
 * Devuelve un mensaje de error si la versión actual del CLI está por
 * debajo del mínimo requerido para el camino env-less (v2) del bridge, o
 * null si la versión está bien.
 *
 * Análogo v2 de checkBridgeMinVersion() — lee de
 * tengu_bridge_repl_v2_config en vez de tengu_bridge_min_version para
 * que las dos implementaciones puedan imponer pisos independientes.
 */
export async function checkEnvLessBridgeMinVersion(): Promise<string | null> {
  const cfg = await getEnvLessBridgeConfig()
  if (cfg.min_version && lt(getMacroVersion(), cfg.min_version)) {
    return `Your version of Claude Code (${getMacroVersion()}) is too old for Remote Control.\nVersion ${cfg.min_version} or higher is required. Run \`claude update\` to update.`
  }
  return null
}

/**
 * Si hay que empujar a los usuarios a actualizar su app claude.ai cuando
 * arranca una sesión Remote Control. True sólo cuando el bridge v2 está
 * activo Y el bit de config should_show_app_upgrade_message está fijado
 * — permite lanzar el bridge v2 antes de que la app envíe la nueva query
 * de lista de sesiones.
 */
export async function shouldShowAppUpgradeMessage(): Promise<boolean> {
  if (!isEnvLessBridgeEnabled()) return false
  const cfg = await getEnvLessBridgeConfig()
  return cfg.should_show_app_upgrade_message
}
