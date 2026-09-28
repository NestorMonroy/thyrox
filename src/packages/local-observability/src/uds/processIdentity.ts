/**
 * Quién es un proceso, más allá de su pid: el instante en que arrancó y el
 * dominio de pids en que vive. Un pid se recicla; el par pid e inicio no.
 * Porte de `b`, `Zne`, `n6`, `Hx`, `TFe`, `mfn`, `w`, `Nh`, `nc`, `_`, `C`,
 * `x`, `h` y `Pv` (`chunk-x5vr5vwm.js`, `chunk-jv3bb6yp.js`) y de `_Lo`/`HP`
 * (`chunk-j2p7jgmc.js`, `chunk-t0sp7zte.js`) de 2.1.283.
 *
 * Divergencia declarada: la rama de `b` que consulta `ps -o lstart=` es
 * inalcanzable en la compilación de Linux de la referencia (el bloque que lee
 * `/proc` siempre retorna); no se porta. `f()` —la variante de Windows del
 * token— vale `false` en esa compilación, y aquí también.
 */
import { readFile, readlink } from 'node:fs/promises'
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

/** `b`: el token de inicio de un proceso, o `undefined` si no se puede leer. */
export async function readProcessStartToken(pid: number, read: (path: string) => Promise<string> = path => readFile(path, 'utf8')): Promise<string | undefined> {
  try {
    return parseProcStatStartTime(await read(`/proc/${pid}/stat`))
  } catch {
    return undefined
  }
}

export type StartTokenFields = { procStart: string | undefined; procStartFt: string | undefined }

/** `n6`: dónde viaja el token al publicarse; fuera de Windows, en `procStart`. */
export function procStartFields(token: string | undefined): StartTokenFields {
  return { procStart: token, procStartFt: undefined }
}

/** `Hx`: el token que un registro publicado declara. */
export function recordedStartToken(record: Partial<StartTokenFields>): string | undefined {
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
