/**
 * Configuración declarativa del daemon (`daemon.json`): tipos de worker,
 * feature gate de `remoteControl`, carga y validación del archivo, diff
 * para recarga en caliente y vigilancia de cambios.
 *
 * Puerto de `Mr`, `Ct`, `Tt` y las constantes `Cr`/`Tr`
 * (`chunk-92tvramn.js`, referencia 2.1.283, resueltos con `bin/binary
 * symbol`):
 *   - `Mr` → `countConfiguredWorkers`
 *   - `Ct` (envoltorio de `s7e`, `chunk-aywxqprf.js:14603-14675`) →
 *     `isWorkerKindEnabled`
 *   - `Tt` → sólo la parte de configuración/diff/vigilancia:
 *     `loadDaemonConfig` (`_Ie`, `chunk-6swydj68.js:1553-2318`),
 *     `diffDaemonConfigForReload` (`l6r`, `chunk-6swydj68.js:3194-3608`),
 *     `watchDaemonConfigFile` (`Vbn`, `chunk-6swydj68.js:2748-3194`),
 *     `emptyDaemonConfig` (`zbn`, `chunk-6swydj68.js:1517-1553`) y
 *     `emitDaemonConfigReloadEvent` (el bloque final de `Tt` que emite
 *     `tengu_daemon_config_reload`)
 *   - `Cr`=1000/`Tr`=5000 → `DAEMON_CONFIG_STOP_DRAIN_MS`/
 *     `DAEMON_STATUS_WRITE_RETRY_MS`
 *
 * `runSupervisor` (`main.ts`) hoy usa una lista fija de un único worker
 * `remoteControl`, sin noción de `daemon.json`. Su cableado a este
 * módulo —leer la config, aplicar el feature gate, vigilar el archivo y
 * aplicar el plan de recarga a los workers vivos— queda declarado
 * `// pendiente` en `main.ts` para otra ola: ese archivo no se toca aquí.
 *
 * // pendiente: lo que NO se porta, y por qué:
 * // - El resto de `Tt` (spawnear `Ue` por entrada, `busyWorkerCount`,
 * //   `hasOAuthConsumer`, `stop`) agrega estado de procesos hijos VIVOS
 * //   —eso es `Ue`, territorio de D9— y no tiene equivalente puro que
 * //   portar en un módulo de sólo configuración.
 * // - La persistencia de estado a disco (`b7n`/`S7n`,
 * //   `chunk-egkwesgj.js`) no se porta: el daemon no abre archivos de
 * //   estado propios fuera de lo que ya cubre `local-observability`
 * //   (`.claude/rules/persistencia-y-procesos.md`).
 * // - La rama `storageV5` de `_Ie`/`D` (`chunk-6swydj68.js:2318-2748`)
 * //   no se porta: thyrox no tiene esa capa de almacenamiento alterna;
 * //   sólo se porta la rama de sistema de archivos plano.
 * // - El validador de `ae`/`itr` (`chunk-aywxqprf.js`/`chunk-amh7298e.js`)
 * //   no vive en `chunk-92tvramn.js` y no es símbolo de este ítem; los
 * //   tipos de configuración de abajo son una reimplementación fiel
 * //   ACOTADA a los campos que esos esquemas declaran, sin las
 * //   validaciones más finas (enum de `permissionMode`, unicidad
 * //   profunda de ids de tarea vía zod `.refine`) que exigirían traer
 * //   esos chunks aparte.
 */

import { watch, type FSWatcher } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

// ── Tipos de worker (`L7`, `chunk-aywxqprf.js:14463-14602`) ────────────────

export type DaemonWorkerKind = 'heartbeat' | 'scheduled' | 'remoteControl'

/** Los tres tipos que `L7` declara, en su mismo orden. */
export const DAEMON_WORKER_KINDS: readonly DaemonWorkerKind[] = [
  'heartbeat',
  'scheduled',
  'remoteControl',
]

const WORKER_KIND_NEEDS_OAUTH: Record<DaemonWorkerKind, boolean> = {
  heartbeat: false,
  scheduled: true,
  remoteControl: true,
}

/** ¿Este tipo de worker necesita una sesión OAuth activa? Porte del campo `needsOAuth` de `L7`. */
export function workerKindNeedsOAuth(kind: DaemonWorkerKind): boolean {
  return WORKER_KIND_NEEDS_OAUTH[kind]
}

// ── Feature gate de `remoteControl` (`Ct`/`s7e`) ────────────────────────────

/** Gate de GrowthBook que habilita `remoteControl` (`ce`, `chunk-aywxqprf.js:1896-1945`). */
const REMOTE_CONTROL_GATE = 'tengu_radiant_heron'

