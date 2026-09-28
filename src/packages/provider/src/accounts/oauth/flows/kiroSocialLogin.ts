/**
 * El login social de Kiro (Google o GitHub): la URL de login con PKCE y el
 * intercambio del código. La redirección es `kiro://`, la única que admite el
 * pool de identidades; el código vuelve pegado por quien inicia sesión.
 *
 * Porte de `buildSocialLoginUrl` y `exchangeSocialCode` de
 * `omniroute: src/lib/oauth/services/kiro.ts` (MIT).
 */
const AUTH_SERVICE = 'https://prod.us-east-1.auth.desktop.kiro.dev'
const REDIRECT_URI = 'kiro://kiro.kiroAgent/authenticate-success'
const DEFAULT_EXPIRES_IN_SECONDS = 3600

export interface KiroSocialTokens {
  accessToken: unknown
  refreshToken: unknown
  profileArn: unknown
  expiresIn: unknown
}

export interface KiroSocialLogin {
  buildLoginUrl(identityProvider: 'google' | 'github', codeChallenge: string, state: string): string
  exchangeCode(code: string, codeVerifier: string): Promise<KiroSocialTokens>
}

export function createKiroSocialLogin(deps: { fetch?: typeof globalThis.fetch }): KiroSocialLogin {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    buildLoginUrl(identityProvider, codeChallenge, state) {
      const params = new URLSearchParams({
        idp: identityProvider === 'google' ? 'Google' : 'Github',
        redirect_uri: REDIRECT_URI,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        prompt: 'select_account',
      })
      return `${AUTH_SERVICE}/login?${params.toString()}`
    },

    async exchangeCode(code, codeVerifier) {
      const response = await fetch(`${AUTH_SERVICE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: REDIRECT_URI }),
      })
      if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`)
      const data = (await response.json()) as Record<string, unknown>
      return { accessToken: data.accessToken, refreshToken: data.refreshToken, profileArn: data.profileArn, expiresIn: data.expiresIn || DEFAULT_EXPIRES_IN_SECONDS }
    },
  }
}
