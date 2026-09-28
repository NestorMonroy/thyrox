/**
 * Quién es un proceso, más allá de su pid: el instante en que arrancó y el
 * dominio de pids en que vive. Un pid se recicla; el par pid e inicio no.
 * Porte de `b`, `Zne`, `n6`, `Hx`, `TFe`, `mfn`, `w`, `Nh`, `nc`, `_`, `C`,
 * `x`, `h` y `Pv` (`chunk-x5vr5vwm.js`, `chunk-jv3bb6yp.js`) y de `_Lo`/`HP`
 * (`chunk-j2p7jgmc.js`, `chunk-t0sp7zte.js`) de 2.1.283.
 *
 * Plataforma: la compilación de Linux de la referencia pliega a constantes la
 * elección de rama. Aquí la plataforma es parámetro, así que las tres formas
 * de `b` —leer `/proc`, preguntar a `ps -o lstart=`— y la forma de Windows de
 * `n6`/`Hx` (`procStartFt`) quedan todas alcanzables. `ps` se resuelve con
 * `lxe`/`RGr`/`ya` (`chunk-v49zfq06.js`, `chunk-x5vr5vwm.js`).
 *
 * DESCONOCIDO, con su condición de cierre: de dónde sale el token en
 * Windows. La compilación de Linux no contiene esa rama; sólo la forma del
 * campo. Se cierra leyendo una compilación de Windows de la referencia; hasta
 * entonces, en `win32` el token sale de la misma rama de `ps` que en el resto
 * de plataformas no Linux.
 */
import { readFile, readlink } from 'node:fs/promises'
import { delimiter, isAbsolute } from 'node:path'
import { hostname } from 'node:os'

import { getErrnoCode } from '../errorHelpers.ts'

const MAX_PID = 2147483647
/** Un token leído vale un minuto; una lectura fallida, cinco segundos. */
export const HIT_TTL_MS = 60000
export const MISS_TTL_MS = 5000

/** `Zne`: el campo 22 de `/proc/<pid>/stat`, contado tras el último `)` del nombre del comando. */
export function parseProcStatStartTime(stat: string): string | undefined {
  return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]
}

export type CommandResult = { code: number; stdout: string }
export type CommandRunner = (command: string, args: string[], options: { timeout: number; env: Record<string, string | undefined> }) => Promise<CommandResult>

/** Plazo de `ps` al leer un inicio: un segundo. */
const PS_TIMEOUT_MS = 1000

