/**
 * PTY socket CLIENT — daemon/supervisor side.
 *
 * Scoped port of chunk-ygx717jg.js `ae` (the worker-side counterpart to
 * `Be`/`rvClient.ts`): the daemon's WorkerVm would open one of these
 * against each worker's PTY socket (`<jobDir>/pty.sock`) to relay
 * output/liveness independently of the rv control channel. NOT wired
 * into `workerVm.ts` or `internal/pendingCrossPackageDeps.ts` by this
 * port — both are outside this task's file list, so `createPtyAdopter`
 * there still throws until a later task threads this module through.
 *
 * What's ported from `ae`, faithfully:
 *   - Reconnect with backoff `Ie` (`PTY_RECONNECT_BACKOFF_MS`), capped at
 *     `Oe`=30 attempts (`PTY_MAX_RECONNECT_ATTEMPTS`).
 *   - Liveness-gated giving-up: before each scheduled retry, and before
 *     escalating on exhaustion, the worker pid is checked
 *     (`options.isWorkerAlive`, default a real `process.kill(pid, 0)`
 *     probe duplicated locally — see its own docstring for why it's not
 *     imported from `bgWorkerRegistry.ts`). Dead pid → declare exit
 *     immediately, no more retries (ant `_e()`'s `catch{...me("connect")}`
 *     branch).
 *   - Hang escalation: attempts exhausted while the pid is STILL alive →
 *     `options.killWorkerGroup` (default `process.kill(-pid,'SIGKILL')`,
 *     falling back to the bare pid) — ant `_e()`'s `P>=Oe` branch.
 *   - `xe` (`extractFirstNonEmptyLine`) and `SIGNAL_EXIT_CODES` (`St`),
 *     used to summarise/classify an exit; see `WorkerExitInfo`.
 *   - `lt` (`suffixMatchLen`) gates the SAME detach-APC-sentinel
 *     (`c3` = `\x1b_cc-daemon-detach\x1b\\`, chunk-mxz6ht5b.js) out of
 *     relayed data — but ONLY before the host's `live` control frame
 *     arrives (ant `rt`'s `fe` flag: once live, data passes straight
 *     through, unbuffered — the reference does the same, trusting a
 *     live-stream sentinel to be caught by whoever is actually attached
 *     via the PTY socket directly, not through this relay).
 *
 * Declared divergences (each a `// pendiente:` at its site too):
 *   - `onData` emits `Buffer`, never a decoded string. Ant's `ae` emits
 *     strings via a persistent `StringDecoder`; `ptyAdopter.ts` in this
 *     same tree already documents why that round-trip corrupts multi-byte
 *     (CJK) input and switched to `Buffer` — this module follows that
 *     already-established, already-tested divergence rather than
 *     reintroducing the bug in a second file.
 *   - Crash-breadcrumb FILE reads (ant's `yw`/`nx`/`cl`/`oe` — pre-connect
 *     and pre-hello stderr tail, written to `${jobDir}/…`) are NOT ported:
 *     they depend on the job-directory layout owned by
 *     `bgWorkerRegistry.ts`, outside this task's file list. `xe`
 *     (`extractFirstNonEmptyLine`) is ported as a pure function so a
 *     future caller that DOES own that layout can summarise whatever text
 *     it reads without re-deriving the algorithm; this module never calls
 *     it itself, so `WorkerExitInfo.hostStderrSummary` stays `undefined`
 *     always — see the field's own `// pendiente:`.
 *   - No auth/ping-pong handshake (`o`/`u`/`t==="ping"`/`"auth-required"`
 *     in `ae`): this tree's `ptyHost.ts` wire protocol has no auth layer
 *     today (`internal/ptyFrame.ts`'s `CtrlFrame` has no `auth`/`ping`
 *     variant either) — nothing to port against.
 *   - The `se` "swallow data until the next `live`" flag, set when a
 *     SECOND `hello` arrives on an already-adopted client (ant: worker
 *     respawned mid-session, discard the stale tail of the old stream) is
 *     not ported: it exists to support WorkerVm's resume orchestration,
 *     which lives in `workerVm.ts`/`main.ts`, both excluded here.
 *   - `hostProc`-vs-socket exit race (ant's `p.exited` promise raced
 *     against the socket's own exit frame) is not ported: it needs the
 *     `Bun.Subprocess` handle, owned by whoever spawns the worker
 *     (`workerVm.ts`, excluded here).
 *
 * @dynamicRequire
 */

import { Socket } from 'node:net'

import { logEvent } from '@thyrox/local-observability'

