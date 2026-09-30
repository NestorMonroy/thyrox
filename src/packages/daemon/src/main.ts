import { spawn, type ChildProcess } from 'child_process'
import { resolve } from 'path'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { logError } from '@thyrox/local-observability/logging'
import { logEvent } from '@thyrox/local-observability'
import { PRODUCT_NAME } from '@thyrox/config/product'
import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import {
  WORKER_SHUTDOWN_SIGKILL_GRACE_MS,
  parseWorkerToSupervisorMessage,
  scheduleForceKill,
  sendWorkerShutdownMessage,
  writeWorkerBootstrap,
} from './workerIpc.js'
import { computeWorkerStatus, isWorkerBusy, type WorkerStatusSnapshot } from './workerRegistry.js'

/**
 * Código de salida de un worker con fallo permanente (no reintentable).
 * `jq` en `chunk-92tvramn.js` (`class Ue`, referencia 2.1.283): mismo valor.
 * @see workerRegistry.ts EXIT_CODE_PERMANENT
 */
const EXIT_CODE_PERMANENT = 78

/**
 * Backoff exponencial con jitter para reintentar un worker caído. Porte de
 * `Ar`/`At` (`chunk-92tvramn.js`, `class Ue`, referencia 2.1.283):
 * `Ar(r) = At(min(1000*2**r, Er))`, `At(r) = round(r*(0.5+random()))`.
 *
 * Divergencia declarada: lo que antes existía aquí —parking permanente tras
 * `MAX_RAPID_FAILURES` fallos rápidos— no tiene equivalente en `Ue.onExit`:
 * la referencia reintenta indefinidamente con este backoff (topado en
 * `Er`=300000ms) y sólo aparca de forma permanente por `EXIT_CODE_PERMANENT`
 * (`jq`). Se retira esa lógica para igualar la referencia.
 */
const WORKER_BACKOFF_BASE_MS = 1_000 // el `1000` de `Ar`
const WORKER_BACKOFF_CAP_MS = 300_000 // `Er`

/**
 * Uptime mínimo para tratar una salida con código 0 como sana y resetear la
 * racha de fallos. `br` (60000) en `Ue.onExit`, misma referencia.
 *
 * // pendiente: `Ue.onExit` también trata como fallo permanente (sin
 * // reintentar) una salida limpia y rápida cuando el worker corre a través
 * // de un "launcher" (`r===0 && n<zNe && lu().length>0`, `zNe`=12000ms) y
 * // el reintento de spawn por error `ENOENT`/`EACCES` con código `Tpt`=75.
 * // Ninguna de las dos aplica aquí: este supervisor lanza el worker
 * // directamente con `spawn(process.execPath, …)`, sin el concepto de
 * // "process wrapper"/launcher que esas dos ramas asumen.
 */
const WORKER_HEALTHY_UPTIME_MS = 60_000

interface WorkerState {
  kind: string
  process: ChildProcess | null
  consecutiveCrashes: number
  parked: boolean
  lastStartTime: number
  /** Directorio servido por este worker — insumo de `Oe`/`computeWorkerStatus`. */
  servedFolderDir?: string
  /** Porte de `this.lastBusy`/`this.lastBusyAt` (`Ue`), fijados por el mensaje IPC `rc_busy`. */
  lastBusy: boolean
  lastBusyAt: number
  /** Porte de `Ge.get(this)` (`Ue`), fijado por el mensaje IPC `rc_serving_tools`. */
  servedToolsCount: number
  /** Timer de SIGKILL de gracia armado por `stopWorkerProcess` — porte del `a` de `Ue.stop`. */
  forceKillTimer: NodeJS.Timeout | null
}

/**
 * Daemon supervisor entry point. Called from `cli.tsx` via:
 *   `claude daemon [subcommand]`
 *
 * Starts and supervises long-running workers. Currently spawns one
 * `remoteControl` worker that runs the headless bridge server.
 *
 * Subcommands:
 *   (none)  — start the supervisor with default workers
 *   start   — same as no subcommand
 *   status  — print worker status (TODO: IPC)
 *   stop    — send SIGTERM to supervisor (TODO: PID file)
 */
