/**
 * Los pares alcanzables desde esta sesión y el contexto propio con que se
 * formatean: el cuerpo de la herramienta `ListAgents`. Porte de `kor`
 * (`listAllPeers`), `U` (`ownSessionInfo`) y `Tor` (`buildSubagentExtras`)
 * de `chunk-mk0qbzxv.js`, de `rFt` y `KFr` (`chunk-5mcqvwzx.js`) y del cuerpo
 * de `call` de `chunk-8xzbdmg9.js` (`listAgentsForModel`), todos de 2.1.283.
 * `chunk-1csd5fav.js` es el barrel que los reexporta junto a
 * `formatForModel`/`formatForUser` (`listAgentsFormat.ts`).
 *
 * Lo que la referencia lee de singletons llega aquí inyectado
 * (`PeerSources`, `OwnSessionDeps`, `SubagentExtrasDeps`), y las funciones
 * `process*` arman la versión del proceso con lo ya portado: `qRr`, `VRr` y
 * `DV` (`liveSessionRegistry.ts`), `Ws` (`peerFiles.ts`), `Nq` y `kv`
 * (`sessionRegistryState.ts`), `Y` (`getSessionId`), `tFt`
 * (`ownDisplayName`), `wFe` (`ownSessionRef`) y `pr`
 * (`normalizeBridgeOrCloudId`).
 *
 * Divergencias declaradas, cada una porque su origen no tiene porte aquí:
 * - Las fuentes remotas de `chunk-neeyxbak.js` —`cKe` (refresco de cuenta),
 *   `Ftn`/`Fkr`/`Utn` (el paseo por el puente y su clave de identidad),
 *   `pDe` (el listado en la nube), `JIt`/`QIt`/`Btn` (su caché) y `Dst`—
 *   son `RemotePeerSources`. `unportedRemotePeerSources` da cero filas sin
 *   fallo; un consumidor con puente o nube inyecta las suyas. El fallo por
 *   clave de identidad (`l.identityKey !== null && !Utn(l)`) queda dentro
 *   de `BridgeSessionWalk.failed`, que el paseo inyectado calcula.
 * - `IY` (`chunk-0rzp9bzr.js`) compara con dos ids propios: el del puente
 *   del REPL (`_3e()`) y el del entorno remoto (`Dae`). Aquí sólo el
 *   segundo, `remoteEnvironmentBridgeTarget`; el primero no tiene accessor
 *   en este paquete.
 * - `iy` (`chunk-a84ya7ak.js`, el archivo de equipo) y `da`
 *   (`chunk-jzycvw5e.js`, el nombre del equipo) viven en `@thyrox/swarm`,
 *   que depende de este paquete: llegan por `SubagentExtrasDeps`.
 * - `callerTeammateId` de `Tor` lee `e.teammateContext`, que el
 *   `ToolUseContext` de este árbol no tiene: siempre `undefined`, y
 *   `localTeammates` resuelve al llamador por su cuenta.
 * - `jkr` (`userTypedCurrentName`, `sessionRename.ts`) exige un
 *   `RenameContext` entero; `nameIsUserChosen` repite su criterio de dos
 *   líneas sobre `kv` y `SessionNameState.userTypedName`.
 * - `Ve()`, el id del candidato `main` de la tabla de refs, no aparece en
 *   `chunk-5mcqvwzx.js` ni en sus importaciones: `processListAgentsDeps` usa
 *   el id de agente del swarm o, sin él, el id de sesión.
 * - Los pares `did` (`c`) eran una promesa constante vacía y
 *   `didWarnings`/`didFocused` nunca se leen: no se portan.
 * - `channel`/`q` de la entrada iban a `Ftn`: sin puerto, se aceptan y no se
 *   leen, como su propia descripción dice («Not available in this build»).
 */
import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'

import type {
  BridgeSession,
  FormatContext,
  ListAgentsAppState,
  ListAgentsTeamContext,
  OwnSessionInfo,
  PeerEntry,
  PeerRefDependencies,
  TeamFile,
  UdsSession,
} from './listAgentsFormat.ts'
import { formatForModel, ownDisplayName } from './listAgentsFormat.ts'
import type { CloudSession } from './listAgentsFormat.ts'
import {
  SessionRecordsUnreadableError,
  hasConflictingMessagingSocketOwner,
  liveNonSpareSessions,
  messagingSocketEnvOverride,
  type LiveSessionRecord,
} from './liveSessionRegistry.ts'
import { isSessionMessagingEnabled } from './peerFiles.ts'
import { remoteEnvironmentBridgeTarget } from './peerLoopGuard.ts'
import {
  buildPeerRefTable,
  formatPeerWithRef,
  normalizeBridgeOrCloudId,
  ownSessionRef,
  shouldUseOwnSocketRef,
  type PeerBridgeSession,
  type PeerRefTableDeps,
  type PeerSessionRecord,
} from './peerRefTable.ts'
import { sessionNameState } from './sessionNameState.ts'
import { registeredSessionName, stableAddressEnabled } from './sessionRegistryState.ts'

