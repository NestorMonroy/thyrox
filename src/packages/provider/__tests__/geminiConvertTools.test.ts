/**
 * Porte del contrato de `ccnmt: packages/provider/src/__tests__/geminiConvertTools.test.ts`
 * (16 casos en 2 describes).
 *
 * La razon que la fuente escribe en su cabecera: una traduccion mal hecha o
 * DESCARTA herramientas —Gemini no ve ninguna y no puede usarlas— o manda
 * esquemas incompatibles, y entonces la llamada falla.
 *
 * LO QUE ESTE CONTRATO NO CUBRE, y por eso hay una suite hermana. El modulo
 * son ~285 lineas y su bulto es el saneador de esquema, con seis funciones
 * privadas. De el, estos 16 casos solo afirman que
 * `parametersJsonSchema` esta DEFINIDO. Ni una asercion mira su contenido. El
 * saneador se cubre en `geminiSchemaSanitizer.test.ts`, declarado como
 * cobertura propia y no como contrato portado.
 */
import { describe, expect, test } from 'bun:test'
import {
  anthropicToolChoiceToGemini,
  anthropicToolsToGemini,
} from '../src/gemini/convertTools.js'

describe('anthropicToolsToGemini — traduccion basica', () => {
  test('una herramienta simple va envuelta en functionDeclarations', () => {
    const result = anthropicToolsToGemini([
      {
        name: 'Bash',
        description: 'Run a shell command',
        input_schema: { type: 'object', properties: { command: { type: 'string' } } },
      } as never,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('functionDeclarations')
    const funcs = result[0]!.functionDeclarations
    expect(funcs).toHaveLength(1)
    expect(funcs[0]?.name).toBe('Bash')
    expect(funcs[0]?.description).toBe('Run a shell command')
    expect(funcs[0]?.parametersJsonSchema).toBeDefined()
  })

  test('varias herramientas van en UN solo grupo', () => {
    const result = anthropicToolsToGemini([
      { name: 'A', description: 'a', input_schema: { type: 'object' } } as never,
      { name: 'B', description: 'b', input_schema: { type: 'object' } } as never,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]!.functionDeclarations.map(f => f.name)).toEqual(['A', 'B'])
  })

  test('una lista vacia da arreglo vacio, NO un grupo con cero declaraciones', () => {
    // Un `[{functionDeclarations: []}]` haria que Gemini responda 400.
    expect(anthropicToolsToGemini([])).toEqual([])
  })

  test('una lista de solo herramientas de servidor da arreglo vacio', () => {
    const result = anthropicToolsToGemini([
      { type: 'server', name: 'web_search' } as never,
    ])
    expect(result).toEqual([])
  })

  test('sin description da cadena vacia', () => {
    const result = anthropicToolsToGemini([
      { name: 'X', input_schema: { type: 'object' } } as never,
    ])
    expect(result[0]?.functionDeclarations[0]?.description).toBe('')
  })

  test('sin input_schema hay esquema por defecto', () => {
    const result = anthropicToolsToGemini([{ name: 'X', description: 'd' } as never])
    expect(result[0]?.functionDeclarations[0]?.parametersJsonSchema).toBeDefined()
  })

  test('los campos propios de Anthropic no se propagan', () => {
    const result = anthropicToolsToGemini([
      {
        name: 'X',
        description: 'd',
        input_schema: { type: 'object' },
        cache_control: { type: 'ephemeral' },
      } as never,
    ])
    expect(result[0]?.functionDeclarations[0]).not.toHaveProperty('cache_control')
  })

  test('mezcladas: la de servidor se filtra y la normal se queda', () => {
    const result = anthropicToolsToGemini([
      { type: 'server', name: 'web_search' } as never,
      { name: 'Bash', description: 'd', input_schema: { type: 'object' } } as never,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.functionDeclarations).toHaveLength(1)
    expect(result[0]?.functionDeclarations[0]?.name).toBe('Bash')
  })
})

describe('anthropicToolChoiceToGemini', () => {
  test('{type:"auto"} da {mode:"AUTO"}', () => {
    expect(anthropicToolChoiceToGemini({ type: 'auto' })).toEqual({ mode: 'AUTO' })
  })

  test('{type:"any"} da {mode:"ANY"}', () => {
    expect(anthropicToolChoiceToGemini({ type: 'any' })).toEqual({ mode: 'ANY' })
  })

  test('{type:"tool", name} da ANY con su allowedFunctionNames', () => {
    expect(anthropicToolChoiceToGemini({ type: 'tool', name: 'Bash' })).toEqual({
      mode: 'ANY',
      allowedFunctionNames: ['Bash'],
    })
  })

  test('{type:"tool"} sin name deja allowedFunctionNames en undefined', () => {
    // El guard es `typeof tc.name === 'string'`; sin nombre decide el llamador
    // si manda o no la clave.
    expect(anthropicToolChoiceToGemini({ type: 'tool' })).toEqual({
      mode: 'ANY',
      allowedFunctionNames: undefined,
    })
  })

  test('undefined da undefined', () => {
    expect(anthropicToolChoiceToGemini(undefined)).toBeUndefined()
  })

  test('null da undefined', () => {
    expect(anthropicToolChoiceToGemini(null)).toBeUndefined()
  })

  test('lo que no es objeto da undefined', () => {
    expect(anthropicToolChoiceToGemini('auto')).toBeUndefined()
    expect(anthropicToolChoiceToGemini(42)).toBeUndefined()
  })

  test('un type desconocido da undefined', () => {
    expect(anthropicToolChoiceToGemini({ type: 'unknown' })).toBeUndefined()
  })
})