export async function daemonMain(args: string[]): Promise<void> {
  const subcommand = args[0] || 'start'

  switch (subcommand) {
    case 'start':
      try {
        await runSupervisor(args.slice(1))
      } catch (e) {
        // ant 5170 — startup_crash: supervisor failed to bring itself
        // online. Report so admins notice; rethrow to preserve exit
        // code semantics.
        reportDaemonStartupCrash(e)
        throw e
      }
      break
    case 'bg': {
      // ccb daemon bg [run|status|stop|install|uninstall|start|restart] — bg supervisor.
      const sub = args[1] || 'run'
      if (sub === 'run') {
        const { bgDaemonMain } = await import('./bgDaemon.js')
        let code = 1
        try {
          code = await bgDaemonMain(args.slice(2))
        } catch (e) {
          reportDaemonStartupCrash(e, { sub: 'bg' })
          throw e
        }
        process.exitCode = code
      } else if (sub === 'status' || sub === 'list') {
        await bgDaemonStatus(args.includes('--json'))
      } else if (sub === 'log') {
        await bgDaemonTailLog()
      } else if (sub === 'stop') {
        await bgDaemonStop()
      } else if (
        sub === 'install' ||
        sub === 'uninstall' ||
        sub === 'enable' ||
        sub === 'disable' ||
        sub === 'restart' ||
        sub === 'is-stale' ||
        sub === 'is-active'
      ) {
        await daemonLaunchAgentVerb(sub)
      } else {
        console.error(`Unknown daemon bg subcommand: ${sub}`)
        process.exitCode = 1
      }
      break
    }
    case 'status':
      // Delegate to the bg-daemon RPC ping. Top-level `status` is a
      // shorthand for `daemon bg status`; the supervisor in this file
      // (runSupervisor) is a separate process model with no RPC of its
      // own, so showing the bg daemon's status is the most useful
      // signal here. Pass --json through.
      await bgDaemonStatus(args.includes('--json'))
      break
    case 'stop':
      // Same delegation rationale as `status`. The bg daemon owns the
      // shutdown op; the legacy supervisor in this file responds to
      // SIGTERM directly and is not addressable via shutdown RPC.
      await bgDaemonStop()
      break
    case '--help':
    case '-h':
      printHelp()
      break
    default:
      console.error(`Unknown daemon subcommand: ${subcommand}`)
      printHelp()
      process.exitCode = 1
  }
}

async function bgDaemonTailLog(): Promise<void> {
  const { join } = await import('node:path')
  const { existsSync } = await import('node:fs')
  const today = new Date().toISOString().slice(0, 10)
  const logPath = join(getConfigHomeDir(), 'telemetry', `events-${today}.jsonl`)
  if (!existsSync(logPath)) {
    console.error(`bg daemon log: no events file at ${logPath}`)
    console.error(`(set THYROX_CODE_LOCAL_TELEMETRY=1 + restart daemon to populate)`)
    process.exitCode = 1
    return
  }
  const { spawn } = await import('node:child_process')
  const tail = spawn('tail', ['-f', logPath], { stdio: 'inherit' })
  await new Promise<void>(resolve => {
    tail.on('exit', code => {
      if (code !== null && code !== 0) process.exitCode = code
      resolve()
    })
    tail.on('error', e => {
      console.error(`tail failed: ${(e as Error).message}`)
      process.exit(1)
    })
  })
}

