/**
 * La renovación de una conexión de Cursor, que no tiene refresh token: se
 * empuja a `cursor-agent` a refrescar su sesión con una llamada autenticada
 * (`--list-models`, nunca `login`) y se vuelven a leer las dos credenciales
 * del anfitrión; renueva la primera que traiga un token distinto.
 *
 * Porte de `omniroute: src/lib/cursor/renewal.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import type { CursorAgentRun } from '../../../src/accounts/cursor/cursorAgent.ts'
import { buildCursorRenewedUpdate, createCursorAgentProbe, createDedupedIdeAuth, renewCursorConnection } from '../../../src/accounts/cursor/cursorRenewal.ts'
import type { CursorCredentialLookup } from '../../../src/accounts/cursor/cursorTokenExtractor.ts'

const NOW = '2026-09-28T12:00:00.000Z'
const run = (stdout: string, stderr = ''): CursorAgentRun => ({ stdout, stderr, code: 0, signal: null })

function probe(answer: (args: string[]) => CursorAgentRun | Promise<CursorAgentRun>, binary: string | null = '/bin/cursor-agent') {
  const calls: { binary: string; args: string[]; timeoutMs: number; sigkillFollowupMs?: number }[] = []
  let clock = 0
  const agent = createCursorAgentProbe({
    resolveBinary: options => (expect(options.allowPathFallback).toBe(false), binary),
    run: async (b, args, timeoutMs, options) => (calls.push({ binary: b, args, timeoutMs, sigkillFollowupMs: options?.sigkillFollowupMs }), answer(args)),
    now: () => clock,
  })
  return { agent, calls, advance: (ms: number) => void (clock += ms) }
}

describe('whether cursor-agent is available', () => {
  test('reads its authenticated status as JSON, without PATH lookup', async () => {
    const { agent, calls } = probe(() => run('{"isAuthenticated":true}'))
    expect(await agent.checkAvailability()).toEqual({ available: true, binaryPath: '/bin/cursor-agent' })
    expect(calls).toEqual([{ binary: '/bin/cursor-agent', args: ['status', '--format', 'json'], timeoutMs: 5000, sigkillFollowupMs: 2500 }])
  })

  test('an unauthenticated status, a missing binary or a failed spawn is unavailable', async () => {
    expect(await probe(() => run('{"isAuthenticated":false}')).agent.checkAvailability()).toEqual({ available: false, binaryPath: '/bin/cursor-agent' })
    expect((await probe(() => run('{"status":"ok"}')).agent.checkAvailability()).available).toBe(false)
    expect(await probe(() => run(''), null).agent.checkAvailability()).toEqual({ available: false, binaryPath: null })
    expect(await probe(() => { throw new Error('ENOENT') }).agent.checkAvailability()).toEqual({ available: false, binaryPath: '/bin/cursor-agent' })
  })

  test('output that is not JSON is available unless it says it is not logged in', async () => {
    expect((await probe(() => run('logged in as x')).agent.checkAvailability()).available).toBe(true)
    expect((await probe(() => run('', 'Not logged in')).agent.checkAvailability()).available).toBe(false)
    expect((await probe(() => run('Authentication required')).agent.checkAvailability()).available).toBe(false)
  })

  test('the cached answer lasts five minutes', async () => {
    const { agent, calls, advance } = probe(() => run('{"isAuthenticated":true}'))
    await agent.cachedAvailability()
    advance(5 * 60 * 1000 - 1)
    await agent.cachedAvailability()
    expect(calls).toHaveLength(1)
    advance(1)
    await agent.cachedAvailability()
    expect(calls).toHaveLength(2)
  })

  test('two concurrent status calls share one process, and a nudge is never coalesced into them', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => void (release = resolve))
    const { agent, calls } = probe(async () => (await gate, run('{"isAuthenticated":true}')))
    const both = Promise.all([agent.checkAvailability(), agent.checkAvailability(), agent.nudge('/bin/cursor-agent')])
    release()
    await both
    expect(calls.map(call => call.args.join(' '))).toEqual(['status --format json', '--list-models'])
    await agent.checkAvailability()
    expect(calls).toHaveLength(3)
  })

  test('the nudge only ever lists models, with a ten-second deadline', async () => {
    const { agent, calls } = probe(() => run(''))
    await agent.nudge('/bin/cursor-agent')
    expect(calls).toEqual([{ binary: '/bin/cursor-agent', args: ['--list-models'], timeoutMs: 10_000, sigkillFollowupMs: 5000 }])
  })
})

const found = (accessToken: string, machineId?: string): CursorCredentialLookup => ({ found: true, accessToken, machineId, source: 'x' })
const none: CursorCredentialLookup = { found: false }

describe('renewing a Cursor connection', () => {
  function deps(ide: CursorCredentialLookup, agent: CursorCredentialLookup, available = true) {
    const nudged: string[] = []
    return {
      nudged,
      deps: {
        ideAuth: async () => ide,
        agentAuth: async () => agent,
        availability: async () => ({ available, binaryPath: available ? '/bin/cursor-agent' : null }),
        nudge: async (binary: string) => void nudged.push(binary),
      },
    }
  }

  test('a newer IDE token wins, with its machine id, after nudging the agent', async () => {
    const { deps: d, nudged } = deps(found('ide2', 'm2'), found('agent2'))
    expect(await renewCursorConnection({ accessToken: 'old' }, d)).toEqual({ status: 'renewed', accessToken: 'ide2', machineId: 'm2', source: 'cursor-ide' })
    expect(nudged).toEqual(['/bin/cursor-agent'])
  })

  test('the agent token counts when the IDE has nothing newer, and an unavailable agent is not nudged', async () => {
    const { deps: d, nudged } = deps(found('old'), found('agent2'), false)
    expect(await renewCursorConnection({ accessToken: 'old' }, d)).toEqual({ status: 'renewed', accessToken: 'agent2', source: 'cursor-agent' })
    expect(nudged).toEqual([])
  })

  test('the same tokens, or none, leave it unchanged', async () => {
    expect(await renewCursorConnection({ accessToken: 'old' }, deps(found('old'), found('old')).deps)).toEqual({ status: 'unchanged' })
    expect(await renewCursorConnection({ accessToken: 'old' }, deps(none, { found: true }).deps)).toEqual({ status: 'unchanged' })
  })

  test('a failed nudge does not stop the renewal', async () => {
    const d = { ...deps(found('ide2'), none).deps, nudge: async () => { throw new Error('timeout') } }
    expect((await renewCursorConnection({ accessToken: 'old' }, d)).status).toBe('renewed')
  })

  test('a failing credential source is a sanitized error', async () => {
    const d = { ...deps(none, none).deps, ideAuth: async () => { throw new Error('locked Bearer sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789') } }
    const outcome = await renewCursorConnection({ accessToken: 'old' }, d)
    expect(outcome.status).toBe('error')
    expect(outcome.status === 'error' && outcome.error).toContain('locked')
    expect(outcome.status === 'error' && outcome.error).not.toContain('sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789')
  })
})

describe('the IDE credential read by the sweep', () => {
  test('is shared for five seconds per home, with a short lock wait', async () => {
    let clock = 0
    let home = '/h1'
    const timeouts: (number | undefined)[] = []
    const read = createDedupedIdeAuth({ tryIdeAuth: async options => (timeouts.push(options?.timeoutMs), found(`t${timeouts.length}`)), now: () => clock, home: () => home })
    expect(await read()).toEqual(found('t1'))
    clock = 4999
    expect(await read()).toEqual(found('t1'))
    home = '/h2'
    expect(await read()).toEqual(found('t2'))
    clock = 4999 + 5000
    expect(await read()).toEqual(found('t3'))
    expect(timeouts).toEqual([250, 250, 250])
  })
})

describe('the update of a renewed connection', () => {
  test('stores the token for a day, clears the error state and the circuit, and keeps the machine id', () => {
    const update = buildCursorRenewedUpdate({ providerSpecificData: { machineId: 'm1', refreshCircuit: { streak: 3 }, tier: 'pro' } }, { status: 'renewed', accessToken: 'new', machineId: 'm2', source: 'cursor-ide' }, NOW)
    expect(update).toEqual({
      accessToken: 'new',
      expiresAt: '2026-09-29T12:00:00.000Z',
      tokenExpiresAt: '2026-09-29T12:00:00.000Z',
      testStatus: 'active',
      lastHealthCheckAt: NOW,
      lastError: null,
      lastErrorAt: null,
      lastErrorType: null,
      lastErrorSource: null,
      errorCode: null,
      expiredRetryCount: null,
      expiredRetryAt: null,
      providerSpecificData: { machineId: 'm2', tier: 'pro' },
    })
  })

  test('without a new machine id the stored one stays', () => {
    expect(buildCursorRenewedUpdate({ providerSpecificData: { machineId: 'm1' } }, { status: 'renewed', accessToken: 'new', source: 'cursor-agent' }, NOW).providerSpecificData).toEqual({ machineId: 'm1' })
    expect(buildCursorRenewedUpdate({}, { status: 'renewed', accessToken: 'new', source: 'cursor-agent' }, NOW).providerSpecificData).toEqual({})
  })
})
