/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/xaaIdpLogin.ts` — sus
 * 13 exportaciones (1 tipo de settings, 1 tipo de opciones, 11 funciones),
 * ninguna omitida.
 *
 * Repuntados (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/config/env/utils` (`isEnvTruthy`),
 * `@thyrox/local-observability/errorHelpers.js` (`toError`) y
 * `@thyrox/local-observability/logging` (`logMCPDebug`).
 *
 * `openBrowser` (`@claude-code-how-works/storage/browser.js` —
 * `@thyrox/storage` no declara ese subpath, sólo `./cache-paths`,
 * `./tempfile.js`, `./path.js`, `./windowsPaths.js`, `./xdg.js`,
 * `./glob.js`), `getPlatform` (`@claude-code-how-works/config/platform` —
 * ausente del `exports` de `@thyrox/config`) y `getSecureStorage`
 * (`@claude-code-how-works/storage/secureStorage.js` — mismo caso que
 * `browser.js`) y `getInitialSettings`
 * (`@claude-code-how-works/config/settings` — ausente del `exports` de
 * `@thyrox/config`) NO resuelven — verificado contra la lista completa de
 * cada paquete. Los cuatro se usan sólo dentro de cuerpos de función (nunca
 * a nivel de módulo), así que se envuelven con `require()` diferido: un
 * `import` estático de un paquete cuya base (`@claude-code-how-works/*`) no
 * existe en este árbol hace fallar la carga del MÓDULO ENTERO (`Cannot find
 * module`, medido con `bun -e "import(...)"` antes de esta corrección), no
 * sólo las funciones que los usan. Mismo patrón que ya evita
 * `appStateHooks.ts` de este puerto.
 *
 * `@modelcontextprotocol/sdk/client/auth.js` y
 * `@modelcontextprotocol/sdk/shared/auth.js` — declarados en
 * `package.json`, sin `node_modules` enlazado todavía (hueco de entorno
 * preexistente, confirmado con `ls`, no del porte). `xss` — mismo caso,
 * declarado en `package.json`, sin `node_modules` enlazado. Los tres se
 * dejan como imports estáticos porque son dependencias externas reales del
 * paquete (no especificadores `@claude-code-how-works/*` propios de ccnmt),
 * y `OpenIdProviderDiscoveryMetadataSchema` (un schema Zod, usado como
 * valor dentro de `discoverOidc`) no tiene un sustituto local razonable —
 * es el contrato de validación del propio SDK MCP.
 *
 * XAA IdP Login — obtiene un id_token OIDC de un IdP empresarial vía el
 * flujo estándar authorization_code + PKCE, y lo cachea por issuer del IdP.
 *
 * Éste es el "un solo pop de navegador" en la propuesta de valor de XAA: un
 * login de IdP → N autenticaciones silenciosas de servidor MCP. El id_token
 * se cachea en el keychain y se reusa hasta que expira.
 */

import {
  exchangeAuthorization,
  startAuthorization,
} from '@modelcontextprotocol/sdk/client/auth.js'
import {
  type OAuthClientInformation,
  type OpenIdProviderDiscoveryMetadata,
  OpenIdProviderDiscoveryMetadataSchema,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { randomBytes } from 'crypto'
import { createServer, type Server } from 'http'
import { parse } from 'url'
import xss from 'xss'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { toError } from '@thyrox/local-observability/errorHelpers.js'
import { logMCPDebug } from '@thyrox/local-observability/logging'
import { jsonParse } from '@thyrox/local-observability/slowOperations.js'
import { buildRedirectUri, findAvailablePort } from './oauthPort.js'

type XaaSecureStorageEntry = { idToken: string; expiresAt: number }
type XaaSecureStorageConfigEntry = { clientSecret: string }
type XaaSecureStorageData = {
  mcpXaaIdp?: Record<string, XaaSecureStorageEntry>
  mcpXaaIdpConfig?: Record<string, XaaSecureStorageConfigEntry>
  [key: string]: unknown
}

function requireStorageBrowser(): {
  openBrowser: (url: string) => Promise<void>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/browser.js')
}

function requireConfigPlatform(): {
  getPlatform: () => 'windows' | 'macos' | 'linux'
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/platform')
}

function requireStorageSecureStorage(): {
  getSecureStorage: () => {
    read: () => XaaSecureStorageData | undefined
    update: (
      data: XaaSecureStorageData,
    ) => { success: boolean; warning?: string }
  }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/secureStorage.js')
}

function requireConfigSettings(): {
  getInitialSettings: () => Record<string, unknown>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/settings')
}

export function isXaaEnabled(): boolean {
  return isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_XAA)
}

