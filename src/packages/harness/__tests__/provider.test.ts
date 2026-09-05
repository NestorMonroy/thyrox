/**
 * `AnthropicHttpProvider` (T-011…T-014): el adaptador real.
 *
 * Fuente del porte: el contrato de la Messages API de Anthropic. **No se
 * ejercita contra el servicio** —este contenedor no tiene credencial (401
 * medido)—: se prueba qué envía, qué lee y qué hace ante un fallo, inyectando
 * `fetch`, su única dependencia externa.
 */

import { describe, expect, test } from 'bun:test'
import { AnthropicHttpProvider } from '../src/provider/anthropicHttp.ts'
import type { ProviderRequest } from '../src/types.ts'

// El adaptador no se puede ejercitar contra el servicio -este contenedor no
// tiene credencial- pero SI contra su contrato: que envia, que lee y que hace
// cuando el servicio falla. Se inyecta `fetch`, que es la unica dependencia
// externa que tiene.
const peticion: ProviderRequest = {
  model: 'claude-opus-5', system: 'eres un harness', maxTokens: 100, cacheTtl: '1h',
  tools: [
    { name: 'Bash', description: 'x', input_schema: { type: 'object', properties: { command: { type: 'string' } } } },
    { name: 'Read', description: 'y', input_schema: { type: 'object', properties: { file_path: { type: 'string' } } } },
  ],
  messages: [{ role: 'user', content: [{ type: 'text', text: 'hola' }] }],
}

const respuesta = (extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({
    id: 'msg_1', model: 'claude-opus-5', stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'ok' }],
    usage: { input_tokens: 5, output_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 900 },
    ...extra,
  }), { status: 200, headers })

describe('AnthropicHttpProvider — el cuerpo que envia (T-012)', () => {
  test('pone cache_control al final del sistema y de la ULTIMA herramienta', async () => {
    let body: any
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async (_u, init) => { body = JSON.parse(String(init?.body)); return respuesta() } })
    await p.send(peticion)
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
    expect(body.tools[0].cache_control).toBeUndefined()
    expect(body.tools[1].cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
  })

  test('el TTL viaja tal como lo pide el bucle', async () => {
    let body: any
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async (_u, init) => { body = JSON.parse(String(init?.body)); return respuesta() } })
    await p.send({ ...peticion, cacheTtl: '5m' })
    expect(body.system[0].cache_control.ttl).toBe('5m')
  })

  test('la beta de TTL extendido solo va cuando el TTL es de 1h', async () => {
    const cabeceras: string[] = []
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async (_u, init) => {
      cabeceras.push(String((init?.headers as Record<string, string>)['anthropic-beta'] ?? '')); return respuesta()
    } })
    await p.send({ ...peticion, cacheTtl: '1h' })
    await p.send({ ...peticion, cacheTtl: '5m' })
    expect(cabeceras[0]).toContain('extended-cache-ttl')
    expect(cabeceras[1]).toBe('')
  })

  test('la credencial va en x-api-key, nunca en el cuerpo', async () => {
    let init: any
    const p = new AnthropicHttpProvider({ apiKey: 'secreta', fetchImpl: async (_u, i) => { init = i; return respuesta() } })
    await p.send(peticion)
    expect(init.headers['x-api-key']).toBe('secreta')
    expect(String(init.body)).not.toContain('secreta')
  })
})

describe('lo que lee de la respuesta (T-013)', () => {
  test('normaliza el usage con sus cuatro campos', async () => {
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async () => respuesta() })
    const t = await p.send(peticion)
    expect(t.usage).toEqual({ input_tokens: 5, output_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 900 })
    expect(t.stop_reason).toBe('end_turn')
  })

  test('un usage incompleto se completa con ceros, no con undefined', async () => {
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async () => respuesta({ usage: { input_tokens: 3 } }) })
    const t = await p.send(peticion)
    expect(t.usage.cache_read_input_tokens).toBe(0)
  })

  test('las cabeceras de limite se recogen y quedan disponibles', async () => {
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async () => respuesta({}, {
      'anthropic-ratelimit-unified-status': 'allowed',
      'anthropic-ratelimit-unified-reset': '2026-09-02T12:00:00Z',
      'anthropic-ratelimit-unified-remaining': '42',
    }) })
    await p.send(peticion)
    expect(p.lastLimits).toEqual({ status: 'allowed', reset: '2026-09-02T12:00:00Z', remaining: '42' })
  })
})

describe('que hace cuando el servicio falla (T-014)', () => {
  test('un 529 se reintenta y acaba devolviendo el turno', async () => {
    let intentos = 0
    const p = new AnthropicHttpProvider({ apiKey: 'k', retryDelayMs: 0, fetchImpl: async () => {
      intentos += 1
      return intentos < 3 ? new Response('sobrecargado', { status: 529 }) : respuesta()
    } })
    const t = await p.send(peticion)
    expect(intentos).toBe(3)
    expect(t.id).toBe('msg_1')
  })

  test('un 400 NO se reintenta: el cuerpo esta mal y reintentarlo lo repite', async () => {
    let intentos = 0
    const p = new AnthropicHttpProvider({ apiKey: 'k', retryDelayMs: 0, fetchImpl: async () => { intentos += 1; return new Response('mal', { status: 400 }) } })
    await expect(p.send(peticion)).rejects.toThrow('400')
    expect(intentos).toBe(1)
  })

  test('agotados los reintentos, el error dice cuantos hubo', async () => {
    const p = new AnthropicHttpProvider({ apiKey: 'k', retryDelayMs: 0, maxRetries: 2, fetchImpl: async () => new Response('x', { status: 503 }) })
    await expect(p.send(peticion)).rejects.toThrow('3 intentos')
  })

  test('con modelo de respaldo, un 529 persistente cae al respaldo y lo declara', async () => {
    const modelos: string[] = []
    const p = new AnthropicHttpProvider({ apiKey: 'k', retryDelayMs: 0, maxRetries: 1, fallbackModel: 'claude-opus-4-8',
      fetchImpl: async (_u, init) => {
        const m = JSON.parse(String(init?.body)).model as string
        modelos.push(m)
        return m === 'claude-opus-5' ? new Response('x', { status: 529 }) : respuesta({ model: 'claude-opus-4-8' })
      } })
    const t = await p.send(peticion)
    expect(modelos).toEqual(['claude-opus-5', 'claude-opus-5', 'claude-opus-4-8'])
    expect(t.model).toBe('claude-opus-4-8')
    expect(p.lastFallbackUsed).toBe(true)
  })

  test('sin credencial NO se construye, y el error dice por que', () => {
    expect(() => new AnthropicHttpProvider({ apiKey: '' })).toThrow('ANTHROPIC_API_KEY')
  })
})
