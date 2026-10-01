/**
 * El listado de sesiones vivas, leído directamente de los archivos
 * `<pid>.json` del directorio de sesiones (no del barrido agregado de
 * `registrySweep.ts`, que cuenta y limpia; esto además clasifica cada
 * registro y decide con quién se puede hablar).
 *
 * Porte de `id`/`hLo`, `mpt`/`fFt`, `yLo`, `ua`, `KOt`, `G3o`, `YOt`, `D3`,
 * `DV`, `VRr`, `qRr` y `XOt` (`chunk-qcy58j4w.js`) de 2.1.283, con `bYe`
 * (el tope de bytes de un registro) reutilizado de
 * `REGISTRY_RECORD_MAX_BYTES` en `registrySweep.ts` — mismo valor, mismo
 * origen — y `opn` reutilizado de `validHostSessionId` en
 * `sessionRegistration.ts`.
 *
 * `sfn` (`chunk-5mcqvwzx.js`, el plazo de una relectura tras un registro que
 * parece a medio escribir) es un número suelto de 25 ms, sin porte propio en
 * otro archivo; se declara aquí como `TORN_RECORD_REREAD_DELAY_MS`.
 *
 * Divergencia declarada: `Ye`/`_e` (`chunk-153dnzje.js`, deduplicar un
 * arreglo y filtrarlo a sólo cadenas) no tenían porte propio accesible desde
 * aquí — son de una línea cada una y se repiten como lo que son.
 *
 * `q`/`VE` (verificar que un pid sigue siendo el mismo arranque) reutilizan
 * `startTokenCache`/`sameStartToken` de `processIdentity.ts`; la referencia
 * los porta como una función privada (`verifyProcessStartToken`) en
 * `artifactReplyYield.ts`, fuera del alcance de este ítem, así que se
 * recomponen aquí con las mismas dos piezas exportadas, sin repetir su
 * cuerpo interno.
 */
import { readdir, readFile, stat, unlink } from 'node:fs/promises'
import { connect } from 'node:net'
import { basename, dirname, join } from 'node:path'

import { getPlatform } from '@thyrox/config/platform'
import { sleep } from '@thyrox/config/sleep'

import { getErrnoCode, isENOENT } from '../errorHelpers.ts'
import { canonicalSocketAddress } from './inboxAuth.ts'
import { defaultSessionsDir, readBoundedFile, sessionKey } from './inboxKeys.ts'
import { isSameSocket, mayBeSameSocket } from './peerAddress.ts'
import { isUsableLocalSocketAddress } from './socketPath.ts'
import { MAX_FORMER_NAMES } from './sessionRegistryState.ts'
import { sliceUnits } from './stringUnits.ts'
import { MAX_SESSION_NAME } from './sessionNameState.ts'
import { validHostSessionId } from './sessionRegistration.ts'
import { currentPidDomain, isProcessGone, sameStartToken, startTokenCache } from './processIdentity.ts'
import { isRegistrySweepPermitted, recordInPidDomain, REGISTRY_RECORD_MAX_BYTES, sweepDeadPidKeys, type RegistryStorage } from './registrySweep.ts'

export type { RegistryStorage }
import { storageBackendPin } from './storageBackendPin.ts'

/** `sfn`: plazo antes de releer un registro que parecía a medio escribir. */
const TORN_RECORD_REREAD_DELAY_MS = 25

/** `KOt`. */
export class SessionRecordsUnreadableError extends Error {
  constructor(public readonly code: string | undefined) {
    super('session records directory unreadable')
    this.name = 'SessionRecordsUnreadableError'
  }
}

/** `mpt`: un instante plausible — finito, no negativo y por debajo de una cota amplia. */
function isPlausibleTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 4000000000000000
}

/** `fFt`: el instante si es plausible, o `undefined`. */
function optionalPlausibleTimestamp(value: unknown): number | undefined {
  return isPlausibleTimestamp(value) ? value : undefined
}

