/**
 * El forwarder compatible con OpenAI por sí solo, con una petición ya
 * enrutada: los errores del upstream (conexión rechazada, 4xx, 5xx, JSON
 * inválido, stream roto) vuelven como error Messages que nombra el upstream
 * y la URL, nunca como una respuesta vacía; lo que no es suyo sigue a `next`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { createOpenAICompatForwarder, type OpenAICompatUpstreamConfig } from '../openaiCompat/forwarder.ts'
import type { ForwardRequest } from '../server.ts'
import { startFakeOpenAIUpstream, type FakeFailure } from './fakeOpenAIUpstream.ts'

type JsonRecord = Record<string, unknown>

const ENV = {}
const HELLO = { model: 'm', max_tokens: 8, messages: [{ role: 'user', content: 'hola' }] }

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function routed(body: JsonRecord, upstreamName = 'open', path = '/v1/messages'): ForwardRequest {
  return {
    upstream: { name: upstreamName, provider: 'openai-compatible' }, upstreamModel: 'qwen', credential: { id: `openai-compat:${upstreamName}` },
    path, search: '', body, headers: new Headers(), signal: new AbortController().signal, requestId: 'req-1',
  }
}

function forwarderTo(upstream: OpenAICompatUpstreamConfig, next: (request: ForwardRequest) => Promise<Response> = () => Promise.resolve(new Response('next'))) {
  return createOpenAICompatForwarder({ next, upstreams: { [upstream.name]: upstream }, env: ENV })
}

function failingFake(failure: FakeFailure): string {
  const fake = startFakeOpenAIUpstream({ failure })
  cleanups.push(fake.stop)
  return fake.baseUrl
}

/** Una base de loopback en la que nadie escucha: se abre un puerto y se cierra. */
function refusedBaseUrl(): string {
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('') })
  const port = server.port
  server.stop(true)
  return `http://127.0.0.1:${port}/v1`
}

async function errorOf(response: Response): Promise<{ type: string; message: string }> {
  const body = await response.json() as { type: string; error: { type: string; message: string } }
  expect(body.type).toBe('error')
  return body.error
}

