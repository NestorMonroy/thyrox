/**
 * `gemini/indexImpl.ts` — `queryModelGemini`, el adaptador que ata los otros
 * seis modulos del directorio.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: la fuente NO tiene suite para este
 * modulo. El contrato es la lectura del fuente
 * (`ccnmt: packages/provider/src/gemini/indexImpl.ts`, 219 lineas, 1 export).
 *
 * COMO SE EJERCITA SIN RED: por la costura que la propia fuente declara —
 * `options.fetchOverride` viaja hasta `streamGeminiGenerateContent`, que lo
 * usa en vez de `fetch`. Se le da uno que devuelve un `text/event-stream`
 * sintetico y guarda el cuerpo de la peticion, asi que el generador recorre
 * su camino real —resolucion de modelo, traduccion, HTTP, adaptacion del
 * stream— sin salir a la red y sin inventar una costura que la fuente no
 * tenga.
 *
 * MITAD ROJA: esta suite se escribio ANTES del modulo. Al correrla contra el
 * arbol sin `src/gemini/indexImpl.ts` las 22 aserciones fallan por el import
 * ausente; es el estado de partida y quedo medido antes de implementar.
 *
 * CUATRO DIFERENCIAS con su hermano de OpenAI, y ninguna es de estilo:
 *
 * 1. Toma un SEXTO parametro, `thinkingConfig`, que se traduce a
 *    `generationConfig.thinkingConfig`. El de OpenAI no tiene equivalente.
 * 2. NO filtra herramientas diferidas: no hay busqueda de herramientas ni
 *    `TOOL_SEARCH_TOOL_NAME`; todas las herramientas viajan al esquema.
 * 3. NO acumula costo ni uso: no llama a `addToTotalSessionCost`.
 * 4. Un `signature_delta` sobre un bloque que NO es de pensamiento se guarda
 *    en `GEMINI_THOUGHT_SIGNATURE_FIELD` en vez de en `signature`. Es lo que
 *    hace que la firma sobreviva el viaje de ida y vuelta por la forma de
 *    Anthropic.
 *
 * DOS CONTROLES DE ANULACION, medidos, uno por cada diferencia que sin ellos
 * quedaria sin discriminar:
 *
 * - Se retira la bifurcacion del `signature_delta` y la firma va siempre a
 *   `signature`: cae **1 de 23**, el caso 20. Ninguno mas — la diferencia 4
 *   tiene exactamente una asercion que la mide.
 * - Se retira la traduccion de `thinkingConfig` a `generationConfig`: caen
 *   **2 de 23**, los casos 8 y 9. El 7 sobrevive, y debe: mide la ausencia
 *   de la clave, que la anulacion tambien produce.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { queryModelGemini } from '../src/gemini/indexImpl.js'
import { GEMINI_THOUGHT_SIGNATURE_FIELD } from '../src/gemini/types.js'
import {
  installProviderHostBindings,
  resetProviderRuntimeBindingsForTests,
} from '../src/providerHostSetup.js'
import type { ProviderHostBindings } from '../src/host.js'

const TRACKED = ['GEMINI_BASE_URL', 'GEMINI_API_KEY', 'GEMINI_MODEL'] as const
const saved = new Map<string, string | undefined>()

const registro: string[] = []
const costos: unknown[][] = []

function stubBindings(): ProviderHostBindings {
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
    session: {
      logForDebugging: (m: string) => registro.push(m),
      addToTotalSessionCost: (...args: unknown[]) => costos.push(args),
    },
    anthropic: { logForDebugging: (m: string) => registro.push(m) },
  } as unknown as ProviderHostBindings
}

type Peticion = { url: string; body: Record<string, unknown> }

/** Un `fetch` que devuelve los chunks dados como SSE y guarda como lo llamaron. */
function fetchDeStream(chunks: unknown[], peticiones: Peticion[]) {
  return (async (url: unknown, init: { body?: string } = {}) => {
    peticiones.push({
      url: String(url),
      body: init.body ? JSON.parse(init.body) : {},
    })
    return new Response(chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join(''), {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })
  }) as unknown as typeof fetch
}

