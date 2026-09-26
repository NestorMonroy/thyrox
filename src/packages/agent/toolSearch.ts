/**
 * Utilidades de descubrimiento de herramientas diferidas — puerto PARCIAL
 * de `ccnmt: packages/agent/toolSearch.ts` (769 líneas, 13 símbolos
 * exportados).
 *
 * PORTE PARCIAL, declarado. Este archivo porta únicamente los DOS símbolos
 * que ejercita `__tests__/toolSearchPure.test.ts` — `isToolReferenceBlock`
 * y `extractDiscoveredToolNames` — más sus tres auxiliares privados
 * (`isToolReferenceWithName`, el tipo `ToolResultBlock` y
 * `isToolResultBlockWithContent`). Los once símbolos exportados restantes
 * de la fuente NO se portan aquí, y ningún test portado los ejercita:
 *
 *   - (2026-09-24) `ToolSearchMode`, `getToolSearchMode`,
 *     `isToolSearchEnabledOptimistic` e `isToolSearchToolAvailable` YA
 *     están portados desde 2.1.275 (`u9e`, `Dg`, `gfe`, más `pQn`).
 *   - (2026-09-26) `getAutoToolSearchCharThreshold`,
 *     `modelSupportsToolReference` e `isToolSearchEnabled` YA están
 *     portados desde 2.1.282 (`V5n`, `z8`, `iPn`, más `iyt`, `Z5n`,
 *     `X5n`, `Q5n`, `J5n`, `ryt`, `gEe`, `W8`, `mBn`, `qpe`). Sus
 *     divergencias están declaradas junto a cada uno.
 *   - `DeferredToolsDelta`, `DeferredToolsDeltaScanContext`,
 *     `isDeferredToolsDeltaEnabled`, `getDeferredToolsDelta` — el cálculo
 *     de delta de herramientas diferidas depende de la misma familia de
 *     paquetes ausentes.
 *
 * Los dos símbolos portados son puros: no leen variables de entorno, no
 * llaman a GrowthBook, no cuentan tokens — sólo inspeccionan la forma de
 * bloques de mensaje ya materializados. Por eso son portables sin
 * arrastrar el resto del archivo.
 *
 * Dos divergencias más, ambas de forma y no de comportamiento:
 *
 *   - `Message` se importa de `./messageShapes.ts` (puerto local ya
 *     existente en este árbol) en vez de
 *     `@claude-code-how-works/repl/replTypes/message.js` (ausente).
 *   - La llamada de diagnóstico `logForDebugging(...)` de la fuente — una
 *     línea, sin aserción de ningún test portado — NO se reproduce: su
 *     único efecto es escribir a un log de depuración, y acoplaría este
 *     archivo a `./host.ts` (bindings del host, que lanzan si no están
 *     instaladas) sólo para ese side-effect no verificado. La variable
 *     `carriedFromBoundary` que sólo alimentaba ese mensaje se retira con
 *     ella.
 */
import { isEnvDefinedFalsy, isEnvTruthy } from '@thyrox/config/env/utils.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { getAllModelBetas } from '@thyrox/provider/betas.js'
import { getCanonicalName } from '@thyrox/provider/model.js'
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from '@thyrox/provider/providers.js'
import type { ToolPermissionContext, Tools } from '@thyrox/tool-registry/Tool.js'
import type { AgentDefinition } from '@thyrox/tool-registry/tools/AgentTool/loadAgentsDir.js'
import { isDeferredTool } from '@thyrox/tool-registry/tools/ToolSearchTool/prompt.js'
import { getContextWindowForModel } from './context.ts'
import { logEvent, logForDebugging } from './internal/logging.ts'
import type { Message } from './messageShapes.ts'
import { zodToJsonSchema } from './zodSchema/zodToJsonSchema.ts'

/** Los tres modos que 2.1.275 resuelve (`u9e`). */
export type ToolSearchMode = 'tst' | 'tst-auto' | 'standard'

