/**
 * La tabla de candidatos con `[ref]` que ve `/agents`: quién puede recibir un
 * mensaje (main, teammate, subagent, session, cloud-session, bridge-session)
 * y el prefijo mínimo de hash que distingue a cada uno de sus vecinos. Porte
 * de `tj`, `M6`, `DUe`, `oBo`, `R`, `M`, `Me`, `se`, `re`, `IUe`, `hr` y
 * `hmt` (`chunk-6vtp2w5r.js`), con sus auxiliares que aparecieron al portar:
 * `cn`/`vn` (`chunk-9a48b7ac.js`/`chunk-czwr6846.js`, el hash de la clave),
 * `ne`, `D`, `xBt`, `H6`, `G8e`, `OUe`, `nWr`, `W8e`, `mmt`, `jne`, `L`,
 * `gmt`, `HUe`, `VI`, `yk`, `NYn`, `PBt`, `Ne`, `te`, `oWr`, `L0` y `Kv`
 * (`chunk-6vtp2w5r.js`), de 2.1.284.
 *
 * `Ir` (normalización de nombre) es `normalizeSessionName`
 * (`sessionNameState.ts`); `yK` (modo de dirección estable) es
 * `stableAddressEnabled` (`sessionRegistryState.ts`); `JJ` (¿mismo socket,
 * quizá?) es `mayBeSameSocket` (`peerAddress.ts`); `Vde`/`Pn`/`iy` son
 * `localPipeName`/`isUncLikePath`/`hasParentSegment` del mismo archivo; `Ae`
 * es `basename` de `node:path`. Los cuatro se reutilizan tal cual.
 *
 * `_e`/`RA` (el tope de 200 puntos de código de un nombre saneado) es el
 * mismo valor que `MAX_SESSION_NAME` (`sessionNameState.ts`) — se reutiliza
 * en vez de declarar la constante otra vez.
 *
 * `jYn` (minúsculas ASCII, para el token de identidad de un pipe de
 * Windows) no tiene porte propio accesible desde aquí — es la misma
 * función privada de una línea que `peerAddress.ts` ya declara sin
 * exportar, y se repite como lo que es (mismo criterio que
 * `liveSessionRegistry.ts` documenta para `Ye`/`_e`).
 *
 * **Divergencia declarada** — `H6`/`fa` (`resolveOwnTeamLeadIdentity`): el
 * original cae a dos singletons globales (`nk()`, `n().dynamicTeamContext`)
 * cuando `teamContext` no trae `teamName`. Aquí `teamContext` YA es el
 * parámetro de entrada — no hay singleton que leer — así que el porte usa
 * sólo `teamContext?.teamName`, sin esos dos saltos.
 *
 * El estado de la app (`teamContext`, `agentNameRegistry`, `tasks`) y el id
 * de sesión/agente propios entran como parámetros — nunca se leen de un
 * singleton importado.
 */
import { createHash } from 'node:crypto'
import { basename } from 'node:path'

import { mayBeSameSocket } from './peerAddress.ts'
import { hasParentSegment } from './peerAddress.ts'
import { isUncLikePath, localPipeName } from './socketPath.ts'
import { MAX_SESSION_NAME, normalizeSessionName } from './sessionNameState.ts'
import { stableAddressEnabled as defaultStableAddressEnabled } from './sessionRegistryState.ts'

/** `M`: el largo mínimo de un ref, y el piso bajo el que nunca se acorta. */
export const MIN_REF_LENGTH = 6
/** `Um`: el nombre reservado de la sesión principal, en proceso. */
export const MAIN_CANDIDATE_NAME = 'main'
/** `_i`: el nombre reservado del agente líder de un equipo. */
const TEAM_LEAD_NAME = 'team-lead'
/** `T_e`: el nombre reservado de la persona usuaria. */
const USER_RESERVED_NAME = 'user'
/** `q8e`: el nombre reservado del sistema. */
const SYSTEM_RESERVED_NAME = 'system'
/** `ee`: el prefijo de una dirección estable por id de sesión. */
const STABLE_SESSION_ID_PREFIX = 'sid:'
/** `a` de `chunk-8zeg9165.js`, con `r`: la forma de un id de agente autogenerado. */
const AUTO_AGENT_ID = /^a(?:[\w-]{1,63}-)?[0-9a-f]{16}$/

