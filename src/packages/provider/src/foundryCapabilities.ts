/**
 * El cerrojo de capacidades por despliegue de Foundry — porte de 2.1.282.
 *
 * Un despliegue de Azure AI Foundry puede rechazar con un 400 capacidades que
 * la API de Anthropic sí admite (búsqueda de herramientas, salidas
 * estructuradas, búsqueda web). El binario lee el nombre de la capacidad en
 * el mensaje (`TA`/`WQt`), lo registra por despliegue (`jQt`), reintenta la
 * petición sin ella (`GDn`) y, desde ese momento, no la vuelve a pedir: la
 * consulta la búsqueda de herramientas (`qpe`) y la quita de la lista de
 * herramientas de cada petición (`Apo`).
 *
 * Divergencia declarada: el binario guarda el cerrojo en
 * `host.requestLatches.foundryDeploymentCapabilities`, uno por host; aquí el
 * proceso tiene un host, así que el cerrojo es del módulo.
 */
import { APIError } from '@anthropic-ai/sdk'
import { readEnv } from '@thyrox/config/env/utils'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { normalizeModelStringForAPI } from './model.js'
import { getAPIProvider } from './providers.js'

/** `iW`, `sW`, `aW`: las tres formas en que Foundry nombra lo que rechaza. */
const NOT_SUPPORTED_IN_WORKSPACE = /([a-z0-9_, ]+?)\s+not supported in your workspace/i
const NOT_AVAILABLE_FOR_FOUNDRY =
  /features are not available for Azure AI Foundry workspaces?:\s*([a-z0-9_, ]+)/i
const WEB_SEARCH_NOT_AVAILABLE = /server-side web search is not available in this environment/i

/** `AA`: un nombre de capacidad. */
const CAPABILITY_NAME = /^[a-z][a-z0-9_]*$/

/** `lW`: las capacidades que se pueden quitar de la petición y reintentar. */
const STRIPPABLE_CAPABILITIES = new Set(['tool_search_server', 'tool_search', 'structured_outputs'])

/** `zQt`: la petición cuyo propósito es la capacidad rechazada no se reintenta. */
export const FOUNDRY_PURPOSE_REQUEST_FAILURE = 'fail:foundry-purpose-request'

/** `ske`/`Son`: la herramienta que mantiene activa la carga diferida. */
export const DEFERRED_TOOL_PLACEHOLDER_NAME = 'DeferredToolPlaceholder'
export const DEFERRED_TOOL_PLACEHOLDER_DESCRIPTION =
  'Reserved placeholder that keeps deferred tool loading active; never call this tool.'

const unsupportedByDeployment = new Map<string, Set<string>>()

/** Vacía el cerrojo. Sólo para pruebas. */
export function resetFoundryCapabilities(): void {
  unsupportedByDeployment.clear()
}

/** `TA`: las capacidades que el mensaje de error nombra, o `null`. */
export function parseUnsupportedCapabilities(message: string): string[] | null {
  const listed = message.match(NOT_SUPPORTED_IN_WORKSPACE)?.[1]
  if (listed) {
    const names = listed.split(',').map(name => name.trim())
    if (names.every(name => CAPABILITY_NAME.test(name))) return names
  }
  const foundryListed = message.match(NOT_AVAILABLE_FOR_FOUNDRY)?.[1]
  if (foundryListed) {
    const names = foundryListed
      .split(/[,\s]+/)
      .filter(name => name !== 'and' && CAPABILITY_NAME.test(name))
    return names.length > 0 ? names : null
  }
  if (WEB_SEARCH_NOT_AVAILABLE.test(message)) return ['web_search']
  return null
}

/** `WQt`: las capacidades rechazadas por un 400 de Foundry, o `null`. */
export function unsupportedCapabilitiesFromError(error: unknown): string[] | null {
  if (getAPIProvider() !== 'foundry') return null
  if (!(error instanceof APIError) || error.status !== 400) return null
  const body = error.error
  if (body && typeof body === 'object' && 'error' in body) {
    const inner = (body as { error?: unknown }).error
    if (inner && typeof inner === 'object' && 'message' in inner) {
      const message = (inner as { message?: unknown }).message
      if (typeof message === 'string') return parseUnsupportedCapabilities(message)
    }
  }
  return parseUnsupportedCapabilities(error.message ?? '')
}

