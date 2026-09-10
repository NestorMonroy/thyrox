/**
 * `gemini/client.ts` — la llamada HTTP a `streamGenerateContent`.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: la fuente NO tiene suite para este
 * modulo. El contrato es la lectura del fuente.
 *
 * COMO SE EJERCITA SIN RED, por la costura que la propia firma declara:
 * `fetchOverride` es un parametro del generador, asi que se le da un `fetch`
 * que devuelve un `text/event-stream` sintetico y que ademas guarda la URL y
 * las cabeceras con que lo llamaron. No se inventa ninguna costura.
 *
 * NOTA DE PROCESO, para no fingir lo que no fue: esta suite se escribio
 * DESPUES del modulo, no antes. No hubo mitad roja persistida. El control que
 * si se hizo es la anulacion — quitar el recorte de barras finales de la URL
 * base cae **1 de 18**— y es lo unico que aqui se puede afirmar.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { streamGeminiGenerateContent } from '../src/gemini/client.js'
import {
  installProviderHostBindings,
  resetProviderRuntimeBindingsForTests,
} from '../src/providerHostSetup.js'
import type { ProviderHostBindings } from '../src/host.js'

const TRACKED = ['GEMINI_BASE_URL', 'GEMINI_API_KEY'] as const
const saved = new Map<string, string | undefined>()

function stubBindings(): ProviderHostBindings {
  return {
    contextPipeline: { getUserContext: async () => ({}), getSystemContext: async () => ({}) },
    networkLayer: {
      getProxyFetchOptions: () => undefined,
      createAxiosInstance: () => ({}),
      getProxyUrl: () => undefined,
      shouldBypassProxy: () => false,
    },
  } as unknown as ProviderHostBindings
}

type Llamada = { url: string; init: RequestInit }

/** Un `fetch` que responde con el cuerpo dado y registra como lo llamaron. */
function fetchQueResponde(
  cuerpo: string | null,
  llamadas: Llamada[],
  init: ResponseInit = { status: 200 },
) {
  return (async (url: unknown, opciones: RequestInit = {}) => {
    llamadas.push({ url: String(url), init: opciones })
    return new Response(cuerpo, init)
  }) as unknown as typeof fetch
}

/** Un cuerpo SSE a partir de los chunks dados. */
function sse(...chunks: unknown[]): string {
  return chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join('')
}

async function recolectar(
  gen: AsyncGenerator<unknown, void>,
): Promise<Array<Record<string, unknown>>> {
  const salida: Array<Record<string, unknown>> = []
  for await (const c of gen) salida.push(c as Record<string, unknown>)
  return salida
}

function correr(
  cuerpo: string | null,
  llamadas: Llamada[],
  model = 'gemini-pro',
  init?: ResponseInit,
) {
  return streamGeminiGenerateContent({
    model,
    body: { contents: [] },
    signal: new AbortController().signal,
    fetchOverride: fetchQueResponde(cuerpo, llamadas, init),
  })
}

beforeEach(() => {
  for (const k of TRACKED) {
    saved.set(k, process.env[k])
    delete process.env[k]
  }
  installProviderHostBindings(stubBindings())
})

afterEach(() => {
  for (const k of TRACKED) {
    const v = saved.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  saved.clear()
  resetProviderRuntimeBindingsForTests()
})

describe('streamGeminiGenerateContent — la URL', () => {
  test('sin GEMINI_BASE_URL usa el endpoint publico de Gemini', async () => {
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas))
    expect(llamadas[0]?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?alt=sse',
    )
  })

  test('GEMINI_BASE_URL anula el endpoint', async () => {
    process.env.GEMINI_BASE_URL = 'http://localhost:9000/v1'
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas))
    expect(llamadas[0]?.url).toStartWith('http://localhost:9000/v1/models/')
  })

  test('las barras finales de la URL base se recortan', async () => {
    // Sin recortar saldria una doble barra al concatenar la ruta del modelo.
    process.env.GEMINI_BASE_URL = 'http://localhost:9000/v1///'
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas))
    expect(llamadas[0]?.url).toStartWith('http://localhost:9000/v1/models/gemini-pro:')
  })

  test('un modelo que YA trae el prefijo models/ no lo duplica', async () => {
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas, 'models/gemini-pro'))
    expect(llamadas[0]?.url).toContain('/v1beta/models/gemini-pro:')
    expect(llamadas[0]?.url).not.toContain('models/models/')
  })

  test('las barras iniciales del modelo se recortan', async () => {
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas, '//gemini-pro'))
    expect(llamadas[0]?.url).toContain('/models/gemini-pro:')
  })

  test('la peticion pide alt=sse — sin eso Gemini no emite SSE', async () => {
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas))
    expect(llamadas[0]?.url).toEndWith('?alt=sse')
  })
})

