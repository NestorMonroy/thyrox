import { describe, expect, test } from 'bun:test'
import { SharedStateUnavailableError } from '../consistency.ts'
import { openSharedStateStore, REDIS_URL_ENV } from '../factory.ts'
import type { SharedStateStore } from '../port.ts'

// Doble mínimo del puerto: registra qué adaptador atendió cada llamada.
function fakeStore(name: string, calls: string[], fail = false): SharedStateStore {
  const run = async <T>(value: T): Promise<T> => {
    calls.push(name)
    if (fail) throw new Error(`${name} caído`)
    return value
  }
  return {
    incrementWindow: () => run(1),
    acquireLease: () => run(true),
    releaseLease: () => run(true),
    getWithTtl: () => run('v'),
    setWithTtl: () => run(undefined),
    close: async () => {
      calls.push(`${name}:close`)
    },
  }
}

describe('openSharedStateStore', () => {
  test('sin THYROX_REDIS_URL abre el adaptador en memoria', async () => {
    const calls: string[] = []
    const opened = openSharedStateStore({
      env: {},
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => {
        throw new Error('no debía abrirse')
      },
    })
    expect(opened.backend).toBe('memory')
    await opened.store.incrementWindow('k', 1000)
    expect(calls).toEqual(['memory'])
  })

  test('con THYROX_REDIS_URL abre redis con esa URL', async () => {
    const calls: string[] = []
    let seenUrl = ''
    const opened = openSharedStateStore({
      env: { [REDIS_URL_ENV]: 'redis+unix:///run/r.sock' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: url => {
        seenUrl = url
        return fakeStore('redis', calls)
      },
    })
    expect(opened.backend).toBe('redis')
    expect(seenUrl).toBe('redis+unix:///run/r.sock')
    expect(await opened.store.getWithTtl('k')).toBe('v')
    expect(calls).toEqual(['redis'])
  })

  test('una URL vacía cuenta como ausente', () => {
    const opened = openSharedStateStore({
      env: { [REDIS_URL_ENV]: '   ' },
      createMemory: () => fakeStore('memory', []),
      createRedis: () => {
        throw new Error('no debía abrirse')
      },
    })
    expect(opened.backend).toBe('memory')
  })

  test('si redis falla degrada a memoria con un aviso y reintenta redis en la llamada siguiente', async () => {
    const calls: string[] = []
    const warnings: string[] = []
    const opened = openSharedStateStore({
      env: { [REDIS_URL_ENV]: 'redis://127.0.0.1:1' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls, true),
      warn: message => warnings.push(message),
    })
    expect(await opened.store.acquireLease('l', 'a', 1000)).toBe(true)
    expect(await opened.store.incrementWindow('k', 1000)).toBe(1)
    // ADR-THYROX-006: cada llamada vuelve a intentar redis antes de caer a memoria.
    expect(calls).toEqual(['redis', 'memory', 'redis', 'memory'])
    // El aviso sale al entrar en degradación, no en cada llamada mientras dura.
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('redis caído')
    expect(opened.degraded()).toBe(true)
  })

  test('cuando redis vuelve, la llamada siguiente lo usa y deja de estar degradado', async () => {
    const calls: string[] = []
    const warnings: string[] = []
    let down = true
    const redis = fakeStore('redis', calls)
    const flaky: SharedStateStore = {
      ...redis,
      getWithTtl: async key => {
        if (down) {
          calls.push('redis')
          throw new Error('redis caído')
        }
        return redis.getWithTtl(key)
      },
    }
    const opened = openSharedStateStore({
      env: { [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => flaky,
      warn: message => warnings.push(message),
    })
    await opened.store.getWithTtl('k')
    expect(opened.degraded()).toBe(true)
    down = false
    expect(await opened.store.getWithTtl('k')).toBe('v')
    expect(calls).toEqual(['redis', 'memory', 'redis'])
    expect(opened.degraded()).toBe(false)
    // Una segunda caída vuelve a avisar: es otra transición.
    down = true
    await opened.store.getWithTtl('k')
    expect(warnings).toHaveLength(2)
  })

  test('close cierra los dos adaptadores que llegaron a abrirse', async () => {
    const calls: string[] = []
    const opened = openSharedStateStore({
      env: { [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls, true),
      warn: () => {},
    })
    await opened.store.getWithTtl('k')
    await opened.store.close()
    expect(calls).toContain('redis:close')
    expect(calls).toContain('memory:close')
  })
})

describe('openSharedStateStore: THYROX_PROXY_MODE (R5a)', () => {
  test('sin THYROX_PROXY_MODE el modo por omisión es single', () => {
    const opened = openSharedStateStore({
      env: {},
      createMemory: () => fakeStore('memory', []),
    })
    expect(opened.mode).toBe('single')
  })

  test('un valor inválido de THYROX_PROXY_MODE falla en openSharedStateStore nombrando la variable', () => {
    expect(() =>
      openSharedStateStore({
        env: { THYROX_PROXY_MODE: 'todos' },
        createMemory: () => fakeStore('memory', []),
      }),
    ).toThrow(/THYROX_PROXY_MODE/)
  })

  test('la URL no infiere el modo: con THYROX_REDIS_URL y sin THYROX_PROXY_MODE el modo sigue siendo single', () => {
    const opened = openSharedStateStore({
      env: { [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', []),
      createRedis: () => fakeStore('redis', []),
    })
    expect(opened.mode).toBe('single')
  })

  test('multi sin THYROX_REDIS_URL falla al abrir con un error tipado', () => {
    expect(() =>
      openSharedStateStore({
        env: { THYROX_PROXY_MODE: 'multi' },
        createMemory: () => fakeStore('memory', []),
      }),
    ).toThrow(SharedStateUnavailableError)
  })
})

describe('openSharedStateStore: forConsistency en modo single (R5a)', () => {
  test('single: las tres clases se comportan igual que store (redis preferido, memoria con aviso)', async () => {
    const calls: string[] = []
    const opened = openSharedStateStore({
      env: { [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls),
    })
    await opened.forConsistency('requiresGlobalConsistency').incrementWindow('k', 1000)
    await opened.forConsistency('bestEffortShared').incrementWindow('k', 1000)
    await opened.forConsistency('localAllowed').incrementWindow('k', 1000)
    expect(calls).toEqual(['redis', 'redis', 'redis'])
  })
})

describe('openSharedStateStore: forConsistency en modo multi (R5a)', () => {
  test('multi con redis vivo: requiresGlobalConsistency y bestEffortShared usan redis', async () => {
    const calls: string[] = []
    const opened = openSharedStateStore({
      env: { THYROX_PROXY_MODE: 'multi', [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls),
    })
    expect(await opened.forConsistency('requiresGlobalConsistency').getWithTtl('k')).toBe('v')
    expect(await opened.forConsistency('bestEffortShared').getWithTtl('k')).toBe('v')
    expect(calls).toEqual(['redis', 'redis'])
  })

  test('multi con redis vivo: localAllowed usa memoria siempre, también con redis vivo', async () => {
    const calls: string[] = []
    const opened = openSharedStateStore({
      env: { THYROX_PROXY_MODE: 'multi', [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls),
    })
    expect(await opened.forConsistency('localAllowed').getWithTtl('k')).toBe('v')
    expect(calls).toEqual(['memory'])
  })

  test('multi con redis caído: requiresGlobalConsistency lanza SharedStateUnavailableError y NUNCA cae a memoria', async () => {
    const calls: string[] = []
    const opened = openSharedStateStore({
      env: { THYROX_PROXY_MODE: 'multi', [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls, true),
    })
    const strict = opened.forConsistency('requiresGlobalConsistency')
    await expect(strict.acquireLease('l', 'a', 1000)).rejects.toBeInstanceOf(SharedStateUnavailableError)
    await expect(strict.acquireLease('l', 'a', 1000)).rejects.toBeInstanceOf(SharedStateUnavailableError)
    // Cada llamada volvió a intentar redis; ninguna tocó memoria.
    expect(calls).toEqual(['redis', 'redis'])
  })

  test('multi con redis caído: bestEffortShared degrada a memoria con aviso y degraded() da verdadero', async () => {
    const calls: string[] = []
    const warnings: string[] = []
    const opened = openSharedStateStore({
      env: { THYROX_PROXY_MODE: 'multi', [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls, true),
      warn: message => warnings.push(message),
    })
    expect(await opened.forConsistency('bestEffortShared').getWithTtl('k')).toBe('v')
    expect(calls).toEqual(['redis', 'memory'])
    expect(warnings).toHaveLength(1)
    expect(opened.degraded()).toBe(true)
  })

  test('multi: close() es idempotente y cierra redis, el fallback de bestEffortShared y la memoria de localAllowed una sola vez', async () => {
    const calls: string[] = []
    const opened = openSharedStateStore({
      env: { THYROX_PROXY_MODE: 'multi', [REDIS_URL_ENV]: 'redis://x' },
      createMemory: () => fakeStore('memory', calls),
      createRedis: () => fakeStore('redis', calls, true),
      warn: () => {},
    })
    await opened.forConsistency('bestEffortShared').getWithTtl('k')
    await opened.forConsistency('localAllowed').getWithTtl('k')
    await opened.close()
    await opened.close()
    expect(calls.filter(c => c === 'redis:close')).toHaveLength(1)
    expect(calls.filter(c => c === 'memory:close')).toHaveLength(2)
  })
})
