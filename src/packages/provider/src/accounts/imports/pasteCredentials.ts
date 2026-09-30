/**
 * La puerta del pegado de credenciales: qué proveedores lo admiten y que el
 * blob se haya emitido para el mismo proveedor al que se pega, para que un
 * blob de uno no se reproduzca contra otro.
 *
 * Porte de `omniroute: src/lib/oauth/pasteCredentials.ts` (MIT).
 */
import { type CredentialBlob, decodeCredentialBlob } from './credentialBlob.ts'

/** Los clientes nativos de Google cuyo consentimiento no termina en un anfitrión remoto; `agy` es el alias de Antigravity. */
export const PASTE_CREDENTIAL_PROVIDERS = new Set(['antigravity', 'agy'])

export function parsePastedCredentials(routeProvider: string, blob: string): CredentialBlob {
  if (!PASTE_CREDENTIAL_PROVIDERS.has(routeProvider)) {
    throw new Error(`paste-credentials not supported for provider: ${routeProvider}. Supported: ${[...PASTE_CREDENTIAL_PROVIDERS].join(', ')}`)
  }
  const decoded = decodeCredentialBlob(blob)
  if (decoded.provider !== routeProvider) {
    throw new Error(`Pasted credential provider mismatch: blob is for "${decoded.provider}" but the route provider is "${routeProvider}"`)
  }
  return decoded
}
