/**
 * El saneador de esquema de `gemini/convertTools.ts`, cubierto por conducta.
 *
 * PROCEDENCIA, declarada: esto NO es un contrato portado. La suite de la
 * fuente para ese modulo —16 casos— afirma del saneador una sola cosa: que
 * `parametersJsonSchema` esta definido. Ni una asercion mira su contenido, y
 * el saneador es el bulto del modulo: seis funciones privadas y ~200 de sus
 * 285 lineas.
 *
 * Se cubre aqui porque es donde vive el riesgo que la propia cabecera de la
 * fuente nombra —«manda esquemas incompatibles y la llamada falla»— y porque
 * un porte cuyo unico control dice «esta definido» no distingue haberlo
 * portado de haber devuelto un objeto cualquiera.
 *
 * Se llega al saneador por `anthropicToolsToGemini`, que es la unica puerta
 * publica: no se exporta nada extra para poder probarlo.
 *
 * CONTROLES DE ANULACION, medidos, y son el argumento de que esta suite hacia
 * falta:
 *
 * | Anulacion | contrato portado (16) | esta suite (38) |
 * |---|---|---|
 * | la lista blanca pasa a copiar el esquema original | **0** | **15** |
 * | se retira `propertyOrdering` | **0** | **1** |
 *
 * La primera fila es el cambio mas destructivo que este modulo admite —deja de
 * traducir al dialecto y manda el JSON Schema crudo, que es exactamente lo que
 * hace fallar la llamada— y el contrato portado sigue enteramente en verde.
 */
import { describe, expect, test } from 'bun:test'
import { anthropicToolsToGemini } from '../src/gemini/convertTools.js'

/** El esquema saneado de una herramienta con el `input_schema` dado. */
function saneado(inputSchema: unknown): Record<string, unknown> {
  const r = anthropicToolsToGemini([
    { name: 'X', description: 'd', input_schema: inputSchema } as never,
  ])
  return r[0]!.functionDeclarations[0]!.parametersJsonSchema as Record<string, unknown>
}

describe('saneador — el tipo', () => {
  test('un tipo del vocabulario de Gemini se conserva', () => {
    expect(saneado({ type: 'string' }).type).toBe('string')
  })

  test('un tipo FUERA del vocabulario se descarta', () => {
    // Gemini admite siete: string, number, integer, boolean, object, array,
    // null. Uno inventado no viaja.
    //
    // El esquema lleva un `title` A PROPOSITO: sin el, al descartarse el tipo
    // el esquema queda vacio y el RESPALDO de `sanitizeGeminiFunctionParameters`
    // lo sustituye por `{type:'object'}`. Medido — mi primera version de este
    // caso pedia que no hubiera `type` y recibia `object`, que era el respaldo
    // y no el tipo superviviente. Con el `title` el esquema sobrevive y se ve
    // que el tipo, en efecto, no esta.
    const s = saneado({ type: 'cualquier-cosa', title: 't' })
    expect(s.title).toBe('t')
    expect(s).not.toHaveProperty('type')
  })

  test('un arreglo de tipos se filtra y se deduplica', () => {
    expect(saneado({ type: ['string', 'inventado', 'null', 'string'] }).type).toEqual([
      'string',
      'null',
    ])
  })

  test('un arreglo de UN solo tipo valido se colapsa a la cadena', () => {
    expect(saneado({ type: ['string', 'inventado'] }).type).toBe('string')
  })

  test('nullable true anade null al tipo', () => {
    expect(saneado({ type: 'string', nullable: true }).type).toEqual(['string', 'null'])
  })

  test('nullable no duplica el null que ya estaba', () => {
    expect(saneado({ type: ['string', 'null'], nullable: true }).type).toEqual([
      'string',
      'null',
    ])
  })

  test('nullable sobre un esquema sin tipo da el tipo null a secas', () => {
    expect(saneado({ nullable: true, title: 't' }).type).toEqual(['null'])
  })
})

