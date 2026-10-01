/**
 * TASK-THYROX-0324 (B): `assertMinVersion` no sale antes por
 * `NODE_ENV === 'test'`. La función equivalente del ejecutable 2.1.283
 * (`Ilo`, chunk-hk0h5tw7) entra directo al `try` y lee
 * `tengu_version_config`. La configuración dinámica se inyecta con
 * `mock.module`; `process.exit` se sustituye para observar la salida.
 */
import { expect, mock, test } from 'bun:test'

const calls: string[] = []
mock.module('../internal/dynamicConfigCompat.js', () => ({
  getDynamicConfig_BLOCKS_ON_INIT: async (key: string, fallback: unknown) => {
    calls.push(key)
    return key === 'tengu_version_config'
      ? { minVersion: '9999.0.0' }
      : fallback
  },
  getDynamicConfig_CACHED_MAY_BE_STALE: (_k: string, f: unknown) => f,
}))

const exits: number[] = []
mock.module('@thyrox/app-host/bootstrap/gracefulShutdown.js', () => ({
  gracefulShutdownSync: (code: number) => {
    exits.push(code)
  },
}))

const { assertMinVersion } = await import('../autoUpdater.ts')

test('bajo NODE_ENV=test consulta la versión mínima y avisa si la actual es menor', async () => {
  expect(process.env.NODE_ENV).toBe('test')
  const errors: string[] = []
  const origErr = console.error
  console.error = (m: unknown) => {
    errors.push(String(m))
  }
  try {
    await assertMinVersion()
  } finally {
    console.error = origErr
  }
  expect(calls).toContain('tengu_version_config')
  expect(errors.join('\n')).toContain('needs an update')
  expect(exits).toEqual([1])
})