export type PeerCandidateKind = 'main' | 'teammate' | 'subagent' | 'session' | 'cloud-session' | 'bridge-session'
export type PeerCandidateWhere = 'in-process' | 'this-machine' | 'remote' | 'cloud'

/** La forma común de un candidato antes de recibir su `ref`. */
export type PeerCandidate = {
  name: string
  id: string
  kind: PeerCandidateKind
  where: PeerCandidateWhere
  lastActive: number | undefined
  sock: string | undefined
  claimedSessionIds?: readonly string[]
  stableId?: string
  derivedName?: boolean
  hostSessionId?: string
  reportsInbound?: boolean
  offline?: boolean
  inboundReportUnavailable?: boolean
}

export type PeerCandidateWithRef = PeerCandidate & { ref: string }

export type PeerRefTable = {
  candidates: readonly PeerCandidateWithRef[]
  byName: ReadonlyMap<string, PeerCandidateWithRef[]>
  remoteNamesClaimedLocally: ReadonlyMap<string, ReadonlySet<string>>
}

export type PeerTeammate = { name: string }
export type PeerLocalAgentTask = { type: string; startTime?: number }
export type PeerTeamContext = {
  teammates?: Record<string, PeerTeammate>
  leadAgentId?: string
  isLeader?: boolean
  teamName?: string
}

/** `e` de `tj`: el estado de la propia sesión/agente. */
export type PeerAppState = {
  teamContext?: PeerTeamContext
  agentNameRegistry: ReadonlyMap<string, string>
  tasks: Readonly<Record<string, PeerLocalAgentTask | undefined>>
}

export type PeerTeamFileMember = { agentId: string; name: string }

/** El subconjunto de un registro de sesión viva que `tj` necesita. */
export type PeerSessionRecord = {
  name?: string
  cwd: string
  sock: string
  sessionId: string | undefined
  statusUpdatedAt?: number
  bridgeSessionId?: string
  hostSessionId?: string
  nameSource?: string
}

export type PeerCloudSession = {
  id: string
  title?: string
  acceptsPeerMessages?: boolean
  remoteControl?: boolean
  lastActive?: number
  offline?: boolean
}

/** `s.updated_at` del original se recibe aquí como `updatedAt`. */
export type PeerBridgeSession = {
  id: string
  title?: string
  acceptsPeerMessages?: boolean
  inboundReportUnavailable?: boolean
  updatedAt: string
  environmentKind?: string
  connected?: boolean
}

/** `n` de `tj`: el registro de la máquina y de las sesiones remotas. */
export type PeerRegistrySnapshot = {
  teamFile?: { members?: readonly PeerTeamFileMember[] }
  sessions: readonly PeerSessionRecord[]
  cloud?: readonly PeerCloudSession[]
  bridge?: readonly PeerBridgeSession[]
}

/** Lo que `tj`/`oBo`/`Re` leían de un singleton (`Y`, `Ve`, `yK`, `iv.env`). */
export type PeerRefTableDeps = {
  /** `Ve()`: el id del agente propio. */
  ownAgentId: () => string
  /** `Y()`: el id de la sesión propia. */
  ownSessionId: () => string
  /** `yK()`. Por omisión, `stableAddressEnabled` de `sessionRegistryState.ts`. */
  stableAddressEnabled?: () => boolean
  /** `iv.CLAUDE_CODE_MESSAGING_SOCKET`: el socket de mensajería propio, si el proceso lo declaró. */
  ownMessagingSocket?: () => string | undefined
}

/** Lo que `IUe`/`re`/`se` de una sesión necesitan — nunca el registro completo. */
type SessionSocketIdentity = { sock: string; sessionId: string | undefined }
type SessionRecordGroup = { records: SessionSocketIdentity[]; claims: Set<string> }

/** `R`: la clave hash de `kind:address`, en hexadecimal, de 12 caracteres. */
export function hashCandidateKey(kind: string, address: string): string {
  return createHash('sha256').update(`${kind}:${address}`).digest('hex').slice(0, 12)
}

/** `ne`: cuántos caracteres iniciales comparten dos cadenas. */
function commonPrefixLength(a: string, b: string): number {
  let length = 0
  while (length < a.length && length < b.length && a[length] === b[length]) length++
  return length
}

/** `D`: los valores únicos de `values`, sin repetir su primer orden de aparición. */
function dedupeValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

