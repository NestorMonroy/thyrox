/**
 * Sustitutos locales para símbolos de `ccnmt` (`claude-code-nestor-monroy-tools`,
 * alias `@claude-code-how-works/*`) que los 18 módulos asignados a este pase
 * necesitan, pero cuyo paquete de origen NO está portado hoy en `@thyrox/*`
 * (o el símbolo concreto no existe aún dentro de un paquete que sí resuelve).
 *
 * Mismo patrón que `internal/pendingCrossPackageDeps.ts` de los paquetes
 * hermanos (`mcp-runtime`, `storage`, `memory`, `headless-sdk`,
 * `local-observability`): un sustituto **pequeño y fiel** cuando el cuerpo
 * real es trivial; para lo NO trivial, cada módulo consumidor usa su propio
 * `require()` diferido apuntando al paquete futuro (ver comentarios en cada
 * archivo), porque un `import` estático de un miembro que el paquete destino
 * no exporta rompe la carga del módulo ENTERO, no sólo la función que lo usa.
 *
 * Cada entrada cita: símbolo · paquete de origen en ccnmt · por qué no
 * resuelve hoy en `@thyrox/*`.
 */

import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'

// ── ccnmt: packages/provider/src/userAgent.ts ───────────────────────────
// Módulo propio, dependency-free, NO asignado a este pase (no está en la
// lista de 18). Consumido por `http.ts` (asignado) y, en la fuente, por
// otros cinco archivos fuera de alcance.
export function getClaudeCodeUserAgent(): string {
  const version = getPackageVersion()
  return `claude-code-how-works-how-works/${version}`
}

// ── ccnmt: packages/provider/src/workloadContext.ts ─────────────────────
// AsyncLocalStorage module-level, NO asignado a este pase. `http.ts` sólo
// necesita el lector; el resto de la API (runWithWorkload, WORKLOAD_CRON)
// no tiene consumidor entre los 18.
import { AsyncLocalStorage } from 'node:async_hooks'
const workloadStorage = new AsyncLocalStorage<{ workload: string | undefined }>()
export function getWorkload(): string | undefined {
  return workloadStorage.getStore()?.workload
}

// `MACRO.VERSION` es un define de build de ccnmt (`scripts/defines.ts`,
// sustituido por Bun.build en tiempo de compilación). Aquí no hay build
// propio con ese macro, así que se resuelve en runtime desde el propio
// `package.json` del paquete — mismo patrón que `local-observability/sentry.ts`
// usa para `typeof MACRO !== 'undefined'`.
let cachedVersion: string | undefined
function getPackageVersion(): string {
  if (cachedVersion) return cachedVersion
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedVersion = (require('../../package.json') as { version: string }).version
  } catch {
    cachedVersion = '0.0.0'
  }
  return cachedVersion
}

// ── ccnmt: packages/provider/src/fastMode.ts → isFastModeEnabled ────────
// CORREGIDO en un pase posterior al que escribió esta nota:
// `fastMode.ts` YA se portó ENTERO (todos sus 15 símbolos de valor + 2
// tipos) — esta nota decía "NO está asignado a este pase", que dejó de
// ser cierto y no se actualizó al portarlo, dos fuentes de verdad para el
// mismo predicado. Verificado byte a byte: el cuerpo de este sustituto y
// el de `fastMode.ts:isFastModeEnabled` son IDÉNTICOS (misma expresión
// exacta) — no hubo divergencia de comportamiento en el tiempo que
// estuvieron duplicados.
//
// `costTracker.ts` ya se re-apuntó a `./fastMode.ts` directo (sin ciclo:
// `fastMode.ts` no importa `costTracker.ts`) y dejó de usar este
// sustituto. Este sustituto SIGUE VIVO sólo porque `model.ts` SÍ formaría
// un ciclo si importara de `fastMode.ts` — `fastMode.ts` importa
// `getDefaultMainLoopModelSetting`/`isOpus1mMergeEnabled`/
// `parseUserSpecifiedModel` de `./model.ts` (verificado con grep). Romper
// ese ciclo (extraer esos tres símbolos a un tercer módulo hoja) es
// trabajo de refactor que excede el alcance de "portar lo que falta"; se
// deja declarado aquí en vez de silenciado.
export function isFastModeEnabled(): boolean {
  return !isEnvTruthy(readEnv('CLAUDE_CODE_DISABLE_FAST_MODE'))
}

