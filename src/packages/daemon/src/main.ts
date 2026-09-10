/**
 * Punto de entrada del daemon supervisor. Se llama desde `cli.tsx` vía:
 *   `claude daemon [subcommand]`
 *
 * Arranca y supervisa workers de larga vida. Actualmente genera un solo
 * worker `remoteControl` que corre el servidor headless del bridge.
 *
 * Subcomandos:
 *   (ninguno)  — arranca el supervisor con los workers default
 *   start      — igual que sin subcomando
 *   status     — imprime el estado de los workers (TODO: IPC)
 *   stop       — manda SIGTERM al supervisor (TODO: archivo PID)
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/main.ts`. Los imports
 * dinámicos internos de la fuente (`await import('./bgDaemon.js')`, etc.)
 * se izan aquí a imports estáticos: son módulos del propio paquete que
 * siempre resuelven, así que la excepción de "lazy import" no aplica —
 * sólo cubre el especificador que no resuelve.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { errorMessage, logEvent } from './internal/pendingCrossPackageDeps.js'
import { daemonRequest } from './daemonClient.js'
import { bgDaemonMain } from './bgDaemon.js'
import * as launchAgentMod from './launchAgent.js'

/**
 * Código de salida usado por los workers para fallos permanentes (no
 * reintentables).
 * @see workerRegistry.ts EXIT_CODE_PERMANENT
 */
const EXIT_CODE_PERMANENT = 78

/**
 * Configuración de backoff para reiniciar workers crasheados.
 */
const BACKOFF_INITIAL_MS = 2_000
const BACKOFF_CAP_MS = 120_000
const BACKOFF_MULTIPLIER = 2
const MAX_RAPID_FAILURES = 5 // Aparcar el worker tras esta cantidad de crashes rápidos

interface WorkerState {
  kind: string
  process: ChildProcess | null
  backoffMs: number
  failureCount: number
  parked: boolean
  lastStartTime: number
}

/**
 * Punto de entrada del daemon supervisor. Se llama desde `cli.tsx` vía:
 *   `claude daemon [subcommand]`
 *
 * Arranca y supervisa workers de larga vida. Actualmente genera un solo
 * worker `remoteControl` que corre el servidor headless del bridge.
 *
 * Subcomandos:
 *   (ninguno)  — arranca el supervisor con los workers default
 *   start      — igual que sin subcomando
 *   status     — imprime el estado de los workers (TODO: IPC)
 *   stop       — manda SIGTERM al supervisor (TODO: archivo PID)
 */
