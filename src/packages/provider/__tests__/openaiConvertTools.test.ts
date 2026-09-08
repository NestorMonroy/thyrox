/**
 * Porte del contrato de `ccnmt: packages/provider/src/__tests__/openaiConvertTools.test.ts`
 * (20 casos en 3 describes): traduccion del esquema de herramienta Anthropic al
 * de llamada a funcion de OpenAI.
 *
 * Por que importa, con la razon que la fuente escribe en su cabecera: una
 * traduccion mal hecha o falla en el proveedor con error de validacion de
 * esquema, o deja escapar campos propios de Anthropic —`cache_control`,
 * `defer_loading`— hacia una peticion OpenAI que responde 400.
 */
import { describe, expect, test } from 'bun:test'
import {
  anthropicToolChoiceToOpenAI,
  anthropicToolsToOpenAI,
} from '../src/openai/convertTools.js'

describe('anthropicToolsToOpenAI — traduccion basica', () => {
  test('herramienta simple: name + description + input_schema da la forma function', () => {
    const result = anthropicToolsToOpenAI([
      {
        name: 'Bash',
        description: 'Run a shell command',
        input_schema: {
          type: 'object',
          properties: { command: { type: 'string' } },
          required: ['command'],
        },
      } as never,
    ])
    expect(result).toEqual([
      {
        type: 'function',
        function: {
          name: 'Bash',
          description: 'Run a shell command',
          parameters: {
            type: 'object',
            properties: { command: { type: 'string' } },
            required: ['command'],
          },
        },
      },
    ])
  })

  test('sin description da cadena vacia', () => {
    const result = anthropicToolsToOpenAI([
      { name: 'X', input_schema: { type: 'object' } } as never,
    ])
    expect(result[0]?.function.description).toBe('')
  })

  test('sin input_schema da el esquema de objeto por defecto', () => {
    const result = anthropicToolsToOpenAI([
      { name: 'X', description: 'd' } as never,
    ])
    expect(result[0]?.function.parameters).toEqual({
      type: 'object',
      properties: {},
    })
  })

  test('sin name da cadena vacia (defensivo)', () => {
    const result = anthropicToolsToOpenAI([
      { description: 'd', input_schema: { type: 'object' } } as never,
    ])
    expect(result[0]?.function.name).toBe('')
  })

  test('los campos propios de Anthropic (cache_control) se descartan', () => {
    const result = anthropicToolsToOpenAI([
      {
        name: 'X',
        description: 'd',
        input_schema: { type: 'object' },
        cache_control: { type: 'ephemeral' },
      } as never,
    ])
    expect(result[0]).not.toHaveProperty('cache_control')
    expect(result[0]?.function).not.toHaveProperty('cache_control')
  })

  test('las herramientas de tipo server se filtran (no son llamadas a funcion)', () => {
    const result = anthropicToolsToOpenAI([
      { type: 'server', name: 'web_search' } as never,
      { name: 'Bash', description: 'b', input_schema: { type: 'object' } } as never,
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.function.name).toBe('Bash')
  })
})

describe('anthropicToolsToOpenAI — saneado del JSON Schema', () => {
  test('const de primer nivel pasa a enum [valor]', () => {
    const result = anthropicToolsToOpenAI([
      { name: 'X', description: 'd', input_schema: { const: 'fixed-value' } } as never,
    ])
    expect(result[0]?.function.parameters).toEqual({ enum: ['fixed-value'] })
    expect(result[0]?.function.parameters).not.toHaveProperty('const')
  })

  test('const anidado dentro de properties se convierte', () => {
    const result = anthropicToolsToOpenAI([
      {
        name: 'X',
        description: 'd',
        input_schema: { type: 'object', properties: { mode: { const: 'auto' } } },
      } as never,
    ])
    const params = result[0]?.function.parameters as {
      properties: Record<string, unknown>
    }
    expect(params.properties.mode).toEqual({ enum: ['auto'] })
  })

  test('const anidado dentro de items se convierte', () => {
    const result = anthropicToolsToOpenAI([
      {
        name: 'X',
        description: 'd',
        input_schema: { type: 'array', items: { const: 42 } },
      } as never,
    ])
    const params = result[0]?.function.parameters as { items: unknown }
    expect(params.items).toEqual({ enum: [42] })
  })

  test('const anidado dentro del arreglo oneOf se convierte', () => {
    const result = anthropicToolsToOpenAI([
      {
        name: 'X',
        description: 'd',
        input_schema: { oneOf: [{ const: 'a' }, { const: 'b' }, { type: 'number' }] },
      } as never,
    ])
    const params = result[0]?.function.parameters as { oneOf: unknown[] }
    expect(params.oneOf).toEqual([{ enum: ['a'] }, { enum: ['b'] }, { type: 'number' }])
  })

  test('un esquema sin const no cambia de estructura', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name'],
    }
    const result = anthropicToolsToOpenAI([
      { name: 'X', description: 'd', input_schema: schema } as never,
    ])
    expect(result[0]?.function.parameters).toEqual(schema)
  })

  test('const profundo (properties, items, const) se convierte', () => {
    const result = anthropicToolsToOpenAI([
      {
        name: 'X',
        description: 'd',
        input_schema: {
          type: 'object',
          properties: { tags: { type: 'array', items: { const: 'fixed-tag' } } },
        },
      } as never,
    ])
    const params = result[0]?.function.parameters as {
      properties: { tags: { items: unknown } }
    }
    expect(params.properties.tags.items).toEqual({ enum: ['fixed-tag'] })
  })
})

describe('anthropicToolChoiceToOpenAI', () => {
  test('{type:"auto"} da "auto"', () => {
    expect(anthropicToolChoiceToOpenAI({ type: 'auto' })).toBe('auto')
  })

  test('{type:"any"} da "required"', () => {
    expect(anthropicToolChoiceToOpenAI({ type: 'any' })).toBe('required')
  })

  test('{type:"tool", name} da {type:"function", function:{name}}', () => {
    expect(anthropicToolChoiceToOpenAI({ type: 'tool', name: 'Bash' })).toEqual({
      type: 'function',
      function: { name: 'Bash' },
    })
  })

  test('undefined da undefined (se usa el default del proveedor)', () => {
    expect(anthropicToolChoiceToOpenAI(undefined)).toBeUndefined()
  })

  test('null da undefined', () => {
    expect(anthropicToolChoiceToOpenAI(null)).toBeUndefined()
  })

  test('una cadena (no objeto) da undefined', () => {
    expect(anthropicToolChoiceToOpenAI('auto')).toBeUndefined()
  })

  test('un type desconocido da undefined (defensa en profundidad)', () => {
    expect(anthropicToolChoiceToOpenAI({ type: 'unknown_thing' })).toBeUndefined()
  })

  test('un objeto sin campo type da undefined', () => {
    expect(anthropicToolChoiceToOpenAI({ name: 'Bash' })).toBeUndefined()
  })
})
