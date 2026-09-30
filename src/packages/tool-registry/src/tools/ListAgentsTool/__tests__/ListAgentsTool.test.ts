/**
 * TASK-THYROX-0600 — la herramienta `ListAgents` (alias `ListPeers`) de
 * 2.1.283 (`chunk-8xzbdmg9.js`), su núcleo `listAllPeers`/`ownSessionInfo`/
 * `buildSubagentExtras` (`kor`/`U`/`Tor`, `chunk-mk0qbzxv.js`) y la compuerta
 * `Vee`/`$Mt` (`chunk-fhcnpt13.js`).
 *
 * El núcleo se prueba aquí y no en `local-observability/__tests__` porque
 * este ítem sólo posee esta suite. Se importa por el subpath exportado
 * `uds/peerFiles.js`, la misma cara por la que llega a la herramienta, y
 * `SessionRecordsUnreadableError` por `uds/liveSessionRegistry.js`, para que
 * sea la MISMA clase que `listAllPeers.ts` compara con `instanceof`.
 */
import { PRODUCT_NAME } from '@thyrox/config/product'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'


import { SessionRecordsUnreadableError, type LiveSessionRecord } from '@thyrox/local-observability/uds/liveSessionRegistry.js'
import {
  CROSS_SESSION_MESSAGING_UNAVAILABLE_MESSAGE,
  buildSubagentExtras,
  isProjectsHumanOriginEnabled,
  listAgentsForModel,
  listAllPeers,
  ownSessionInfo,
  type CloudSession,
  type ListAgentsAppState,
  type ListAgentsDeps,
  type OwnSessionDeps,
  type PeerSources,
  type SettledFlagReaders,
} from '@thyrox/local-observability/uds/peerFiles.js'
import { ListAgentsTool } from '../ListAgentsTool.ts'
import { BuiltInToolsProvider } from '../../registry/providers/BuiltInToolsProvider.ts'
import { LIST_AGENTS_TOOL_NAME, LIST_PEERS_TOOL_ALIAS, getPrompt } from '../prompt.ts'

const CONFIG_DIR_ENV = 'THYROX_CONFIG_DIR'
const HARBOR_KITE_ENV = 'THYROX_CODE_HARBOR_KITE'
const OWN_SOCKET_ENV = 'THYROX_CODE_MESSAGING_SOCKET'
const MESSAGING_DISABLED_NOTICE =
  'Cross-session messaging is switched off in this session right now — no sessions were listed, and this session is not reachable by name until it is switched back on.'

function liveSession(overrides: Partial<LiveSessionRecord> = {}): LiveSessionRecord {
  return {
    sock: '/tmp/cc-socks/1.sock',
    cwd: '/work/one',
    startedAt: Date.now() - 5000,
    procStart: undefined,
    formerNames: [],
    kind: 'interactive',
    sessionId: 'session-1',
    spare: false,
    status: 'idle',
    entrypoint: undefined,
    pid: 1,
    name: 'one',
    ...overrides,
  }
}

function cloudSession(overrides: Partial<CloudSession> = {}): CloudSession {
  return { id: 'session_cloud1', title: 'cloud one', ...overrides }
}

function sources(overrides: { local?: Partial<PeerSources['local']>; remote?: Partial<PeerSources['remote']> } = {}): PeerSources {
  return {
    local: {
      messagingEnabled: () => true,
      listLiveSessions: async () => [],
      ownEndpointShadowed: async () => false,
      stableAddressEnabled: () => false,
      ...overrides.local,
    },
    remote: {
      listCloudSessions: async () => ({ sessions: [] }),
      walkBridgeSessions: async () => ({ sessions: [], failed: false }),
      isOwnBridgeSession: () => false,
      ...overrides.remote,
    },
  }
}

function ownDeps(overrides: Partial<OwnSessionDeps> = {}): OwnSessionDeps {
  return {
    ownMessagingSocket: () => '/tmp/cc-socks/9.sock',
    registeredName: () => ({ name: 'alice', source: 'user' }),
    userTypedName: () => 'alice',
    ownSessionId: () => 'own-session',
    stableAddressEnabled: () => false,
    ...overrides,
  }
}