/** `ua`: el pid responde a la señal 0 — vivo, o de otro usuario. */
export function isProcessAlive(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** `D`: los valores únicos de `values`, en su primer orden de aparición. */
function dedupe<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

/** `ri`: sólo los elementos de tipo cadena. */
function stringsOnly(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.every(item => typeof item === 'string') ? (value as string[]) : value.filter((item): item is string => typeof item === 'string')
}

export type RegistryRecordKind = 'interactive' | 'bg' | 'daemon' | 'daemon-worker'
const RECORD_KINDS: ReadonlySet<string> = new Set(['interactive', 'bg', 'daemon', 'daemon-worker'])
function asRecordKind(value: unknown): RegistryRecordKind | undefined {
  return typeof value === 'string' && RECORD_KINDS.has(value) ? (value as RegistryRecordKind) : undefined
}

export type SessionStatus = 'busy' | 'shell' | 'idle' | 'waiting'
const SESSION_STATUSES: ReadonlySet<string> = new Set(['busy', 'shell', 'idle', 'waiting'])
function asSessionStatus(value: unknown): SessionStatus | undefined {
  return typeof value === 'string' && SESSION_STATUSES.has(value) ? (value as SessionStatus) : undefined
}

export type FormerSessionName = { name: string; until: number; sessionId?: string }

/** `$e`: la forma de un nombre anterior recibido de otro proceso. */
function isRawFormerName(value: unknown): value is { name: string; until: number; sessionId?: string } {
  if (typeof value !== 'object' || value === null) return false
  const { name, until, sessionId } = value as Record<string, unknown>
  return typeof name === 'string' && isPlausibleTimestamp(until) && (sessionId === undefined || typeof sessionId === 'string')
}

/** `Ge`: los nombres anteriores que trae el registro, saneados y acotados. */
function sanitizeFormerNames(value: unknown): FormerSessionName[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRawFormerName)
    .slice(0, MAX_FORMER_NAMES)
    .map(({ name, until, sessionId }) => ({
      name: sliceUnits(name, MAX_SESSION_NAME),
      until,
      ...(sessionId !== undefined && { sessionId: sliceUnits(sessionId, MAX_SESSION_NAME) }),
    }))
}

/** `Je`: los rasgos de par declarados, saneados a identificadores cortos y acotados a 16. */
function sanitizePeerFeatures(value: unknown): string[] {
  return stringsOnly(value)
    .filter(feature => /^[a-z0-9_]{1,32}$/.test(feature))
    .slice(0, 16)
}

/** `hLo`: el pid de un nombre de archivo `<pid>.json`, y si es su forma canónica. */
function parseRecordFileName(fileName: string): { pid: number; canonical: boolean } | null {
  const withoutExt = fileName.replace(/\.json$/, '')
  const pid = Number.parseInt(withoutExt, 10)
  if (Number.isNaN(pid)) return null
  return { pid, canonical: String(pid) === withoutExt }
}

type CoreRecordFields = {
  cwd: string
  startedAt: number
  procStart: string | undefined
  procStartFt?: string
  kind: RegistryRecordKind | undefined
  sessionId: string | undefined
  status: SessionStatus | undefined
  entrypoint: string | undefined
  pidDomain?: string
}

/** `yLo`: los campos centrales de un registro crudo, con su forma normalizada. */
function normalizeCoreFields(raw: Record<string, unknown>): CoreRecordFields {
  return {
    cwd: typeof raw.cwd === 'string' ? raw.cwd : '?',
    startedAt: optionalPlausibleTimestamp(raw.startedAt) ?? 0,
    procStart: typeof raw.procStart === 'string' ? raw.procStart : undefined,
    ...(typeof raw.procStartFt === 'string' && { procStartFt: raw.procStartFt }),
    kind: asRecordKind(raw.kind),
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : undefined,
    status: asSessionStatus(raw.status),
    entrypoint: typeof raw.entrypoint === 'string' ? raw.entrypoint : undefined,
    ...(typeof raw.pidDomain === 'string' && { pidDomain: raw.pidDomain }),
  }
}