describe('saneador — el tipo INFERIDO cuando no viene declarado', () => {
  test('con properties se infiere object', () => {
    expect(saneado({ properties: { a: { type: 'string' } } }).type).toBe('object')
  })

  test('con items se infiere array', () => {
    expect(saneado({ items: { type: 'string' } }).type).toBe('array')
  })

  test('con prefixItems tambien se infiere array', () => {
    expect(saneado({ prefixItems: [{ type: 'string' }] }).type).toBe('array')
  })

  test('de un const se infiere el tipo de su valor', () => {
    expect(saneado({ const: 42 }).type).toBe('integer')
    expect(saneado({ const: 4.2 }).type).toBe('number')
    expect(saneado({ const: 'x' }).type).toBe('string')
    expect(saneado({ const: true }).type).toBe('boolean')
    expect(saneado({ const: null }).type).toBe('null')
  })

  test('de un enum homogeneo se infiere UN tipo', () => {
    expect(saneado({ enum: ['a', 'b'] }).type).toBe('string')
  })

  test('de un enum heterogeneo se infieren VARIOS, deduplicados', () => {
    expect(saneado({ enum: ['a', 1, 'b'] }).type).toEqual(['string', 'integer'])
  })

  test('el tipo DECLARADO gana sobre el inferido del const', () => {
    expect(saneado({ type: 'string', const: 42 }).type).toBe('string')
  })
})

describe('saneador — const y enum', () => {
  test('un const se convierte en enum de un elemento', () => {
    const s = saneado({ const: 'fijo' })
    expect(s.enum).toEqual(['fijo'])
    expect(s).not.toHaveProperty('const')
  })

  test('un enum se conserva tal cual', () => {
    expect(saneado({ enum: ['a', 'b'] }).enum).toEqual(['a', 'b'])
  })

  test('el const GANA sobre el enum cuando vienen los dos', () => {
    expect(saneado({ const: 'fijo', enum: ['a', 'b'] }).enum).toEqual(['fijo'])
  })

  test('un enum vacio no produce clave enum', () => {
    expect(saneado({ type: 'string', enum: [] })).not.toHaveProperty('enum')
  })
})

describe('saneador — la lista blanca de palabras clave', () => {
  test('las palabras clave admitidas pasan con su valor', () => {
    const s = saneado({
      type: 'string',
      title: 't',
      description: 'd',
      format: 'date',
      pattern: '^a',
      minLength: 1,
      maxLength: 9,
    })
    expect(s).toMatchObject({
      title: 't',
      description: 'd',
      format: 'date',
      pattern: '^a',
      minLength: 1,
      maxLength: 9,
    })
  })

  test('una palabra clave NO admitida se descarta', () => {
    const s = saneado({ type: 'string', $comment: 'nota', deprecated: true })
    expect(s).not.toHaveProperty('$comment')
    expect(s).not.toHaveProperty('deprecated')
  })

  test('una palabra clave admitida con el TIPO equivocado se descarta', () => {
    // El guard es por `typeof`, no por presencia.
    expect(saneado({ type: 'string', title: 42 })).not.toHaveProperty('title')
    expect(saneado({ type: 'number', minimum: 'bajo' })).not.toHaveProperty('minimum')
  })

  test('exclusiveMinimum y exclusiveMaximum se pliegan a minimum y maximum', () => {
    // Gemini no tiene las formas exclusivas; se mapean a las inclusivas.
    expect(saneado({ type: 'number', exclusiveMinimum: 1 }).minimum).toBe(1)
    expect(saneado({ type: 'number', exclusiveMaximum: 9 }).maximum).toBe(9)
  })

  test('la forma inclusiva GANA sobre la exclusiva si vienen ambas', () => {
    const s = saneado({ type: 'number', minimum: 0, exclusiveMinimum: 1 })
    expect(s.minimum).toBe(0)
  })
})

