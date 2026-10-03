/**
 * Contrato de la coordinación `shared` contra un `redis-server` efímero propio
 * (socket Unix, sin persistencia), más el caso que la distingue: dos clientes
 * —dos coordinadores— compitiendo por la misma residencia, y la caída de Redis
 * que devuelve `unavailable` en vez de un lease local.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolveRedisServerFromToolchain } from '@thyrox/shared-state/__tests__/redisServerFromToolchain.ts'

import { describeCoordinationContract } from '../coordinationContract.ts'
import { createRedisCoordination } from '../redisCoordination.ts'

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
    if (Date.now() > deadline) throw new Error(`redis-server efímero: el socket ${path} no apareció en ${SOCKET_WAIT_TIMEOUT_MS}ms.`)
    await sleep(SOCKET_WAIT_STEP_MS)
  }
}

const redisServerBin = resolveRedisServerFromToolchain()
const runDir = mkdtempSync(join(tmpdir(), 'thyrox-model-scheduling-redis-'))
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

describeCoordinationContract('redis (shared)', async () => createRedisCoordination(redisUrl))

describe('coordinación shared: entre coordinadores', () => {
  test('dos clientes no obtienen la misma residencia, y la generación sube al cambiar de dueño', async () => {
    const coordinatorA = createRedisCoordination(redisUrl)
    const coordinatorB = createRedisCoordination(redisUrl)
    const key = `residency/${crypto.randomUUID()}/cpu`
    try {
      const first = await coordinatorA.acquireResidency(key, 'coordinator-a', 10_000)
      expect(first.status).toBe('acquired')
      expect(await coordinatorB.acquireResidency(key, 'coordinator-b', 10_000)).toEqual({ status: 'held', holder: 'coordinator-a' })
      if (first.status !== 'acquired') return
      expect(await coordinatorA.release(first.lease)).toBe('current')
      const second = await coordinatorB.acquireResidency(key, 'coordinator-b', 10_000)
      expect(second.status === 'acquired' && second.lease.generation).toBe(2)
    } finally {
      await coordinatorA.close()
      await coordinatorB.close()
    }
  })

  test('sin servidor la coordinación responde unavailable, nunca un lease local', async () => {
    const unreachable = createRedisCoordination(`redis+unix://${join(runDir, 'absent.sock')}`)
    try {
      const outcome = await unreachable.acquireResidency(`residency/${crypto.randomUUID()}/cpu`, 'coordinator-a', 10_000)
      expect(outcome.status).toBe('unavailable')
      expect(await unreachable.currentGeneration('residency/x/cpu')).toBe('unavailable')
    } finally {
      await unreachable.close()
    }
  })
})