export type RawSessionRecord = {
  file: string
  sock: string
  cwd: string
  startedAt: number
  nameSince?: number
  procStart: string | undefined
  procStartFt?: string
  name?: string
  nameSource?: 'user' | 'peer' | 'derived' | 'collision' | 'auto' | 'hook'
  formerNames: FormerSessionName[]
  kind: RegistryRecordKind | undefined
  sessionId: string | undefined
  jobId?: string
  parkedJobId?: string
  spare: boolean
  bridgeSessionId?: string
  logPath?: string
  status: SessionStatus | undefined
  waitingFor?: string
  updatedAt?: number
  statusUpdatedAt?: number
  entrypoint: string | undefined
  hostSessionId?: string
  pidDomain?: string
  agent?: string
  state?: string
  detail?: string
  tempo?: 'active' | 'idle' | 'blocked'
  needs?: string
  peerProtocol?: number
  peerFeatures?: string[]
  tmux?: string
  pid: number
}

export type LiveSessionRecord = Omit<RawSessionRecord, 'file'>

type ReadRecordOptions = { rejectTornLiveRecord?: boolean; isReread?: boolean }

/** `Z`: el registro que declara `file`, o `null` si no se puede leer; puede relanzar `SessionRecordsUnreadableError`. */
export async function readSessionRecordFile(dir: string, fileName: string, options?: ReadRecordOptions): Promise<RawSessionRecord | null> {
  let readSucceeded = false
  let recordPid: number | undefined
  const path = join(dir, fileName)
  try {
    const parsedName = parseRecordFileName(fileName)
    if (parsedName === null) return null
    const { pid } = parsedName
    if (!parsedName.canonical) {
      await unlink(path).catch(() => {})
      return null
    }
    recordPid = pid
    const text = await readBoundedFile(path, REGISTRY_RECORD_MAX_BYTES)
    if (text === null) return null
    readSucceeded = true
    const raw = JSON.parse(text) as Record<string, unknown>
    const core = normalizeCoreFields(raw)
    return {
      sock: typeof raw.messagingSocketPath === 'string' ? raw.messagingSocketPath : '',
      cwd: core.cwd,
      startedAt: core.startedAt,
      ...(optionalPlausibleTimestamp(raw.nameSince) !== undefined && { nameSince: optionalPlausibleTimestamp(raw.nameSince) }),
      procStart: core.procStart,
      ...(core.procStartFt !== undefined && { procStartFt: core.procStartFt }),
      name: typeof raw.name === 'string' ? raw.name : undefined,
      nameSource:
        raw.nameSource === 'user' || raw.nameSource === 'peer' || raw.nameSource === 'derived' || raw.nameSource === 'collision' || raw.nameSource === 'auto' || raw.nameSource === 'hook'
          ? raw.nameSource
          : undefined,
      formerNames: sanitizeFormerNames(raw.formerNames),
      kind: core.kind,
      sessionId: core.sessionId,
      jobId: typeof raw.jobId === 'string' ? raw.jobId : undefined,
      parkedJobId: typeof raw.parkedJobId === 'string' ? raw.parkedJobId : undefined,
      spare: raw.spare === true,
      bridgeSessionId: typeof raw.bridgeSessionId === 'string' ? raw.bridgeSessionId : undefined,
      logPath: typeof raw.logPath === 'string' ? raw.logPath : undefined,
      status: core.status,
      waitingFor: typeof raw.waitingFor === 'string' ? raw.waitingFor : undefined,
      updatedAt: optionalPlausibleTimestamp(raw.updatedAt),
      statusUpdatedAt: optionalPlausibleTimestamp(raw.statusUpdatedAt),
      entrypoint: core.entrypoint,
      ...(validHostSessionId(raw.hostSessionId) !== undefined && { hostSessionId: validHostSessionId(raw.hostSessionId) }),
      ...(core.pidDomain !== undefined && { pidDomain: core.pidDomain }),
      agent: typeof raw.agent === 'string' ? raw.agent : undefined,
      state: typeof raw.state === 'string' ? raw.state : undefined,
      detail: typeof raw.detail === 'string' ? raw.detail : undefined,
      tempo: raw.tempo === 'active' || raw.tempo === 'idle' || raw.tempo === 'blocked' ? raw.tempo : undefined,
      needs: typeof raw.needs === 'string' ? raw.needs : undefined,
      peerProtocol: typeof raw.peerProtocol === 'number' ? raw.peerProtocol : undefined,
      ...(Array.isArray(raw.peerFeatures) && { peerFeatures: sanitizePeerFeatures(raw.peerFeatures) }),
      tmux: typeof raw.tmux === 'string' ? raw.tmux : undefined,
      pid,
      file: path,
    }
  } catch {
    if (options?.rejectTornLiveRecord && readSucceeded && recordPid !== undefined && isProcessAlive(recordPid)) {
      if (!options.isReread) {
        await sleep(TORN_RECORD_REREAD_DELAY_MS)
        return readSessionRecordFile(dir, fileName, { ...options, isReread: true })
      }
      const [mtimeMs, estimatedStartMs] = await Promise.all([
        stat(path).then(stats => stats.mtimeMs as number | undefined, () => undefined),
        estimateProcessStartMs(recordPid),
      ])
      if (mtimeMs !== undefined && estimatedStartMs !== null && estimatedStartMs > mtimeMs + 2000) return null
      if (estimatedStartMs === null && !isProcessAlive(recordPid)) return null
      throw new SessionRecordsUnreadableError('EBADRECORD')
    }
    return null
  }
}

