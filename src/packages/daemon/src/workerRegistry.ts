/**
 * Punto de entrada del daemon worker. Se llama vía:
 *   `claude --daemon-worker=<kind>`
 *
 * El supervisor genera esto como un proceso hijo. Cada `kind` mapea a
 * una tarea distinta de larga vida. Hoy sólo `remoteControl` está
 * implementado — corre el loop headless del bridge que acepta sesiones
 * remotas.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/workerRegistry.ts`. La fuente
 * importa `runBridgeHeadless`/`BridgeHeadlessPermanentError`/
 * `HeadlessBridgeOpts` de `@claude-code-how-works/bridge/bridgeMain.js` —
 * `@thyrox/bridge` es MI OTRO paquete en este mismo porte (ambos nacen en
 * el mismo commit), así que se importa por RUTA RELATIVA en vez de por
 * nombre de paquete: ninguno de los dos es miembro del bun workspace
 * todavía, y una importación por nombre de paquete no resolvería aunque
 * el paquete exista en el árbol (mismo defecto que documenta
 * `internal/pendingCrossPackageDeps.ts` para paquetes de terceros). La
 * ruta relativa se retira por una importación de paquete cuando ambos
 * sean miembros del workspace.
 *
 * `getClaudeAIOAuthTokens` (de
 * `@claude-code-how-works/provider/authAlias.js`) y `errorMessage` (de
 * `@claude-code-how-works/local-observability/errorHelpers.js`) sí son de
 * paquetes AJENOS ya portados (`@thyrox/provider`, `@thyrox/local-observability`)
 * — para ésos aplica el punto de inyección / reimplementación fiel de
 * `internal/pendingCrossPackageDeps.js`, no la ruta relativa.
 */

import { resolve } from 'node:path'
import {
  type HeadlessBridgeOpts,
  BridgeHeadlessPermanentError,
  runBridgeHeadless,
} from '@thyrox/bridge/bridgeMain.js'
import { logError } from '@thyrox/local-observability/logging'
import { errorMessage, getClaudeAIOAuthTokens } from './internal/pendingCrossPackageDeps.js'

/**
 * Códigos de salida que usa el supervisor para decidir retry vs aparcar.
 * Los errores permanentes (trust no aceptado, sin repo git para
 * worktree) usan EXIT_CODE_PERMANENT para que el supervisor no gaste
 * ciclos reintentando.
 */
const EXIT_CODE_PERMANENT = 78 // EX_CONFIG de sysexits.h
const EXIT_CODE_TRANSIENT = 1

/**
 * Punto de entrada del daemon worker. Se llama vía:
 *   `claude --daemon-worker=<kind>`
 *
 * El supervisor genera esto como un proceso hijo. Cada `kind` mapea a
 * una tarea distinta de larga vida. Hoy sólo `remoteControl` está
 * implementado — corre el loop headless del bridge que acepta sesiones
 * remotas.
 */
export async function runDaemonWorker(kind?: string): Promise<void> {
  if (!kind) {
    console.error('Error: --daemon-worker requires a worker kind')
    process.exitCode = EXIT_CODE_PERMANENT
    return
  }

  switch (kind) {
    case 'remoteControl':
      await runRemoteControlWorker()
      break
    default:
      console.error(`Error: unknown daemon worker kind '${kind}'`)
      process.exitCode = EXIT_CODE_PERMANENT
  }
}

/**
 * Worker de Remote Control — corre `runBridgeHeadless()` con config desde
 * variables de entorno fijadas por el supervisor del daemon.
 *
 * Variables de entorno (fijadas por daemonMain):
 *   DAEMON_WORKER_DIR          — directorio de trabajo
 *   DAEMON_WORKER_NAME         — nombre de sesión opcional
 *   DAEMON_WORKER_SPAWN_MODE   — 'same-dir' | 'worktree'
 *   DAEMON_WORKER_CAPACITY     — sesiones concurrentes máximas por worker
 *   DAEMON_WORKER_PERMISSION   — modo de permiso
 *   DAEMON_WORKER_SANDBOX      — '1' para modo sandbox
 *   DAEMON_WORKER_TIMEOUT_MS   — timeout de sesión en ms
 *   DAEMON_WORKER_CREATE_SESSION — '1' para pre-crear la sesión al arrancar
 */