import {
  CTRL_TAG,
  DATA_TAG,
  FRAME_HEADER_BYTES,
  FRAME_SIZE_CAP,
  type CtrlFrame,
  type DecodedFrame,
  encodeCtrlFrame,
  encodeDataFrame,
} from './internal/ptyFrame.js'

/** chunk-ygx717jg.js `Ie` — the PTY client's own table (distinct from `Me`,
 *  the rv/control client's — see `rvClient.ts`). */
export const PTY_RECONNECT_BACKOFF_MS = [50, 100, 250, 500, 1000, 2000] as const
/** chunk-ygx717jg.js `Oe`. */
export const PTY_MAX_RECONNECT_ATTEMPTS = 30
/** chunk-ygx717jg.js `St` — 128+SIGHUP and 128+SIGTERM: a RAW exit code
 *  that, alone (no explicit `signal` field), already means "a supervisor
 *  sent a signal", not a crash. Referenced by ant `g7#onExit` (WorkerVm)
 *  as `St.has(e??-1)`; that consumer lives in `workerVm.ts`/`main.ts`,
 *  excluded from this task, so it isn't wired up yet — the constant and
 *  the classification it drives (`WorkerExitInfo.killedBySignal`) are
 *  ported so a later task can consume them without re-deriving the Set. */
export const SIGNAL_EXIT_CODES: ReadonlySet<number> = new Set([129, 143])

/** chunk-mxz6ht5b.js `c3` — same detach-request sentinel `attachClient.ts`
 *  scans for on the client side of a live PTY session. */
const DETACH_APC_SENTINEL = Buffer.from('\x1b_cc-daemon-detach\x1b\\')

/**
 * chunk-ygx717jg.js `xe` — first non-empty, trimmed line of up to 2000
 * characters. Ant uses it to reduce a stderr dump to a one-line crash
 * summary; ported here as a pure function (no file I/O — see the module
 * docstring's declared divergence on crash-breadcrumb reads).
 */
export function extractFirstNonEmptyLine(text: string): string | undefined {
  return text
    .slice(0, 2000)
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.length > 0)
}

/**
 * chunk-ygx717jg.js `lt` — length of the longest suffix of `buf` that is
 * also a prefix of `needle`, used to hold back a sentinel match that
 * straddles a chunk boundary. Byte-for-byte the same algorithm as
 * `attachClient.ts`'s local copy (duplicated, not imported — the two
 * modules live in different packages, `@thyrox/daemon` and `@thyrox/cli`,
 * the same boundary `internal/ptyFrame.ts` already duplicates).
 */
export function suffixMatchLen(buf: Buffer, needle: Buffer): number {
  const max = Math.min(buf.length, needle.length - 1)
  outer: for (let k = max; k > 0; k--) {
    const start = buf.length - k
    for (let i = 0; i < k; i++) {
      if (buf[start + i] !== needle[i]) continue outer
    }
    return k
  }
  return 0
}

export interface WorkerExitInfo {
  exitCode: number
  signal?: string
  /** `SIGNAL_EXIT_CODES.has(exitCode) || signal !== undefined`. */
  killedBySignal: boolean
  /** pendiente: este módulo nunca la rellena — depende de leer el archivo
   *  de breadcrumb de crash (ant `yw`/`nx`/`cl`/`oe`), cuya ruta pertenece
   *  al layout de `bgWorkerRegistry.ts` (fuera de esta tarea). Existe el
   *  campo, y `extractFirstNonEmptyLine` (`xe`) para producirla, para que
   *  quien porte ese layout sólo tenga que llamarlo. */
  hostStderrSummary?: string
}

export interface WorkerSocketClientOptions {
  /** pid whose liveness gates giving up (ant `r`). */
  workerPid: number
  /** Defaults to a real `process.kill(pid, 0)` probe. Injected — not
   *  imported from `bgWorkerRegistry.ts`'s `isPidAlive` — so this module
   *  stays independent of that file's ownership and so tests never need
   *  a real process to fake liveness. */
  isWorkerAlive?: (pid: number) => boolean
  /** Escalates to SIGKILL once retries are exhausted and the pid is
   *  still alive (ant `_e()`'s `P>=Oe` branch). Default:
   *  `process.kill(-pid, 'SIGKILL')`, falling back to the bare pid. */
  killWorkerGroup?: (pid: number) => void
  onData: (chunk: Buffer) => void
  onExit: (info: WorkerExitInfo) => void
  onHeartbeat?: (info: { ts: number; state?: string }) => void
  onHello?: (info: { replPid: number; version: string }) => void
  /** Test-only override of `PTY_RECONNECT_BACKOFF_MS` — production callers
   *  never set this; it exists so a test can exercise attempt-exhaustion
   *  without waiting out the real ~52s the full 30-attempt table sums to. */
  reconnectBackoffMs?: readonly number[]
  /** Test-only override of `PTY_MAX_RECONNECT_ATTEMPTS` — see above. */
  maxReconnectAttempts?: number
}

