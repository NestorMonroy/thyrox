/**
 * El texto de `/list-agents`, en sus dos formas: `formatForModel` (`aYo`) lo
 * compacto que el modelo recibe como resultado de la herramienta, y
 * `formatForUser` (`ulr`) lo que ve la persona. Porte de `aYo`, `ulr`, `H`,
 * `R`, `F`, `M`, `X`, `v`, `I`, `j`, `D`, `E`, `q`, `z`, `V`, `Y`, `J`, `C`,
 * `B`, `y`, `Q`, `w` y las constantes `L`, `O`, `_`, `k`, `W`, `G`, `N`, `K`
 * (`chunk-7h1n9jsx.js`), de `Wne`, `jne`, `gmt`, `RBt`, `HUe`, `G8e`, `H6`,
 * `OUe` y `nWr` (`chunk-6vtp2w5r.js`) y de `sRr` (`chunk-jzr0ww3p.js`), todos
 * de 2.1.284. `Ir` ya existe como `normalizeSessionName`
 * (`sessionNameState.ts`); `tN` ya existe como `isUsableLocalSocketAddress`,
 * y `cWr`/`Eh` como `looksLikeSocketPath`/`parseAddress`
 * (`peerAddress.ts`); `_e`/`RA` (200) ya existe como `MAX_SESSION_NAME`
 * (`sessionNameState.ts`); `Zt` con `mostSignificantOnly` ya existe como
 * `formatDuration` (`@thyrox/output/formatters`); `x` era `basename` de
 * `node:path`, sin porte propio.
 *
 * `tj`/`M6`/`oBo` (la tabla de refs de pares y su formato, y si el socket
 * propio necesita su ref larga) los porta `peerRefTable.ts` en paralelo:
 * llegan aquí como `PeerRefDependencies` inyectada; de ese módulo sólo se
 * importan los tipos del candidato.
 *
 * Lo que NO se porta, y por qué:
 * - `U` (`chunk-7h1n9jsx.js`): sólo lo usa `clr`/`dlr`, el orquestador
 *   asíncrono que arma `e`/`n` a partir del entorno del proceso — este ítem
 *   excluye ambos explícitamente. Portarlo exigiría importar cuatro
 *   singletons de proceso (`gq`, `Wv`, `dRr`, más `DUe`/`oWr` del otro
 *   ítem) que ninguna función de este módulo necesita.
 * - El parámetro `didWarnings` de `aYo` y la variable `A` (sesiones `did`)
 *   que calculaba: ninguno de los dos se lee en el cuerpo original de
 *   `aYo` — código muerto en la fuente, no portado aquí.
 * - El respaldo de `H6` (`fa()`) y el de `localTeammates`/`M` (`oT()`)
 *   cuando no hay `teamContext`: los dos leen el mismo
 *   `AsyncLocalStorage` de `chunk-cap10ns2.js` (`nk()`, equipos dinámicos
 *   antes de que el `teamContext` esté poblado), infraestructura de swarm
 *   ajena a este paquete. El campo `teamContext.teamName`, que SÍ llega
 *   siempre que hay `teamContext`, cubre el caso común de `H6`; quien
 *   invoque `localTeammates` sin `teamContext` puede inyectar su propio
 *   `callerTeammateId` para el caso que cubría `oT()`.
 * - `isReservedName` (`VI`) incluye el patrón de id de agente (`yk`,
 *   `chunk-8zeg9165.js`) inline: es una comprobación de cadena de una
 *   línea, no un módulo aparte.
 */
import { basename } from 'node:path'

import { PRODUCT_NAME } from '@thyrox/config/product'
import { formatDuration } from '@thyrox/output/formatters'

import { looksLikeSocketPath, parseAddress } from './peerAddress.ts'
import { MAX_SESSION_NAME, normalizeSessionName } from './sessionNameState.ts'
import type { PeerCandidateKind, PeerCandidateWithRef, PeerRefTable } from './peerRefTable.ts'
import { stableAddressEnabled } from './sessionRegistryState.ts'
import { isUsableLocalSocketAddress } from './socketPath.ts'

// ---------------------------------------------------------------------------
// Constantes verbatim
// ---------------------------------------------------------------------------

/** `Um`. */
const MAIN_SESSION_NAME = 'main'
/** `_i`. */
const TEAM_LEAD_AGENT_NAME = 'team-lead'
/** `T_e`. */
const RESERVED_NAME_USER = 'user'
/** `q8e`. */
const RESERVED_NAME_SYSTEM = 'system'
/** `yk`: un identificador de agente generado (`a<slug->[16 hex]`). */
const AGENT_ID_PATTERN = /^a(?:[\w-]{1,63}-)?[0-9a-f]{16}$/
/** `rjn`. */
const REMOTE_CONTROL_LABEL = 'Remote Control'
/** `oHt`. */
const PEER_MESSAGING_OFF_LABEL = "can't receive cross-session messages (off in that session)"
/** `L`. */
const UNREACHABLE_FROM_CLOUD_LABEL = 'not reachable from this cloud session'
/** `O`. */
const HOST_SESSION_LABEL = `${PRODUCT_NAME} Desktop session`
/** `_`. */
const LIST_TRUNCATED_NOTICE =
  '(session list too long to fetch completely — sessions beyond the first pages are missing from this listing)'
