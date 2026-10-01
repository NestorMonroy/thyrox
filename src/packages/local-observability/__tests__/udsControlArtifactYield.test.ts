/**
 * La cesión de las respuestas de un artefacto: `pno`, `fno`, `mno`, `gno`,
 * `hno`, `flr`, `yno`, `_no`, `mlr`, `glr`, `bno` (`chunk-y9vyg7zk.js`) y los
 * tres ramales de `be` que los usan (`chunk-yg53q7yp.js`) de 2.1.283.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createInboxState } from '../src/uds/inboxState.ts'
import type { PeerIdentity } from '../src/uds/inboxConnection.ts'
import {
  artifactReplyControlActions,
  artifactYieldState,
  beginPendingClaim,
  cancelYieldSubscription,
  forgetDeliveredSlug,
  MAX_SLUGS,
  hasOutstandingYieldRequest,
  reclaimGoneHolders,
  resolveYieldAnswer,
  respondToYieldRequest,
  setArtifactHolder,
  setArtifactReplySender,
  subscribeToYieldAnswers,
  unyieldArtifactReplies,
  type ArtifactRepliesYieldedPayload,
  type LivenessVerifiers,
} from '../src/uds/artifactReplyYield.ts'

afterEach(() => {
  artifactYieldState().reset()
})

const flushMacrotask = () => new Promise(resolve => setTimeout(resolve, 0))

const aliveVerifiers: LivenessVerifiers = { isGone: () => false, verifyStart: async () => true }

function peer(pid: number | undefined, startToken?: string): PeerIdentity {
  return { pid, startToken, ancestry: undefined, origin: undefined }
}

describe('subscribeToYieldAnswers / resolveYieldAnswer (pno / hno)', () => {
  test('sin respuesta a tiempo resuelve timeout, y una respuesta tardía llega por onLate', async () => {
    const onLate = { calls: [] as unknown[] }
    const outcome = await subscribeToYieldAnswers('m1', ['a', 'b'], {
      sentAt: Date.now(),
      timeoutMs: 5,
      onLate: value => onLate.calls.push(value),
    })
    expect(outcome).toEqual({ kind: 'timeout', lost: [], lostTo: [] })
    expect(hasOutstandingYieldRequest('m1')).toBe(true)

    const resolved = resolveYieldAnswer({ action: 'artifact_replies_yielded', orig_msg_id: 'm1', yielded: ['a', 'z'], not_held: ['b'] }, undefined)
    expect(resolved).toBe(true)
    expect(onLate.calls).toEqual([{ kind: 'yielded', yielded: ['a'], notHeld: ['b'], lost: [], lostTo: [] }])
    expect(hasOutstandingYieldRequest('m1')).toBe(false)
  })

  test('un pid distinto del esperado rechaza la respuesta', async () => {
    const promise = subscribeToYieldAnswers('m2', ['a'], { sentAt: Date.now(), timeoutMs: 5000, expectPid: 42 })
    expect(resolveYieldAnswer({ action: 'artifact_replies_yielded', orig_msg_id: 'm2', yielded: ['a'], not_held: [] }, 99)).toBe(false)
    expect(hasOutstandingYieldRequest('m2')).toBe(true)
    cancelYieldSubscription('m2')
    await Promise.race([promise, flushMacrotask()])
  })
})

describe('claimConflict, a través de respondToYieldRequest (E: desempate por hora y por dirección)', () => {
  const isDefinitelyUndelivered = () => true

  test('una petición más vieja que nuestra suscripción se rechaza', async () => {
    setArtifactReplySender(async () => {}, 'uds:/mid')
    setArtifactHolder(() => ({ yielded: ['x'], notHeld: [] }))
    const sub = subscribeToYieldAnswers('claim-1', ['x'], { sentAt: 100, timeoutMs: 5000 })
    let seen: ArtifactRepliesYieldedPayload | undefined
    setArtifactReplySender(async (_address, payload) => {
      seen = payload
    }, 'uds:/mid')
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/incoming', msg_id: 'req-1', session_id: 's', slugs: ['x'], reason: 'claim', sent_at: 50 },
      'uds:/incoming',
      undefined,
      50,
      undefined,
      { isDefinitelyUndelivered },
    )
    await flushMacrotask()
    expect(seen?.refused).toBe(true)
    cancelYieldSubscription('claim-1')
    await Promise.race([sub, flushMacrotask()])
  })

  test('una petición más nueva gana y marca el slug perdido en nuestra suscripción', async () => {
    setArtifactReplySender(async () => {}, 'uds:/mid')
    setArtifactHolder(() => ({ yielded: ['x'], notHeld: [] }))
    subscribeToYieldAnswers('claim-2', ['x'], { sentAt: 100, timeoutMs: 5000 })
    let seen: ArtifactRepliesYieldedPayload | undefined
    setArtifactReplySender(async (_address, payload) => {
      seen = payload
    }, 'uds:/mid')
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/incoming', msg_id: 'req-2', session_id: 's', slugs: ['x'], reason: 'claim', sent_at: 150 },
      'uds:/incoming',
      undefined,
      150,
      undefined,
      { isDefinitelyUndelivered },
    )
    await flushMacrotask()
    expect(seen?.refused).toBeUndefined()
    expect(seen?.yielded).toEqual(['x'])
    const lost = cancelYieldSubscription('claim-2')
    expect(lost).toEqual([['x', 'uds:/incoming']])
  })

  test('a igual hora, gana la dirección propia mayor; si no, se rechaza', async () => {
    setArtifactReplySender(async () => {}, 'uds:/mid')
    setArtifactHolder(() => ({ yielded: ['x'], notHeld: [] }))
    subscribeToYieldAnswers('claim-3', ['x'], { sentAt: 100, timeoutMs: 5000 })
    let seenLoses: ArtifactRepliesYieldedPayload | undefined
    setArtifactReplySender(async (_address, payload) => {
      seenLoses = payload
    }, 'uds:/mid')
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/aaa', msg_id: 'req-3', session_id: 's', slugs: ['x'], reason: 'claim', sent_at: 100 },
      'uds:/aaa',
      undefined,
      100,
      undefined,
      { isDefinitelyUndelivered },
    )
    await flushMacrotask()
    expect(seenLoses?.refused).toBe(true)

    let seenWins: ArtifactRepliesYieldedPayload | undefined
    setArtifactReplySender(async (_address, payload) => {
      seenWins = payload
    }, 'uds:/mid')
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/zzz', msg_id: 'req-4', session_id: 's', slugs: ['x'], reason: 'claim', sent_at: 100 },
      'uds:/zzz',
      undefined,
      100,
      undefined,
      { isDefinitelyUndelivered },
    )
    await flushMacrotask()
    expect(seenWins?.refused).toBeUndefined()
    cancelYieldSubscription('claim-3')
  })
})

describe('deliveryTableFull, a través de respondToYieldRequest (C)', () => {
  test('64 entregas de pids distintos llenan la tabla; un pid ya presente no la ve llena', async () => {
    setArtifactHolder(() => ({ yielded: ['s'], notHeld: [] }))
    const state = artifactYieldState()
    for (let pid = 1; pid <= 64; pid++) state.delivered.set(`held-${pid}`, { slugs: new Set([`slug-${pid}`]), pid, procStart: undefined })

    let full: ArtifactRepliesYieldedPayload | undefined
    setArtifactReplySender(async (_address, payload) => {
      full = payload
    })
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/new', msg_id: 'req-full', session_id: 's', slugs: ['s'], reason: 'claim', sent_at: 1000 },
      'uds:/new',
      { pid: 999 },
      1000,
      undefined,
      { isDefinitelyUndelivered: () => true, verifiers: aliveVerifiers },
    )
    await flushMacrotask()
    expect(full?.refused).toBe(true)

    let notFull: ArtifactRepliesYieldedPayload | undefined
    setArtifactReplySender(async (_address, payload) => {
      notFull = payload
    })
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/again', msg_id: 'req-again', session_id: 's', slugs: ['s'], reason: 'claim', sent_at: 1000 },
      'uds:/again',
      { pid: 1 },
      1000,
      undefined,
      { isDefinitelyUndelivered: () => true, verifiers: aliveVerifiers },
    )
    await flushMacrotask()
    expect(notFull?.refused).toBeUndefined()
  })
})

describe('petición vieja (glr)', () => {
  test('una petición muy anterior o del futuro se rechaza sin preguntar al holder', async () => {
    let holderCalled = false
    setArtifactHolder(() => {
      holderCalled = true
      return { yielded: ['x'], notHeld: [] }
    })
    let payload: ArtifactRepliesYieldedPayload | undefined
    setArtifactReplySender(async (_address, sent) => {
      payload = sent
    })
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/x', msg_id: 'req-old', session_id: 's', slugs: ['x'], reason: 'claim', sent_at: 0 },
      'uds:/x',
      undefined,
      10000,
      undefined,
      { isDefinitelyUndelivered: () => true },
    )
    await flushMacrotask()
    expect(payload?.refused).toBe(true)
    expect(holderCalled).toBe(false)
  })
})

describe('respondToYieldRequest: reintento ante fallo ambiguo, cesión devuelta ante fallo definitivo (glr)', () => {
  test('un fallo ambiguo reintenta una vez y da la cesión por hecha', async () => {
    let onDeliveredCalls = 0
    setArtifactHolder(() => ({ yielded: ['s1'], notHeld: [], onDelivered: () => onDeliveredCalls++ }))
    let sendAttempts = 0
    setArtifactReplySender(async () => {
      sendAttempts++
      if (sendAttempts === 1) throw new Error('temporary')
    })
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/x', msg_id: 'req-ambig', session_id: 's', slugs: ['s1'], reason: 'claim', sent_at: Date.now() },
      'uds:/x',
      undefined,
      Date.now(),
      undefined,
      { isDefinitelyUndelivered: () => false },
    )
    await flushMacrotask()
    await flushMacrotask()
    expect(sendAttempts).toBe(2)
    expect(onDeliveredCalls).toBe(1)
  })

  test('la respuesta recorta yielded y not_held a MAX_SLUGS aunque el holder devuelva más', async () => {
    const many = Array.from({ length: MAX_SLUGS + 4 }, (_, i) => `s${i}`)
    setArtifactHolder(() => ({ yielded: many, notHeld: many }))
    const sent: ArtifactRepliesYieldedPayload[] = []
    setArtifactReplySender(async (_address, payload) => void sent.push(payload))
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/x', msg_id: 'req-cap', session_id: 's', slugs: ['s0'], reason: 'claim', sent_at: Date.now() },
      'uds:/x',
      undefined,
      Date.now(),
      undefined,
      { isDefinitelyUndelivered: () => false },
    )
    await flushMacrotask()
    expect(sent).toHaveLength(1)
    expect(sent[0]!.yielded).toEqual(many.slice(0, MAX_SLUGS))
    expect(sent[0]!.not_held).toEqual(many.slice(0, MAX_SLUGS))
  })

  test('un fallo definitivo devuelve lo cedido a quien lo tenía', async () => {
    const returned: string[][] = []
    let onDeliveredCalls = 0
    setArtifactHolder(() => ({ yielded: ['s2'], notHeld: [], onDelivered: () => onDeliveredCalls++ }), (_msgId, slugs) => {
      returned.push(slugs)
    })
    setArtifactReplySender(async () => {
      throw new Error('permanent')
    })
    respondToYieldRequest(
      { action: 'yield_artifact_replies', from: 'uds:/x', msg_id: 'req-def', session_id: 's', slugs: ['s2'], reason: 'claim', sent_at: Date.now() },
      'uds:/x',
      undefined,
      Date.now(),
      undefined,
      { isDefinitelyUndelivered: () => true },
    )
    await flushMacrotask()
    expect(returned).toEqual([['s2']])
    expect(onDeliveredCalls).toBe(0)
  })
})

describe('unyieldArtifactReplies (bno)', () => {
  test('un pid distinto del que sostiene la entrega no la suelta', () => {
    const state = artifactYieldState()
    state.delivered.set('held-1', { slugs: new Set(['a']), pid: 111, procStart: undefined })
    const ok = unyieldArtifactReplies({ action: 'unyield_artifact_replies', orig_msg_id: 'held-1', slugs: ['a'] }, 222, aliveVerifiers)
    expect(ok).toBe(false)
    expect(state.delivered.has('held-1')).toBe(true)
  })

  test('el mismo pid la suelta y avisa al que la tenía prestada', () => {
    const state = artifactYieldState()
    const returned: string[][] = []
    setArtifactHolder(null, (_msgId, slugs) => {
      returned.push(slugs)
    })
    state.delivered.set('held-2', { slugs: new Set(['a']), pid: 111, procStart: undefined })
    const ok = unyieldArtifactReplies({ action: 'unyield_artifact_replies', orig_msg_id: 'held-2', slugs: ['a'] }, 111, aliveVerifiers)
    expect(ok).toBe(true)
    expect(returned).toEqual([['a']])
    expect(state.delivered.has('held-2')).toBe(false)
  })
})

describe('reclaimGoneHolders / pruneStaleHolders (yno / D): proceso reutilizado', () => {
  test('un pid vivo pero con otro arranque pierde lo que tenía entregado', async () => {
    const state = artifactYieldState()
    const returned: string[][] = []
    setArtifactHolder(null, (_msgId, slugs) => {
      returned.push(slugs)
    })
    state.delivered.set('held-3', { slugs: new Set(['a', 'b']), pid: 5, procStart: 'original-start' })
    const verifiers: LivenessVerifiers = { isGone: () => false, verifyStart: async () => false }
    const handedBackNow = reclaimGoneHolders(undefined, verifiers)
    expect(handedBackNow).toEqual([])
    await flushMacrotask()
    expect(returned).toEqual([['a', 'b']])
    expect(state.delivered.has('held-3')).toBe(false)
  })

  test('un pid vivo con el mismo arranque conserva lo entregado', async () => {
    const state = artifactYieldState()
    state.delivered.set('held-4', { slugs: new Set(['a']), pid: 6, procStart: 'same-start' })
    reclaimGoneHolders(undefined, aliveVerifiers)
    await flushMacrotask()
    expect(state.delivered.has('held-4')).toBe(true)
  })
})

describe('forgetDeliveredSlug y beginPendingClaim (_no / fno)', () => {
  test('olvida el slug en cualquier entrega, sin avisar a nadie', () => {
    const state = artifactYieldState()
    const returned: string[][] = []
    setArtifactHolder(null, (_msgId, slugs) => {
      returned.push(slugs)
    })
    state.delivered.set('held-5', { slugs: new Set(['a']), pid: 1, procStart: undefined })
    forgetDeliveredSlug('a')
    expect(state.delivered.has('held-5')).toBe(false)
    expect(returned).toEqual([])
  })

  test('una reclamación propia guarda sus slugs y su hora, y se puede cerrar', () => {
    const claim = beginPendingClaim(['a', 'b'], 42)
    expect(claim.slugs).toEqual(new Set(['a', 'b']))
    expect(artifactYieldState().pendingClaims.has(claim.id)).toBe(true)
    claim.end()
    expect(artifactYieldState().pendingClaims.has(claim.id)).toBe(false)
  })
})

describe('los tres ramales de be, con marco inválido', () => {
  async function controlDeps() {
    const dir = await mkdtemp(join(tmpdir(), 'artifact-yield-'))
    const state = createInboxState()
    state.activeSocketPath = join(dir, 'own.sock')
    let findLiveSessionCalls = 0
    const deps = {
      state,
      sessionId: () => 'self-session',
      findLiveSession: async () => {
        findLiveSessionCalls++
        return undefined
      },
      isDefinitelyUndelivered: () => true,
    }
    return { deps, callCount: () => findLiveSessionCalls }
  }

  test('yield_artifact_replies con un marco inválido no llega a buscar la sesión', async () => {
    const { deps, callCount } = await controlDeps()
    const actions = artifactReplyControlActions(deps)
    await actions.yield_artifact_replies({ type: 'control', action: 'yield_artifact_replies' }, peer(123))
    expect(callCount()).toBe(0)
  })

  test('unyield_artifact_replies con un marco inválido no suelta nada', async () => {
    const { deps } = await controlDeps()
    const actions = artifactReplyControlActions(deps)
    const state = artifactYieldState()
    state.delivered.set('m', { slugs: new Set(['a']), pid: 1, procStart: undefined })
    await actions.unyield_artifact_replies({ type: 'control', action: 'unyield_artifact_replies', orig_msg_id: 'm' }, peer(1))
    expect(state.delivered.has('m')).toBe(true)
  })

  test('artifact_replies_yielded con un marco inválido no resuelve ninguna suscripción', async () => {
    const { deps } = await controlDeps()
    const actions = artifactReplyControlActions(deps)
    subscribeToYieldAnswers('m9', ['a'], { sentAt: Date.now(), timeoutMs: 5000 })
    await actions.artifact_replies_yielded({ type: 'control', action: 'artifact_replies_yielded' }, peer(1))
    expect(hasOutstandingYieldRequest('m9')).toBe(true)
    cancelYieldSubscription('m9')
  })
})
