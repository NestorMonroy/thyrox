/**
 * El adaptador real leyendo un stream (T-011…T-014).
 *
 * Fuente del porte: el contrato de la Messages API de Anthropic más el formato
 * SSE del cable (ver `sse.ts`). Se inyecta `fetch`; no toca el servicio. El
 * test fija cómo el adaptador arma la respuesta a partir de los eventos del
 * cable.
 */

import { describe, expect, test } from 'bun:test'
import { AnthropicHttpProvider, parseSseEvents } from '../src/provider/anthropicHttp.ts'
import type { ProviderRequest } from '../src/types.ts'

// T-011, mitad de streaming. Lo que la credencial bloquea es UNA cosa: hablar
// con el servicio real. Ni el formato del stream ni el `fetch` de verdad lo
// estan -- por eso aqui hay dos clases de prueba: el parser contra bytes
// fabricados, y el proveedor entero contra un servidor local por socket, con
// el `fetch` por defecto y sin `fetchImpl` inyectado.
//
// La forma de los eventos se midio en el corpus de referencia, no de memoria:
// `ccb: packages/provider/src/codex/fetchAdapter.ts:343-455` los emite y
// `gemini/indexImpl.ts:126-200` los acumula.

const peticion: ProviderRequest = {
  model: 'claude-opus-5', system: 'eres un harness', maxTokens: 100, cacheTtl: '5m',
  tools: [{ name: 'Bash', description: 'x', input_schema: { type: 'object', properties: {} } }],
  messages: [{ role: 'user', content: [{ type: 'text', text: 'hola' }] }],
}

/** Un cuerpo SSE completo, con los eventos en el orden que el servicio los manda. */
function cuerpoSse(eventos: Array<Record<string, unknown>>): string {
  return eventos.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
}

