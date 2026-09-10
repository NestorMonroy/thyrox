/**
 * Máquina de estados por-worker-bg. Clase `vm` de `ant 4706.js`, portada.
 *
 * Cada WorkerVm envuelve:
 *   - Un proceso hijo generado (`ccb --bg-pty-host <sock> ... -- <inner>`)
 *   - Máquina de estados (spawning → running → upgrading|retiring → retired)
 *   - Adopter (puente del socket PTY)
 *   - Ring buffer de salida reciente (tope 1MB; para el replay de subscribe)
 *   - Conjunto de sockets de cliente actualmente adjuntos
 *   - Temporizador de backoff para respawn-al-crashear
 *   - Contador fastCrashStreak
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/workerVm.ts`.
 */

import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'

import {
  createPtyAdopter,
  logEvent,
} from './internal/pendingCrossPackageDeps.js'
import {
  type WorkerPhase,
  type WorkerRecord,
  FAST_CRASH_LIMIT,
  FAST_CRASH_WINDOW_MS,
  HEARTBEAT_POLL_MS,
  MAX_RESPAWN_ATTEMPTS,
  RESPAWN_BACKOFF_MS,
  STALLED_THRESHOLD_MS,
  isPidAlive,
  readProcStart,
  verifyAdoption,
  writeWorkerRecord,
} from './bgWorkerRegistry.js'
import { type RvClient, type RvServerMessage, createRvClient } from './rvClient.js'

const RING_BUFFER_BYTES = 1024 * 1024

/** Interfaz mínima de sumidero; los suscriptores pueden ser sockets o stubs de test. */
export interface AttacherSink {
  write(chunk: Buffer | string): boolean | undefined
  end?(): void
}

/** Payload de tiempo-de-spawn para el hijo ccb interno. */
export interface WorkerSpawnConfig {
  short: string
  cwd: string
  env: NodeJS.ProcessEnv
  ptySocket: string
  /** Ruta del socket de rendezvous (control) — `<jobDir>/rv.sock`. El
   *  supervisor conecta aquí un cliente rv para recibir
   *  state/done/heartbeat fuera de banda empujados por el REPL interno
   *  (ant 5017.js `rvSockPath`). Vacío/undefined para workers generados
   *  antes de que existiera el canal rv — el VM degrada al modelo de
   *  vivacidad heartbeat-pty-ctrl + poll-de-pid. */
  rvSocket?: string
  /** Binario ccb + args, p. ej. `[bun, /cli.js, --bg-pty-host, <sock>, ...]`. */
  cmd: readonly string[]
  cliVersion: string
  /** Envoltorio de despacho original (preservado para respawn). */
  dispatch?: Record<string, unknown>
}

export type SettleOutcome = 'done' | 'crashed' | 'killed'

/**
 * VM de worker. Una instancia por job bg. Es dueña del ciclo de vida del
 * subproceso.
 */
export class WorkerVm extends EventEmitter {
  readonly short: string
  private record: WorkerRecord
  private readonly config: WorkerSpawnConfig
  private phase: WorkerPhase
  private readonly ring: Buffer[] = []
  private ringBytes = 0
  private readonly attachers: Set<AttacherSink> = new Set()
  private fastCrashStreak = 0
  private attempt = 0
  private backoffTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private settled: SettleOutcome | null = null
  /** Última vez que el worker emitió datos al ring; lo usa el watchdog de estancamiento. */
  private lastActivityAt: number = Date.now()
  private stalledFiredAt: number = 0
  /** Cliente de rendezvous (control) — ant 5017.js `this.rv`. Canal fuera
   *  de banda al REPL interno: recibe state/done/heartbeat, manda
   *  shutdown/repaint/reply. Undefined cuando el worker no tiene socket rv
   *  (spawn legacy) o antes de que corra connectRv(). */
  private rv: RvClient | null = null

