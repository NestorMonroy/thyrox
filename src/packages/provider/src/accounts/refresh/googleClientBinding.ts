/**
 * El cliente OAuth con que se refresca un token de Google. Google ata cada
 * refresh token al cliente que lo emitió y contesta a cualquier otro con
 * `unauthorized_client`: una conexión autorizada con un cliente propio sigue
 * con él mientras sea el configurado; si no, vuelve al cliente de su proveedor.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/googleClientBinding.ts` (MIT).
 */
export interface GoogleClient {
  clientId: string
  clientSecret: string
}

/** Lo que se registró al autorizar: `builtin`, o `custom:<client id literal>`. */
export type GoogleOauthClientMarker = 'builtin' | `custom:${string}` | undefined

/** El cliente de cada familia de Google; `agy` comparte el de `antigravity`. */
export interface BuiltinGoogleClients {
  antigravity?: GoogleClient
  gemini?: GoogleClient
}

const CUSTOM_PREFIX = 'custom:'

function builtinClientFor(provider: string, builtinClients: BuiltinGoogleClients): GoogleClient {
  const family = provider === 'agy' ? 'antigravity' : provider
  const client = family === 'antigravity' || family === 'gemini' ? builtinClients[family] : undefined
  if (!client) throw new Error(`no builtin OAuth client registered for provider: ${provider}`)
  return client
}

/**
 * El cliente propio sólo si la marca guarda su id literal y sigue siendo el
 * configurado, con secreto; si no, el del proveedor de la conexión.
 */
export function selectGoogleRefreshClient(provider: string, oauthClientMarker: GoogleOauthClientMarker, configuredClient: { clientId?: string; clientSecret?: string } | null | undefined, builtinClients: BuiltinGoogleClients): GoogleClient {
  if (typeof oauthClientMarker === 'string' && oauthClientMarker.startsWith(CUSTOM_PREFIX) && oauthClientMarker.slice(CUSTOM_PREFIX.length) === configuredClient?.clientId && configuredClient.clientSecret) {
    return { clientId: configuredClient.clientId, clientSecret: configuredClient.clientSecret }
  }
  return builtinClientFor(provider, builtinClients)
}
