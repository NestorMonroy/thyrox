/**
 * Punto de entrada del bg-daemon. Arranca el proceso daemon: ata el
 * socket de control, escanea los registros de job existentes, adopta
 * workers corriendo, y sirve los ops RPC de la CLI.
 *
 * Invocar:  `ccb daemon run` → `bgDaemonMain(args)`
 *
 * Espeja `ant 5172.js` daemonMain para la ruta BG. El daemon del bridge
 * vive en main.ts; éste es puramente sobre supervisión de jobs bg.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/bgDaemon.ts`. Los imports
 * dinámicos de módulos DEL PROPIO PAQUETE (`await import('./sparePool.js')`,
 * `await import('./classifier/orchestrator.js')`, `await
 * import('./dispatchSpool.js')`, `await import('node:fs')`,
 * `await import('node:net')`, `await import('node:os')`, etc.) se izan
 * aquí a imports estáticos: siempre resuelven, así que la excepción de
 * "lazy import" no aplica. Las dos excepciones genuinas —`spawnPtyHost` y
 * `encodeCtrlFrame`, de `@claude-code-how-works/cli/bg/*`, un paquete que
 * hoy no tiene equivalente `@thyrox/cli`— quedan detrás de los puntos de
 * inyección / el puerto fiel de `./internal/pendingCrossPackageDeps.js` y
 * `./internal/ptyFrame.js`.
 */

import { EventEmitter } from 'node:events'
import type { Socket } from 'node:net'
import { connect } from 'node:net'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir, platform as osPlatform, freemem } from 'node:os'

import { logEvent as logEventFn, spawnPtyHost } from './internal/pendingCrossPackageDeps.js'
import { encodeCtrlFrame } from './internal/ptyFrame.js'
import { adoptFromRoster, adoptRunningPtyRecords } from './bgAdopt.js'
import {
  makeIdleActivityCount,
  setupIdleExitWatchdog,
  setupUpgradeWatchdog,
} from './bgDaemonTimers.js'
import {
  type WorkerRecord,
  readAllWorkerRecords,
  writeWorkerRecord,
} from './bgWorkerRegistry.js'
import { recordToRosterEntry, updateRoster } from './roster.js'
import { readState } from './classifier/stateFile.js'
import { startOrchestrator } from './classifier/orchestrator.js'
import {
  claimSpare,
  enableSparePool,
  markSpareReady,
  recordSpareSpawn,
  setPrewarmInFlight,
  shouldPrewarm,
} from './sparePool.js'
import { drainSpool, startSpoolWatcher } from './dispatchSpool.js'
import { type DaemonServer, err, ok, startSocketServer } from './socketServer.js'
import { WorkerVm } from './workerVm.js'

/**
 * Arma un valor con forma de Socket no-op para rutas RPC de dispara-y-
 * olvida (entrega por spool de archivos, etc.). Devuelve un objeto
 * respaldado por EventEmitter que tiene la superficie mínima de
 * net.Socket que los manejadores de op del daemon tocan:
 * `write`/`end`/`destroyed`/`once`/`on`.
 */
function makeNoopSocketForSpool(): Socket {
  const ee = new EventEmitter() as Socket
  // Los manejadores de op sólo llaman a write/end y nunca leen la respuesta.
  Object.assign(ee, {
    write: () => true,
    end: () => {},
    destroyed: false,
  })
  return ee
}

interface PendingDispatch {
  nonce: string
  pid?: number
  acked: boolean
  failed?: { code: string; error: string }
  startedAt: number
}

interface DaemonState {
  server: DaemonServer | undefined
  workers: Map<string, WorkerVm>
  /**
   * Workers desatendidos: kill('stop') mueve el vm aquí desde `workers`
   * para que la búsqueda de attach igual pueda encontrarlo. ant: los
   * workers desatendidos siguen alcanzables hasta que su ccb interno sale
   * naturalmente. El apagado del daemon los descarta a todos.
   */
  detached: Map<string, WorkerVm>
  /** nonces de despacho esperando ack (short → pending). */
  pending: Map<string, PendingDispatch>
  abort: AbortController
  startedAt: number
  /** Leases de cliente activos. `ant 5170.js` iFK leaseCount(). */
  leases: Set<Socket>
}

interface ParsedArgs {
  jsonPath?: string
  logFile?: string
  origin?: 'transient' | 'service' | 'shell'
  spawnedBy?: string
}

function parseArgs(args: readonly string[]): ParsedArgs {
  const out: ParsedArgs = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--json-path') out.jsonPath = args[++i]
    else if (a === '--log-file') out.logFile = args[++i]
    else if (a === '--origin') out.origin = args[++i] as ParsedArgs['origin']
    else if (a === '--spawned-by') out.spawnedBy = args[++i]
  }
  return out
}

/**
 * Arranca el bg daemon. Se resuelve una vez que el daemon se apagó
 * (señal u op de shutdown recibido). Devuelve el código de salida del
 * daemon (0 en apagado ordenado, distinto de cero ante error).
 */