  constructor(config: WorkerSpawnConfig, initialRecord?: WorkerRecord) {
    super()
    this.short = config.short
    this.config = config
    this.phase = { kind: 'spawning', attempt: 0 }
    this.record =
      initialRecord ??
      ({
        short: config.short,
        pid: -1,
        cmd: config.cmd,
        cwd: config.cwd,
        startedAt: Date.now(),
        status: 'running',
        mode: 'pty',
        ptySocket: config.ptySocket,
        attempt: 0,
        fastCrashStreak: 0,
      } as WorkerRecord)
  }

  /** Snapshot de la fase actual. */
  getPhase(): WorkerPhase {
    return this.phase
  }

  /** Snapshot del registro actual. */
  getRecord(): WorkerRecord {
    return this.record
  }

  /** True cuando la fase es `running` y el pid está fijado. */
  isRunning(): boolean {
    return this.phase.kind === 'running' && this.record.pid > 0
  }

  /** True cuando la fase es `retiring` con reason='reap'. */
  isKilling(): boolean {
    return this.phase.kind === 'retiring' && this.phase.reason === 'reap'
  }

  /** True cuando la fase es `retiring` con reason='grace'. */
  isRetiring(): boolean {
    return this.phase.kind === 'retiring' && this.phase.reason === 'grace'
  }

  /** True cuando la fase es `retiring` con reason='stop' (desatendido). */
  isDetached(): boolean {
    return this.phase.kind === 'retiring' && this.phase.reason === 'stop'
  }

  /** Empuja bytes de salida al ring buffer. */
  pushOutput(chunk: Buffer): void {
    this.lastActivityAt = Date.now()
    this.stalledFiredAt = 0 // resetea para que el re-stall dispare tengu_bg_worker_stalled fresco
    this.ring.push(chunk)
    this.ringBytes += chunk.length
    while (this.ringBytes > RING_BUFFER_BYTES && this.ring.length > 1) {
      const dropped = this.ring.shift()!
      this.ringBytes -= dropped.length
    }
    for (const a of this.attachers) {
      try {
        a.write(chunk)
      } catch {
        // best-effort; si el socket del attacher ya no está, el
        // manejador de close del lado servidor lo removerá.
      }
    }
    // Emite 'write' para que el orchestrator del clasificador + los
    // listeners de ack de despacho puedan reaccionar a la actividad del
    // ring. EventEmitter acepta nombres de evento string; se reenvía el
    // chunk como payload.
    this.emit('write', chunk)
  }

  /** Snapshot del ring buffer actual para el replay-al-adjuntar. */
  getRingSnapshot(): Buffer[] {
    return [...this.ring]
  }

  /** Añade un attacher; devuelve una función para removerlo. */
  addAttacher(sink: AttacherSink): () => void {
    this.attachers.add(sink)
    return () => {
      this.attachers.delete(sink)
    }
  }

  attacherCount(): number {
    return this.attachers.size
  }

  /**
   * Inicia el spawn. Bifurca el hijo descrito por `config.cmd` con
   * stdio:[ignore, ignore, ignore] (el PTY-host escribe a su propio
   * socket, no a stdout/err). Fija phase=running ante un spawn exitoso.
   */
  spawn(): void {
    this.phase = { kind: 'spawning', attempt: this.attempt }
    const [cmd, ...args] = this.config.cmd
    if (!cmd) {
      logEvent('tengu_bg_pty_unavailable', { short: this.config.short, reason: 'empty_cmd' })
      this.settle('crashed')
      return
    }
    // ant spawn_cwd_gone — el cwd se borró entre la escritura de meta y el respawn.
    if (!existsSync(this.config.cwd)) {
      logEvent('tengu_bg_spawn_cwd_gone', { short: this.config.short, cwd: this.config.cwd })
      this.settle('crashed')
      return
    }
    const child = spawn(cmd, args, {
      cwd: this.config.cwd,
      env: this.config.env,
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
    })
    child.unref()
    if (child.pid === undefined) {
      logEvent('tengu_bg_pty_unavailable', { short: this.config.short, reason: 'spawn_no_pid' })
      this.settle('crashed')
      return
    }
    this.record = {
      ...this.record,
      pid: child.pid,
      startedAt: Date.now(),
      attempt: this.attempt,
      procStart: readProcStart(child.pid) || undefined,
    }
    writeWorkerRecord(this.record)
    this.phase = { kind: 'running' }
    this.startHeartbeatPoll()
    this.startHeartbeatStream()
    this.connectRv()
    logEvent('tengu_bg_worker_spawn', {
      short: this.config.short,
      pid: String(child.pid),
      attempt: String(this.attempt),
    })
    this.emit('spawned', child.pid)
  }