/** `Me`: si `prefix` (de al menos `MIN_REF_LENGTH`) identifica a `kind`/`address`. */
export function refMatchesCandidate(prefix: string, kind: string, address: string): boolean {
  return prefix.length >= MIN_REF_LENGTH && hashCandidateKey(kind, address).startsWith(prefix)
}

/** `W8e`: una dirección ya expresada como id de sesión estable (`sid:...`). */
function isStableSessionAddress(address: string): boolean {
  return address.startsWith(STABLE_SESSION_ID_PREFIX)
}

/** `mmt`: la dirección estable de un id de sesión. */
function stableSessionAddress(sessionId: string): string {
  return `${STABLE_SESSION_ID_PREFIX}${sessionId}`
}

/** `IUe`: un registro de sesión con un socket normal, no ya expresado como `sid:`. */
export function isRegularSessionRecord(session: SessionSocketIdentity): boolean {
  return !isStableSessionAddress(session.sock)
}

/** `re`: agrupa registros que `mayBeSameSocket` considera el mismo par, con sus ids reclamados. */
export function groupSessionsBySocketIdentity<T extends SessionSocketIdentity>(sessions: readonly T[]): Map<T, SessionRecordGroup> {
  let groups: { records: T[]; claims: Set<string> }[] = []
  for (const session of sessions) {
    const merged = groups.filter(group => group.records.some(record => mayBeSameSocket(record.sock, session.sock)))
    const next: { records: T[]; claims: Set<string> } = { records: [], claims: new Set() }
    for (const group of merged) {
      next.records.push(...group.records)
      for (const claim of group.claims) next.claims.add(claim)
    }
    next.records.push(session)
    if (session.sessionId !== undefined) next.claims.add(session.sessionId)
    groups = groups.filter(group => !merged.includes(group))
    groups.push(next)
  }
  const byRecord = new Map<T, SessionRecordGroup>()
  for (const group of groups) for (const record of group.records) byRecord.set(record, group)
  return byRecord
}

/** `se`: los ids de sesión que colisionan con la propia sesión o con otro registro. */
export function ambiguousSessionIds<T extends SessionSocketIdentity>(
  ownSessionId: string,
  sessions: readonly T[],
  groupsByRecord: ReadonlyMap<T, SessionRecordGroup>,
): Set<string> {
  const seen = new Set<string>([ownSessionId])
  const ambiguous = new Set<string>()
  for (const session of sessions) {
    if (session.sessionId === undefined) continue
    if (seen.has(session.sessionId)) ambiguous.add(session.sessionId)
    seen.add(session.sessionId)
  }
  for (const group of new Set(groupsByRecord.values())) {
    if (group.records.length > 1) for (const claim of group.claims) ambiguous.add(claim)
  }
  return ambiguous
}

/** `hr`: un id de sesión de puente o de nube, sin su prefijo `session_`/`cse_`. */
export function normalizeBridgeOrCloudId(id: string): string {
  return id.replace(/^(?:session|cse)_/, '')
}

/** `hmt`: los ids de puente (normalizados) que ya tienen una sesión local. */
export function linkedBridgeSessionIds(sessions: readonly Pick<PeerSessionRecord, 'bridgeSessionId'>[]): Set<string> {
  return new Set(sessions.flatMap(session => (session.bridgeSessionId ? [normalizeBridgeOrCloudId(session.bridgeSessionId)] : [])))
}

/** `PBt`: si una sesión de nube ya tiene una sesión local enlazada por `bridgeSessionId`. */
function isCloudSessionLinkedLocally(sessions: readonly Pick<PeerSessionRecord, 'bridgeSessionId'>[], cloudId: string): boolean {
  const normalized = normalizeBridgeOrCloudId(cloudId)
  return sessions.some(session => session.bridgeSessionId !== undefined && normalizeBridgeOrCloudId(session.bridgeSessionId) === normalized)
}

/** `L0`: la identidad `<nombre>@<ámbito>` de un agente de equipo sintético. */
function composeAtIdentity(name: string, scope: string): string {
  return `${name}@${scope}`
}

/**
 * `H6`, simplificado (ver divergencia declarada en la cabecera): el id con
 * que la propia sesión aparece como teammate, si es la líder del equipo.
 */
