/**
 * La clave con que arranca el servidor: la dada, o la que resuelve su
 * identificador. Sin ninguna, el servidor hereda las claves del proxy.
 */
import { resolveStartApiKey } from '../../../schemas/cli.ts'
import { errorResponse } from '../../http.ts'

export type KeyLookup = (id: string) => Promise<string | null>

/** La clave del arranque; `null` sólo cuando se pidió una que no existe. */
export async function startKey(lookup: KeyLookup, keyId?: string | null, apiKey?: string | null): Promise<string | null> {
  const key = await resolveStartApiKey(keyId, apiKey, lookup)
  if (key) return key
  return keyId ? null : ''
}

export function missingKeyResponse(): Response {
  return errorResponse({ status: 400, message: 'Missing apiKey: provide a valid apiKey or a resolvable keyId' })
}
