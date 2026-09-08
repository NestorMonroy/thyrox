/**
 * `adapters.ts` — `getProviderAdapter`, la unica puerta por la que el
 * consumidor pide un proveedor.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: la fuente tiene suite para este modulo
 * — `ccnmt: packages/provider/src/__tests__/integration.test.ts` (190 lineas,
 * 3 casos)— y sus tres invariantes estan aqui, reescritos con nuestra
 * redaccion. Los otros diecisiete salen de leer el fuente
 * (`ccnmt: packages/provider/src/adapters.ts`, 184 lineas, 1 export): la
 * suite de la fuente cubre el camino feliz de dos adaptadores y su camino de
 * error, y deja sin medir la desambiguacion proveedor-contra-modelo, el
 * recorte del prefijo de conexion, el `query` derivado del stream, y el
 * rechazo cuando falta la implementacion de Anthropic. Ese hueco es lo que
 * esta suite ademas cubre, declarado como cobertura propia y no como
 * contrato.
 *
 * MITAD ROJA: esta suite se escribio ANTES del modulo. Sin
 * `src/adapters.ts` las 20 aserciones fallan por el import ausente; ese es el
 * estado de partida, medido antes de implementar.
 *
 * COMO SE EJERCITA SIN RED: por la misma costura de siempre,
 * `options.fetchOverride`, que viaja hasta el cliente de cada proveedor. El
 * adaptador de Anthropic no la necesita: su implementacion la entrega el
 * host, asi que se instala un generador sintetico en los bindings — que es lo
 * que la suite de la fuente tambien hace.
 *
 * TRES CONTROLES DE ANULACION, medidos, uno por cada mecanismo propio del
 * modulo:
 *
 * - Se retira el recorte del prefijo de conexion —`stripModelPrefix` devuelve
 *   sus argumentos sin tocar—: cae **1 de 20**, el caso 8. Los casos 9 y 11
 *   sobreviven y deben: miden que unos argumentos SIN prefijo no se
 *   reconstruyan, y la anulacion tampoco los reconstruye.
 * - Se retira la desambiguacion proveedor-contra-modelo —todo valor se lee
 *   como id de modelo—: caen **9 de 20**. Es el mecanismo del que mas cuelga.
 * - Se retira el rechazo por binding ausente: caen **2 de 20**, los 18 y 19.
 *
 * Y UNA CEGUERA MEDIDA, que se declara en vez de taparse: el caso 10 dice
 * medir que el prefijo no llegue a la URL de Gemini, y NO discrimina el
 * recorte de este modulo — sobrevive a la primera anulacion. La razon es que
 * `resolveGeminiModel` desempaqueta el prefijo por su cuenta antes de armar
 * la URL, asi que el caso mide una propiedad que se cumple por dos caminos
 * independientes y no distingue cual la produjo. Se conserva porque la
 * propiedad importa; lo que no se puede afirmar es que mida ESTE recorte.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { getProviderAdapter } from '../src/adapters.js'
import { clearOpenAIClientCache } from '../src/openai/client.js'
import {
  installProviderHostBindings,
  resetProviderRuntimeBindingsForTests,
} from '../src/providerHostSetup.js'
import type { ProviderHostBindings } from '../src/host.js'

const CLAVES = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GEMINI_MODEL'] as const
const guardado = new Map<string, string | undefined>()

/** Lo que el adaptador de Anthropic del host recibio, para poder leerlo. */
let recibidoPorAnthropic: Array<Record<string, unknown>> = []