async function bgDaemonStatus(asJson = false): Promise<void> {
  const { daemonRequest } = await import('./daemonClient.js')
  const r = await daemonRequest('ping', {}, { timeoutMs: 1000 })
  if (!r.ok) {
    if (asJson) {
      console.log(JSON.stringify({ ok: false, running: false, code: r.code }))
    } else {
      console.log(`bg daemon: not running (${r.code})`)
    }
    process.exitCode = 1
    return
  }
  const uptime = (r as Record<string, unknown>).uptime
  const list = await daemonRequest('list', {}, { timeoutMs: 2000 })
  const jobs = list.ok
    ? ((list as Record<string, unknown>).jobs as Array<Record<string, unknown>> | undefined) ?? []
    : []
  if (asJson) {
    console.log(JSON.stringify({ ok: true, running: true, uptime, jobs }, null, 2))
    return
  }
  console.log(`bg daemon: running (uptime ${uptime ?? 'unknown'}ms)`)
  if (jobs.length === 0) {
    console.log('  (no workers)')
    return
  }
  for (const j of jobs) {
    const cls = j.classifierState ? ` [${j.classifierState}/${j.classifierTempo}]` : ''
    const needs = j.classifierNeeds ? ` needs="${String(j.classifierNeeds).slice(0, 60)}"` : ''
    console.log(`  ${j.short}  ${j.status}${cls}  pid=${j.pid}  attachers=${j.attachers}${needs}`)
  }
}

async function daemonLaunchAgentVerb(
  verb: 'install' | 'uninstall' | 'enable' | 'disable' | 'restart' | 'is-stale' | 'is-active',
): Promise<void> {
  const { join } = await import('node:path')
  const la = await import('./launchAgent.js')
  const ccbDir = join(getConfigHomeDir(), 'daemon')
  const opts = {
    jsonPath: join(ccbDir, 'state.json'),
    logPath: join(ccbDir, 'daemon.log'),
  }
  if (verb === 'is-stale') {
    const stale = await la.isLaunchAgentStale()
    console.log(stale ? 'stale' : 'fresh')
    process.exitCode = stale ? 1 : 0
    return
  }
  if (verb === 'is-active') {
    const active = await la.isLaunchAgentRunning()
    console.log(active ? 'active' : 'inactive')
    process.exitCode = active ? 0 : 1
    return
  }
  let r: { ok: boolean; error?: string; servicePath?: string }
  if (verb === 'install') r = await la.installLaunchAgent(opts)
  else if (verb === 'uninstall') r = await la.uninstallLaunchAgent()
  else if (verb === 'enable') r = await la.startLaunchAgent()
  else if (verb === 'disable') r = await la.stopLaunchAgent()
  else r = await la.restartLaunchAgent()
  if (!r.ok) {
    console.error(`bg daemon ${verb}: ${r.error}`)
    process.exitCode = 1
    return
  }
  console.log(`bg daemon ${verb}: ok${r.servicePath ? ` (${r.servicePath})` : ''}`)
}

async function bgDaemonStop(): Promise<void> {
  const { daemonRequest } = await import('./daemonClient.js')
  const r = await daemonRequest('shutdown', {}, { timeoutMs: 2000 })
  if (!r.ok) {
    console.log(`bg daemon: not running (${r.code})`)
    process.exitCode = 1
    return
  }
  console.log('bg daemon: shutdown signal accepted')
}

function printHelp(): void {
  console.log(`
${PRODUCT_NAME} Daemon — persistent background supervisor

USAGE
  claude daemon [subcommand] [options]

SUBCOMMANDS
  start       Start the daemon supervisor (default)
  status      Show worker status
  stop        Stop the daemon

OPTIONS
  --dir <path>              Working directory (default: current)
  --spawn-mode <mode>       Worker spawn mode: same-dir | worktree (default: same-dir)
  --capacity <N>            Max concurrent sessions per worker (default: 4)
  --permission-mode <mode>  Permission mode for spawned sessions
  --sandbox                 Enable sandbox mode
  --name <name>             Session name
  -h, --help                Show this help
`)
}

/**
 * Parse supervisor arguments from CLI.
 */
function parseSupervisorArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--dir' && i + 1 < args.length) {
      result.dir = resolve(args[++i]!)
    } else if (arg.startsWith('--dir=')) {
      result.dir = resolve(arg.slice('--dir='.length))
    } else if (arg === '--spawn-mode' && i + 1 < args.length) {
      result.spawnMode = args[++i]!
    } else if (arg.startsWith('--spawn-mode=')) {
      result.spawnMode = arg.slice('--spawn-mode='.length)
    } else if (arg === '--capacity' && i + 1 < args.length) {
      result.capacity = args[++i]!
    } else if (arg.startsWith('--capacity=')) {
      result.capacity = arg.slice('--capacity='.length)
    } else if (arg === '--permission-mode' && i + 1 < args.length) {
      result.permissionMode = args[++i]!
    } else if (arg.startsWith('--permission-mode=')) {
      result.permissionMode = arg.slice('--permission-mode='.length)
    } else if (arg === '--sandbox') {
      result.sandbox = '1'
    } else if (arg === '--name' && i + 1 < args.length) {
      result.name = args[++i]!
    } else if (arg.startsWith('--name=')) {
      result.name = arg.slice('--name='.length)
    }
  }
  return result
}

/**
 * Run the daemon supervisor loop. Spawns workers and restarts them
 * on crash with exponential backoff.
 */