export type XaaIdpSettings = {
  issuer: string
  clientId: string
  callbackPort?: number
}

/**
 * Accesor tipado para settings.xaaIdp. El campo está gateado por entorno en
 * SettingsSchema, así que no aparece en los tipos/docs del SDK — lo que
 * significa que el tipo inferido de settings no lo tiene en tiempo de
 * compilación. Éste es el único cast.
 */
export function getXaaIdpSettings(): XaaIdpSettings | undefined {
  return (requireConfigSettings().getInitialSettings() as {
    xaaIdp?: XaaIdpSettings
  }).xaaIdp
}

const IDP_LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const IDP_REQUEST_TIMEOUT_MS = 30000
const ID_TOKEN_EXPIRY_BUFFER_S = 60

export type IdpLoginOptions = {
  idpIssuer: string
  idpClientId: string
  /**
   * Client secret opcional del IdP para clientes confidenciales. El método
   * de auth (client_secret_post, client_secret_basic, none) se elige según
   * la metadata del IdP. Se omite para clientes públicos (sólo PKCE).
   */
  idpClientSecret?: string
  /**
   * Puerto de callback fijo. Si se omite, se elige un puerto al azar.
   * Usar esto cuando el cliente del IdP esté pre-registrado con una URI de
   * redirect de loopback específica (RFC 8252 §7.3 dice que los IdP
   * DEBERÍAN aceptar cualquier puerto para http://localhost, pero muchos no
   * lo hacen).
   */
  callbackPort?: number
  /** Se llama con la URL de autorización antes (o en vez) de abrir el navegador */
  onAuthorizationUrl?: (url: string) => void
  /** Si es true, no abre el navegador automáticamente — sólo llama a onAuthorizationUrl */
  skipBrowserOpen?: boolean
  abortSignal?: AbortSignal
}

/**
 * Normaliza una URL de issuer de IdP para usarla como clave de caché:
 * quita las barras finales, host en minúsculas. Los issuers de la
 * configuración y del discovery OIDC pueden diferir cosméticamente pero
 * deben caer en el mismo slot de caché. Se exporta para que el comando de
 * setup pueda comparar issuers usando la misma normalización que las
 * operaciones de keychain.
 */
export function issuerKey(issuer: string): string {
  try {
    const u = new URL(issuer)
    u.pathname = u.pathname.replace(/\/+$/, '')
    u.host = u.host.toLowerCase()
    return u.toString()
  } catch {
    return issuer.replace(/\/+$/, '')
  }
}

/**
 * Lee un id_token cacheado para el issuer de IdP dado desde el
 * almacenamiento seguro. Devuelve undefined si falta o está dentro de
 * ID_TOKEN_EXPIRY_BUFFER_S de expirar.
 */
export function getCachedIdpIdToken(idpIssuer: string): string | undefined {
  const storage = requireStorageSecureStorage().getSecureStorage()
  const data = storage.read()
  const entry = data?.mcpXaaIdp?.[issuerKey(idpIssuer)]
  if (!entry) return undefined
  const remainingMs = entry.expiresAt - Date.now()
  if (remainingMs <= ID_TOKEN_EXPIRY_BUFFER_S * 1000) return undefined
  return entry.idToken
}

function saveIdpIdToken(
  idpIssuer: string,
  idToken: string,
  expiresAt: number,
): void {
  const storage = requireStorageSecureStorage().getSecureStorage()
  const existing = storage.read() || {}
  storage.update({
    ...existing,
    mcpXaaIdp: {
      ...existing.mcpXaaIdp,
      [issuerKey(idpIssuer)]: { idToken, expiresAt },
    },
  })
}