function stubBindings(
  extra: { conQueryStream?: boolean; conQuery?: boolean } = { conQueryStream: true },
): ProviderHostBindings {
  const anthropic: Record<string, unknown> = {
    getUserAgent: () => 'provider-test',
    getSmallFastModel: () => 'claude-haiku-4-5',
    isFirstPartyAnthropicBaseUrl: () => true,
    logForDebugging: () => {},
  }
  if (extra.conQueryStream) {
    anthropic.queryStream = async function* (args: Record<string, unknown>) {
      recibidoPorAnthropic.push(args)
      yield {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'respuesta-de-anthropic' }],
        },
        uuid: 'assistant-test',
        timestamp: new Date().toISOString(),
      }
    }
  }
  if (extra.conQuery) {
    anthropic.query = async () => ({ type: 'assistant', message: { marcador: 'query-del-host' } })
  }
  return {
    contextPipeline: {
      getUserContext: async () => ({}),
      getSystemContext: async () => ({}),
    },
    networkLayer: {
      getProxyFetchOptions: () => undefined,
      createAxiosInstance: () => ({}),
      getProxyUrl: () => undefined,
      shouldBypassProxy: () => false,
    },
    getAPIProvider: () => 'firstParty',
    getModelOptions: (fastMode?: boolean) => [
      { value: fastMode ? 'claude-haiku-4-5' : 'claude-sonnet-4-6', label: 'm', description: 'd' },
    ],
    auth: {
      checkAndRefreshOAuthTokenIfNeeded: async () => true,
      getAnthropicApiKey: () => 'anthropic-test',
      getApiKeyFromApiKeyHelper: async () => 'anthropic-test',
      getClaudeAIOAuthTokens: () => null,
      isClaudeAISubscriber: () => false,
      isEnvTruthy: (v: unknown) => v === true || v === 'true',
      getOauthConfig: () => ({ BASE_API_URL: 'https://api.anthropic.com' }),
    },
    anthropic,
    session: { addToTotalSessionCost: () => {}, logForDebugging: () => {} },
  } as unknown as ProviderHostBindings
}

/** Un `fetch` que devuelve el SSE de OpenAI de un turno de texto. */
function fetchOpenAI(): typeof fetch {
  const trozos = [
    {
      id: 'chatcmpl_test',
      object: 'chat.completion.chunk',
      created: 0,
      model: 'gpt-4o-mini',
      choices: [{ index: 0, delta: { role: 'assistant', content: 'respuesta-de-openai' }, finish_reason: null }],
    },
    {
      id: 'chatcmpl_test',
      object: 'chat.completion.chunk',
      created: 0,
      model: 'gpt-4o-mini',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
    },
  ]
  return (async () =>
    new Response(trozos.map(c => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })) as unknown as typeof fetch
}

/** Un `fetch` que devuelve el SSE de Gemini de un turno de texto. */
function fetchGemini(peticiones: string[] = []): typeof fetch {
  const trozos = [
    {
      candidates: [{ content: { parts: [{ text: 'respuesta-de-gemini' }] } }],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 },
    },
    { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] },
  ]
  return (async (url: unknown) => {
    peticiones.push(String(url))
    return new Response(trozos.map(c => `data: ${JSON.stringify(c)}\n\n`).join(''), {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })
  }) as unknown as typeof fetch
}

function argumentos(fetchOverride: typeof fetch, model = 'claude-sonnet-4-6') {
  return {
    messages: [
      {
        type: 'user',
        uuid: 'u-1',
        message: { role: 'user', content: [{ type: 'text', text: 'hola' }] },
      },
    ],
    systemPrompt: ['Responde con un token.'],
    tools: [],
    signal: AbortSignal.timeout(5_000),
    thinkingConfig: { type: 'disabled' as const },
    options: {
      model,
      isNonInteractiveSession: true,
      querySource: 'repl_main_thread',
      hasAppendSystemPrompt: false,
      mcpTools: [],
      agents: [],
      getToolPermissionContext: async () => ({ mode: 'default' }),
      fetchOverride,
    },
  }
}

/** Recorre el stream de un adaptador y devuelve el texto que salga. */
async function textoDe(
  adaptador: { queryStream: (a: never) => AsyncIterable<Record<string, unknown>> },
  args: unknown,
): Promise<string> {
  const salida: string[] = []
  for await (const evento of adaptador.queryStream(args as never)) {
    if (evento.type === 'assistant') {
      const contenido = (evento.message as { content: Array<Record<string, unknown>> }).content
      for (const bloque of contenido) {
        if (bloque.type === 'text') salida.push(String(bloque.text))
      }
    }
  }
  return salida.join('')
}

beforeEach(() => {
  for (const k of CLAVES) {
    guardado.set(k, process.env[k])
    delete process.env[k]
  }
  process.env.OPENAI_API_KEY = 'provider-test'
  process.env.GEMINI_API_KEY = 'provider-test'
  recibidoPorAnthropic = []
  installProviderHostBindings(stubBindings())
  clearOpenAIClientCache()
})