async function runSupervisor(args: string[]): Promise<void> {
  const config = parseSupervisorArgs(args)
  const dir = config.dir || resolve('.')

  console.log(`[daemon] supervisor starting in ${dir}`)

  const workers: WorkerState[] = [
    {
      kind: 'remoteControl',
      process: null,
      consecutiveCrashes: 0,
      parked: false,
      lastStartTime: 0,
      lastBusy: false,
      lastBusyAt: 0,
      servedToolsCount: 0,
      forceKillTimer: null,
    },
  ]

  const controller = new AbortController()

  // Graceful shutdown
  const shutdown = () => {
    console.log('[daemon] supervisor shutting down...')
    controller.abort()
    for (const w of workers) {
      if (w.process && !w.process.killed) {
        stopWorkerProcess(w)
      }
    }
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  // Spawn and supervise workers
  for (const worker of workers) {
    if (!controller.signal.aborted) {
      spawnWorker(worker, dir, config, controller.signal)
    }
  }

  // Wait for abort signal
  await new Promise<void>(resolve => {
    if (controller.signal.aborted) {
      resolve()
      return
    }
    controller.signal.addEventListener('abort', () => resolve(), { once: true })
  })

  // Wait for all workers to exit. `stopWorkerProcess` (invocado por
  // `shutdown`) ya programó su propio SIGKILL de gracia
  // (`WORKER_SHUTDOWN_SIGKILL_GRACE_MS`) — porte de `if(o) await o` en
  // `Ue.stop`, sin un segundo kill independiente.
  await Promise.all(
    workers
      .filter(w => w.process && !w.process.killed)
      .map(
        w =>
          new Promise<void>(resolve => {
            if (!w.process) {
              resolve()
              return
            }
            w.process.on('exit', () => resolve())
          }),
      ),
  )

  console.log('[daemon] supervisor stopped')
}

const DAEMON_START_FEATURE = 'daemon_start'
const DAEMON_START_CRASH_CODE = 'daemon_start_crash'

/**
 * Reporta un fallo de arranque del supervisor. Porte de la rama `catch` de
 * `wa` para `run`/`start` (`chunk-92tvramn.js`, referencia 2.1.283):
 * `catch(ce){d(ce); m("daemon_start","daemon_start_crash");
 * await Promise.all([Tv("tengu_daemon_startup_crash",{}),
 * $ct("tengu_daemon_startup_crash",{})]); le(1)}`.
 *
 * `d` es `logError` (`chunk-fmsbxtrp.js`): se conserva tal cual. `m` es
 * `reportFeatureBad` (`@thyrox/local-observability/src/uds/featureTelemetry.ts`,
 * porte propio de `chunk-d09a8ccq.js`), pero ese módulo no está en el
 * `exports` público del paquete —no hay entrada `./uds/featureTelemetry.js`
 * en su `package.json`—, así que aquí se emite a mano el evento
 * `tengu_feature_bad` con la misma forma (`{feature_name, error_code}`) en
 * vez de importarlo. `Tv` es `logEvent` local: se conserva. `$ct` reenvía el
 * mismo evento al sumidero first-party de Datadog de la cuenta de Anthropic
 * — no existe un sumidero remoto equivalente en thyrox.
 *
 * // pendiente: el reenvío a `$ct` (Datadog first-party) no se porta —
 * // thyrox no tiene ese sumidero remoto.
 *
 * `le(1)` es `process.exit(1)`; ese control de salida lo sigue haciendo el
 * llamador (`daemonMain`), no esta función.
 */
export function reportDaemonStartupCrash(
  error: unknown,
  context: Record<string, string> = {},
  deps: {
    logErrorFn?: (error: unknown) => void
    logEventFn?: (name: string, metadata?: Record<string, unknown>) => void
  } = {},
): void {
  const { logErrorFn = logError, logEventFn = logEvent } = deps
  logErrorFn(error)
  logEventFn('tengu_feature_bad', {
    feature_name: DAEMON_START_FEATURE,
    error_code: DAEMON_START_CRASH_CODE,
  })
  logEventFn('tengu_daemon_startup_crash', {
    error: errorMessage(error).slice(0, 200),
    ...context,
  })
}

/**
 * Backoff exponencial con jitter para reintentar un worker caído. Porte de
 * `Ar`/`At` (`chunk-92tvramn.js`, `class Ue`, referencia 2.1.283).
 */
export function computeWorkerBackoffMs(
  consecutiveCrashes: number,
  random: () => number = Math.random,
): number {
  const base = Math.min(
    WORKER_BACKOFF_BASE_MS * 2 ** consecutiveCrashes,
    WORKER_BACKOFF_CAP_MS,
  )
  return Math.round(base * (0.5 + random()))
}

/**
 * Una salida es sana cuando el worker terminó con código 0 y corrió al
 * menos `WORKER_HEALTHY_UPTIME_MS`. Porte de la condición `r===0 && n>=br`
 * en `Ue.onExit`.
 */
export function isHealthyWorkerExit(
  code: number | null,
  uptimeMs: number,
): boolean {
  return code === 0 && uptimeMs >= WORKER_HEALTHY_UPTIME_MS
}

/**
 * Línea de log de una salida no sana, formato exacto de `Ue.onExit`:
 * `` `exited code=${r} sig=${e} uptime=${n}ms consecutive=${this.consecutiveCrashes} backoff=${h}ms` ``.
 */
export function formatWorkerExitLogLine(params: {
  code: number | null
  signal: NodeJS.Signals | null
  uptimeMs: number
  consecutive: number
  backoffMs: number
}): string {
  const { code, signal, uptimeMs, consecutive, backoffMs } = params
  return `exited code=${code} sig=${signal} uptime=${uptimeMs}ms consecutive=${consecutive} backoff=${backoffMs}ms`
}

/**
 * Metadata de `tengu_daemon_worker_crash`, porte exacto de los cuatro
 * campos que `Ue.onExit` pasa a `i(...)` (`chunk-ab7mw5d9.js`): `exit_code`
 * queda `undefined` cuando el worker murió por señal (`r??void 0`).
 */
export function buildWorkerCrashEventMetadata(params: {
  consecutive: number
  exitCode: number | null
  uptimeMs: number
  workerKind: string
}): Record<string, unknown> {
  const { consecutive, exitCode, uptimeMs, workerKind } = params
  return {
    consecutive,
    exit_code: exitCode ?? undefined,
    uptime_ms: uptimeMs,
    worker_kind: workerKind,
  }
}

/**
 * Spawn a worker child process with the appropriate env vars.
 */
function spawnWorker(
  worker: WorkerState,
  dir: string,
  config: Record<string, string>,
  signal: AbortSignal,
): void {
  if (signal.aborted || worker.parked) return

  worker.lastStartTime = Date.now()

  const env: Record<string, string | undefined> = {
    ...process.env,
    DAEMON_WORKER_DIR: dir,
    DAEMON_WORKER_NAME: config.name,
    DAEMON_WORKER_SPAWN_MODE: config.spawnMode || 'same-dir',
    DAEMON_WORKER_CAPACITY: config.capacity || '4',
    DAEMON_WORKER_PERMISSION: config.permissionMode,
    DAEMON_WORKER_SANDBOX: config.sandbox || '0',
    DAEMON_WORKER_CREATE_SESSION: '1',
    THYROX_CODE_SESSION_KIND: 'daemon-worker',
  }

  // Build the worker command: reuse the same entrypoint with --daemon-worker flag
  const execArgs = [
    ...process.execArgv,
    process.argv[1]!,
    `--daemon-worker=${worker.kind}`,
  ]

  console.log(`[daemon] spawning worker '${worker.kind}'`)

  worker.servedFolderDir = dir
  worker.lastBusy = false
  worker.servedToolsCount = 0

  // `stdio[3]='ipc'` abre el canal de mensajes que `Ue.spawn` usa para
  // `rc_busy`/`rc_serving_tools` (worker→supervisor) y `shutdown`
  // (supervisor→worker); `stdin` deja de ser `'ignore'` porque el
  // bootstrap viaja por ahí (`writeWorkerBootstrap`).
  const child = spawn(process.execPath, execArgs, {
    env,
    cwd: dir,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })

  worker.process = child

  // Porte de `n.stdin.on("error", ...)` + `n.stdin.write(...)`,
  // `n.stdin.end()` en `Ue.spawn`. `initialAccessToken` queda fuera del
  // payload: este supervisor no gestiona tokens de auth por worker (el
  // worker resuelve el suyo con la lectura OAuth de su credencial,
  // `workerRegistry.ts`), a diferencia de `this.authManager` en la
  // referencia.
  //
  // pendiente: `this.authManager.attachWorker(n)` (propagación de
  // refresh de token al worker vivo) no tiene equivalente aquí — no hay
  // `authManager` en este supervisor.
  if (child.stdin) {
    writeWorkerBootstrap(child.stdin, { config: { dir, ...config } }, error => {
      console.error(`[daemon] worker '${worker.kind}' stdin write error: ${error.message}`)
    })
  }

  // Porte del `n.on("message", (u) => {...})` de `Ue.spawn`: valida y
  // aplica `rc_busy`/`rc_serving_tools` vía `parseWorkerToSupervisorMessage`.
  child.on('message', raw => {
    const message = parseWorkerToSupervisorMessage(raw)
    if (!message) return
    if (message.type === 'rc_busy') {
      worker.lastBusy = message.busy
      worker.lastBusyAt = Date.now()
    } else {
      worker.servedToolsCount = message.count
    }
  })

  // Pipe worker stdout/stderr to supervisor with prefix
  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().trimEnd().split('\n')
    for (const line of lines) {
      console.log(`  ${line}`)
    }
  })
  child.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().trimEnd().split('\n')
    for (const line of lines) {
      console.error(`  ${line}`)
    }
  })

  child.on('exit', (code, sig) => {
    worker.process = null
    worker.lastBusy = false
    worker.servedToolsCount = 0
    if (worker.forceKillTimer) {
      clearTimeout(worker.forceKillTimer)
      worker.forceKillTimer = null
    }

    if (signal.aborted) {
      // Supervisor is shutting down, don't restart
      return
    }

    if (code === EXIT_CODE_PERMANENT) {
      // ant 5170 — permanent_exit: worker signaled it should never be
      // respawned (e.g. unrecoverable config error). Park, don't retry.
      logEvent('tengu_daemon_worker_permanent_exit', {
        worker_kind: worker.kind,
        exit_code: String(code),
        signal: sig ? String(sig) : '',
      })
      console.error(
        `[daemon] worker '${worker.kind}' exited with permanent error — parking`,
      )
      worker.parked = true
      return
    }

    const uptimeMs = Date.now() - worker.lastStartTime

    if (isHealthyWorkerExit(code, uptimeMs)) {
      // Porte de `Ue.onExit`, rama sana (r===0 && n>=br): resetea la racha
      // y respawnea de inmediato, sin backoff.
      worker.consecutiveCrashes = 0
      console.log(
        `[daemon] worker '${worker.kind}' exited code=${code} sig=${sig} uptime=${uptimeMs}ms (clean) — respawning`,
      )
      spawnWorker(worker, dir, config, signal)
      return
    }

    worker.consecutiveCrashes++
    const backoffMs = computeWorkerBackoffMs(worker.consecutiveCrashes)

    // ant 5170 — worker_crash: every non-permanent, non-healthy exit fires
    // this. Porte de `Ue.onExit`: `i("tengu_daemon_worker_crash",
    // {consecutive, exit_code, uptime_ms, worker_kind})`.
    logEvent(
      'tengu_daemon_worker_crash',
      buildWorkerCrashEventMetadata({
        consecutive: worker.consecutiveCrashes,
        exitCode: code,
        uptimeMs,
        workerKind: worker.kind,
      }),
    )

    console.log(
      `[daemon] worker '${worker.kind}' ${formatWorkerExitLogLine({
        code,
        signal: sig,
        uptimeMs,
        consecutive: worker.consecutiveCrashes,
        backoffMs,
      })}`,
    )

    setTimeout(() => {
      if (!signal.aborted && !worker.parked) {
        spawnWorker(worker, dir, config, signal)
      }
    }, backoffMs)
  })
}