/** `k`. */
const MESSAGING_DISABLED_NOTICE =
  'Cross-session messaging is switched off in this session right now — no sessions were listed, and this session is not reachable by name until it is switched back on.'
/** `W`. */
const LOCAL_LIST_FAILED_NOTICE =
  '(the session list on this machine could not be read just now — other local sessions may be missing from this listing; a later listing retries)'
/** `G`: tope de `j`/`truncatedSection`. */
const TRUNCATED_SECTION_LIMIT = 100
/** `N`: tope de pares por bridge en `V`/`peerSessionsSectionForModel`. */
const BRIDGE_PEER_LIMIT = 100
/** `K`: edad máxima para mostrar hace cuánto empezó/se unió. */
const SINCE_DISPLAY_MAX_AGE_MS = 315360000000
/** `JBr`, de `chunk-swk3rjnt.js`: ventana para mostrar un nombre anterior. */
const FORMER_NAME_DISPLAY_WINDOW_MS = 600000
/** Del `tmux` de `V`: sin espacios, sin `/`/`\`, sin control/format, 1-64. */
const TMUX_PANE_NAME_PATTERN = /^[^\s/\\\p{Cc}\p{Cf}]{1,64}$/u

// ---------------------------------------------------------------------------
// Tipos del estado inyectado
// ---------------------------------------------------------------------------

export interface ListAgentsTeammateContextEntry {
  readonly name: string
  readonly agentType: string
  readonly tmuxPaneId: string
  readonly spawnedAt: number
}

export interface ListAgentsTeamContext {
  readonly teammates: Record<string, ListAgentsTeammateContextEntry>
  readonly selfAgentId?: string
  readonly isLeader?: boolean
  readonly leadAgentId?: string
  readonly teamName?: string
}

export type ListAgentsTask =
  | { readonly type: 'local_agent'; readonly id: string; readonly agentType: string; readonly status: string; readonly startTime: number }
  | { readonly type: 'in_process_teammate'; readonly identity: { readonly agentId: string }; readonly isIdle: boolean; readonly status: string }
  | { readonly type: string }

type LocalAgentTask = Extract<ListAgentsTask, { readonly type: 'local_agent' }>
type InProcessTeammateTask = Extract<ListAgentsTask, { readonly type: 'in_process_teammate' }>

function isLocalAgentTask(task: ListAgentsTask): task is LocalAgentTask {
  return task.type === 'local_agent'
}

function isInProcessTeammateTask(task: ListAgentsTask): task is InProcessTeammateTask {
  return task.type === 'in_process_teammate'
}

export interface ListAgentsAppState {
  readonly agentNameRegistry: ReadonlyMap<string, string>
  readonly tasks: Record<string, ListAgentsTask>
  readonly teamContext?: ListAgentsTeamContext
}

export interface TeamFileMember {
  readonly agentId: string
  readonly name: string
  readonly agentType: string
  readonly joinedAt: number
}

export interface TeamFile {
  readonly members: readonly TeamFileMember[]
}

export interface OwnSessionInfo {
  readonly token: string
  readonly socketToken: string
  readonly sock: string | undefined
  readonly callerIsSubagent: boolean
  readonly nameIsUserChosen: boolean
}

export interface FormerNameRecord {
  readonly name: string
  readonly until: number
}

export interface UdsSession {
  readonly sock: string
  readonly name?: string
  readonly cwd: string
  readonly kind: string
  readonly status: string
  readonly hostSessionId?: string
  readonly tmux?: string
  readonly startedAt: number
  readonly nameSource?: string
  readonly formerNames?: readonly FormerNameRecord[]
}

export interface CloudSession {
  readonly id: string
  readonly title?: string
  readonly remoteControl?: boolean
  readonly offline?: boolean
  readonly workerStatus?: string
  readonly lastActive?: number
  readonly unreachableFromHere?: boolean
  readonly acceptsPeerMessages?: boolean
}

export interface BridgeSession {
  readonly id: string
  readonly title?: string
  readonly status?: string
  readonly acceptsPeerMessages?: boolean
  readonly environmentKind?: string
  readonly connected?: boolean
}

export type PeerEntry =
  | { readonly transport: 'uds'; readonly address?: string; readonly session: UdsSession }
  | { readonly transport: 'cloud'; readonly address?: string; readonly session: CloudSession }
  | { readonly transport: 'bridge'; readonly address?: string; readonly session: BridgeSession }
  | { readonly transport: 'did'; readonly address?: string; readonly session: unknown }

// ---------------------------------------------------------------------------
// La tabla de refs de pares — la construye `peerRefTable.ts`, llega inyectada
// ---------------------------------------------------------------------------

/**
 * Lo único de la tabla que el formato lee: sus candidatos con `ref`. Los tipos
 * vienen de `peerRefTable.ts`; la construcción sigue inyectada porque el
 * formato recibe sesiones con su propia forma (`UdsSession`, `CloudSession`,
 * `BridgeSession`) y quien lo invoca adapta al `PeerRegistrySnapshot`.
 */
export type PeerRefCandidates = Pick<PeerRefTable, 'candidates'>