/** `Z` de `chunk-5mcqvwzx.js`: el prefijo de la dirección estable de una sesión. */
const STABLE_ADDRESS_PREFIX = 'sid:'
/** `Dst`: los motivos de indisponibilidad de la nube que cuentan como fallo del listado. */
const CLOUD_LIST_FAILURES: ReadonlySet<string> = new Set(['timeout', 'fetch_failed'])
/** Las fuentes de nombre (`kv().source`) que `jkr` cuenta como elegidas por la persona. */
const USER_CHOSEN_NAME_SOURCES: ReadonlySet<string> = new Set(['user', 'collision'])
/** `wFe('session', …)`: la clase de candidato bajo la que se hashea la sesión propia. */
const OWN_SESSION_CANDIDATE_KIND = 'session'

// ---------------------------------------------------------------------------
// Las fuentes de pares — `kor`
// ---------------------------------------------------------------------------

/** Lo local que `kor` consulta. */
export interface LocalPeerSources {
  /** `Ws`. */
  messagingEnabled(): boolean
  /** `qRr`. */
  listLiveSessions(): Promise<LiveSessionRecord[]>
  /** `VRr`. */
  ownEndpointShadowed(): Promise<boolean>
  /** `Nq`. */
  stableAddressEnabled(): boolean
}

/** Lo que `pDe` devuelve. */
export interface CloudSessionListing {
  readonly sessions: readonly CloudSession[]
  readonly unavailable?: string
  readonly truncated?: boolean
}

/** Lo que `Ftn` + `Fkr` + `Utn` devuelven, ya filtrado. */
export interface BridgeSessionWalk {
  readonly sessions: readonly BridgeSession[]
  readonly failed: boolean
  readonly truncated?: boolean
}

/** Lo remoto que `kor` consulta. */
export interface RemotePeerSources {
  /** `pDe`. */
  listCloudSessions(): Promise<CloudSessionListing>
  /** `Ftn`, `Fkr` y `Utn`. */
  walkBridgeSessions(): Promise<BridgeSessionWalk>
  /** `IY`. */
  isOwnBridgeSession(id: string): boolean
}

export interface PeerSources {
  readonly local: LocalPeerSources
  readonly remote: RemotePeerSources
}

/** Lo que `kor` devuelve: los pares y las banderas que el formato lee. */
export interface ListAllPeersResult {
  readonly peers: readonly PeerEntry[]
  readonly bridgeWalkFailed: boolean
  readonly cloudListFailed: boolean
  readonly localListFailed: boolean
  readonly ownEndpointShadowed: boolean
  readonly messagingDisabled: boolean
  readonly listTruncated: boolean
}

interface LocalSessionListing {
  readonly sessions: readonly LiveSessionRecord[]
  readonly failed: boolean
}

const NO_LOCAL_SESSIONS: LocalSessionListing = { sessions: [], failed: false }
const NO_BRIDGE_SESSIONS: BridgeSessionWalk = { sessions: [], failed: false }

/** `qRr().catch(...)`: un registro ilegible (`KOt`) es un fallo del listado local; cualquier otro error sube. */
async function liveSessionsOrFailure(local: LocalPeerSources): Promise<LocalSessionListing> {
  try {
    return { sessions: await local.listLiveSessions(), failed: false }
  } catch (error) {
    if (error instanceof SessionRecordsUnreadableError) return { sessions: [], failed: true }
    throw error
  }
}

/** `rFt`: si alguna sesión uds ya representa la sesión de puente `bridgeId`. */
function hasLocalSessionForBridge(sessions: readonly LiveSessionRecord[], bridgeId: string): boolean {
  const normalized = normalizeBridgeOrCloudId(bridgeId)
  return sessions.some(session => session.bridgeSessionId !== undefined && normalizeBridgeOrCloudId(session.bridgeSessionId) === normalized)
}

function isCloudListFailure(unavailable: string | undefined): boolean {
  return unavailable !== undefined && CLOUD_LIST_FAILURES.has(unavailable)
}

/** `VRr` sólo se mide con la mensajería y la dirección estable activas, y su fallo cuenta como no. */
function measureOwnEndpointShadowed(local: LocalPeerSources, messagingEnabled: boolean): Promise<boolean> {
  if (!messagingEnabled || !local.stableAddressEnabled()) return Promise.resolve(false)
  return local.ownEndpointShadowed().catch(() => false)
}