// ── ccnmt: packages/provider/src/advisor.ts → getAdvisorUsage ───────────
// `advisor.ts` completo NO está asignado a este pase. `costTracker.ts` sólo
// consume esta función pura (lee `usage.iterations`, filtra por tipo).
export function getAdvisorUsage<
  U extends { iterations?: unknown },
>(usage: U): Array<U & { model: string }> {
  const iterations = usage.iterations as Array<{ type: string }> | null | undefined
  if (!iterations) return []
  return iterations.filter(it => it.type === 'advisor_message') as unknown as Array<
    U & { model: string }
  >
}

// ── ccnmt: packages/config/env/utils.ts → hasNodeOption / isEnvDefinedFalsy
// `@thyrox/config/env/utils` sólo trae `isEnvTruthy`/`readEnv`/`getAllEnv`
// (porte parcial, TASK-DOCS-0200). Los dos siguientes son triviales y los
// necesitan `internal/caCerts.ts` y `context.ts` respectivamente.
export function hasNodeOption(flag: string): boolean {
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions) return false
  return nodeOptions.split(/\s+/).includes(flag)
}

export function isEnvDefinedFalsy(envVar: string | boolean | undefined): boolean {
  if (envVar === undefined || envVar === '') return false
  if (typeof envVar === 'boolean') return !envVar
  const normalized = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalized)
}

// ── ccnmt: packages/config/commonConstants.ts → getLocalISODate ─────────
// No existe `@thyrox/config/commonConstants`. Trivial: hoy local, con el
// mismo override ant-only por variable de entorno que la fuente declara.
export function getLocalISODate(): string {
  const override = readEnv('CLAUDE_CODE_OVERRIDE_DATE')
  if (override) return override
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── ccnmt: packages/config/env/utils.ts → isBareMode ─────────────────────
export function isBareMode(): boolean {
  return isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) || process.argv.includes('--bare')
}

// ── ccnmt: packages/config/env/git-settings.ts → shouldIncludeGitInstructions
// La fuente además consulta `getInitialSettings().includeGitInstructions`
// (config/settings, no portado). Sin ese árbol el default es `true`, igual
// que la fuente cuando la clave de settings no está presente.
export function shouldIncludeGitInstructions(): boolean {
  const envVal = process.env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS
  if (isEnvTruthy(envVal)) return false
  if (isEnvDefinedFalsy(envVal)) return true
  return true
}

// ── ccnmt: packages/config/sleep.ts ──────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── ccnmt: packages/config/signal.ts → createSignal ──────────────────────
// Micro pub-sub sin dependencias; forma observada en los consumidores
// (`onXChanged = signal.subscribe`, `signal.emit(...)`).
export function createSignal<Args extends unknown[] = []>(): {
  subscribe: (listener: (...args: Args) => void) => () => void
  emit: (...args: Args) => void
} {
  const listeners = new Set<(...args: Args) => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(...args) {
      for (const listener of listeners) listener(...args)
    },
  }
}

// ── ccnmt: packages/config/env/privacy-level.ts → isEssentialTrafficOnly
export function isEssentialTrafficOnly(): boolean {
  return isEnvTruthy(readEnv('CLAUDE_CODE_ESSENTIAL_TRAFFIC_ONLY'))
}

// ── ccnmt: packages/app-host/bootstrap/cleanupRegistry.ts → registerCleanup
// Zona prohibida (`app-host/bootstrap/`, la escribe otro agente en paralelo
// esta misma sesión). Sustituto local: registra el cleanup con el propio
// runtime (`process.on('exit', ...)`), mismo contrato observable
// (`registerCleanup(fn): void`, se ejecuta al terminar el proceso).
export function registerCleanup(fn: () => void | Promise<void>): void {
  process.on('exit', () => {
    void fn()
  })
}