export async function bgDaemonMain(args: readonly string[]): Promise<number> {
  const parsed = parseArgs(args)
  const state: DaemonState = {
    server: undefined,
    workers: new Map(),
    detached: new Map(),
    pending: new Map(),
    abort: new AbortController(),
    startedAt: Date.now(),
    leases: new Set(),
  }

  process.title = 'ccb daemon'

  // `ant 4639.js` j2() lee esto; ccb lo escribe al arrancar para que el
  // tooling externo (reinicio de zombis, detección de version-skew)
  // pueda inspeccionarlo.
  if (parsed.jsonPath) {
    try {
      mkdirSync(dirname(parsed.jsonPath), { recursive: true })
      writeFileSync(
        parsed.jsonPath,
        JSON.stringify({
          pid: process.pid,
          startedAt: state.startedAt,
          origin: parsed.origin ?? 'transient',
          version: process.env.CLAUDE_CODE_VERSION ?? 'dev',
          spawnedBy: parsed.spawnedBy,
        }),
      )
    } catch {
      // best-effort
    }
  }

  /* adoptFromRoster + adoptRunningPtyRecords viven en ./bgAdopt.ts */
  logEventFn('tengu_bg_daemon_boot', {
    pid: String(process.pid),
    origin: parsed.origin ?? 'transient',
  })
  // `ant 5170.js` iFK:219 — daemon_start dispara una vez tras que el
  // supervisor ató su socket de control y está listo para aceptar ops.
  // El worker_kinds y worker_count de ccb mapean a "0/0" porque éste es
  // el supervisor sólo-bg (sin sub-workers remoteControl/bridge).
  logEventFn('tengu_daemon_start', {
    worker_kinds: '0',
    worker_count: '0',
    origin: parsed.origin ?? 'transient',
  })
  if (process.env.CLAUDE_CODE_BG_SPARE_POOL === '1') {
    enableSparePool()
    // Scheduler de pre-calentamiento: cada 30s, si no hay repuesto + no
    // hay uno en vuelo, genera uno. `ant 4644.js` iw6.
    const prewarmTimer = setInterval(() => {
      if (!shouldPrewarm()) return
      setPrewarmInFlight(true)
      void (async () => {
        try {
          const sessionId = randomUUID()
          const short = sessionId.slice(0, 8)
          const cwd = process.cwd()
          // Genera el repuesto vía la ruta spawnPtyHost existente de bg.ts.
          const jobDir = join(homedir(), '.claude', 'jobs', short)
          mkdirSync(jobDir, { recursive: true })
          const r = spawnPtyHost({
            short,
            jobDir,
            flags: [],
            directive: '(idle — waiting for trigger)',
            cwd,
          })
          recordSpareSpawn(short, cwd, sessionId, r.socketPath)
          // Espera a que el socket PTY del worker aparezca (proxy de listo).
          // Poll por la existencia del archivo de socket, luego marca listo.
          for (let i = 0; i < 50; i++) {
            await new Promise(res => setTimeout(res, 100))
            if (existsSync(r.socketPath)) {
              markSpareReady(short)
              break
            }
          }
        } catch (e) {
          logEventFn('tengu_bg_spare_claim_fail', { reason: 'prewarm-spawn-failed', error: (e as Error).message.slice(0, 80) })
        } finally {
          setPrewarmInFlight(false)
        }
      })()
    }, 30_000)
    prewarmTimer.unref()
  }
  // Escaneo al arrancar + re-escaneo cada 5s para workers generados fuera
  // de nuestro op spawn (p. ej. `ccb --bg-pty` disparado por el usuario).
  // Cadencia de barrido de `ant 5172.js`.
  // Dos fuentes de verdad: (1) jobs/<short>/meta.json (siempre
  // autoritativo para el status), (2) ~/.claude/daemon/roster.json
  // (índice cross-cwd de supervisores vivos — sobrevive al reinicio del
  // daemon). Se adopta de ambas y luego se unifica.
  await adoptFromRoster(state.workers)
  adoptRunningPtyRecords(state.workers)
  // Tras la adopción al arrancar, se vuelca el snapshot del mapa de
  // workers actual de vuelta a roster.json para que un observador
  // paralelo (`ccb doctor`) vea la vista del nuevo supervisor.
  void updateRoster(r => {
    r.workers = {}
    for (const [s, vm] of state.workers) r.workers[s] = recordToRosterEntry(vm.getRecord())
  }).catch(() => {})
  const adoptTimer = setInterval(() => adoptRunningPtyRecords(state.workers), 5000)
  adoptTimer.unref()
  // Refresco periódico del roster (atrapa cambios de estado que no pasan
  // por nuestros manejadores de spawn/settle — p. ej. un registro
  // mutado por tooling externo).
  const rosterTimer = setInterval(() => {
    void updateRoster(r => {
      r.workers = {}
      for (const [s, vm] of state.workers) r.workers[s] = recordToRosterEntry(vm.getRecord())
    }).catch(() => {})
  }, 30_000)
  rosterTimer.unref()
  // `ant 5170.js` iFK:172-193 + 130-167+244 — watchdog de salida por
  // inactividad + auto-reinicio al actualizar el binario. Las
  // implementaciones viven en ./bgDaemonTimers.ts para mantener este
  // archivo bajo el presupuesto de 800 LOC.
  const idleExit = setupIdleExitWatchdog({
    origin: parsed.origin ?? 'transient',
    abort: state.abort,
    graceMs: 5_000,
    countActivity: makeIdleActivityCount(state),
  })
  const idleProbeTimer = setInterval(idleExit.probe, 2_000)
  idleProbeTimer.unref()
  const upgradeWatchdog = setupUpgradeWatchdog(state.abort)

  // Cablea los manejadores de op de socket. Capturado en una variable
  // para que el watcher de spool de despacho por archivo (`ant 5165.js`)
  // pueda reusar la misma tabla de manejadores.
  const opHandlers = {
    ping: async () =>
      ok({ op: 'ping', uptime: Date.now() - state.startedAt }),
    nudge: async () => ok({ op: 'nudge', restarting: false }),
    list: async () => {
      interface JobEntry {
        short: string
        pid: number
        status: string
        phase: string
        mode?: string
        startedAt: number
        attachers: number
        classifierState?: string
        classifierTempo?: string
        classifierDetail?: string
        classifierNeeds?: string
        detached?: boolean
      }
      const buildEntry = (vm: WorkerVm, isDetached: boolean): JobEntry => {
        const r = vm.getRecord()
        const cs = readState(r.short)
        const j: JobEntry = {
          short: r.short,
          pid: r.pid,
          status: r.status,
          phase: vm.getPhase().kind,
          mode: r.mode,
          startedAt: r.startedAt,
          attachers: vm.attacherCount(),
          ...(isDetached && { detached: true }),
        }
        if (cs) {
          j.classifierState = cs.state
          j.classifierTempo = cs.tempo
          j.classifierDetail = cs.detail
          if (cs.needs) j.classifierNeeds = cs.needs
        }
        return j
      }
      const jobs: JobEntry[] = [
        ...[...state.workers.values()].map(vm => buildEntry(vm, false)),
        ...[...state.detached.values()].map(vm => buildEntry(vm, true)),
      ]
      // También muestra registros que no están corriendo (recién
      // salidos). Se salta si el worker ya está en el mapa vivo o
      // desatendido — si no, un worker desatendido que aún tenga un
      // meta.json bajo jobs/<short>/ aparecería dos veces (una con
      // detached:true, otra como 'retired').
      for (const record of readAllWorkerRecords()) {
        if (state.workers.has(record.short)) continue
        if (state.detached.has(record.short)) continue
        jobs.push({
          short: record.short,
          pid: record.pid,
          status: record.status,
          phase: 'retired',
          mode: record.mode,
          startedAt: record.startedAt,
          attachers: 0,
        })
      }
      return ok({ op: 'list', jobs })
    },
    spawn: async msg => {
      // payload: { d: { short, cwd, ptySocket, cmd, env, cliVersion, dispatch } }
      const d = (msg.d ?? msg) as Record<string, unknown>
      const short = d.short as string | undefined
      if (!short) return err('EBADREQ', 'spawn: missing short')
      if (state.workers.has(short)) {
        return err('EALIVE', `worker ${short} already running`, { short })
      }
      const vm = new WorkerVm({
        short,
        cwd: (d.cwd as string) ?? process.cwd(),
        env: (d.env as NodeJS.ProcessEnv) ?? process.env,
        ptySocket: (d.ptySocket as string) ?? '',
        rvSocket: d.rvSocket as string | undefined,
        cmd: (d.cmd as string[]) ?? [],
        cliVersion: (d.cliVersion as string) ?? process.env.CLAUDE_CODE_VERSION ?? 'dev',
        dispatch: d.dispatch as Record<string, unknown> | undefined,
      })
      state.workers.set(short, vm)
      vm.on('settled', () => {
        // Conserva el vm asentado un tick más para que list lo siga
        // mostrando; luego lo suelta + lo quita del roster.
        setTimeout(() => state.workers.delete(short), 100).unref()
        void updateRoster(r => {
          delete r.workers[short]
        }).catch(() => {})
      })
      vm.spawn()
      // Arranca el orchestrator del clasificador si el gate está activo
      // (intent desconocido para el op spawn).
      startOrchestrator(vm)
      // Persiste en el roster para que un reinicio subsecuente del
      // supervisor recoja este worker vía adoptFromRoster (visibilidad
      // cross-cwd).
      void updateRoster(r => {
        r.workers[short] = recordToRosterEntry(vm.getRecord())
      }).catch(() => {})
      return ok({ op: 'spawn', short, pid: vm.getRecord().pid })
    },
    /**
     * dispatch — `ant 4138.js` / `4648.js` MC8. Genera un worker para
     * `short` con un nonce; el cliente sigue con `await-ack` para
     * bloquearse esperando confirmación de que el worker aceptó la
     * directiva.
     */
    dispatch: async msg => {
      const d = (msg.d ?? msg) as Record<string, unknown>
      const short = d.short as string | undefined
      const nonce = d.nonce as string | undefined
      if (!short) {
        logEventFn('tengu_bg_dispatch_rejected', { reason: 'missing_short' })
        return err('EBADREQ', 'dispatch: missing short')
      }
      if (!nonce) {
        logEventFn('tengu_bg_dispatch_rejected', { short, reason: 'missing_nonce' })
        return err('EBADREQ', 'dispatch: missing nonce')
      }
      if (state.workers.has(short)) {
        logEventFn('tengu_bg_dispatch_rejected', { short, reason: 'already_running' })
        return err('EALIVE', `worker ${short} already running`, { short })
      }
      // Puerto de `ant v2.1.133` NdK (5196.js) — tope de memoria libre
      // antes del spawn. Cuando la RAM disponible del host cae por debajo
      // de `tengu_bg_low_mem_mb` (default 1024MB; macOS exento porque la
      // semántica de vm_stat no coincide con os.freemem y causaría
      // retiros espurios), llama a retireIfSettled en cada worker
      // existente para reclamar memoria antes de aceptar otro. En
      // Linux/Windows siempre se chequea — el kernel intenta
      // sobre-comprometer, así que generar una sesión bg más en un
      // sistema hambriento de memoria es lo que típicamente lo empuja al
      // OOM killer o al thrashing. Se emite telemetría para poder ajustar
      // el umbral por entorno.
      try {
        const platform = osPlatform()
        // El umbral se lee del env. El presupuesto de acoplamiento
        // cross-package del daemon lo mantiene independiente de
        // `@claude-code-how-works/config`, así que se evita el flag de
        // GrowthBook y se acota sólo vía env.
        // CLAUDE_CODE_BG_LOW_MEM_MB sobreescribe el default (1024 MB en
        // Linux/Win, 0 en macOS — la semántica de vm_stat no coincide con
        // os.freemem y causaría retiros espurios).
        const envOverride = Number(process.env.CLAUDE_CODE_BG_LOW_MEM_MB)
        const thresholdMb =
          platform === 'darwin'
            ? Number.isFinite(envOverride)
              ? envOverride
              : 0
            : Number.isFinite(envOverride)
              ? envOverride
              : 1024
        if (thresholdMb > 0) {
          const thresholdBytes = thresholdMb * 1024 * 1024
          const freeBytes = freemem()
          if (freeBytes < thresholdBytes) {
            let retired = 0
            for (const [s, w] of state.workers.entries()) {
              const retireIfSettled = (
                w as { retireIfSettled?: () => boolean }
              ).retireIfSettled
              if (typeof retireIfSettled === 'function') {
                if (retireIfSettled.call(w)) {
                  retired++
                  state.workers.delete(s)
                  state.pending.delete(s)
                }
              }
            }
            logEventFn('tengu_bg_dispatch_low_mem', {
              free_mb: String(Math.floor(freeBytes / (1024 * 1024))),
              handles: String(state.workers.size),
              retired: String(retired),
              threshold_mb: String(thresholdMb),
            })
          }
        }
      } catch {
        // El chequeo de baja memoria no debe bloquear un dispatch legítimo — se sigue adelante.
      }
      // `ant 4644.js`: intenta reclamar un repuesto antes de un spawn
      // fresco. Si un repuesto listo coincide en cwd, manda una trama de
      // control 'claim' con el intent despachado para que el repuesto
      // corriendo lo recoja; se salta el spawn fresco.
      const claim = claimSpare((d.cwd as string) ?? process.cwd())
      if (claim.ok) {
        const intent = (d.intent as string) ?? (d.directive as string) ?? ''
        try {
          await new Promise<void>((resolve, reject) => {
            const sock = connect(claim.ptySocket)
            sock.once('connect', () => {
              sock.write(encodeCtrlFrame({ t: 'claim', intent, cwd: (d.cwd as string), sessionId: claim.sessionId }))
              sock.end()
              resolve()
            })
            sock.once('error', e => reject(e))
          })
          // El worker de repuesto sigue corriendo con su short existente
          // — se devuelve su short en vez de generar uno fresco.
          state.pending.set(claim.short, { nonce, acked: true, pid: undefined, startedAt: Date.now() })
          logEventFn('tengu_bg_dispatch', {
            backend_daemon: 'true',
            via: 'spare-claim',
            short: claim.short,
            ms: '0',
          })
          return ok({ op: 'dispatch', short: claim.short, nonce, pid: -1, via: 'spare-claim' })
        } catch (e) {
          // El envío del claim falló → se cae al spawn fresco.
          logEventFn('tengu_bg_sendclaim_failed', { reason: 'connect-error', short: claim.short, error: (e as Error).message.slice(0, 80) })
        }
      }
      const vm = new WorkerVm({
        short,
        cwd: (d.cwd as string) ?? process.cwd(),
        env: (d.env as NodeJS.ProcessEnv) ?? process.env,
        ptySocket: (d.ptySocket as string) ?? '',
        rvSocket: d.rvSocket as string | undefined,
        cmd: (d.cmd as string[]) ?? [],
        cliVersion: (d.cliVersion as string) ?? process.env.CLAUDE_CODE_VERSION ?? 'dev',
        dispatch: d as Record<string, unknown>,
      })
      state.workers.set(short, vm)
      const pending: PendingDispatch = { nonce, acked: false, startedAt: Date.now() }
      state.pending.set(short, pending)
      vm.on('settled', (outcome: string) => {
        // ant respawn_unconfirmed_bail: si el dispatch se asentó antes de
        // que transcurriera el presupuesto de ack, se marca fallido para
        // que await-ack devuelva el error real en vez de expirar por
        // timeout.
        if (!pending.acked) {
          pending.failed = { code: 'ECRASHED', error: `worker ${short} settled before ack: ${outcome}` }
          logEventFn('tengu_bg_respawn_unconfirmed_bail', { short, outcome, ms: String(Date.now() - pending.startedAt) })
        }
        setTimeout(() => { state.workers.delete(short); state.pending.delete(short) }, 100).unref()
        void updateRoster(r => { delete r.workers[short] }).catch(() => {})
      })
      vm.spawn()
      void updateRoster(r => {
        r.workers[short] = recordToRosterEntry(vm.getRecord())
      }).catch(() => {})
      // Arranca el orchestrator del clasificador con el intent (la
      // directiva del dispatch).
      startOrchestrator(vm, (d.directive as string | undefined) ?? (d.intent as string | undefined))
      setTimeout(() => {
        if (pending.acked || pending.failed) return
        if (state.workers.get(short) === vm) {
          pending.pid = vm.getRecord().pid
          pending.acked = true
          logEventFn('tengu_bg_dispatch_rescued', { short, ms: String(Date.now() - pending.startedAt) })
        }
      }, 5000).unref()
      return ok({ op: 'dispatch', short, nonce, pid: vm.getRecord().pid, via: 'socket' })
    },
    'await-ack': async msg => {
      const short = msg.short as string | undefined
      const nonce = msg.nonce as string | undefined
      if (!short) return err('EBADREQ', 'await-ack: missing short')
      if (!nonce) return err('EBADREQ', 'await-ack: missing nonce')
      const pending = state.pending.get(short)
      if (!pending) return err('ENOCONN', `no pending dispatch for ${short}`)
      if (pending.nonce !== nonce) return err('ESTALE', `nonce mismatch for ${short}`)
      if (pending.failed) return err(pending.failed.code, pending.failed.error)
      if (!pending.acked) return err('ESTARTING', `worker ${short} not yet acked`)
      const vm = state.workers.get(short)
      const messagingSock = vm?.getRecord().ptySocket ?? ''
      return ok({ op: 'await-ack', short, nonce, pid: pending.pid, messagingSock, via: 'socket' })
    },
    /**
     * reply — `ant 4643.js` cw6. Manda `text` como un prompt de usuario
     * encolado a un worker corriendo vía su socket PTY. Lo usa el flujo
     * de claim de repuesto (inyección de intent) y
     * `ccb reply <short> "<text>"` (diferido). Ante ESTARTING, reintenta
     * hasta 10x cada 200ms.
     */
    reply: async msg => {
      const short = msg.short as string | undefined
      const text = msg.text as string | undefined
      if (!short) return err('EBADREQ', 'reply: missing short')
      if (text === undefined) return err('EBADREQ', 'reply: missing text')
      // El reply también puede apuntar a workers desatendidos (siguen
      // corriendo su ccb interno, el daemon sólo dejó de supervisarlos).
      const vm = state.workers.get(short) ?? state.detached.get(short)
      if (!vm) return err('ENOJOB', `no worker for short ${short}`)
      const ptySocket = vm.getRecord().ptySocket
      if (!ptySocket) return err('ENOSOCK', `worker ${short} has no ptySocket`)
      // Abre una conexión de cliente al socket PTY del worker + manda la trama de control 'reply'.
      return new Promise<{ ok: true; op: 'reply' } | { ok: false; code: string; error: string }>(resolve => {
        const sock = connect(ptySocket)
        sock.once('connect', () => {
          sock.write(encodeCtrlFrame({ t: 'reply', text }))
          sock.end()
          logEventFn('tengu_bg_agent_action', { action: 'reply', short, daemon: 'true' })
          resolve(ok({ op: 'reply' }) as { ok: true; op: 'reply' })
        })
        sock.once('error', e => {
          resolve(err('ENOCONN', `pty socket connect failed: ${(e as Error).message}`) as { ok: false; code: string; error: string })
        })
      })
    },
    /**
     * sendclaim — ruta de claim de repuesto de `ant 4644.js` cw6. Mismo
     * protocolo de cable que `reply` pero usa la trama de control
     * `claim` para que el worker sepa que es un handoff de repuesto (deja
     * que un futuro modo worker-side de espera-de-repuesto dispare
     * re-inicio de sesión). Hoy el ccb interno trata ambos de forma
     * idéntica; la distinción se preserva para telemetría + futuro
     * worker-side.
     */
    sendclaim: async msg => {
      const short = msg.short as string | undefined
      const intent = msg.intent as string | undefined
      const cwd = msg.cwd as string | undefined
      const sessionId = msg.sessionId as string | undefined
      if (!short || !intent) {
        logEventFn('tengu_bg_sendclaim_failed', { reason: 'missing-args' })
        return err('EBADREQ', 'sendclaim: missing short or intent')
      }
      const vm = state.workers.get(short)
      if (!vm) {
        logEventFn('tengu_bg_sendclaim_failed', { reason: 'no-worker', short })
        return err('ENOJOB', `no worker for short ${short}`)
      }
      const ptySocket = vm.getRecord().ptySocket
      if (!ptySocket) {
        logEventFn('tengu_bg_sendclaim_failed', { reason: 'no-sock', short })
        return err('ENOSOCK', `worker ${short} has no ptySocket`)
      }
      return new Promise<{ ok: true; op: 'sendclaim' } | { ok: false; code: string; error: string }>(resolve => {
        const sock = connect(ptySocket)
        sock.once('connect', () => {
          sock.write(encodeCtrlFrame({ t: 'claim', intent, cwd, sessionId }))
          sock.end()
          resolve(ok({ op: 'sendclaim' }) as { ok: true; op: 'sendclaim' })
        })
        sock.once('error', e => {
          logEventFn('tengu_bg_sendclaim_failed', { reason: 'connect-error', short, error: (e as Error).message.slice(0, 80) })
          resolve(err('ENOCONN', `pty socket connect failed: ${(e as Error).message}`) as { ok: false; code: string; error: string })
        })
      })
    },
    kill: async msg => {
      const short = msg.short as string | undefined
      if (!short) return err('EBADREQ', 'kill: missing short')
      const vm = state.workers.get(short)
      if (!vm) return err('ENOJOB', `no worker for short ${short}`)
      const force = msg.force as boolean | undefined
      vm.kill(force ? 'reap' : 'grace')
      return ok({ op: 'kill', confirmed: true })
    },
    /**
     * respawn-stalled — `ant 5164.js` wF3. El cliente attach de la CLI
     * llama a esto cuando detecta estancamiento (sin primera trama
     * dentro de ATTACH_STALL_THRESHOLD_MS). Incrementa el contador
     * attachStallRespawns; si el contador ya es ≥1 (o sea, ya se
     * respawneó una vez), rechaza con EGAVEUP para que el cliente se
     * rinda. Si no: SIGKILL al worker, respawn fresco con el contador
     * incrementado.
     */
    'respawn-stalled': async msg => {
      const short = msg.short as string | undefined
      if (!short) return err('EBADREQ', 'respawn-stalled: missing short')
      const vm = state.workers.get(short)
      if (!vm) return err('ENOJOB', `no worker for short ${short}`)
      const oldRecord = vm.getRecord()
      const attempts = oldRecord.attachStallRespawns ?? 0
      if (attempts >= 1) {
        // Segundo estancamiento — se rinde. El cliente decide si muestra el error.
        logEventFn('tengu_bg_attach_stall_gave_up', { short, attempts: String(attempts) })
        return err('EGAVEUP', `worker ${short} stalled ${attempts} time(s); not respawning again`)
      }
      logEventFn('tengu_bg_attach_stall_respawn', { short, attempts: String(attempts) })
      vm.kill('reap') // SIGKILL — un worker estancado no responderá a grace
      await new Promise(r => setTimeout(r, 200))
      const fresh = new WorkerVm({
        short: oldRecord.short,
        cwd: oldRecord.cwd,
        env: process.env,
        ptySocket: oldRecord.ptySocket ?? '',
        cmd: oldRecord.cmd,
        cliVersion: process.env.CLAUDE_CODE_VERSION ?? 'dev',
      })
      // Lleva el contador incrementado para que un 2do estancamiento en
      // este worker respawneado salga por la ruta EGAVEUP de arriba.
      const freshRecord = fresh.getRecord()
      freshRecord.attachStallRespawns = attempts + 1
      state.workers.set(short, fresh)
      fresh.spawn()
      void updateRoster(r => {
        r.workers[short] = recordToRosterEntry(fresh.getRecord())
      }).catch(() => {})
      return ok({ op: 'respawn-stalled', short, pid: fresh.getRecord().pid, attempts: attempts + 1 })
    },
    respawn: async msg => {
      const short = msg.short as string | undefined
      if (!short) return err('EBADREQ', 'respawn: missing short')
      const vm = state.workers.get(short)
      if (!vm) return err('ENOJOB', `no worker for short ${short}`)
      const oldPid = vm.getRecord().pid
      // Kill forzado del viejo, luego re-spawn con el mismo id corto.
      vm.kill('reap')
      // Espera brevemente a que el viejo se asiente, luego spawn fresco.
      await new Promise(r => setTimeout(r, 100))
      const oldRecord = vm.getRecord()
      // ant respawn_stale: que oldPid haya cambiado entre programar el
      // kill y ahora significa que otro escritor lo segó + respawneó en
      // paralelo.
      if (oldRecord.pid !== oldPid) {
        logEventFn('tengu_bg_respawn_stale', { short, expected_pid: String(oldPid), actual_pid: String(oldRecord.pid) })
      }
      const fresh = new WorkerVm({
        short: oldRecord.short,
        cwd: oldRecord.cwd,
        env: process.env,
        ptySocket: oldRecord.ptySocket ?? '',
        cmd: oldRecord.cmd,
        cliVersion: process.env.CLAUDE_CODE_VERSION ?? 'dev',
      })
      state.workers.set(short, fresh)
      fresh.spawn()
      void updateRoster(r => {
        r.workers[short] = recordToRosterEntry(fresh.getRecord())
      }).catch(() => {})
      return ok({ op: 'respawn', short, pid: fresh.getRecord().pid })
    },
    retire: async msg => {
      const short = msg.short as string | undefined
      if (!short) return err('EBADREQ', 'retire: missing short')
      const vm = state.workers.get(short)
      if (!vm) return err('ENOJOB', `no worker for short ${short}`)
      vm.kill('grace')
      return ok({ op: 'retire', short, retired: true })
    },
    /**
     * detach — ant: vm.kill('stop') no mata al worker, sólo hace que el
     * daemon se olvide de él. Se mueve del mapa de workers activos → el
     * mapa desatendido para que la búsqueda de attach subsecuente igual
     * lo encuentre. El worker sigue corriendo hasta que su ccb interno
     * salga naturalmente o el daemon reinicie.
     */
    detach: async msg => {
      const short = msg.short as string | undefined
      if (!short) return err('EBADREQ', 'detach: missing short')
      const vm = state.workers.get(short)
      if (!vm) return err('ENOJOB', `no worker for short ${short}`)
      vm.kill('stop')
      state.workers.delete(short)
      state.detached.set(short, vm)
      vm.on('settled', () => {
        setTimeout(() => state.detached.delete(short), 100).unref()
      })
      // Los workers desatendidos dejan de ser supervisados; se sueltan
      // del roster para que un reinicio del daemon no intente
      // re-adoptarlos.
      void updateRoster(r => { delete r.workers[short] }).catch(() => {})
      return ok({ op: 'detach', short, detached: true })
    },
    shutdown: async () => {
      logEventFn('tengu_bg_daemon_shutdown', {
        uptime_ms: String(Date.now() - state.startedAt),
        workers: String(state.workers.size),
      })
      // Programa el apagado después de que esta respuesta se mande.
      setImmediate(() => state.abort.abort()).unref()
      return ok({ op: 'shutdown', accepted: true })
    },
    /**
     * yield — `ant 5170.js` iFK:50-62. Un daemon nuevo arrancando con un
     * origen no-transitorio (service/shell) le pide al daemon transitorio
     * corriendo que se haga a un lado. El transitorio cede; el
     * no-transitorio se rehúsa.
     *
     * El flujo de takeover es: el daemon nuevo manda `yield` → se fija
     * `yieldRequested=true`, se programa un abort tras una gracia corta,
     * y se devuelve ok con `yielding:true`. El daemon nuevo hace poll de
     * la liberación de nuestro lock y emite tengu_daemon_yield_takeover.
     */
    yield: async () => {
      const myOrigin = parsed.origin ?? 'transient'
      if (myOrigin !== 'transient') {
        return ok({ op: 'yield', yielding: false, origin: myOrigin })
      }
      logEventFn('tengu_daemon_yield', {})
      // Período de gracia para que el ack en vuelo realmente se vacíe
      // antes de desmontar el servidor de socket.
      setTimeout(() => state.abort.abort(), 200).unref()
      return ok({ op: 'yield', yielding: true, origin: myOrigin })
    },
    lease: async (msg, socket) => {
      // Mantiene la conexión abierta; el daemon cuenta esto como cliente
      // activo. El socket sigue vivo hasta que el cliente se desconecta
      // (el manejador close del servidor observa la caída).
      // `ant 5170.js` rastrea leaseCount + emite tengu_daemon_lease por ack.
      state.leases.add(socket)
      const onClose = (): void => {
        state.leases.delete(socket)
      }
      socket.once('close', onClose)
      socket.once('error', onClose)
      const client = (msg.client as Record<string, unknown> | undefined) ?? {}
      logEventFn('tengu_daemon_lease', {
        label: typeof client.label === 'string' ? client.label : 'unknown',
        cwd: typeof client.cwd === 'string' ? client.cwd : '',
        client_pid: typeof client.pid === 'number' ? String(client.pid) : '0',
        leases: String(state.leases.size),
      })
      socket.write('') // escritura no-op para confirmar vivacidad
      return undefined
    },
    subscribe: async (msg, socket) => {
      const short = msg.short as string | undefined
      if (!short) return err('EBADREQ', 'subscribe: missing short')
      // Permite re-adjuntarse a workers desatendidos (todo el punto de detach).
      const vm = state.workers.get(short) ?? state.detached.get(short)
      if (!vm) return err('ENOJOB', `no worker for short ${short}`)
      // Manda el snapshot, luego actualizaciones en vivo.
      socket.write(
        JSON.stringify({
          ok: true,
          type: 'snapshot',
          short,
          streamTail: vm.getRingSnapshot().map(b => b.toString('utf8')),
        }) + '\n',
      )
      const remove = vm.addAttacher({
        write(chunk: Buffer | string) {
          const buf =
            typeof chunk === 'string' ? Buffer.from(chunk) : chunk
          return socket.write(
            JSON.stringify({
              ok: true,
              type: 'data',
              short,
              data: buf.toString('utf8'),
            }) + '\n',
          )
        },
        end() {
          socket.end()
        },
      })
      socket.once('close', remove)
      return undefined
    },
  }
  state.server = await startSocketServer(opHandlers)

  // `ant 5165.js` — fallback de despacho por spool de archivos. La CLI
  // escribe envoltorios a ~/.claude/daemon/dispatch/ cuando el socket no
  // es alcanzable; el daemon los ingiere al arrancar + con eventos de
  // fs.watch. Sobrevive a un reinicio del daemon entre la escritura de la
  // CLI y la lectura del daemon.
  const deliverSpooled = async (env: { op: string; d: Record<string, unknown>; nonce?: string }): Promise<void> => {
    const handler = opHandlers[env.op as keyof typeof opHandlers]
    if (typeof handler !== 'function') return
    // Socket no-op — los envoltorios de spool de archivos son de un solo
    // tiro, sin cliente al que responder. Se arma un valor mínimo con
    // forma de net.Socket vía EventEmitter para que la asignación sea
    // estructural (sin cast) y la ruta en tiempo de ejecución de
    // dispara-y-olvida del manejador quede satisfecha.
    const noopSocket: Parameters<typeof handler>[1] =
      makeNoopSocketForSpool()
    await handler({ ...env.d, op: env.op, ...(env.nonce && { nonce: env.nonce }) }, noopSocket)
  }
  await drainSpool(deliverSpooled)
  const spoolWatcher = startSpoolWatcher(deliverSpooled)

  // SIGINT / SIGTERM → apagado ordenado.
  const onSignal = (): void => state.abort.abort()
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)
  // ant 5170 — SIGHUP dispara la recarga de config. ccb no tiene
  // daemon.json hoy, así que se dispara la telemetría + se registra un
  // aviso para que los usuarios puedan enganchar la señal para sus
  // propios fines (y para que el namespace de eventos coincida con ant
  // para cualquier tooling que observe el cable).
  const onSighup = (): void => {
    logEventFn('tengu_daemon_config_reload', { source: 'SIGHUP' })
  }
  process.on('SIGHUP', onSighup)

  await new Promise<void>(resolve => {
    if (state.abort.signal.aborted) {
      resolve()
      return
    }
    state.abort.signal.addEventListener('abort', () => resolve(), {
      once: true,
    })
  })

  process.off('SIGINT', onSignal)
  process.off('SIGTERM', onSignal)
  process.off('SIGHUP', onSighup)
  // Desmonta los temporizadores de watchdog de salida-por-inactividad +
  // upgrade para que no mantengan vivo el event loop tras el abort.
  clearInterval(idleProbeTimer)
  idleExit.dispose()
  upgradeWatchdog.dispose()

  // ant tengu_bg_dispatch_stale_drop: despachos en vuelo que el daemon ya
  // no puede ver a través. Marca las entradas pendientes como fallidas
  // antes de cerrar.
  for (const [short, p] of state.pending.entries()) {
    if (p.acked || p.failed) continue
    p.failed = { code: 'ESHUTDOWN', error: 'daemon shutting down' }
    logEventFn('tengu_bg_dispatch_stale_drop', { short, ms: String(Date.now() - p.startedAt) })
  }

  // Fuerza el settle de los workers, persiste el estado final, cierra el servidor.
  for (const vm of state.workers.values()) {
    vm.forceSettle('killed')
    const r = vm.getRecord()
    try {
      writeWorkerRecord({ ...r, status: 'killed', killedAt: Date.now() } as WorkerRecord)
    } catch {
      // best-effort
    }
  }
  if (parsed.jsonPath) {
    try {
      unlinkSync(parsed.jsonPath)
    } catch {
      // best-effort
    }
  }
  spoolWatcher.close()
  await state.server?.close()
  return 0
}