export interface PeerRefTableOptions {
  readonly teamFile: TeamFile | null | undefined
  readonly sessions: readonly UdsSession[]
  readonly cloud: readonly CloudSession[]
  readonly bridge: readonly BridgeSession[]
}

export interface PeerRefDependencies {
  /** `tj`. */
  buildPeerRefTable: (appState: ListAgentsAppState, options: PeerRefTableOptions) => PeerRefCandidates
  /** `M6`. */
  formatWithRef: (candidate: { readonly name: string; readonly ref: string }) => string
  /** `oBo`. */
  ownSocketNeedsLongRef: (sessions: readonly UdsSession[], ownSock: string | undefined, ownEndpointShadowed: boolean) => boolean
}

// ---------------------------------------------------------------------------
// Nombres reservados y direcciones — `VI`, `HUe`, `gmt`, `RBt`
// ---------------------------------------------------------------------------

/** `VI`: nombres que no se pueden asignar como nombre de sesión/teammate. */
export function isReservedName(value: string): boolean {
  const normalized = normalizeSessionName(value)
  return (
    normalized === MAIN_SESSION_NAME ||
    normalized === TEAM_LEAD_AGENT_NAME ||
    normalized === RESERVED_NAME_USER ||
    normalized === RESERVED_NAME_SYSTEM ||
    AGENT_ID_PATTERN.test(normalized)
  )
}

/** `HUe`: no es una cadena, o es un nombre reservado. */
export function isUnsafeName(value: unknown): boolean {
  return typeof value !== 'string' || isReservedName(value)
}

/** `gmt`: el nombre, tal cual o normalizado, se lee como una dirección. */
export function looksLikeAddress(value: string): boolean {
  const normalized = normalizeSessionName(value)
  return (
    parseAddress(value).scheme !== 'other' ||
    parseAddress(normalized).scheme !== 'other' ||
    looksLikeSocketPath(value) ||
    looksLikeSocketPath(normalized)
  )
}

/** `L`: nombre que se puede dar por bueno para dirigirse a alguien. */
function isAddressableName(value: string): boolean {
  return !looksLikeAddress(value) && isUsableLocalSocketAddress(value) && !value.includes('@') && value !== '*'
}

/** `jne`: recortado a `MAX_SESSION_NAME` puntos de código, o `null` si no es texto. */
export function trimmedOrUntitled(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const collapsed = value
    .replace(/[\p{Cc}\p{Cf}]/gu, character => (/\s/.test(character) ? character : ''))
    .replace(/\s+/g, ' ')
    .trim()
  const clipped = [...collapsed].slice(0, MAX_SESSION_NAME).join('').trim()
  return clipped || 'untitled session'
}

/** `Wne`: el nombre recortado, o `null` si no es texto o se lee como dirección. */
export function cleanedDisplayName(value: unknown): string | null {
  const cleaned = trimmedOrUntitled(value)
  return cleaned !== null && !looksLikeAddress(cleaned) && isUsableLocalSocketAddress(cleaned) ? cleaned : null
}

/** `RBt`: el nombre propio, si es válido para dirigirse a él y no está reservado. */
export function ownDisplayName(value: unknown): string | null {
  const cleaned = trimmedOrUntitled(value)
  return cleaned !== null && isAddressableName(cleaned) && !isReservedName(cleaned) ? cleaned : null
}

/** `G8e`: si el candidato es el marcador sintético del líder del equipo. */
export function isTeamLeadPlaceholder(candidate: { readonly name: string; readonly agentId: string }, teamLeadId: string | undefined): boolean {
  return candidate.name === TEAM_LEAD_AGENT_NAME && teamLeadId !== undefined && candidate.agentId === teamLeadId
}

/**
 * `H6`: el id que representa al líder del equipo — directo si `leadAgentId`
 * está fijado y esta sesión no dejó de ser líder; si no, un marcador
 * sintético `team-lead@<teamName>` cuando hay `teamName`.
 */
export function teamLeadAgentId(appState: ListAgentsAppState): string | undefined {
  const team = appState.teamContext
  if (team?.leadAgentId !== undefined && team.isLeader !== false) return team.leadAgentId
  return team?.teamName !== undefined ? `${TEAM_LEAD_AGENT_NAME}@${team.teamName}` : undefined
}

/** `OUe`: el entorno se comporta como UDS (no es un bridge). */
export function isUdsLikeEnvironment(session: { readonly environmentKind?: string }): boolean {
  return session.environmentKind !== undefined && session.environmentKind !== 'bridge'
}

/** `nWr`: un entorno tipo UDS desconectado. */
export function isOfflineUdsLikeEnvironment(session: { readonly environmentKind?: string; readonly connected?: boolean }): boolean {
  return !isUdsLikeEnvironment(session) && session.connected === false
}

/** `sRr`: `"cloud"` o `"Remote Control"` según el tipo de entorno del bridge. */
export function cloudSessionKindLabel(session: BridgeSession): string {
  return isUdsLikeEnvironment(session) ? 'cloud' : REMOTE_CONTROL_LABEL
}

// ---------------------------------------------------------------------------
// Subagents y teammates locales — `F`, `M`, `X`
// ---------------------------------------------------------------------------

export interface SubagentEntry {
  readonly agentId: string
  readonly name: string | undefined
  readonly agentType: string
  readonly status: string
  readonly startTime: number
}