/**
 * Puerta de despliegue interna, siempre desactivada en la referencia 2.1.283
 * (`pV`, `chunk-4x2jc802.js:1412-1435`: `function pV(){return!1}`). Cuando
 * está activa habilita CUALQUIER tipo de worker, no sólo `remoteControl` —
 * hoy, en la referencia, nunca lo está.
 */
function isDaemonWorkerRolloutOverrideEnabled(): boolean {
  return false
}

/**
 * ¿Está habilitado este tipo de worker para la cuenta/sesión actual? Porte
 * de `Ct`/`s7e`: `heartbeat` siempre; `remoteControl` sólo tras el gate
 * `tengu_radiant_heron`; cualquier otro tipo (`scheduled`) sólo bajo el
 * override de rollout — hoy inalcanzable.
 */
export function isWorkerKindEnabled(kind: DaemonWorkerKind): boolean {
  if (kind === 'heartbeat') return true
  if (isDaemonWorkerRolloutOverrideEnabled()) return true
  return (
    kind === 'remoteControl' &&
    getFeatureValue_CACHED_MAY_BE_STALE(REMOTE_CONTROL_GATE, false)
  )
}

// ── Forma de `daemon.json` (`p`, `chunk-6swydj68.js:1434-1516`) ────────────

export interface HeartbeatWorkerConfig {
  intervalSeconds: number
}

export interface ScheduledTaskConfig {
  id: string
  [key: string]: unknown
}

export interface ScheduledWorkerConfig {
  tasks: ScheduledTaskConfig[]
  maxConcurrent: number
}

export interface RemoteControlWorkerConfig {
  dir: string
  name?: string
  spawnMode: 'same-dir' | 'worktree'
  capacity: number
  permissionMode?: string
  sandbox: boolean
  /**
   * Divergencia declarada: `ae` (referencia) declara `sessionTimeoutSeconds`;
   * `workerRegistry.ts` ya establece `sessionTimeoutMs`
   * (`DAEMON_WORKER_TIMEOUT_MS`) como el nombre del lado thyrox — se sigue
   * esa convención ya asentada en vez de reintroducir la unidad de la
   * referencia.
   */
  sessionTimeoutMs?: number
  createSessionOnStart: boolean
}

export type DaemonWorkerEntryConfig =
  | HeartbeatWorkerConfig
  | ScheduledWorkerConfig
  | RemoteControlWorkerConfig

export interface DaemonJsonConfig {
  heartbeat: HeartbeatWorkerConfig[]
  scheduled: ScheduledWorkerConfig[]
  remoteControl: RemoteControlWorkerConfig[]
}

/** Config vacía — porte de `zbn` (`p().parse({})`). */
export function emptyDaemonConfig(): DaemonJsonConfig {
  return { heartbeat: [], scheduled: [], remoteControl: [] }
}

/** Suma de instancias configuradas por tipo — porte de `Mr`. */
export function countConfiguredWorkers(config: DaemonJsonConfig): number {
  let total = 0
  for (const kind of DAEMON_WORKER_KINDS) total += config[kind].length
  return total
}

// ── Validación (rama de sistema de archivos de `_Ie`) ───────────────────────

export type DaemonConfigParseResult =
  | { ok: true; config: DaemonJsonConfig; unknownKeys: string[] }
  | { ok: false; error: string }

/** `mPe` (`chunk-amh7298e.js:1489-1500`): tamaño máximo de `daemon.json`. */
export const DAEMON_CONFIG_MAX_BYTES = 1_048_576

const KNOWN_TOP_LEVEL_KEYS = new Set<string>(['$schema', ...DAEMON_WORKER_KINDS])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseHeartbeatEntry(raw: unknown, path: string): HeartbeatWorkerConfig {
  if (!isPlainObject(raw)) throw new Error(`${path} must be an object`)
  const intervalSeconds = raw.intervalSeconds ?? 30
  if (typeof intervalSeconds !== 'number' || !(intervalSeconds > 0)) {
    throw new Error(`${path}.intervalSeconds must be a positive number`)
  }
  return { intervalSeconds }
}

