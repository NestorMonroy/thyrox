/**
 * `runtimeHelpers.ts` — los auxiliares que el adaptador de cada proveedor
 * comparte: normalizacion de mensajes y de contenido, el esquema de
 * herramienta que viaja al API, el mensaje de error de asistente, y las dos
 * decisiones sobre herramientas diferidas.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: la fuente NO tiene suite para este
 * modulo (medido: cero hits de «runtimeHelpers» en sus directorios de test).
 * El contrato de estos casos es la lectura del fuente, no una suite portada.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  TOOL_SEARCH_TOOL_NAME,
  calculateUSDCost,
  createAssistantAPIErrorMessage,
  errorMessage,
  extractDiscoveredToolNames,
  isDeferredTool,
  isToolSearchEnabled,
  normalizeContentFromAPI,
  normalizeMessagesForAPI,
  safeParseJSON,
  toolToAPISchema,
} from '../src/runtimeHelpers.js'

const sinHerramientas = [] as never

describe('safeParseJSON', () => {
  test('un JSON valido se analiza', () => {
    expect(safeParseJSON('{"a":1}')).toEqual({ a: 1 })
  })

  test('un JSON invalido da null, no lanza', () => {
    expect(safeParseJSON('{roto')).toBeNull()
  })

  test('la cadena vacia da null', () => {
    expect(safeParseJSON('')).toBeNull()
  })
})

describe('errorMessage', () => {
  test('de un Error saca su mensaje', () => {
    expect(errorMessage(new Error('fallo'))).toBe('fallo')
  })

  test('de lo que no es Error saca su representacion de cadena', () => {
    expect(errorMessage('texto suelto')).toBe('texto suelto')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('createAssistantAPIErrorMessage', () => {
  test('marca el mensaje como error de API y le pone uuid y fecha', () => {
    const m = createAssistantAPIErrorMessage({ content: 'algo salio mal' }) as Record<
      string,
      unknown
    >
    expect(m.type).toBe('assistant')
    expect(m.isApiErrorMessage).toBe(true)
    expect(String(m.uuid)).toMatch(/^[0-9a-f-]{36}$/)
    expect(() => new Date(String(m.timestamp)).toISOString()).not.toThrow()
  })

  test('el contenido viaja como un unico bloque de texto', () => {
    const m = createAssistantAPIErrorMessage({ content: 'x' }) as {
      message: { role: string; content: Array<{ type: string; text: string }> }
    }
    expect(m.message.role).toBe('assistant')
    expect(m.message.content).toEqual([{ type: 'text', text: 'x' }])
  })

  test('un contenido vacio cae al texto por defecto', () => {
    // Sin este respaldo el bloque de texto saldria vacio y el consumidor
    // mostraria un error sin cuerpo.
    const m = createAssistantAPIErrorMessage({ content: '' }) as {
      message: { content: Array<{ text: string }> }
    }
    expect(m.message.content[0]?.text).toBe('No content')
  })
})

describe('normalizeContentFromAPI', () => {
  test('lo que no es arreglo da arreglo vacio', () => {
    expect(normalizeContentFromAPI(undefined, sinHerramientas)).toEqual([])
    expect(normalizeContentFromAPI('texto', sinHerramientas)).toEqual([])
  })

  test('un tool_use con input de CADENA se analiza a objeto', () => {
    const r = normalizeContentFromAPI(
      [{ type: 'tool_use', id: 't', input: '{"a":1}' }],
      sinHerramientas,
    ) as Array<{ input: unknown }>
    expect(r[0]?.input).toEqual({ a: 1 })
  })

  test('un tool_use con input de cadena INVALIDA cae a objeto vacio', () => {
    const r = normalizeContentFromAPI(
      [{ type: 'tool_use', id: 't', input: '{roto' }],
      sinHerramientas,
    ) as Array<{ input: unknown }>
    expect(r[0]?.input).toEqual({})
  })

  test('un input que analiza a un valor FALSY se conserva, no cae a objeto', () => {
    // El respaldo es `?? {}` y no `|| {}`: el cero es un analisis valido y
    // sustituirlo por objeto vacio perderia el argumento.
    const r = normalizeContentFromAPI(
      [{ type: 'tool_use', id: 't', input: '0' }],
      sinHerramientas,
    ) as Array<{ input: unknown }>
    expect(r[0]?.input).toBe(0)
  })

  test('un input que analiza a null SI cae a objeto vacio', () => {
    const r = normalizeContentFromAPI(
      [{ type: 'tool_use', id: 't', input: 'null' }],
      sinHerramientas,
    ) as Array<{ input: unknown }>
    expect(r[0]?.input).toEqual({})
  })

  test('server_tool_use recibe el mismo trato', () => {
    const r = normalizeContentFromAPI(
      [{ type: 'server_tool_use', input: '{"b":2}' }],
      sinHerramientas,
    ) as Array<{ input: unknown }>
    expect(r[0]?.input).toEqual({ b: 2 })
  })

  test('un tool_use con input ya OBJETO no se toca', () => {
    const bloque = { type: 'tool_use', id: 't', input: { a: 1 } }
    const r = normalizeContentFromAPI([bloque], sinHerramientas) as unknown[]
    expect(r[0]).toEqual(bloque)
  })

  test('un bloque de texto pasa tal cual', () => {
    const r = normalizeContentFromAPI(
      [{ type: 'text', text: 'hola' }],
      sinHerramientas,
    ) as unknown[]
    expect(r[0]).toEqual({ type: 'text', text: 'hola' })
  })

  test('un elemento que no es objeto pasa tal cual', () => {
    const r = normalizeContentFromAPI(['suelto', null], sinHerramientas) as unknown[]
    expect(r).toEqual(['suelto', null])
  })
})

describe('normalizeMessagesForAPI', () => {
  const base = { message: { content: [] } }

  test('conserva usuario y asistente', () => {
    const r = normalizeMessagesForAPI(
      [
        { type: 'user', ...base },
        { type: 'assistant', ...base },
      ] as never,
      sinHerramientas,
    )
    expect(r).toHaveLength(2)
  })

  test('descarta los tipos que no son usuario ni asistente', () => {
    const r = normalizeMessagesForAPI(
      [
        { type: 'system', ...base },
        { type: 'progress', ...base },
      ] as never,
      sinHerramientas,
    )
    expect(r).toEqual([])
  })

  test('descarta los mensajes virtuales', () => {
    const r = normalizeMessagesForAPI(
      [{ type: 'user', isVirtual: true, ...base }] as never,
      sinHerramientas,
    )
    expect(r).toEqual([])
  })

  test('descarta el mensaje sin message', () => {
    const r = normalizeMessagesForAPI([{ type: 'user' }] as never, sinHerramientas)
    expect(r).toEqual([])
  })

  test('descarta el mensaje cuyo contenido es undefined', () => {
    const r = normalizeMessagesForAPI(
      [{ type: 'user', message: {} }] as never,
      sinHerramientas,
    )
    expect(r).toEqual([])
  })

  test('un contenido de cadena VACIA sobrevive: vacio no es ausente', () => {
    const r = normalizeMessagesForAPI(
      [{ type: 'user', message: { content: '' } }] as never,
      sinHerramientas,
    )
    expect(r).toHaveLength(1)
  })
})

describe('toolToAPISchema', () => {
  const opciones = { tools: [], agents: [] } as never

  test('arma nombre, descripcion y esquema de entrada', async () => {
    const s = (await toolToAPISchema(
      { name: 'Bash', description: 'corre', inputJSONSchema: { type: 'object', properties: { c: {} } } } as never,
      opciones,
    )) as Record<string, unknown>
    expect(s.name).toBe('Bash')
    expect(s.description).toBe('corre')
    expect(s.input_schema).toEqual({ type: 'object', properties: { c: {} } })
  })

  test('una descripcion de FUNCION se invoca', async () => {
    const s = (await toolToAPISchema(
      { name: 'X', description: () => 'calculada' } as never,
      opciones,
    )) as Record<string, unknown>
    expect(s.description).toBe('calculada')
  })

  test('el prompt gana sobre la descripcion y recibe el contexto', async () => {
    let recibido: Record<string, unknown> | undefined
    const s = (await toolToAPISchema(
      {
        name: 'X',
        description: 'no deberia usarse',
        prompt: async (args: Record<string, unknown>) => {
          recibido = args
          return 'del prompt'
        },
      } as never,
      { tools: ['t'], agents: ['a'], allowedAgentTypes: ['x'] } as never,
    )) as Record<string, unknown>
    expect(s.description).toBe('del prompt')
    expect(recibido?.tools).toEqual(['t'])
    expect(recibido?.agents).toEqual(['a'])
    expect(recibido?.allowedAgentTypes).toEqual(['x'])
  })

  test('sin descripcion queda cadena vacia, no undefined', async () => {
    const s = (await toolToAPISchema({ name: 'X' } as never, opciones)) as Record<
      string,
      unknown
    >
    expect(s.description).toBe('')
  })

  test('sin inputJSONSchema cae al esquema de objeto vacio', async () => {
    const s = (await toolToAPISchema({ name: 'X' } as never, opciones)) as Record<
      string,
      unknown
    >
    expect(s.input_schema).toEqual({ type: 'object', properties: {} })
  })

  test('un inputJSONSchema que es ARREGLO cae al esquema por defecto', async () => {
    const s = (await toolToAPISchema(
      { name: 'X', inputJSONSchema: [1, 2] } as never,
      opciones,
    )) as Record<string, unknown>
    expect(s.input_schema).toEqual({ type: 'object', properties: {} })
  })

  test('deferLoading y cacheControl solo aparecen si se piden', async () => {
    const sin = (await toolToAPISchema({ name: 'X' } as never, opciones)) as Record<
      string,
      unknown
    >
    expect(sin).not.toHaveProperty('defer_loading')
    expect(sin).not.toHaveProperty('cache_control')

    const con = (await toolToAPISchema(
      { name: 'X' } as never,
      { ...opciones, deferLoading: true, cacheControl: { type: 'ephemeral' } } as never,
    )) as Record<string, unknown>
    expect(con.defer_loading).toBe(true)
    expect(con.cache_control).toEqual({ type: 'ephemeral' })
  })
})

describe('calculateUSDCost', () => {
  test('devuelve 0 — el costo no se calcula en esta capa', () => {
    // Es un marcador de frontera, no un calculo: el costo en dolares se
    // decide fuera de este paquete.
    expect(calculateUSDCost('cualquiera', { input_tokens: 999 })).toBe(0)
  })
})

describe('isDeferredTool', () => {
  test('una herramienta MCP se difiere', () => {
    expect(isDeferredTool({ name: 'X', isMcp: true } as never)).toBe(true)
  })

  test('shouldDefer tambien la difiere', () => {
    expect(isDeferredTool({ name: 'X', shouldDefer: true } as never)).toBe(true)
  })

  test('sin ninguna de las dos, no se difiere', () => {
    expect(isDeferredTool({ name: 'X' } as never)).toBe(false)
  })

  test('el valor tiene que ser true exacto, no solo veraz', () => {
    expect(isDeferredTool({ name: 'X', isMcp: 1 } as never)).toBe(false)
  })
})

describe('extractDiscoveredToolNames', () => {
  function conResultado(items: unknown[]) {
    return [
      {
        type: 'user',
        message: { content: [{ type: 'tool_result', content: items }] },
      },
    ] as never
  }

  test('recoge el tool_name de cada tool_reference', () => {
    const r = extractDiscoveredToolNames(
      conResultado([
        { type: 'tool_reference', tool_name: 'Alpha' },
        { type: 'tool_reference', tool_name: 'Beta' },
      ]),
    )
    expect([...r].sort()).toEqual(['Alpha', 'Beta'])
  })

  test('ignora los elementos que no son tool_reference', () => {
    const r = extractDiscoveredToolNames(
      conResultado([{ type: 'text', text: 'ruido' }, { tool_name: 'sin tipo' }]),
    )
    expect(r.size).toBe(0)
  })

  test('un tool_name que no es cadena se ignora', () => {
    const r = extractDiscoveredToolNames(
      conResultado([{ type: 'tool_reference', tool_name: 7 }]),
    )
    expect(r.size).toBe(0)
  })

  test('solo mira los mensajes de USUARIO', () => {
    const r = extractDiscoveredToolNames([
      {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 'Alpha' }],
            },
          ],
        },
      },
    ] as never)
    expect(r.size).toBe(0)
  })

  test('un contenido que no es arreglo no rompe', () => {
    const r = extractDiscoveredToolNames([
      { type: 'user', message: { content: 'texto' } },
    ] as never)
    expect(r.size).toBe(0)
  })
})

describe('isToolSearchEnabled', () => {
  let previo: string | undefined
  beforeEach(() => {
    previo = process.env.ENABLE_TOOL_SEARCH
    delete process.env.ENABLE_TOOL_SEARCH
  })
  afterEach(() => {
    if (previo === undefined) delete process.env.ENABLE_TOOL_SEARCH
    else process.env.ENABLE_TOOL_SEARCH = previo
  })

  const ctx = async () => ({ mode: 'default' }) as never

  test('la herramienta se llama ToolSearch', () => {
    expect(TOOL_SEARCH_TOOL_NAME).toBe('ToolSearch')
  })

  test('activa cuando la herramienta esta entre las disponibles', async () => {
    expect(
      await isToolSearchEnabled('m', [{ name: 'ToolSearch' }] as never, ctx, []),
    ).toBe(true)
  })

  test('inactiva si la herramienta no esta', async () => {
    expect(await isToolSearchEnabled('m', [{ name: 'Bash' }] as never, ctx, [])).toBe(
      false,
    )
  })

  test('ENABLE_TOOL_SEARCH=false la desactiva aunque la herramienta este', async () => {
    process.env.ENABLE_TOOL_SEARCH = 'false'
    expect(
      await isToolSearchEnabled('m', [{ name: 'ToolSearch' }] as never, ctx, []),
    ).toBe(false)
  })

  test('cualquier otro valor NO la desactiva: solo la cadena false', async () => {
    process.env.ENABLE_TOOL_SEARCH = '0'
    expect(
      await isToolSearchEnabled('m', [{ name: 'ToolSearch' }] as never, ctx, []),
    ).toBe(true)
  })
})