export interface WorkerSocketClient {
  replPid(): number
  replVersion(): string
  write(payload: Buffer): void
  resize(cols: number, rows: number): void
  kill(sig: 'SIGTERM' | 'SIGKILL'): void
  dispose(): void
}

/** Duplicate of `pendingCrossPackageDeps.ts::isPidAlive` — see the
 *  `isWorkerAlive` option's own docstring for why this isn't imported
 *  from there instead. Verbatim to that file's own citation:
 *  `ccnmt: packages/shell/src/genericProcessUtils.ts:46-54`. */
function defaultIsWorkerAlive(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function defaultKillWorkerGroup(pid: number): void {
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // best-effort — the process is already gone.
    }
  }
}

/**
 * Minimal frame decoder, local to this module: `internal/ptyFrame.ts` is
 * a pure codec (encode only, on purpose — see its own docstring) and
 * isn't ours to extend with a decoder. Same wire shape as
 * `@thyrox/cli: bg/ptyFrame.ts::createFrameDecoder`, ported independently
 * because the two packages don't share a dependency edge (same reason
 * `internal/ptyFrame.ts` itself is a duplicate, not an import).
 */
function createDaemonFrameDecoder(
  onFrame: (f: DecodedFrame) => void,
  onError: (msg: string) => void,
): (chunk: Buffer) => void {
  let pending = Buffer.alloc(0)
  let stopped = false
  return (chunk: Buffer) => {
    if (stopped) return
    pending = pending.length === 0 ? Buffer.from(chunk) : Buffer.concat([pending, chunk])
    while (pending.length >= FRAME_HEADER_BYTES) {
      const len = pending.readUInt32BE(0)
      if (len > FRAME_SIZE_CAP) {
        stopped = true
        onError(`frame too large (${len} > ${FRAME_SIZE_CAP})`)
        return
      }
      const total = FRAME_HEADER_BYTES + len
      if (pending.length < total) return
      const tag = pending.readUInt8(4)
      const body = pending.subarray(FRAME_HEADER_BYTES, total)
      pending = pending.subarray(total)
      if (tag === DATA_TAG) {
        onFrame({ kind: DATA_TAG, payload: Buffer.from(body) })
      } else if (tag === CTRL_TAG) {
        try {
          const ctrl = JSON.parse(body.toString('utf8')) as CtrlFrame
          onFrame({ kind: CTRL_TAG, ctrl })
        } catch {
          stopped = true
          onError('bad ctrl frame json')
          return
        }
      } else {
        stopped = true
        onError(`unknown frame tag ${tag}`)
        return
      }
    }
  }
}

/**
 * Open a daemon-side PTY client against `socketPath`.
 */