describe('errores del upstream', () => {
  // A6 r7: el upstream local es un modelo en CPU cuyo primer byte tarda
  // minutos; el corte de 300 s del fetch de Bun no puede decidir el plazo.
  test('la petición al upstream no hereda el plazo de 300 s del fetch de Bun', async () => {
    let seen: (RequestInit & { timeout?: boolean }) | undefined
    const forwarder = createOpenAICompatForwarder({
      next: () => Promise.resolve(new Response('next')), upstreams: { open: { name: 'open', baseUrl: 'http://127.0.0.1:9/v1' } }, env: ENV,
      fetch: (async (_url: string, init?: RequestInit) => { seen = init; return Response.json({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }) }) as typeof fetch,
    })
    await forwarder(routed(HELLO))
    expect(seen?.timeout).toBe(false)
  })

  test('conexión rechazada → 502 api_error con el upstream y la URL', async () => {
    const baseUrl = refusedBaseUrl()
    const response = await forwarderTo({ name: 'open', baseUrl })(routed(HELLO))
    expect(response.status).toBe(502)
    const error = await errorOf(response)
    expect(error.type).toBe('api_error')
    expect(error.message).toContain('"open"')
    expect(error.message).toContain(`${baseUrl}/chat/completions`)
  })

  test('un 4xx conserva su estado, su tipo Messages y el cuerpo del upstream', async () => {
    const baseUrl = failingFake({ kind: 'status', status: 404, body: '{"error":{"message":"model qwen not found"}}' })
    const response = await forwarderTo({ name: 'open', baseUrl })(routed(HELLO))
    expect(response.status).toBe(404)
    const error = await errorOf(response)
    expect(error.type).toBe('not_found_error')
    expect(error.message).toContain('model qwen not found')
    expect(error.message).toContain(`${baseUrl}/chat/completions`)
  })

  test('un 5xx es un 502 api_error con el estado del upstream y su cuerpo', async () => {
    const baseUrl = failingFake({ kind: 'status', status: 500, body: 'se cayó el runner' })
    const response = await forwarderTo({ name: 'open', baseUrl })(routed(HELLO))
    expect(response.status).toBe(502)
    const error = await errorOf(response)
    expect(error.type).toBe('api_error')
    expect(error.message).toContain('500')
    expect(error.message).toContain('se cayó el runner')
    expect(error.message).toContain('"open"')
  })

  test('un 200 cuyo cuerpo no es JSON → 502 que lo dice', async () => {
    const baseUrl = failingFake({ kind: 'invalid-json' })
    const response = await forwarderTo({ name: 'open', baseUrl })(routed(HELLO))
    expect(response.status).toBe(502)
    const error = await errorOf(response)
    expect(error.message).toContain('JSON')
    expect(error.message).toContain(`${baseUrl}/chat/completions`)
  })

  test('un JSON sin choices → 502, no un mensaje vacío', async () => {
    const baseUrl = failingFake({ kind: 'status', status: 200, body: '{"id":"x","choices":[]}' })
    const response = await forwarderTo({ name: 'open', baseUrl })(routed(HELLO))
    expect(response.status).toBe(502)
    expect((await errorOf(response)).message).toContain('choices')
  })

  test('con stream, un cuerpo que no es SSE JSON termina en un evento error con contexto', async () => {
    const baseUrl = failingFake({ kind: 'invalid-json' })
    const response = await forwarderTo({ name: 'open', baseUrl })(routed({ ...HELLO, stream: true }))
    const text = await response.text()
    expect(text).toContain('event: error')
    expect(text).toContain(`${baseUrl}/chat/completions`)
  })

  test('con stream, un chunk data: que no es JSON termina en un evento error que lo dice', async () => {
    const baseUrl = failingFake({ kind: 'invalid-sse-chunk' })
    const response = await forwarderTo({ name: 'open', baseUrl })(routed({ ...HELLO, stream: true }))
    const text = await response.text()
    expect(text).toContain('event: error')
    expect(text).toContain('no es JSON')
    expect(text).toContain(`${baseUrl}/chat/completions`)
  })

  test('con stream, un 5xx no se abre como stream: es el mismo 502', async () => {
    const baseUrl = failingFake({ kind: 'status', status: 503, body: 'ocupado' })
    const response = await forwarderTo({ name: 'open', baseUrl })(routed({ ...HELLO, stream: true }))
    expect(response.status).toBe(502)
    expect((await errorOf(response)).message).toContain('ocupado')
  })

  test('una baseUrl insegura (un nombre de metadatos) se rehúsa sin conectar', async () => {
    const forward = createOpenAICompatForwarder({ next: () => Promise.resolve(new Response('')), upstreams: { open: { name: 'open', baseUrl: 'http://metadata.google.internal/v1' } }, env: {} })
    const response = await forward(routed(HELLO))
    expect(response.status).toBe(502)
    expect((await errorOf(response)).message).toContain('insegura')
  })
})

describe('reparto', () => {
  test('count_tokens no existe en Chat Completions: 501 con el upstream', async () => {
    const response = await forwarderTo({ name: 'open', baseUrl: 'http://127.0.0.1:9/v1' })(routed(HELLO, 'open', '/v1/messages/count_tokens'))
    expect(response.status).toBe(501)
    expect((await errorOf(response)).message).toContain('"open"')
  })

  test('un upstream que no es suyo sigue a next', async () => {
    const seen: string[] = []
    const forward = forwarderTo({ name: 'open', baseUrl: 'http://127.0.0.1:9/v1' }, request => {
      seen.push(request.upstream.name)
      return Promise.resolve(new Response('next'))
    })
    expect(await (await forward(routed(HELLO, 'otro'))).text()).toBe('next')
    expect(seen).toEqual(['otro'])
  })
})