/**
 * `auto:N` → N acotado a 0..100; cualquier otra forma → `null` (`pQn`).
 */
export function parseAutoToolSearchPercentage(value: string | undefined): number | null {
  if (!value?.startsWith('auto:')) return null
  const n = Number.parseInt(value.slice(5), 10)
  if (Number.isNaN(n)) return null
  return Math.max(0, Math.min(100, n))
}

/**
 * El forzado administrativo (`u` junto a `u9e`). En 2.1.275 sólo lo abre un
 * `ENABLE_TOOL_SEARCH=force` de la capa administrada de entorno, y sólo con
 * proveedor de primera parte. pendiente: esa capa administrada (y la marca
 * hipaa que lo anula) no existe en este árbol; sin ella el forzado nunca se
 * abre, que es la rama por defecto del binario.
 */
function isToolSearchForced(): boolean {
  if (getAPIProvider() !== 'firstParty') return false
  return false
}

/** `e_t`: las betas experimentales desactivadas, salvo forzado. */
function experimentalBetasDisabled(): boolean {
  return isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS) && !isToolSearchForced()
}

/** `u9e`: el modo de búsqueda de herramientas según el entorno. */
export function getToolSearchMode(): ToolSearchMode {
  if (experimentalBetasDisabled()) return 'standard'
  if (isToolSearchForced()) return 'tst'
  const value = process.env.ENABLE_TOOL_SEARCH
  const percentage = parseAutoToolSearchPercentage(value)
  if (percentage === 0) return 'tst'
  if (percentage === 100) return 'standard'
  if (value === 'auto' || value?.startsWith('auto:')) return 'tst-auto'
  if (isEnvTruthy(value)) return 'tst'
  if (isEnvDefinedFalsy(value)) return 'standard'
  return 'tst'
}

/**
 * `Dg`: la comprobación optimista. Con proveedor de primera parte pero una
 * URL base ajena, la herramienta sólo se ofrece si alguien lo pidió.
 */
export function isToolSearchEnabledOptimistic(): boolean {
  if (getToolSearchMode() === 'standard') return false
  if (
    !process.env.ENABLE_TOOL_SEARCH &&
    !isToolSearchForced() &&
    getAPIProvider() === 'firstParty' &&
    !(isEnvTruthy(process.env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL) || isFirstPartyAnthropicBaseUrl())
  )
    return false
  return true
}

/** `gfe`: la herramienta ToolSearch está en la lista, por nombre o alias. */
export function isToolSearchToolAvailable(
  tools: ReadonlyArray<{ name: string; aliases?: readonly string[] }>,
): boolean {
  return tools.some(t => t.name === 'ToolSearch' || t.aliases?.includes('ToolSearch'))
}

// ── La decisión completa (2.1.282) ─────────────────────────────────────────

/** `_`: los modelos sin bloques `tool_reference` cuando la bandera no dice otra cosa. */
const DEFAULT_UNSUPPORTED_MODELS = ['claude-3-5-haiku', 'claude-3-haiku']

/** `E`: en Vertex, la primera versión de cada familia que acepta la beta. */
const VERTEX_MINIMUM_VERSIONS: ReadonlyArray<readonly [string, readonly number[]]> = [
  ['opus', [4, 5]],
  ['sonnet', [4, 5]],
  ['haiku', [4, 5]],
]

/** `mEe`: el porcentaje de la ventana que dispara el modo automático. */
const DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE = 10

/** `K5n`: caracteres por token del camino de respaldo. */
const CHARS_PER_TOKEN = 2.5

/** `mN`: el costo fijo por petición que el conteo de herramientas incluye. */
const TOOL_TOKEN_COUNT_OVERHEAD = 500

/** Las razones de `iyt` para no ofrecer la búsqueda, antes de mirar el modo. */
export type ToolSearchUnavailableReason =
  | 'model_unsupported'
  | 'vertex_model_unsupported'
  | 'foundry_deployment_unsupported'
  | 'no_tools_in_request'
  | 'not_registered'
  | 'mcp_search_unavailable'

