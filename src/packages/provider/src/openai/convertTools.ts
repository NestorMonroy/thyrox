/**
 * Traduccion del esquema de herramienta Anthropic al de llamada a funcion de
 * OpenAI — porte de `ccnmt: packages/provider/src/openai/convertTools.ts`
 * (134 lineas).
 *
 * El puerto es COMPLETO: la fuente declara el tipo `OpenAIToolSchema`,
 * `anthropicToolsToOpenAI`, `sanitizeJsonSchema` (privado) y
 * `anthropicToolChoiceToOpenAI`, y los cuatro estan aqui. Ninguno queda fuera.
 *
 * DIVERGENCIA DECLARADA — los tipos del lado OpenAI. La fuente los toma del
 * paquete `openai` (`ChatCompletionTool`, `ChatCompletionNamedToolChoice`), que
 * NO resuelve en este arbol: `Bun.resolveSync('openai', ...)` falla desde este
 * paquete, mientras `@anthropic-ai/sdk` si resuelve. Se declara aqui la forma
 * ESTRUCTURAL que el protocolo exige, con el mismo criterio que
 * `agent/messageShapes.ts` ya usa para los bloques del SDK de Anthropic:
 * se declara la forma, no se arrastra el paquete entero por un tipo. Cuando
 * `openai` entre al arbol, estos dos alias se sustituyen por los suyos y el
 * cuerpo no cambia.
 */
import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

export type ChatCompletionNamedToolChoice = {
  type: 'function'
  function: { name: string }
}

export type OpenAIToolSchema = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/**
 * Convierte esquemas de herramienta de Anthropic al formato de llamada a
 * funcion de OpenAI.
 *
 * Anthropic: `{ name, description, input_schema }`
 * OpenAI:    `{ type: "function", function: { name, description, parameters } }`
 *
 * Los campos propios de Anthropic —`cache_control`, `defer_loading`— se
 * descartan: solo pasan `name`, `description` e `input_schema`. Dejarlos
 * escapar hace que la peticion responda 400 en el proveedor.
 *
 * Las herramientas de servidor (`type: 'server'`, como la busqueda web) NO se
 * traducen: no son llamadas a funcion y se filtran antes del mapeo.
 */
export function anthropicToolsToOpenAI(tools: BetaToolUnion[]): OpenAIToolSchema[] {
  return tools
    .filter(tool => {
      const type = (tool as unknown as { type?: string }).type
      return type !== 'server'
    })
    .map(tool => {
      // El SDK de Anthropic tiene varias formas de herramienta; se lee por
      // indice y con default para no depender del discriminante.
      const anyTool = tool as unknown as Record<string, unknown>
      const name = (anyTool.name as string) || ''
      const description = (anyTool.description as string) || ''
      const inputSchema = anyTool.input_schema as Record<string, unknown> | undefined

      return {
        type: 'function' as const,
        function: {
          name,
          description,
          parameters: sanitizeJsonSchema(
            inputSchema || { type: 'object', properties: {} },
          ),
        },
      } satisfies OpenAIToolSchema
    })
}

/**
 * Sanea un JSON Schema, recursivamente, para proveedores compatibles con
 * OpenAI.
 *
 * Muchos endpoints compatibles —Ollama, DeepSeek, vLLM— no admiten la palabra
 * clave `const`. Se convierte a `enum` con un arreglo de un solo elemento, que
 * es semanticamente equivalente.
 *
 * La recursion recorre TRES grupos de claves, y cada grupo se trata distinto
 * porque su valor tiene forma distinta:
 *
 * - `objectKeys`: un mapa de nombre a esquema; se recorre cada valor.
 * - `singleKeys`: un unico esquema; se recorre directo. El guard
 *   `!Array.isArray` importa: `items` admite tambien la forma de tupla —un
 *   arreglo de esquemas— y ahi no aplica este camino.
 * - `arrayKeys`: un arreglo de esquemas; se mapea cada elemento.
 */
function sanitizeJsonSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return schema

  // Copia superficial: el esquema de entrada no se muta.
  const result = { ...schema }

  // `const` pasa a `enum: [valor]`.
  if ('const' in result) {
    result.enum = [result.const]
    delete result.const
  }

  const objectKeys = [
    'properties',
    'definitions',
    '$defs',
    'patternProperties',
  ] as const
  for (const key of objectKeys) {
    const nested = result[key]
    if (nested && typeof nested === 'object') {
      const sanitized: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
        sanitized[k] =
          v && typeof v === 'object'
            ? sanitizeJsonSchema(v as Record<string, unknown>)
            : v
      }
      result[key] = sanitized
    }
  }

  const singleKeys = [
    'items',
    'additionalProperties',
    'not',
    'if',
    'then',
    'else',
    'contains',
    'propertyNames',
  ] as const
  for (const key of singleKeys) {
    const nested = result[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      result[key] = sanitizeJsonSchema(nested as Record<string, unknown>)
    }
  }

  const arrayKeys = ['anyOf', 'oneOf', 'allOf'] as const
  for (const key of arrayKeys) {
    const nested = result[key]
    if (Array.isArray(nested)) {
      result[key] = nested.map(item =>
        item && typeof item === 'object'
          ? sanitizeJsonSchema(item as Record<string, unknown>)
          : item,
      )
    }
  }

  return result
}

/**
 * Traduce el `tool_choice` de Anthropic al de OpenAI.
 *
 * - `{ type: "auto" }` da `"auto"`.
 * - `{ type: "any" }`  da `"required"`.
 * - `{ type: "tool", name }` da `{ type: "function", function: { name } }`.
 * - Cualquier otra cosa —undefined, null, una cadena, un type desconocido, un
 *   objeto sin type— da `undefined`, y el proveedor aplica su default.
 */
export function anthropicToolChoiceToOpenAI(
  toolChoice: unknown,
): 'auto' | 'required' | ChatCompletionNamedToolChoice | undefined {
  if (!toolChoice || typeof toolChoice !== 'object') return undefined

  const tc = toolChoice as Record<string, unknown>
  const type = tc.type as string

  switch (type) {
    case 'auto':
      return 'auto'
    case 'any':
      return 'required'
    case 'tool':
      return {
        type: 'function',
        function: { name: tc.name as string },
      }
    default:
      return undefined
  }
}
