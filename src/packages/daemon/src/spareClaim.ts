/**
 * Protocolo de claim del spare pool — puerto de `chunk-ygx717jg.js`
 * (ant 4644.js) `xt`, `Bt`, `Ft`, `Ut`, `P9n` y `O9n`.
 *
 * `sparePool.ts` reserva el slot (quién puede reclamar qué); este archivo
 * es el CABLE: arma la trama de claim, la envía con reintento y
 * presupuesto, y limpia el socket del repuesto cuando el envío falla del
 * todo. `bgDaemon.ts` es el único llamador (bloque de claim en `dispatch`
 * + scheduler de prewarm).
 *
 * Divergencia estructural declarada: la referencia usa DOS sockets por
 * repuesto — un `ptySock` (E/S normal) y un `claimSock` efímero, sólo
 * vivo mientras el repuesto espera claim, con su propio receptor
 * autenticado (`Kjt`/`AVo`, ver abajo). `@thyrox/daemon` no tiene ese
 * segundo socket: reutiliza el `ptySock` del repuesto (ya bindeado por
 * `spawnPtyHost`) para todo, incluida la trama de claim. El protocolo de
 * cable de `Ft`/`Ut` (JSON + salto de línea sobre el `claimSock`) se porta
 * aquí ADAPTADO al framing binario que `@thyrox/daemon` ya usa en el
 * `ptySock` (`internal/ptyFrame.ts::encodeCtrlFrame`), no verbatim.
 *
 * Pendiente, declarado y no silenciado:
 *  - `AVo` (entrypoint del proceso hijo `--bg-spare` que escucha el
 *    `claimSock` autenticado) no existe: no hay hoy un modo `--bg-spare`
 *    real en `@thyrox/daemon`/`@thyrox/cli`, así que no hay receptor que
 *    verifique `auth`. La trama SÍ lleva `auth` (ver `buildSpareClaimFrame`)
 *    pero nada del lado del repuesto la comprueba todavía.
 *  - `Kjt`/`Yjt` (recepción autenticada del claim + bootstrap post-claim
 *    del REPL) — mismo motivo, ausentes.
 *  - `I9n` (refill con jerarquía `bg-pty-host` → `--bg-spare`, detección
 *    OOM/cgroup vs fork-and-exit del lanzador, `discardSpentCredentialFile`)
 *    — `bgDaemon.ts` spawnea el repuesto directo vía `spawnPtyHost`, sin
 *    esa jerarquía ni esa clasificación de fallo; sólo se porta aquí la
 *    mitad de `I9n` que es de este archivo: el hueco mínimo de refill tras
 *    un exit (`SPARE_REFILL_MIN_GAP_MS`, en `sparePool.ts`) y la vigilancia
 *    de orfandad por ppid (`startPpidWatchdog`, lista para cuando exista
 *    un entrypoint `--bg-spare` real que la invoque).
 */

import { readdir, unlink } from 'node:fs/promises'
import { connect, type Socket } from 'node:net'
import { platform as osPlatform } from 'node:os'
import { join } from 'node:path'

import { logEvent } from '@thyrox/local-observability'

import { encodeCtrlFrame, type CtrlFrame } from './internal/ptyFrame.js'

/** ant 4644.js `xt` — nombre de la env var del secreto de claim (era `CLAUDE_BG_CLAIM_AUTH`). */
export const SPARE_CLAIM_AUTH_ENV = 'THYROX_BG_CLAIM_AUTH'

/**
 * ant 4644.js `xt` — resuelve el `claimAuth` del proceso `--bg-spare`
 * desde el entorno y lo BORRA tras leerlo, para que no quede visible a
 * subprocesos ni en `/proc/<pid>/environ`.
 *
 * Pendiente: la referencia también acepta `CLAUDE_BG_SOCKET_TOKENS_PATH`
 * (un archivo de tokens rotable, leído vía `hYe`, con aviso
 * `level:"warn"` si es ilegible) cuando la env var directa está ausente.
 * Ese archivo de tokens no tiene hoy equivalente en `@thyrox/*`; se omite
 * y sólo se porta la vía directa de la env var.
 */
export function resolveClaimAuth(): string | undefined {
  const auth = process.env[SPARE_CLAIM_AUTH_ENV]
  delete process.env[SPARE_CLAIM_AUTH_ENV]
  return auth
}

/** ant 4644.js `it` — tabla de backoff (ms) entre reintentos de envío de la trama de claim. */
export const SPARE_CLAIM_RETRY_BACKOFF_MS = [50, 100, 150, 200, 250, 300, 400, 500, 500, 500]

/** ant 4644.js `Ut` — presupuesto total (ms) para el envío de la trama de claim. */
export const SPARE_CLAIM_SEND_BUDGET_MS = 5000

