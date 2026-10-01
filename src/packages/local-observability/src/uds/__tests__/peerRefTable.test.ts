/**
 * Prueba de `peerRefTable.ts` — porte de `tj`, `M6`, `DUe`, `oBo` y sus
 * auxiliares (`chunk-6vtp2w5r.js`, 2.1.284).
 */
import { describe, expect, test } from 'bun:test'
import {
  MAIN_CANDIDATE_NAME,
  MIN_REF_LENGTH,
  ambiguousSessionIds,
  buildPeerRefTable,
  formatPeerWithRef,
  groupSessionsBySocketIdentity,
  hashCandidateKey,
  isRegularSessionRecord,
  linkedBridgeSessionIds,
  normalizeBridgeOrCloudId,
  ownSessionRef,
  refMatchesCandidate,
  shouldUseOwnSocketRef,
  type PeerAppState,
  type PeerRefTableDeps,
  type PeerRegistrySnapshot,
} from '../peerRefTable.ts'

function deps(overrides: Partial<PeerRefTableDeps> = {}): PeerRefTableDeps {
  return { ownAgentId: () => 'a-main', ownSessionId: () => 'own-session', ...overrides }
}

function app(overrides: Partial<PeerAppState> = {}): PeerAppState {
  return { agentNameRegistry: new Map(), tasks: {}, ...overrides }
}

function registry(overrides: Partial<PeerRegistrySnapshot> = {}): PeerRegistrySnapshot {
  return { sessions: [], ...overrides }
}

describe('hashCandidateKey (R) y MIN_REF_LENGTH (M)', () => {
  test('es determinista y de 12 caracteres hexadecimales', () => {
    const key = hashCandidateKey('session', '/tmp/a.sock')
    expect(key).toBe(hashCandidateKey('session', '/tmp/a.sock'))
    expect(key).toMatch(/^[0-9a-f]{12}$/)
  })

  test('MIN_REF_LENGTH es 6', () => {
    expect(MIN_REF_LENGTH).toBe(6)
  })
})

describe('refMatchesCandidate (Me)', () => {
  test('un prefijo corto (< MIN_REF_LENGTH) nunca casa', () => {
    const key = hashCandidateKey('session', '/tmp/a.sock')
    expect(refMatchesCandidate(key.slice(0, MIN_REF_LENGTH - 1), 'session', '/tmp/a.sock')).toBe(false)
  })

  test('un prefijo de MIN_REF_LENGTH del propio hash casa', () => {
    const key = hashCandidateKey('session', '/tmp/a.sock')
    expect(refMatchesCandidate(key.slice(0, MIN_REF_LENGTH), 'session', '/tmp/a.sock')).toBe(true)
  })
})

describe('formatPeerWithRef (M6)', () => {
  test('compone "nombre [ref]"', () => {
    expect(formatPeerWithRef({ name: 'alice', ref: 'ab12cd' })).toBe('alice [ab12cd]')
  })
})

describe('ownSessionRef (DUe)', () => {
  test('es el hash truncado a MIN_REF_LENGTH', () => {
    expect(ownSessionRef('session', '/tmp/own.sock')).toBe(hashCandidateKey('session', '/tmp/own.sock').slice(0, MIN_REF_LENGTH))
  })
})

describe('shouldUseOwnSocketRef (oBo)', () => {
  test('force=true siempre pide el ref largo', () => {
    expect(shouldUseOwnSocketRef([], undefined, deps(), true)).toBe(true)
  })

  test('sin colisión, no hace falta el ref largo', () => {
    expect(shouldUseOwnSocketRef([{ sock: '/tmp/other.sock', sessionId: 'other' }], '/tmp/own.sock', deps())).toBe(false)
  })

  test('cuando otro registro reclama el propio id de sesión, hace falta el ref largo', () => {
    const sessions = [{ sock: '/tmp/own.sock', sessionId: 'own-session' }]
    expect(shouldUseOwnSocketRef(sessions, '/tmp/own.sock', deps())).toBe(true)
  })
})