/** `F`: los subagentes locales que no son la sesión principal. */
export function localSubagents(appState: ListAgentsAppState): SubagentEntry[] {
  const nameByAgentId = new Map<string, string>()
  for (const [name, agentId] of appState.agentNameRegistry) nameByAgentId.set(agentId, name)
  const teammateNames = new Set(Object.values(appState.teamContext?.teammates ?? {}).map(teammate => teammate.name))
  const entries: SubagentEntry[] = []
  for (const task of Object.values(appState.tasks)) {
    if (!isLocalAgentTask(task) || task.agentType === 'main-session') continue
    const registeredName = nameByAgentId.get(task.id)
    entries.push({
      agentId: task.id,
      name: registeredName !== undefined && teammateNames.has(registeredName) ? undefined : registeredName,
      agentType: task.agentType,
      status: task.status,
      startTime: task.startTime,
    })
  }
  return entries
}

export type TeammateBackend = 'in-process' | 'pane' | 'roster'
export type TeammateNameShadow = false | 'unreachable' | 'bare-only'

export interface TeammateEntry {
  readonly teammateId: string
  readonly name: string
  readonly agentType: string
  readonly status: string | undefined
  readonly backend: TeammateBackend
  readonly since: number
  readonly nameShadowed: TeammateNameShadow
}

/** `X`: si el nombre de un teammate del roster queda tapado por un subagente. */
function teammateNameShadowStatus(name: string, appState: ListAgentsAppState, normalizedRegistryNames: ReadonlySet<string>): TeammateNameShadow {
  const cleaned = trimmedOrUntitled(name) ?? name
  if (!normalizedRegistryNames.has(normalizeSessionName(cleaned))) return false
  return appState.agentNameRegistry.has(name) || cleaned !== name ? 'unreachable' : 'bare-only'
}

/**
 * `M`: los teammates alcanzables por nombre — del `teamContext` en curso y
 * del roster del `teamFile`, sin duplicar al propio llamador.
 */
export function localTeammates(appState: ListAgentsAppState, teamFile: TeamFile | null | undefined, callerTeammateId: string | null | undefined): TeammateEntry[] {
  const team = appState.teamContext
  if (!team && !teamFile) return []
  const selfId = callerTeammateId === null ? undefined : (callerTeammateId ?? team?.selfAgentId ?? (team?.isLeader === false ? undefined : team?.leadAgentId))
  const idleStatusByAgentId = new Map<string, string>()
  for (const task of Object.values(appState.tasks)) {
    if (isInProcessTeammateTask(task)) idleStatusByAgentId.set(task.identity.agentId, task.isIdle ? 'idle' : task.status)
  }
  const seen = new Set<string>(selfId !== undefined ? [selfId] : [])
  const normalizedRegistryNames = new Set<string>()
  for (const name of appState.agentNameRegistry.keys()) normalizedRegistryNames.add(normalizeSessionName(name))
  const leadId = teamLeadAgentId(appState)
  const isMessageableByName = (name: string, agentId: string): boolean => isTeamLeadPlaceholder({ name, agentId }, leadId) || !isUnsafeName(name)

  const entries: TeammateEntry[] = []
  for (const [teammateId, teammate] of Object.entries(team?.teammates ?? {})) {
    if (seen.has(teammateId) || !isMessageableByName(teammate.name, teammateId)) continue
    seen.add(teammateId)
    const inProcess = teammate.tmuxPaneId === 'in-process' || teammate.tmuxPaneId === 'leader'
    entries.push({
      teammateId,
      name: teammate.name,
      agentType: teammate.agentType,
      status: inProcess ? idleStatusByAgentId.get(teammateId) : undefined,
      backend: inProcess ? 'in-process' : 'pane',
      since: teammate.spawnedAt,
      nameShadowed: false,
    })
  }
  for (const member of teamFile?.members ?? []) {
    if (seen.has(member.agentId) || !isMessageableByName(member.name, member.agentId)) continue
    seen.add(member.agentId)
    entries.push({
      teammateId: member.agentId,
      name: member.name,
      agentType: member.agentType,
      status: undefined,
      backend: 'roster',
      since: member.joinedAt,
      nameShadowed: teammateNameShadowStatus(member.name, appState, normalizedRegistryNames),
    })
  }
  return entries
}

// ---------------------------------------------------------------------------
// Formato de bajo nivel — `I`, `j`, `D`, `E`, `v`, `w`, `C`, `B`, `y`
// ---------------------------------------------------------------------------

/** `w`: hace cuánto, en su unidad más significativa. */
function elapsedLabel(ms: number): string {
  return formatDuration(Math.max(0, ms), { mostSignificantOnly: true })
}

/** `I`: `Título (n):` seguido de una línea por elemento. */
function section(title: string, lines: readonly string[], count = lines.length): string {
  return `${title} (${count}):\n${lines.join('\n')}`
}

/** `j`: como `section`, recortado a `TRUNCATED_SECTION_LIMIT` elementos. */
function truncatedSection<T>(title: string, items: readonly T[], render: (item: T) => string): string {
  const shown = items.slice(0, TRUNCATED_SECTION_LIMIT).map(render)
  const hidden = items.length - shown.length
  if (hidden > 0) shown.push(`  (… ${hidden} more not shown)`)
  return `${title} (${items.length}):\n${shown.join('\n')}`
}