describe('streamGeminiGenerateContent — la peticion', () => {
  test('va por POST con el cuerpo en JSON', async () => {
    const llamadas: Llamada[] = []
    await recolectar(
      streamGeminiGenerateContent({
        model: 'gemini-pro',
        body: { contents: [{ role: 'user', parts: [{ text: 'hola' }] }] },
        signal: new AbortController().signal,
        fetchOverride: fetchQueResponde(sse({ candidates: [] }), llamadas),
      }),
    )
    expect(llamadas[0]?.init.method).toBe('POST')
    expect(JSON.parse(String(llamadas[0]?.init.body))).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
    })
  })

  test('la clave viaja en x-goog-api-key, no en Authorization', async () => {
    process.env.GEMINI_API_KEY = 'clave-de-prueba'
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas))
    const headers = llamadas[0]?.init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('clave-de-prueba')
    expect(headers).not.toHaveProperty('Authorization')
    expect(headers['Content-Type']).toBe('application/json')
  })

  test('sin GEMINI_API_KEY la cabecera va vacia, no ausente', async () => {
    const llamadas: Llamada[] = []
    await recolectar(correr(sse({ candidates: [] }), llamadas))
    const headers = llamadas[0]?.init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('')
  })

  test('el signal del llamador viaja a la peticion', async () => {
    const ac = new AbortController()
    const llamadas: Llamada[] = []
    await recolectar(
      streamGeminiGenerateContent({
        model: 'gemini-pro',
        body: { contents: [] },
        signal: ac.signal,
        fetchOverride: fetchQueResponde(sse({ candidates: [] }), llamadas),
      }),
    )
    expect(llamadas[0]?.init.signal).toBe(ac.signal)
  })
})

describe('streamGeminiGenerateContent — el stream', () => {
  test('cada trama con JSON se emite como un chunk', async () => {
    const chunks = await recolectar(
      correr(sse({ candidates: [{ index: 0 }] }, { candidates: [{ index: 1 }] }), []),
    )
    expect(chunks).toEqual([{ candidates: [{ index: 0 }] }, { candidates: [{ index: 1 }] }])
  })

  test('la trama [DONE] se salta', async () => {
    const chunks = await recolectar(
      correr('data: {"modelVersion":"v"}\n\ndata: [DONE]\n\n', []),
    )
    expect(chunks).toEqual([{ modelVersion: 'v' }])
  })

  test('una trama sin data se salta', async () => {
    const chunks = await recolectar(correr(':keepalive\n\ndata: {"a":1}\n\n', []))
    expect(chunks).toEqual([{ a: 1 }])
  })

  test('una trama con JSON roto lanza StreamError', async () => {
    const gen = correr('data: {roto\n\n', [])
    await expect(recolectar(gen)).rejects.toThrow(/Failed to parse Gemini SSE payload/)
  })

  test('un cuerpo sin frontera final tambien se emite', async () => {
    // El segundo vaciado del buffer, tras el bucle. Sin el, la ultima trama de
    // un stream que no termine en `\n\n` se perderia.
    const chunks = await recolectar(correr('data: {"a":1}\n\ndata: {"b":2}\n\n', []))
    expect(chunks).toEqual([{ a: 1 }, { b: 2 }])
  })
})

describe('streamGeminiGenerateContent — los errores del transporte', () => {
  test('un estado no-ok lanza UpstreamError con el cuerpo', async () => {
    const gen = correr('detalle del fallo', [], 'gemini-pro', {
      status: 429,
      statusText: 'Too Many Requests',
    })
    await expect(recolectar(gen)).rejects.toThrow(
      /Gemini API request failed \(429 Too Many Requests\): detalle del fallo/,
    )
  })

  test('un estado no-ok con cuerpo vacio lo dice explicitamente', async () => {
    const gen = correr('', [], 'gemini-pro', { status: 500, statusText: 'Server Error' })
    await expect(recolectar(gen)).rejects.toThrow(/empty response body/)
  })

  test('una respuesta ok SIN cuerpo lanza StreamError', async () => {
    const gen = correr(null, [], 'gemini-pro', { status: 204 })
    await expect(recolectar(gen)).rejects.toThrow(/returned no response body/)
  })
})
