/**
 * Auxiliares compartidos por los adaptadores de proveedor — porte de
 * `ccnmt: packages/provider/src/runtimeHelpers.ts` (212 lineas).
 *
 * El puerto es COMPLETO: las 11 exportaciones de la fuente mas sus dos
 * funciones privadas (`getToolDescription`, `getToolInputSchema`). Ninguna
 * queda fuera.
 *
 * Tres de ellas son MARCADORES DE FRONTERA en la fuente, no calculos, y se
 * portan como tales con su cuerpo tal cual: `calculateUSDCost` devuelve 0
 * porque el costo se decide fuera de este paquete; `normalizeContentFromAPI`
 * ignora sus parametros `_tools` y `_agentId`; e `isToolSearchEnabled` ignora
 * el modelo, el contexto de permiso, los agentes y la fuente de consulta.
 * Portarlas «mejoradas» seria portar otra cosa: su firma es el contrato que
 * los llamadores ya cumplen, y su cuerpo es donde la fuente decidio no
 * decidir todavia.
 */
import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { randomUUID } from 'crypto'
import { readEnv } from '@thyrox/config/env/utils'
import type {
  ProviderAssistantMessage,
  ProviderMessage,
  ProviderSystemAPIErrorMessage,
  ProviderTool,
  ProviderToolPermissionContext,
  ProviderTools,
  ProviderToolSchemaOptions,
} from './contracts.js'

export const TOOL_SEARCH_TOOL_NAME = 'ToolSearch'

/** Analiza un JSON devolviendo `null` en vez de lanzar. */
export function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

/** El mensaje de un error, sea `Error` o cualquier otra cosa. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Arma el mensaje de asistente que representa un error del API.
 *
 * Lleva `isApiErrorMessage: true` — es lo que distingue este turno de una
 * respuesta real del modelo— y su contenido cae a «No content» cuando llega
 * vacio, para que el consumidor no muestre un error sin cuerpo.
 */
export function createAssistantAPIErrorMessage(args: {
  content: string
  apiError?: unknown
  error?: unknown
  errorDetails?: string
}): ProviderAssistantMessage | ProviderSystemAPIErrorMessage {
  const message = {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: args.content || 'No content',
      },
    ],
  }

  return {
    type: 'assistant',
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    isApiErrorMessage: true,
    apiError: args.apiError,
    error: args.error,
    errorDetails: args.errorDetails,
    message,
  } as ProviderAssistantMessage
}

/**
 * Normaliza el contenido que llega del API.
 *
 * Lo unico que transforma es el `input` de un `tool_use` o de un
 * `server_tool_use` que llegue como CADENA: se analiza a objeto, y un JSON
 * roto cae a objeto vacio en vez de propagar la cadena. Todo lo demas pasa
 * tal cual.
 */
export function normalizeContentFromAPI(
  blocks: unknown,
  _tools: ProviderTools,
  _agentId?: string,
): ProviderMessage['message']['content'] {
  if (!Array.isArray(blocks)) return []
  return blocks.map(block => {
    if (!block || typeof block !== 'object') return block
    const typed = block as Record<string, unknown>
    if (typed.type === 'tool_use' && typeof typed.input === 'string') {
      return { ...typed, input: safeParseJSON(typed.input) ?? {} }
    }
    if (typed.type === 'server_tool_use' && typeof typed.input === 'string') {
      return { ...typed, input: safeParseJSON(typed.input) ?? {} }
    }
    return typed
  }) as ProviderMessage['message']['content']
}

/**
 * Filtra los mensajes que pueden viajar al API: solo usuario y asistente, no
 * virtuales, con `message` y con `content` DEFINIDO.
 *
 * La comparacion es contra `undefined` y no por veracidad: un contenido de
 * cadena vacia es un turno legitimo, y descartarlo perderia la peticion.
 */
export function normalizeMessagesForAPI(
  messages: readonly ProviderMessage[],
  _tools: ProviderTools,
): ProviderMessage[] {
  return messages.filter(
    msg =>
      (msg.type === 'user' || msg.type === 'assistant') &&
      !msg.isVirtual &&
      msg.message &&
      msg.message.content !== undefined,
  )
}

/**
 * La descripcion que viaja al API, en orden de precedencia: el `prompt` —que
 * recibe el contexto y puede ser asincrono—, luego una `description` de
 * funcion, luego una de cadena, y si no, cadena vacia.
 */
