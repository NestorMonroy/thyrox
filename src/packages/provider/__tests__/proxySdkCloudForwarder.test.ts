/**
 * El reenviador que reparte por clase de upstream: los de nube por su SDK
 * (`./sdkForward.ts`, con el cliente de `./cloudClients.ts`), el resto por
 * HTTP crudo. La fábrica del cliente es un doble; ninguna prueba sale a la red.
 */
import { describe, expect, test } from 'bun:test'
import type { ForwardRequest } from '../src/proxy/server.ts'
import type { CloudUpstream, CloudUpstreamConfig } from '../src/proxy/sdk/cloudClients.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createCloudAwareForwarder } = (await import(
  process.env.CLOUD_FORWARDER_MODULE ?? '../src/proxy/sdk/cloudForwarder.ts'
)) as typeof import('../src/proxy/sdk/cloudForwarder.ts')

const vertex: CloudUpstreamConfig = { name: 'v', provider: 'vertex', region: 'us-east5', project_id: 'p', auth: { access_token: 't' } }

function request(name: string, extra: Partial<ForwardRequest> = {}): ForwardRequest {
  return {
    upstream: { name, provider: name === 'v' ? 'vertex' : 'anthropic' },
    upstreamModel: 'claude-sonnet-5',
    credential: { id: `c-${name}` },
    path: '/v1/messages',
    search: '',
    body: { model: 'claude-sonnet-5', messages: [] },
    headers: new Headers({ 'anthropic-beta': 'b1' }),
    signal: new AbortController().signal,
    requestId: 'req_7',
    ...extra,
  } as ForwardRequest
}

function fakeCloud(fail = false) {
  const created: string[] = []
  const calls: { body: Record<string, unknown>; options: Record<string, unknown> }[] = []
  const create = async (config: CloudUpstreamConfig): Promise<CloudUpstream> => {
    created.push(config.name)
    if (fail) throw new Error('no se pudo construir')
    return {
      kind: 'sdk', name: config.name, provider: config.provider,
      client: {
        messages: {
          create: async (body, options) => { calls.push({ body, options }); return { id: 'm', model: 'x' } },
          countTokens: async () => ({ input_tokens: 1 }),
        },
      },
    }
  }
  return { created, calls, create }
}

describe('reparto', () => {
  test('un upstream de nube va por su SDK con la beta, la señal y el identificador', async () => {
    const cloud = fakeCloud()
    const http: string[] = []
    const forward = createCloudAwareForwarder({ http: async r => { http.push(r.upstream.name); return new Response('raw') }, cloud: { v: vertex }, create: cloud.create })
    const sent = request('v')
    const response = await forward(sent)
    expect(await response.json()).toEqual({ id: 'm', model: 'x' })
    expect(http).toEqual([])
    expect(cloud.calls[0]!.options).toMatchObject({ signal: sent.signal, headers: { 'anthropic-beta': 'b1' } })
  })
  test('el resto va por HTTP crudo', async () => {
    const cloud = fakeCloud()
    const forward = createCloudAwareForwarder({ http: async () => new Response('raw'), cloud: { v: vertex }, create: cloud.create })
    expect(await (await forward(request('a'))).text()).toBe('raw')
    expect(cloud.created).toEqual([])
  })
  test('el cliente se construye una vez por upstream', async () => {
    const cloud = fakeCloud()
    const forward = createCloudAwareForwarder({ http: async () => new Response(), cloud: { v: vertex }, create: cloud.create })
    await forward(request('v'))
    await forward(request('v'))
    expect(cloud.created).toEqual(['v'])
  })
  test('una construcción que falla se reintenta en la siguiente petición', async () => {
    const cloud = fakeCloud(true)
    const forward = createCloudAwareForwarder({ http: async () => new Response(), cloud: { v: vertex }, create: cloud.create })
    await expect(forward(request('v'))).rejects.toThrow('no se pudo construir')
    await expect(forward(request('v'))).rejects.toThrow('no se pudo construir')
    expect(cloud.created).toEqual(['v', 'v'])
  })
  test('una ruta que no es de mensajes responde que el upstream no la admite', async () => {
    const cloud = fakeCloud()
    const forward = createCloudAwareForwarder({ http: async () => new Response(), cloud: { v: vertex }, create: cloud.create })
    const response = await forward(request('v', { path: '/v1/models' }))
    expect(response.status).toBe(501)
    expect(await response.json()).toEqual({ type: 'error', request_id: 'req_7', error: { type: 'not_supported', message: 'upstream does not support this endpoint' } })
  })
})
