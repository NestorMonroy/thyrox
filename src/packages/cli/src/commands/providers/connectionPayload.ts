/**
 * Los datos de una conexión de clave de API nueva. El proveedor se guarda por
 * su id canónico (`providerId.ts`: `anthropic` y `claude` son uno); el
 * nombre, si falta, es ese id; la prioridad es un entero positivo; los datos
 * propios del proveedor, un objeto JSON.
 *
 * Porte de `buildProviderPayload` en `omniroute: bin/cli/commands/provider-crud.mjs` (MIT).
 */
import { canonicalProviderId } from './providerId.ts'

type Row = Record<string, unknown>

export interface ConnectionPayloadOptions {
  name?: unknown
  defaultModel?: unknown
  priority?: unknown
  providerSpecificData?: unknown
}

const isBlank = (value: unknown) => value === undefined || value === null || String(value).trim() === ''

/** La prioridad declarada, o por qué no lo es. */
export function parsePriority(value: unknown): number {
  const priority = Number(value)
  if (isBlank(value) || !Number.isInteger(priority) || priority < 1) throw new Error('--priority must be a positive integer.')
  return priority
}

function parseProviderData(value: unknown): Row {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('must be a JSON object')
    return parsed as Row
  } catch (error) {
    throw new Error(`--provider-specific-data must be a JSON object (${error instanceof Error ? error.message : String(error)})`)
  }
}

export function buildConnectionPayload(provider: string, options: ConnectionPayloadOptions, credential: string | undefined): Row {
  const providerId = canonicalProviderId(provider)
  const payload: Row = { provider: providerId, name: String(isBlank(options.name) ? providerId : options.name).trim(), authType: 'apikey' }
  if (!isBlank(credential)) payload.apiKey = credential
  if (!isBlank(options.defaultModel)) payload.defaultModel = String(options.defaultModel).trim()
  if (!isBlank(options.priority)) payload.priority = parsePriority(options.priority)
  if (options.providerSpecificData !== undefined) payload.providerSpecificData = parseProviderData(options.providerSpecificData)
  return payload
}