function parseScheduledEntry(raw: unknown, path: string): ScheduledWorkerConfig {
  if (!isPlainObject(raw)) throw new Error(`${path} must be an object`)
  const rawTasks = raw.tasks ?? []
  if (!Array.isArray(rawTasks)) throw new Error(`${path}.tasks must be an array`)
  const seenIds = new Set<string>()
  const tasks = rawTasks.map((task, index): ScheduledTaskConfig => {
    if (!isPlainObject(task) || typeof task.id !== 'string') {
      throw new Error(`${path}.tasks[${index}].id must be a string`)
    }
    if (seenIds.has(task.id)) {
      throw new Error(`${path}.tasks: task ids must be unique (duplicate '${task.id}')`)
    }
    seenIds.add(task.id)
    return task as ScheduledTaskConfig
  })
  const maxConcurrent = raw.maxConcurrent ?? 1
  if (typeof maxConcurrent !== 'number' || !Number.isInteger(maxConcurrent) || maxConcurrent <= 0) {
    throw new Error(`${path}.maxConcurrent must be a positive integer`)
  }
  return { tasks, maxConcurrent }
}

const SPAWN_MODES = new Set(['same-dir', 'worktree'])

function parseRemoteControlEntry(raw: unknown, path: string): RemoteControlWorkerConfig {
  if (!isPlainObject(raw)) throw new Error(`${path} must be an object`)
  if (typeof raw.dir !== 'string' || raw.dir.length === 0) {
    throw new Error(`${path}.dir must be a non-empty string`)
  }
  if (raw.name !== undefined && typeof raw.name !== 'string') {
    throw new Error(`${path}.name must be a string`)
  }
  const spawnMode = raw.spawnMode ?? 'same-dir'
  if (typeof spawnMode !== 'string' || !SPAWN_MODES.has(spawnMode)) {
    throw new Error(`${path}.spawnMode must be 'same-dir' or 'worktree'`)
  }
  const capacity = raw.capacity ?? 32
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity <= 0) {
    throw new Error(`${path}.capacity must be a positive integer`)
  }
  if (raw.permissionMode !== undefined && typeof raw.permissionMode !== 'string') {
    throw new Error(`${path}.permissionMode must be a string`)
  }
  const sandbox = raw.sandbox ?? false
  if (typeof sandbox !== 'boolean') throw new Error(`${path}.sandbox must be a boolean`)
  if (raw.sessionTimeoutMs !== undefined) {
    if (typeof raw.sessionTimeoutMs !== 'number' || !(raw.sessionTimeoutMs > 0)) {
      throw new Error(`${path}.sessionTimeoutMs must be a positive number`)
    }
  }
  const createSessionOnStart = raw.createSessionOnStart ?? false
  if (typeof createSessionOnStart !== 'boolean') {
    throw new Error(`${path}.createSessionOnStart must be a boolean`)
  }
  return {
    dir: raw.dir,
    name: raw.name as string | undefined,
    spawnMode: spawnMode as 'same-dir' | 'worktree',
    capacity,
    permissionMode: raw.permissionMode as string | undefined,
    sandbox,
    sessionTimeoutMs: raw.sessionTimeoutMs as number | undefined,
    createSessionOnStart,
  }
}

/**
 * Valida y normaliza un valor ya parseado como JSON contra la forma de
 * `daemon.json`. Porte de la validación de `_Ie` (el `p().safeParse` +
 * cómputo de `unknownKeys`), independiente de cómo se haya leído el texto.
 */
export function parseDaemonConfig(raw: unknown): DaemonConfigParseResult {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'config validation failed: root must be an object' }
  }
  try {
    const heartbeat = Array.isArray(raw.heartbeat ?? [])
      ? (raw.heartbeat as unknown[] ?? []).map((entry, index) =>
          parseHeartbeatEntry(entry, `heartbeat[${index}]`),
        )
      : (() => {
          throw new Error('heartbeat must be an array')
        })()
    const scheduled = Array.isArray(raw.scheduled ?? [])
      ? (raw.scheduled as unknown[] ?? []).map((entry, index) =>
          parseScheduledEntry(entry, `scheduled[${index}]`),
        )
      : (() => {
          throw new Error('scheduled must be an array')
        })()
    const remoteControl = Array.isArray(raw.remoteControl ?? [])
      ? (raw.remoteControl as unknown[] ?? []).map((entry, index) =>
          parseRemoteControlEntry(entry, `remoteControl[${index}]`),
        )
      : (() => {
          throw new Error('remoteControl must be an array')
        })()
    const unknownKeys = Object.keys(raw).filter(key => !KNOWN_TOP_LEVEL_KEYS.has(key))
    return { ok: true, config: { heartbeat, scheduled, remoteControl }, unknownKeys }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `config validation failed: ${message}` }
  }
}

/** Ruta de `daemon.json` — porte de `YA` (`chunk-fg57pf1w.js:690-733`). */
export function getDaemonConfigPath(): string {
  return join(getConfigHomeDir(), 'daemon.json')
}

