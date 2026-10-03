/**
 * Las dos grafías del proveedor de Anthropic y el id con que se guarda.
 *
 * El store de conexiones lo nombra `claude`: es la clave del flujo de
 * `providers login`, y lo que leen `resolveCredential`
 * (`@thyrox/provider/credentials`), el refresco y la importación de
 * CLIProxyAPI, que ya traduce `anthropic → claude`. La referencia (2.1.283,
 * `Fv` en chunk-wg7ts4cy.js) nombra al upstream `anthropic`, y ése es
 * también el nombre de la receta de la sonda de clave de API. Un usuario
 * escribe cualquiera de las dos; la fila lleva una, y la sonda recibe la suya.
 *
 * El literal repite `ANTHROPIC_PROVIDER_ID` de
 * `provider/src/accounts/imports/anthropicAuthFile.ts`, que el paquete no
 * exporta; la coincidencia la fija por conducta
 * `__tests__/providersAnthropicCredential.test.ts`.
 */
export const ANTHROPIC_STORE_PROVIDER_ID = 'claude'

const ANTHROPIC_API_KEY_PROBE_ID = 'anthropic'

const ANTHROPIC_SPELLINGS: ReadonlySet<string> = new Set([ANTHROPIC_STORE_PROVIDER_ID, ANTHROPIC_API_KEY_PROBE_ID])

function namesAnthropic(provider: string): boolean {
  return ANTHROPIC_SPELLINGS.has(provider.toLowerCase())
}

/** El id con que una grafía de proveedor se guarda y se compara; otro proveedor sólo se recorta. */
export function canonicalProviderId(provider: string): string {
  const trimmed = provider.trim()
  return namesAnthropic(trimmed) ? ANTHROPIC_STORE_PROVIDER_ID : trimmed
}

/** El nombre bajo el que la sonda de clave de API conoce a un proveedor del store. */
export function apiKeyProbeProvider(storeProvider: string): string {
  return storeProvider === ANTHROPIC_STORE_PROVIDER_ID ? ANTHROPIC_API_KEY_PROBE_ID : storeProvider
}