/**
 * Forma de la trama de claim que este puerto envía. El tipo `CtrlFrame`
 * declarado en `internal/ptyFrame.ts` (archivo fuera de este porte, ver
 * `Item`) no incluye `env`/`argv`/`auth` en su variante `claim` — sólo
 * `intent`/`cwd`/`sessionId`. `encodeCtrlFrame` únicamente serializa JSON,
 * así que los campos de más viajan igual por el cable; el cast a
 * `CtrlFrame` en `sendSpareFrameOnce` declara esa divergencia de tipo en
 * vez de esconderla. Pendiente: ampliar `CtrlFrame` cuando `ptyFrame.ts`
 * entre en el alcance de otra tarea.
 */
export interface SpareClaimFrame {
  t: 'claim'
  cwd?: string
  sessionId?: string
  env?: NodeJS.ProcessEnv
  argv?: string[]
  auth?: string
}

/**
 * ant 4644.js `Bt` — arma el payload de la trama de claim. La referencia
 * rearma `env`/`argv` vía `g7.buildClaimFrame`, un helper de spawn del
 * worker (`@claude-code-how-works/cli/bg/*`) sin equivalente hoy en
 * `@thyrox/*`; aquí se reenvían tal cual el `env` y el `argv` que el
 * llamador ya tiene (los mismos con que se habría lanzado un worker
 * fresco), en vez de reconstruirlos desde cero.
 */
export function buildSpareClaimFrame(args: {
  cwd?: string
  sessionId?: string
  env?: NodeJS.ProcessEnv
  argv?: string[]
  auth?: string
}): SpareClaimFrame {
  return {
    t: 'claim',
    cwd: args.cwd,
    sessionId: args.sessionId,
    env: args.env,
    argv: args.argv,
    auth: args.auth,
  }
}

/**
 * ant 4644.js `Ft` — conecta una vez al socket del repuesto, escribe la
 * trama codificada y cierra. Resuelve cuando el `end()` termina de
 * volcar el buffer; rechaza en `error`. Sin catch propio, igual que la
 * referencia: el clasificador de fallo vive en el llamador (`P9n`).
 */
export function sendSpareFrameOnce(ptySocket: string, frame: SpareClaimFrame): Promise<void> {
  return new Promise((resolve, reject) => {
    const sock: Socket = connect(ptySocket)
    sock.once('error', reject)
    sock.once('connect', () => {
      sock.end(encodeCtrlFrame(frame as unknown as CtrlFrame), () => resolve())
    })
  })
}

/**
 * ant 4644.js `Ut` — reintenta el envío de la trama de claim ante
 * `ENOENT`/`ECONNREFUSED` (el repuesto puede seguir bindeando su socket)
 * con la tabla de backoff `SPARE_CLAIM_RETRY_BACKOFF_MS`, hasta agotar
 * `budgetMs` o la tabla; cualquier otro error se relanza de inmediato sin
 * esperar.
 */