/**
 * Carga y valida `daemon.json` desde disco. Porte de la rama de sistema de
 * archivos de `_Ie` — la rama `storageV5` (lectura desde el store
 * alternativo) no se porta, ver cabecera del archivo.
 *
 * Clasificación de fallos, fiel a la referencia: un archivo ausente
 * (`ENOENT`) es manejo ESPERADO — config vacía, sin log. Un archivo
 * demasiado grande, no-regular, ilegible o con JSON/esquema inválido
 * también es manejo esperado: se devuelve como `{ok:false, error}`, sin
 * `logError` — la referencia tampoco loguea ahí, sólo retorna el `Result`
 * al llamador (que en `Tt` lo escribe en su logger de supervisor, fuera
 * del alcance de este módulo).
 */
export async function loadDaemonConfig(path: string): Promise<DaemonConfigParseResult> {
  let text: string
  try {
    const info = await stat(path)
    if (!info.isFile() || info.size > DAEMON_CONFIG_MAX_BYTES) {
      return {
        ok: false,
        error: `${path} is not a regular file (or exceeds 1MiB)`,
      }
    }
    text = await readFile(path, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return { ok: true, config: emptyDaemonConfig(), unknownKeys: [] }
    }
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `failed to read ${path}: ${message}` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: `failed to parse ${path} as JSON` }
  }
  return parseDaemonConfig(parsed)
}

// ── Diff para recarga en caliente (`l6r`) ───────────────────────────────────

export interface DaemonConfigReloadPlan {
  stop: Array<{ id: string; kind: DaemonWorkerKind; previousConfig: DaemonWorkerEntryConfig }>
  start: Array<{ id: string; kind: DaemonWorkerKind; config: DaemonWorkerEntryConfig }>
  restart: Array<{
    id: string
    kind: DaemonWorkerKind
    config: DaemonWorkerEntryConfig
    previousConfig: DaemonWorkerEntryConfig
  }>
}

/**
 * Igualdad estructural para decidir si una entrada cambió. Porte
 * acotado de `So`/`_r` (`chunk-nvht7ckf.js:9861-9901`), que resuelve a un
 * deep-equal genérico (tipo lodash `isEqual`) — aquí, sobre valores JSON
 * planos (sin `Map`/`Set`/ciclos), la comparación estructural recursiva es
 * equivalente sin traer esa dependencia.
 */
function deepEqualJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((entry, index) => deepEqualJson(entry, b[index]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => Object.prototype.hasOwnProperty.call(b, key) && deepEqualJson(a[key], b[key]))
  }
  return false
}

/**
 * Calcula qué instancias parar, arrancar o reiniciar entre dos configs.
 * Porte de `l6r`: por cada tipo, alinea por índice (`${kind}:${index}`) —
 * una entrada que existía y ya no, se para; la que no existía y aparece,
 * arranca; la que existe en ambas pero cambió, reinicia.
 */
export function diffDaemonConfigForReload(
  previous: DaemonJsonConfig,
  next: DaemonJsonConfig,
): DaemonConfigReloadPlan {
  const plan: DaemonConfigReloadPlan = { stop: [], start: [], restart: [] }
  for (const kind of DAEMON_WORKER_KINDS) {
    const before: DaemonWorkerEntryConfig[] = previous[kind]
    const after: DaemonWorkerEntryConfig[] = next[kind]
    const length = Math.max(before.length, after.length)
    for (let index = 0; index < length; index++) {
      const id = `${kind}:${index}`
      const previousEntry = before[index]
      const nextEntry = after[index]
      if (previousEntry !== undefined && nextEntry === undefined) {
        plan.stop.push({ id, kind, previousConfig: previousEntry })
      } else if (previousEntry === undefined && nextEntry !== undefined) {
        plan.start.push({ id, kind, config: nextEntry })
      } else if (
        previousEntry !== undefined &&
        nextEntry !== undefined &&
        !deepEqualJson(previousEntry, nextEntry)
      ) {
        plan.restart.push({ id, kind, config: nextEntry, previousConfig: previousEntry })
      }
    }
  }
  return plan
}

/** ¿El plan no cambia nada? Porte de la guarda `H.stop.length+H.start.length+H.restart.length>0` de `Tt`. */
export function daemonConfigReloadPlanIsEmpty(plan: DaemonConfigReloadPlan): boolean {
  return plan.stop.length === 0 && plan.start.length === 0 && plan.restart.length === 0
}