/**
 * Apaga un worker de forma ordenada — porte exacto de `Ue.stop`
 * (`chunk-92tvramn.js`, referencia 2.1.283, resuelto con
 * `bin/binary symbol`): manda `shutdown` por IPC; si no es Windows o el
 * envío falló, también manda SIGTERM; y programa SIGKILL de gracia
 * (`WORKER_SHUTDOWN_SIGKILL_GRACE_MS`) sin importar cuál de las dos vías
 * respondió — el `child.on('exit', ...)` de `spawnWorker` limpia el
 * timer cuando el proceso ya salió, igual que el `clearTimeout(a)` tras
 * `await o` en la referencia.
 */
export function stopWorkerProcess(worker: WorkerState, cause?: string): void {
  if (worker.forceKillTimer) {
    clearTimeout(worker.forceKillTimer)
    worker.forceKillTimer = null
  }
  const child = worker.process
  if (!child) return
  const sent = sendWorkerShutdownMessage(child, cause)
  if (process.platform !== 'win32' || !sent) {
    child.kill('SIGTERM')
  }
  worker.forceKillTimer = scheduleForceKill(child, WORKER_SHUTDOWN_SIGKILL_GRACE_MS)
}

/**
 * Snapshot de estado de un worker — envoltorio de `computeWorkerStatus`
 * (porte de `Ue.get status()`) sobre los campos de `WorkerState`.
 */
export function getWorkerStatus(worker: WorkerState): WorkerStatusSnapshot | null {
  return computeWorkerStatus({
    pid: worker.process?.pid,
    startedAt: worker.lastStartTime,
    config: worker.servedFolderDir !== undefined ? { dir: worker.servedFolderDir } : undefined,
    servedSessionsCount: worker.servedToolsCount,
  })
}

/**
 * Envoltorio de `isWorkerBusy` (porte de `Ue.isBusy()`) sobre los campos
 * de `WorkerState`.
 */
export function isWorkerBusyNow(worker: WorkerState, now: number = Date.now()): boolean {
  return isWorkerBusy(
    { lastBusy: worker.lastBusy, lastBusyAt: worker.lastBusyAt, hasChild: worker.process !== null },
    now,
  )
}