/** Un `fetch` que falla, para el camino de error. */
function fetchQueRevienta(mensaje: string) {
  return (async () => {
    throw new Error(mensaje)
  }) as unknown as typeof fetch
}

const opcionesBase = { model: 'gemini-2.5-pro' }

const pensamientoApagado = { type: 'disabled' } as never

async function correr(
  chunks: unknown[],
  extra: Record<string, unknown> = {},
  thinking: unknown = pensamientoApagado,
  fetchAlterno?: typeof fetch,
) {
  const peticiones: Peticion[] = []
  const eventos: Array<Record<string, unknown>> = []
  const gen = queryModelGemini(
    (extra.messages as never) ?? ([] as never),
    [] as never,
    (extra.tools as never) ?? ([] as never),
    new AbortController().signal,
    {
      ...opcionesBase,
      ...extra,
      fetchOverride: fetchAlterno ?? fetchDeStream(chunks, peticiones),
    } as never,
    thinking as never,
  )
  for await (const e of gen) eventos.push(e as unknown as Record<string, unknown>)
  return { eventos, peticiones }
}

/** Los eventos de stream crudos que el generador reenvia. */
function crudos(eventos: Array<Record<string, unknown>>) {
  return eventos
    .filter(e => e.type === 'stream_event')
    .map(e => e.event as Record<string, unknown>)
}

/** Los mensajes de asistente que el generador emite al cerrar cada bloque. */
function asistentes(eventos: Array<Record<string, unknown>>) {
  return eventos.filter(e => e.type === 'assistant')
}

const textoSimple = [
  {
    candidates: [{ content: { parts: [{ text: 'hola' }] } }],
    usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 2 },
  },
  { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] },
]

beforeEach(() => {
  for (const k of TRACKED) {
    saved.set(k, process.env[k])
    delete process.env[k]
  }
  registro.length = 0
  costos.length = 0
  installProviderHostBindings(stubBindings())
})

afterEach(() => {
  for (const k of TRACKED) {
    const v = saved.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  resetProviderRuntimeBindingsForTests()
})

describe('queryModelGemini — el recorrido de un turno de texto', () => {
  test('1. reenvia cada evento del stream adaptado envuelto en stream_event', async () => {
    const { eventos } = await correr(textoSimple)
    const tipos = crudos(eventos).map(e => e.type)
    expect(tipos).toContain('message_start')
    expect(tipos).toContain('content_block_start')
    expect(tipos).toContain('content_block_delta')
    expect(tipos).toContain('content_block_stop')
    expect(tipos).toContain('message_stop')
  })

  test('2. el message_start lleva ttftMs y ningun otro evento lo lleva', async () => {
    const { eventos } = await correr(textoSimple)
    const conTtft = eventos.filter(e => 'ttftMs' in e)
    expect(conTtft).toHaveLength(1)
    expect((conTtft[0] as { event: { type: string } }).event.type).toBe('message_start')
    expect(typeof conTtft[0]!.ttftMs).toBe('number')
  })

  test('3. al cerrar el bloque emite un mensaje de asistente con el texto acumulado', async () => {
    const { eventos } = await correr(textoSimple)
    const msgs = asistentes(eventos)
    expect(msgs).toHaveLength(1)
    const contenido = (msgs[0]!.message as { content: Array<Record<string, unknown>> })
      .content
    expect(contenido[0]!.type).toBe('text')
    expect(contenido[0]!.text).toBe('hola')
  })

  test('4. el mensaje de asistente lleva uuid, timestamp y requestId indefinido', async () => {
    const { eventos } = await correr(textoSimple)
    const msg = asistentes(eventos)[0]!
    expect(typeof msg.uuid).toBe('string')
    expect((msg.uuid as string).length).toBeGreaterThan(0)
    expect(typeof msg.timestamp).toBe('string')
    expect(msg.requestId).toBeUndefined()
  })

  test('5. el texto se acumula entre varios deltas antes de cerrar', async () => {
    const { eventos } = await correr([
      { candidates: [{ content: { parts: [{ text: 'ho' }] } }] },
      { candidates: [{ content: { parts: [{ text: 'la' }] } }] },
      { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] },
    ])
    const contenido = (
      asistentes(eventos)[0]!.message as { content: Array<Record<string, unknown>> }
    ).content
    expect(contenido[0]!.text).toBe('hola')
  })
})