/**
 * Emite `tengu_daemon_config_reload` cuando el plan cambia algo — porte del
 * bloque final de `Tt`: `i("tengu_daemon_config_reload",{stopped,started,
 * restarted})`, sólo si `stop.length+start.length+restart.length>0`.
 */
export function emitDaemonConfigReloadEvent(
  plan: DaemonConfigReloadPlan,
  deps: { logEventFn?: (name: string, metadata?: Record<string, unknown>) => void } = {},
): void {
  if (daemonConfigReloadPlanIsEmpty(plan)) return
  const { logEventFn = logEvent } = deps
  logEventFn('tengu_daemon_config_reload', {
    stopped: plan.stop.length,
    started: plan.start.length,
    restarted: plan.restart.length,
  })
}

// ── Vigilancia de `daemon.json` (`Vbn`) ─────────────────────────────────────

/** Divergencia declarada del `awaitWriteFinish.stabilityThreshold` de chokidar (300ms) que `Vbn` usa. */
export const DAEMON_CONFIG_WATCH_DEBOUNCE_MS = 300

export interface DaemonConfigWatcher {
  close(): void
}

/**
 * Vigila `daemon.json` y llama `onChange` (debounced) cuando cambia.
 * Porte de `Vbn`: la referencia usa chokidar (`depth:0`, `ignored` filtra
 * por directorio+nombre exactos, `awaitWriteFinish`, `atomic:true`,
 * polling en macOS). chokidar no es dependencia de este paquete —mismo
 * precedente ya declarado en `dispatchSpool.ts` (`startSpoolWatcher`) para
 * el mismo reemplazo—, así que aquí se usa `node:fs`'s `watch` sobre el
 * directorio contenedor, filtrado por nombre de archivo exacto (equivalente
 * a `depth:0`+`ignored` de la referencia), con un debounce manual en vez de
 * `awaitWriteFinish`.
 *
 * Clasificación de fallos: si el `watch()` síncrono lanza (p. ej. el
 * directorio no existe todavía), o si el watcher emite `'error'` en
 * caliente, es `logForDebugging(…, {level:'warn'})` — mismo nivel que la
 * referencia usa en el `on('error', …)` de `Vbn`
 * (`chunk-6swydj68.js:2748-3194`: `t(…,{level:"warn"})`) — nunca
 * `logError`: perder la vigilancia no es un fallo del daemon, es perder la
 * recarga en caliente. El cierre (`close`) es silencio intencional, como
 * en la referencia (`()=>void a.close().catch(()=>{})`).
 */
export function watchDaemonConfigFile(
  path: string,
  onChange: () => void,
  options: { debounceMs?: number } = {},
): DaemonConfigWatcher {
  const debounceMs = options.debounceMs ?? DAEMON_CONFIG_WATCH_DEBOUNCE_MS
  const dir = dirname(path)
  const target = basename(path)
  let timer: ReturnType<typeof setTimeout> | undefined

  const trigger = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onChange, debounceMs)
    timer.unref?.()
  }

  let watcher: FSWatcher | undefined
  try {
    watcher = watch(dir, { persistent: false }, (_event, filename) => {
      if (filename !== null && String(filename) !== target) return
      trigger()
    })
    watcher.on('error', e => {
      logForDebugging(`[daemon-config] watcher error: ${e instanceof Error ? e.message : String(e)}`, {
        level: 'warn',
      })
    })
  } catch (e) {
    logForDebugging(
      `[daemon-config] watcher setup failed: ${e instanceof Error ? e.message : String(e)}`,
      { level: 'warn' },
    )
  }

  return {
    close(): void {
      if (timer) clearTimeout(timer)
      if (watcher) {
        try {
          watcher.close()
        } catch {
          // silencio intencional — porte de `()=>void a.close().catch(()=>{})`
        }
      }
    },
  }
}

// ── Umbrales de recarga de configuración (Cr/Tr) ────────────────────────────

/**
 * `Cr`=1000 (`chunk-92tvramn.js:47227-47234`): espera máxima, al parar, a
 * que termine el escritor de estado pendiente antes de forzar el cierre
 * (`await nt(S,Cr)` en `Tt.stop`, donde `nt` es una carrera contra un
 * timeout — `chunk-jxwbd5gq.js:1420-1535`).
 */
export const DAEMON_CONFIG_STOP_DRAIN_MS = 1000

/**
 * `Tr`=5000 (`chunk-92tvramn.js:47235-47242`): intervalo de reintento del
 * escritor de estado de workers cuando la escritura previa está ocupada
 * (`E=setTimeout(C,Tr)` dentro del reactor de `Tt`).
 */
export const DAEMON_STATUS_WRITE_RETRY_MS = 5000