describe('isRegularSessionRecord (IUe), normalizeBridgeOrCloudId (hr), linkedBridgeSessionIds (hmt)', () => {
  test('un socket "sid:" no es un registro normal', () => {
    expect(isRegularSessionRecord({ sock: 'sid:x', sessionId: 'x' })).toBe(false)
    expect(isRegularSessionRecord({ sock: '/tmp/a.sock', sessionId: 'x' })).toBe(true)
  })

  test('quita el prefijo session_/cse_', () => {
    expect(normalizeBridgeOrCloudId('session_abc')).toBe('abc')
    expect(normalizeBridgeOrCloudId('cse_abc')).toBe('abc')
    expect(normalizeBridgeOrCloudId('abc')).toBe('abc')
  })

  test('recoge los bridgeSessionId normalizados', () => {
    const linked = linkedBridgeSessionIds([{ bridgeSessionId: 'session_x' }, { bridgeSessionId: undefined }])
    expect([...linked]).toEqual(['x'])
  })
})

describe('groupSessionsBySocketIdentity (re) y ambiguousSessionIds (se)', () => {
  test('registros con el mismo socket exacto se agrupan y reclaman ambos ids', () => {
    const a = { sock: '/tmp/a.sock', sessionId: 'sess-a' }
    const b = { sock: '/tmp/a.sock', sessionId: 'sess-b' }
    const groups = groupSessionsBySocketIdentity([a, b])
    expect(groups.get(a)).toBe(groups.get(b))
    expect([...groups.get(a)!.claims].sort()).toEqual(['sess-a', 'sess-b'])
  })

  test('un id repetido entre registros distintos es ambiguo', () => {
    const a = { sock: '/tmp/a.sock', sessionId: 'dup' }
    const b = { sock: '/tmp/b.sock', sessionId: 'dup' }
    const groups = groupSessionsBySocketIdentity([a, b])
    expect(ambiguousSessionIds('own', [a, b], groups)).toEqual(new Set(['dup']))
  })

  test('el propio id de sesión, preexistente, hace ambiguo al primer registro que lo repita', () => {
    const a = { sock: '/tmp/a.sock', sessionId: 'own' }
    const groups = groupSessionsBySocketIdentity([a])
    expect(ambiguousSessionIds('own', [a], groups).has('own')).toBe(true)
  })
})