/** `_Ye`: el instante estimado (epoch ms) en que `pid` arrancó, leyendo `/proc`. */
async function estimateProcessStartMs(pid: number): Promise<number | null> {
  try {
    const procStat = await readFile(`/proc/${pid}/stat`, 'utf8')
    const jiffies = Number(procStat.slice(procStat.lastIndexOf(')') + 2).split(' ')[19])
    const bootStat = await readFile('/proc/stat', 'utf8')
    const bootEpochSeconds = Number(/^btime (\d+)/m.exec(bootStat)?.[1])
    if (!Number.isFinite(jiffies) || !Number.isFinite(bootEpochSeconds)) return null
    return bootEpochSeconds * 1000 + (jiffies / 100) * 1000
  } catch {
    return null
  }
}

/** `x_`: si `pid` todavía puede ser el mismo arranque que `recordedToken` — generoso cuando no se puede saber. */
async function isSameProcessStartOrUnknown(pid: number, recordedToken: string | undefined): Promise<boolean> {
  if (recordedToken === undefined) return true
  const current = await startTokenCache.get(pid)
  return current === undefined || sameStartToken(recordedToken, current)
}

/** `VE`: si `pid` sigue siendo el mismo arranque que `recordedToken`, con una lectura fresca; `undefined` si no se puede saber. */
async function verifyProcessStartToken(pid: number, recordedToken: string): Promise<boolean | undefined> {
  const current = await startTokenCache.get(pid, { skipCache: true })
  return current === undefined ? undefined : sameStartToken(recordedToken, current)
}

/** `q`: si `record` sigue vivo y es el mismo arranque que declara. */
async function verifyLivePeerAtRecord(record: Pick<RawSessionRecord, 'pid' | 'procStart' | 'procStartFt'>): Promise<boolean> {
  const token = record.procStartFt ?? record.procStart
  if (token === undefined || isProcessGone(record.pid)) return false
  return (await verifyProcessStartToken(record.pid, token)) === true
}