/** `kor`: los pares uds, de nube y de puente, con las banderas de lo que no se pudo listar. */
export async function listAllPeers(sources: PeerSources = processPeerSources()): Promise<ListAllPeersResult> {
  const messagingEnabled = sources.local.messagingEnabled()
  const [local, bridge, cloud, ownEndpointShadowed] = await Promise.all([
    messagingEnabled ? liveSessionsOrFailure(sources.local) : NO_LOCAL_SESSIONS,
    messagingEnabled ? sources.remote.walkBridgeSessions() : NO_BRIDGE_SESSIONS,
    sources.remote.listCloudSessions(),
    measureOwnEndpointShadowed(sources.local, messagingEnabled),
  ])
  const udsPeers: PeerEntry[] = local.sessions.map(session => ({ transport: 'uds', address: `uds:${session.sock}`, session }))
  const cloudPeers: PeerEntry[] = cloud.sessions
    .filter(session => !hasLocalSessionForBridge(local.sessions, session.id) && !sources.remote.isOwnBridgeSession(session.id))
    .map(session => ({ transport: 'cloud', address: undefined, session }))
  const bridgePeers: PeerEntry[] = bridge.sessions.map(session => ({ transport: 'bridge', address: `bridge:${session.id}`, session }))
  return {
    peers: [...udsPeers, ...cloudPeers, ...bridgePeers],
    bridgeWalkFailed: bridge.failed,
    cloudListFailed: isCloudListFailure(cloud.unavailable),
    localListFailed: local.failed,
    ownEndpointShadowed,
    messagingDisabled: !messagingEnabled,
    listTruncated: cloud.truncated === true || bridge.truncated === true,
  }
}

// ---------------------------------------------------------------------------
// La sesión propia — `U`
// ---------------------------------------------------------------------------

/** Lo que `U` lee de singletons. */
export interface OwnSessionDeps {
  /** `DV`. */
  ownMessagingSocket(): string | undefined
  /** `kv`. */
  registeredName(): { readonly name: string; readonly source: string } | undefined
  /** `SessionNameState.userTypedName`, la mitad de `jkr` que no está en `kv`. */
  userTypedName(): string | undefined
  /** `Y`. */
  ownSessionId(): string
  /** `Nq`. */
  stableAddressEnabled(): boolean
}

/** `KFr`: la dirección con que se hashea el ref propio — la estable si está activa, si no el socket. */
function ownRefAddress(sock: string, deps: OwnSessionDeps): string {
  return deps.stableAddressEnabled() ? `${STABLE_ADDRESS_PREFIX}${deps.ownSessionId()}` : sock
}

/** `jkr`: si el nombre registrado lo tecleó la persona y sigue siendo el que tecleó. */
function isUserChosenName(deps: OwnSessionDeps): boolean {
  const current = deps.registeredName()
  return current !== undefined && USER_CHOSEN_NAME_SOURCES.has(current.source) && deps.userTypedName() === current.name
}

/** `U`: cómo se nombra esta sesión ante las demás, o `null` si no tiene socket ni nombre mostrable. */
export function ownSessionInfo(callerIsSubagent: boolean, deps: OwnSessionDeps): OwnSessionInfo | null {
  const sock = deps.ownMessagingSocket()
  const name = ownDisplayName(deps.registeredName()?.name)
  const hasSocket = sock !== undefined && sock !== ''
  if (!hasSocket || name === null) return null
  const tokenFor = (address: string): string => `${name} [${ownSessionRef(OWN_SESSION_CANDIDATE_KIND, address)}]`
  return {
    token: tokenFor(ownRefAddress(sock, deps)),
    socketToken: tokenFor(sock),
    sock,
    callerIsSubagent,
    nameIsUserChosen: isUserChosenName(deps),
  }
}

// ---------------------------------------------------------------------------
// El contexto del formato — `Tor`
// ---------------------------------------------------------------------------

/** Lo que `Tor` lee de fuera de `AppState`. */
export interface SubagentExtrasDeps {
  /** `da`. */
  teamName(teamContext: ListAgentsTeamContext | undefined): string | undefined
  /** `iy`. */
  readTeamFile(teamName: string): Promise<TeamFile | null>
  readonly own: OwnSessionDeps
}

/** `Tor`: el estado, el archivo de equipo (si hay equipo) y la sesión propia con que se formatea. */
export async function buildSubagentExtras(appState: ListAgentsAppState, callerIsSubagent: boolean, deps: SubagentExtrasDeps): Promise<FormatContext> {
  const teamName = deps.teamName(appState.teamContext)
  return {
    appState,
    teamFile: teamName === undefined ? null : await deps.readTeamFile(teamName),
    callerTeammateId: undefined,
    self: ownSessionInfo(callerIsSubagent, deps.own),
  }
}

