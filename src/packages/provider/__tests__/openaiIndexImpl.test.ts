/**
 * `openai/indexImpl.ts` — `queryModelOpenAI`, el adaptador que ata los otros
 * cinco modulos del directorio.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: la fuente NO tiene suite para este
 * modulo. El contrato es la lectura del fuente.
 *
 * COMO SE EJERCITA SIN RED: por la costura que la propia fuente declara —
 * `options.fetchOverride` viaja a `getOpenAIClient`, y ese cliente construido
 * con fetch propio no entra en la cache. Se le da un `fetch` que devuelve un
 * `text/event-stream` sintetico, asi que el generador recorre su camino real
 * —cliente, peticion, adaptacion del stream— sin salir a la red y sin
 * inventar una costura que la fuente no tenga.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { queryModelOpenAI } from '../src/openai/indexImpl.js'
import { clearOpenAIClientCache } from '../src/openai/client.js'
import {
  installProviderHostBindings,
  resetProviderRuntimeBindingsForTests,
} from '../src/providerHostSetup.js'
import type { ProviderHostBindings } from '../src/host.js'

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

/** Un `fetch` que devuelve los chunks dados como SSE, y guarda lo que le pidieron. */
function fetchDeStream(chunks: unknown[], peticiones: unknown[] = []) {
  return async (_url: unknown, init: { body?: string } = {}) => {
    peticiones.push(init.body ? JSON.parse(init.body) : undefined)
    const cuerpo =
      chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n'
    return new Response(cuerpo, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })
  }
}

const opcionesBase = {
  model: 'claude-sonnet-4-6',
  querySource: 'test',
  maxOutputTokensOverride: undefined,
} as never

async function correr(chunks: unknown[], extra: Record<string, unknown> = {}) {
  const peticiones: unknown[] = []
  const eventos: Array<Record<string, unknown>> = []
  const gen = queryModelOpenAI([], [] as never, [] as never, new AbortController().signal, {
    ...(opcionesBase as Record<string, unknown>),
    fetchOverride: fetchDeStream(chunks, peticiones),
    ...extra,
  } as never)
  for await (const e of gen) eventos.push(e as unknown as Record<string, unknown>)
  return { eventos, peticiones }
}

beforeEach(() => {
  registro.length = 0
  costos.length = 0
  installProviderHostBindings(stubBindings())
  clearOpenAIClientCache()
})

afterEach(() => {
  clearOpenAIClientCache()
  resetProviderRuntimeBindingsForTests()
})