type ReadAllOptions = { rejectUnreadable?: boolean; rejectTornLiveRecord?: boolean }

/** `F`: todos los registros crudos legibles del directorio de sesiones. */
async function readAllRawSessionRecords(options?: ReadAllOptions): Promise<RawSessionRecord[]> {
  const dir = defaultSessionsDir()
  let names: string[]
  try {
    names = await readdir(dir)
  } catch (error) {
    if (options?.rejectUnreadable && !isENOENT(error)) throw new SessionRecordsUnreadableError(getErrnoCode(error))
    return []
  }
  const records = await Promise.all(
    names.filter(name => /^\d+\.json$/.test(name)).map(name => readSessionRecordFile(dir, name, { rejectTornLiveRecord: options?.rejectTornLiveRecord })),
  )
  return records.filter((record): record is RawSessionRecord => record !== null)
}

/** `we`: si `record` declara un dominio de pids distinto del propio. */
function recordSpansForeignDomain(record: Pick<RawSessionRecord, 'pidDomain'>, ownDomain: string): boolean {
  return record.pidDomain !== undefined && record.pidDomain !== ownDomain
}

/** `G3o`: si alguno de `records` con `sessionId` vive en un dominio de pids ajeno al propio. */
export async function sessionSpansForeignPidDomain(records: readonly Pick<RawSessionRecord, 'sessionId' | 'pidDomain'>[], sessionId: string): Promise<boolean> {
  const ownDomain = await currentPidDomain(getPlatform())
  return records.some(record => record.sessionId === sessionId && recordSpansForeignDomain(record, ownDomain))
}

/** `YOt`: todos los registros de sesión, legibles, sin su ruta de archivo. */
export async function listAllSessionRecords(): Promise<LiveSessionRecord[]> {
  return (await readAllRawSessionRecords({ rejectUnreadable: true })).map(({ file: _file, ...record }) => record)
}

/** `V`: retira el registro muerto y sus claves, por storage si está activo. */
function retireDeadRecord(file: string, pid: number, domain: string, storage: RegistryStorage | undefined): void {
  if (storageBackendPin.isActive() && storage !== undefined) {
    storage
      .delete(sessionKey(basename(file)))
      .then(result => (result.ok && result.value.existed ? sweepDeadPidKeys(dirname(file), pid, domain, storage) : undefined))
      .catch(() => {})
    return
  }
  unlink(file)
    .then(() => sweepDeadPidKeys(dirname(file), pid, domain, storage))
    .catch(() => {})
}

/** `D3`: las sesiones vivas — verificadas por arranque, o de confianza si su dominio de pids es ajeno. */
export async function listAllLiveSessions(storage?: RegistryStorage, options?: { rejectUnreadable?: boolean }): Promise<LiveSessionRecord[]> {
  const rejectUnreadable = options?.rejectUnreadable === true
  const records = await readAllRawSessionRecords({ rejectUnreadable, rejectTornLiveRecord: rejectUnreadable })
  const ownDomain = rejectUnreadable ? await currentPidDomain(getPlatform()) : undefined
  const isForeignDomain = (record: RawSessionRecord) => ownDomain !== undefined && recordSpansForeignDomain(record, ownDomain)
  const possiblyLive = records.map(record => isForeignDomain(record) || isProcessAlive(record.pid))
  const verifiedLive = await Promise.all(
    records.map((record, index) => possiblyLive[index] && (isForeignDomain(record) || isSameProcessStartOrUnknown(record.pid, record.procStartFt ?? record.procStart))),
  )
  const sweepPermitted = await isRegistrySweepPermitted()
  const sweepDomain = sweepPermitted ? await currentPidDomain(getPlatform()) : ''
  const live: LiveSessionRecord[] = []
  for (let index = 0; index < records.length; index++) {
    const { file, ...record } = records[index]!
    if (verifiedLive[index]) {
      live.push(record)
    } else if (sweepPermitted && recordInPidDomain(record, sweepDomain) && isProcessGone(record.pid)) {
      retireDeadRecord(file, record.pid, sweepDomain, storage)
    }
  }
  return live
}