afterEach(() => {
  for (const k of CLAVES) {
    const v = guardado.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  clearOpenAIClientCache()
  resetProviderRuntimeBindingsForTests()
})

describe('los tres invariantes que la suite de la fuente mide', () => {
  test('1. el adaptador de Anthropic resuelve sin que nadie le pase un override', async () => {
    const adaptador = getProviderAdapter('firstParty')
    expect(await textoDe(adaptador, argumentos(fetch))).toContain('respuesta-de-anthropic')
  })

  test('2. el adaptador de OpenAI transmite por su propio camino', async () => {
    const adaptador = getProviderAdapter('openai')
    expect(await textoDe(adaptador, argumentos(fetchOpenAI()))).toContain(
      'respuesta-de-openai',
    )
  })

  test('3. un fallo de OpenAI sale como mensaje de asistente, no como excepcion', async () => {
    const adaptador = getProviderAdapter('openai')
    const malFetch = (async () =>
      new Response('boom', { status: 500, statusText: 'server error' })) as typeof fetch
    const eventos: Array<Record<string, unknown>> = []
    for await (const e of adaptador.queryStream(argumentos(malFetch) as never)) {
      eventos.push(e as unknown as Record<string, unknown>)
    }
    const error = eventos.find(e => e.type === 'assistant')
    expect(error).toBeDefined()
    const contenido = (error!.message as { content: Array<Record<string, unknown>> }).content
    expect(String(contenido[0]!.text)).toContain('API Error:')
  })
})

describe('cobertura propia — la desambiguacion proveedor contra modelo', () => {
  test('4. sin argumento, el proveedor lo decide el host', () => {
    expect(getProviderAdapter().id).toBe('firstParty')
  })

  test('5. un valor que ES un APIProvider se toma tal cual, sin consultar el modelo', () => {
    for (const id of ['firstParty', 'bedrock', 'vertex', 'foundry', 'openai', 'gemini'] as const) {
      expect(getProviderAdapter(id).id).toBe(id)
    }
  })

  test('6. un identificador de modelo NO se confunde con un proveedor', () => {
    // Sin registro de conexiones cae al proveedor global; lo que se mide es
    // que no lo tome por el nombre de un proveedor.
    expect(getProviderAdapter('gpt-5.5').id).toBe('firstParty')
  })

  test('7. codex no tiene adaptador propio: cae al camino de Anthropic', async () => {
    // La fuente lo declara a proposito — codex viaja por el SDK de Anthropic
    // con un `fetch` sustituido, no por un adaptador paralelo.
    const adaptador = getProviderAdapter('codex')
    expect(adaptador.id).toBe('codex')
    expect(await textoDe(adaptador, argumentos(fetch))).toContain('respuesta-de-anthropic')
  })
})

describe('cobertura propia — el recorte del prefijo de conexion', () => {
  test('8. el prefijo <connId>: no llega al adaptador de Anthropic', async () => {
    const adaptador = getProviderAdapter('firstParty')
    await textoDe(adaptador, argumentos(fetch, 'mi-conexion:claude-sonnet-4-6'))
    const opciones = recibidoPorAnthropic[0]!.options as { model: string }
    expect(opciones.model).toBe('claude-sonnet-4-6')
  })

  test('9. un modelo sin prefijo llega intacto, y el objeto no se reconstruye', async () => {
    const adaptador = getProviderAdapter('firstParty')
    const args = argumentos(fetch, 'claude-sonnet-4-6')
    await textoDe(adaptador, args)
    expect(recibidoPorAnthropic[0]).toBe(args as unknown as Record<string, unknown>)
  })

  test('10. el prefijo tampoco llega a la URL de Gemini', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-pro'
    const urls: string[] = []
    const adaptador = getProviderAdapter('gemini')
    await textoDe(adaptador, argumentos(fetchGemini(urls), 'mi-conexion:gemini-2.5-pro'))
    expect(urls[0]).toContain('models/gemini-2.5-pro:streamGenerateContent')
    expect(urls[0]).not.toContain('mi-conexion')
  })

  test('11. sin modelo en las opciones, los argumentos pasan sin tocarse', async () => {
    const adaptador = getProviderAdapter('firstParty')
    const args = argumentos(fetch)
    delete (args.options as Record<string, unknown>).model
    await textoDe(adaptador, args)
    expect(recibidoPorAnthropic[0]).toBe(args as unknown as Record<string, unknown>)
  })
})