const EVENTOS_TEXTO = [
  { type: 'message_start', message: { id: 'msg_s', model: 'claude-opus-5', content: [], stop_reason: null,
      usage: { input_tokens: 7, output_tokens: 0, cache_creation_input_tokens: 100, cache_read_input_tokens: 900 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hola ' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'mundo' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 12 } },
  { type: 'message_stop' },
]

const EVENTOS_HERRAMIENTA = [
  { type: 'message_start', message: { id: 'msg_t', model: 'claude-opus-5', content: [], stop_reason: null,
      usage: { input_tokens: 3, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} } },
  { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"comm' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: 'and":"ls"}' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 4 } },
  { type: 'message_stop' },
]

/** Un cuerpo entregado en trozos de N bytes: parte los eventos a media linea. */
function respuestaTroceada(texto: string, tam: number): Response {
  const bytes = new TextEncoder().encode(texto)
  let i = 0
  return new Response(new ReadableStream<Uint8Array>({
    pull(c) {
      if (i >= bytes.length) { c.close(); return }
      c.enqueue(bytes.slice(i, i + tam)); i += tam
    },
  }), { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

async function recolectar<T>(it: AsyncIterable<T>): Promise<T[]> {
  const salida: T[] = []
  for await (const x of it) salida.push(x)
  return salida
}

describe('parseSseEvents — el troceado del cable no cambia los eventos', () => {
  test('lee los eventos de un cuerpo entero', async () => {
    const res = new Response(cuerpoSse(EVENTOS_TEXTO))
    const vistos = await recolectar(parseSseEvents(res))
    expect(vistos.map((e) => e.type)).toEqual(EVENTOS_TEXTO.map((e) => e.type))
  })

  // El control que puede fallar: si el parser no guardara la cola incompleta
  // del buffer, con trozos de 7 bytes cada evento saldria partido y el JSON no
  // parsearia. Un parser correcto y uno ciego dan resultados distintos aqui.
  test('un evento partido entre dos trozos se ensambla', async () => {
    const res = respuestaTroceada(cuerpoSse(EVENTOS_TEXTO), 7)
    const vistos = await recolectar(parseSseEvents(res))
    expect(vistos.map((e) => e.type)).toEqual(EVENTOS_TEXTO.map((e) => e.type))
    expect((vistos[2] as any).delta.text).toBe('hola ')
  })

  test('las lineas `event:`, las vacias y el `[DONE]` no producen eventos', async () => {
    const res = new Response(`event: ping\ndata: {"type":"ping"}\n\n\ndata: [DONE]\n\n`)
    const vistos = await recolectar(parseSseEvents(res))
    expect(vistos.map((e) => e.type)).toEqual(['ping'])
  })

  test('un cuerpo sin stream es un error nombrado, no un silencio', async () => {
    const res = new Response(null, { status: 200 })
    await expect(recolectar(parseSseEvents(res))).rejects.toThrow(/sin cuerpo/)
  })
})

describe('AnthropicHttpProvider.stream — acumular hasta el turno (T-011)', () => {
  const proveedor = (res: () => Response) =>
    new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async () => res() })

  test('los text_delta se concatenan en un solo bloque de texto', async () => {
    const p = proveedor(() => new Response(cuerpoSse(EVENTOS_TEXTO)))
    const turno = await p.send({ ...peticion, stream: true })
    expect(turno.content).toEqual([{ type: 'text', text: 'hola mundo' }])
    expect(turno.id).toBe('msg_s')
    expect(turno.model).toBe('claude-opus-5')
  })

  test('el stop_reason viene de message_delta, no de message_start', async () => {
    const p = proveedor(() => new Response(cuerpoSse(EVENTOS_TEXTO)))
    expect((await p.send({ ...peticion, stream: true })).stop_reason).toBe('end_turn')
  })

  // El usage llega partido: entrada y cache en `message_start`, salida en
  // `message_delta`. Tomar uno solo deja la mitad en cero -- y un cero de
  // salida se lee como "no costo nada", que es peor que no medir.
  test('el usage se compone de los DOS eventos que lo traen', async () => {
    const p = proveedor(() => new Response(cuerpoSse(EVENTOS_TEXTO)))
    expect((await p.send({ ...peticion, stream: true })).usage).toEqual({
      input_tokens: 7, output_tokens: 12,
      cache_creation_input_tokens: 100, cache_read_input_tokens: 900,
    })
  })

  test('los input_json_delta se concatenan y se parsean a objeto', async () => {
    const p = proveedor(() => new Response(cuerpoSse(EVENTOS_HERRAMIENTA)))
    const turno = await p.send({ ...peticion, stream: true })
    expect(turno.content).toEqual([{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } }])
    expect(turno.stop_reason).toBe('tool_use')
  })

  test('un tool_use sin ningun delta queda con input vacio, no roto', async () => {
    const p = proveedor(() => new Response(cuerpoSse([
      EVENTOS_HERRAMIENTA[0],
      { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_2', name: 'Bash', input: {} } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 1 } },
    ])))
    expect((await p.send({ ...peticion, stream: true })).content).toEqual(
      [{ type: 'tool_use', id: 'tu_2', name: 'Bash', input: {} }])
  })

  test('un JSON de herramienta invalido es error, NO un input a medias', async () => {
    const p = proveedor(() => new Response(cuerpoSse([
      EVENTOS_HERRAMIENTA[0], EVENTOS_HERRAMIENTA[1],
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"command":' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 1 } },
    ])))
    await expect(p.send({ ...peticion, stream: true })).rejects.toThrow(/tu_1|JSON/)
  })

  test('dos bloques conservan su orden por indice', async () => {
    const p = proveedor(() => new Response(cuerpoSse([
      EVENTOS_TEXTO[0],
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'voy a correr' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu_9', name: 'Bash', input: {} } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"command":"pwd"}' } },
      { type: 'content_block_stop', index: 1 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 9 } },
    ])))
    const turno = await p.send({ ...peticion, stream: true })
    expect(turno.content.map((b) => b.type)).toEqual(['text', 'tool_use'])
  })

  test('un evento `error` dentro del stream se propaga con su mensaje', async () => {
    const p = proveedor(() => new Response(cuerpoSse([
      EVENTOS_TEXTO[0],
      { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } },
    ])))
    await expect(p.send({ ...peticion, stream: true })).rejects.toThrow(/Overloaded/)
  })

  test('un stream que corta antes de message_delta no inventa un turno', async () => {
    const p = proveedor(() => new Response(cuerpoSse(EVENTOS_TEXTO.slice(0, 4))))
    await expect(p.send({ ...peticion, stream: true })).rejects.toThrow(/incompleto/)
  })

  test('el cuerpo declara stream:true solo cuando se pide', async () => {
    let body: any
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async (_u, init) => {
      body = JSON.parse(String(init?.body)); return new Response(cuerpoSse(EVENTOS_TEXTO))
    } })
    await p.send({ ...peticion, stream: true })
    expect(body.stream).toBe(true)
  })

  test('sin stream el cuerpo NO lo declara y la ruta JSON sigue intacta', async () => {
    let body: any
    const p = new AnthropicHttpProvider({ apiKey: 'k', fetchImpl: async (_u, init) => {
      body = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ id: 'msg_j', model: 'claude-opus-5', stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } }))
    } })
    const turno = await p.send(peticion)
    expect(body.stream).toBeUndefined()
    expect(turno.id).toBe('msg_j')
  })

  test('un 529 en streaming se reintenta igual que en la ruta JSON', async () => {
    let n = 0
    const p = new AnthropicHttpProvider({ apiKey: 'k', retryDelayMs: 0, fetchImpl: async () => {
      n += 1
      return n === 1 ? new Response('sobrecargado', { status: 529 }) : new Response(cuerpoSse(EVENTOS_TEXTO))
    } })
    expect((await p.send({ ...peticion, stream: true })).id).toBe('msg_s')
    expect(n).toBe(2)
  })

  test('stream() entrega el texto incremental ANTES de terminar el turno', async () => {
    const p = proveedor(() => new Response(cuerpoSse(EVENTOS_TEXTO)))
    const trozos: string[] = []
    const it = p.stream({ ...peticion, stream: true })
    let paso = await it.next()
    while (!paso.done) { trozos.push(paso.value.text); paso = await it.next() }
    expect(trozos).toEqual(['hola ', 'mundo'])
    expect(paso.value.content).toEqual([{ type: 'text', text: 'hola mundo' }])
  })
})

