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

import { timingSafeEqual } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { readdir, readFile, unlink } from 'node:fs/promises'
import { connect, createServer, type Socket } from 'node:net'
import { platform as osPlatform } from 'node:os'
import { join } from 'node:path'

import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

import { encodeCtrlFrame, type CtrlFrame } from './internal/ptyFrame.js'

/** ant 4644.js `xt` — nombre de la env var del secreto de claim (era `CLAUDE_BG_CLAIM_AUTH`). */
export const SPARE_CLAIM_AUTH_ENV = 'THYROX_BG_CLAIM_AUTH'

/** ant 4644.js `xt` — env var con la ruta del archivo de tokens de un solo uso (era `CLAUDE_BG_SOCKET_TOKENS_PATH`). */
export const SPARE_SOCKET_TOKENS_PATH_ENV = 'THYROX_BG_SOCKET_TOKENS_PATH'

/** Secretos que puede traer el archivo de tokens (`hYe`): sólo se conservan los campos string. */
interface SocketTokens {
  rvAuth?: string
  ptyAuth?: string
  claimAuth?: string
}

const SOCKET_TOKEN_KEYS = ['rvAuth', 'ptyAuth', 'claimAuth'] as const

/**
 * ant `hYe` — lee el archivo de tokens. Un archivo ausente, ilegible o que
 * no es un objeto JSON da `undefined`: silencio intencional como en la
 * referencia (`catch{return}`); quien llama decide si avisar.
 */
async function readSocketTokens(path: string): Promise<SocketTokens | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
    if (parsed === null || typeof parsed !== 'object') return undefined
    const tokens: SocketTokens = {}
    for (const key of SOCKET_TOKEN_KEYS) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'string') tokens[key] = value
    }
    return tokens
  } catch {
    return undefined
  }
}

/** Lee una env var y la borra del entorno en el mismo paso. */
function takeEnv(name: string): string | undefined {
  const value = process.env[name]
  delete process.env[name]
  return value
}

/**
 * ant 4644.js `xt` — resuelve el `claimAuth` del proceso `--bg-spare` y
 * BORRA del entorno las dos fuentes tras leerlas, para que no queden
 * visibles a subprocesos ni en `/proc/<pid>/environ`. Si el lanzador pasó
 * un archivo de tokens, éste gana a la env var directa y se borra del
 * disco tras leerlo (un solo uso); si es ilegible se avisa con nivel
 * `warn` y se cae a la env var.
 */