export async function daemonMain(args: string[]): Promise<void> {
  const subcommand = args[0] || 'start'

  switch (subcommand) {
    case 'start':
      try {
        await runSupervisor(args.slice(1))
      } catch (e) {
        // ant 5170 — startup_crash: el supervisor falló al arrancarse.
        // Se registra para que los admins lo noten; se relanza para
        // preservar la semántica del código de salida.
        logEvent('tengu_daemon_startup_crash', {
          error: errorMessage(e).slice(0, 200),
        })
        throw e
      }
      break
    case 'bg': {
      // ccb daemon bg [run|status|stop|install|uninstall|start|restart] — supervisor bg.
      const sub = args[1] || 'run'
      if (sub === 'run') {
        let code = 1
        try {
          code = await bgDaemonMain(args.slice(2))
        } catch (e) {
          logEvent('tengu_daemon_startup_crash', {
            error: errorMessage(e).slice(0, 200),
            sub: 'bg',
          })
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
      // Delega al ping RPC del bg-daemon. El `status` de primer nivel es
      // una abreviatura de `daemon bg status`; el supervisor de este
      // archivo (runSupervisor) es un modelo de proceso separado sin RPC
      // propio, así que mostrar el estado del bg daemon es la señal más
      // útil aquí. Pasa --json.
      await bgDaemonStatus(args.includes('--json'))
      break
    case 'stop':
      // Misma razón de delegación que `status`. El bg daemon es dueño del
      // op de shutdown; el supervisor legacy de este archivo responde a
      // SIGTERM directamente y no es direccionable vía RPC de shutdown.
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
  const today = new Date().toISOString().slice(0, 10)
  const logPath = join(homedir(), '.claude', 'telemetry', `events-${today}.jsonl`)
  if (!existsSync(logPath)) {
    console.error(`bg daemon log: no events file at ${logPath}`)
    console.error(`(set CLAUDE_CODE_LOCAL_TELEMETRY=1 + restart daemon to populate)`)
    process.exitCode = 1
    return
  }
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
  const ccbDir = join(homedir(), '.claude', 'daemon')
  const opts = {
    jsonPath: join(ccbDir, 'state.json'),
    logPath: join(ccbDir, 'daemon.log'),
  }
  if (verb === 'is-stale') {
    const stale = await launchAgentMod.isLaunchAgentStale()
    console.log(stale ? 'stale' : 'fresh')
    process.exitCode = stale ? 1 : 0
    return
  }
  if (verb === 'is-active') {
    const active = await launchAgentMod.isLaunchAgentRunning()
    console.log(active ? 'active' : 'inactive')
    process.exitCode = active ? 0 : 1
    return
  }
  let r: { ok: boolean; error?: string; servicePath?: string }
  if (verb === 'install') r = await launchAgentMod.installLaunchAgent(opts)
  else if (verb === 'uninstall') r = await launchAgentMod.uninstallLaunchAgent()
  else if (verb === 'enable') r = await launchAgentMod.startLaunchAgent()
  else if (verb === 'disable') r = await launchAgentMod.stopLaunchAgent()
  else r = await launchAgentMod.restartLaunchAgent()
  if (!r.ok) {
    console.error(`bg daemon ${verb}: ${r.error}`)
    process.exitCode = 1
    return
  }
  console.log(`bg daemon ${verb}: ok${r.servicePath ? ` (${r.servicePath})` : ''}`)
}

async function bgDaemonStop(): Promise<void> {
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
Claude Code Daemon — persistent background supervisor

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
 * Parsea los argumentos del supervisor desde la CLI.
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
 * Corre el loop del daemon supervisor. Genera workers y los reinicia al
 * crashear con backoff exponencial.
 */
async function runSupervisor(args: string[]): Promise<void> {
  const config = parseSupervisorArgs(args)
  const dir = config.dir || resolve('.')

  console.log(`[daemon] supervisor starting in ${dir}`)

  const workers: WorkerState[] = [
    {
      kind: 'remoteControl',
      process: null,
      backoffMs: BACKOFF_INITIAL_MS,
      failureCount: 0,
      parked: false,
      lastStartTime: 0,
    },
  ]

  const controller = new AbortController()

  // Apagado ordenado
  const shutdown = () => {
    console.log('[daemon] supervisor shutting down...')
    controller.abort()
    for (const w of workers) {
      if (w.process && !w.process.killed) {
        w.process.kill('SIGTERM')
      }
    }
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  // Genera y supervisa a los workers
  for (const worker of workers) {
    if (!controller.signal.aborted) {
      spawnWorker(worker, dir, config, controller.signal)
    }
  }

  // Espera la señal de abort
  await new Promise<void>(resolve => {
    if (controller.signal.aborted) {
      resolve()
      return
    }
    controller.signal.addEventListener('abort', () => resolve(), { once: true })
  })

  // Espera a que todos los workers salgan
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
            // Fuerza el kill tras el período de gracia
            setTimeout(() => {
              if (w.process && !w.process.killed) {
                w.process.kill('SIGKILL')
              }
              resolve()
            }, 30_000)
          }),
      ),
  )

  console.log('[daemon] supervisor stopped')
}

/**
 * Genera un subproceso worker con las variables de entorno apropiadas.
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
    CLAUDE_CODE_SESSION_KIND: 'daemon-worker',
  }

  // Arma el comando del worker: reusa el mismo entrypoint con el flag --daemon-worker
  const execArgs = [
    ...process.execArgv,
    process.argv[1]!,
    `--daemon-worker=${worker.kind}`,
  ]

  console.log(`[daemon] spawning worker '${worker.kind}'`)

  const child = spawn(process.execPath, execArgs, {
    env,
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  worker.process = child

  // Reenvía stdout/stderr del worker al supervisor con prefijo
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

    if (signal.aborted) {
      // El supervisor se está apagando, no reiniciar
      return
    }

    if (code === EXIT_CODE_PERMANENT) {
      // ant 5170 — permanent_exit: el worker señalizó que nunca debe
      // respawnearse (p. ej. un error de config irrecuperable). Se
      // aparca, no se reintenta.
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

    // ant 5170 — worker_crash: toda salida distinta de cero y no
    // permanente dispara esto. Incluye la racha para que los consumidores
    // vean la tendencia del crash-loop.
    logEvent('tengu_daemon_worker_crash', {
      worker_kind: worker.kind,
      exit_code: String(code ?? -1),
      signal: sig ? String(sig) : '',
      streak: String(worker.failureCount + 1),
      uptime_ms: String(Date.now() - worker.lastStartTime),
    })

    // Chequea fallo rápido (crasheó dentro de los 10s de arrancar)
    const runDuration = Date.now() - worker.lastStartTime
    if (runDuration < 10_000) {
      worker.failureCount++
      if (worker.failureCount >= MAX_RAPID_FAILURES) {
        console.error(
          `[daemon] worker '${worker.kind}' failed ${worker.failureCount} times rapidly — parking`,
        )
        worker.parked = true
        return
      }
    } else {
      // Corrió un tiempo razonable, resetea el conteo de fallos
      worker.failureCount = 0
      worker.backoffMs = BACKOFF_INITIAL_MS
    }

    console.log(
      `[daemon] worker '${worker.kind}' exited (code=${code}, signal=${sig}), restarting in ${worker.backoffMs}ms`,
    )

    setTimeout(() => {
      if (!signal.aborted && !worker.parked) {
        spawnWorker(worker, dir, config, signal)
      }
    }, worker.backoffMs)

    // Backoff exponencial
    worker.backoffMs = Math.min(
      worker.backoffMs * BACKOFF_MULTIPLIER,
      BACKOFF_CAP_MS,
    )
  })
}