describe('queryModelOpenAI — el recorrido de un turno de texto', () => {
  const turnoDeTexto = [
    { choices: [{ delta: { content: 'hola' } }], usage: { prompt_tokens: 5 } },
    { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { completion_tokens: 2 } },
  ]

  test('emite un stream_event por cada evento adaptado', async () => {
    const { eventos } = await correr(turnoDeTexto)
    const deStream = eventos.filter(e => e.type === 'stream_event')
    expect(deStream.map(e => (e.event as { type: string }).type)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
  })

  test('el ttftMs solo acompana al message_start', async () => {
    const { eventos } = await correr(turnoDeTexto)
    const conTtft = eventos.filter(e => 'ttftMs' in e)
    expect(conTtft).toHaveLength(1)
    expect((conTtft[0]?.event as { type: string }).type).toBe('message_start')
    expect(typeof conTtft[0]?.ttftMs).toBe('number')
  })

  test('al cerrar el bloque emite un mensaje de asistente con su contenido', async () => {
    const { eventos } = await correr(turnoDeTexto)
    const asistente = eventos.filter(e => e.type === 'assistant')
    expect(asistente).toHaveLength(1)
    const m = asistente[0]?.message as { content: Array<{ type: string; text: string }> }
    expect(m.content[0]).toMatchObject({ type: 'text', text: 'hola' })
    expect(String(asistente[0]?.uuid)).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('el modelo resuelto viaja en la peticion, no el de Anthropic', async () => {
    const { peticiones } = await correr(turnoDeTexto)
    expect((peticiones[0] as { model: string }).model).toBe('gpt-4o')
  })

  test('la peticion pide stream con el uso incluido', async () => {
    const { peticiones } = await correr(turnoDeTexto)
    const p = peticiones[0] as Record<string, unknown>
    expect(p.stream).toBe(true)
    expect(p.stream_options).toEqual({ include_usage: true })
  })

  test('sin herramientas, la peticion NO lleva tools ni tool_choice', async () => {
    const { peticiones } = await correr(turnoDeTexto)
    const p = peticiones[0] as Record<string, unknown>
    expect(p).not.toHaveProperty('tools')
    expect(p).not.toHaveProperty('tool_choice')
  })

  test('temperatureOverride solo viaja si se declara', async () => {
    const { peticiones: sin } = await correr(turnoDeTexto)
    expect(sin[0] as Record<string, unknown>).not.toHaveProperty('temperature')

    const { peticiones: con } = await correr(turnoDeTexto, { temperatureOverride: 0 })
    // Cero es un valor legitimo: la comparacion es contra undefined.
    expect((con[0] as { temperature: number }).temperature).toBe(0)
  })

  test('el costo de sesion se suma al cerrar, con el uso acumulado', async () => {
    await correr(turnoDeTexto)
    expect(costos).toHaveLength(1)
    const [, usage, model] = costos[0] as [number, Record<string, number>, string]
    expect(usage.input_tokens).toBe(5)
    expect(usage.output_tokens).toBe(2)
    expect(model).toBe('claude-sonnet-4-6')
  })

  test('sin uso alguno NO se suma costo', async () => {
    await correr([{ choices: [{ delta: {}, finish_reason: 'stop' }] }])
    expect(costos).toHaveLength(0)
  })
})

describe('queryModelOpenAI — herramientas', () => {
  test('el input acumulado del tool_use se ANALIZA en el mensaje de asistente', async () => {
    // Es la union de dos piezas: streamAdapter acumula el JSON parcial y
    // normalizeContentFromAPI lo convierte a objeto. Ninguna sola lo hace.
    const { eventos } = await correr([
      {
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: 'tu_1', function: { name: 'Bash', arguments: '{"c":' } },
              ],
            },
          },
        ],
      },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"ls"}' } }] } }] },
      { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
    ])
    const asistente = eventos.filter(e => e.type === 'assistant')
    const m = asistente[0]?.message as {
      content: Array<{ type: string; name: string; input: unknown }>
    }
    expect(m.content[0]?.type).toBe('tool_use')
    expect(m.content[0]?.name).toBe('Bash')
    expect(m.content[0]?.input).toEqual({ c: 'ls' })
  })

  test('con herramientas, la peticion lleva tools traducidas y su tool_choice', async () => {
    // `correr` solo sabe de opciones; las herramientas son el TERCER argumento
    // del generador, asi que este caso lo llama directo. La version anterior de
    // este caso pasaba por `correr` y afirmaba que NO habia tools — pasaba en
    // verde midiendo lo contrario de lo que su nombre decia.
    const peticiones: unknown[] = []
    const gen = queryModelOpenAI(
      [],
      [] as never,
      [{ name: 'Bash', description: 'corre', inputJSONSchema: { type: 'object' } }] as never,
      new AbortController().signal,
      {
        ...(opcionesBase as Record<string, unknown>),
        toolChoice: { type: 'any' },
        fetchOverride: fetchDeStream(
          [{ choices: [{ delta: {}, finish_reason: 'stop' }] }],
          peticiones,
        ),
      } as never,
    )
    for await (const _ of gen) {
      /* se agota el generador */
    }
    const p = peticiones[0] as {
      tools: Array<{ type: string; function: { name: string } }>
      tool_choice: string
    }
    expect(p.tools).toHaveLength(1)
    expect(p.tools[0]?.type).toBe('function')
    expect(p.tools[0]?.function.name).toBe('Bash')
    expect(p.tool_choice).toBe('required')
  })

  test('sin tool_choice declarado, la peticion lleva tools y NO tool_choice', async () => {
    const peticiones: unknown[] = []
    const gen = queryModelOpenAI(
      [],
      [] as never,
      [{ name: 'Bash', description: 'd' }] as never,
      new AbortController().signal,
      {
        ...(opcionesBase as Record<string, unknown>),
        fetchOverride: fetchDeStream(
          [{ choices: [{ delta: {}, finish_reason: 'stop' }] }],
          peticiones,
        ),
      } as never,
    )
    for await (const _ of gen) {
      /* se agota el generador */
    }
    const p = peticiones[0] as Record<string, unknown>
    expect(p).toHaveProperty('tools')
    expect(p).not.toHaveProperty('tool_choice')
  })
})