describe('cobertura propia — la forma del adaptador', () => {
  test('12. lleva su id, su proveedor de credenciales y las dos capas del host', () => {
    const adaptador = getProviderAdapter('openai')
    expect(adaptador.id).toBe('openai')
    expect(typeof adaptador.authProvider.getCredentials).toBe('function')
    expect(typeof adaptador.contextPipeline.getUserContext).toBe('function')
    expect(typeof adaptador.networkLayer.getProxyFetchOptions).toBe('function')
  })

  test('13. cada proveedor trae SU proveedor de credenciales, no el de Anthropic', async () => {
    // El de OpenAI lee OPENAI_API_KEY; el de Anthropic, la clave del host.
    const openai = await getProviderAdapter('openai').isAvailable()
    expect(openai.available).toBe(true)
    delete process.env.OPENAI_API_KEY
    expect((await getProviderAdapter('openai').isAvailable()).available).toBe(false)
    // El de Anthropic sigue disponible: su credencial viene por otra via.
    expect((await getProviderAdapter('firstParty').isAvailable()).available).toBe(true)
  })

  test('14. listModels delega en el host y le pasa el modo rapido', () => {
    const adaptador = getProviderAdapter('openai')
    expect(adaptador.listModels()[0]!.value).toBe('claude-sonnet-4-6')
    expect(adaptador.listModels(true)[0]!.value).toBe('claude-haiku-4-5')
  })
})

describe('cobertura propia — el query derivado del stream', () => {
  test('15. sin query propio, devuelve el ULTIMO mensaje de asistente del stream', async () => {
    const adaptador = getProviderAdapter('openai')
    const mensaje = await adaptador.query(argumentos(fetchOpenAI()) as never)
    const contenido = (mensaje.message as unknown as { content: Array<Record<string, unknown>> })
      .content
    expect(String(contenido[0]!.text)).toContain('respuesta-de-openai')
  })

  test('16. un stream sin mensaje de asistente lanza StreamError con el id del proveedor', async () => {
    installProviderHostBindings(stubBindings({ conQueryStream: false }))
    // Un host cuyo stream no emite asistente: se instala uno vacio.
    const bindings = stubBindings()
    ;(bindings.anthropic as unknown as Record<string, unknown>).queryStream =
      // eslint-disable-next-line require-yield
      async function* () {
        return
      }
    installProviderHostBindings(bindings)
    const adaptador = getProviderAdapter('firstParty')
    await expect(adaptador.query(argumentos(fetch) as never)).rejects.toThrow(
      /Provider firstParty did not yield an assistant message/,
    )
  })

  test('17. si el host trae su propio query, ese gana sobre el derivado', async () => {
    installProviderHostBindings(stubBindings({ conQueryStream: true, conQuery: true }))
    const mensaje = await getProviderAdapter('firstParty').query(argumentos(fetch) as never)
    expect((mensaje.message as unknown as { marcador: string }).marcador).toBe(
      'query-del-host',
    )
  })
})

describe('cobertura propia — el rechazo cuando falta la implementacion del host', () => {
  test('18. sin queryStream de Anthropic, pedir firstParty lanza HostBindingsError', () => {
    installProviderHostBindings(stubBindings({ conQueryStream: false }))
    expect(() => getProviderAdapter('firstParty')).toThrow(
      /Provider firstParty requires an Anthropic query stream implementation/,
    )
  })

  test('19. el mensaje nombra el proveedor pedido, no siempre firstParty', () => {
    installProviderHostBindings(stubBindings({ conQueryStream: false }))
    expect(() => getProviderAdapter('bedrock')).toThrow(/Provider bedrock requires/)
  })

  test('20. un override de queryStream levanta el rechazo aunque el host no lo traiga', async () => {
    installProviderHostBindings(stubBindings({ conQueryStream: false }))
    const adaptador = getProviderAdapter('firstParty', {
      anthropicQueryStream: (async function* () {
        yield {
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'del-override' }] },
          uuid: 'a-1',
          timestamp: new Date().toISOString(),
        }
      }) as never,
    })
    expect(await textoDe(adaptador, argumentos(fetch))).toContain('del-override')
  })
})