/**
 * Guarda un id_token obtenido externamente en la caché de XAA — el slot
 * exacto que getCachedIdpIdToken/acquireIdpIdToken leen. Se usa en pruebas
 * de conformidad donde el IdP simulado entrega un token pre-firmado pero no
 * sirve /authorize.
 *
 * Parsea el claim exp del JWT para el TTL de la caché (igual que
 * acquireIdpIdToken). Devuelve el expiresAt que calculó para que el
 * llamador pueda reportarlo.
 */
export function saveIdpIdTokenFromJwt(
  idpIssuer: string,
  idToken: string,
): number {
  const expFromJwt = jwtExp(idToken)
  const expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + 3600 * 1000
  saveIdpIdToken(idpIssuer, idToken, expiresAt)
  return expiresAt
}

export function clearIdpIdToken(idpIssuer: string): void {
  const storage = requireStorageSecureStorage().getSecureStorage()
  const existing = storage.read()
  const key = issuerKey(idpIssuer)
  if (!existing?.mcpXaaIdp?.[key]) return
  delete existing.mcpXaaIdp[key]
  storage.update(existing)
}

/**
 * Guarda un client secret de IdP en el almacenamiento seguro, con clave por
 * issuer del IdP. Separado de los secretos AS del servidor MCP — dominio de
 * confianza distinto. Devuelve el resultado de la actualización de
 * almacenamiento para que los llamadores puedan mostrar fallas de keychain
 * (keychain bloqueado, `security` con salida distinta de cero) en vez de
 * descartar el secreto en silencio y fallar después con invalid_client.
 */
export function saveIdpClientSecret(
  idpIssuer: string,
  clientSecret: string,
): { success: boolean; warning?: string } {
  const storage = requireStorageSecureStorage().getSecureStorage()
  const existing = storage.read() || {}
  return storage.update({
    ...existing,
    mcpXaaIdpConfig: {
      ...existing.mcpXaaIdpConfig,
      [issuerKey(idpIssuer)]: { clientSecret },
    },
  })
}

/**
 * Lee el client secret del IdP para el issuer dado desde el almacenamiento
 * seguro.
 */
export function getIdpClientSecret(idpIssuer: string): string | undefined {
  const storage = requireStorageSecureStorage().getSecureStorage()
  const data = storage.read()
  return data?.mcpXaaIdpConfig?.[issuerKey(idpIssuer)]?.clientSecret
}

/**
 * Elimina el client secret del IdP para el issuer dado del almacenamiento
 * seguro. Usado por `claude mcp xaa clear`.
 */
export function clearIdpClientSecret(idpIssuer: string): void {
  const storage = requireStorageSecureStorage().getSecureStorage()
  const existing = storage.read()
  const key = issuerKey(idpIssuer)
  if (!existing?.mcpXaaIdpConfig?.[key]) return
  delete existing.mcpXaaIdpConfig[key]
  storage.update(existing)
}

// OIDC Discovery §4.1 dice `{issuer}/.well-known/openid-configuration` —
// AÑADIR la ruta, no reemplazarla. `new URL('/.well-known/...', issuer)`
// con una barra inicial es una referencia de ruta absoluta WHATWG y
// descarta el pathname del issuer, rompiendo Azure AD
// (`login.microsoftonline.com/{tenant}/v2.0`), los servidores de auth
// personalizados de Okta y los realms de Keycloak. Base con barra final +
// ruta relativa es el arreglo. Se exporta porque auth.ts necesita el mismo
// discovery.
export async function discoverOidc(
  idpIssuer: string,
): Promise<OpenIdProviderDiscoveryMetadata> {
  const base = idpIssuer.endsWith('/') ? idpIssuer : idpIssuer + '/'
  const url = new URL('.well-known/openid-configuration', base)
  // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(IDP_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(
      `XAA IdP: OIDC discovery failed: HTTP ${res.status} at ${url}`,
    )
  }
  // Los portales cautivos y las páginas de auth de proxy devuelven 200 con
  // HTML. res.json() lanza un SyntaxError crudo antes de que safeParse
  // pueda dar un mensaje útil.
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error(
      `XAA IdP: OIDC discovery returned non-JSON at ${url} (captive portal or proxy?)`,
    )
  }
  const parsed = OpenIdProviderDiscoveryMetadataSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(`XAA IdP: invalid OIDC metadata: ${parsed.error.message}`)
  }
  if (new URL(parsed.data.token_endpoint).protocol !== 'https:') {
    throw new Error(
      `XAA IdP: refusing non-HTTPS token endpoint: ${parsed.data.token_endpoint}`,
    )
  }
  return parsed.data
}