/** `g`: la lista de modelos sin `tool_reference`, de GrowthBook o la de fábrica. */
function getUnsupportedToolReferenceModels(): string[] {
  try {
    const value = getFeatureValue_CACHED_MAY_BE_STALE<unknown>(
      'tengu_tool_search_unsupported_models',
      null,
    )
    if (Array.isArray(value)) return value as string[]
  } catch {}
  return DEFAULT_UNSUPPORTED_MODELS
}

/** `z8`: el modelo acepta bloques `tool_reference`. */
export function modelSupportsToolReference(model: string): boolean {
  const lower = model.toLowerCase()
  return !getUnsupportedToolReferenceModels().some(pattern =>
    lower.includes(pattern.toLowerCase()),
  )
}

/** `mBn`: `claude-<familia>-<versión>` alcanza el mínimo declarado para su familia. */
function meetsFamilyMinimum(
  canonical: string,
  minimums: ReadonlyArray<readonly [string, readonly number[]]>,
): boolean {
  const match = /^claude-([a-z]+)-(\d+(?:-\d+)*)$/.exec(canonical)
  const family = match?.[1]
  const version = match?.[2]
  if (!family || !version) return false
  const minimum = minimums.find(([name]) => name === family)?.[1]
  if (!minimum) return false
  const parts = version.split('-').map(Number)
  for (let i = 0; i < Math.max(parts.length, minimum.length); i++) {
    const difference = (parts[i] ?? 0) - (minimum[i] ?? 0)
    if (difference !== 0) return difference > 0
  }
  return true
}

/** `W8`: en Vertex, los modelos previos a 4.5 rechazan la cabecera beta. */
function isVertexModelWithoutToolSearch(model: string): boolean {
  if (getAPIProvider() !== 'vertex') return false
  const canonical = getCanonicalName(model).replace(/[@-]\d{8}$/, '')
  if (/^claude-3(-|$)/.test(canonical)) return true
  return (
    /^claude-(opus|sonnet|haiku)-\d/.test(canonical) &&
    !meetsFamilyMinimum(canonical, VERTEX_MINIMUM_VERSIONS)
  )
}

/**
 * `qpe`: el despliegue de Foundry acepta la capacidad. El binario consulta el
 * cerrojo `foundryDeploymentCapabilities` del host, que se llena cuando una
 * petición recibe un 400 que la nombra; con el mapa vacío responde `true`.
 * pendiente: ese cerrojo no existe en este árbol, así que siempre está vacío.
 */
function foundryDeploymentSupports(_model: string, _capability: string): boolean {
  return true
}

/** `iyt`: por qué no se ofrece la búsqueda, o `undefined` si nada lo impide. */
export function getToolSearchUnavailableReason(
  model: string,
  tools: ReadonlyArray<{ name: string; aliases?: readonly string[] }>,
): ToolSearchUnavailableReason | undefined {
  if (!modelSupportsToolReference(model)) return 'model_unsupported'
  if (isVertexModelWithoutToolSearch(model)) return 'vertex_model_unsupported'
  if (
    !foundryDeploymentSupports(model, 'tool_search_server') ||
    !foundryDeploymentSupports(model, 'tool_search')
  )
    return 'foundry_deployment_unsupported'
  if (isToolSearchToolAvailable(tools)) return undefined
  if (tools.length === 0) return 'no_tools_in_request'
  if (!isToolSearchEnabledOptimistic()) return 'not_registered'
  return 'mcp_search_unavailable'
}

/** `gEe`: el porcentaje de `auto:N`, o el de fábrica. */
export function getAutoToolSearchPercentage(): number {
  const value = process.env.ENABLE_TOOL_SEARCH
  if (!value || value === 'auto') return DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE
  return parseAutoToolSearchPercentage(value) ?? DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE
}