/** `kh`: la URL base del recurso de Foundry, si está configurado. */
function getFoundryBaseUrl(): string | undefined {
  const baseUrl = readEnv('ANTHROPIC_FOUNDRY_BASE_URL')
  if (baseUrl) return baseUrl
  const resource = readEnv('ANTHROPIC_FOUNDRY_RESOURCE')
  return resource ? `https://${resource}.services.ai.azure.com` : undefined
}

/** `vh`: la clave del despliegue — recurso y modelo. */
export function foundryDeploymentKey(model: string): string {
  return `${getFoundryBaseUrl() ?? 'unknown-foundry-resource'}::${normalizeModelStringForAPI(model)}`
}

/** `jQt`: registra lo que el despliegue rechazó; sólo avisa si hay algo nuevo. */
export function recordUnsupportedCapabilities(model: string, capabilities: string[]): void {
  if (capabilities.length === 0) return
  const key = foundryDeploymentKey(model)
  const known = unsupportedByDeployment.get(key)
  if (known && capabilities.every(capability => known.has(capability))) return
  const updated = new Set(known)
  for (const capability of capabilities) updated.add(capability)
  unsupportedByDeployment.set(key, updated)
  logForDebugging(
    `[foundry-capabilities] deployment ${key} does not support: ${[...updated].join(', ')}`,
    { level: 'warn' },
  )
}

/** `qpe`: el despliegue admite la capacidad (sin registro, todas). */
export function foundryDeploymentSupports(model: string, capability: string): boolean {
  if (unsupportedByDeployment.size === 0) return true
  return !unsupportedByDeployment.get(foundryDeploymentKey(model))?.has(capability)
}

/**
 * `GDn`: ante un error de la API, registra lo rechazado y decide. Devuelve
 * el motivo del reintento, `FOUNDRY_PURPOSE_REQUEST_FAILURE` si la petición
 * existe para usar la capacidad rechazada, o `null` si no le toca decidir.
 */
export function handleFoundryCapabilityRejection(
  error: unknown,
  model: string,
  querySource: string | undefined,
): string | null {
  const capabilities = unsupportedCapabilitiesFromError(error)
  if (!capabilities) return null
  recordUnsupportedCapabilities(model, capabilities)
  if (querySource === 'web_search_tool') return FOUNDRY_PURPOSE_REQUEST_FAILURE
  if (capabilities.some(capability => STRIPPABLE_CAPABILITIES.has(capability)))
    return `retry:foundry-capability-strip:${capabilities.join(',')}`
  return null
}

type RequestTool = {
  name?: string
  description?: string
  defer_loading?: boolean
  strict?: boolean
}

/**
 * `Apo`: la lista de herramientas sin lo que el despliegue rechazó —
 * `defer_loading` y el marcador de carga diferida si rechazó la búsqueda,
 * `strict` si rechazó las salidas estructuradas—. Sin cambios, la misma lista.
 */
export function stripUnsupportedToolFields<T extends object>(tools: T[], model: string): T[] {
  if (getAPIProvider() !== 'foundry') return tools
  if (unsupportedByDeployment.size === 0) return tools
  const unsupported = unsupportedByDeployment.get(foundryDeploymentKey(model))
  if (!unsupported || unsupported.size === 0) return tools
  const stripSearch = unsupported.has('tool_search_server') || unsupported.has('tool_search')
  const stripStrict = unsupported.has('structured_outputs')
  if (!stripSearch && !stripStrict) return tools
  let changed = false
  const result: T[] = []
  for (const tool of tools) {
    // No toda variante de `BetaToolUnion` declara estos campos; se leen como
    // opcionales sobre la forma común.
    const fields = tool as RequestTool
    const deferred = stripSearch && fields.defer_loading
    if (
      deferred &&
      fields.name === DEFERRED_TOOL_PLACEHOLDER_NAME &&
      fields.description === DEFERRED_TOOL_PLACEHOLDER_DESCRIPTION
    ) {
      changed = true
      continue
    }
    const strict = stripStrict && fields.strict
    if (!deferred && !strict) {
      result.push(tool)
      continue
    }
    changed = true
    const copy: RequestTool = { ...fields }
    if (deferred) delete copy.defer_loading
    if (strict) delete copy.strict
    result.push(copy as T)
  }
  return changed ? result : tools
}