/** `D`: el aviso «decía llamarse X hasta hace Y», dentro de su ventana. */
function formerNameNotice(entry: { readonly formerNames?: readonly FormerNameRecord[] }, now: number, clean: (name: unknown) => string | null | undefined): string | undefined {
  const former = entry.formerNames?.[0]
  if (former === undefined) return undefined
  const age = now - former.until
  if (age < 0 || age >= FORMER_NAME_DISPLAY_WINDOW_MS) return undefined
  const name = clean(former.name)
  return name ? `says it was ${name} until ${elapsedLabel(age)} ago` : undefined
}

/** `E`: una viñeta con su etiqueta y sus extras separados por `·`. */
function bulletLine(label: string, extras: readonly (string | undefined)[]): string {
  return `  ${[label, ...extras.filter((extra): extra is string => extra !== undefined)].join('  ·  ')}`
}

/** `v`: «started/joined hace X», o nada si no hay dato fiable. */
function teammateSinceLabel(entry: { readonly backend: TeammateBackend; readonly since: number }, now: number): string | undefined {
  if (typeof entry.since !== 'number' || !Number.isFinite(entry.since) || entry.since > now || now - entry.since > SINCE_DISPLAY_MAX_AGE_MS) return undefined
  return `${entry.backend === 'roster' ? 'joined' : 'started'} ${elapsedLabel(now - entry.since)} ago`
}

/** `C`: «waiting on a human» cuando el estado pide acción; si no, el resto. */
function workerStatusLabel(status: string | undefined, fallback: string | undefined): string | undefined {
  return status === 'requires_action' ? 'waiting on a human' : fallback
}

/** `B`: el estado de un bridge — su propio worker si es UDS, o "offline". */
function bridgeStatusLabel(session: BridgeSession, fallback: string | undefined): string | undefined {
  if (isUdsLikeEnvironment(session)) return workerStatusLabel(session.status, fallback)
  return isOfflineUdsLikeEnvironment(session) ? 'offline' : fallback
}

/** `y`: un título recortado, o `undefined` si queda vacío o «untitled session». */
function cleanedTitle(value: unknown): string | undefined {
  if (!value) return undefined
  const cleaned = trimmedOrUntitled(value)
  return cleaned === null || cleaned === 'untitled session' ? undefined : cleaned
}

// ---------------------------------------------------------------------------
// Secciones — formato para el modelo: `q`, `z`, `V`
// ---------------------------------------------------------------------------

function peerRefKey(kind: PeerCandidateKind, id: string): string {
  return `${kind}\u0000${id}`
}

/** `q`: la sección `Subagents` del formato de modelo. */
function subagentsSectionForModel(subagents: readonly SubagentEntry[], refTable: ReadonlyMap<string, PeerCandidateWithRef>, refs: PeerRefDependencies): string {
  const now = Date.now()
  return section(
    'Subagents',
    subagents.map(entry => {
      const ref = entry.name ? refTable.get(peerRefKey('subagent', entry.agentId)) : undefined
      return bulletLine(ref ? refs.formatWithRef(ref) : entry.agentId, [entry.agentType, entry.status, `started ${elapsedLabel(now - entry.startTime)} ago`])
    }),
  )
}

/** `z`: la sección `Teammates` del formato de modelo. */
function teammatesSectionForModel(teammates: readonly TeammateEntry[], refTable: ReadonlyMap<string, PeerCandidateWithRef>, refs: PeerRefDependencies): string {
  const now = Date.now()
  return truncatedSection('Teammates', teammates, entry => {
    const ref = entry.nameShadowed !== false ? undefined : refTable.get(peerRefKey('teammate', entry.teammateId))
    return bulletLine(ref ? refs.formatWithRef(ref) : (cleanedDisplayName(entry.name) ?? '(unnamed)'), [
      cleanedDisplayName(entry.agentType) ?? undefined,
      cleanedDisplayName(entry.status) ?? (entry.backend === 'in-process' ? undefined : entry.backend),
      teammateSinceLabel(entry, now),
      entry.nameShadowed === 'unreachable'
        ? 'not messageable by name while a subagent in this session is registered under that name (the name reaches the subagent)'
        : entry.nameShadowed === 'bare-only'
          ? 'message it by this exact name as printed — no [ref]: a subagent here is registered under a variant spelling of it'
          : undefined,
    ])
  })
}