export async function resolveClaimAuth(): Promise<string | undefined> {
  const directAuth = takeEnv(SPARE_CLAIM_AUTH_ENV)
  const tokensPath = takeEnv(SPARE_SOCKET_TOKENS_PATH_ENV)
  if (!tokensPath) return directAuth
  const tokens = await readSocketTokens(tokensPath)
  await unlink(tokensPath).catch(() => {})
  if (!tokens?.claimAuth) logForDebugging('[bg-spare] tokens file unreadable; claim gate degraded', { level: 'warn' })
  return tokens?.claimAuth ?? directAuth
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


/** ant `Kjt` — tope (bytes) de una trama de claim sin salto de línea antes de cortar la conexión (8 MiB). */
export const SPARE_CLAIM_MAX_BYTES = 8_388_608

/**
 * ant `v0` — compara el secreto recibido con el esperado en tiempo
 * constante. Un secreto que no es string, vacío o de otra longitud se
 * rechaza antes de comparar.
 */
export function isClaimAuthValid(received: unknown, expected: string): boolean {
  if (typeof received !== 'string' || !expected || received.length === 0) return false
  const receivedBytes = Buffer.from(received)
  const expectedBytes = Buffer.from(expected)
  if (receivedBytes.length !== expectedBytes.length) return false
  return timingSafeEqual(receivedBytes, expectedBytes)
}

/** Parsea una línea como trama de claim; `undefined` si no es JSON de objeto. */
function parseClaimLine(line: string): SpareClaimFrame | undefined {
  try {
    const parsed: unknown = JSON.parse(line)
    return parsed !== null && typeof parsed === 'object' ? (parsed as SpareClaimFrame) : undefined
  } catch {
    return undefined
  }
}

/**
 * ant `Kjt` — escucha en `socketPath` hasta recibir UNA trama de claim
 * (JSON terminado en salto de línea) y cierra el servidor.
 *
 * Con `expectedAuth`, el canal es hostil: una conexión que supera
 * `SPARE_CLAIM_MAX_BYTES` sin salto de línea, que no trae JSON o cuyo
 * `auth` no coincide se destruye y el servidor sigue escuchando; un error
 * de esa conexión también se descarta (manejo esperado). Sin secreto, la
 * primera línea decide: JSON inválido o un error de conexión rechazan.
 */
export function receiveSpareClaim(
  socketPath: string,
  opts: { expectedAuth?: string; onListening?: () => void },
): Promise<SpareClaimFrame> {
  const { expectedAuth, onListening } = opts
  return new Promise((resolve, reject) => {
    const fail = (e: unknown): void => {
      server.close()
      reject(e)
    }
    const server = createServer(conn => {
      let buffered = ''
      conn.setEncoding('utf8')
      conn.on('data', (chunk: string) => {
        buffered += chunk
        if (expectedAuth && buffered.length > SPARE_CLAIM_MAX_BYTES) {
          conn.destroy()
          return
        }
        const newlineAt = buffered.indexOf('\n')
        if (newlineAt < 0) return
        const frame = parseClaimLine(buffered.slice(0, newlineAt))
        if (expectedAuth) {
          if (!frame || !isClaimAuthValid(frame.auth, expectedAuth)) {
            conn.destroy()
            return
          }
          server.close()
          resolve(frame)
          return
        }
        server.close()
        if (frame) resolve(frame)
        else reject(new Error('claim frame is not a JSON object'))
      })
      conn.on('error', expectedAuth ? () => conn.destroy() : fail)
    })
    server.on('error', fail)
    if (onListening) {
      server.once('listening', () => {
        try {
          onListening()
        } catch (e) {
          fail(e)
        }
      })
    }
    server.listen(socketPath)
  })
}

export type ClaimEnvProblem = 'invalid-name' | 'non-string-value' | 'nul-in-value'

export interface DroppedClaimEnv {
  name: string
  problem: ClaimEnvProblem
}

/** ant `jNo` — nombre de env var inválido: vacío, con `=` o con caracteres de control. */
const INVALID_ENV_NAME = /^$|[=\x00-\x1f\x7f-\x9f]/
const NUL_CHARACTER = '\x00'

/** ant `c` — el problema que impide aplicar una variable, o `undefined` si se puede aplicar. */
function classifyClaimEnvEntry(name: string, value: unknown): ClaimEnvProblem | undefined {
  if (INVALID_ENV_NAME.test(name)) return 'invalid-name'
  if (typeof value !== 'string') return 'non-string-value'
  if (value.includes(NUL_CHARACTER)) return 'nul-in-value'
  return undefined
}

/** ant `_cn` — separa el entorno del claim en lo aplicable y lo descartado, con su motivo. */
export function partitionClaimEnv(env: Record<string, unknown>): {
  kept: Record<string, string>
  dropped: DroppedClaimEnv[]
} {
  const kept: Record<string, string> = {}
  const dropped: DroppedClaimEnv[] = []
  for (const [name, value] of Object.entries(env)) {
    const problem = classifyClaimEnvEntry(name, value)
    if (problem) dropped.push({ name, problem })
    else kept[name] = value as string
  }
  return { kept, dropped }
}

/** Credenciales del repuesto que el claim reemplaza siempre (ant `Yjt`, `delete process.env.*`). */
const REPLACED_CREDENTIAL_ENV = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY', 'THYROX_CODE_OAUTH_TOKEN'] as const

/** El proceso sobre el que se aplica un claim; inyectable para probar sin tocar el proceso real. */
export interface SpareClaimTarget {
  env: NodeJS.ProcessEnv
  argv: string[]
  chdir(dir: string): void
}

/** Las dos primeras posiciones de `argv` (runtime y script) que el claim conserva. */
const ARGV_RUNTIME_PREFIX = 2

/**
 * Mitad de `Yjt` que aplica el claim al proceso: cambia al `cwd` del
 * claim, borra las credenciales propias del repuesto, aplica el entorno
 * válido del claim y rearma `argv` con el del claim. Devuelve las
 * variables descartadas para que el llamador las reporte.
 *
 * Divergencia declarada: la referencia, además, re-inicializa el estado de
 * sesión (`mh`/`D1t`), la telemetría y los gates (`Ss`, `ICe`, `G4r`, …), y
 * purga las variables del proveedor cuando
 * `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` está activo. En thyrox esa
 * inicialización la hace `main()` del CLI al arrancar después del claim,
 * y el concepto de proveedor gestionado por el anfitrión no existe.
 */
export function applySpareClaim(frame: SpareClaimFrame, target: SpareClaimTarget): DroppedClaimEnv[] {
  if (frame.cwd) target.chdir(frame.cwd)
  for (const name of REPLACED_CREDENTIAL_ENV) delete target.env[name]
  const { kept, dropped } = partitionClaimEnv(frame.env ?? {})
  Object.assign(target.env, kept)
  target.argv.splice(ARGV_RUNTIME_PREFIX, target.argv.length, ...(frame.argv ?? []))
  return dropped
}

/** ant `Yjt` `d` — cuántas variables descartadas se nombran una a una antes de resumir. */
const DROPPED_ENV_NAMED_LIMIT = 8

/**
 * ant `Yjt` `_` — avisa con nivel `warn` de cada variable del claim que no
 * se aplicó (hasta `DROPPED_ENV_NAMED_LIMIT`, el resto resumido) y emite
 * `tengu_bg_claim_env_dropped` con el conteo por motivo.
 */
export function reportDroppedClaimEnv(dropped: readonly DroppedClaimEnv[]): void {
  if (dropped.length === 0) return
  for (const { name, problem } of dropped.slice(0, DROPPED_ENV_NAMED_LIMIT)) {
    logForDebugging(`[bg-spare] environment variable ${JSON.stringify(name)} was not applied: ${problem}`, {
      level: 'warn',
    })
  }
  const unnamed = dropped.length - DROPPED_ENV_NAMED_LIMIT
  if (unnamed > 0) logForDebugging(`[bg-spare] ...and ${unnamed} more environment variables not applied`, { level: 'warn' })
  const countOf = (problem: ClaimEnvProblem): string => String(dropped.filter(d => d.problem === problem).length)
  logEvent('tengu_bg_claim_env_dropped', {
    dropped: String(dropped.length),
    nul_in_value: countOf('nul-in-value'),
    invalid_name: countOf('invalid-name'),
    non_string_value: countOf('non-string-value'),
  })
}

/** Lo que `runBgSpare` necesita del proceso; inyectable para probar sin salir ni recibir señales reales. */
export interface SpareProcessHost {
  exit(code: number): never
  writeStderr(text: string): void
  getPpid(): number
  ppidPollMs: number
  events: {
    on(event: string, listener: (error?: unknown) => void): unknown
    off(event: string, listener: (error?: unknown) => void): unknown
  }
}

/** ant `AVo` — cadencia (ms) de la vigilancia de orfandad por ppid. */
export const SPARE_PPID_POLL_MS = 2_000

export const defaultSpareProcessHost: SpareProcessHost = {
  exit: code => process.exit(code),
  writeStderr: text => {
    process.stderr.write(text)
  },
  getPpid: () => process.ppid,
  ppidPollMs: SPARE_PPID_POLL_MS,
  events: process,
}

const SPARE_EXIT_CLEAN = 0
const SPARE_EXIT_FAILURE = 1
const SPARE_EXIT_USAGE = 2
const SPARE_TERMINATION_SIGNALS = ['SIGTERM', 'SIGHUP', 'SIGINT'] as const

/** ant `It` en `AVo` — borra el socket de claim; silencio intencional si ya no existe. */
function removeClaimSocket(socketPath: string): void {
  try {
    unlinkSync(socketPath)
  } catch {
    // silencio intencional, como la referencia: el socket pudo no llegar a crearse.
  }
}

function describeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * ant `AVo` — entrypoint del proceso `--bg-spare`. `args[0]` es la ruta del
 * socket de claim. Resuelve el secreto (`xt`), escucha el claim autenticado
 * (`Kjt`) y, ya recibido, corre `postClaim` con la trama (`Yjt`).
 *
 * Mientras espera: una señal de terminación o la muerte del padre borran el
 * socket y salen 0; una excepción no capturada lo borra, se reporta y sale 1.
 * Recibido el claim, esas vigilancias se sueltan: desde ahí el proceso es
 * una sesión normal. Un fallo al recibir sale 1; un fallo del post-claim se
 * reporta y se relanza.
 *
 * Divergencia declarada: la referencia precarga módulos en paralelo con la
 * espera y registra cada salida con `fh` (rastro de crash de la sesión
 * bg); el rastro de crash no tiene equivalente en `@thyrox/daemon`.
 */
export async function runBgSpare(
  args: readonly string[],
  postClaim: (frame: SpareClaimFrame) => Promise<void>,
  host: SpareProcessHost = defaultSpareProcessHost,
): Promise<void> {
  const socketPath = args[0]
  if (!socketPath) {
    host.writeStderr('[bg-spare] missing claim sock path\n')
    host.exit(SPARE_EXIT_USAGE)
    return
  }
  const expectedAuth = await resolveClaimAuth()
  const removeSocket = (): void => removeClaimSocket(socketPath)
  const onSignal = (): void => {
    removeSocket()
    host.exit(SPARE_EXIT_CLEAN)
  }
  const onUncaught = (e: unknown): void => {
    removeSocket()
    host.writeStderr(`[bg-spare] uncaughtException: ${describeError(e)}\n`)
    host.exit(SPARE_EXIT_FAILURE)
  }
  const stopWatchdog = startPpidWatchdog(onSignal, host.ppidPollMs, () => host.getPpid())
  for (const signal of SPARE_TERMINATION_SIGNALS) host.events.on(signal, onSignal)
  host.events.on('uncaughtException', onUncaught)
  const releaseWaitGuards = (): void => {
    stopWatchdog()
    for (const signal of SPARE_TERMINATION_SIGNALS) host.events.off(signal, onSignal)
    host.events.off('uncaughtException', onUncaught)
  }
  let frame: SpareClaimFrame
  try {
    frame = await receiveSpareClaim(socketPath, { expectedAuth })
  } catch (e) {
    removeSocket()
    host.writeStderr(`[bg-spare] claim recv failed: ${describeError(e)}\n`)
    host.exit(SPARE_EXIT_FAILURE)
    return
  }
  releaseWaitGuards()
  try {
    await postClaim(frame)
  } catch (e) {
    host.writeStderr(`[bg-spare] post-claim init failed: ${describeError(e)}\n`)
    throw e
  }
}