function resolveOwnTeamLeadIdentity(teamContext: PeerTeamContext | undefined): string | undefined {
  if (teamContext?.leadAgentId !== undefined && teamContext.isLeader !== false) return teamContext.leadAgentId
  const teamName = teamContext?.teamName
  return teamName !== undefined ? composeAtIdentity(TEAM_LEAD_NAME, teamName) : undefined
}

/** `G8e`: si esta entrada de teammate es la propia sesión, bajo su nombre de líder. */
function isOwnTeamLeadTeammateEntry(entry: { name: string; agentId: string }, ownTeamLeadId: string | undefined): boolean {
  return entry.name === TEAM_LEAD_NAME && ownTeamLeadId !== undefined && entry.agentId === ownTeamLeadId
}

/** `OUe`: una sesión de puente que en realidad vive en la nube (no es un entorno `bridge`). */
function isCloudEnvironment(session: Pick<PeerBridgeSession, 'environmentKind'>): boolean {
  return session.environmentKind !== undefined && session.environmentKind !== 'bridge'
}

/** `nWr`: una sesión de puente remota (no de nube) que está desconectada. */
function isBridgeSessionOffline(session: Pick<PeerBridgeSession, 'environmentKind' | 'connected'>): boolean {
  return !isCloudEnvironment(session) && session.connected === false
}

/** `jne`: el nombre saneado — controles fuera salvo espacio, colapsado, recortado a 200 puntos de código. */
function sanitizeCandidateDisplayName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const collapsed = name
    .replace(/[\p{Cc}\p{Cf}]/gu, character => (/\s/.test(character) ? character : ''))
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(collapsed).slice(0, MAX_SESSION_NAME).join('').trim() || 'untitled session'
}

/** `tN`: la forma de un nombre candidato no es una ruta UNC, salvo que sea un pipe local utilizable. */
function isValidNameShape(name: string): boolean {
  if (!isUncLikePath(name)) return true
  return localPipeName(name) !== undefined
}

/** `gmt`: el nombre, tal cual o normalizado, se lee como una dirección o una ruta de socket. */
function looksLikeAddressOrSocketPath(name: string): boolean {
  const normalized = normalizeSessionName(name)
  return parseAddressScheme(name) !== 'other' || parseAddressScheme(normalized) !== 'other' || looksLikeSocketPathPrefix(name) || looksLikeSocketPathPrefix(normalized)
}

/** `Eh`: el esquema de una dirección (`uds`/`bridge`/`did`/`other`), sin decodificar el destino. */
function parseAddressScheme(address: string): 'uds' | 'bridge' | 'did' | 'other' {
  if (address.startsWith('uds:') || address.startsWith('bridge:') || address.startsWith('did:')) return address.startsWith('uds:') ? 'uds' : address.startsWith('bridge:') ? 'bridge' : 'did'
  if (/^\/\S*\.sock$/.test(address) || /^[\\/]{2}[.?][\\/]pipe[\\/]/i.test(address)) return 'uds'
  return 'other'
}

/** `cWr`: el prefijo de una ruta de socket (`/algo.sock...`). */
function looksLikeSocketPathPrefix(text: string): boolean {
  return /^\/\S*\.sock/.test(text)
}

/** `L`: el nombre es un candidato válido de nombre de sesión/agente. */
function isPlausibleDisplayName(name: string): boolean {
  return !looksLikeAddressOrSocketPath(name) && isValidNameShape(name) && !name.includes('@') && name !== '*'
}

/** `yk`: si `value` tiene la forma de un id de agente autogenerado. */
function looksLikeAutoAgentId(value: string): string | null {
  return AUTO_AGENT_ID.test(value) ? value : null
}

/** `VI`: un nombre normalizado que coincide con uno reservado, o con la forma de un id de agente. */
function isReservedCandidateName(name: string): boolean {
  const normalized = normalizeSessionName(name)
  return (
    normalized === MAIN_CANDIDATE_NAME ||
    normalized === TEAM_LEAD_NAME ||
    normalized === USER_RESERVED_NAME ||
    normalized === SYSTEM_RESERVED_NAME ||
    looksLikeAutoAgentId(normalized) !== null
  )
}

/** `HUe`: `value` no es una cadena, o es un nombre reservado/sensible. */
function isReservedOrSensitiveName(value: unknown): boolean {
  return typeof value !== 'string' || isReservedCandidateName(value)
}

