/**
 * El reenvío por el SDK del proveedor — porte de `jv`, `Oj` y `kj` de la
 * pasarela del ejecutable 2.1.283 (`chunk-wg7ts4cy.js`, extracto en
 * `.claude/workbench/cloud-sdk-forward-20260927T235948/outputs/gateway-sdk-upstreams.js`).
 * El cliente es un doble con la superficie `messages.create`/`countTokens`
 * del SDK; ninguna prueba sale a la red.
 */
import { APIError } from '@anthropic-ai/sdk'
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { bedrockBetaBody, forwardThroughSdk, sseFromEvents, upstreamErrorDetails } = (await import(
  process.env.SDK_FORWARD_MODULE ?? '../src/proxy/sdk/sdkForward.ts'
)) as typeof import('../src/proxy/sdk/sdkForward.ts')

type Call = { method: string; body: Record<string, unknown>; options: { signal?: AbortSignal; headers?: Record<string, string> } }

function fakeClient(reply: { create?: (body: Record<string, unknown>) => unknown; countTokens?: () => unknown } = {}) {
  const calls: Call[] = []
  return {
    calls,
    messages: {
      create: async (body: Record<string, unknown>, options: Call['options']) => {
        calls.push({ method: 'create', body, options })
        return reply.create ? reply.create(body) : { id: 'msg_1', model: 'upstream-model', content: [] }
      },
      countTokens: async (body: Record<string, unknown>, options: Call['options']) => {
        calls.push({ method: 'countTokens', body, options })
        return reply.countTokens ? reply.countTokens() : { input_tokens: 42 }
      },
    },
  }
}

async function* events(list: Record<string, unknown>[], delayMs = 0) {
  for (const event of list) {
    if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs))
    yield event
  }
}

const forward = (client: ReturnType<typeof fakeClient>, extra: Partial<Parameters<typeof forwardThroughSdk>[0]> = {}) =>
  forwardThroughSdk({ path: '/v1/messages', body: { model: 'm', messages: [] }, provider: 'vertex', client, requestId: 'req_1', ...extra })

describe('/v1/messages sin stream', () => {
  test('devuelve el mensaje del SDK como JSON, con la señal y las cabeceras de la petición', async () => {
    const client = fakeClient()
    const signal = new AbortController().signal
    const response = await forward(client, { betaHeader: 'b1', headers: { 'x-extra': '1' }, signal })
    expect(response!.status).toBe(200)
    expect(await response!.json()).toEqual({ id: 'msg_1', model: 'upstream-model', content: [] })
    expect(client.calls[0]).toMatchObject({ method: 'create', options: { signal, headers: { 'x-extra': '1', 'anthropic-beta': 'b1' } } })
  })
  test('el modelo del cable reemplaza al del upstream', async () => {
    const response = await forward(fakeClient(), { wireModel: 'claude-sonnet-5' })
    expect(((await response!.json()) as { model: string }).model).toBe('claude-sonnet-5')
  })
  test('sin cabeceras que enviar, las opciones no llevan cabeceras', async () => {
    const client = fakeClient()
    await forward(client)
    expect('headers' in client.calls[0]!.options).toBe(false)
  })
})

describe('/v1/messages con stream', () => {
  test('reemite cada evento del SDK como SSE y el modelo del cable sólo en message_start', async () => {
    const client = fakeClient({
      create: () => events([
        { type: 'message_start', message: { id: 'msg_1', model: 'upstream-model' } },
        { type: 'message_stop', message: { model: 'intacto' } },
      ]),
    })
    const response = await forward(client, { body: { model: 'm', messages: [], stream: true }, wireModel: 'claude-sonnet-5' })
    expect(response!.headers.get('content-type')).toBe('text/event-stream')
    expect(client.calls[0]!.body.stream).toBe(true)
    const text = await response!.text()
    expect(text).toBe(
      'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","model":"claude-sonnet-5"}}\n\n'
      + 'event: message_stop\ndata: {"type":"message_stop","message":{"model":"intacto"}}\n\n',
    )
  })
  test('un error a mitad del stream se vuelve un evento de error y cierra', async () => {
    async function* failing() {
      yield { type: 'message_start', message: { model: 'x' } }
      throw APIError.generate(529, { type: 'error', error: { type: 'overloaded_error', message: 'busy' } }, 'busy', new Headers())
    }
    const text = await new Response(sseFromEvents(failing(), { requestId: 'req_9' })).text()
    expect(text).toContain('event: error\ndata: {"type":"error","request_id":"req_9","error":{"type":"overloaded_error","message":"upstream overloaded"}}')
  })
  test('el error a mitad del stream de la copia de un SDK de nube conserva su estado', async () => {
    const nested = Bun.resolveSync('@anthropic-ai/sdk', Bun.resolveSync('@anthropic-ai/vertex-sdk', import.meta.dir))
    const { APIError: NestedApiError } = (await import(nested)) as typeof import('@anthropic-ai/sdk')
    async function* failing() {
      yield { type: 'message_start', message: { model: 'x' } }
      throw NestedApiError.generate(529, { type: 'error', error: { type: 'overloaded_error', message: 'busy' } }, 'busy', new Headers())
    }
    const text = await new Response(sseFromEvents(failing(), { requestId: 'req_9' })).text()
    expect(text).toContain('"error":{"type":"overloaded_error","message":"upstream overloaded"}')
  })
  test('un silencio largo se rellena con ping', async () => {
    const text = await new Response(sseFromEvents(events([{ type: 'message_stop' }], 120), { keepaliveIntervalMs: 20 })).text()
    expect(text.startsWith('event: ping\ndata: {"type": "ping"}\n\n')).toBe(true)
  })
})