describe('saneador — properties, required y el orden', () => {
  test('las properties se sanean recursivamente', () => {
    const s = saneado({
      type: 'object',
      properties: { a: { type: 'string', $comment: 'fuera' } },
    })
    expect(s.properties).toEqual({ a: { type: 'string' } })
  })

  test('se emite propertyOrdering con las claves, en orden', () => {
    // Es una clave PROPIA de Gemini, no de JSON Schema: fija el orden en que
    // el modelo debe emitir los campos.
    const s = saneado({
      type: 'object',
      properties: { b: { type: 'string' }, a: { type: 'number' } },
    })
    expect(s.propertyOrdering).toEqual(['b', 'a'])
  })

  test('una property que quede vacia tras sanear se DESCARTA', () => {
    const s = saneado({
      type: 'object',
      properties: { buena: { type: 'string' }, vacia: { $comment: 'solo ruido' } },
    })
    expect(Object.keys(s.properties as object)).toEqual(['buena'])
  })

  test('si TODAS las properties quedan vacias, no hay clave properties', () => {
    const s = saneado({ type: 'object', properties: { a: { $comment: 'ruido' } } })
    expect(s).not.toHaveProperty('properties')
    expect(s).not.toHaveProperty('propertyOrdering')
  })

  test('required conserva solo las cadenas', () => {
    expect(saneado({ type: 'object', required: ['a', 7, 'b'] }).required).toEqual([
      'a',
      'b',
    ])
  })

  test('un required que queda vacio no produce clave', () => {
    expect(saneado({ type: 'object', required: [7] })).not.toHaveProperty('required')
  })
})

describe('saneador — items, prefixItems, anyOf y additionalProperties', () => {
  test('items se sanea recursivamente', () => {
    const s = saneado({ type: 'array', items: { type: 'string', $comment: 'fuera' } })
    expect(s.items).toEqual({ type: 'string' })
  })

  test('prefixItems descarta los elementos que quedan vacios', () => {
    const s = saneado({
      type: 'array',
      prefixItems: [{ type: 'string' }, { $comment: 'ruido' }],
    })
    expect(s.prefixItems).toEqual([{ type: 'string' }])
  })

  test('oneOf se traduce a anyOf: Gemini no tiene oneOf', () => {
    const s = saneado({ oneOf: [{ type: 'string' }, { type: 'number' }] })
    expect(s.anyOf).toEqual([{ type: 'string' }, { type: 'number' }])
    expect(s).not.toHaveProperty('oneOf')
  })

  test('anyOf GANA sobre oneOf cuando vienen los dos', () => {
    const s = saneado({
      anyOf: [{ type: 'string' }],
      oneOf: [{ type: 'number' }],
    })
    expect(s.anyOf).toEqual([{ type: 'string' }])
  })

  test('additionalProperties booleano se conserva', () => {
    expect(saneado({ type: 'object', additionalProperties: false }).additionalProperties)
      .toBe(false)
  })

  test('additionalProperties de esquema se sanea', () => {
    const s = saneado({
      type: 'object',
      additionalProperties: { type: 'string', $comment: 'fuera' },
    })
    expect(s.additionalProperties).toEqual({ type: 'string' })
  })
})

describe('saneador — el respaldo cuando no queda nada', () => {
  test('un esquema que se vacia entero cae al objeto vacio', () => {
    // Es lo que evita mandar `{}` como parametros, que Gemini rechaza.
    expect(saneado({ $comment: 'solo ruido' })).toEqual({
      type: 'object',
      properties: {},
    })
  })

  test('una cadena y un arreglo caen al respaldo', () => {
    expect(saneado('una cadena')).toEqual({ type: 'object', properties: {} })
    expect(saneado([1, 2])).toEqual({ type: 'object', properties: {} })
  })

  test('un input_schema ausente NO llega al respaldo, y sale sin properties', () => {
    // Medido, y es una asimetria que conviene tener escrita. `null` y
    // `undefined` los atrapa antes el `??` de `anthropicToolsToGemini`, que
    // sustituye por `{type:'object', properties:{}}`. Ese esquema NO esta
    // vacio, asi que el respaldo no se aplica — y su `properties` vacio lo
    // descarta el saneador. El resultado es `{type:'object'}` a secas, que no
    // es lo mismo que el respaldo aunque se le parezca.
    expect(saneado(null)).toEqual({ type: 'object' })
    expect(saneado(undefined)).toEqual({ type: 'object' })
  })
})