/** `NYn`: el título está vacío, no se sanea, o sanea a "untitled session" sin serlo textualmente. */
function isDerivedOrEmptyTitle(title: unknown): boolean {
  const trimmed = typeof title === 'string' ? title.trim() : ''
  const sanitized = sanitizeCandidateDisplayName(trimmed)
  return !trimmed || !sanitized || (sanitized === 'untitled session' && trimmed.toLowerCase() !== 'untitled session')
}

/** `xBt`: la fuente del ref de un candidato — su id estable si lo tiene, si no su id. */
function referenceIdSource(candidate: Pick<PeerCandidate, 'id' | 'stableId'>): string {
  return candidate.stableId ?? candidate.id
}

/** `jYn`, repetida como lo que es (una línea, privada en `peerAddress.ts`, sin porte propio aquí). */
function lowerAscii(text: string): string {
  return text.replace(/[A-Z]/g, character => character.toLowerCase())
}

/** `Kv`: el token de identidad de una dirección — el pipe de Windows en minúsculas, o la ruta resuelta. */
function sessionIdentityToken(address: string): string | undefined {
  const pipeName = localPipeName(address)
  if (pipeName !== undefined) return `\\\\.\\pipe\\${lowerAscii(pipeName)}`
  if (hasParentSegment(address)) return undefined
  return address
}

/** `oWr`: la forma con la que se anuncia la propia dirección — estable si el modo lo pide. */
function resolveOwnAddressForm(address: string, deps: PeerRefTableDeps): string {
  const stableAddress = deps.stableAddressEnabled ?? defaultStableAddressEnabled
  return stableAddress() ? stableSessionAddress(deps.ownSessionId()) : address
}

/** `te`: las formas equivalentes de una dirección propia — la estable (si difiere) y la cruda. */
function ownAddressAliases(address: string, deps: PeerRefTableDeps): string[] {
  const resolved = resolveOwnAddressForm(address, deps)
  return resolved === address ? [address] : [resolved, address]
}

/** `Ne`: las direcciones con que la propia sesión de mensajería puede reservarse un ref. */
function ownMessagingSocketAddressAliases(deps: PeerRefTableDeps): string[] {
  const sock = deps.ownMessagingSocket?.()
  return sock === undefined ? [] : ownAddressAliases(sock, deps)
}

/** `Re`: el ref mínimo (≥ `MIN_REF_LENGTH`) que distingue a cada candidato de sus vecinos de hash. */
function allocateCandidateRefs<T extends PeerCandidate>(candidates: readonly T[], deps: PeerRefTableDeps): (T & { ref: string })[] {
  const keys = candidates.map(candidate => hashCandidateKey(candidate.kind, referenceIdSource(candidate)))
  const paddingKeys = ownMessagingSocketAddressAliases(deps).map(address => hashCandidateKey('session', address))
  const sorted = dedupeValues([...keys, ...paddingKeys]).sort()
  const refLengthByKey = new Map<string, number>()
  for (let index = 0; index < sorted.length; index++) {
    const key = sorted[index]!
    const prevOverlap = index > 0 ? commonPrefixLength(key, sorted[index - 1]!) : 0
    const nextOverlap = index + 1 < sorted.length ? commonPrefixLength(key, sorted[index + 1]!) : 0
    refLengthByKey.set(key, Math.min(key.length, Math.max(MIN_REF_LENGTH, Math.max(prevOverlap, nextOverlap) + 1)))
  }
  return candidates.map((candidate, index) => {
    const key = keys[index]!
    return { ...candidate, ref: key.slice(0, refLengthByKey.get(key)!) }
  })
}

/** `M6`: la forma con que se muestra un candidato — su nombre y su `[ref]`. */
export function formatPeerWithRef(candidate: { name: string; ref: string }): string {
  return `${candidate.name} [${candidate.ref}]`
}

/** `DUe`: el ref crudo (sin comprobar colisiones) de la propia sesión bajo `kind`/`address`. */
export function ownSessionRef(kind: string, address: string): string {
  return hashCandidateKey(kind, address).slice(0, MIN_REF_LENGTH)
}

/**
 * `oBo`: si el socket propio necesita su ref largo (el de `DUe` sobre el
 * socket, en vez del de `DUe` sobre la dirección estable) porque colisiona
 * con otro registro de sesión. `force` corresponde al tercer parámetro
 * (`r`) del original.
 */
