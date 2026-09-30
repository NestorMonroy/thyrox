/**
 * El refresco proactivo de una conexión y su barrido: la decisión se aplica
 * al almacén, el refresco se guarda dentro de la misma ventana, un fallo de
 * red espera dos minutos y uno repetido abre el circuito, un token muerto se
 * trata según si la fila cambió, y el barrido recorre las conexiones por
 * lotes con una pausa entre ellos.
 *
 * Porte de `checkConnection`, `sweep`, `initTokenHealthCheck` y
 * `stopTokenHealthCheck` de `omniroute: src/lib/tokenHealthCheck.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createConnectionHealthCheck } from '../../../../src/accounts/refresh/health/connectionHealthCheck.ts'
import { createHealthCheckScheduler, healthCheckDisabled, healthCheckSkipProviders } from '../../../../src/accounts/refresh/health/healthCheckScheduler.ts'

const NOW_MS = Date.parse('2026-09-28T12:00:00.000Z')
const NOW = new Date(NOW_MS).toISOString()
const iso = (minutes: number) => new Date(NOW_MS + minutes * 60_000).toISOString()

type Row = Record<string, unknown>

function fakeStore(rows: Row[]) {
  const byId = new Map(rows.map(row => [row.id as string, { ...row }]))
  const updates: [string, Row][] = []
  return {
    updates,
    rows: byId,
    store: {
      getById: (id: string) => byId.get(id) ?? null,
      update: (id: string, data: Row) => {
        updates.push([id, data])
        byId.set(id, { ...byId.get(id), ...data })
        return byId.get(id) ?? null
      },
    },
  }
}

type TokenAnswer = (provider: string, credentials: Row, persist?: (result: Row) => Promise<void>) => Promise<unknown>

function harnessFor(rows: Row[], answer: TokenAnswer, extra: Record<string, unknown> = {}) {
  const { store, updates, rows: byId } = fakeStore(rows)
  const logs: string[] = []
  const calls: { provider: string; credentials: Row }[] = []
  const providerCalls: string[] = []
  const check = createConnectionHealthCheck({
    store,
    tokens: {
      getAccessToken: async (provider: string, credentials: Row, persist?: (result: Row) => Promise<void>) => {
        calls.push({ provider, credentials })
        return answer(provider, credentials, persist) as never
      },
    },
    supportsTokenRefresh: (provider: string) => provider !== 'mystery',
    providerChecks: {
      cursor: async connection => void providerCalls.push(`cursor ${connection.id}`),
      kimiWeb: async connection => void providerCalls.push(`kimi ${connection.id}`),
      webCookie: async (connection, intervalMin) => void providerCalls.push(`cookie ${connection.id} ${intervalMin}`),
      githubCopilot: async connection => void providerCalls.push(`copilot ${connection.id}`),
      copilotSubToken: async (connection, result) => void providerCalls.push(`subtoken ${connection.id} ${result.accessToken}`),
    },
    isWebCookieProvider: (provider: string) => provider === 'chatgpt-web',
    env: {},
    now: () => NOW_MS,
    log: { info: (_t, m) => void logs.push(`info ${m}`), warn: (_t, m) => void logs.push(`warn ${m}`), error: (_t, m) => void logs.push(`error ${m}`) },
    ...extra,
  })
  return { check, updates, logs, calls, providerCalls, byId }
}

const due = (overrides: Row = {}) => ({ id: 'c-1', provider: 'kiro', isActive: true, refreshToken: 'rt', accessToken: 'at', expiresAt: iso(1), providerSpecificData: { tier: 'free' }, ...overrides })
const persisting: TokenAnswer = async (_p, credentials, persist) => {
  const result = { accessToken: 'at2', refreshToken: 'rt2', expiresIn: 3600 }
  await persist?.(result)
  return result
}

describe('checking one connection', () => {
  test('reads the stored row before deciding, and a skipped one is left alone', async () => {
    const { check, updates, calls } = harnessFor([due({ expiresAt: iso(600) })], persisting)
    await check.checkConnection({ id: 'c-1', provider: 'kiro', isActive: true, refreshToken: 'rt', expiresAt: iso(1) })
    expect(calls).toEqual([])
    expect(updates).toEqual([])
    await check.checkConnection({})
    expect(updates).toEqual([])
  })

  test('a due refresh is persisted inside the refresh window and then stamped', async () => {
    const { check, updates, calls, logs } = harnessFor([due()], persisting)
    await check.checkConnection(due())
    expect(calls).toEqual([{ provider: 'kiro', credentials: { connectionId: 'c-1', refreshToken: 'rt', accessToken: 'at', expiresAt: iso(1), providerSpecificData: { tier: 'free' } } }])
    expect(updates).toEqual([
      ['c-1', { accessToken: 'at2', refreshToken: 'rt2', lastHealthCheckAt: NOW, testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, expiresAt: iso(60), tokenExpiresAt: iso(60) }],
      ['c-1', { lastHealthCheckAt: NOW }],
    ])
    expect(logs).toContain('info Refreshing kiro/c-1 (token expiring soon)')
    expect(logs).toContain('info kiro/c-1 refreshed')
  })

  test('only GitHub renews a Copilot sub-token', async () => {
    const { check, providerCalls } = harnessFor([due()], persisting)
    await check.checkConnection(due())
    expect(providerCalls).toEqual([])
  })

  test('a connection without an id never reaches the store', async () => {
    let reads = 0
    const check = createConnectionHealthCheck({ store: { getById: () => (reads++, null), update: () => null }, tokens: { getAccessToken: persisting as never }, supportsTokenRefresh: () => true, env: {} })
    await check.checkConnection({ provider: 'kiro' })
    expect(reads).toBe(0)
  })

  test('a refresh that was not persisted is written in full', async () => {
    const { check, updates } = harnessFor([due()], async () => ({ accessToken: 'at2', expiresAt: iso(30) }))
    await check.checkConnection(due())
    expect(updates).toEqual([['c-1', { accessToken: 'at2', lastHealthCheckAt: NOW, testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, expiresAt: iso(30), tokenExpiresAt: iso(30) }]])
  })

  test('a GitHub refresh also renews the Copilot sub-token', async () => {
    const { check, providerCalls } = harnessFor([due({ provider: 'github' })], persisting)
    await check.checkConnection(due({ provider: 'github' }))
    expect(providerCalls).toEqual(['subtoken c-1 at2'])
  })

  test('marks, stamps and deactivations are written as planned', async () => {
    const rows = [
      { id: 'dep', provider: 'gemini-cli', isActive: true, refreshToken: 'rt' },
      { id: 'mys', provider: 'mystery', isActive: true, refreshToken: 'rt' },
      { id: 'dead', provider: 'kiro', isActive: true, refreshToken: 'rt', testStatus: 'expired', lastErrorType: 'x', providerSpecificData: { expiredRetry: { count: 3 } } },
    ]
    const { check, updates, calls } = harnessFor(rows, persisting)
    for (const row of rows) await check.checkConnection(row)
    expect(updates.map(([id, data]) => [id, Object.keys(data).sort().join(',')])).toEqual([
      ['dep', 'errorCode,lastError,lastErrorAt,lastErrorSource,lastErrorType,lastHealthCheckAt,testStatus'],
      ['mys', 'lastHealthCheckAt'],
    ])
    expect(calls).toEqual([])
  })

  test('an exhausted expired connection that is still active is deactivated', async () => {
    const row = { id: 'x', provider: 'github', isActive: true, accessToken: 'gho', refreshToken: 'rt', testStatus: 'expired', errorCode: 'no_refresh_token', providerSpecificData: { expiredRetry: { count: 3 } } }
    const { check, updates, calls } = harnessFor([row], persisting)
    await check.checkConnection(row)
    expect(updates).toEqual([['x', { isActive: false }]])
    expect(calls).toEqual([])
  })

  test('providers with their own check are handed over', async () => {
    const rows = [
      { id: 'k', provider: 'cursor', isActive: true, accessToken: 'at' },
      { id: 'w', provider: 'kimi-web', isActive: true },
      { id: 'c', provider: 'chatgpt-web', isActive: true, healthCheckInterval: 15 },
      { id: 'g', provider: 'github', isActive: true, accessToken: 'gho' },
    ]
    const { check, providerCalls } = harnessFor(rows, persisting)
    for (const row of rows) await check.checkConnection(row)
    expect(providerCalls).toEqual(['cursor k', 'kimi w', 'cookie c 15', 'copilot g'])
  })

  test('without a provider check the connection is skipped', async () => {
    const { check, updates } = harnessFor([{ id: 'k', provider: 'cursor', isActive: true }], persisting, { providerChecks: {} })
    await check.checkConnection({ id: 'k', provider: 'cursor', isActive: true })
    expect(updates).toEqual([])
  })
})

describe('refresh failures', () => {
  test('a transient error waits two minutes without climbing the ladder', async () => {
    const { check, updates, logs } = harnessFor([due()], async () => {
      throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    })
    await check.checkConnection(due())
    expect(updates[0][1]).toMatchObject({ errorCode: 'refresh_transient', providerSpecificData: { tier: 'free', refreshCircuit: { streak: 0, until: iso(2), transient: true } } })
    expect(logs.at(-1)).toBe('warn kiro/c-1 refresh transient error (connect ECONNREFUSED); retry in 2min')
  })

  test('any other error opens the circuit', async () => {
    const { check, updates, logs } = harnessFor([due()], async () => {
      throw new Error('SQLITE_BUSY')
    })
    await check.checkConnection(due())
    expect(updates[0][1]).toMatchObject({ errorCode: 'refresh_failed', providerSpecificData: { refreshCircuit: { streak: 1, until: iso(5) } } })
    expect(logs.at(-1)).toBe('warn kiro/c-1 refresh error (SQLITE_BUSY); applying exponential backoff')
  })

  test('an error after a successful persist does not undo it', async () => {
    const { check, updates, logs } = harnessFor([due()], async (_p, _c, persist) => {
      await persist?.({ accessToken: 'at2' })
      throw new Error('late')
    })
    await check.checkConnection(due())
    expect(updates).toHaveLength(1)
    expect(logs.at(-1)).toBe('warn kiro/c-1 refresh error after successful persist (late); ignoring')
  })

  test('a failed persist is warned and the refresh is written in full afterwards', async () => {
    const { store } = fakeStore([due()])
    const writes: Row[] = []
    const logs: string[] = []
    let failNext = true
    const check = createConnectionHealthCheck({
      store: {
        getById: store.getById,
        update: (id: string, data: Row) => {
          if (failNext) {
            failNext = false
            throw new Error('disk full')
          }
          writes.push(data)
          return store.update(id, data)
        },
      },
      tokens: { getAccessToken: persisting as never },
      supportsTokenRefresh: () => true,
      env: {},
      now: () => NOW_MS,
      log: { warn: (_t: string, m: string) => void logs.push(`warn ${m}`), info: () => {} },
    })
    await check.checkConnection(due())
    expect(logs).toContain('warn kiro/c-1 DB write failed after successful refresh (disk full); token not persisted')
    expect(writes).toEqual([{ accessToken: 'at2', refreshToken: 'rt2', lastHealthCheckAt: NOW, testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, expiresAt: iso(60), tokenExpiresAt: iso(60) }])
  })

  test('an empty result opens the circuit and counts an expired retry', async () => {
    const expired = due({ testStatus: 'expired', providerSpecificData: { expiredRetry: { count: 1, at: iso(-60) } } })
    const { check, updates, logs } = harnessFor([expired], async () => null)
    await check.checkConnection(expired)
    expect(updates[0][1]).toMatchObject({ testStatus: 'expired', errorCode: 'refresh_failed', providerSpecificData: { expiredRetry: { count: 2, at: NOW } } })
    expect(logs.at(-1)).toBe('warn kiro/c-1 refresh failed (2/3 expired retries used)')
  })
})

describe('a dead refresh token', () => {
  const dead = async () => ({ error: 'unrecoverable_refresh_error', code: 'invalid_grant' })

  test('is ignored when the row was rotated during the refresh', async () => {
    const { check, updates, byId, logs } = harnessFor([due()], async () => {
      byId.set('c-1', { ...byId.get('c-1'), refreshToken: 'rt-other' })
      return { error: 'unrecoverable_refresh_error', code: 'invalid_grant' }
    })
    await check.checkConnection(due())
    expect(updates).toEqual([['c-1', { lastHealthCheckAt: NOW }]])
    expect(logs.at(-1)).toBe('warn kiro/c-1 changed during refresh; skipping stale deactivation')
  })

  test('expires the connection and drops a consumed token', async () => {
    const { check, updates, logs } = harnessFor([due()], dead)
    await check.checkConnection(due())
    expect(updates[0][1]).toMatchObject({ testStatus: 'expired', errorCode: 'invalid_grant', refreshToken: null })
    expect(logs.at(-1)).toBe('error kiro/c-1 — Refresh token is permanently invalid (invalid_grant). Retry 1/3 used; keeping connection active for retry.')
  })
})

describe('sweep', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c-${i}`, provider: 'kiro' }))

  test('checks every oauth and cookie connection in batches, with a pause between them', async () => {
    const order: string[] = []
    const sleeps: number[] = []
    const scheduler = createHealthCheckScheduler({
      listConnections: authType => (authType === 'oauth' ? rows(3) : [{ id: 'k', provider: 'chatgpt-web' }]),
      checkConnection: async connection => void order.push(connection.id as string),
      env: { THYROX_HEALTHCHECK_BATCH_SIZE: '2', THYROX_HEALTHCHECK_STAGGER_MS: '1000', THYROX_HEALTHCHECK_JITTER_MIN_MS: '100', THYROX_HEALTHCHECK_JITTER_MAX_MS: '300' },
      sleep: async ms => void sleeps.push(ms),
      random: () => 0.5,
    })
    expect(await scheduler.sweep()).toBe(4)
    expect(order).toEqual(['c-0', 'c-1', 'c-2', 'k'])
    expect(sleeps).toEqual([1200, 0])
  })

  test('the defaults: batches of twenty, a three-second stagger and a jitter of 0.5 to 5 s', async () => {
    const sleeps: number[] = []
    const scheduler = createHealthCheckScheduler({ listConnections: authType => (authType === 'oauth' ? rows(21) : []), checkConnection: async () => {}, env: {}, sleep: async ms => void sleeps.push(ms), random: () => 0 })
    expect(await scheduler.sweep()).toBe(21)
    expect(sleeps).toEqual([3500, 0])
  })

  test('a zero stagger only yields; a bad batch size falls back to twenty', async () => {
    const sleeps: number[] = []
    const scheduler = createHealthCheckScheduler({ listConnections: authType => (authType === 'oauth' ? rows(21) : []), checkConnection: async () => {}, env: { THYROX_HEALTHCHECK_STAGGER_MS: '0', THYROX_HEALTHCHECK_BATCH_SIZE: 'x' }, sleep: async ms => void sleeps.push(ms) })
    await scheduler.sweep()
    expect(sleeps).toEqual([0])
  })

  test('a negative batch size falls back to twenty', async () => {
    const sleeps: number[] = []
    const scheduler = createHealthCheckScheduler({ listConnections: authType => (authType === 'oauth' ? rows(21) : []), checkConnection: async () => {}, env: { THYROX_HEALTHCHECK_BATCH_SIZE: '-3', THYROX_HEALTHCHECK_STAGGER_MS: '0' }, sleep: ms => (sleeps.push(ms), new Promise<void>(resolve => setTimeout(resolve, 0))) })
    expect(await scheduler.sweep()).toBe(21)
    expect(sleeps).toEqual([0])
  }, 2000)

  test('a failing check is logged and does not stop the batch; an overlapping sweep is skipped', async () => {
    const errors: string[] = []
    let release!: () => void
    const held = new Promise<void>(resolve => (release = resolve))
    const scheduler = createHealthCheckScheduler({
      listConnections: authType => (authType === 'oauth' ? rows(2) : []),
      checkConnection: async connection => {
        if (connection.id === 'c-0') throw new Error('boom')
        await held
      },
      env: {},
      sleep: async () => {},
      log: { error: (_t, m) => void errors.push(m), info: () => {} },
    })
    const first = scheduler.sweep()
    expect(await scheduler.sweep()).toBe(0)
    release()
    expect(await first).toBe(2)
    expect(errors).toEqual(['Error checking c-0: boom'])
  })

  test('a failing listing is logged and counts nothing', async () => {
    const errors: string[] = []
    const scheduler = createHealthCheckScheduler({ listConnections: () => { throw new Error('locked') }, checkConnection: async () => {}, env: {}, log: { error: (_t, m) => void errors.push(m) } })
    expect(await scheduler.sweep()).toBe(0)
    expect(errors).toEqual(['Sweep error: locked'])
  })
})

describe('scheduler lifecycle', () => {
  test('starts after ten seconds, sweeps every minute, and stops cleanly', async () => {
    const timers: { kind: string; ms: number; fn: () => void; cleared?: boolean }[] = []
    let sweeps = 0
    const scheduler = createHealthCheckScheduler({
      listConnections: () => { sweeps++; return [] },
      checkConnection: async () => {},
      env: {},
      timers: {
        setTimeout: (fn, ms) => (timers.push({ kind: 'timeout', ms, fn }), timers.length - 1),
        setInterval: (fn, ms) => (timers.push({ kind: 'interval', ms, fn }), timers.length - 1),
        clear: handle => void (timers[handle as number].cleared = true),
      },
    })
    scheduler.start()
    scheduler.start()
    expect(timers.map(timer => [timer.kind, timer.ms])).toEqual([['timeout', 10_000]])
    timers[0].fn()
    expect(timers.map(timer => [timer.kind, timer.ms])).toEqual([['timeout', 10_000], ['interval', 60_000]])
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(sweeps).toBe(2)
    scheduler.stop()
    expect(timers[1].cleared).toBe(true)
    expect(scheduler.isRunning()).toBe(false)
  })

  test('a disabled scheduler never starts', () => {
    const timers: unknown[] = []
    const scheduler = createHealthCheckScheduler({ listConnections: () => [], checkConnection: async () => {}, env: { THYROX_DISABLE_TOKEN_HEALTHCHECK: 'Yes' }, timers: { setTimeout: () => timers.push(1), setInterval: () => 0, clear: () => {} } })
    scheduler.start()
    expect(timers).toEqual([])
    expect(scheduler.isRunning()).toBe(false)
  })

  test('the switches read from their variables', () => {
    for (const value of ['1', 'true', ' ON ', 'yes']) expect(healthCheckDisabled({ THYROX_DISABLE_TOKEN_HEALTHCHECK: value })).toBe(true)
    for (const value of [undefined, '', '0', 'off']) expect(healthCheckDisabled({ THYROX_DISABLE_TOKEN_HEALTHCHECK: value })).toBe(false)
    expect([...healthCheckSkipProviders({ THYROX_HEALTHCHECK_SKIP_PROVIDERS: ' Codex, openai ,,' })]).toEqual(['codex', 'openai'])
    expect([...healthCheckSkipProviders({})]).toEqual([])
  })
})

describe('hidden logs', () => {
  test('THYROX_HIDE_HEALTHCHECK_LOGS silences the check', async () => {
    const { check, logs } = harnessFor([due()], persisting, { env: { THYROX_HIDE_HEALTHCHECK_LOGS: 'true' } })
    await check.checkConnection(due())
    expect(logs).toEqual([])
  })

  test('skip providers come from the variable', async () => {
    const { check, calls } = harnessFor([due()], persisting, { env: { THYROX_HEALTHCHECK_SKIP_PROVIDERS: 'KIRO' } })
    await check.checkConnection(due())
    expect(calls).toEqual([])
  })
})