/** `DV`: el socket propio que declara la variable de entorno, si la hay. */
export function messagingSocketEnvOverride(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.THYROX_CODE_MESSAGING_SOCKET
}

/** `ne`: si el registro es un cupo de repuesto, o un trabajo aparcado. */
function isSpareOrParked(record: Pick<RawSessionRecord, 'spare' | 'parkedJobId'>): boolean {
  return record.spare === true || record.parkedJobId !== undefined
}

/** `Y`: si el socket contesta (o está ocupado) dentro de un plazo corto. */
function pingSocketBusy(path: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!isUsableLocalSocketAddress(path)) {
      resolve(false)
      return
    }
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const socket = connect({ path })
    socket.on('connect', () => {
      socket.destroy()
      finish(true)
    })
    socket.on('error', error => {
      socket.destroy()
      finish(getErrnoCode(error) === 'EBUSY')
    })
    socket.setTimeout(250, () => {
      socket.destroy()
      finish(false)
    })
  })
}

type SocketLiveness = 'present' | 'gone' | 'recycled'

/** `ee`: si el registro sigue presente (dominio ajeno o sin cómo comprobarlo), muerto, o su pid fue reciclado. */
async function sessionSocketLiveness(record: Pick<RawSessionRecord, 'pid' | 'pidDomain' | 'procStart' | 'procStartFt'>, ownDomain: string): Promise<SocketLiveness> {
  if (record.pidDomain !== ownDomain) return 'present'
  if (isProcessGone(record.pid)) return 'gone'
  const recordedToken = record.procStartFt ?? record.procStart
  if (recordedToken === undefined) return 'present'
  const cached = await startTokenCache.get(record.pid)
  if (cached === undefined || sameStartToken(recordedToken, cached)) return 'present'
  return (await verifyProcessStartToken(record.pid, recordedToken)) === false ? 'recycled' : 'present'
}

/** `VRr`: si la ruta que declara la variable de entorno propia coincide con la de OTRA sesión viva y ocupada. */
export async function hasConflictingMessagingSocketOwner(): Promise<boolean> {
  const ownOverride = messagingSocketEnvOverride()
  if (ownOverride === undefined) return false
  const records = await readAllRawSessionRecords()
  const ownDomain = await currentPidDomain(getPlatform())
  const candidates = records.filter(record => record.sock && record.pid !== process.pid && !isSpareOrParked(record) && !record.sock.startsWith('sid:') && mayBeSameSocket(record.sock, ownOverride))
  const verdicts = await Promise.all(candidates.map(async record => (await sessionSocketLiveness(record, ownDomain)) === 'present' && (await pingSocketBusy(record.sock))))
  return verdicts.some(Boolean)
}

/** `qRr`: las sesiones vivas, sin repuestos ni aparcadas, cuyo socket contesta; retira las que resulten muertas. */
export async function liveNonSpareSessions(storage?: RegistryStorage): Promise<LiveSessionRecord[]> {
  const ownOverride = messagingSocketEnvOverride()
  const candidates = (await readAllRawSessionRecords({ rejectUnreadable: true })).filter(
    record => record.sock && !(ownOverride && isSameSocket(record.sock, ownOverride)) && !isSpareOrParked(record),
  )
  const [sweepPermitted, ownDomain] = await Promise.all([isRegistrySweepPermitted(), currentPidDomain(getPlatform())])
  const [busy, liveness] = await Promise.all([
    Promise.all(candidates.map(record => pingSocketBusy(record.sock))),
    Promise.all(candidates.map(record => sessionSocketLiveness(record, ownDomain))),
  ])
  const live: LiveSessionRecord[] = []
  for (let index = 0; index < candidates.length; index++) {
    const { file, ...record } = candidates[index]!
    if (liveness[index] === 'gone') {
      if (sweepPermitted && isProcessGone(record.pid)) retireDeadRecord(file, record.pid, ownDomain, storage)
    } else if (liveness[index] === 'recycled') {
      continue
    } else if (busy[index]) {
      live.push(record)
    } else if (sweepPermitted && recordInPidDomain(record, ownDomain) && isProcessGone(record.pid)) {
      retireDeadRecord(file, record.pid, ownDomain, storage)
    }
  }
  return live
}

