/**
 * El orquestador del refresco: una conexión refresca una sola vez aunque la
 * pidan varios a la vez, los proveedores que rotan refrescan de uno en uno
 * por familia, un token ya rotado no se vuelve a presentar, la fila guardada
 * gana a la copia en memoria si es más nueva, y el guardado ocurre dentro de
 * la misma ventana que el refresco.
 *
 * Porte de `getAccessToken`, `getAllAccessTokens` y
 * `getConnectionRefreshMutexStatus` de `omniroute: open-sse/services/tokenRefresh.ts`
 * y de `omniroute: open-sse/services/refreshSerializer.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { runWithCasGuard } from '../../../src/accounts/refresh/casGuard.ts'
import { runWithPersist } from '../../../src/accounts/refresh/persistContext.ts'
import { createRefreshSerializer, refreshSpacingMs, rotationGroupFor } from '../../../src/accounts/refresh/refreshSerializer.ts'
import { createRotationMap } from '../../../src/accounts/refresh/rotationMap.ts'
import { createTokenRefresher } from '../../../src/accounts/refresh/tokenRefresh.ts'

function gate() {
  let open!: () => void
  const opened = new Promise<void>(resolve => (open = resolve))
  return { opened, open }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

describe('refresh serializer', () => {
  test('providers of one token family share a lane; the rest have none', () => {
    expect(rotationGroupFor('codex')).toBe(rotationGroupFor('openai'))
    for (const provider of ['claude', 'gitlab-duo', 'kiro', 'kimi-coding', 'cline']) expect(rotationGroupFor(provider)).toBe(provider === 'claude' ? 'anthropic-oauth' : provider)
    for (const provider of ['antigravity', 'gemini', 'github', 'qoder']) expect(rotationGroupFor(provider)).toBeNull()
  })

  test('the spacing comes from its variable; zero opts out, garbage keeps the default', () => {
    expect(refreshSpacingMs({})).toBe(2000)
    expect(refreshSpacingMs({ THYROX_REFRESH_SPACING_MS: '' })).toBe(2000)
    expect(refreshSpacingMs({ THYROX_REFRESH_SPACING_MS: '0' })).toBe(0)
    expect(refreshSpacingMs({ THYROX_REFRESH_SPACING_MS: '500' })).toBe(500)
    for (const bad of ['abc', '-1', 'Infinity']) expect(refreshSpacingMs({ THYROX_REFRESH_SPACING_MS: bad })).toBe(2000)
  })

  test('refreshes of one family run one at a time, with a gap only when another waits', async () => {
    const sleeps: number[] = []
    const serialize = createRefreshSerializer({ env: {}, sleep: async ms => void sleeps.push(ms) })
    const first = gate()
    const order: string[] = []
    const a = serialize('codex', async () => {
      order.push('a:start')
      await first.opened
      order.push('a:end')
      return 'a'
    })
    const b = serialize('openai', async () => {
      order.push('b:start')
      return 'b'
    })
    await tick()
    expect(order).toEqual(['a:start'])
    first.open()
    expect(await Promise.all([a, b])).toEqual(['a', 'b'])
    expect(order).toEqual(['a:start', 'a:end', 'b:start'])
    expect(sleeps).toEqual([2000])
    expect(await serialize('codex', async () => 'lone')).toBe('lone')
    expect(sleeps).toEqual([2000])
  })

  test('other families and non-rotating providers do not wait', async () => {
    const serialize = createRefreshSerializer({ env: {}, sleep: async () => {} })
    const held = gate()
    const started: string[] = []
    const slow = serialize('codex', async () => {
      await held.opened
    })
    const others = ['claude', 'antigravity', 'antigravity'].map(provider => serialize(provider, async () => void started.push(provider)))
    await Promise.all(others)
    expect(started.sort()).toEqual(['antigravity', 'antigravity', 'claude'])
    held.open()
    await slow
  })

  test('a failed refresh still releases the lane', async () => {
    const serialize = createRefreshSerializer({ env: { THYROX_REFRESH_SPACING_MS: '0' }, sleep: async () => {} })
    const failed = serialize('kiro', async () => {
      throw new Error('boom')
    })
    const next = serialize('kiro', async () => 'next')
    await expect(failed).rejects.toThrow('boom')
    expect(await next).toBe('next')
  })

  test('a zero spacing never sleeps, even with a refresh waiting', async () => {
    const sleeps: number[] = []
    const serialize = createRefreshSerializer({ env: { THYROX_REFRESH_SPACING_MS: '0' }, sleep: async ms => void sleeps.push(ms) })
    await Promise.all([serialize('kiro', async () => 1), serialize('kiro', async () => 2)])
    expect(sleeps).toEqual([])
  })
})

type Outcome = Record<string, unknown> | null

function refresher(options: { outcome?: (provider: string, refreshToken: string) => Outcome | Promise<Outcome>; readConnection?: (id: string) => unknown; now?: () => number } = {}) {
  const calls: { provider: string; refreshToken: string; connectionId?: string | null }[] = []
  const logs: string[] = []
  const serialized: string[] = []
  const log = { info: (_t: string, m: string) => void logs.push(`info ${m}`), warn: (_t: string, m: string) => void logs.push(`warn ${m}`), error: (_t: string, m: string) => void logs.push(`error ${m}`) }
  const tokens = createTokenRefresher({
    refresh: async (provider, credentials) => {
      calls.push({ provider, refreshToken: credentials.refreshToken, connectionId: credentials.connectionId })
      return (options.outcome ?? ((_p, rt) => ({ accessToken: `at-${rt}`, refreshToken: `${rt}-next`, expiresIn: 3600 })))(provider, credentials.refreshToken) as never
    },
    serialize: (provider, fn) => {
      serialized.push(provider)
      return fn()
    },
    rotations: createRotationMap({ now: options.now }),
    readConnection: options.readConnection as never,
    now: options.now,
    log,
  })
  return { tokens, calls, logs, serialized }
}

describe('access token orchestration', () => {
  test('without a usable refresh token nothing is refreshed', async () => {
    const { tokens, calls, logs } = refresher()
    for (const credentials of [null, {}, { refreshToken: '' }, { refreshToken: 7 }]) expect(await tokens.getAccessToken('codex', credentials as never)).toBeNull()
    expect(calls).toEqual([])
    expect(logs.at(-1)).toBe('warn No valid refresh token available for provider: codex')
  })

  test('concurrent callers of one connection share one refresh, whatever token each loaded', async () => {
    const held = gate()
    const { tokens, calls, logs } = refresher({ outcome: async (_p, rt) => (await held.opened, { accessToken: 'at', refreshToken: `${rt}-next` }) })
    const first = tokens.getAccessToken('codex', { refreshToken: 'rt-a', connectionId: 'c-1' })
    const second = tokens.getAccessToken('codex', { refreshToken: 'rt-b', connectionId: 'c-1' })
    await tick()
    expect(tokens.connectionMutexStatus()).toEqual({ 'c-1': { waiters: 1 } })
    held.open()
    expect(await first).toEqual(await second)
    expect(calls).toHaveLength(1)
    expect(logs).toContain('info Concurrent refresh detected — sharing in-flight refresh')
    expect(tokens.connectionMutexStatus()).toEqual({})
  })

  test('different connections refresh independently', async () => {
    const { tokens, calls } = refresher()
    await Promise.all([tokens.getAccessToken('codex', { refreshToken: 'a', connectionId: 'c-1' }), tokens.getAccessToken('codex', { refreshToken: 'b', connectionId: 'c-2' })])
    expect(calls.map(call => call.refreshToken).sort()).toEqual(['a', 'b'])
  })

  test('without a connection, concurrent refreshes of the same token are shared', async () => {
    const held = gate()
    const { tokens, calls, logs } = refresher({ outcome: async (_p, rt) => (await held.opened, { accessToken: 'at', refreshToken: `${rt}-next` }) })
    const same = [tokens.getAccessToken('codex', { refreshToken: 'rt' }), tokens.getAccessToken('codex', { refreshToken: 'rt' })]
    const other = tokens.getAccessToken('codex', { refreshToken: 'rt-2' })
    await tick()
    held.open()
    await Promise.all([...same, other])
    expect(calls.map(call => call.refreshToken)).toEqual(['rt', 'rt-2'])
    expect(logs).toContain('info Reusing in-flight refresh for codex')
    await tokens.getAccessToken('codex', { refreshToken: 'rt-3' })
    expect(calls).toHaveLength(3)
  })

  test('every refresh goes through the family lane', async () => {
    const { tokens, serialized } = refresher()
    await tokens.getAccessToken('kiro', { refreshToken: 'rt', connectionId: 'c-1' })
    await tokens.getAccessToken('claude', { refreshToken: 'rt' })
    expect(serialized).toEqual(['kiro', 'claude'])
  })

  test('a token already rotated is answered from the rotation, not presented again', async () => {
    const { tokens, calls, logs } = refresher()
    const first = await tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-1' })
    expect(await tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-2' })).toEqual(first)
    expect(calls).toHaveLength(1)
    expect(logs).toContain('info Rotation map hit for codex. Returning cached rotated tokens (avoids family-revoke).')
  })

  test('a dead or tokenless result is not remembered as a rotation', async () => {
    for (const outcome of [{ error: 'unrecoverable_refresh_error', code: 'invalid_grant', refreshToken: 'rt-next' }, { accessToken: 'at' }, { refreshToken: 'rt-next' }, null]) {
      const { tokens, calls } = refresher({ outcome: () => outcome })
      await tokens.getAccessToken('codex', { refreshToken: 'rt' })
      await tokens.getAccessToken('codex', { refreshToken: 'rt' })
      expect(calls).toHaveLength(2)
    }
  })
})

describe('stored row freshness', () => {
  const NOW = 1_000_000

  test('a newer stored token that is still fresh is used without refreshing', async () => {
    const row = { refreshToken: 'rt-db', accessToken: 'at-db', expiresAt: new Date(NOW + 120_000).toISOString() }
    const { tokens, calls, logs } = refresher({ readConnection: () => row, now: () => NOW })
    expect(await tokens.getAccessToken('codex', { refreshToken: 'rt-old', connectionId: 'c-1' })).toEqual({ accessToken: 'at-db', refreshToken: 'rt-db', expiresAt: row.expiresAt })
    expect(calls).toEqual([])
    expect(logs).toContain('info DB token is still valid. Skipping OAuth refresh.')
  })

  test('a newer stored token about to expire is the one refreshed', async () => {
    const row = { refreshToken: 'rt-db', accessToken: 'at-db', expiresAt: new Date(NOW + 30_000).toISOString() }
    const { tokens, calls } = refresher({ readConnection: () => row, now: () => NOW })
    expect(await tokens.getAccessToken('codex', { refreshToken: 'rt-old', connectionId: 'c-1' })).toMatchObject({ refreshToken: 'rt-db-next' })
    expect(calls).toEqual([{ provider: 'codex', refreshToken: 'rt-db', connectionId: 'c-1' }])
  })

  test('the same stored token, a missing row or a read failure change nothing', async () => {
    for (const readConnection of [() => ({ refreshToken: 'rt', accessToken: 'x', expiresAt: new Date(NOW + 999_999).toISOString() }), () => null, () => ({ accessToken: 'x' }), () => { throw new Error('locked') }]) {
      const { tokens, calls } = refresher({ readConnection, now: () => NOW })
      await tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-1' })
      expect(calls).toEqual([{ provider: 'codex', refreshToken: 'rt', connectionId: 'c-1' }])
    }
    const failing = refresher({ readConnection: () => { throw new Error('locked') }, now: () => NOW })
    await failing.tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-1' })
    expect(failing.logs).toContain('warn Failed to check DB for stale token: locked')
  })

  test('without a connection the stored row is not consulted', async () => {
    let reads = 0
    const { tokens } = refresher({ readConnection: () => void reads++, now: () => NOW })
    await tokens.getAccessToken('codex', { refreshToken: 'rt' })
    expect(reads).toBe(0)
  })
})

describe('persisting the refresh', () => {
  test('the result is persisted inside the connection window, before waiters see it', async () => {
    const order: string[] = []
    const { tokens } = refresher()
    const persist = async (result: Record<string, unknown>) => void order.push(`persist ${result.accessToken}`)
    const [first, second] = await Promise.all([tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-1' }, persist).then(r => (order.push('first'), r)), tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-1' }).then(r => (order.push('second'), r))])
    expect(first).toEqual(second)
    expect(order).toEqual(['persist at-rt', 'first', 'second'])
  })

  test('the persist callback can travel with the call', async () => {
    const saved: unknown[] = []
    const { tokens } = refresher()
    await runWithPersist(async result => void saved.push(result.accessToken), () => tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-1' }))
    await runWithPersist(async result => void saved.push(result.accessToken), () => tokens.getAccessToken('codex', { refreshToken: 'rt2' }))
    expect(saved).toEqual(['at-rt', 'at-rt2'])
  })

  test('a failed persist is logged and reaches the caller', async () => {
    for (const connectionId of ['c-1', undefined]) {
      const { tokens, logs } = refresher()
      await expect(tokens.getAccessToken('codex', { refreshToken: `rt-${connectionId}`, connectionId }, async () => { throw new Error('disk full') })).rejects.toThrow('disk full')
      expect(logs.at(-1)).toContain('disk full')
      expect(tokens.connectionMutexStatus()).toEqual({})
    }
  })

  test('a row already rotated by another writer is not overwritten', async () => {
    for (const connectionId of ['c-1', undefined]) {
      const saved: unknown[] = []
      const { tokens } = refresher()
      const result = await runWithCasGuard({ expectedRefreshToken: 'rt', reread: async () => 'rt-by-someone-else' }, () => tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId }, async r => void saved.push(r)))
      expect(result).toMatchObject({ accessToken: 'at-rt' })
      expect(saved).toEqual([])
    }
  })

  test('only a result with an access token is persisted; a connectionless success without persist warns', async () => {
    const saved: unknown[] = []
    const dead = refresher({ outcome: () => ({ error: 'unrecoverable_refresh_error', code: 'invalid_grant' }) })
    await dead.tokens.getAccessToken('codex', { refreshToken: 'rt', connectionId: 'c-1' }, async r => void saved.push(r))
    await dead.tokens.getAccessToken('codex', { refreshToken: 'rt' }, async r => void saved.push(r))
    expect(saved).toEqual([])
    const bare = refresher()
    await bare.tokens.getAccessToken('codex', { refreshToken: 'rt' })
    expect(bare.logs).toContain('warn Layer 2 refresh succeeded for codex without onPersist — DB row will not be updated with rotated token. Callers should pass connectionId for Layer 1 atomicity.')
  })
})

describe('all access tokens', () => {
  test('each active connection with a provider is refreshed, keyed by provider', async () => {
    const { tokens, calls } = refresher({ outcome: (provider, rt) => (provider === 'kiro' ? null : { accessToken: `at-${rt}`, refreshToken: `${rt}-next` }) })
    const result = await tokens.getAllAccessTokens([
      { provider: 'codex', refreshToken: 'a', isActive: true },
      { provider: 'claude', refreshToken: 'b', isActive: false },
      { refreshToken: 'c', isActive: true },
      { provider: 'kiro', refreshToken: 'd', isActive: true },
    ])
    expect(result).toEqual({ codex: { accessToken: 'at-a', refreshToken: 'a-next' } })
    expect(calls.map(call => call.provider)).toEqual(['codex', 'kiro'])
    expect(await tokens.getAllAccessTokens(undefined)).toEqual({})
  })
})
