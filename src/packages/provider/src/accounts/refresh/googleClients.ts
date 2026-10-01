/**
 * Los clientes OAuth de Google para el refresco, leídos de sus variables. El
 * configurado es el que el operador declara para iniciar sesión; el de
 * origen es el de la aplicación oficial que emitió un token importado. Ni
 * uno ni otro se incrusta en el código.
 *
 * Porte de la resolución de `PROVIDERS[provider]` y de los clientes de origen
 * que consume `selectGoogleRefreshClient` en
 * `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import { type Environment, readVariable } from '../oauth/flows/clientId.ts'
import { type BuiltinGoogleClients, type GoogleClient, type GoogleOauthClientMarker, selectGoogleRefreshClient } from './googleClientBinding.ts'

type GoogleFamily = 'antigravity' | 'gemini'

const VARIABLES: Record<GoogleFamily, { configured: [string, string]; builtin: [string, string] }> = {
  antigravity: {
    configured: ['THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID', 'THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET'],
    builtin: ['THYROX_ANTIGRAVITY_BUILTIN_OAUTH_CLIENT_ID', 'THYROX_ANTIGRAVITY_BUILTIN_OAUTH_CLIENT_SECRET'],
  },
  gemini: {
    configured: ['THYROX_GEMINI_OAUTH_CLIENT_ID', 'THYROX_GEMINI_OAUTH_CLIENT_SECRET'],
    builtin: ['THYROX_GEMINI_BUILTIN_OAUTH_CLIENT_ID', 'THYROX_GEMINI_BUILTIN_OAUTH_CLIENT_SECRET'],
  },
}

/** `agy` es la misma cuenta de Google que `antigravity`, con otro perfil de cliente. */
export const googleFamily = (provider: string): GoogleFamily => (provider === 'gemini' ? 'gemini' : 'antigravity')

function clientFrom(env: Environment, [idVariable, secretVariable]: [string, string]): GoogleClient | null {
  const clientId = readVariable(env, idVariable)
  const clientSecret = readVariable(env, secretVariable)
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

export function googleConfiguredClient(provider: string, env: Environment): Partial<GoogleClient> {
  const [idVariable, secretVariable] = VARIABLES[googleFamily(provider)].configured
  return { clientId: readVariable(env, idVariable) ?? undefined, clientSecret: readVariable(env, secretVariable) ?? undefined }
}

export function googleBuiltinClients(env: Environment): BuiltinGoogleClients {
  const clients: BuiltinGoogleClients = {}
  for (const family of ['antigravity', 'gemini'] as const) {
    const client = clientFrom(env, VARIABLES[family].builtin)
    if (client) clients[family] = client
  }
  return clients
}

/** El cliente con que se refresca; sin él, el error nombra las variables que faltan. */
export function googleRefreshClient(provider: string, marker: GoogleOauthClientMarker, env: Environment): GoogleClient {
  try {
    return selectGoogleRefreshClient(provider, marker, googleConfiguredClient(provider, env), googleBuiltinClients(env))
  } catch {
    const [idVariable, secretVariable] = VARIABLES[googleFamily(provider)].builtin
    throw new Error(`${idVariable} and ${secretVariable} are not set: declare the OAuth client that issued this ${provider} token to refresh it.`)
  }
}