function emptyAppState(): ListAgentsAppState {
  return { agentNameRegistry: new Map(), tasks: {} }
}

function deps(overrides: Partial<ListAgentsDeps> = {}): ListAgentsDeps {
  const own = ownDeps({ registeredName: () => undefined })
  return {
    sources: sources(),
    extras: { teamName: () => undefined, readTeamFile: async () => null, own },
    refs: { ownAgentId: () => 'a-main', ownSessionId: own.ownSessionId },
    ...overrides,
  }
}

describe('el descriptor de ListAgents (chunk-8xzbdmg9)', () => {
  test('nombre, alias, lectura, concurrencia y tope de resultado', () => {
    expect(ListAgentsTool.name).toBe('ListAgents')
    expect(LIST_AGENTS_TOOL_NAME).toBe('ListAgents')
    expect(ListAgentsTool.aliases).toEqual(['ListPeers'])
    expect(LIST_PEERS_TOOL_ALIAS).toBe('ListPeers')
    expect(ListAgentsTool.isReadOnly({})).toBe(true)
    expect(ListAgentsTool.isConcurrencySafe({})).toBe(true)
    expect(ListAgentsTool.maxResultSizeChars).toBe(10_000)
    expect(ListAgentsTool.searchHint).toBe('list agents you can SendMessage to')
    expect(ListAgentsTool.userFacingName({})).toBe('ListAgents')
    expect(ListAgentsTool.toAutoClassifierInput({})).toBe('list agents')
  })

  test('el esquema de entrada admite channel/q hasta 256 y nada más; el de salida exige listing', () => {
    const input = ListAgentsTool.inputSchema
    expect(input.safeParse({}).success).toBe(true)
    expect(input.safeParse({ channel: 'x'.repeat(256), q: 'y' }).success).toBe(true)
    expect(input.safeParse({ channel: 'x'.repeat(257) }).success).toBe(false)
    expect(input.safeParse({ other: 1 }).success).toBe(false)
    const output = ListAgentsTool.outputSchema!
    expect(output.safeParse({ listing: 'x' }).success).toBe(true)
    expect(output.safeParse({}).success).toBe(false)
  })

  test('la descripción (Wxr) nombra a SendMessage y al producto por PRODUCT_NAME', async () => {
    const prompt = getPrompt()
    expect(prompt.startsWith('Lists agents you can SendMessage to')).toBe(true)
    expect(prompt).toContain('`SendMessage({to: "<name>", message: "..."})`')
    expect(prompt).toContain(`other local ${PRODUCT_NAME} sessions on this machine`)
    expect(await ListAgentsTool.description({}, { isNonInteractiveSession: false, toolPermissionContext: {} as never, tools: [] })).toBe(prompt)
  })

  test('el resultado va al modelo como texto plano del listing', () => {
    const block = ListAgentsTool.mapToolResultToToolResultBlockParam({ listing: 'No reachable agents.' }, 'tu1')
    expect(block).toEqual({ tool_use_id: 'tu1', type: 'tool_result', content: 'No reachable agents.' })
  })

  test('BuiltInToolsProvider lo registra siempre, por nombre y por alias', async () => {
    const tools = await BuiltInToolsProvider.discover()
    const listAgents = tools.find(tool => tool.name === LIST_AGENTS_TOOL_NAME)
    expect(listAgents).toBeDefined()
    expect(listAgents?.aliases).toEqual([LIST_PEERS_TOOL_ALIAS])
  })

  test('isEnabled es la compuerta Ws: THYROX_CODE_HARBOR_KITE manda', () => {
    const previous = process.env[HARBOR_KITE_ENV]
    try {
      process.env[HARBOR_KITE_ENV] = '0'
      expect(ListAgentsTool.isEnabled()).toBe(false)
      process.env[HARBOR_KITE_ENV] = '1'
      expect(ListAgentsTool.isEnabled()).toBe(true)
    } finally {
      if (previous === undefined) delete process.env[HARBOR_KITE_ENV]
      else process.env[HARBOR_KITE_ENV] = previous
    }
  })
})