describe('queryModelGemini — lo que viaja en el cuerpo de la peticion', () => {
  test('6. el modelo resuelto va en la URL, no en el cuerpo', async () => {
    const { peticiones } = await correr(textoSimple)
    expect(peticiones[0]!.url).toContain('models/gemini-2.5-pro:streamGenerateContent')
  })

  test('7. sin pensamiento, generationConfig NO lleva thinkingConfig', async () => {
    const { peticiones } = await correr(textoSimple)
    const gc = peticiones[0]!.body.generationConfig as Record<string, unknown>
    expect(gc).toBeDefined()
    expect(gc.thinkingConfig).toBeUndefined()
  })

  test('8. con pensamiento habilitado viaja includeThoughts y el presupuesto', async () => {
    const { peticiones } = await correr(textoSimple, {}, {
      type: 'enabled',
      budgetTokens: 4096,
    })
    const gc = peticiones[0]!.body.generationConfig as Record<string, unknown>
    expect(gc.thinkingConfig).toEqual({ includeThoughts: true, thinkingBudget: 4096 })
  })

  test('9. con pensamiento en otro modo no-disabled viaja includeThoughts SIN presupuesto', async () => {
    const { peticiones } = await correr(textoSimple, {}, { type: 'auto' })
    const gc = peticiones[0]!.body.generationConfig as Record<string, unknown>
    expect(gc.thinkingConfig).toEqual({ includeThoughts: true })
  })

  test('10. temperatureOverride viaja a generationConfig; su ausencia no pone la clave', async () => {
    const conTemp = await correr(textoSimple, { temperatureOverride: 0.25 })
    expect(
      (conTemp.peticiones[0]!.body.generationConfig as Record<string, unknown>).temperature,
    ).toBe(0.25)
    const sinTemp = await correr(textoSimple)
    expect(
      (sinTemp.peticiones[0]!.body.generationConfig as Record<string, unknown>).temperature,
    ).toBeUndefined()
  })

  test('11. sin herramientas el cuerpo NO lleva la clave tools', async () => {
    const { peticiones } = await correr(textoSimple)
    expect(peticiones[0]!.body.tools).toBeUndefined()
  })

  test('12. con herramientas, viajan traducidas a functionDeclarations', async () => {
    const { peticiones } = await correr(textoSimple, {
      tools: [
        {
          name: 'Bash',
          description: async () => 'corre un comando',
          inputJSONSchema: {
            type: 'object',
            properties: { command: { type: 'string' } },
          },
        },
      ],
    })
    const tools = peticiones[0]!.body.tools as Array<Record<string, unknown>>
    expect(tools).toHaveLength(1)
    const decls = tools[0]!.functionDeclarations as Array<Record<string, unknown>>
    expect(decls[0]!.name).toBe('Bash')
  })

  test('13. sin toolChoice el cuerpo NO lleva toolConfig', async () => {
    const { peticiones } = await correr(textoSimple)
    expect(peticiones[0]!.body.toolConfig).toBeUndefined()
  })

  test('14. con toolChoice viaja envuelto en functionCallingConfig', async () => {
    const { peticiones } = await correr(textoSimple, { toolChoice: { type: 'any' } })
    expect(peticiones[0]!.body.toolConfig).toEqual({
      functionCallingConfig: { mode: 'ANY' },
    })
  })

  test('15. sin systemPrompt el cuerpo NO lleva systemInstruction', async () => {
    const { peticiones } = await correr(textoSimple)
    expect(peticiones[0]!.body.systemInstruction).toBeUndefined()
  })
})