  /** Adopta un registro existente (p. ej. al arrancar el daemon). */
  adopt(record: WorkerRecord): void {
    this.record = record
    this.attempt = record.attempt ?? 0
    this.fastCrashStreak = record.fastCrashStreak ?? 0
    const v = verifyAdoption(record)
    if (v === 'dead' || v === 'recycled') {
      this.settle(v === 'recycled' ? 'crashed' : 'done')
      return
    }
    this.phase = { kind: 'running' }
    this.startHeartbeatPoll()
    this.startHeartbeatStream()
    this.connectRv()
  }

  /**
   * Conecta el cliente de rendezvous (control) al socket rv del worker.
   * `ant 5017.js` `connectRv`. No-op si el worker no tiene socket rv
   * (spawn legacy) o si ya está conectado. El canal rv es una
   * OPTIMIZACIÓN sobre el modelo heartbeat-pty-ctrl + poll-de-pid, nunca
   * la única señal de vivacidad — `naK` se rinde tras 30 conexiones
   * fallidas y el respaldo de poll-de-pid toma el control (ant:
   * "pid-poll es el respaldo de vivacidad").
   *
   * El despacho entrante espeja el onMessage de connectRv de
   * `ant 5017.js`:
   *   heartbeat      → noteHeartbeat() (mismo sumidero que la ruta
   *                    pty-ctrl, así que el watchdog de estancamiento
   *                    trata la vivacidad rv de forma idéntica)
   *   done           → settle(outcome) (terminal autoritativo — ya no se
   *                    adivina desde el código de salida del PTY / la
   *                    heurística de disco)
   *   state          → parcha el registro + persiste (push autoritativo
   *                    de state.json, reemplazando el rol de la
   *                    heurística de poll de disco)
   *   detach-request → transmite el centinela APC de detach a los attachers
   *   repaint-done   → (no-op aquí; el jiggle de repaint del attach es dueño del repaint)
   */
  private connectRv(): void {
    if (this.rv) return
    const sock = this.config.rvSocket
    if (!sock) return
    if (this.phase.kind !== 'running') return
    this.rv = createRvClient(
      sock,
      msg => this.handleRvMessage(msg),
      // onDisconnect — una conexión rv ya establecida se cayó. Re-chequea
      // de inmediato el pid para que un worker que murió se siegue sin
      // esperar el siguiente tick de poll (ant conecta esto a `checkPid`).
      () => {
        if (!this.isRunning()) return
        if (!isPidAlive(this.record.pid)) {
          logEvent('tengu_bg_worker_vanished', {
            short: this.config.short,
            pid: String(this.record.pid),
            via: 'rv-disconnect',
          })
          this.onChildExit(0, undefined)
        }
      },
      // onConnect — el servidor rv del worker nos aceptó. Se trata como
      // prueba de vida (resetea el reloj de estancamiento).
      () => this.noteHeartbeat(),
    )
  }