function getToolDescription(
  tool: ProviderTool,
  options: ProviderToolSchemaOptions,
): Promise<string> | string {
  if (typeof tool.prompt === 'function') {
    return tool.prompt({
      getToolPermissionContext:
        options.getToolPermissionContext ??
        (async () => ({ mode: 'default' }) as ProviderToolPermissionContext),
      tools: options.tools,
      agents: options.agents,
      allowedAgentTypes: options.allowedAgentTypes,
    })
  }
  if (typeof tool.description === 'function') {
    return tool.description()
  }
  if (typeof tool.description === 'string') {
    return tool.description
  }
  return ''
}

/**
 * El esquema de entrada declarado, o el esquema de objeto vacio.
 *
 * Un arreglo NO cuenta como esquema aunque sea un objeto: se descarta y cae
 * al defecto.
 */
function getToolInputSchema(tool: ProviderTool): Record<string, unknown> {
  const candidate = 'inputJSONSchema' in tool ? (tool.inputJSONSchema as unknown) : undefined
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    return candidate as Record<string, unknown>
  }

  return { type: 'object', properties: {} }
}

/**
 * Traduce una herramienta al esquema que el API acepta. `defer_loading` y
 * `cache_control` solo aparecen si las opciones los piden.
 */
export async function toolToAPISchema(
  tool: ProviderTool,
  options: ProviderToolSchemaOptions,
  signal?: AbortSignal,
): Promise<BetaToolUnion> {
  const schema: Record<string, unknown> = {
    name: tool.name,
    description: await getToolDescription(tool, options),
    input_schema: getToolInputSchema(tool),
  }

  if (options.deferLoading) {
    schema.defer_loading = true
  }
  if (options.cacheControl) {
    schema.cache_control = options.cacheControl
  }

  return schema as BetaToolUnion
}

/**
 * Marcador de frontera: el costo en dolares NO se calcula en esta capa.
 * Devuelve 0 a proposito, igual que la fuente.
 */
export function calculateUSDCost(_model: string, _usage: unknown): number {
  return 0
}

/**
 * Si la herramienta se carga en diferido. La comparacion es contra `true`
 * exacto, no por veracidad.
 */
export function isDeferredTool(tool: ProviderTool): boolean {
  return tool.isMcp === true || tool.shouldDefer === true
}

/**
 * Los nombres de herramienta que la busqueda ya descubrio, leidos de los
 * bloques `tool_reference` dentro de un `tool_result` de un mensaje de
 * USUARIO — que es donde el resultado de la busqueda aterriza.
 */
export function extractDiscoveredToolNames(
  messages: readonly ProviderMessage[],
): Set<string> {
  const discovered = new Set<string>()
  for (const message of messages) {
    if (message.type !== 'user') continue
    const content = message.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (
        block &&
        typeof block === 'object' &&
        'type' in block &&
        (block as { type: unknown }).type === 'tool_result' &&
        'content' in block &&
        Array.isArray((block as { content: unknown }).content)
      ) {
        for (const item of (block as { content: unknown[] }).content) {
          if (
            item &&
            typeof item === 'object' &&
            'type' in item &&
            (item as { type: unknown }).type === 'tool_reference' &&
            'tool_name' in item &&
            typeof (item as { tool_name: unknown }).tool_name === 'string'
          ) {
            discovered.add((item as { tool_name: string }).tool_name)
          }
        }
      }
    }
  }
  return discovered
}

/**
 * Si la busqueda de herramientas esta activa.
 *
 * Marcador de frontera, como la fuente: ignora el modelo, el contexto de
 * permiso, los agentes y la fuente de consulta. Hoy decide con dos cosas —que
 * `ENABLE_TOOL_SEARCH` no sea exactamente `'false'`, y que la herramienta este
 * entre las disponibles.
 */
export async function isToolSearchEnabled(
  _model: string,
  tools: ProviderTools,
  _getToolPermissionContext: () => Promise<ProviderToolPermissionContext>,
  _agents: readonly { [key: string]: unknown }[],
  _querySource?: string,
  signal?: AbortSignal,
): Promise<boolean> {
  return (
    readEnv('ENABLE_TOOL_SEARCH') !== 'false' &&
    tools.some(tool => tool.name === TOOL_SEARCH_TOOL_NAME)
  )
}
