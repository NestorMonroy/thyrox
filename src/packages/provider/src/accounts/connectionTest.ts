/**
 * Prueba y valida una conexión guardada.
 *
 * - Una de cookie web va a la sonda de su sesión; una de clave de API, a la
 *   prueba de su proveedor; una de otro tipo (OAuth, sin autenticación) se
 *   salta, porque sin su clave no hay nada que enviar.
 * - Sólo un veredicto real se guarda: «no soportado» y «saltada» no pisan un
 *   estado bueno con un fallo que la conexión no tiene.
 * - La validación no usa red: dice qué le falta a la fila para poder usarse,
 *   separando lo que la inutiliza (issues) de lo que conviene revisar
 *   (warnings).
 *
 * Porte de `runProviderTest`, `validateConnection` y
 * `updateProviderTestResult` en `omniroute: bin/cli/commands/providers.mjs` y
 * `bin/cli/provider-store.mjs` (MIT). Donde la referencia pide la prueba a su
 * servidor para lo que la CLI no sabe probar, aquí la sonda de cookie web es
 * local.
 */
import type { ApiKeyProbeInput, ApiKeyProbeResult } from './apiKeyProbe.ts'
import type { WebCookieValidation } from './webCookie/webCookieProbe.ts'
import { isWebCookieProvider } from './webCookie/webCookieProviders.ts'

type Row = Record<string, unknown>

export interface ConnectionTestDeps {
  probe: (input: ApiKeyProbeInput) => Promise<ApiKeyProbeResult>
  webCookie?: (request: { provider: string; apiKey?: string }) => Promise<WebCookieValidation>
}

export interface ConnectionTestOutcome {
  valid: boolean
  error: string | null
  statusCode?: number | null
  skipped: boolean
  /** Si el veredicto se guarda en la fila. */
  persist: boolean
}

const asText = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined)

function verdict(result: { valid: boolean; error: string | null; statusCode?: number | null; unsupported?: boolean }): ConnectionTestOutcome {
  const { unsupported, ...rest } = result
  return unsupported ? { ...rest, skipped: true, persist: false } : { ...rest, skipped: false, persist: true }
}

export async function testConnection(row: Row, deps: ConnectionTestDeps): Promise<ConnectionTestOutcome> {
  const provider = String(row.provider ?? '')
  try {
    if (isWebCookieProvider(provider) && deps.webCookie) return verdict(await deps.webCookie({ provider, apiKey: asText(row.apiKey) }))
    if (row.authType !== 'apikey') {
      return { valid: false, error: `No API-key probe for ${asText(row.authType) ?? 'unknown'} connections`, skipped: true, persist: false }
    }
    if (!asText(row.apiKey)) throw new Error(`Connection ${String(row.name)} has no API key configured.`)
    const specific = row.providerSpecificData as Row | null | undefined
    return verdict(await deps.probe({ provider, apiKey: asText(row.apiKey), defaultModel: asText(row.defaultModel) ?? null, baseUrl: asText(specific?.baseUrl) ?? null }))
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error), statusCode: null, skipped: false, persist: true }
  }
}

/** Los campos que un veredicto escribe en la fila, fechados con `nowIso`. */
export function testResultUpdate(result: { valid: boolean; error: string | null; statusCode?: number | null }, nowIso: string): Row {
  if (result.valid) return { testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, lastTested: nowIso }
  return {
    testStatus: 'error',
    lastError: result.error || 'Provider test failed',
    lastErrorAt: nowIso,
    lastErrorType: 'connection_test_failed',
    lastErrorSource: 'upstream',
    errorCode: result.statusCode || null,
    lastTested: nowIso,
  }
}

export function validateConnection(row: Row): { valid: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = []
  const warnings: string[] = []
  if (!row.id) issues.push('Missing id')
  if (!row.provider) issues.push('Missing provider')
  if (!row.authType) warnings.push('Missing auth type')
  if (row.credentialDecryptFailed === true) issues.push('Stored credentials could not be decrypted with the configured key')
  else if (row.authType === 'apikey') {
    if (!asText(row.apiKey)) issues.push(`Connection ${String(row.name)} has no API key configured.`)
  } else if (!row.accessToken && !row.refreshToken) {
    warnings.push('OAuth connection has no access or refresh token visible locally')
  }
  return { valid: issues.length === 0, issues, warnings }
}