/** `V`: la sección `Peer sessions` del formato de modelo. */
function peerSessionsSectionForModel(
  udsSessions: readonly UdsSession[],
  refTable: ReadonlyMap<string, PeerCandidateWithRef>,
  cloudSessions: readonly CloudSession[],
  bridgePeers: readonly Extract<PeerEntry, { readonly transport: 'bridge' }>[],
  bridgeWalkFailed: boolean,
  cloudListFailed: boolean,
  localListFailed: boolean,
  listTruncated: boolean,
  refs: PeerRefDependencies,
): string {
  const now = Date.now()
  const rows: string[] = [
    ...udsSessions.map(session => {
      const ref = refTable.get(peerRefKey('session', session.sock))
      const tmux = session.tmux !== undefined && TMUX_PANE_NAME_PATTERN.test(session.tmux) && !looksLikeAddress(session.tmux) ? session.tmux : undefined
      const former = formerNameNotice(session, now, cleanedDisplayName)
      return bulletLine(ref ? refs.formatWithRef(ref) : (cleanedDisplayName(session.name || basename(session.cwd)) ?? '(untitled)'), [
        former,
        session.kind,
        session.status,
        session.hostSessionId === undefined ? undefined : HOST_SESSION_LABEL,
        tmux === undefined ? undefined : `tmux ${tmux}`,
        `started ${elapsedLabel(now - session.startedAt)} ago`,
      ])
    }),
    ...cloudSessions.map(session => {
      const ref = refTable.get(peerRefKey('cloud-session', session.id))
      return bulletLine(ref ? refs.formatWithRef(ref) : (cleanedDisplayName(session.title) ?? '(untitled)'), [
        session.remoteControl ? REMOTE_CONTROL_LABEL : 'cloud session',
        session.offline ? 'offline' : workerStatusLabel(session.workerStatus, session.workerStatus),
        session.lastActive === undefined ? undefined : `active ${elapsedLabel(now - session.lastActive)} ago`,
        session.unreachableFromHere ? UNREACHABLE_FROM_CLOUD_LABEL : undefined,
        session.acceptsPeerMessages === false ? PEER_MESSAGING_OFF_LABEL : undefined,
      ])
    }),
    ...bridgePeers.slice(0, BRIDGE_PEER_LIMIT).map(({ session }) => {
      const ref = refTable.get(peerRefKey('bridge-session', session.id))
      return bulletLine(ref ? refs.formatWithRef(ref) : (cleanedDisplayName(session.title) ?? '(untitled)'), [
        cloudSessionKindLabel(session),
        bridgeStatusLabel(session, session.status),
        session.acceptsPeerMessages === false ? PEER_MESSAGING_OFF_LABEL : undefined,
      ])
    }),
  ]
  const totalCount = rows.length + Math.max(0, bridgePeers.length - BRIDGE_PEER_LIMIT)
  if (totalCount > rows.length) rows.push(`  (… ${totalCount - rows.length} more not shown)`)
  const peerSessions = rows.length > 0 ? section('Peer sessions', rows, totalCount) : ''

  const notices = [
    ...(bridgeWalkFailed
      ? [
          bridgePeers.length > 0
            ? '(account session list incomplete just now — those rows carry no [ref] and are not messageable by name until a later listing completes)'
            : '(the Remote Control session list for your account did not complete just now — Remote Control sessions on other machines may be missing from this listing; a later listing retries)',
        ]
      : []),
    ...(cloudListFailed ? ['(cloud session list could not be fetched just now — cloud sessions are missing from this listing; a later listing retries)'] : []),
    ...(localListFailed ? [LOCAL_LIST_FAILED_NOTICE] : []),
    ...(listTruncated ? [LIST_TRUNCATED_NOTICE] : []),
  ]
  if (notices.length === 0) return peerSessions
  const noticeBlock = `  ${notices.join('\n  ')}`
  return peerSessions === '' ? noticeBlock.trimStart() : `${peerSessions}\n${noticeBlock}`
}

// ---------------------------------------------------------------------------
// Secciones — formato para la persona: `Y`, `J`, `Q`
// ---------------------------------------------------------------------------

/** `Y`: la sección `Subagents` del formato de usuario. */
function subagentsSectionForUser(subagents: readonly SubagentEntry[]): string {
  const now = Date.now()
  return section(
    'Subagents',
    subagents.map(entry => {
      const label = entry.name ? `${entry.name}  ·  ${entry.agentType}` : entry.agentType
      return `  [${entry.status}]  ·  ${label}  ·  started ${elapsedLabel(now - entry.startTime)} ago`
    }),
  )
}

/** `J`: la sección `Teammates` del formato de usuario. */
function teammatesSectionForUser(teammates: readonly TeammateEntry[]): string {
  const now = Date.now()
  return truncatedSection('Teammates', teammates, entry => {
    const name = cleanedDisplayName(entry.name) ?? '(unnamed)'
    const agentType = cleanedDisplayName(entry.agentType)
    const label = agentType ? `${name}  ·  ${agentType}` : name
    const since = teammateSinceLabel(entry, now)
    const shadow =
      entry.nameShadowed === 'unreachable' ? '  ·  name held by a subagent here' : entry.nameShadowed === 'bare-only' ? '  ·  exact name only (a subagent holds a variant)' : ''
    return `  [${cleanedDisplayName(entry.status) ?? entry.backend}]  ·  ${label}${since ? `  ·  ${since}` : ''}${shadow}`
  })
}