export async function sendSpareFrameWithRetry(
  ptySocket: string,
  frame: SpareClaimFrame,
  budgetMs: number = SPARE_CLAIM_SEND_BUDGET_MS,
): Promise<void> {
  const startedAt = Date.now()
  for (let attempt = 0; ; attempt++) {
    if (Date.now() - startedAt > budgetMs) throw new Error('send-claim timeout')
    try {
      await sendSpareFrameOnce(ptySocket, frame)
      return
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      const retryable = code === 'ENOENT' || code === 'ECONNREFUSED'
      if (!retryable || attempt >= SPARE_CLAIM_RETRY_BACKOFF_MS.length) throw e
      await sleep(SPARE_CLAIM_RETRY_BACKOFF_MS[attempt] ?? 500)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mitad de limpieza de `P9n`: tras un fallo de envío de claim, manda
 * SIGTERM al socket pty del repuesto para no dejarlo huérfano corriendo
 * en vacío. Fire-and-forget — un error de conexión aquí ya no cambia el
 * desenlace del dispatch (que cayó a spawn fresco), así que se descarta
 * en silencio, igual que la referencia (`g.on('error',()=>{})`).
 */
export function terminateSpareSocket(ptySocket: string): void {
  const sock: Socket = connect(ptySocket)
  sock.on('error', () => {})
  sock.once('connect', () => {
    sock.write(encodeCtrlFrame({ t: 'kill', sig: 'SIGTERM' }))
    sock.end()
  })
}

export type SpareClaimFailReason = 'enoent' | 'econnrefused' | 'error' | 'unknown'

function classifySpareClaimFailure(e: unknown): SpareClaimFailReason {
  const code = (e as NodeJS.ErrnoException)?.code
  if (code === 'ENOENT') return 'enoent'
  if (code === 'ECONNREFUSED') return 'econnrefused'
  if (e instanceof Error) return 'error'
  return 'unknown'
}

/**
 * ant 4644.js `P9n` — orquesta el claim de un worker de repuesto: arma la
 * trama (`Bt`), la envía con reintento (`Ut`) y, si falla del todo,
 * loguea `tengu_bg_sendclaim_failed` clasificado y manda SIGTERM de
 * limpieza al pty socket del repuesto. La referencia arma el estado del
 * claim vía `g7.claim` antes de enviar; aquí ese estado ya lo resolvió
 * `claimSpare()` de `sparePool.ts` (slot consumido), así que esta función
 * sólo cubre el envío y la limpieza.
 */
export async function claimSpareWorker(
  args: {
    short: string
    ptySocket: string
    cwd?: string
    sessionId?: string
    env?: NodeJS.ProcessEnv
    argv?: string[]
    auth?: string
  },
  opts: { budgetMs?: number } = {},
): Promise<{ ok: true } | { ok: false; reason: SpareClaimFailReason }> {
  const frame = buildSpareClaimFrame(args)
  try {
    await sendSpareFrameWithRetry(args.ptySocket, frame, opts.budgetMs)
    return { ok: true }
  } catch (e) {
    const reason = classifySpareClaimFailure(e)
    logEvent('tengu_bg_sendclaim_failed', { reason, short: args.short })
    terminateSpareSocket(args.ptySocket)
    return { ok: false, reason }
  }
}

/**
 * Mitad de `AVo` — vigilancia de orfandad del proceso `--bg-spare`: cada
 * `intervalMs` comprueba que su ppid siga siendo el que tenía al
 * arrancar y, si el padre murió (daemon reiniciado/matado), dispara
 * `onOrphan` para que el propio repuesto se cierre en vez de quedar
 * corriendo sin supervisor. Puerto de la LÓGICA, no del proceso: no
 * existe hoy un entrypoint `--bg-spare` real en `@thyrox/daemon` que la
 * invoque (ver "pendiente" de cabecera) — queda lista para cuando exista.
 */
export function startPpidWatchdog(
  onOrphan: () => void,
  intervalMs = 2000,
  getPpid: () => number = () => process.ppid,
): () => void {
  const startedPpid = getPpid()
  const timer = setInterval(() => {
    if (getPpid() !== startedPpid) onOrphan()
  }, intervalMs)
  timer.unref()
  return () => clearInterval(timer)
}

const ORPHAN_FILE_SUFFIXES = ['.err', '.late', '.err.read']

/**
 * ant 4644.js `O9n` — en no-windows, barre `dir` (el directorio de
 * sockets del daemon, `getDaemonScopeDir()` en el llamador) buscando
 * `.pty.sock` que no pertenecen a ningún worker vivo, les manda SIGTERM
 * (destruyéndolos a los 2s si no cerraron) y borra los archivos huérfanos
 * asociados: `.err`/`.late`/`.err.read` sin su `.pty.sock`, y
 * `.claim.sock` sin un `.pty.sock` activo. Los tres `catch` silenciosos
 * (lectura del directorio y los dos `unlink`) son fieles a la referencia.
 * `dir` y `platformFn` son parámetros (no `getDaemonScopeDir()`/`os.platform`
 * fijos) para que la prueba corra sobre un tmpdir aislado y pueda inyectar
 * la plataforma sin tocar el proceso real.
 */
export async function sweepOrphanSpareSockets(
  dir: string,
  activePtySockets: ReadonlySet<string>,
  platformFn: () => NodeJS.Platform = osPlatform,
): Promise<number> {
  if (platformFn() === 'win32') return 0
  const entries = await readdir(dir).catch(() => [] as string[])
  let reaped = 0
  for (const name of entries) {
    if (!name.endsWith('.pty.sock')) continue
    const full = join(dir, name)
    if (activePtySockets.has(full)) continue
    reaped++
    const sock: Socket = connect(full)
    sock.on('error', () => {
      void unlink(full).catch(() => {})
    })
    sock.once('connect', () => {
      sock.resume()
      sock.write(encodeCtrlFrame({ t: 'kill', sig: 'SIGTERM' }))
      sock.end()
      setTimeout(() => sock.destroy(), 2000).unref()
    })
  }
  for (const name of entries) {
    const suffix = ORPHAN_FILE_SUFFIXES.find(s => name.endsWith(`.pty.sock${s}`))
    if (suffix) {
      const base = name.slice(0, -suffix.length)
      if (!entries.includes(base)) await unlink(join(dir, name)).catch(() => {})
      continue
    }
    if (name.endsWith('.claim.sock')) {
      const ptyName = `${name.slice(0, -'.claim.sock'.length)}.pty.sock`
      if (!activePtySockets.has(join(dir, ptyName))) await unlink(join(dir, name)).catch(() => {})
    }
  }
  return reaped
}