// El unico tramo que hasta hoy no se ejercitaba: `fetch` de verdad, cabeceras
// en el cable, y el cuerpo leido de un socket. No hace falta credencial -- hace
// falta un servidor que hable el mismo protocolo.
describe('AnthropicHttpProvider contra un servidor local (sin fetchImpl)', () => {
  async function conServidor<T>(
    manejar: (req: Request) => Response | Promise<Response>,
    usar: (baseUrl: string) => Promise<T>,
  ): Promise<T> {
    const srv = Bun.serve({ port: 0, fetch: manejar })
    try { return await usar(`http://127.0.0.1:${srv.port}`) } finally { srv.stop(true) }
  }

  test('la ruta JSON viaja por socket con sus cabeceras reales', async () => {
    const visto: Record<string, string> = {}
    const turno = await conServidor(
      (req) => {
        for (const [k, v] of req.headers) visto[k] = v
        return new Response(JSON.stringify({ id: 'msg_red', model: 'claude-opus-5', stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'desde el socket' }],
          usage: { input_tokens: 2, output_tokens: 3, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }),
          { headers: { 'content-type': 'application/json', 'anthropic-ratelimit-unified-status': 'allowed' } })
      },
      async (baseUrl) => {
        const p = new AnthropicHttpProvider({ apiKey: 'clave-local', baseUrl })
        const t = await p.send({ ...peticion, cacheTtl: '1h' })
        expect(p.lastLimits.status).toBe('allowed')
        return t
      },
    )
    expect(turno.content).toEqual([{ type: 'text', text: 'desde el socket' }])
    expect(visto['x-api-key']).toBe('clave-local')
    expect(visto['anthropic-version']).toBe('2023-06-01')
    expect(visto['anthropic-beta']).toBe('extended-cache-ttl-2025-04-11')
    expect(visto['content-type']).toBe('application/json')
  })

  test('el URL que se arma es /v1/messages sobre el baseUrl dado', async () => {
    const rutas: string[] = []
    await conServidor(
      (req) => { rutas.push(new URL(req.url).pathname)
        return new Response(JSON.stringify({ id: 'm', model: 'claude-opus-5', stop_reason: 'end_turn', content: [], usage: {} })) },
      async (baseUrl) => new AnthropicHttpProvider({ apiKey: 'k', baseUrl }).send(peticion),
    )
    expect(rutas).toEqual(['/v1/messages'])
  })

  test('el stream se lee de un socket real, trozo a trozo', async () => {
    const turno = await conServidor(
      () => respuestaTroceada(cuerpoSse(EVENTOS_TEXTO), 11),
      async (baseUrl) => new AnthropicHttpProvider({ apiKey: 'k', baseUrl })
        .send({ ...peticion, stream: true }),
    )
    expect(turno.content).toEqual([{ type: 'text', text: 'hola mundo' }])
    expect(turno.usage.output_tokens).toBe(12)
  })

  test('un 400 del servidor local llega con su cuerpo y NO se reintenta', async () => {
    let n = 0
    await conServidor(
      () => { n += 1; return new Response('{"error":"bad request"}', { status: 400 }) },
      async (baseUrl) => {
        const p = new AnthropicHttpProvider({ apiKey: 'k', baseUrl, retryDelayMs: 0 })
        await expect(p.send(peticion)).rejects.toThrow(/400.*bad request/)
      },
    )
    expect(n).toBe(1)
  })
})