  /** Despacha una trama rv entrante del worker. `ant 5017.js` onMessage. */
  private handleRvMessage(msg: RvServerMessage): void {
    switch (msg.type) {
      case 'heartbeat':
        this.noteHeartbeat()
        return
      case 'done':
        // Desenlace terminal autoritativo del propio worker.
        this.onRvDone(msg.outcome)
        return
      case 'state':
        // Push de estado autoritativo del worker. El worker YA escribió
        // el FleetJobState canónico en state.json (pushRvState del
        // rvServer persiste antes de mandar), así que el poll de
        // FleetView + `ccb ps` lo ven sin la heurística de disco. Aquí
        // sólo se trata como prueba de vida — el WorkerRecord (meta.json)
        // rastrea el estado del proceso, no el estado del clasificador,
        // así que no hay nada que reflejar en él. ant enruta el parche a
        // su registro en memoria para `list`, pero el `list` de ccb lee
        // el estado del clasificador directo del stateFile.
        this.noteHeartbeat()
        return
      case 'detach-request':
        this.emit('detach-request', msg.msg)
        return
      case 'repaint-done':
        this.emit('repaint-done')
        return
      case 'shutting-down':
        // El worker confirmó nuestro shutdown; saldrá por su cuenta. La
        // ruta poll-de-pid / onChildExit hace el settle del registro.
        return
      default:
        return
    }
  }

  /**
   * El worker empujó un `done` terminal. Mapea el outcome rv de ant al
   * settle() de ccb (que espera 'done'|'crashed'|'killed'). Sólo actúa si
   * el VM no había hecho settle ya vía la ruta poll-de-pid / exit
   * (gana quien observe primero el estado terminal; settle() tiene guarda
   * de idempotencia).
   */
  private onRvDone(outcome: 'done' | 'crashed' | 'killed'): void {
    if (this.settled) return
    if (this.phase.kind === 'retired') return
    logEvent('tengu_bg_rv_done', { short: this.config.short, outcome })
    this.settle(outcome)
  }

  /**
   * Manda una trama de control al worker por el canal rv. Devuelve false
   * si el cliente rv no está conectado (el llamador cae a pty-ctrl / SIG).
   * `ant 5017.js` `this.rv?.send(...)`.
   */
  sendShutdown(): boolean {
    return this.rv?.send({ type: 'shutdown' }) ?? false
  }
  sendRepaint(): boolean {
    return this.rv?.send({ type: 'repaint' }) ?? false
  }
  sendReply(text: string): boolean {
    return this.rv?.send({ type: 'reply', text }) ?? false
  }
  sendAttacherCaps(caps: unknown): boolean {
    return this.rv?.send({ type: 'attacher-caps', caps }) ?? false
  }

  /**
   * Poll periódico: detecta cuándo el worker muere sin que nos demos
   * cuenta (sin SIGCHLD porque somos otro árbol de procesos tras el
   * unref). También implementa el umbral de "estancado >120s".
   */
  private startHeartbeatPoll(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.lastActivityAt = Date.now()
    this.heartbeatTimer = setInterval(() => {
      if (!this.isRunning()) return
      if (!isPidAlive(this.record.pid)) {
        logEvent('tengu_bg_worker_vanished', { short: this.config.short, pid: String(this.record.pid) })
        this.onChildExit(0, undefined)
        return
      }
      // Watchdog de estancamiento de `ant 4706.js`: el pid está vivo pero
      // sin actividad de ring por >120s → registrar una vez. No
      // auto-respawnea (ant lo trata como "el worker puede estar
      // legítimamente inactivo esperando input"; el usuario puede
      // ccb stop + spawn fresco si hace falta).
      const silentMs = Date.now() - this.lastActivityAt
      if (silentMs > STALLED_THRESHOLD_MS && this.stalledFiredAt === 0) {
        this.stalledFiredAt = Date.now()
        logEvent('tengu_bg_worker_stalled', {
          short: this.config.short,
          pid: String(this.record.pid),
          silent_ms: String(silentMs),
          attachers: String(this.attachers.size),
        })
      }
    }, HEARTBEAT_POLL_MS)
    this.heartbeatTimer.unref()
  }