describe('buildPeerRefTable (tj)', () => {
  test('la fila "main" siempre está, con el id propio', () => {
    const table = buildPeerRefTable(app(), registry(), deps())
    const main = table.candidates.find(candidate => candidate.kind === 'main')
    expect(main?.name).toBe(MAIN_CANDIDATE_NAME)
    expect(main?.id).toBe('a-main')
  })

  test('un teammate en proceso entra con su nombre; uno de teamFile no duplica al ya conocido', () => {
    const table = buildPeerRefTable(
      app({ teamContext: { teammates: { 't-1': { name: 'ana' } } } }),
      registry({ teamFile: { members: [{ agentId: 't-1', name: 'ana-otra-vez' }, { agentId: 't-2', name: 'beto' }] } }),
      deps(),
    )
    const teammates = table.candidates.filter(candidate => candidate.kind === 'teammate')
    expect(teammates.map(candidate => candidate.id).sort()).toEqual(['t-1', 't-2'])
    expect(teammates.find(candidate => candidate.id === 't-1')?.where).toBe('in-process')
  })

  test('un subagent lee su startTime sólo si la tarea es local_agent', () => {
    const registryAgents = new Map([['worker', 'ag-1']])
    const table = buildPeerRefTable(
      app({ agentNameRegistry: registryAgents, tasks: { 'ag-1': { type: 'local_agent', startTime: 42 } } }),
      registry(),
      deps(),
    )
    const subagent = table.candidates.find(candidate => candidate.kind === 'subagent')
    expect(subagent?.lastActive).toBe(42)
  })

  test('una sesión sin nombre usa el basename del cwd', () => {
    const table = buildPeerRefTable(app(), registry({ sessions: [{ cwd: '/home/user/proyecto', sock: '/tmp/s1.sock', sessionId: 's1' }] }), deps())
    const session = table.candidates.find(candidate => candidate.kind === 'session')
    expect(session?.name).toBe('proyecto')
  })

  test('refs distintos para nombres que colisionan (mismo nombre, id distinto)', () => {
    // agentNameRegistry mapea nombre -> id; dos ids con el mismo nombre visible
    // (aquí "worker", repetido a mano vía dos entradas de id) refuerzan que el ref
    // se calcula sobre el id, no sobre el nombre.
    const twoWorkers = new Map<string, string>([
      ['worker-1', 'ag-1'],
      ['worker-2', 'ag-2'],
    ])
    const table = buildPeerRefTable(app({ agentNameRegistry: twoWorkers }), registry(), deps())
    const refs = table.candidates.filter(candidate => candidate.kind === 'subagent').map(candidate => candidate.ref)
    expect(new Set(refs).size).toBe(refs.length)
  })

  test('el prefijo mínimo es el que separa a dos hashes vecinos, nunca menos de MIN_REF_LENGTH', () => {
    const twoWorkers = new Map<string, string>([
      ['worker-a', 'ag-a'],
      ['worker-b', 'ag-b'],
    ])
    const table = buildPeerRefTable(app({ agentNameRegistry: twoWorkers }), registry(), deps())
    const subagents = table.candidates.filter(candidate => candidate.kind === 'subagent')
    const keyByRef = new Map(subagents.map(candidate => [candidate.ref, hashCandidateKey('subagent', candidate.id)]))
    for (const candidate of subagents) {
      expect(candidate.ref.length).toBeGreaterThanOrEqual(MIN_REF_LENGTH)
      expect(keyByRef.get(candidate.ref)!.startsWith(candidate.ref)).toBe(true)
      // el ref es el prefijo MÁS CORTO posible: un carácter menos ya no distingue frente a otro candidato
      const shorter = candidate.ref.slice(0, -1)
      if (shorter.length >= MIN_REF_LENGTH) {
        const collides = subagents.some(other => other !== candidate && hashCandidateKey('subagent', other.id).startsWith(shorter))
        expect(collides).toBe(true)
      }
    }
  })

  test('un nombre reservado ("main", "user", "system") no entra como candidato de sesión', () => {
    const table = buildPeerRefTable(app(), registry({ sessions: [{ cwd: '/tmp', name: 'user', sock: '/tmp/s.sock', sessionId: 's1' }] }), deps())
    expect(table.candidates.some(candidate => candidate.kind === 'session')).toBe(false)
  })

  test('una sesión llamada "main" sí entra (excepción de A en el original)', () => {
    const table = buildPeerRefTable(app(), registry({ sessions: [{ cwd: '/tmp', name: 'main', sock: '/tmp/s.sock', sessionId: 's1' }] }), deps())
    expect(table.candidates.some(candidate => candidate.kind === 'session' && candidate.name === 'main')).toBe(true)
  })

  test('byName agrupa por nombre normalizado', () => {
    const table = buildPeerRefTable(app({ teamContext: { teammates: { 't-1': { name: 'Ana Uno' } } } }), registry(), deps())
    expect([...table.byName.keys()]).toContain('ana-uno')
  })

  test('una sesión de nube ya enlazada localmente no aparece suelta, y su nombre queda en remoteNamesClaimedLocally', () => {
    const table = buildPeerRefTable(
      app(),
      registry({
        sessions: [{ cwd: '/tmp', sock: '/tmp/s.sock', sessionId: 's1', bridgeSessionId: 'session_cloud-1' }],
        cloud: [{ id: 'cloud-1', title: 'mi nube' }],
      }),
      deps(),
    )
    expect(table.candidates.some(candidate => candidate.kind === 'cloud-session')).toBe(false)
    expect(table.remoteNamesClaimedLocally.get('mi-nube')).toEqual(new Set(['/tmp/s.sock']))
  })
})
