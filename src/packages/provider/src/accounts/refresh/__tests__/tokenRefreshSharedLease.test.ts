/**
 * El refresco de tokens con estado compartido entre proxies (ADR-THYROX-006):
 * de dos instancias del refrescador que apuntan al mismo `SharedStateStore`,
 * sólo la que toma el lease llama al proveedor; la otra espera a que se
 * libere y lee lo que la primera ya persistió. Sin `sharedState`, sigue el
 * mutex en proceso de siempre.
 */
import { describe, expect, test } from 'bun:test'

import { createMemorySharedStateStore } from '@thyrox/shared-state/memory.ts'
import { createTokenRefresher } from '../tokenRefresh.ts'

function gate() {
  let open!: () => void
  const opened = new Promise<void>(resolve => (open = resolve))
  return { opened, open }
}

interface ConnectionRow {
  refreshToken?: string
  accessToken?: string
  expiresAt?: string
}

describe('token refresh with a shared lease', () => {
  test('two refreshers sharing one memory store call the provider once', async () => {
    const store = createMemorySharedStateStore()
    const row: ConnectionRow = { refreshToken: 'rt-0' }
    let calls = 0
    const started = gate()
    const finish = gate()

    function makeRefresher(owner: string) {
      return createTokenRefresher({
        refresh: async () => {
          calls++
          started.open()
          await finish.opened
          return { accessToken: 'at-shared', refreshToken: 'rt-shared', expiresIn: 3600 }
        },
        readConnection: () => row,
        sharedState: store,
        leaseOwner: owner,
      })
    }
    const persist = async (result: Record<string, unknown>) => {
      row.accessToken = result.accessToken as string
      row.refreshToken = result.refreshToken as string
    }

    const a = makeRefresher('proxy-a')
    const b = makeRefresher('proxy-b')

    const first = a.getAccessToken('claude', { refreshToken: 'rt-0', connectionId: 'conn-1' }, persist)
    await started.opened
    const second = b.getAccessToken('claude', { refreshToken: 'rt-0', connectionId: 'conn-1' }, persist)
    finish.open()

    const [resultA, resultB] = await Promise.all([first, second])
    expect(calls).toBe(1)
    expect((resultA as { accessToken: string }).accessToken).toBe('at-shared')
    expect((resultB as { accessToken: string }).accessToken).toBe('at-shared')
    expect(row.refreshToken).toBe('rt-shared')
  })

  test('without sharedState, today\'s in-process mutex keeps sharing the same refresh', async () => {
    let calls = 0
    const started = gate()
    const finish = gate()
    const refresher = createTokenRefresher({
      refresh: async () => {
        calls++
        started.open()
        await finish.opened
        return { accessToken: 'at-solo', refreshToken: 'rt-solo', expiresIn: 3600 }
      },
    })
    const first = refresher.getAccessToken('claude', { refreshToken: 'rt-0', connectionId: 'conn-2' })
    await started.opened
    const second = refresher.getAccessToken('claude', { refreshToken: 'rt-0', connectionId: 'conn-2' })
    finish.open()
    const [resultA, resultB] = await Promise.all([first, second])
    expect(calls).toBe(1)
    expect(resultA).toBe(resultB)
  })

  test('the lease is released even when the refresh throws', async () => {
    const store = createMemorySharedStateStore()
    let calls = 0
    const refresher = createTokenRefresher({
      refresh: async () => {
        calls++
        throw new Error('boom')
      },
      sharedState: store,
      leaseOwner: 'proxy-a',
    })
    await expect(refresher.getAccessToken('claude', { refreshToken: 'rt-0', connectionId: 'conn-3' })).rejects.toThrow('boom')
    expect(calls).toBe(1)
    expect(await store.acquireLease('token-refresh:conn-3', 'proxy-b', 1000)).toBe(true)
  })

  test('a waiter that never sees the lease released times out and warns, without calling the provider', async () => {
    const store = createMemorySharedStateStore()
    let calls = 0
    const warnings: string[] = []
    await store.acquireLease('token-refresh:conn-4', 'stuck-owner', 999_999)
    let now = 0
    const refresher = createTokenRefresher({
      refresh: async () => {
        calls++
        return { accessToken: 'at-never', refreshToken: 'rt-never', expiresIn: 3600 }
      },
      sharedState: store,
      leaseOwner: 'proxy-b',
      now: () => {
        now += 20_000
        return now
      },
      log: { warn: (_tag, message) => void warnings.push(message) },
    })
    const result = await refresher.getAccessToken('claude', { refreshToken: 'rt-0', connectionId: 'conn-4' })
    expect(result).toBeNull()
    expect(calls).toBe(0)
    expect(warnings.some(message => message.includes('conn-4'))).toBe(true)
  })
})