  /**
   * Marca la llegada de una trama de control heartbeat del ptyHost.
   * Actualiza lastActivityAt + resetea stalledFiredAt para que el
   * watchdog de estancamiento (STALLED_THRESHOLD_MS) trate al worker
   * como vivo sin importar la actividad de escritura del ring. Se conecta
   * vía el broadcast del ptyHost cada 5s — ver adoptHeartbeatStream() abajo.
   */
  noteHeartbeat(): void {
    this.lastActivityAt = Date.now()
    this.stalledFiredAt = 0
  }

  /**
   * Abre un ptyAdopter del lado del daemon contra el propio socket PTY de
   * este worker + se suscribe a las tramas de control heartbeat. Lo llama
   * adopt() y post-spawn para que el daemon escuche en el PTY del worker
   * señales de vivacidad separadas del ring buffer.
   */
  private heartbeatAdopterDispose: (() => void) | null = null
  private startHeartbeatStream(): void {
    if (this.heartbeatAdopterDispose) return
    if (!this.config.ptySocket) return
    void (async () => {
      try {
        const adopter = createPtyAdopter(this.config.ptySocket)
        const sub = adopter.onHeartbeat(() => this.noteHeartbeat())
        // También marca las escrituras de datos PTY — también son prueba de vida.
        const dataSub = adopter.onData(() => this.noteHeartbeat())
        this.heartbeatAdopterDispose = () => {
          sub.dispose()
          dataSub.dispose()
          adopter.dispose()
        }
      } catch {
        // best-effort — si el socket PTY todavía no es bindeable, el poll
        // periódico de pidAlive igual atrapa estancamientos por la vía de
        // respaldo.
      }
    })()
  }
  private stopHeartbeatStream(): void {
    if (this.heartbeatAdopterDispose) {
      this.heartbeatAdopterDispose()
      this.heartbeatAdopterDispose = null
    }
  }

