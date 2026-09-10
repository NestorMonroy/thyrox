import { describe, expect, test } from 'bun:test'
import { extractTeammateOptions } from '../options.js'

describe('extractTeammateOptions — análisis defensivo', () => {
  test('null → objeto vacío', () => {
    expect(extractTeammateOptions(null)).toEqual({})
  })

  test('undefined → objeto vacío', () => {
    expect(extractTeammateOptions(undefined)).toEqual({})
  })

  test('primitivos no-objeto → objeto vacío', () => {
    expect(extractTeammateOptions('string')).toEqual({})
    expect(extractTeammateOptions(42)).toEqual({})
    expect(extractTeammateOptions(true)).toEqual({})
  })

  test('un arreglo también se acepta como objeto (typeof [] === "object")', () => {
    // typeof [] es 'object', así que la función NO rechaza los arreglos.
    // Los índices del arreglo, escritos como números, no se acceden por
    // los nombres de campo, así que el resultado queda vacío (sin
    // campos agentId, etc.).
    expect(extractTeammateOptions([])).toEqual({
      agentId: undefined,
      agentName: undefined,
      teamName: undefined,
      agentColor: undefined,
      planModeRequired: undefined,
      parentSessionId: undefined,
      teammateMode: undefined,
      agentType: undefined,
    })
  })
})

describe('extractTeammateOptions — campos de cadena', () => {
  test('los 5 campos de cadena se propagan cuando se proveen', () => {
    expect(
      extractTeammateOptions({
        agentId: 'agent-1',
        agentName: 'researcher',
        teamName: 'my-team',
        agentColor: 'blue',
        parentSessionId: 'sess-abc',
        agentType: 'custom',
      }),
    ).toEqual({
      agentId: 'agent-1',
      agentName: 'researcher',
      teamName: 'my-team',
      agentColor: 'blue',
      planModeRequired: undefined,
      parentSessionId: 'sess-abc',
      teammateMode: undefined,
      agentType: 'custom',
    })
  })

  test('valores no-cadena en campos de cadena se descartan a undefined', () => {
    // CRÍTICO: valores numéricos o booleanos para campos de cadena NO
    // deben propagarse. Un refactor futuro que use `String(opts.agentId)`
    // dejaría que `42` se convirtiera silenciosamente en `"42"` — lo que
    // enrutaría a un ID de agente inexistente. El chequeo estricto de
    // typeof sostiene esta garantía.
    expect(
      extractTeammateOptions({
        agentId: 42,
        agentName: true,
        teamName: null,
      }),
    ).toEqual({
      agentId: undefined,
      agentName: undefined,
      teamName: undefined,
      agentColor: undefined,
      planModeRequired: undefined,
      parentSessionId: undefined,
      teammateMode: undefined,
      agentType: undefined,
    })
  })

  test('la cadena vacía SÍ se acepta (el chequeo usa typeof, no un truthy)', () => {
    // El chequeo es `typeof opts.X === 'string'`, NO `opts.X` (truthy).
    // La cadena vacía es una cadena válida. Esto documenta que — si
    // quien llama pasa '', eso se propaga como ''.
    expect(
      extractTeammateOptions({
        agentId: '',
      }).agentId,
    ).toBe('')
  })
})

describe('extractTeammateOptions — planModeRequired (booleano)', () => {
  test('true → true', () => {
    expect(
      extractTeammateOptions({ planModeRequired: true }).planModeRequired,
    ).toBe(true)
  })

  test('false → false (¡no undefined!)', () => {
    // CRÍTICO: false es un valor válido, no "ausente". El chequeo es
    // `typeof === 'boolean'`. Un refactor futuro con
    // `opts.planModeRequired ?? undefined` convertiría false en
    // undefined y rompería el contrato explícito de "sin plan mode".
    expect(
      extractTeammateOptions({ planModeRequired: false }).planModeRequired,
    ).toBe(false)
  })

  test('no-booleano se rechaza (cadena "true" → undefined)', () => {
    expect(
      extractTeammateOptions({ planModeRequired: 'true' }).planModeRequired,
    ).toBeUndefined()
  })

  test('no-booleano se rechaza (número 1 → undefined)', () => {
    expect(
      extractTeammateOptions({ planModeRequired: 1 }).planModeRequired,
    ).toBeUndefined()
  })
})

describe('extractTeammateOptions — enum teammateMode', () => {
  // El campo teammateMode debe ser exactamente uno de tres valores;
  // cualquier otro se descarta a undefined. Esto es una frontera de
  // seguridad — si un usuario pudiera pasar un modo arbitrario, el
  // runtime podría fallar con un caso de modo no manejado en el
  // despachador.

  test('"auto" → "auto"', () => {
    expect(
      extractTeammateOptions({ teammateMode: 'auto' }).teammateMode,
    ).toBe('auto')
  })

  test('"tmux" → "tmux"', () => {
    expect(
      extractTeammateOptions({ teammateMode: 'tmux' }).teammateMode,
    ).toBe('tmux')
  })

  test('"in-process" → "in-process"', () => {
    expect(
      extractTeammateOptions({ teammateMode: 'in-process' }).teammateMode,
    ).toBe('in-process')
  })

  test('modo desconocido → undefined', () => {
    expect(
      extractTeammateOptions({ teammateMode: 'foreground' }).teammateMode,
    ).toBeUndefined()
  })

  test('discrepancia de mayúsculas ("AUTO") → undefined', () => {
    // Chequeo de enum sensible a mayúsculas/minúsculas. Esto documenta
    // que — una mayúscula mal tecleada no coincide.
    expect(
      extractTeammateOptions({ teammateMode: 'AUTO' }).teammateMode,
    ).toBeUndefined()
  })

  test('modo no-cadena → undefined', () => {
    expect(
      extractTeammateOptions({ teammateMode: 42 }).teammateMode,
    ).toBeUndefined()
  })

  test('modo null → undefined', () => {
    expect(
      extractTeammateOptions({ teammateMode: null }).teammateMode,
    ).toBeUndefined()
  })
})

describe('extractTeammateOptions — campos extra se descartan en silencio', () => {
  test('los campos desconocidos no se filtran a la salida', () => {
    // La función sólo reenvía los 8 campos conocidos. Los campos
    // extra en la entrada se descartan en silencio — defensivo
    // contra nombres de argumento CLI mal tecleados o llamadores
    // obsoletos.
    const result = extractTeammateOptions({
      agentId: 'a',
      randomExtraField: 'leaked?',
      anotherNoise: 42,
    })
    expect(result).toEqual({
      agentId: 'a',
      agentName: undefined,
      teamName: undefined,
      agentColor: undefined,
      planModeRequired: undefined,
      parentSessionId: undefined,
      teammateMode: undefined,
      agentType: undefined,
    })
    expect((result as Record<string, unknown>).randomExtraField).toBeUndefined()
  })
})