/**
 * Decodifica el claim exp de un JWT sin verificar su firma. Devuelve
 * undefined si el parseo falla o exp está ausente. Se usa sólo para derivar
 * un TTL de caché.
 *
 * Por qué no hay validación de firma/iss/aud/nonce: según SEP-990, este
 * id_token es el subject_token de RFC 8693 en un token-exchange en el
 * propio token endpoint del IdP. El IdP valida su propio token ahí. Un
 * atacante que pueda acuñar un token que engañe al IdP no necesita
 * engañarnos primero; uno que no pueda, nos entrega basura y recibe un 401
 * del IdP. El seam de inyección --id-token es igual de seguro: input malo →
 * se rechaza después, sin escalada de privilegios. La verificación del lado
 * cliente añadiría código y ninguna seguridad.
 */
function jwtExp(jwt: string): number | undefined {
  const parts = jwt.split('.')
  if (parts.length !== 3) return undefined
  try {
    const payload = jsonParse(
      Buffer.from(parts[1]!, 'base64url').toString('utf-8'),
    ) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : undefined
  } catch {
    return undefined
  }
}

/**
 * Espera el código de autorización OAuth en un servidor de callback local.
 * Devuelve el código en cuanto /callback recibe un state que coincide.
 *
 * `onListening` dispara después de que el socket ya está enlazado — usarlo
 * para diferir la apertura del navegador de modo que EADDRINUSE aparezca
 * antes de que se abra una pestaña espuria.
 */
function waitForCallback(
  port: number,
  expectedState: string,
  abortSignal: AbortSignal | undefined,
  onListening: () => void,
): Promise<string> {
  let server: Server | null = null
  let timeoutId: NodeJS.Timeout | null = null
  let abortHandler: (() => void) | null = null
  const cleanup = () => {
    server?.removeAllListeners()
    // Defensivo: removeAllListeners() quita el handler de error, así que se
    // traga cualquier error tardío durante el close.
    server?.on('error', () => {})
    server?.close()
    server = null
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (abortSignal && abortHandler) {
      abortSignal.removeEventListener('abort', abortHandler)
      abortHandler = null
    }
  }
  return new Promise<string>((resolve, reject) => {
    let resolved = false
    const resolveOnce = (v: string) => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve(v)
    }
    const rejectOnce = (e: Error) => {
      if (resolved) return
      resolved = true
      cleanup()
      reject(e)
    }

    if (abortSignal) {
      abortHandler = () => rejectOnce(new Error('XAA IdP: login cancelled'))
      if (abortSignal.aborted) {
        abortHandler()
        return
      }
      abortSignal.addEventListener('abort', abortHandler, { once: true })
    }

    server = createServer((req, res) => {
      const parsed = parse(req.url || '', true)
      if (parsed.pathname !== '/callback') {
        res.writeHead(404)
        res.end()
        return
      }
      const code = parsed.query.code as string | undefined
      const state = parsed.query.state as string | undefined
      const err = parsed.query.error as string | undefined

      if (err) {
        const desc = parsed.query.error_description as string | undefined
        const safeErr = xss(err)
        const safeDesc = desc ? xss(desc) : ''
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(
          `<html><body><h3>IdP login failed</h3><p>${safeErr}</p><p>${safeDesc}</p></body></html>`,
        )
        rejectOnce(new Error(`XAA IdP: ${err}${desc ? ` — ${desc}` : ''}`))
        return
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<html><body><h3>State mismatch</h3></body></html>')
        rejectOnce(new Error('XAA IdP: state mismatch (possible CSRF)'))
        return
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<html><body><h3>Missing code</h3></body></html>')
        rejectOnce(new Error('XAA IdP: callback missing code'))
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(
        '<html><body><h3>IdP login complete — you can close this window.</h3></body></html>',
      )
      resolveOnce(code)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        const findCmd =
          requireConfigPlatform().getPlatform() === 'windows'
            ? `netstat -ano | findstr :${port}`
            : `lsof -ti:${port} -sTCP:LISTEN`
        rejectOnce(
          new Error(
            `XAA IdP: callback port ${port} is already in use. Run \`${findCmd}\` to find the holder.`,
          ),
        )
      } else {
        rejectOnce(new Error(`XAA IdP: callback server failed: ${err.message}`))
      }
    })

    server.listen(port, '127.0.0.1', () => {
      try {
        onListening()
      } catch (e) {
        rejectOnce(toError(e))
      }
    })
    server.unref()
    timeoutId = setTimeout(
      rej => rej(new Error('XAA IdP: login timed out')),
      IDP_LOGIN_TIMEOUT_MS,
      rejectOnce,
    )
    timeoutId.unref()
  })
}

