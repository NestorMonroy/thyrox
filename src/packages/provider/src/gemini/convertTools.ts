/**
 * Traduccion del esquema de herramienta Anthropic al de Gemini — porte de
 * `ccnmt: packages/provider/src/gemini/convertTools.ts` (285 lineas).
 *
 * El puerto es COMPLETO: sus dos exportaciones —`anthropicToolsToGemini` y
 * `anthropicToolChoiceToGemini`— y las siete funciones privadas del saneador.
 * Ninguna queda fuera.
 *
 * POR QUE ES TAN LARGO comparado con su hermano de OpenAI: aquel solo tiene
 * que convertir `const` en `enum`; este tiene que traducir JSON Schema entero
 * al DIALECTO de Gemini, que admite un vocabulario acotado. Lo que no esta en
 * ese vocabulario se descarta en vez de viajar, porque viajar hace que la
 * llamada falle.
 */
import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { GeminiFunctionCallingConfig, GeminiTool } from './types.js'

/** Los siete tipos que el dialecto de Gemini admite. */
const GEMINI_JSON_SCHEMA_TYPES = new Set([
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
  'null',
])

/**
 * Deja el `type` en la forma que Gemini admite: una cadena del vocabulario, o
 * un arreglo de esas cadenas deduplicado, o nada. Un arreglo que quede con un
 * solo tipo se colapsa a la cadena.
 */
function normalizeGeminiJsonSchemaType(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') {
    return GEMINI_JSON_SCHEMA_TYPES.has(value) ? value : undefined
  }

  if (Array.isArray(value)) {
    const normalized = value.filter(
      (item): item is string =>
        typeof item === 'string' && GEMINI_JSON_SCHEMA_TYPES.has(item),
    )
    const unique = Array.from(new Set(normalized))
    if (unique.length === 0) return undefined
    return unique.length === 1 ? unique[0] : unique
  }

  return undefined
}

/** El tipo de Gemini que corresponde a un valor concreto. */
function inferGeminiJsonSchemaTypeFromValue(value: unknown): string | undefined {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number'
  }
  if (typeof value === 'object') return 'object'
  return undefined
}

/** El tipo —o los tipos— que se deducen de los valores de un `enum`. */
function inferGeminiJsonSchemaTypeFromEnum(
  values: unknown[],
): string | string[] | undefined {
  const inferred = values
    .map(inferGeminiJsonSchemaTypeFromValue)
    .filter((value): value is string => value !== undefined)
  const unique = Array.from(new Set(inferred))
  if (unique.length === 0) return undefined
  return unique.length === 1 ? unique[0] : unique
}

/** Anade `null` al tipo, sin duplicarlo si ya estaba. */
function addNullToGeminiJsonSchemaType(
  value: string | string[] | undefined,
): string | string[] | undefined {
  if (value === undefined) return ['null']
  if (Array.isArray(value)) {
    return value.includes('null') ? value : [...value, 'null']
  }
  return value === 'null' ? value : [value, 'null']
}

/**
 * Sanea el mapa de `properties`, descartando las que queden vacias. Si no
 * sobrevive ninguna, no hay mapa: devolver uno vacio haria que el consumidor
 * emitiera una clave sin contenido.
 */
function sanitizeGeminiJsonSchemaProperties(
  value: unknown,
): Record<string, Record<string, unknown>> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const sanitizedEntries = Object.entries(value as Record<string, unknown>)
    .map(([key, schema]) => [key, sanitizeGeminiJsonSchema(schema)] as const)
    .filter(([, schema]) => Object.keys(schema).length > 0)

  if (sanitizedEntries.length === 0) {
    return undefined
  }

  return Object.fromEntries(sanitizedEntries)
}

/** Sanea un arreglo de esquemas, descartando los que queden vacios. */
function sanitizeGeminiJsonSchemaArray(
  value: unknown,
): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined

  const sanitized = value
    .map(item => sanitizeGeminiJsonSchema(item))
    .filter(item => Object.keys(item).length > 0)

  return sanitized.length > 0 ? sanitized : undefined
}

/**
 * Traduce un JSON Schema al dialecto de Gemini.
 *
 * Es una LISTA BLANCA, no una lista negra: se construye un objeto nuevo con
 * las claves admitidas en vez de borrar las prohibidas del original. Asi, una
 * palabra clave que Gemini no conozca no viaja aunque nadie la haya previsto.
 *
 * Cada clave se copia solo si su valor tiene el tipo correcto — el guard es
 * por `typeof`, no por presencia.
 */
function sanitizeGeminiJsonSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return {}
  }

  const source = schema as Record<string, unknown>
  const result: Record<string, unknown> = {}

  let type = normalizeGeminiJsonSchemaType(source.type)

  // `const` gana sobre `enum`, y de cualquiera de los dos se puede deducir el
  // tipo si no venia declarado.
  if (source.const !== undefined) {
    result.enum = [source.const]
    type = type ?? inferGeminiJsonSchemaTypeFromValue(source.const)
  } else if (Array.isArray(source.enum) && source.enum.length > 0) {
    result.enum = source.enum
    type = type ?? inferGeminiJsonSchemaTypeFromEnum(source.enum)
  }

  // Sin tipo declarado ni deducido, la forma del esquema lo delata.
  if (!type) {
    if (source.properties && typeof source.properties === 'object') {
      type = 'object'
    } else if (source.items !== undefined || source.prefixItems !== undefined) {
      type = 'array'
    }
  }

  if (source.nullable === true) {
    type = addNullToGeminiJsonSchemaType(type)
  }

  if (type) {
    result.type = type
  }

  if (typeof source.title === 'string') {
    result.title = source.title
  }
  if (typeof source.description === 'string') {
    result.description = source.description
  }
  if (typeof source.format === 'string') {
    result.format = source.format
  }
  if (typeof source.pattern === 'string') {
    result.pattern = source.pattern
  }
  // Gemini no tiene las formas exclusivas: se pliegan a las inclusivas, y la
  // inclusiva gana si vienen las dos.
  if (typeof source.minimum === 'number') {
    result.minimum = source.minimum
  } else if (typeof source.exclusiveMinimum === 'number') {
    result.minimum = source.exclusiveMinimum
  }
  if (typeof source.maximum === 'number') {
    result.maximum = source.maximum
  } else if (typeof source.exclusiveMaximum === 'number') {
    result.maximum = source.exclusiveMaximum
  }
  if (typeof source.minItems === 'number') {
    result.minItems = source.minItems
  }
  if (typeof source.maxItems === 'number') {
    result.maxItems = source.maxItems
  }
  if (typeof source.minLength === 'number') {
    result.minLength = source.minLength
  }
  if (typeof source.maxLength === 'number') {
    result.maxLength = source.maxLength
  }
  if (typeof source.minProperties === 'number') {
    result.minProperties = source.minProperties
  }
  if (typeof source.maxProperties === 'number') {
    result.maxProperties = source.maxProperties
  }

  const properties = sanitizeGeminiJsonSchemaProperties(source.properties)
  if (properties) {
    result.properties = properties
    // `propertyOrdering` es clave PROPIA de Gemini, no de JSON Schema: fija el
    // orden en que el modelo debe emitir los campos.
    result.propertyOrdering = Object.keys(properties)
  }

  if (Array.isArray(source.required)) {
    const required = source.required.filter(
      (item): item is string => typeof item === 'string',
    )
    if (required.length > 0) {
      result.required = required
    }
  }

  if (typeof source.additionalProperties === 'boolean') {
    result.additionalProperties = source.additionalProperties
  } else {
    const additionalProperties = sanitizeGeminiJsonSchema(source.additionalProperties)
    if (Object.keys(additionalProperties).length > 0) {
      result.additionalProperties = additionalProperties
    }
  }

  const items = sanitizeGeminiJsonSchema(source.items)
  if (Object.keys(items).length > 0) {
    result.items = items
  }

  const prefixItems = sanitizeGeminiJsonSchemaArray(source.prefixItems)
  if (prefixItems) {
    result.prefixItems = prefixItems
  }

  // Gemini no tiene `oneOf`: se traduce a `anyOf`, y el `anyOf` propio gana.
  const anyOf = sanitizeGeminiJsonSchemaArray(source.anyOf ?? source.oneOf)
  if (anyOf) {
    result.anyOf = anyOf
  }

  return result
}

/**
 * El esquema de parametros de una funcion, con su respaldo: un esquema que se
 * vacie entero cae al objeto vacio en vez de viajar como `{}`.
 */
function sanitizeGeminiFunctionParameters(schema: unknown): Record<string, unknown> {
  const sanitized = sanitizeGeminiJsonSchema(schema)
  if (Object.keys(sanitized).length > 0) {
    return sanitized
  }

  return { type: 'object', properties: {} }
}

/**
 * Traduce las herramientas de Anthropic al grupo de declaraciones de funcion
 * de Gemini.
 *
 * Las de servidor se filtran, y si no queda ninguna se devuelve arreglo vacio
 * y NO un grupo con cero declaraciones: eso ultimo hace que Gemini responda
 * 400.
 */
export function anthropicToolsToGemini(tools: BetaToolUnion[]): GeminiTool[] {
  const functionDeclarations = tools
    .filter(tool => {
      const type = (tool as unknown as { type?: string }).type
      return type !== 'server'
    })
    .map(tool => {
      const anyTool = tool as unknown as Record<string, unknown>
      const name = (anyTool.name as string) || ''
      const description = (anyTool.description as string) || ''
      const inputSchema = (anyTool.input_schema as Record<string, unknown> | undefined) ?? {
        type: 'object',
        properties: {},
      }

      return {
        name,
        description,
        parametersJsonSchema: sanitizeGeminiFunctionParameters(inputSchema),
      }
    })

  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : []
}

/**
 * Traduce el `tool_choice` de Anthropic a la configuracion de llamada a
 * funcion de Gemini: `auto` da modo AUTO; `any` y `tool` dan modo ANY, y el
 * segundo ademas acota el nombre permitido cuando lo trae.
 */
export function anthropicToolChoiceToGemini(
  toolChoice: unknown,
): GeminiFunctionCallingConfig | undefined {
  if (!toolChoice || typeof toolChoice !== 'object') return undefined

  const tc = toolChoice as Record<string, unknown>
  const type = tc.type as string

  switch (type) {
    case 'auto':
      return { mode: 'AUTO' }
    case 'any':
      return { mode: 'ANY' }
    case 'tool':
      return {
        mode: 'ANY',
        allowedFunctionNames: typeof tc.name === 'string' ? [tc.name] : undefined,
      }
    default:
      return undefined
  }
}
