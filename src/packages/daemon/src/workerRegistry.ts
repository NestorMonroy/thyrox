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
} from '../../bridge/src/bridgeMain.js'
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
