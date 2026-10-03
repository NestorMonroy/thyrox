/**
 * `AnthropicHttpProvider` reintenta con la autoridad de reintentos del proveedor
 * (`retryPolicy.ts`): el número sale de `getDefaultMaxRetries()` y la espera de
 * `getRetryDelay()`, la misma política que usa `withRetry`.
 *
 * El caso que motivó el cambio (banco local-models-publication-20261002T114251,
 * TASK-THYROX-0908): once trabajadores seguidos murieron con «502 upstream request
 * failed (tras 4 intentos)» mientras sondas sueltas a la misma ruta daban 200. Con
 * 3 reintentos de 1, 2 y 4 s, un 502 que dura más de ~7 s mataba el intento entero.
 *
 * Métrica: peticiones hechas y esperas PEDIDAS a un `sleep` inyectado (no se duerme).
 * Ciega a: el tiempo real de pared y la conducta de un servidor real ante la ráfaga.
 */
import { afterEach, describe, expect, test } from 'bun:test'

import type { ProviderRequest } from '@thyrox/agent/loop/types'

import { AnthropicHttpProvider, type FetchImpl } from '../src/anthropicHttp.ts'

const REQUEST: ProviderRequest = { model: 'm', system: 's', messages: [{ role: 'user', content: [{ type: 'text', text: 'hola' }] }], tools: [], maxTokens: 16, cacheTtl: '5m' }
const OK_BODY = { id: 'msg', model: 'm', content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }
const ENV_VAR = 'THYROX_CODE_MAX_RETRIES'
const savedEnv = process.env[ENV_VAR]

afterEach(() => {
  if (savedEnv === undefined) delete process.env[ENV_VAR]
  else process.env[ENV_VAR] = savedEnv
})

/** Un servidor falso: responde `failures` veces con `status` y después 200. */
function scripted(status: number, failures: number, headers: Record<string, string> = {}): { fetchImpl: FetchImpl; calls: () => number } {
  let calls = 0
  const fetchImpl: FetchImpl = async () => {
    calls += 1
    if (calls <= failures) return new Response('upstream request failed', { status, headers })
    return Response.json(OK_BODY)
  }
  return { fetchImpl, calls: () => calls }
}

function provider(fetchImpl: FetchImpl, extra: Record<string, unknown> = {}) {
  const waits: number[] = []
  const http = new AnthropicHttpProvider({ apiKey: 'k', baseUrl: 'http://fake', fetchImpl, sleep: async (ms: number) => { waits.push(ms) }, ...extra })
  return { http, waits }
}

describe('AnthropicHttpProvider con la autoridad de reintentos', () => {
  test('sin maxRetries declarado, THYROX_CODE_MAX_RETRIES=6 hace exactamente 7 peticiones ante un 502 persistente', async () => {
    process.env[ENV_VAR] = '6'
    const server = scripted(502, Number.POSITIVE_INFINITY)
    const { http } = provider(server.fetchImpl)
    await expect(http.send(REQUEST)).rejects.toThrow(/502/)
    expect(server.calls()).toBe(7)
  })

  test('sin maxRetries ni la variable se usan los 10 reintentos de la autoridad: 11 peticiones', async () => {
    delete process.env[ENV_VAR]
    const server = scripted(502, Number.POSITIVE_INFINITY)
    const { http } = provider(server.fetchImpl)
    await expect(http.send(REQUEST)).rejects.toThrow(/502/)
    expect(server.calls()).toBe(11)
  })

  test('un 502 que dura más que los ~7 s del presupuesto anterior se recupera: 5 fallos y luego 200', async () => {
    delete process.env[ENV_VAR]
    const server = scripted(502, 5)
    const { http, waits } = provider(server.fetchImpl)
    const turn = await http.send(REQUEST)
    expect(turn.stop_reason).toBe('end_turn')
    expect(server.calls()).toBe(6)
    expect(waits.reduce((sum, ms) => sum + ms, 0)).toBeGreaterThan(7000)
  })

  test('la espera crece en exponencial y nunca pasa del tope de la autoridad (32 s más 25 % de jitter)', async () => {
    delete process.env[ENV_VAR]
    const server = scripted(503, Number.POSITIVE_INFINITY)
    const { http, waits } = provider(server.fetchImpl)
    await expect(http.send(REQUEST)).rejects.toThrow(/503/)
    expect(waits.length).toBe(10)
    expect(waits[1]!).toBeGreaterThan(waits[0]!)
    for (const ms of waits) expect(ms).toBeLessThanOrEqual(32_000 * 1.25)
  })

  test('un 400 no se reintenta: una sola petición y ninguna espera', async () => {
    delete process.env[ENV_VAR]
    const server = scripted(400, Number.POSITIVE_INFINITY)
    const { http, waits } = provider(server.fetchImpl)
    await expect(http.send(REQUEST)).rejects.toThrow(/400/)
    expect(server.calls()).toBe(1)
    expect(waits).toEqual([])
  })

  test('retry-after: 2 pide una espera de 2000 ms', async () => {
    delete process.env[ENV_VAR]
    const server = scripted(429, 1, { 'retry-after': '2' })
    const { http, waits } = provider(server.fetchImpl)
    await http.send(REQUEST)
    expect(waits).toEqual([2000])
  })

  test('maxRetries declarado gana sobre la variable', async () => {
    process.env[ENV_VAR] = '6'
    const server = scripted(502, Number.POSITIVE_INFINITY)
    const { http } = provider(server.fetchImpl, { maxRetries: 2 })
    await expect(http.send(REQUEST)).rejects.toThrow(/502/)
    expect(server.calls()).toBe(3)
  })
})
