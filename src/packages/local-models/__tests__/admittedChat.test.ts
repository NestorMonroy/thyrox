import { afterEach, describe, expect, test } from 'bun:test'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'
import { FAKE_UNIT_OWNER } from '@thyrox/model-scheduling/testing/schedulerFakes.ts'

import { admittedChat } from '../admittedChat.js'

/**
 * El plazo de una inferencia local lo declara quien la pide (H-THYROX-417).
 *
 * Medido con Bun 1.3.11: un `fetch` sin opciones corta a los 300 s con
 * `TimeoutError`, y una generación en CPU de qwen3-4b (~2.7 tok/s) los supera.
 * Lo que haría fallar a esta suite: que la petición vuelva a heredar el plazo
 * del runtime, o que el plazo declarado no corte.
 */
const ARTIFACT = resolvedArtifact()
const REPLY = { message: { content: 'hola' }, eval_count: 1, eval_duration: 1 }

function ticketTo(endpoint: string): AdmissionTicket {
  const grant: ExecutionGrant = {
    grantId: 'grant-1', requestId: 'request-1', artifact: ARTIFACT, runtime: 'ollama', placement: { kind: 'cpu' },
    residency: { mode: 'create', instance: 'residency-1', generation: 1 }, residencyVramMib: 0, requestVramMib: 0,
    contextLength: 8192, kvCacheType: 'f16', issuedAt: '2026-10-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z',
  }
  return {
    admissionId: 'admission-1', requestId: 'request-1', client: 'qualify', grant,
    unit: {
      unitId: 'unit-1', kind: 'model-runtime', reference: { kind: 'grant', grantId: grant.grantId }, owner: FAKE_UNIT_OWNER,
      containerName: 'thyrox-model-unit-1', grantId: grant.grantId, artifact: ARTIFACT, residencyKey: 'residency-1',
      generation: 1, runtime: 'ollama', endpoint, containerId: 'container-1', devices: [], hostPids: [],
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  }
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('admittedChat', () => {
  test('la petición no hereda el plazo de 300 s del runtime', async () => {
    let seen: (RequestInit & { timeout?: boolean }) | undefined
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      seen = init
      return new Response(JSON.stringify(REPLY))
    }) as typeof fetch
    await admittedChat(ticketTo('http://127.0.0.1:1'), { messages: [] })
    expect(seen?.timeout).toBe(false)
  })

  test('sin plazo declarado no hay señal que corte', async () => {
    let seen: RequestInit | undefined
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      seen = init
      return new Response(JSON.stringify(REPLY))
    }) as typeof fetch
    await admittedChat(ticketTo('http://127.0.0.1:1'), { messages: [] })
    expect(seen?.signal ?? undefined).toBeUndefined()
  })

  test('un plazo declarado corta la petición lenta', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: async () => {
        await Bun.sleep(500)
        return new Response(JSON.stringify(REPLY))
      },
    })
    try {
      const reply = admittedChat(ticketTo(`http://127.0.0.1:${server.port}`), { messages: [] }, { deadlineMs: 50 })
      await expect(reply).rejects.toMatchObject({ name: 'TimeoutError' })
    } finally {
      server.stop(true)
    }
  })

  test('dentro del plazo la respuesta llega', async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Response(JSON.stringify(REPLY)) })
    try {
      const reply = await admittedChat(ticketTo(`http://127.0.0.1:${server.port}`), { messages: [] }, { deadlineMs: 5000 })
      expect(reply.content).toBe('hola')
    } finally {
      server.stop(true)
    }
  })
})