async function runRemoteControlWorker(): Promise<void> {
  const dir = process.env.DAEMON_WORKER_DIR || resolve('.')
  const name = process.env.DAEMON_WORKER_NAME || undefined
  const spawnMode =
    (process.env.DAEMON_WORKER_SPAWN_MODE as 'same-dir' | 'worktree') ||
    'same-dir'
  const capacity = parseInt(process.env.DAEMON_WORKER_CAPACITY || '4', 10)
  const permissionMode = process.env.DAEMON_WORKER_PERMISSION || undefined
  const sandbox = process.env.DAEMON_WORKER_SANDBOX === '1'
  const sessionTimeoutMs = process.env.DAEMON_WORKER_TIMEOUT_MS
    ? parseInt(process.env.DAEMON_WORKER_TIMEOUT_MS, 10)
    : undefined
  const createSessionOnStart = process.env.DAEMON_WORKER_CREATE_SESSION !== '0'

  const controller = new AbortController()

  // Apagado ordenado ante SIGTERM/SIGINT del supervisor
  const onSignal = () => controller.abort()
  process.on('SIGTERM', onSignal)
  process.on('SIGINT', onSignal)

  const opts: HeadlessBridgeOpts = {
    dir,
    name,
    spawnMode,
    capacity,
    permissionMode,
    sandbox,
    sessionTimeoutMs,
    createSessionOnStart,
    getAccessToken: () => getClaudeAIOAuthTokens()?.accessToken,
    onAuth401: async (_failedToken: string) => {
      // En contexto de daemon, re-chequea auth — el supervisor pudo haber refrescado el token.
      const tokens = getClaudeAIOAuthTokens()
      return !!tokens?.accessToken
    },
    log: (s: string) => {
      console.log(`[remoteControl] ${s}`)
    },
  }

  try {
    await runBridgeHeadless(opts, controller.signal)
  } catch (err) {
    if (err instanceof BridgeHeadlessPermanentError) {
      console.error(`[remoteControl] permanent error: ${err.message}`)
      process.exitCode = EXIT_CODE_PERMANENT
    } else {
      console.error(`[remoteControl] transient error: ${errorMessage(err)}`)
      process.exitCode = EXIT_CODE_TRANSIENT
    }
  } finally {
    process.off('SIGTERM', onSignal)
    process.off('SIGINT', onSignal)
  }
}

/**
 * Extrae con seguridad el campo `dir` de una config de worker arbitraria
 * — arma `servedFolder` en `Ue.status`. Porte exacto de `Oe`
 * (`chunk-92tvramn.js`, referencia 2.1.283, resuelto con
 * `bin/binary symbol`): `` function Oe(r){if(typeof r!=="object"||
 * r===null||!("dir"in r))return;let{dir:e}=r;return typeof e==="string"?
 * e:void 0} ``.
 */
export function safeExtractServedFolderDir(config: unknown): string | undefined {
  if (typeof config !== 'object' || config === null || !('dir' in config)) return undefined
  const { dir } = config as { dir: unknown }
  return typeof dir === 'string' ? dir : undefined
}

/**
 * Fuente inyectable para el set de shorts (identificadores de sesión bg)
 * marcados como "pinned" — exentos de retiro por baja memoria.
 */
export type PinnedWorkerShortsLoader = () => Promise<Set<string>>

/**
 * Sin almacén de shorts pinned portado todavía: `N0e`
 * (`chunk-mxz6ht5b.js`) lee/escribe un archivo propio del dominio de
 * sesiones/shorts (fuera de `@thyrox/daemon` — el daemon ejecuta, los
 * dominios son dueños de sus datos). El default no toca disco y
 * devuelve un set vacío, así que ningún worker queda exento hasta que
 * ese dominio exponga el loader real.
 *
 * // pendiente: portar `N0e` cuando el dominio de sesiones/shorts
 * // exponga su almacén de shorts pinned; hoy `getPinnedWorkerShorts`
 * // sólo reproduce la degradación segura de `Qe`, no la lectura real.
 */
const loadPinnedWorkerShortsDefault: PinnedWorkerShortsLoader = async () => new Set()