export function shouldUseOwnSocketRef(sessions: readonly Pick<PeerSessionRecord, 'sock' | 'sessionId'>[], ownSocket: string | undefined, deps: PeerRefTableDeps, force = false): boolean {
  if (force) return true
  const ownSessionId = deps.ownSessionId()
  const regular = sessions.filter(isRegularSessionRecord)
  const withOwn: SessionSocketIdentity[] = ownSocket !== undefined ? [...regular, { sock: ownSocket, sessionId: ownSessionId }] : regular
  const groups = groupSessionsBySocketIdentity(withOwn)
  // el original llama a `se("",…)`: la sesión propia YA está en `withOwn` como
  // registro sintético, así que la semilla no repite su id — repetirla la haría
  // colisionar consigo misma y `oBo` diría siempre `true`.
  return ambiguousSessionIds('', withOwn, groups).has(ownSessionId)
}

/**
 * `tj`: la tabla de candidatos con quien se puede hablar, cada uno con su
 * `ref` mínimo, agrupados por nombre normalizado, más los nombres remotos
 * (nube/puente) que ya tienen una sesión local y no aparecen sueltos.
 */
export function buildPeerRefTable(app: PeerAppState, registry: PeerRegistrySnapshot, deps: PeerRefTableDeps): PeerRefTable {
  const candidates: PeerCandidate[] = []
  candidates.push({ name: MAIN_CANDIDATE_NAME, id: deps.ownAgentId(), kind: 'main', where: 'in-process', lastActive: undefined, sock: undefined })

  const knownTeammateAgentIds = new Set<string>()
  for (const [agentId, teammate] of Object.entries(app.teamContext?.teammates ?? {})) {
    knownTeammateAgentIds.add(agentId)
    candidates.push({ name: teammate.name, id: agentId, kind: 'teammate', where: 'in-process', lastActive: undefined, sock: undefined })
  }

  for (const [name, agentId] of app.agentNameRegistry) {
    const task = app.tasks[agentId]
    const localAgentTask = task?.type === 'local_agent' ? task : undefined
    candidates.push({ name, id: agentId, kind: 'subagent', where: 'in-process', lastActive: localAgentTask?.startTime, sock: undefined })
  }

  for (const member of registry.teamFile?.members ?? []) {
    if (knownTeammateAgentIds.has(member.agentId)) continue
    knownTeammateAgentIds.add(member.agentId)
    candidates.push({ name: member.name, id: member.agentId, kind: 'teammate', where: 'this-machine', lastActive: undefined, sock: undefined })
  }

  const stableAddress = (deps.stableAddressEnabled ?? defaultStableAddressEnabled)()
  const regularSessions = registry.sessions.filter(isRegularSessionRecord)
  const sessionGroups = stableAddress ? groupSessionsBySocketIdentity(regularSessions) : undefined
  const ambiguous = stableAddress ? ambiguousSessionIds(deps.ownSessionId(), regularSessions, sessionGroups!) : undefined
  for (const session of regularSessions) {
    const claims = sessionGroups?.get(session)?.claims
    candidates.push({
      name: session.name || basename(session.cwd),
      id: session.sock,
      kind: 'session',
      where: 'this-machine',
      lastActive: session.statusUpdatedAt,
      sock: session.sock,
      ...(claims !== undefined && claims.size > 0 && { claimedSessionIds: [...claims].sort() }),
      ...(stableAddress && session.sessionId !== undefined && !ambiguous!.has(session.sessionId) && { stableId: stableSessionAddress(session.sessionId) }),
      ...(stableAddress && session.nameSource === 'derived' && { derivedName: true }),
      ...(session.hostSessionId !== undefined && { hostSessionId: session.hostSessionId }),
    })
  }

  const bridgeSocksByNormalizedId = new Map<string, string[]>()
  for (const session of registry.sessions) {
    if (session.bridgeSessionId !== undefined) {
      const normalized = normalizeBridgeOrCloudId(session.bridgeSessionId)
      bridgeSocksByNormalizedId.set(normalized, [...(bridgeSocksByNormalizedId.get(normalized) ?? []), session.sock])
    }
  }

  const collapsedRemote: { rawName: string; socks: string[] }[] = []
  for (const cloud of registry.cloud ?? []) {
    if (isCloudSessionLinkedLocally(registry.sessions, cloud.id)) {
      collapsedRemote.push({ rawName: cloud.title || 'untitled', socks: bridgeSocksByNormalizedId.get(normalizeBridgeOrCloudId(cloud.id)) ?? [] })
      continue
    }
    candidates.push({
      name: cloud.title || 'untitled',
      id: cloud.id,
      kind: 'cloud-session',
      where: cloud.remoteControl ? 'remote' : 'cloud',
      lastActive: cloud.lastActive,
      sock: undefined,
      ...(isDerivedOrEmptyTitle(cloud.title) && { derivedName: true }),
      ...(cloud.acceptsPeerMessages === true && { reportsInbound: true }),
      ...(cloud.offline && { offline: true }),
    })
  }

  const linkedCloudIds = new Set((registry.cloud ?? []).map(cloud => normalizeBridgeOrCloudId(cloud.id)))
  const linkedBridgeIds = linkedBridgeSessionIds(registry.sessions)
  for (const bridge of registry.bridge ?? []) {
    const normalized = normalizeBridgeOrCloudId(bridge.id)
    if (linkedCloudIds.has(normalized)) continue
    if (linkedBridgeIds.has(normalized)) {
      collapsedRemote.push({ rawName: bridge.title || 'untitled', socks: bridgeSocksByNormalizedId.get(normalized) ?? [] })
      continue
    }
    const updatedAtMs = Date.parse(bridge.updatedAt)
    candidates.push({
      name: bridge.title || 'untitled',
      id: bridge.id,
      kind: 'bridge-session',
      where: isCloudEnvironment(bridge) ? 'cloud' : 'remote',
      lastActive: Number.isNaN(updatedAtMs) ? undefined : updatedAtMs,
      sock: undefined,
      ...(isDerivedOrEmptyTitle(bridge.title) && { derivedName: true }),
      ...(bridge.acceptsPeerMessages === true && { reportsInbound: true }),
      ...(bridge.inboundReportUnavailable && { inboundReportUnavailable: true }),
      ...(isBridgeSessionOffline(bridge) && { offline: true }),
    })
  }

  const ownTeamLeadId = resolveOwnTeamLeadIdentity(app.teamContext)
  const sanitized = candidates.flatMap((candidate): PeerCandidate[] => {
    const name = sanitizeCandidateDisplayName(candidate.name)
    if (name === null || !isPlausibleDisplayName(name)) return []
    const isProtected = candidate.kind === 'main' || (candidate.kind === 'teammate' && isOwnTeamLeadTeammateEntry({ name: candidate.name, agentId: candidate.id }, ownTeamLeadId))
    const isNamedMain =
      (candidate.kind === 'session' || candidate.kind === 'cloud-session' || candidate.kind === 'bridge-session') && normalizeSessionName(name) === MAIN_CANDIDATE_NAME
    return isProtected || isNamedMain || !isReservedOrSensitiveName(name) ? [{ ...candidate, name }] : []
  })

  const seenSessionIdentities = new Set<string>()
  const deduped = sanitized.filter(candidate => {
    if (candidate.kind !== 'session') return true
    const key = `${normalizeSessionName(candidate.name)}\u0000${sessionIdentityToken(candidate.id) ?? candidate.id}`
    if (seenSessionIdentities.has(key)) return false
    seenSessionIdentities.add(key)
    return true
  })

  const withRefs = allocateCandidateRefs(deduped, deps)

  const byName = new Map<string, PeerCandidateWithRef[]>()
  for (const candidate of withRefs) {
    const key = normalizeSessionName(candidate.name)
    const bucket = byName.get(key)
    if (bucket) bucket.push(candidate)
    else byName.set(key, [candidate])
  }

  const remoteNamesClaimedLocally = new Map<string, Set<string>>()
  for (const { rawName, socks } of collapsedRemote) {
    const name = sanitizeCandidateDisplayName(rawName)
    if (name === null || !isPlausibleDisplayName(name)) continue
    const key = normalizeSessionName(name)
    const socketSet = remoteNamesClaimedLocally.get(key) ?? new Set<string>()
    for (const sock of socks) socketSet.add(sock)
    remoteNamesClaimedLocally.set(key, socketSet)
  }

  return { candidates: withRefs, byName, remoteNamesClaimedLocally }
}