describe('listAllPeers (kor)', () => {
  test('cada sesión uds viva entra con su dirección uds:<socket>', async () => {
    const result = await listAllPeers(sources({ local: { listLiveSessions: async () => [liveSession(), liveSession({ sock: '/tmp/cc-socks/2.sock', sessionId: 'session-2', pid: 2 })] } }))
    expect(result.peers.map(peer => peer.address)).toEqual(['uds:/tmp/cc-socks/1.sock', 'uds:/tmp/cc-socks/2.sock'])
    expect(result.peers.every(peer => peer.transport === 'uds')).toBe(true)
    expect(result).toMatchObject({ messagingDisabled: false, localListFailed: false, cloudListFailed: false, bridgeWalkFailed: false, ownEndpointShadowed: false, listTruncated: false })
  })

  test('con la mensajería apagada no se consulta el registro ni el puente, y messagingDisabled lo dice', async () => {
    let localCalls = 0
    let bridgeCalls = 0
    const result = await listAllPeers(
      sources({
        local: { messagingEnabled: () => false, listLiveSessions: async () => (localCalls++, [liveSession()]) },
        remote: { walkBridgeSessions: async () => (bridgeCalls++, { sessions: [], failed: false }) },
      }),
    )
    expect(localCalls).toBe(0)
    expect(bridgeCalls).toBe(0)
    expect(result.peers).toEqual([])
    expect(result.messagingDisabled).toBe(true)
  })

  test('un registro ilegible (KOt) marca localListFailed sin tumbar el listado; otro error sí se propaga', async () => {
    const unreadable = await listAllPeers(sources({ local: { listLiveSessions: async () => { throw new SessionRecordsUnreadableError('EACCES') } } }))
    expect(unreadable.localListFailed).toBe(true)
    expect(unreadable.peers).toEqual([])
    await expect(listAllPeers(sources({ local: { listLiveSessions: async () => { throw new Error('otro') } } }))).rejects.toThrow('otro')
  })

  test('las sesiones en la nube entran salvo la propia de puente y las ya representadas por una sesión uds', async () => {
    const result = await listAllPeers(
      sources({
        local: { listLiveSessions: async () => [liveSession({ bridgeSessionId: 'session_linked' })] },
        remote: {
          listCloudSessions: async () => ({ sessions: [cloudSession(), cloudSession({ id: 'session_linked' }), cloudSession({ id: 'session_own' })] }),
          isOwnBridgeSession: id => id === 'session_own',
        },
      }),
    )
    expect(result.peers.map(peer => [peer.transport, peer.address])).toEqual([
      ['uds', 'uds:/tmp/cc-socks/1.sock'],
      ['cloud', undefined],
    ])
  })

  test('cloudListFailed sólo con timeout o fetch_failed; listTruncated si la nube o el puente se cortaron', async () => {
    const timeout = await listAllPeers(sources({ remote: { listCloudSessions: async () => ({ sessions: [], unavailable: 'timeout' }) } }))
    const fetchFailed = await listAllPeers(sources({ remote: { listCloudSessions: async () => ({ sessions: [], unavailable: 'fetch_failed' }) } }))
    const other = await listAllPeers(sources({ remote: { listCloudSessions: async () => ({ sessions: [], unavailable: 'unauthorized' }) } }))
    expect([timeout.cloudListFailed, fetchFailed.cloudListFailed, other.cloudListFailed]).toEqual([true, true, false])
    const cloudCut = await listAllPeers(sources({ remote: { listCloudSessions: async () => ({ sessions: [], truncated: true }) } }))
    const bridgeCut = await listAllPeers(sources({ remote: { walkBridgeSessions: async () => ({ sessions: [], failed: false, truncated: true }) } }))
    expect([cloudCut.listTruncated, bridgeCut.listTruncated]).toEqual([true, true])
  })

  test('las sesiones de puente entran como bridge:<id> y su fallo se declara', async () => {
    const result = await listAllPeers(sources({ remote: { walkBridgeSessions: async () => ({ sessions: [{ id: 'session_b1', title: 'remote' }], failed: true }) } }))
    expect(result.peers).toEqual([{ transport: 'bridge', address: 'bridge:session_b1', session: { id: 'session_b1', title: 'remote' } }])
    expect(result.bridgeWalkFailed).toBe(true)
  })

  test('ownEndpointShadowed se mide sólo con la dirección estable activa, y su fallo cuenta como no', async () => {
    let probes = 0
    const shadowed = async () => (probes++, true)
    const withoutStable = await listAllPeers(sources({ local: { ownEndpointShadowed: shadowed } }))
    expect([withoutStable.ownEndpointShadowed, probes]).toEqual([false, 0])
    const withStable = await listAllPeers(sources({ local: { ownEndpointShadowed: shadowed, stableAddressEnabled: () => true } }))
    expect([withStable.ownEndpointShadowed, probes]).toEqual([true, 1])
    const failing = await listAllPeers(sources({ local: { ownEndpointShadowed: async () => { throw new Error('no') }, stableAddressEnabled: () => true } }))
    expect(failing.ownEndpointShadowed).toBe(false)
  })
})