// ── ccnmt: packages/provider/src/withRetry.ts → getRetryDelay ───────────
// `withRetry.ts` completo NO está asignado a este pase. `policyLimits/index.ts`
// sólo necesita esta función pura de backoff exponencial con jitter.
const BASE_DELAY_MS = 500
export function getRetryDelay(attempt: number, retryAfterHeader?: string | null, maxDelayMs = 32000): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10)
    if (!isNaN(seconds)) return seconds * 1000
  }
  const baseDelay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), maxDelayMs)
  const jitter = Math.random() * 0.25 * baseDelay
  return baseDelay + jitter
}

// ── ccnmt: packages/config/env/utils.ts → isRunningOnHomespace ───────────
export function isRunningOnHomespace(): boolean {
  return process.env.USER_TYPE === 'ant' && isEnvTruthy(process.env.COO_RUNNING_ON_HOMESPACE)
}

// ── ccnmt: packages/config/memoize.ts → memoizeWithTTLAsync — porte fiel ─
// `@thyrox/config/memoize.js` no existe. `authAlias.ts` lo necesita para
// `refreshAndGetAwsCredentials`/`refreshGcpCredentialsIfNeeded`.
type CacheEntry<T> = { value: T; timestamp: number; refreshing: boolean }
export function memoizeWithTTLAsync<Args extends unknown[], Result>(
  f: (...args: Args) => Promise<Result>,
  cacheLifetimeMs: number = 5 * 60 * 1000,
): ((...args: Args) => Promise<Result>) & { cache: { clear: () => void } } {
  const cache = new Map<string, CacheEntry<Result>>()
  const inFlight = new Map<string, Promise<Result>>()

  const memoized = async (...args: Args): Promise<Result> => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)
    const now = Date.now()

    if (!cached) {
      const pending = inFlight.get(key)
      if (pending) return pending
      const promise = f(...args)
      inFlight.set(key, promise)
      try {
        const result = await promise
        if (inFlight.get(key) === promise) {
          cache.set(key, { value: result, timestamp: now, refreshing: false })
        }
        return result
      } finally {
        if (inFlight.get(key) === promise) {
          inFlight.delete(key)
        }
      }
    }

    if (cached && now - cached.timestamp > cacheLifetimeMs && !cached.refreshing) {
      cached.refreshing = true
      const staleEntry = cached
      f(...args)
        .then(newValue => {
          if (cache.get(key) === staleEntry) {
            cache.set(key, { value: newValue, timestamp: Date.now(), refreshing: false })
          }
        })
        .catch(() => {
          if (cache.get(key) === staleEntry) {
            cache.delete(key)
          }
        })
      return cached.value
    }

    return cache.get(key)!.value
  }

  memoized.cache = {
    clear: () => {
      cache.clear()
      inFlight.clear()
    },
  }

  return memoized as ((...args: Args) => Promise<Result>) & { cache: { clear: () => void } }
}

// ── Sustitutos triviales para módulos hermanos NO asignados a este pase ──
// `./betas.ts` (clearBetasCaches), `@thyrox/tools` (clearToolSchemaCache):
// ambos son limpiadores de caché de otro subsistema; no-op seguro aquí —
// la caché real que existe (OAuth tokens) igual se limpia en el llamador.
export function clearBetasCaches(): void {
  // clearBetasCaches vive en ccnmt: packages/provider/src/betas.ts, NO
  // asignado a este pase. No-op: no hay caché de betas en este árbol aún.
}
export function clearToolSchemaCache(): void {
  // vive en @claude-code-how-works/tool-registry, sin equivalente en
  // @thyrox/tools todavía. No-op.
}

// ── ccnmt: packages/local-observability/src/slowOperations.ts → jsonParse
export function jsonParse(text: string): unknown {
  return JSON.parse(text)
}

// ── ccnmt: packages/config/env/utils.ts → getClaudeConfigHomeDir ─────────
// SUSTITUTO RETIRADO. Su motivo declarado —«no está entre los 3 exports de
// `@thyrox/config/env/utils`»— dejó de ser cierto. Y la réplica DIVERGÍA
// del canónico en dos puntos, así que no era inocua: no normalizaba a NFC
// (dos formas de la misma ruta con acento no comparaban iguales, y una de
// ellas creaba un directorio que nadie veía) y trataba un override vacío
// como ausente en vez de honrarlo. Se reexporta el canónico.
import { getClaudeConfigHomeDir } from '@thyrox/config/env/utils'
export { getClaudeConfigHomeDir }