/** `XOt`: un par vivo que atienda a `sessionId`, o que tenga aparcado un trabajo que `sessionId` dejó. */
export async function claimParkedJobPeer(sessionId: string): Promise<LiveSessionRecord | null> {
  const ownOverride = messagingSocketEnvOverride()
  const records = await readAllRawSessionRecords()
  const isRealSocket = (record: RawSessionRecord) => Boolean(record.sock) && !(ownOverride && isSameSocket(record.sock, ownOverride))
  const ownParkedJobIds = new Set(records.filter(record => record.sessionId === sessionId && record.parkedJobId !== undefined).map(record => record.parkedJobId))
  const candidates = records.filter(record => isRealSocket(record) && !isSpareOrParked(record))
  const own = candidates.filter(record => record.sessionId === sessionId)
  const holdingOurJob = candidates.filter(record => record.sessionId !== sessionId && record.jobId !== undefined && ownParkedJobIds.has(record.jobId))
  const ownDomain = await currentPidDomain(getPlatform())
  for (const candidate of [...own, ...holdingOurJob]) {
    const { file: _file, ...record } = candidate
    if ((await sessionSocketLiveness(record, ownDomain)) === 'present' && (await pingSocketBusy(record.sock))) return record
  }
  return null
}

/** `qe`: si algún registro (vivo o no) declara un socket con esta dirección canónica y sigue vivo. */
export async function hasLiveInboxAtAddress(address: string): Promise<boolean> {
  const canonical = canonicalSocketAddress(address)
  if (canonical === undefined) return false
  for (const record of await readAllRawSessionRecords()) {
    if (!record.sock || canonicalSocketAddress(record.sock) !== canonical) continue
    if (isProcessGone(record.pid)) continue
    if ((record.procStartFt ?? record.procStart) !== undefined) {
      if (await verifyLivePeerAtRecord(record)) return true
      continue
    }
    if (isProcessAlive(record.pid)) return true
  }
  return false
}

/** `qOt`: el par vivo cuyo socket declarado coincide con `address`, si lo hay. */
export async function livePeerByAddress(address: string): Promise<{ pid: number; features: string[] | undefined; sessionId: string | undefined; procStart: string | undefined } | undefined> {
  const canonical = canonicalSocketAddress(address)
  if (canonical === undefined) return undefined
  for (const record of await readAllRawSessionRecords()) {
    if (!record.sock || canonicalSocketAddress(record.sock) !== canonical) continue
    if (await verifyLivePeerAtRecord(record)) {
      return { pid: record.pid, features: record.peerFeatures, sessionId: record.sessionId, procStart: record.procStartFt ?? record.procStart }
    }
  }
  return undefined
}

/** `zRr`: el socket de cada pid en `pids` que siga vivo y con el mismo arranque, por pid. */
export async function liveSocketsByPid(pids: readonly number[]): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  const uniquePids = dedupe(pids)
  if (uniquePids.length === 0) return result
  const dir = defaultSessionsDir()
  const candidates = (await Promise.all(uniquePids.map(pid => readSessionRecordFile(dir, `${pid}.json`)))).filter(
    (record): record is RawSessionRecord => record !== null && Boolean(record.sock),
  )
  const alive = await Promise.all(candidates.map(record => verifyLivePeerAtRecord(record)))
  candidates.forEach((record, index) => {
    if (alive[index] && record.sock) result.set(record.pid, record.sock)
  })
  return result
}
