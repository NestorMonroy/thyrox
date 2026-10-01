/**
 * Contrato del adaptador `redis`: levanta un `redis-server` efímero propio
 * (socket Unix, sin persistencia) y le corre la misma suite que `memory`,
 * más el caso que distingue a `redis`: dos CLIENTES distintos —el caso real
 * entre dos instancias del proxy— compitiendo por el mismo lease.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describeSharedStateStoreContract } from '../contract.ts'
import { createRedisSharedStateStore } from '../redis.ts'
import { resolveRedisServerFromToolchain } from './redisServerFromToolchain.ts'

const SOCKET_WAIT_TIMEOUT_MS = 5_000
const SOCKET_WAIT_STEP_MS = 20

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

// Por el toolchain, no por el PATH: si falta, la prueba falla con el motivo del
// toolchain (opt-in THYROX_INSTALL_REDIS), nunca se salta en silencio.
const redisServerBin = resolveRedisServerFromToolchain()

const runDir = mkdtempSync(join(tmpdir(), 'thyrox-shared-state-redis-'))
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
  server.kill()
  await server.exited
  rmSync(runDir, { recursive: true, force: true })
})

describeSharedStateStoreContract('redis', async () => createRedisSharedStateStore(redisUrl))

describe('adaptador redis: entre dos proxies', () => {
  test('un lease tomado por un cliente no lo obtiene otro cliente', async () => {
    const proxyA = createRedisSharedStateStore(redisUrl)
    const proxyB = createRedisSharedStateStore(redisUrl)
    const key = `entre-proxies:${crypto.randomUUID()}:lease`

    try {
      expect(await proxyA.acquireLease(key, 'proxy-a', 10_000)).toBe(true)
      expect(await proxyB.acquireLease(key, 'proxy-b', 10_000)).toBe(false)
      expect(await proxyB.releaseLease(key, 'proxy-b')).toBe(false)
      expect(await proxyA.releaseLease(key, 'proxy-a')).toBe(true)
      expect(await proxyB.acquireLease(key, 'proxy-b', 10_000)).toBe(true)
    } finally {
      await proxyA.close()
      await proxyB.close()
    }
  })
})