/** `ryt`: los tokens de herramientas diferidas que activan el modo automático. */
export function getAutoToolSearchTokenThreshold(model: string): number {
  const contextWindow = getContextWindowForModel(model, getAllModelBetas(model))
  return Math.floor((contextWindow * getAutoToolSearchPercentage()) / 100)
}

/** `V5n`: el mismo umbral en caracteres, para cuando el conteo no responde. */
export function getAutoToolSearchCharThreshold(model: string): number {
  return Math.floor(getAutoToolSearchTokenThreshold(model) * CHARS_PER_TOKEN)
}

type ToolSearchTools = Tools
type PermissionContextGetter = () => Promise<ToolPermissionContext>

/**
 * `Q5n`: los tokens de las herramientas diferidas, sin el costo fijo; `null`
 * si el conteo falla o devuelve cero. El contador vive en
 * `sessionTools/analyzeContext.ts`, que a su vez importa este módulo de forma
 * diferida: por eso aquí también se carga al usarlo, y no al importar.
 */
async function countDeferredToolTokens(
  deferred: ToolSearchTools,
  getToolPermissionContext: PermissionContextGetter,
  agents: AgentDefinition[],
  model: string,
): Promise<number | null> {
  if (deferred.length === 0) return 0
  try {
    const { countToolDefinitionTokens } = await import('./sessionTools/analyzeContext.js')
    const tokens = await countToolDefinitionTokens(
      deferred,
      getToolPermissionContext,
      { activeAgents: agents, allAgents: agents } as never,
      model,
    )
    if (tokens === 0) return null
    return Math.max(0, tokens - TOOL_TOKEN_COUNT_OVERHEAD)
  } catch {
    return null
  }
}

/**
 * `Y5n`/`X5n`: el conteo se recuerda por la lista de nombres diferidos. El
 * binario guarda el recuerdo por host; aquí el proceso tiene uno solo.
 */
const deferredTokenCounts = new Map<string, Promise<number | null>>()

function rememberedDeferredToolTokens(
  tools: ToolSearchTools,
  getToolPermissionContext: PermissionContextGetter,
  agents: AgentDefinition[],
  model: string,
): Promise<number | null> {
  const deferred = tools.filter(tool => isDeferredTool(tool))
  const key = deferred.map(tool => tool.name).join(',')
  const remembered = deferredTokenCounts.get(key)
  if (remembered !== undefined) return remembered
  const counted = countDeferredToolTokens(deferred, getToolPermissionContext, agents, model)
  deferredTokenCounts.set(key, counted)
  return counted
}

/** `J5n`: los caracteres de nombre, prompt y esquema de las herramientas diferidas. */
async function countDeferredToolChars(
  tools: ToolSearchTools,
  getToolPermissionContext: PermissionContextGetter,
  agents: AgentDefinition[],
  model: string,
): Promise<number> {
  const deferred = tools.filter(tool => isDeferredTool(tool))
  if (deferred.length === 0) return 0
  // El binario pasa también el modelo; el contrato local de `prompt` no lo
  // declara, así que viaja en un objeto ya construido.
  const promptOptions = { getToolPermissionContext, tools, agents, model }
  const sizes = await Promise.all(
    deferred.map(async tool => {
      const prompt = await tool.prompt(promptOptions)
      const schema = tool.inputJSONSchema
        ? JSON.stringify(tool.inputJSONSchema)
        : tool.inputSchema
          ? JSON.stringify(zodToJsonSchema(tool.inputSchema as never))
          : ''
      return tool.name.length + prompt.length + schema.length
    }),
  )
  return sizes.reduce((total, size) => total + size, 0)
}

type AutoToolSearchDecision = {
  enabled: boolean
  debugDescription: string
  metrics: Record<string, number>
}

