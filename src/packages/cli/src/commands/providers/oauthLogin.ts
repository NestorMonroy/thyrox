/**
 * El inicio de sesión real de `thyrox providers login`: compone el corredor
 * (`@thyrox/provider/accounts/oauth/loginRunner`) con los flujos de los
 * proveedores, el servidor de retorno local, el navegador del sistema y la
 * lectura del token importado —oculta en una terminal, por stdin si no la
 * hay—. Los dobles de las pruebas sustituyen el entorno, el servidor y el
 * navegador.
 *
 * Un flujo cuyo client id sale de una variable la exige ANTES de correr: el
 * consumidor la declara (`THYROX_CLAUDE_OAUTH_CLIENT_ID` para `claude`) y
 * nunca se publica una. El corredor ya rehusaba sin ella, pero después de
 * abrir el servidor de retorno; aquí no se abre nada.
 */
import { type CallbackServer, type CallbackServerOptions, startCallbackServer } from '@thyrox/provider/accounts/oauth/callbackServer'
import { createOAuthFlowRegistry } from '@thyrox/provider/accounts/oauth/flowRegistry'
import { type LoginOptions, type LoginOutcome, type LoginRunnerDeps, runOAuthLogin } from '@thyrox/provider/accounts/oauth/loginRunner'
import { createOAuthFlows, type OAuthProviderFlow } from '@thyrox/provider/accounts/oauth/oauthFlows'
import { openBrowser } from '@thyrox/storage/browser.js'

export interface OAuthLoginIo {
  write: (text: string) => void
  interactive: boolean
  promptSecret: (question: string) => Promise<string>
  readStdin: () => Promise<string>
}

export interface OAuthLoginDeps {
  env?: Record<string, string | undefined>
  openBrowser?: (url: string) => Promise<void>
  startCallbackServer?: (options: CallbackServerOptions) => Promise<CallbackServer>
}

type ClientIdConfig = { clientId?: string | null; clientIdVariable?: string }

/** La variable del client id que el flujo espera y nadie declaró, o `undefined` si no falta ninguna. */
function undeclaredClientIdVariable(flow: OAuthProviderFlow | undefined): string | undefined {
  const config = (flow?.config ?? {}) as ClientIdConfig
  const requiresClientId = typeof config.clientIdVariable === 'string'
  return requiresClientId && !config.clientId ? config.clientIdVariable : undefined
}

export function createOAuthLogin(io: OAuthLoginIo, deps: OAuthLoginDeps = {}): (store: LoginRunnerDeps['store'], options: LoginOptions) => Promise<LoginOutcome> {
  const registry = createOAuthFlowRegistry({ env: deps.env })
  return async (store, options) => {
    const missing = undeclaredClientIdVariable(registry[options.provider])
    if (missing) return { ok: false, error: `${missing} is not set: declare the OAuth client id of this provider to log in.` }
    return runOAuthLogin(options, {
      flows: createOAuthFlows(registry),
      store,
      write: io.write,
      openBrowser: deps.openBrowser ?? (async url => void (await openBrowser(url))),
      readToken: async () => (io.interactive ? io.promptSecret('Paste the access token: ') : (await io.readStdin()).trim()),
      startCallbackServer: deps.startCallbackServer ?? startCallbackServer,
      sleep: ms => Bun.sleep(ms),
      now: () => Date.now(),
    })
  }
}
