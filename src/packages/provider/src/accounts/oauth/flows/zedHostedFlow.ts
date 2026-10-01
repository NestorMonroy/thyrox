/**
 * Zed Hosted: el verificador PKCE lleva la clave privada RSA del intento, y
 * el «código» del intercambio es la URL de redirección nativa que Zed abre
 * (`http://127.0.0.1:<puerto>/?user_id=…&access_token=…`, con el token cifrado).
 * Si el inicio de sesión corre en loopback, el puerto nativo es el local para
 * que la redirección vuelva sola; si no, se pega la URL a mano.
 *
 * Porte de `omniroute: src/lib/oauth/providers/zed-hosted.ts` y de
 * `ZED_HOSTED_CONFIG` en `constants/oauth.ts` (MIT).
 */
import { createZedNativeAuthData, decryptZedAccessToken, fetchZedAuthenticatedUser, parseZedCallbackPayload, resolveZedOrganizationId, ZED_DEFAULT_NATIVE_APP_PORT } from '../../zed/zedNativeAuth.ts'
import type { OAuthProviderFlow } from '../oauthFlows.ts'

const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/i

export interface ZedHostedFlowDeps {
  fetch?: typeof globalThis.fetch
  /** El puerto en que escucha el servidor local de inicio de sesión, si hay uno. */
  loopbackPort?: () => number | null
}

/** El puerto local, sólo si la redirección apunta a loopback. */
function localNativeAppPort(redirectUri: string, loopbackPort?: () => number | null): number | null {
  try {
    if (!LOOPBACK_HOST.test(new URL(redirectUri).hostname)) return null
    const port = loopbackPort?.() ?? null
    return port !== null && Number.isInteger(port) && port > 0 ? port : null
  } catch {
    return null
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

export function createZedHostedFlow(deps: ZedHostedFlowDeps = {}): OAuthProviderFlow<null> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: null,
    flowType: 'authorization_code',

    buildAuthUrl: (_config, redirectUri) => {
      const nativeAppPort = localNativeAppPort(redirectUri, deps.loopbackPort) || ZED_DEFAULT_NATIVE_APP_PORT
      const authData = createZedNativeAuthData({}, { nativeAppPort })
      return { authUrl: authData.authUrl, codeVerifier: authData.privateKeyVerifier, redirectUri: `http://127.0.0.1:${authData.nativeAppPort}/` }
    },

    async exchangeToken(_config, code, _redirectUri, codeVerifier) {
      const { userId, encryptedAccessToken } = parseZedCallbackPayload(code)
      const accessToken = decryptZedAccessToken(encryptedAccessToken, codeVerifier)
      const credentials = { accessToken, providerSpecificData: { userId } }
      let email: string | undefined
      let name: string | undefined
      let organizationId = ''
      try {
        const userInfo = await fetchZedAuthenticatedUser(fetch, credentials)
        email = text(userInfo?.email) || text(userInfo?.github_login)
        name = text(userInfo?.name) || text(userInfo?.github_login)
        organizationId = resolveZedOrganizationId(credentials, userInfo)
      } catch {
        // Sin usuario la cuenta sigue sirviendo: la organización se resuelve al primer uso.
      }
      return { access_token: accessToken, user_id: userId, email, name, organization_id: organizationId }
    },

    // Los tokens nativos de Zed son de larga vida: no hay caducidad ni refresco.
    mapTokens: tokens => ({
      accessToken: tokens.access_token,
      name: tokens.name || tokens.email || null,
      email: tokens.email,
      providerSpecificData: { userId: tokens.user_id, organizationId: tokens.organization_id || undefined },
    }),
  }
}