/** `Z5n`: el modo automático, por tokens o —si el conteo no responde— por caracteres. */
async function decideAutoToolSearch(
  tools: ToolSearchTools,
  getToolPermissionContext: PermissionContextGetter,
  agents: AgentDefinition[],
  model: string,
): Promise<AutoToolSearchDecision> {
  const tokens = await rememberedDeferredToolTokens(tools, getToolPermissionContext, agents, model)
  if (tokens !== null) {
    const threshold = getAutoToolSearchTokenThreshold(model)
    return {
      enabled: tokens >= threshold,
      debugDescription: `${tokens} tokens (threshold: ${threshold}, ${getAutoToolSearchPercentage()}% of context)`,
      metrics: { deferredToolTokens: tokens, threshold },
    }
  }
  const chars = await countDeferredToolChars(tools, getToolPermissionContext, agents, model)
  const charThreshold = getAutoToolSearchCharThreshold(model)
  return {
    enabled: chars >= charThreshold,
    debugDescription: `${chars} chars (threshold: ${charThreshold}, ${getAutoToolSearchPercentage()}% of context) (char fallback)`,
    metrics: { deferredToolDescriptionChars: chars, charThreshold },
  }
}

/**
 * `iPn`: ¿se difieren las herramientas detrás de ToolSearch en esta petición?
 * Primero las razones de `iyt`, luego el modo; cada salida deja su evento
 * `tengu_tool_search_mode_decision`. pendiente: el campo `mcpNonBlocking`
 * del evento (`CX`) no tiene fuente en este árbol y no se emite.
 */
export async function isToolSearchEnabled(
  model: string,
  tools: ToolSearchTools,
  getToolPermissionContext: PermissionContextGetter,
  agents: AgentDefinition[],
  source?: string,
): Promise<boolean> {
  const mcpToolCount = tools.filter(tool => tool.isMcp).length
  const record = (
    enabled: boolean,
    mode: string,
    reason: string,
    metrics: Record<string, number> = {},
  ) =>
    logEvent('tengu_tool_search_mode_decision', {
      enabled,
      mode,
      reason,
      checkedModel: model,
      mcpToolCount,
      userType: 'external',
      ...metrics,
    })

  const reason = getToolSearchUnavailableReason(model, tools)
  switch (reason) {
    case 'model_unsupported':
      logForDebugging(
        `Tool search disabled for model '${model}': model does not support tool_reference blocks. This feature is available on Claude Sonnet 4+, Opus 4+, Haiku 4.5+, and newer models.`,
      )
      record(false, 'standard', reason)
      return false
    case 'vertex_model_unsupported':
      logForDebugging(
        `Tool search disabled for model '${model}' on Vertex: this model's Vertex serving stack rejects the tool-search beta header (pre-4.5 generation).`,
      )
      record(false, 'standard', reason)
      return false
    case 'foundry_deployment_unsupported':
      logForDebugging(
        `Tool search disabled: Foundry deployment for '${model}' does not support tool search.`,
      )
      record(false, 'standard', reason)
      return false
    case 'no_tools_in_request':
    case 'not_registered':
      record(false, getToolSearchMode(), reason)
      return false
    case 'mcp_search_unavailable':
      logForDebugging(
        'Tool search disabled: ToolSearchTool is not available (may have been disallowed via disallowedTools).',
      )
      record(false, getToolSearchMode(), reason)
      return false
    case undefined:
      break
  }

  const mode = getToolSearchMode()
  switch (mode) {
    case 'tst':
      record(true, mode, 'tst_enabled')
      return true
    case 'tst-auto': {
      const { enabled, debugDescription, metrics } = await decideAutoToolSearch(
        tools,
        getToolPermissionContext,
        agents,
        model,
      )
      const sourceSuffix = source ? ` [source: ${source}]` : ''
      logForDebugging(
        `Auto tool search ${enabled ? 'enabled' : 'disabled'}: ${debugDescription}${sourceSuffix}`,
      )
      record(enabled, mode, enabled ? 'auto_above_threshold' : 'auto_below_threshold', metrics)
      return enabled
    }
    case 'standard':
      record(false, mode, 'standard_mode')
      return false
  }
}

