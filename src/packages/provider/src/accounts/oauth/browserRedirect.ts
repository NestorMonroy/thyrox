/**
 * La redirección de un login de Google en un despliegue remoto: el cliente
 * de escritorio sólo admite loopback, pero con un cliente propio y una URL
 * pública declarada la redirección puede ir a esa URL, y el navegador vuelve
 * al proxy en vez de quedarse esperando en `localhost`.
 *
 * Porte de `resolveBrowserOAuthRedirectUri` de
 * `omniroute: src/lib/oauth/providers.ts` (MIT).
 */
import { type Environment, readVariable } from './flows/clientId.ts'

const GOOGLE_BROWSER_PROVIDERS = new Set(['antigravity', 'agy'])
const LOOPBACK_HOSTNAME = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i
const DEFAULT_CALLBACK_PATH = '/callback'

function hasOperatorGoogleClient(env: Environment): boolean {
  return Boolean(readVariable(env, 'THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID') && readVariable(env, 'THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET'))
}

export function resolveBrowserRedirectUri(provider: string, redirectUri: string, env: Environment = process.env): string {
  if (!GOOGLE_BROWSER_PROVIDERS.has(provider) || !hasOperatorGoogleClient(env)) return redirectUri
  const publicBaseUrl = readVariable(env, 'THYROX_PUBLIC_BASE_URL')?.replace(/\/+$/, '')
  if (!publicBaseUrl) return redirectUri
  try {
    const requested = new URL(redirectUri)
    if (!LOOPBACK_HOSTNAME.test(requested.hostname)) return redirectUri
    const path = requested.pathname && requested.pathname !== '/' ? requested.pathname : DEFAULT_CALLBACK_PATH
    return `${publicBaseUrl}${path}${requested.search}`
  } catch {
    return redirectUri
  }
}
