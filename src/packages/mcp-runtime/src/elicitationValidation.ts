/**
 * Porte COMPLETO de
 * `ccnmt: packages/mcp-runtime/src/elicitationValidation.ts` — sus 14
 * exportaciones (tipos y funciones), ninguna omitida.
 *
 * Repuntados (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/local-observability/slowOperations.js` (`jsonStringify`) y
 * `@thyrox/output/utils/stringUtils.js` (`plural`).
 *
 * Validación de las entradas de elicitación MCP (los prompts que un servidor
 * pide al usuario) contra su `PrimitiveSchemaDefinition`, con mensajes en
 * inglés (son los que el propio zod produce y el usuario ve en el prompt —
 * no se traducen, son la salida de cara al operador, no prosa de este árbol).
 */
import type {
  EnumSchema,
  MultiSelectEnumSchema,
  PrimitiveSchemaDefinition,
  StringSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod/v4'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { plural } from '@thyrox/output/utils/stringUtils.js'
import {
  looksLikeISO8601,
  parseNaturalLanguageDateTime,
} from './dateTimeParser.js'

export type ValidationResult = {
  value?: string | number | boolean
  isValid: boolean
  error?: string
}

const STRING_FORMATS = {
  email: {
    description: 'email address',
    example: 'user@example.com',
  },
  uri: {
    description: 'URI',
    example: 'https://example.com',
  },
  date: {
    description: 'date',
    example: '2024-03-15',
  },
  'date-time': {
    description: 'date-time',
    example: '2024-03-15T14:30:00Z',
  },
}

/**
 * Verifica si el esquema es un enum de selección única (formato legado
 * `enum` o el nuevo formato `oneOf`).
 */
export const isEnumSchema = (
  schema: PrimitiveSchemaDefinition,
): schema is EnumSchema => {
  return schema.type === 'string' && ('enum' in schema || 'oneOf' in schema)
}

/**
 * Verifica si el esquema es un enum de selección múltiple (`type: "array"`
 * con `items.enum` o `items.anyOf`).
 */
export function isMultiSelectEnumSchema(
  schema: PrimitiveSchemaDefinition,
): schema is MultiSelectEnumSchema {
  return (
    schema.type === 'array' &&
    'items' in schema &&
    typeof schema.items === 'object' &&
    schema.items !== null &&
    ('enum' in schema.items || 'anyOf' in schema.items)
  )
}

/**
 * Obtiene los valores de un esquema de enum de selección múltiple.
 */
export function getMultiSelectValues(schema: MultiSelectEnumSchema): string[] {
  if ('anyOf' in schema.items) {
    return schema.items.anyOf.map(item => item.const)
  }
  if ('enum' in schema.items) {
    return schema.items.enum
  }
  return []
}

/**
 * Obtiene las etiquetas de exhibición de un esquema de enum de selección
 * múltiple.
 */
export function getMultiSelectLabels(schema: MultiSelectEnumSchema): string[] {
  if ('anyOf' in schema.items) {
    return schema.items.anyOf.map(item => item.title)
  }
  if ('enum' in schema.items) {
    return schema.items.enum
  }
  return []
}

/**
 * Obtiene la etiqueta de un valor concreto en un enum de selección múltiple.
 */
export function getMultiSelectLabel(
  schema: MultiSelectEnumSchema,
  value: string,
): string {
  const index = getMultiSelectValues(schema).indexOf(value)
  return index >= 0 ? (getMultiSelectLabels(schema)[index] ?? value) : value
}

/**
 * Obtiene los valores de enum de un EnumSchema (cubre los formatos legado
 * `enum` y el nuevo `oneOf`).
 */
export function getEnumValues(schema: EnumSchema): string[] {
  if ('oneOf' in schema) {
    return schema.oneOf.map(item => item.const)
  }
  if ('enum' in schema) {
    return schema.enum
  }
  return []
}

/**
 * Obtiene las etiquetas de exhibición de enum de un EnumSchema.
 */
export function getEnumLabels(schema: EnumSchema): string[] {
  if ('oneOf' in schema) {
    return schema.oneOf.map(item => item.title)
  }
  if ('enum' in schema) {
    return ('enumNames' in schema ? schema.enumNames : undefined) ?? schema.enum
  }
  return []
}

/**
 * Obtiene la etiqueta de un valor concreto de enum.
 */
export function getEnumLabel(schema: EnumSchema, value: string): string {
  const index = getEnumValues(schema).indexOf(value)
  return index >= 0 ? (getEnumLabels(schema)[index] ?? value) : value
}

function getZodSchema(schema: PrimitiveSchemaDefinition): z.ZodTypeAny {
  if (isEnumSchema(schema)) {
    const [first, ...rest] = getEnumValues(schema)
    if (!first) {
      return z.never()
    }
    return z.enum([first, ...rest])
  }
  if (schema.type === 'string') {
    let stringSchema = z.string()
    if (schema.minLength !== undefined) {
      stringSchema = stringSchema.min(schema.minLength, {
        message: `Must be at least ${schema.minLength} ${plural(schema.minLength, 'character')}`,
      })
    }
    if (schema.maxLength !== undefined) {
      stringSchema = stringSchema.max(schema.maxLength, {
        message: `Must be at most ${schema.maxLength} ${plural(schema.maxLength, 'character')}`,
      })
    }
    switch (schema.format) {
      case 'email':
        stringSchema = stringSchema.email({
          message: 'Must be a valid email address, e.g. user@example.com',
        })
        break
      case 'uri':
        stringSchema = stringSchema.url({
          message: 'Must be a valid URI, e.g. https://example.com',
        })
        break
      case 'date':
        stringSchema = stringSchema.date(
          'Must be a valid date, e.g. 2024-03-15, today, next Monday',
        )
        break
      case 'date-time':
        stringSchema = stringSchema.datetime({
          offset: true,
          message:
            'Must be a valid date-time, e.g. 2024-03-15T14:30:00Z, tomorrow at 3pm',
        })
        break
      default:
        // Sin validación de formato específica.
        break
    }
    return stringSchema
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    const typeLabel = schema.type === 'integer' ? 'an integer' : 'a number'
    const isInteger = schema.type === 'integer'
    const formatNum = (n: number) =>
      Number.isInteger(n) && !isInteger ? `${n}.0` : String(n)

    // Un solo mensaje de error descriptivo para las violaciones de rango.
    const rangeMsg =
      schema.minimum !== undefined && schema.maximum !== undefined
        ? `Must be ${typeLabel} between ${formatNum(schema.minimum)} and ${formatNum(schema.maximum)}`
        : schema.minimum !== undefined
          ? `Must be ${typeLabel} >= ${formatNum(schema.minimum)}`
          : schema.maximum !== undefined
            ? `Must be ${typeLabel} <= ${formatNum(schema.maximum)}`
            : `Must be ${typeLabel}`

    let numberSchema = z.coerce.number({
      error: rangeMsg,
    })
    if (schema.type === 'integer') {
      numberSchema = numberSchema.int({ message: rangeMsg })
    }
    if (schema.minimum !== undefined) {
      numberSchema = numberSchema.min(schema.minimum, {
        message: rangeMsg,
      })
    }
    if (schema.maximum !== undefined) {
      numberSchema = numberSchema.max(schema.maximum, {
        message: rangeMsg,
      })
    }
    return numberSchema
  }
  if (schema.type === 'boolean') {
    return z.coerce.boolean()
  }

  throw new Error(`Unsupported schema: ${jsonStringify(schema)}`)
}

export function validateElicitationInput(
  stringValue: string,
  schema: PrimitiveSchemaDefinition,
): ValidationResult {
  const zodSchema = getZodSchema(schema)
  const parseResult = zodSchema.safeParse(stringValue)

  if (parseResult.success) {
    // zodSchema siempre produce tipos primitivos para la elicitación.
    return {
      value: parseResult.data as string | number | boolean,
      isValid: true,
    }
  }
  return {
    isValid: false,
    error: parseResult.error.issues.map(e => e.message).join('; '),
  }
}

const hasStringFormat = (
  schema: PrimitiveSchemaDefinition,
): schema is StringSchema & { format: string } => {
  return (
    schema.type === 'string' &&
    'format' in schema &&
    typeof schema.format === 'string'
  )
}

/**
 * Devuelve un placeholder/pista útil para un formato dado.
 */
export function getFormatHint(
  schema: PrimitiveSchemaDefinition,
): string | undefined {
  if (schema.type === 'string') {
    if (!hasStringFormat(schema)) {
      return undefined
    }

    const { description, example } = STRING_FORMATS[schema.format] || {}
    return `${description}, e.g. ${example}`
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    const isInteger = schema.type === 'integer'
    const formatNum = (n: number) =>
      Number.isInteger(n) && !isInteger ? `${n}.0` : String(n)

    if (schema.minimum !== undefined && schema.maximum !== undefined) {
      return `(${schema.type} between ${formatNum(schema.minimum!)} and ${formatNum(schema.maximum!)})`
    } else if (schema.minimum !== undefined) {
      return `(${schema.type} >= ${formatNum(schema.minimum!)})`
    } else if (schema.maximum !== undefined) {
      return `(${schema.type} <= ${formatNum(schema.maximum!)})`
    } else {
      const example = schema.type === 'integer' ? '42' : '3.14'
      return `(${schema.type}, e.g. ${example})`
    }
  }

  return undefined
}

/**
 * Verifica si un esquema es de formato date o date-time, que admite el
 * parseo en lenguaje natural.
 */
export function isDateTimeSchema(
  schema: PrimitiveSchemaDefinition,
): schema is StringSchema & { format: 'date' | 'date-time' } {
  return (
    schema.type === 'string' &&
    'format' in schema &&
    (schema.format === 'date' || schema.format === 'date-time')
  )
}

/**
 * Validación asíncrona que intenta el parseo de fecha/hora en lenguaje
 * natural vía Haiku cuando la entrada no luce como ISO 8601.
 */
export async function validateElicitationInputAsync(
  stringValue: string,
  schema: PrimitiveSchemaDefinition,
  signal: AbortSignal,
): Promise<ValidationResult> {
  const syncResult = validateElicitationInput(stringValue, schema)
  if (syncResult.isValid) {
    return syncResult
  }

  if (isDateTimeSchema(schema) && !looksLikeISO8601(stringValue)) {
    const parseResult = await parseNaturalLanguageDateTime(
      stringValue,
      schema.format,
      signal,
    )

    if (parseResult.success) {
      const validatedParsed = validateElicitationInput(
        parseResult.value,
        schema,
      )
      if (validatedParsed.isValid) {
        return validatedParsed
      }
    }
  }

  return syncResult
}