/** `Q`: la sección de otras sesiones del formato de usuario. */
function otherSessionsSectionForUser(peers: readonly PeerEntry[], omitDirectories: boolean): string {
  const now = Date.now()
  return section(
    `Other ${PRODUCT_NAME} sessions`,
    peers.map(peer => {
      switch (peer.transport) {
        case 'uds': {
          const session = peer.session
          const name = omitDirectories && session.nameSource !== 'user' ? undefined : cleanedTitle(session.name)
          const cwd = omitDirectories ? undefined : (cleanedTitle(session.cwd) ?? '(unknown directory)')
          const former = omitDirectories ? undefined : formerNameNotice(session, now, cleanedTitle)
          const summary = [name, former, cwd].filter((value): value is string => Boolean(value)).join('  ·  ') || '(unnamed session)'
          const host = session.hostSessionId === undefined ? '' : `  ·  ${HOST_SESSION_LABEL}`
          return `  [${cleanedTitle(session.status) ?? 'unknown'}]  ·  ${summary}${host}  ·  started ${elapsedLabel(now - session.startedAt)} ago`
        }
        case 'cloud': {
          const session = peer.session
          const status = session.offline ? 'offline' : workerStatusLabel(session.workerStatus, session.workerStatus ?? 'unknown')
          const unreachable = session.unreachableFromHere ? `  ·  ${UNREACHABLE_FROM_CLOUD_LABEL}` : ''
          const messagingOff = session.acceptsPeerMessages === false ? `  ·  ${PEER_MESSAGING_OFF_LABEL}` : ''
          return `  [${status}]  ·  ${cleanedTitle(session.title) ?? '(untitled)'}  ·  ${session.remoteControl ? REMOTE_CONTROL_LABEL : 'cloud'}${unreachable}${messagingOff}`
        }
        case 'bridge': {
          const session = peer.session
          const messagingOff = session.acceptsPeerMessages === false ? `  ·  ${PEER_MESSAGING_OFF_LABEL}` : ''
          return `  [${bridgeStatusLabel(session, cleanedTitle(session.status) ?? 'unknown')}]  ·  ${cleanedTitle(session.title) ?? '(untitled)'}  ·  ${cloudSessionKindLabel(session)}${messagingOff}`
        }
        case 'did':
          return ''
      }
    }),
  )
}

// ---------------------------------------------------------------------------
// La sesión propia — `H`, `R`
// ---------------------------------------------------------------------------

/** `R`: el token de la sesión propia — el largo si el socket lo necesita. */
function ownSessionToken(self: OwnSessionInfo, sessions: readonly UdsSession[], ownEndpointShadowed: boolean, refs: Pick<PeerRefDependencies, 'ownSocketNeedsLongRef'>): string {
  return refs.ownSocketNeedsLongRef(sessions, self.sock, ownEndpointShadowed) ? self.socketToken : self.token
}

/** `H`: el aviso «This session is X…» que antecede al formato de modelo. */
function ownSessionNotice(self: OwnSessionInfo | null, sessions: readonly UdsSession[], ownEndpointShadowed: boolean, refs: Pick<PeerRefDependencies, 'ownSocketNeedsLongRef'>): string | null {
  if (!self) return null
  const token = ownSessionToken(self, sessions, ownEndpointShadowed, refs)
  const stabilityNote =
    stableAddressEnabled() && token === self.token
      ? ' Session names and [ref]s listed here normally stay the same when a session restarts or is resumed; if one stops resolving, list again.'
      : ''
  return self.callerIsSubagent
    ? `This process's main session is ${token} — the name OTHER sessions use to message it (it is not listed below; from inside this process, address the main conversation as "${MAIN_SESSION_NAME}").${stabilityNote}`
    : `This session is ${token} — the name other sessions use to message it (it is not listed below; a message to it would be a message to yourself).${stabilityNote}`
}

// ---------------------------------------------------------------------------
// Las dos formas públicas — `aYo`, `ulr`
// ---------------------------------------------------------------------------

export interface FormatContext {
  readonly appState: ListAgentsAppState
  readonly teamFile: TeamFile | null | undefined
  readonly callerTeammateId: string | null | undefined
  readonly self: OwnSessionInfo | null
}

export interface FormatForModelOptions {
  readonly didFocused?: boolean
  readonly bridgeWalkFailed?: boolean
  readonly cloudListFailed?: boolean
  readonly localListFailed?: boolean
  readonly ownEndpointShadowed?: boolean
  readonly messagingDisabled?: boolean
  readonly listTruncated?: boolean
}

export interface FormatForUserOptions {
  readonly bridgeWalkFailed?: boolean
  readonly cloudListFailed?: boolean
  readonly localListFailed?: boolean
  readonly ownEndpointShadowed?: boolean
  readonly messagingDisabled?: boolean
  readonly listTruncated?: boolean
  readonly omitDirectories?: boolean
}

function udsSessionsOf(peers: readonly PeerEntry[]): UdsSession[] {
  return peers.flatMap(peer => (peer.transport === 'uds' ? [peer.session] : []))
}

function cloudSessionsOf(peers: readonly PeerEntry[]): CloudSession[] {
  return peers.flatMap(peer => (peer.transport === 'cloud' ? [peer.session] : []))
}

function bridgePeersOf(peers: readonly PeerEntry[]): Extract<PeerEntry, { readonly transport: 'bridge' }>[] {
  return peers.flatMap(peer => (peer.transport === 'bridge' ? [peer] : []))
}