/** Lanza `command` con su propio entorno completo y devuelve su código y su salida. */
export const spawnCommand: CommandRunner = async (command, args, { timeout, env }) => {
  const child = Bun.spawn([command, ...args], { env, stdout: 'pipe', stderr: 'ignore', timeout })
  const [stdout, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
  return { code, stdout }
}

export interface StartTokenSource {
  /** Plataforma de Node: `linux` lee `/proc`; cualquier otra pregunta a `ps`. */
  platform?: string
  /** Entorno propio para `ps`; si se da, reemplaza al del proceso y su `PATH` resuelve `ps`. */
  env?: Record<string, string | undefined>
  readFile?: (path: string) => Promise<string>
  runCommand?: CommandRunner
  which?: (command: string, path: string) => string | null
}

/** `ya`: el valor de una variable; en Windows el nombre no distingue mayúsculas. */
export function envValue(env: Record<string, string | undefined>, name: string, platform: string): string | undefined {
  if (name in env) return env[name]
  if (platform !== 'windows') return undefined
  const key = Object.keys(env).find(candidate => candidate.toUpperCase() === name.toUpperCase())
  return key === undefined ? undefined : env[key]
}

/** `RGr`/`Thn`/`so`: las entradas absolutas de un `PATH`; en `win32` sin comillas. */
export function absolutePathEntries(pathValue: string, platform: string, separator: string = delimiter): string {
  return pathValue
    .split(separator)
    .map(entry => (platform === 'win32' ? entry.replaceAll('"', '') : entry))
    .filter(entry => isAbsolute(entry))
    .join(separator)
}

/** `lxe`: `command` resuelto sólo en las entradas absolutas de `pathValue`, o `null`. */
export function whichInSanitizedPath(
  command: string,
  pathValue: string,
  which: (command: string, path: string) => string | null = (name, path) => Bun.which(name, { PATH: path }),
): string | null {
  const sanitized = absolutePathEntries(pathValue, process.platform)
  return sanitized === '' ? null : which(command, sanitized)
}

/** `b`: el token de inicio de un proceso, o `undefined` si no se puede leer. */
export async function readProcessStartToken(pid: number, source: StartTokenSource = {}): Promise<string | undefined> {
  const { platform = process.platform, env, readFile: read = path => readFile(path, 'utf8'), runCommand = spawnCommand, which } = source
  try {
    if (platform === 'linux') return parseProcStatStartTime(await read(`/proc/${pid}/stat`))
    const ps = env === undefined ? 'ps' : whichInSanitizedPath('ps', envValue(env, 'PATH', platform === 'win32' ? 'windows' : platform) ?? '', which)
    if (ps === null) return undefined
    const result = await runCommand(ps, ['-o', 'lstart=', '-p', String(pid)], {
      timeout: PS_TIMEOUT_MS,
      env: { ...(env ?? process.env), LC_ALL: 'C', TZ: 'UTC' },
    })
    return result.code === 0 && result.stdout ? result.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

export type StartTokenFields = { procStart: string | undefined; procStartFt: string | undefined }

/** `f`: si el token viaja en su forma de Windows. */
const WINDOWS_TOKEN_FORM = process.platform === 'win32'

/** `n6`: dónde viaja el token al publicarse: en Windows, `procStartFt`; en el resto, `procStart`. */
export function procStartFields(token: string | undefined, windowsForm: boolean = WINDOWS_TOKEN_FORM): StartTokenFields {
  return windowsForm ? { procStart: undefined, procStartFt: token } : { procStart: token, procStartFt: undefined }
}

/**
 * `Hx`: el token que un registro publicado declara. En Windows, un registro
 * con `procStart` viene de otra plataforma y su token no es comparable.
 */
export function recordedStartToken(record: Partial<StartTokenFields>, windowsForm: boolean = WINDOWS_TOKEN_FORM): string | undefined {
  if (windowsForm) return record.procStart !== undefined ? undefined : record.procStartFt
  return record.procStart
}

/** `TFe`: si dos tokens de inicio son el mismo arranque. */
export function sameStartToken(recorded: string, current: string): boolean {
  return recorded === current
}

/** `mfn`: un pid que se puede señalar sin tocar init ni un grupo. */
export function isValidPid(pid: number): boolean {
  return Number.isInteger(pid) && pid > 1 && pid <= MAX_PID
}

/** `Nh`: si el proceso ya no existe. Sólo `ESRCH` lo prueba; `EPERM` es un proceso vivo de otro usuario. */
export function isProcessGone(pid: number, signal: (pid: number, sig: number) => unknown = (p, s) => process.kill(p, s)): boolean {
  if (!isValidPid(pid)) return false
  try {
    signal(pid, 0)
    return false
  } catch (error) {
    return getErrnoCode(error) === 'ESRCH'
  }
}

export type PidDomainReaders = {
  readMachineId: () => Promise<string>
  readPidNamespace: () => Promise<string>
  hostname: () => string
}

const procPidDomainReaders: PidDomainReaders = {
  readMachineId: () => readFile('/etc/machine-id', 'utf8'),
  readPidNamespace: () => readlink('/proc/self/ns/pid'),
  hostname,
}

/**
 * `_Lo`: el dominio donde un pid tiene sentido. Dos sesiones sólo comparan pids
 * si comparten máquina y espacio de pids.
 */
export async function pidDomainFor(platform: string, readers: PidDomainReaders = procPidDomainReaders): Promise<string> {
  if (platform === 'windows') return `linux:${readers.hostname().toLowerCase()}`
  if (platform !== 'linux' && platform !== 'wsl') return 'linux'
  const [machineId, pidNamespace] = await Promise.all([
    readers.readMachineId().then(text => text.trim(), () => ''),
    readers.readPidNamespace().catch(() => ''),
  ])
  return `linux:${machineId}:${pidNamespace}`
}

let pidDomainPromise: Promise<string> | undefined

/** `HP`: el dominio de este proceso, calculado una vez; un fallo no queda en caché. */
export function currentPidDomain(platform: string): Promise<string> {
  pidDomainPromise ??= pidDomainFor(platform).catch(error => {
    pidDomainPromise = undefined
    throw error
  })
  return pidDomainPromise
}

type CacheEntry = { at: number; promise: Promise<string | undefined>; miss?: boolean }

/** `nc`: tokens de inicio por pid, con caducidad distinta para un acierto y un fallo. */
export class StartTokenCache {
  readonly #entries = new Map<number, CacheEntry>()

  constructor(
    private readonly read: (pid: number) => Promise<string | undefined> = pid => readProcessStartToken(pid),
    private readonly now: () => number = Date.now,
  ) {}

  async get(pid: number, options: { skipCache?: boolean } = {}): Promise<string | undefined> {
    const at = this.now()
    if (!options.skipCache) {
      const entry = this.#entries.get(pid)
      const ttl = entry?.miss ? MISS_TTL_MS : HIT_TTL_MS
      if (entry && at - entry.at < ttl) return entry.promise
    }
    const promise = this.read(pid)
    const entry: CacheEntry = { at, promise }
    this.#entries.set(pid, entry)
    const token = await promise
    if (token === undefined && this.#entries.get(pid) === entry) entry.miss = true
    return token
  }
}

export const startTokenCache = new StartTokenCache()

let ownStartToken: string | undefined

/** `Pv`: el token de inicio de este proceso, que no cambia mientras viva. */
export async function currentProcessStartToken(): Promise<string | undefined> {
  ownStartToken ??= await startTokenCache.get(process.pid)
  return ownStartToken
}