/**
 * Obtiene un id_token del IdP: devuelve el cacheado si es válido, si no
 * corre el flujo completo de authorization_code + PKCE OIDC (un solo pop de
 * navegador).
 */
export async function acquireIdpIdToken(
  opts: IdpLoginOptions,
): Promise<string> {
  const { idpIssuer, idpClientId } = opts

  const cached = getCachedIdpIdToken(idpIssuer)
  if (cached) {
    logMCPDebug('xaa', `Using cached id_token for ${idpIssuer}`)
    return cached
  }

  logMCPDebug('xaa', `No cached id_token for ${idpIssuer}; starting OIDC login`)

  const metadata = await discoverOidc(idpIssuer)
  const port = opts.callbackPort ?? (await findAvailablePort())
  const redirectUri = buildRedirectUri(port)
  const state = randomBytes(32).toString('base64url')
  const clientInformation: OAuthClientInformation = {
    client_id: idpClientId,
    ...(opts.idpClientSecret ? { client_secret: opts.idpClientSecret } : {}),
  }

  const { authorizationUrl, codeVerifier } = await startAuthorization(
    idpIssuer,
    {
      metadata,
      clientInformation,
      redirectUrl: redirectUri,
      scope: 'openid',
      state,
    },
  )

  // Abre el navegador sólo después de que el socket ya está enlazado —
  // listen() es async, y en el camino de callbackPort fijo, EADDRINUSE si
  // no aparece después de que una pestaña espuria ya se abrió. Refleja el
  // patrón de auth.ts de envolver sdkAuth dentro del callback de
  // server.listen.
  const authorizationCode = await waitForCallback(
    port,
    state,
    opts.abortSignal,
    () => {
      if (opts.onAuthorizationUrl) {
        opts.onAuthorizationUrl(authorizationUrl.toString())
      }
      if (!opts.skipBrowserOpen) {
        logMCPDebug('xaa', `Opening browser to IdP authorization endpoint`)
        void requireStorageBrowser().openBrowser(authorizationUrl.toString())
      }
    },
  )

  const tokens = await exchangeAuthorization(idpIssuer, {
    metadata,
    clientInformation,
    authorizationCode,
    codeVerifier,
    redirectUri,
    fetchFn: (url, init) =>
      // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
      fetch(url, {
        ...init,
        signal: AbortSignal.timeout(IDP_REQUEST_TIMEOUT_MS),
      }),
  })
  if (!tokens.id_token) {
    throw new Error(
      'XAA IdP: token response missing id_token (check scope=openid)',
    )
  }

  // Prefiere el propio claim exp del id_token; recae en expires_in. Éste
  // último es para el access_token y puede diferir de la vida del
  // id_token. Si ninguno está presente, por defecto 1h.
  const expFromJwt = jwtExp(tokens.id_token)
  const expiresAt = expFromJwt
    ? expFromJwt * 1000
    : Date.now() + (tokens.expires_in ?? 3600) * 1000

  saveIdpIdToken(idpIssuer, tokens.id_token, expiresAt)
  logMCPDebug(
    'xaa',
    `Cached id_token for ${idpIssuer} (expires ${new Date(expiresAt).toISOString()})`,
  )

  return tokens.id_token
}
