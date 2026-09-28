/**
 * La construcción del cliente de nube por upstream — porte de las ramas
 * `bedrock`, `vertex` y `foundry` de `Fv` en la pasarela del ejecutable
 * 2.1.283 (extracto en
 * `.claude/workbench/cloud-sdk-forward-20260927T235948/outputs/gateway-sdk-upstreams.js`).
 * Cada cliente se ejercita con un `fetch` que intercepta: se mide la URL y la
 * autorización que el SDK real produce, sin salir a la red. Las formas
 * esperadas son las medidas en `outputs/sdk-requests.jsonl` del mismo banco.
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createCloudUpstream } = (await import(
  process.env.CLOUD_CLIENTS_MODULE ?? '../src/proxy/sdk/cloudClients.ts'
)) as typeof import('../src/proxy/sdk/cloudClients.ts')

type Seen = { url: string; headers: Record<string, string> }
function interceptor() {
  const seen: Seen[] = []
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(input), headers: Object.fromEntries(new Headers(init?.headers).entries()) })
    return Response.json({ id: 'msg', type: 'message', role: 'assistant', model: 'm', content: [], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } })
  }) as typeof globalThis.fetch
  return { seen, fetch }
}
const params = { model: 'claude-sonnet-5', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }
async function send(config: Parameters<typeof createCloudUpstream>[0], processHeaders?: Record<string, string>) {
  const { seen, fetch } = interceptor()
  const upstream = await createCloudUpstream(config, { fetch, processHeaders })
  await upstream.client.messages.create(params, {})
  return { upstream, request: seen[0]! }
}

describe('bedrock', () => {
  const base = { name: 'b', provider: 'bedrock' as const, region: 'us-east-1' }
  test('con claves firma SigV4 en la región del upstream', async () => {
    const { upstream, request } = await send({ ...base, headers: { 'x-team': 'a' }, auth: { aws_access_key_id: 'AKIDEXAMPLE', aws_secret_access_key: 'secret' } })
    expect(upstream).toMatchObject({ kind: 'sdk', name: 'b', provider: 'bedrock' })
    expect(request.url).toBe('https://bedrock-runtime.us-east-1.amazonaws.com/model/claude-sonnet-5/invoke')
    expect(request.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-east-1\/bedrock\/aws4_request,/)
    expect(request.headers['x-team']).toBe('a')
    expect(request.headers['x-api-key']).toBeUndefined()
  })
  test('el token de sesión viaja firmado', async () => {
    const { request } = await send({ ...base, auth: { aws_access_key_id: 'AKIDEXAMPLE', aws_secret_access_key: 'secret', aws_session_token: 'tok' } })
    expect(request.headers['x-amz-security-token']).toBe('tok')
  })
  test('con portador no firma: lleva el portador', async () => {
    const { request } = await send({ ...base, auth: { aws_bearer_token: 'bearer-token' } })
    expect(request.headers.authorization).toBe('Bearer bearer-token')
  })
  test('el guardarraíl viaja en cabeceras y marca el upstream', async () => {
    const { upstream, request } = await send({ ...base, guardrail: { id: 'g1', version: '2' }, auth: { aws_access_key_id: 'AKIDEXAMPLE', aws_secret_access_key: 'secret' } })
    expect(upstream.guardrail).toBe(true)
    expect(request.headers['x-amzn-bedrock-guardrailidentifier']).toBe('g1')
    expect(request.headers['x-amzn-bedrock-guardrailversion']).toBe('2')
  })
  test('una base propia reemplaza al punto de acceso de la región', async () => {
    const { request } = await send({ ...base, base_url: 'https://bedrock.example.test', auth: { aws_access_key_id: 'AKIDEXAMPLE', aws_secret_access_key: 'secret' } })
    expect(request.url.startsWith('https://bedrock.example.test/model/')).toBe(true)
  })
  test('una X-Api-Key del upstream se retira salvo que el proceso declare la suya', async () => {
    const auth = { aws_access_key_id: 'AKIDEXAMPLE', aws_secret_access_key: 'secret' }
    expect((await send({ ...base, headers: { 'X-Api-Key': 'leak' }, auth })).request.headers['x-api-key']).toBeUndefined()
    expect((await send({ ...base, auth }, { 'X-Api-Key': 'mine' })).request.headers['x-api-key']).toBe('mine')
  })
  test('clave sin secreto, o sesión sin clave, se rechazan', async () => {
    await expect(createCloudUpstream({ ...base, auth: { aws_access_key_id: 'A' } })).rejects.toThrow('must be set together')
    await expect(createCloudUpstream({ ...base, auth: { aws_secret_access_key: 'S' } })).rejects.toThrow('must be set together')
    await expect(createCloudUpstream({ ...base, auth: { aws_session_token: 'T' } })).rejects.toThrow('must be set together')
  })
  test('sin credenciales usa la cadena del entorno, sin fallar al construir', async () => {
    expect((await createCloudUpstream({ ...base, auth: {} })).provider).toBe('bedrock')
  })
})

describe('vertex', () => {
  const base = { name: 'v', provider: 'vertex' as const, region: 'us-east5', project_id: 'proj' }
  test('con token de acceso llama rawPredict con el portador', async () => {
    const { upstream, request } = await send({ ...base, auth: { access_token: 'vtok' } })
    expect(upstream.provider).toBe('vertex')
    expect(request.url).toBe('https://us-east5-aiplatform.googleapis.com/v1/projects/proj/locations/us-east5/publishers/anthropic/models/claude-sonnet-5:rawPredict')
    expect(request.headers.authorization).toBe('Bearer vtok')
    expect(request.headers['x-api-key']).toBeUndefined()
  })
  test('una X-Api-Key del upstream no viaja a Google', async () => {
    const { request } = await send({ ...base, headers: { 'X-Api-Key': 'leak' }, auth: { access_token: 'vtok' } })
    expect(request.headers['x-api-key']).toBeUndefined()
  })
  test('una cuenta de servicio que no carga no deja un rechazo sin atender', async () => {
    const unhandled: unknown[] = []
    const listener = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', listener)
    try {
      await createCloudUpstream({ ...base, auth: { service_account_json: '/no/such/key.json' } })
      await new Promise(resolve => setTimeout(resolve, 50))
    } finally {
      process.off('unhandledRejection', listener)
    }
    expect(unhandled).toEqual([])
  })
})

describe('foundry', () => {
  const base = { name: 'f', provider: 'foundry' as const, resource: 'res' }
  test('con clave usa x-api-key y el recurso, sin Authorization', async () => {
    const { request } = await send({ ...base, auth: { api_key: 'fkey' } })
    expect(request.url).toBe('https://res.services.ai.azure.com/anthropic/v1/messages')
    expect(request.headers['x-api-key']).toBe('fkey')
    expect(request.headers.authorization).toBeUndefined()
  })
  test('con clave, un Authorization del upstream no viaja a Azure', async () => {
    const { request } = await send({ ...base, headers: { Authorization: 'Bearer leak' }, auth: { api_key: 'fkey' } })
    expect(request.headers.authorization).toBeUndefined()
  })
  test('una base propia reemplaza al recurso', async () => {
    const { request } = await send({ ...base, base_url: 'https://foundry.example.test/anthropic/', auth: { api_key: 'fkey' } })
    expect(request.url).toBe('https://foundry.example.test/anthropic/v1/messages')
  })
  test('sin clave construye con Entra ID, sin fallar al construir', async () => {
    expect((await createCloudUpstream({ ...base, auth: {} })).provider).toBe('foundry')
  })
})