  /**
   * Se llama cuando el proceso hijo sale. Corre la detección de
   * fast-crash y o bien programa un respawn o hace settle del worker.
   */
  onChildExit(exitCode: number, signal?: NodeJS.Signals): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    const uptime = Date.now() - this.record.startedAt
    logEvent('tengu_bg_worker_exit', {
      short: this.config.short,
      pid: String(this.record.pid),
      exit_code: String(exitCode),
      signal: signal ?? '',
      uptime_ms: String(uptime),
    })
    if (this.isKilling()) {
      this.settle('killed')
      return
    }
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      // Apagado ordenado o forzado; no es un crash.
      this.settle(exitCode === 0 ? 'done' : 'killed')
      return
    }
    if (exitCode === 0) {
      this.settle('done')
      return
    }
    // Salida distinta de cero. Chequeo de fast-crash.
    if (uptime < FAST_CRASH_WINDOW_MS) {
      this.fastCrashStreak++
      if (this.fastCrashStreak >= FAST_CRASH_LIMIT) {
        logEvent('tengu_bg_respawn_exhausted', { short: this.config.short, reason: 'fast_crash', streak: String(this.fastCrashStreak) })
        this.settle('crashed')
        return
      }
    } else {
      this.fastCrashStreak = 0
    }
    if (this.attempt >= MAX_RESPAWN_ATTEMPTS) {
      logEvent('tengu_bg_respawn_exhausted', { short: this.config.short, reason: 'max_attempts', attempts: String(this.attempt) })
      this.settle('crashed')
      return
    }
    // Programa el respawn con backoff.
    this.attempt++
    this.phase = { kind: 'spawning', attempt: this.attempt }
    if (this.backoffTimer) clearTimeout(this.backoffTimer)
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null
      this.spawn()
    }, RESPAWN_BACKOFF_MS)
    this.backoffTimer.unref()
    this.emit('respawn-scheduled', this.attempt)
  }

  /**
   * Inicia el kill. `reason='grace'` espera a que el worker salga
   * naturalmente; `reason='reap'` hace SIGKILL de inmediato;
   * `reason='stop'` desatiende sin señalizar (se usa cuando el cliente
   * quiere dejar al worker corriendo pero el daemon debe olvidarse de él).
   */
  kill(reason: 'grace' | 'reap' | 'stop'): void {
    if (this.phase.kind === 'retired') {
      logEvent('tengu_bg_phase_illegal', { short: this.config.short, op: 'kill', current: 'retired', requested: reason })
      return
    }
    this.phase = { kind: 'retiring', reason }
    logEvent('tengu_bg_retired', { short: this.config.short, reason })
    if (reason === 'stop') {
      // Sólo se desatiende; se deja al worker corriendo (se re-adoptará
      // la próxima vez que el daemon arranque).
      return
    }
    const sig: NodeJS.Signals = reason === 'reap' ? 'SIGKILL' : 'SIGTERM'
    try {
      process.kill(-this.record.pid, sig)
    } catch {
      try {
        process.kill(this.record.pid, sig)
      } catch {
        // Ya se había ido.
      }
    }
    if (reason === 'grace') {
      // Escala a SIGKILL tras 5s si SIGTERM no surtió efecto.
      setTimeout(() => {
        if (this.phase.kind === 'retiring' && this.phase.reason === 'grace') {
          logEvent('tengu_bg_dispatch_sigkill_escalate', {
            short: this.config.short,
            pid: String(this.record.pid),
          })
          try {
            process.kill(-this.record.pid, 'SIGKILL')
          } catch {
            try {
              process.kill(this.record.pid, 'SIGKILL')
            } catch {
              // best-effort
            }
          }
        }
      }, 5000).unref()
    }
  }

  /**
   * Marca al worker como terminal. El llamador es responsable de remover
   * este WorkerVm del `Map<short, WorkerVm>` del registro.
   */
  private settle(outcome: SettleOutcome): void {
    if (this.settled) {
      logEvent('tengu_bg_phase_illegal', { short: this.config.short, op: 'settle', current: this.settled, requested: outcome })
      return
    }
    this.settled = outcome
    this.phase = { kind: 'retired', outcome }
    this.stopHeartbeatStream()
    if (this.rv) {
      this.rv.close()
      this.rv = null
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer)
      this.backoffTimer = null
    }
    const finalStatus =
      outcome === 'done'
        ? 'exited'
        : outcome === 'crashed'
          ? 'failed'
          : 'killed'
    // ant 5166.js UB8 / 4706.js — el outcome `crashed` significa que se
    // agotó el presupuesto de respawn (racha de fast-crash o tope de
    // max-attempts). Se lleva la razón para que `ccb ps` pueda explicarlo.
    const failedReason: string | undefined =
      outcome === 'crashed'
        ? this.fastCrashStreak >= FAST_CRASH_LIMIT
          ? `crash loop (${this.fastCrashStreak} fast crashes)`
          : `respawn budget exhausted (${this.attempt} attempts)`
        : undefined
    this.record = {
      ...this.record,
      status: finalStatus as WorkerRecord['status'],
      ...(failedReason ? { failedReason } : {}),
      exitedAt: Date.now(),
    }
    try {
      writeWorkerRecord(this.record)
    } catch {
      // best-effort
    }
    for (const a of this.attachers) {
      try {
        a.end?.()
      } catch {
        // best-effort
      }
    }
    this.attachers.clear()
    logEvent('tengu_bg_settle', { short: this.config.short, outcome, attempts: String(this.attempt) })
    this.emit('settled', outcome)
  }

  /**
   * Fuerza el settle externamente (lo usa el apagado del daemon — mata a
   * todos los workers + persiste antes de que el daemon salga).
   */
  forceSettle(outcome: SettleOutcome = 'killed'): void {
    this.settle(outcome)
  }
}
