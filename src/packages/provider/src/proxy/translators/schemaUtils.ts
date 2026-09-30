/**
 * Utilidades de esquema y de identificador compartidas por los traductores
 * Mensajes ⇄ OpenAI. Porte de tres funciones puntuales de
 * `omniroute: open-sse/translator/helpers/schemaCoercion.ts` (745 líneas —
 * sólo se portan `sanitizeToolId` y `normalizeMessagesToolInputSchema`, con sus
 * dos ayudantes internos) y una de
 * `omniroute: open-sse/translator/helpers/claudeHelper.ts` (762 líneas —
 * sólo `createDefaultMessagesCacheControl`).
 *
 * pendiente: el resto de `schemaCoercion.ts` — `stripInvalidSchemaConstructs`,
 * `coerceSchemaNumericFields`, la inyección de sentinelas de omisión opcional,
 * `injectEmptyReasoningContentForToolCalls` — no se porta. Son saneamientos de
 * esquema para MCP/agentes cuyo alcance excede los cuatro mecanismos centrales
 * pedidos (tool_use⇄tool_calls, system⇄system, stop_reason⇄finish_reason,
 * eventos SSE); portarlos exigiría además `messagesHelper.ts` casi entero.
 */

type JsonRecord = Record<string, unknown>

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(obj: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

/**
 * Porte literal de `schemaCoercion.ts::sanitizeToolId`. Sanea un identificador
 * de herramienta para el alfabeto que Anthropic acepta (`[a-zA-Z0-9_-]`); si
 * no llega ninguno, acuña uno propio.
 */
export function sanitizeToolId(id: string | undefined): string {
  if (!id) return `tool_${crypto.randomUUID().replace(/-/g, '_')}`
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '_')
  return sanitized || `tool_${crypto.randomUUID().replace(/-/g, '_')}`
}

/** Palabras clave de composición que Anthropic rechaza en la raíz de un `input_schema`. */
const CLAUDE_ROOT_UNION_KEYWORDS = ['anyOf', 'oneOf', 'allOf'] as const

/** Si una rama de la unión puede aportar propiedades de objeto a la raíz aplanada. */
function messagesUnionBranchCanBeObject(branch: JsonRecord): boolean {
  const type = branch.type
  if (type === undefined) return true
  if (typeof type === 'string') return type === 'object'
  if (Array.isArray(type)) return type.includes('object')
  return false
}

/** Añade a `target` las entradas de `branchRequired` que aún no se vieron. */
function mergeMessagesRequired(target: string[], seen: Set<string>, branchRequired: unknown): void {
  if (!Array.isArray(branchRequired)) return
  for (const name of branchRequired) {
    if (typeof name !== 'string' || seen.has(name)) continue
    seen.add(name)
    target.push(name)
  }
}

/** Si el esquema lleva `anyOf`/`oneOf`/`allOf` en su raíz. */
export function hasRootLevelSchemaUnion(schema: unknown): boolean {
  if (!isPlainObject(schema)) return false
  return CLAUDE_ROOT_UNION_KEYWORDS.some((keyword) => hasOwn(schema, keyword))
}

/**
 * Porte literal de `schemaCoercion.ts::normalizeMessagesToolInputSchema`.
 * Aplana una unión de nivel raíz (`anyOf`/`oneOf`/`allOf`) en un esquema de
 * objeto plano, porque Anthropic la rechaza directamente
 * (`tools.N.custom.input_schema: input_schema does not support oneOf, allOf,
 * or anyOf at the top level`). Un esquema sin unión de raíz vuelve intacto.
 */
export function normalizeMessagesToolInputSchema(schema: unknown): unknown {
  if (!hasRootLevelSchemaUnion(schema)) return schema

  const source = schema as JsonRecord
  const result: JsonRecord = { ...source }
  const properties: JsonRecord = isPlainObject(source.properties) ? { ...source.properties } : {}
  const required: string[] = []
  const requiredSeen = new Set<string>()
  mergeMessagesRequired(required, requiredSeen, source.required)

  for (const keyword of CLAUDE_ROOT_UNION_KEYWORDS) {
    if (!hasOwn(result, keyword)) continue
    const branches = result[keyword]
    delete result[keyword]
    if (!Array.isArray(branches)) continue

    for (const branch of branches) {
      if (!isPlainObject(branch) || !messagesUnionBranchCanBeObject(branch)) continue
      if (isPlainObject(branch.properties)) {
        for (const [name, propertySchema] of Object.entries(branch.properties)) {
          if (!hasOwn(properties, name)) properties[name] = propertySchema
        }
      }
      if (keyword === 'allOf') mergeMessagesRequired(required, requiredSeen, branch.required)
    }
  }

  result.type = 'object'
  result.properties = properties
  if (required.length > 0) result.required = required

  return result
}

/**
 * Porte literal de `messagesHelper.ts::createDefaultMessagesCacheControl`.
 * Vertex y su variante partner no aceptan `ttl` en el marcador de cache; el
 * resto de proveedores sí, y se les da 1 hora.
 */
export function createDefaultMessagesCacheControl(provider?: string | null): {
  type: string
  ttl?: string
} {
  return provider === 'vertex' || provider === 'vertex-partner'
    ? { type: 'ephemeral' }
    : { type: 'ephemeral', ttl: '1h' }
}