export function createWorkerSocketClient(
  socketPath: string,
  options: WorkerSocketClientOptions,
): WorkerSocketClient {
  const isWorkerAlive = options.isWorkerAlive ?? defaultIsWorkerAlive
  const killWorkerGroup = options.killWorkerGroup ?? defaultKillWorkerGroup
  const backoffMs = options.reconnectBackoffMs ?? PTY_RECONNECT_BACKOFF_MS
  const maxAttempts = options.maxReconnectAttempts ?? PTY_MAX_RECONNECT_ATTEMPTS

  let socket: Socket | undefined
  let disposed = false
  let settled = false
  let attempt = 0
  let reconnectTimer: NodeJS.Timeout | undefined
  let helloPid = 0
  let helloVersion = ''
  let live = false
  let pendingData = Buffer.alloc(0)

  function declareExit(info: WorkerExitInfo): void {
    if (settled) return
    settled = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
    socket?.destroy()
    socket = undefined
    options.onExit(info)
  }

  function handleData(payload: Buffer): void {
    if (live) {
      // ant `rt`: once `fe` (live) is set, data passes straight through —
      // no sentinel buffering on the hot path.
      options.onData(payload)
      return
    }
    const combined = pendingData.length > 0 ? Buffer.concat([pendingData, payload]) : payload
    const stripped = stripSentinelOccurrences(combined, DETACH_APC_SENTINEL)
    const keep = suffixMatchLen(stripped, DETACH_APC_SENTINEL)
    pendingData = keep > 0 ? Buffer.from(stripped.subarray(stripped.length - keep)) : Buffer.alloc(0)
    const emit = keep > 0 ? stripped.subarray(0, stripped.length - keep) : stripped
    if (emit.length > 0) options.onData(Buffer.from(emit))
  }

  function handleCtrl(ctrl: CtrlFrame): void {
    if (ctrl.t === 'hello') {
      helloPid = ctrl.replPid
      helloVersion = ctrl.version
      attempt = 0
      options.onHello?.({ replPid: ctrl.replPid, version: ctrl.version })
    } else if (ctrl.t === 'live') {
      live = true
      if (pendingData.length > 0) {
        options.onData(pendingData)
        pendingData = Buffer.alloc(0)
      }
    } else if (ctrl.t === 'exit') {
      declareExit({
        exitCode: ctrl.code,
        signal: ctrl.signal,
        killedBySignal: ctrl.signal !== undefined || SIGNAL_EXIT_CODES.has(ctrl.code),
      })
    } else if (ctrl.t === 'heartbeat') {
      options.onHeartbeat?.({ ts: ctrl.ts, state: ctrl.state })
    }
  }

  function scheduleReconnect(): void {
    if (disposed || settled || reconnectTimer) return
    // ant `_e()`: the pid check comes BEFORE the attempt-exhaustion check —
    // a worker that's already gone doesn't wait out the rest of the table.
    if (!isWorkerAlive(options.workerPid)) {
      declareExit({ exitCode: -1, killedBySignal: false })
      return
    }
    if (attempt >= maxAttempts) {
      logEvent('tengu_bg_ptyhost_hang_sigkill', { pid: String(options.workerPid) })
      killWorkerGroup(options.workerPid)
      declareExit({ exitCode: -1, signal: 'SIGKILL', killedBySignal: true })
      return
    }
    const delay = backoffMs[Math.min(attempt, backoffMs.length - 1)]!
    attempt++
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      tryConnect()
    }, delay)
    reconnectTimer.unref()
  }

  function tryConnect(): void {
    if (disposed || settled) return
    // Two-step `new Socket()` + `.connect()`, not the one-shot `connect()`
    // factory — matches `rvClient.ts`/`ptyAdopter.ts`'s already-proven-safe
    // pattern of attaching `'error'` before the connect attempt can settle.
    const sock = new Socket()
    sock.on('error', () => scheduleReconnect())
    sock.once('close', () => {
      if (socket === sock) socket = undefined
      if (disposed || settled) return
      scheduleReconnect()
    })
    sock.once('connect', () => {
      if (disposed || settled) return
      socket = sock
      const decoder = createDaemonFrameDecoder(
        f => {
          if (f.kind === DATA_TAG) handleData(f.payload)
          else handleCtrl(f.ctrl)
        },
        msg => {
          logEvent('tengu_bg_ptyhost_frame_error', { error: msg.slice(0, 80) })
          sock.destroy()
        },
      )
      sock.on('data', decoder)
    })
    sock.connect(socketPath)
  }

  tryConnect()

  return {
    replPid: () => helloPid,
    replVersion: () => helloVersion,
    write(payload: Buffer): void {
      if (settled || disposed) return
      const chunkSize = FRAME_SIZE_CAP - 1
      for (let i = 0; i < payload.length; i += chunkSize) {
        socket?.write(encodeDataFrame(payload.subarray(i, i + chunkSize)))
      }
    },
    resize(cols: number, rows: number): void {
      if (settled || disposed) return
      socket?.write(encodeCtrlFrame({ t: 'resize', cols, rows }))
    },
    kill(sig: 'SIGTERM' | 'SIGKILL'): void {
      if (settled || disposed) return
      socket?.write(encodeCtrlFrame({ t: 'kill', sig }))
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }
      socket?.destroy()
      socket = undefined
    },
  }
}

/** Replaces every full occurrence of `sentinel` in `buf` with nothing —
 *  Buffer analogue of ant's `.replaceAll(c3, "")` (which operates on the
 *  decoded string; this module works in bytes, see the module docstring's
 *  declared `Buffer`-vs-string divergence). */
function stripSentinelOccurrences(buf: Buffer, sentinel: Buffer): Buffer {
  const parts: Buffer[] = []
  let start = 0
  let idx: number
  while ((idx = buf.indexOf(sentinel, start)) >= 0) {
    parts.push(buf.subarray(start, idx))
    start = idx + sentinel.length
  }
  parts.push(buf.subarray(start))
  return parts.length === 1 ? buf : Buffer.concat(parts)
}