describe('queryModelGemini — la diferencia con el hermano de OpenAI', () => {
  test('16. NO acumula costo: addToTotalSessionCost no se llama nunca', async () => {
    await correr(textoSimple)
    expect(costos).toHaveLength(0)
  })

  test('17. registra la llamada con modelo, mensajes y herramientas', async () => {
    await correr(textoSimple)
    const linea = registro.find(l => l.startsWith('[Gemini] Calling'))
    expect(linea).toBeDefined()
    expect(linea).toContain('model=gemini-2.5-pro')
    expect(linea).toContain('tools=0')
  })
})

describe('queryModelGemini — llamada a herramienta y firma de pensamiento', () => {
  test('18. una llamada a funcion cierra su bloque con el input ya en objeto', async () => {
    const { eventos } = await correr([
      {
        candidates: [
          {
            content: { parts: [{ functionCall: { name: 'Bash', args: { command: 'ls' } } }] },
          },
        ],
      },
      { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] },
    ])
    const contenido = (
      asistentes(eventos)[0]!.message as { content: Array<Record<string, unknown>> }
    ).content
    expect(contenido[0]!.type).toBe('tool_use')
    expect(contenido[0]!.name).toBe('Bash')
    expect(contenido[0]!.input).toEqual({ command: 'ls' })
  })

  test('19. el pensamiento cierra como bloque thinking con su firma', async () => {
    const { eventos } = await correr([
      {
        candidates: [
          {
            content: {
              parts: [{ text: 'pienso', thought: true, thoughtSignature: 'firma-1' }],
            },
          },
        ],
      },
      { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] },
    ])
    const contenido = (
      asistentes(eventos)[0]!.message as { content: Array<Record<string, unknown>> }
    ).content
    expect(contenido[0]!.type).toBe('thinking')
    expect(contenido[0]!.thinking).toBe('pienso')
    expect(contenido[0]!.signature).toBe('firma-1')
  })

  test('20. CRITICO: una firma sobre un bloque que NO es thinking va al campo propio de Gemini', async () => {
    const { eventos } = await correr([
      { candidates: [{ content: { parts: [{ text: 'hola' }] } }] },
      { candidates: [{ content: { parts: [{ thoughtSignature: 'firma-2' }] } }] },
      { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] },
    ])
    const contenido = (
      asistentes(eventos)[0]!.message as { content: Array<Record<string, unknown>> }
    ).content
    expect(contenido[0]!.type).toBe('text')
    expect(contenido[0]![GEMINI_THOUGHT_SIGNATURE_FIELD]).toBe('firma-2')
    expect(contenido[0]!.signature).toBeUndefined()
  })
})

describe('queryModelGemini — el camino de error', () => {
  test('21. un fallo del transporte sale como mensaje de error, no como excepcion', async () => {
    const { eventos } = await correr([], {}, pensamientoApagado, fetchQueRevienta('sin red'))
    expect(eventos).toHaveLength(1)
    const contenido = (
      eventos[0]!.message as { content: Array<Record<string, unknown>> }
    ).content
    expect(contenido[0]!.text).toBe('API Error: sin red')
  })

  test('22. el error queda registrado con su prefijo', async () => {
    await correr([], {}, pensamientoApagado, fetchQueRevienta('sin red'))
    expect(registro.some(l => l === '[Gemini] Error: sin red')).toBe(true)
  })
})

describe('gemini/index.ts — la fachada', () => {
  test('23. reexporta los siete modulos, y NO el analizador de tramas', async () => {
    const fachada = (await import('../src/gemini/index.js')) as Record<string, unknown>
    for (const nombre of [
      'streamGeminiGenerateContent',
      'anthropicMessagesToGemini',
      'anthropicToolsToGemini',
      'anthropicToolChoiceToGemini',
      'queryModelGemini',
      'resolveGeminiModel',
      'adaptGeminiStreamToAnthropic',
      'GEMINI_THOUGHT_SIGNATURE_FIELD',
    ]) {
      expect(typeof fachada[nombre]).not.toBe('undefined')
    }
    // `sseParser` es detalle interno del cliente: la fuente tampoco lo
    // reexporta, asi que su ausencia es contrato, no olvido.
    expect(fachada.parseSSEFrames).toBeUndefined()
  })
})
