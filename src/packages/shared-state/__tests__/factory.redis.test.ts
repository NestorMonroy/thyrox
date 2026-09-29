/**
 * Celda 5 de la matriz de R5a contra un `redis-server` real: en modo `multi`,
 * cuando el servidor cae a mitad de sesión, `requiresGlobalConsistency` lanza
 * `SharedStateUnavailableError` y NUNCA cae a memoria local.
 *
 * `Bun.RedisClient` reintenta con su `connectionTimeout` por omisión
 * (10 000 ms) antes de rechazar una orden ya en curso cuando el servidor
 * desaparece a mitad de conexión — no lo cambiamos aquí porque `redis.ts` no
 * expone esa opción y no es archivo de este ítem — así que esta prueba lleva
 * su propio plazo, más holgado que el por omisión de `bun:test`.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SharedStateUnavailableError } from '../consistency.ts'
import { openSharedStateStore } from '../factory.ts'
import { resolveRedisServerFromToolchain } from './redisServerFromToolchain.ts'

const SOCKET_WAIT_TIMEOUT_MS = 5_000
const SOCKET_WAIT_STEP_MS = 20
const TEST_TIMEOUT_MS = 20_000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isSocket(path: string): boolean {
  return existsSync(path) && statSync(path).isSocket()
}

async function waitForSocket(path: string): Promise<void> {
  const deadline = Date.now() + SOCKET_WAIT_TIMEOUT_MS
  while (!isSocket(path)) {
    if (Date.now() > deadline) {
      throw new Error(`redis-server efímero: el socket ${path} no apareció en ${SOCKET_WAIT_TIMEOUT_MS}ms.`)
    }
    await sleep(SOCKET_WAIT_STEP_MS)
  }
}

const redisServerBin = resolveRedisServerFromToolchain()

const runDir = mkdtempSync(join(tmpdir(), 'thyrox-shared-state-factory-redis-'))
const socketPath = join(runDir, 'redis.sock')
const redisUrl = `redis+unix://${socketPath}`

const server = Bun.spawn(
  [redisServerBin, '--port', '0', '--unixsocket', socketPath, '--unixsocketperm', '700', '--save', '', '--appendonly', 'no'],
  { stdout: 'ignore', stderr: 'ignore' },
)

beforeAll(async () => {
  await waitForSocket(socketPath)
})

afterAll(async () => {
  if (isSocket(socketPath)) {
    server.kill()
    await server.exited
  }
  rmSync(runDir, { recursive: true, force: true })
})

describe('openSharedStateStore contra redis real: multi con el servidor caído', () => {
  test(
    'requiresGlobalConsistency lanza y no cae a memoria cuando el servidor se corta',
    async () => {
      const opened = openSharedStateStore({
        env: { THYROX_PROXY_MODE: 'multi', THYROX_REDIS_URL: redisUrl },
        warn: () => {},
      })
      try {
        const strict = opened.forConsistency('requiresGlobalConsistency')
        expect(await strict.setWithTtl('k', 'v', 10_000)).toBeUndefined()

        server.kill()
        await server.exited
        rmSync(socketPath, { force: true })

        await expect(strict.acquireLease('l', 'a', 10_000)).rejects.toBeInstanceOf(SharedStateUnavailableError)
        // localAllowed, en el mismo proceso y con el mismo servidor caído,
        // sigue resolviendo en memoria: nunca depende de redis.
        expect(await opened.forConsistency('localAllowed').acquireLease('l', 'a', 10_000)).toBe(true)
      } finally {
        await opened.close()
      }
    },
    TEST_TIMEOUT_MS,
  )
})