/**
 * Set de shorts pinned, con degradación segura ante fallo. Porte exacto
 * de `Qe` (`chunk-92tvramn.js`): `` function Qe(r){return N0e(r).
 * catch((e)=>(d(e),new Set))} ``. `d` es `logError`.
 */
export async function getPinnedWorkerShorts(
  loader: PinnedWorkerShortsLoader = loadPinnedWorkerShortsDefault,
  deps: { logErrorFn?: (error: unknown) => void } = {},
): Promise<Set<string>> {
  const { logErrorFn = logError } = deps
  try {
    return await loader()
  } catch (e) {
    logErrorFn(e)
    return new Set()
  }
}

/**
 * Umbrales de sintonía de la clase supervisora del worker (`Ue`),
 * `chunk-92tvramn.js`, referencia 2.1.283 (resueltos con
 * `bin/binary symbol`) — `WORKER_BACKOFF_BASE_MS`/`WORKER_BACKOFF_CAP_MS`/
 * `WORKER_HEALTHY_UPTIME_MS` ya viven en `main.ts` (`Ar`/`At`/`Er`/`br`).
 */

/** `$r`: base del backoff de reintento tras una salida tempfail (`Tpt`=75). */
export const WORKER_TEMPFAIL_RETRY_BASE_MS = 30_000

/** `Dr`: espera antes de reintentar cuando el wrapper/launcher no está listo. */
export const WORKER_WRAPPER_RETRY_MS = 60_000

/**
 * `He`: escalón entre arranques sucesivos de workers del mismo kind
 * (`start(W++*He)` en `Tt`, `chunk-92tvramn.js` — la función que
 * construye instancias de `Ue` desde config; no está en la lista de
 * símbolos de esta tarea, pero la constante vive en el mismo bloque que
 * `Qe`/`Ue`/`Oe` y sin ella el resto de umbrales quedaría incompleto).
 *
 * // pendiente: `main.ts` arranca un único worker fijo (`remoteControl`)
 * // sin lista config-driven de instancias por kind — no hay "sucesivos
 * // arranques del mismo kind" que escalonar todavía.
 */
export const WORKER_START_STAGGER_MS = 2_000

/** `Rr`: ventana de frescura de `lastBusyAt` para considerar un worker ocupado. */
export const WORKER_BUSY_STALE_MS = 300_000

/**
 * Estado de ocupación reportado vía IPC por el worker. Porte de
 * `isBusy()`: `` return this.lastBusy&&this.child!==null&&Date.now()-
 * this.lastBusyAt<Rr ``. `hasChild` sustituye `this.child!==null` — el
 * llamador decide con qué valor lo satisface (el `ChildProcess` vivo).
 */
export function isWorkerBusy(
  state: { lastBusy: boolean; lastBusyAt: number; hasChild: boolean },
  now: number = Date.now(),
  staleMs: number = WORKER_BUSY_STALE_MS,
): boolean {
  return state.lastBusy && state.hasChild && now - state.lastBusyAt < staleMs
}

/** Snapshot de estado que expone un worker vivo — porte de `get status()`. */
export interface WorkerStatusSnapshot {
  pid: number
  startedAt: number
  servedFolder?: { dir: string; sessions: number }
}

/**
 * Arma el snapshot de estado de un worker vivo. Porte exacto de
 * `Ue.get status()`: `` let e={pid:r,startedAt:this.spawnedAt},o=Oe(this
 * .config),n=Ge.get(this)??0;if(n>0&&o!==void 0)e.servedFolder=
 * {dir:o,sessions:n};return e ``. Devuelve `null` cuando no hay pid (el
 * worker no está corriendo), igual que la referencia devuelve `null`
 * cuando `this.child?.pid===void 0`.
 */
export function computeWorkerStatus(params: {
  pid: number | undefined
  startedAt: number
  config: unknown
  servedSessionsCount: number
}): WorkerStatusSnapshot | null {
  const { pid, startedAt, config, servedSessionsCount } = params
  if (pid === undefined) return null
  const snapshot: WorkerStatusSnapshot = { pid, startedAt }
  const dir = safeExtractServedFolderDir(config)
  if (servedSessionsCount > 0 && dir !== undefined) {
    snapshot.servedFolder = { dir, sessions: servedSessionsCount }
  }
  return snapshot
}