/** `aYo`: el resultado de `/list-agents` que recibe el modelo. */
export function formatForModel(peers: readonly PeerEntry[], context: FormatContext, refs: PeerRefDependencies, options: FormatForModelOptions = {}): string {
  const {
    didFocused = false,
    bridgeWalkFailed = false,
    cloudListFailed = false,
    localListFailed = false,
    ownEndpointShadowed = false,
    messagingDisabled = false,
    listTruncated = false,
  } = options

  const udsSessions = udsSessionsOf(peers)
  const cloudSessions = cloudSessionsOf(peers)
  const bridgeSessions = bridgeWalkFailed ? [] : peers.flatMap(peer => (peer.transport === 'bridge' ? [peer.session] : []))
  const bridgePeers = bridgePeersOf(peers)

  const table = refs.buildPeerRefTable(context.appState, { teamFile: context.teamFile, sessions: udsSessions, cloud: cloudSessions, bridge: bridgeSessions })
  const refTable = new Map(table.candidates.map(candidate => [peerRefKey(candidate.kind, candidate.id), candidate]))

  const subagents = localSubagents(context.appState)
  const teammates = localTeammates(context.appState, context.teamFile, context.callerTeammateId)

  const sections: string[] = []
  if (subagents.length > 0) sections.push(subagentsSectionForModel(subagents, refTable, refs))
  if (teammates.length > 0) sections.push(teammatesSectionForModel(teammates, refTable, refs))
  if (!didFocused && (udsSessions.length > 0 || cloudSessions.length > 0 || bridgePeers.length > 0 || bridgeWalkFailed || cloudListFailed || localListFailed || listTruncated)) {
    sections.push(peerSessionsSectionForModel(udsSessions, refTable, cloudSessions, bridgePeers, bridgeWalkFailed, cloudListFailed, localListFailed, listTruncated, refs))
  }

  const ownNotice = messagingDisabled ? null : ownSessionNotice(context.self, udsSessions, ownEndpointShadowed, refs)
  if (messagingDisabled && sections.length > 0) sections.unshift(MESSAGING_DISABLED_NOTICE)

  if (sections.length === 0) {
    if (messagingDisabled) return MESSAGING_DISABLED_NOTICE
    if (!ownNotice) return 'No reachable agents.'
    return !didFocused && !bridgeWalkFailed
      ? `${ownNotice}\n\nNo reachable agents — no other ${PRODUCT_NAME} session is running on this machine right now (peer messaging itself is available; a session appears here once it is started).`
      : `${ownNotice}\n\nNo other session appears in this listing right now (peer messaging itself is available).`
  }
  return ownNotice ? `${ownNotice}\n\n${sections.join('\n\n')}` : sections.join('\n\n')
}

/** `ulr`: el resultado de `/list-agents` que ve la persona. */
export function formatForUser(
  peers: readonly PeerEntry[],
  context: FormatContext,
  refs: Pick<PeerRefDependencies, 'ownSocketNeedsLongRef'>,
  options: FormatForUserOptions = {},
): string {
  const {
    bridgeWalkFailed = false,
    cloudListFailed = false,
    localListFailed = false,
    ownEndpointShadowed = false,
    messagingDisabled = false,
    listTruncated = false,
    omitDirectories = false,
  } = options

  const subagents = localSubagents(context.appState)
  const teammates = localTeammates(context.appState, context.teamFile, context.callerTeammateId)
  const sections: string[] = []
  if (subagents.length > 0) sections.push(subagentsSectionForUser(subagents))
  if (teammates.length > 0) sections.push(teammatesSectionForUser(teammates))
  if (peers.length > 0) sections.push(otherSessionsSectionForUser(peers, omitDirectories))
  if (cloudListFailed) sections.push('(cloud session list could not be fetched just now — cloud sessions are missing from this listing; try /list-agents again shortly)')
  if (localListFailed) sections.push('(the session list on this machine could not be read just now — other local sessions may be missing from this listing; try /list-agents again shortly)')
  if (bridgeWalkFailed)
    sections.push(
      '(the Remote Control session list for your account did not complete just now — Remote Control sessions on other machines may be missing from this listing; try /list-agents again shortly)',
    )
  if (listTruncated) sections.push(LIST_TRUNCATED_NOTICE)

  const udsSessions = udsSessionsOf(peers)
  const ownLine =
    messagingDisabled || !context.self || (omitDirectories && !context.self.nameIsUserChosen)
      ? null
      : context.self.callerIsSubagent
        ? `This process's main session: ${ownSessionToken(context.self, udsSessions, ownEndpointShadowed, refs)} (the name OTHER sessions use for it; from inside this process, address it as "${MAIN_SESSION_NAME}")`
        : `This session: ${ownSessionToken(context.self, udsSessions, ownEndpointShadowed, refs)} (the name other sessions use to message it)`

  if (omitDirectories && sections.length > 0) {
    sections.push('(session names and directories not chosen by a human are withheld on this connection — /rename a session on its own machine to give it an addressable name here)')
  }
  if (messagingDisabled && sections.length > 0) sections.unshift(MESSAGING_DISABLED_NOTICE)

  if (sections.length === 0) {
    if (messagingDisabled) return MESSAGING_DISABLED_NOTICE
    return ownLine
      ? `${ownLine}\n\nNo subagents, teammates or other ${PRODUCT_NAME} sessions — no other session is running on this machine right now; peer messaging itself is available.`
      : `No subagents, teammates or other ${PRODUCT_NAME} sessions.`
  }
  return ownLine ? `${ownLine}\n\n${sections.join('\n\n')}` : sections.join('\n\n')
}