describe('ownSessionInfo (U)', () => {
  test('sin socket propio o con nombre reservado no hay sesión propia; en blanco, es «untitled session»', () => {
    expect(ownSessionInfo(false, ownDeps({ ownMessagingSocket: () => undefined }))).toBeNull()
    expect(ownSessionInfo(false, ownDeps({ registeredName: () => undefined }))).toBeNull()
    expect(ownSessionInfo(false, ownDeps({ registeredName: () => ({ name: 'user', source: 'user' }) }))).toBeNull()
    expect(ownSessionInfo(false, ownDeps({ registeredName: () => ({ name: '   ', source: 'user' }) }))?.socketToken).toMatch(/^untitled session \[/)
  })

  test('el token lleva el ref de la dirección estable si está activa, y el socketToken siempre el del socket', () => {
    const bySocket = ownSessionInfo(false, ownDeps())!
    expect(bySocket.sock).toBe('/tmp/cc-socks/9.sock')
    expect(bySocket.token).toBe(bySocket.socketToken)
    expect(bySocket.token).toMatch(/^alice \[[0-9a-f]{6}\]$/)
    const byStable = ownSessionInfo(true, ownDeps({ stableAddressEnabled: () => true }))!
    expect(byStable.socketToken).toBe(bySocket.socketToken)
    expect(byStable.token).not.toBe(byStable.socketToken)
    expect(byStable.callerIsSubagent).toBe(true)
  })

  test('nameIsUserChosen (jkr): sólo si la fuente es user/collision y sigue siendo lo tecleado', () => {
    expect(ownSessionInfo(false, ownDeps())!.nameIsUserChosen).toBe(true)
    expect(ownSessionInfo(false, ownDeps({ registeredName: () => ({ name: 'alice', source: 'collision' }) }))!.nameIsUserChosen).toBe(true)
    expect(ownSessionInfo(false, ownDeps({ registeredName: () => ({ name: 'alice', source: 'derived' }) }))!.nameIsUserChosen).toBe(false)
    expect(ownSessionInfo(false, ownDeps({ userTypedName: () => 'bob' }))!.nameIsUserChosen).toBe(false)
  })
})

describe('buildSubagentExtras (Tor)', () => {
  test('lee el archivo de equipo sólo cuando hay nombre de equipo, y arma el contexto del formato', async () => {
    const reads: string[] = []
    const own = ownDeps()
    const appState: ListAgentsAppState = { ...emptyAppState(), teamContext: { teammates: {}, teamName: 'crew' } }
    const withTeam = await buildSubagentExtras(appState, false, {
      teamName: context => context?.teamName,
      readTeamFile: async name => (reads.push(name), { members: [] }),
      own,
    })
    expect(reads).toEqual(['crew'])
    expect(withTeam.teamFile).toEqual({ members: [] })
    expect(withTeam.appState).toBe(appState)
    expect(withTeam.callerTeammateId).toBeUndefined()
    expect(withTeam.self?.callerIsSubagent).toBe(false)

    const withoutTeam = await buildSubagentExtras(emptyAppState(), true, { teamName: () => undefined, readTeamFile: async name => (reads.push(name), null), own })
    expect(reads).toEqual(['crew'])
    expect(withoutTeam.teamFile).toBeNull()
    expect(withoutTeam.self?.callerIsSubagent).toBe(true)
  })
})

describe('listAgentsForModel (el cuerpo de call)', () => {
  test('compone pares, contexto propio y formato en un solo listing', async () => {
    const listing = await listAgentsForModel(emptyAppState(), false, deps({ sources: sources({ local: { listLiveSessions: async () => [liveSession()] } }) }))
    expect(listing).toContain('Peer sessions (1):')
    expect(listing).toContain('one [')
    expect(listing).toContain('interactive')
  })

  test('con la mensajería apagada el listing es el aviso, sin filas', async () => {
    const listing = await listAgentsForModel(emptyAppState(), false, deps({ sources: sources({ local: { messagingEnabled: () => false } }) }))
    expect(listing).toBe(MESSAGING_DISABLED_NOTICE)
  })
})

describe('call contra el registro real de sesiones', () => {
  let dir: string | undefined
  let server: Server | undefined
  const previousEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const name of [CONFIG_DIR_ENV, HARBOR_KITE_ENV, OWN_SOCKET_ENV]) previousEnv[name] = process.env[name]
    dir = mkdtempSync(join(tmpdir(), 'list-agents-'))
    mkdirSync(join(dir, 'sessions'), { recursive: true })
    process.env[CONFIG_DIR_ENV] = dir
    process.env[HARBOR_KITE_ENV] = '1'
    delete process.env[OWN_SOCKET_ENV]
  })

  afterEach(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()))
    server = undefined
    for (const [name, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('lista la sesión viva cuyo socket contesta, y bajo HARBOR_KITE=0 devuelve el aviso', async () => {
    const socketPath = join(dir!, 'peer.sock')
    server = createServer(socket => socket.destroy())
    await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
    writeFileSync(join(dir!, 'sessions', `${process.pid}.json`), JSON.stringify({ cwd: '/w', startedAt: Date.now() - 1000, sessionId: 'peer-session', messagingSocketPath: socketPath, name: 'peer-one' }))
    const context = { getAppState: () => emptyAppState() }
    const call = ListAgentsTool.call as unknown as (input: object, context: object) => Promise<{ data: { listing: string } }>

    const listed = await call({}, context)
    expect(listed.data.listing).toContain('Peer sessions (1):')
    expect(listed.data.listing).toContain('peer-one [')

    process.env[HARBOR_KITE_ENV] = '0'
    const disabled = await call({}, context)
    expect(disabled.data.listing).toBe(MESSAGING_DISABLED_NOTICE)
  })
})

describe('la compuerta Vee y el aviso $Mt (chunk-fhcnpt13)', () => {
  const readers = (declared: boolean, value = true): SettledFlagReaders => ({ flag: (_name, fallback) => (declared ? value : fallback), flagDeclared: () => declared })

  test('$Mt es el aviso literal', () => {
    expect(CROSS_SESSION_MESSAGING_UNAVAILABLE_MESSAGE).toBe('Cross-session messaging is not available in this session.')
  })

  test('con las banderas sin asentar y sin declaración, no; en cualquier otro caso, la bandera (por omisión sí)', () => {
    expect(isProjectsHumanOriginEnabled({ flagsSettled: false }, readers(false))).toBe(false)
    expect(isProjectsHumanOriginEnabled({ flagsSettled: false }, readers(true))).toBe(true)
    expect(isProjectsHumanOriginEnabled({ flagsSettled: true }, readers(false))).toBe(true)
    expect(isProjectsHumanOriginEnabled({}, readers(false))).toBe(true)
    expect(isProjectsHumanOriginEnabled({}, readers(true, false))).toBe(false)
    expect(isProjectsHumanOriginEnabled()).toBe(true)
  })
})