describe('queryModelOpenAI — la busqueda de herramientas', () => {
  async function conHerramientas(tools: unknown[], mensajes: unknown[] = []) {
    const peticiones: unknown[] = []
    const gen = queryModelOpenAI(
      mensajes as never,
      [] as never,
      tools as never,
      new AbortController().signal,
      {
        ...(opcionesBase as Record<string, unknown>),
        fetchOverride: fetchDeStream(
          [{ choices: [{ delta: {}, finish_reason: 'stop' }] }],
          peticiones,
        ),
      } as never,
    )
    for await (const _ of gen) {
      /* se agota el generador */
    }
    return peticiones[0] as { tools?: Array<{ function: { name: string } }> }
  }

  test('con ToolSearch presente la busqueda se activa y la bitacora lo dice', async () => {
    await conHerramientas([{ name: 'ToolSearch', description: 'busca' }])
    expect(
      registro.some(l => l.startsWith('[OpenAI] Tool search enabled:')),
    ).toBe(true)
  })

  test('una herramienta diferida NO descubierta se excluye de la peticion', async () => {
    const p = await conHerramientas([
      { name: 'ToolSearch', description: 'busca' },
      { name: 'mcp_algo', description: 'diferida', isMcp: true },
    ])
    expect(p.tools?.map(t => t.function.name)).toEqual(['ToolSearch'])
  })

  test('una herramienta diferida YA descubierta si viaja', async () => {
    const p = await conHerramientas(
      [
        { name: 'ToolSearch', description: 'busca' },
        { name: 'mcp_algo', description: 'diferida', isMcp: true },
      ],
      [
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                content: [{ type: 'tool_reference', tool_name: 'mcp_algo' }],
              },
            ],
          },
        },
      ],
    )
    expect(p.tools?.map(t => t.function.name).sort()).toEqual([
      'ToolSearch',
      'mcp_algo',
    ])
  })

  test('sin ToolSearch, una herramienta MCP viaja igual: no hay filtro', async () => {
    const p = await conHerramientas([
      { name: 'mcp_algo', description: 'diferida', isMcp: true },
    ])
    expect(p.tools?.map(t => t.function.name)).toEqual(['mcp_algo'])
  })
})

describe('queryModelOpenAI — el camino de error', () => {
  test('un fallo de la peticion se convierte en mensaje de error de API', async () => {
    const eventos: Array<Record<string, unknown>> = []
    const gen = queryModelOpenAI(
      [],
      [] as never,
      [] as never,
      new AbortController().signal,
      {
        ...(opcionesBase as Record<string, unknown>),
        fetchOverride: async () => {
          throw new Error('se cayo la red')
        },
      } as never,
    )
    for await (const e of gen) eventos.push(e as unknown as Record<string, unknown>)

    expect(eventos).toHaveLength(1)
    expect(eventos[0]?.isApiErrorMessage).toBe(true)
    expect(eventos[0]?.apiError).toBe('api_error')
    const m = eventos[0]?.message as { content: Array<{ text: string }> }
    // MEDIDO: el texto NO es el del error que lanzo el fetch. El SDK envuelve
    // todo fallo de transporte en su propio `APIConnectionError` antes de que
    // llegue al catch, asi que lo que aterriza es su mensaje. El prefijo
    // «API Error: » si es nuestro.
    expect(m.content[0]?.text).toBe('API Error: Connection error.')
  })

  test('el error se registra en la bitacora antes de emitirse', async () => {
    const gen = queryModelOpenAI(
      [],
      [] as never,
      [] as never,
      new AbortController().signal,
      {
        ...(opcionesBase as Record<string, unknown>),
        fetchOverride: async () => {
          throw new Error('boom')
        },
      } as never,
    )
    for await (const _ of gen) {
      /* se agota el generador */
    }
    // Por lo mismo que el caso anterior: se registra el mensaje que el SDK
    // deja, no el que lanzo el fetch.
    expect(
      registro.some(l => l.startsWith('[OpenAI] Error: Connection error.')),
    ).toBe(true)
  })
})

describe('queryModelOpenAI — la bitacora', () => {
  test('declara que la busqueda de herramientas esta inactiva y cuantas van', async () => {
    await correr([{ choices: [{ delta: {}, finish_reason: 'stop' }] }])
    expect(
      registro.some(l => l === '[OpenAI] Tool search disabled, total tools=0'),
    ).toBe(true)
  })

  test('registra el modelo resuelto y los conteos antes de llamar', async () => {
    await correr([{ choices: [{ delta: {}, finish_reason: 'stop' }] }])
    expect(
      registro.some(l => l.startsWith('[OpenAI] Calling model=gpt-4o, messages=')),
    ).toBe(true)
  })
})