// ---------------------------------------------------------------------------
// La tabla de refs, adaptada a las formas del formato — `tj`/`M6`/`oBo`
// ---------------------------------------------------------------------------

function toPeerSessionRecord(session: UdsSession): PeerSessionRecord {
  return {
    name: session.name,
    cwd: session.cwd,
    sock: session.sock,
    sessionId: session.sessionId,
    statusUpdatedAt: session.statusUpdatedAt,
    bridgeSessionId: session.bridgeSessionId,
    hostSessionId: session.hostSessionId,
    nameSource: session.nameSource,
  }
}

/** Sin `updatedAt` la fila va sin fecha, y la tabla no le calcula `lastActive`. */
function toPeerBridgeSession(session: BridgeSession): PeerBridgeSession {
  return { ...session, updatedAt: session.updatedAt ?? '' }
}

/** `PeerRefDependencies` sobre `peerRefTable.ts`, con las sesiones traducidas a su forma de registro. */
export function peerRefDependencies(deps: PeerRefTableDeps): PeerRefDependencies {
  return {
    buildPeerRefTable: (appState, options) =>
      buildPeerRefTable(
        appState,
        { teamFile: options.teamFile ?? undefined, sessions: options.sessions.map(toPeerSessionRecord), cloud: options.cloud, bridge: options.bridge.map(toPeerBridgeSession) },
        deps,
      ),
    formatWithRef: formatPeerWithRef,
    ownSocketNeedsLongRef: (sessions, ownSock, ownEndpointShadowed) => shouldUseOwnSocketRef(sessions.map(toPeerSessionRecord), ownSock, deps, ownEndpointShadowed),
  }
}

// ---------------------------------------------------------------------------
// El cuerpo de `call` — `chunk-8xzbdmg9.js`
// ---------------------------------------------------------------------------

export interface ListAgentsDeps {
  readonly sources: PeerSources
  readonly extras: SubagentExtrasDeps
  readonly refs: PeerRefTableDeps
}

/** Los pares y el contexto propio se piden a la vez, y el formato los junta. */
export async function listAgentsForModel(appState: ListAgentsAppState, callerIsSubagent: boolean, deps: ListAgentsDeps): Promise<string> {
  const [result, context] = await Promise.all([listAllPeers(deps.sources), buildSubagentExtras(appState, callerIsSubagent, deps.extras)])
  return formatForModel(result.peers, context, peerRefDependencies(deps.refs), result)
}

// ---------------------------------------------------------------------------
// El cableado del proceso
// ---------------------------------------------------------------------------

/** Las fuentes remotas sin porte: cero filas sin fallo, y sólo el puente del entorno remoto cuenta como propio. */
export const unportedRemotePeerSources: RemotePeerSources = {
  listCloudSessions: () => Promise.resolve({ sessions: [] }),
  walkBridgeSessions: () => Promise.resolve(NO_BRIDGE_SESSIONS),
  isOwnBridgeSession: id => {
    const ownBridgeTarget = remoteEnvironmentBridgeTarget()
    return ownBridgeTarget !== undefined && normalizeBridgeOrCloudId(ownBridgeTarget) === normalizeBridgeOrCloudId(id)
  },
}

export function processPeerSources(): PeerSources {
  return {
    local: {
      messagingEnabled: () => isSessionMessagingEnabled(),
      listLiveSessions: () => liveNonSpareSessions(),
      ownEndpointShadowed: hasConflictingMessagingSocketOwner,
      stableAddressEnabled,
    },
    remote: unportedRemotePeerSources,
  }
}

export function processOwnSessionDeps(): OwnSessionDeps {
  return {
    ownMessagingSocket: () => messagingSocketEnvOverride(),
    registeredName: () => registeredSessionName(),
    userTypedName: () => sessionNameState().userTypedName,
    ownSessionId: () => getSessionId(),
    stableAddressEnabled,
  }
}

/** Lo que vive en `@thyrox/swarm` y este paquete no puede importar: `da`, `iy` y el id de agente propio. */
export interface TeamDeps {
  teamName: SubagentExtrasDeps['teamName']
  readTeamFile: SubagentExtrasDeps['readTeamFile']
  ownAgentId(): string | undefined
}

export function processListAgentsDeps(team: TeamDeps): ListAgentsDeps {
  const own = processOwnSessionDeps()
  return {
    sources: processPeerSources(),
    extras: { teamName: team.teamName, readTeamFile: team.readTeamFile, own },
    refs: {
      ownAgentId: () => team.ownAgentId() ?? own.ownSessionId(),
      ownSessionId: own.ownSessionId,
      stableAddressEnabled: own.stableAddressEnabled,
      ownMessagingSocket: own.ownMessagingSocket,
    },
  }
}