/**
 * Verifica si un objeto es un bloque `tool_reference`.
 * `tool_reference` es una feature beta que no está en los tipos del SDK,
 * así que hace falta una verificación en runtime.
 */
export function isToolReferenceBlock(obj: unknown): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    (obj as { type: unknown }).type === 'tool_reference'
  )
}

/**
 * Type guard para un bloque `tool_reference` con `tool_name`.
 */
function isToolReferenceWithName(
  obj: unknown,
): obj is { type: 'tool_reference'; tool_name: string } {
  return (
    isToolReferenceBlock(obj) &&
    'tool_name' in (obj as object) &&
    typeof (obj as { tool_name: unknown }).tool_name === 'string'
  )
}

/**
 * Tipo que representa un bloque `tool_result` con contenido en arreglo.
 * Se usa para extraer bloques `tool_reference` de los resultados de
 * ToolSearchTool.
 */
type ToolResultBlock = {
  type: 'tool_result'
  content: unknown[]
}

/**
 * Type guard para bloques `tool_result` con contenido en arreglo.
 */
function isToolResultBlockWithContent(obj: unknown): obj is ToolResultBlock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    (obj as { type: unknown }).type === 'tool_result' &&
    'content' in obj &&
    Array.isArray((obj as { content: unknown }).content)
  )
}

/**
 * Extrae los nombres de herramienta de los bloques `tool_reference` en el
 * historial de mensajes.
 *
 * Cuando la carga dinámica de herramientas está habilitada, las
 * herramientas MCP no se predeclaran en el arreglo de herramientas. En su
 * lugar, se descubren vía ToolSearchTool, que devuelve bloques
 * `tool_reference`. Esta función recorre el historial de mensajes para
 * encontrar todos los nombres de herramienta referenciados, de modo que
 * sólo esas herramientas se incluyan en peticiones subsecuentes a la API.
 *
 * Este enfoque:
 * - Elimina la necesidad de predeclarar todas las herramientas MCP por
 *   adelantado.
 * - Retira los límites sobre la cantidad total de herramientas MCP.
 *
 * La compactación reemplaza los mensajes que portan `tool_reference` por
 * un resumen, así que el conjunto descubierto se snapshotea sobre
 * `compactMetadata.preCompactDiscoveredTools` en el marcador de frontera;
 * este recorrido lo vuelve a leer.
 *
 * @param messages Arreglo de mensajes que puede contener bloques
 *   `tool_result` con contenido `tool_reference`
 * @returns Conjunto de nombres de herramienta descubiertos vía bloques
 *   `tool_reference`
 */
export function extractDiscoveredToolNames(messages: Message[]): Set<string> {
  const discoveredTools = new Set<string>()

  for (const msg of messages) {
    // La frontera de compactación porta el conjunto descubierto previo a
    // la compactación. Verificación de tipo inline en vez de una función
    // aparte — evita un ciclo de import con quien más adelante consuma
    // ambos.
    if (msg.type === 'system' && msg.subtype === 'compact_boundary') {
      const carried = (
        msg as Message & {
          compactMetadata?: { preCompactDiscoveredTools?: string[] }
        }
      ).compactMetadata?.preCompactDiscoveredTools
      if (carried) {
        for (const name of carried) discoveredTools.add(name)
      }
      continue
    }

    // Sólo los mensajes de usuario contienen bloques tool_result
    // (respuestas a tool_use).
    if (msg.type !== 'user') continue

    const content = msg.message?.content
    if (!Array.isArray(content)) continue

    for (const block of content) {
      // Los bloques tool_reference sólo aparecen dentro de contenido
      // tool_result, específicamente en resultados de ToolSearchTool. La
      // API expande estas referencias a definiciones completas de
      // herramienta en el contexto del modelo.
      if (isToolResultBlockWithContent(block)) {
        for (const item of block.content) {
          if (isToolReferenceWithName(item)) {
            discoveredTools.add(item.tool_name)
          }
        }
      }
    }
  }

  return discoveredTools
}
