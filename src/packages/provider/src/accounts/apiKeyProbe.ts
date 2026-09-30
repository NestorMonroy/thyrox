/**
 * Prueba una clave de API contra su proveedor con la petición más barata que
 * la distingue: OpenAI y compatibles primero por `/models` (o por el endpoint
 * autenticado que declaren cuando `/models` es público) y, si eso no decide,
 * por un chat de un token; Anthropic por `/messages`; Google por `/models` con
 * la clave en la URL. Sólo 401/403 declaran la clave inválida y 5xx el
 * proveedor caído; cualquier otra respuesta prueba que la clave abre la
 * puerta. Un proveedor sin receta se declara no soportado, no roto.
 *
 * El modelo de la prueba: el de la conexión, o `THYROX_PROVIDER_TEST_<ID>_MODEL`,
 * o `THYROX_PROVIDER_TEST_MODEL`, o el de la receta.
 *
 * Porte de `testProviderApiKey` en `omniroute: bin/cli/provider-test.mjs` (MIT).
 */
const DEFAULT_TIMEOUT_MS = 15_000
const UNAUTHORIZED = 401
const FORBIDDEN = 403
const FIRST_SERVER_ERROR = 500

type ProbeFormat = 'openai' | 'anthropic' | 'google'

interface ProbeRecipe {
  format: ProbeFormat
  baseUrl: string
  model: string
  /** Endpoint autenticado para los proveedores cuyo `/models` es público. */
  keyCheckPath?: string
}

const PROBE_RECIPES: Readonly<Record<string, ProbeRecipe>> = {
  openai: { format: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  openrouter: { format: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', keyCheckPath: '/auth/key' },
  groq: { format: 'openai', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  mistral: { format: 'openai', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
  anthropic: { format: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-haiku-latest' },
  google: { format: 'google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash' },
}

export interface ApiKeyProbeInput {
  provider: string
  apiKey?: string | null
  defaultModel?: string | null
  baseUrl?: string | null
}

export interface ApiKeyProbeResult {
  valid: boolean
  error: string | null
  statusCode?: number | null
  unsupported?: boolean
}

export interface ApiKeyProbeDeps {
  fetch?: typeof globalThis.fetch
  env?: Record<string, string | undefined>
  timeoutMs?: number
}

const joinUrl = (baseUrl: string, suffix: string) => `${baseUrl.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`

export function resolveProbeModel(input: Pick<ApiKeyProbeInput, 'provider' | 'defaultModel'>, recipeModel: string, env: Record<string, string | undefined>): string {
  const providerVariable = `THYROX_PROVIDER_TEST_${input.provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_MODEL`
  return input.defaultModel || env[providerVariable] || env.THYROX_PROVIDER_TEST_MODEL || recipeModel
}

function classify(response: Response): ApiKeyProbeResult {
  if (response.ok) return { valid: true, error: null, statusCode: response.status }
  if (response.status === UNAUTHORIZED || response.status === FORBIDDEN) return { valid: false, error: 'Invalid API key', statusCode: response.status }
  if (response.status >= FIRST_SERVER_ERROR) return { valid: false, error: `Provider unavailable (${response.status})`, statusCode: response.status }
  return { valid: true, error: null, statusCode: response.status }
}

export async function testProviderApiKey(input: ApiKeyProbeInput, deps: ApiKeyProbeDeps = {}): Promise<ApiKeyProbeResult> {
  if (!input.apiKey) return { valid: false, error: 'Missing API key', statusCode: null }
  const recipe = PROBE_RECIPES[input.provider]
  if (!recipe) return { valid: false, error: 'Provider test not supported', unsupported: true }
  const fetch = deps.fetch ?? globalThis.fetch
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const baseUrl = input.baseUrl || recipe.baseUrl
  const model = resolveProbeModel(input, recipe.model, deps.env ?? process.env)
  const send = (url: string, init: RequestInit) => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  const oneTokenChat = JSON.stringify({ model, messages: [{ role: 'user', content: 'test' }], max_tokens: 1 })
  try {
    if (recipe.format === 'openai') {
      const headers = { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' }
      const probe = await send(joinUrl(baseUrl, recipe.keyCheckPath ?? '/models'), { method: 'GET', headers })
      if (probe.ok || probe.status === UNAUTHORIZED || probe.status === FORBIDDEN) return classify(probe)
      return classify(await send(joinUrl(baseUrl, '/chat/completions'), { method: 'POST', headers, body: oneTokenChat }))
    }
    if (recipe.format === 'anthropic') {
      const headers = { 'x-api-key': input.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
      return classify(await send(joinUrl(baseUrl, '/messages'), { method: 'POST', headers, body: oneTokenChat }))
    }
    const url = new URL(joinUrl(baseUrl, '/models'))
    url.searchParams.set('key', input.apiKey)
    return classify(await send(url.toString(), { method: 'GET' }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { valid: false, error: message || 'Provider test failed', statusCode: null }
  }
}