describe('count_tokens', () => {
  test('cuenta con el SDK', async () => {
    const client = fakeClient()
    const response = await forward(client, { path: '/v1/messages/count_tokens' })
    expect(await response!.json()).toEqual({ input_tokens: 42 })
    expect(client.calls[0]!.method).toBe('countTokens')
  })
  test('Bedrock no lo admite: 501 sin llamar al SDK', async () => {
    const client = fakeClient()
    const response = await forward(client, { path: '/v1/messages/count_tokens', provider: 'bedrock' })
    expect(response!.status).toBe(501)
    expect(await response!.json()).toEqual({ type: 'error', request_id: 'req_1', error: { type: 'not_supported', message: 'count_tokens is not supported on Bedrock upstreams' } })
    expect(client.calls).toHaveLength(0)
  })
})

describe('las betas en Bedrock', () => {
  test('pasan de la cabecera al cuerpo, sin repetir', () => {
    expect(bedrockBetaBody({ anthropic_beta: ['a'] }, ' a , b ,', 'bedrock')).toEqual({ body: { anthropic_beta: ['a', 'b'] }, betaHeader: undefined })
  })
  test('en otro proveedor quedan en la cabecera', () => {
    expect(bedrockBetaBody({}, 'a', 'vertex')).toEqual({ body: {}, betaHeader: 'a' })
    expect(bedrockBetaBody({}, '', 'vertex')).toEqual({ body: {}, betaHeader: undefined })
  })
  test('una cabecera sin betas no toca el cuerpo', () => {
    expect(bedrockBetaBody({ x: 1 }, ' , ', 'bedrock')).toEqual({ body: { x: 1 }, betaHeader: undefined })
  })
  test('el reenvío por Bedrock no envía la cabecera', async () => {
    const client = fakeClient()
    await forward(client, { provider: 'bedrock', betaHeader: 'b1' })
    expect(client.calls[0]!.body.anthropic_beta).toEqual(['b1'])
    expect('headers' in client.calls[0]!.options).toBe(false)
  })
})

describe('errores del SDK', () => {
  const failWith = (error: unknown) => fakeClient({ create: () => { throw error } })
  test('un 400 con un tipo conocido devuelve su mensaje', async () => {
    const error = APIError.generate(400, { type: 'error', error: { type: 'invalid_request_error', message: 'max_tokens: bad' } }, 'max_tokens: bad', new Headers())
    const response = await forward(failWith(error))
    expect(response!.status).toBe(400)
    expect(await response!.json()).toEqual({ type: 'error', request_id: 'req_1', error: { type: 'invalid_request_error', message: 'max_tokens: bad' } })
  })
  test('el mensaje se recorta a 1000 caracteres', async () => {
    const long = 'x'.repeat(1500)
    const error = APIError.generate(400, { type: 'error', error: { type: 'invalid_request_error', message: long } }, long, new Headers())
    const body = (await (await forward(failWith(error)))!.json()) as { error: { message: string } }
    expect(body.error.message).toHaveLength(1000)
  })
  test('un 400 sin tipo conocido dice qué capacidad se rechazó', async () => {
    const error = APIError.generate(400, { message: 'Too much media' }, 'Too much media', new Headers())
    const body = (await (await forward(failWith(error)))!.json()) as { error: { message: string } }
    expect(body.error.message).toBe('capability_rejected: media_budget')
  })
  test('un 400 irreconocible da el mensaje genérico', async () => {
    const error = APIError.generate(400, { message: 'nope' }, 'nope', new Headers())
    const body = (await (await forward(failWith(error)))!.json()) as { error: { type: string; message: string } }
    expect(body.error).toEqual({ type: 'invalid_request_error', message: 'upstream rejected the request' })
  })
  test('un 401 no reenvía el texto del upstream y registra el tipo de AWS', async () => {
    const error = APIError.generate(401, { message: 'secret detail' }, 'secret detail', new Headers({ 'x-amzn-errortype': 'UnrecognizedClientException' }))
    const response = await forward(failWith(error))
    expect(await response!.clone().json()).toEqual({ type: 'error', request_id: 'req_1', error: { type: 'authentication_error', message: 'upstream authentication failed — check the gateway operator' } })
    // El SDK antepone el estado a su mensaje; se guarda tal cual, como la referencia.
    expect(upstreamErrorDetails.get(response!)).toEqual({ errorType: 'UnrecognizedClientException', message: '401 secret detail' })
  })
  test('un estado sin tipo propio es api_error', async () => {
    const error = APIError.generate(418, { message: 'teapot' }, 'teapot', new Headers())
    const body = (await (await forward(failWith(error)))!.json()) as { error: { type: string; message: string } }
    expect(body.error).toEqual({ type: 'api_error', message: 'upstream error' })
  })
  test('el error de la copia del SDK que trae un cliente de nube se reconoce igual', async () => {
    // Cada SDK de nube instala su propia copia de `@anthropic-ai/sdk`: la
    // clase del error es otra, aunque la versión sea la misma.
    const nested = Bun.resolveSync('@anthropic-ai/sdk', Bun.resolveSync('@anthropic-ai/vertex-sdk', import.meta.dir))
    const { APIError: NestedApiError } = (await import(nested)) as typeof import('@anthropic-ai/sdk')
    expect(NestedApiError).not.toBe(APIError)
    const error = NestedApiError.generate(401, { message: 'secret detail' }, 'secret detail', new Headers())
    const response = await forward(failWith(error))
    expect(response!.status).toBe(401)
    expect(((await response!.json()) as { request_id: string }).request_id).toBe('req_1')
  })
  test('un error que no es del SDK se propaga', async () => {
    await expect(forward(failWith(new TypeError('boom')))).rejects.toThrow('boom')
  })
})
