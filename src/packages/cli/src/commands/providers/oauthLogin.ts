/**
 * El inicio de sesión real de `thyrox providers login`: compone el corredor
 * (`@thyrox/provider/accounts/oauth/loginRunner`) con los flujos de los
 * proveedores, el servidor de retorno local, el navegador del sistema y la
 * lectura del token importado —oculta en una terminal, por stdin si no la
 * hay—. Los dobles de las pruebas sustituyen esta pieza entera.
 */
import { startCallbackServer } from '@thyrox/provider/accounts/oauth/callbackServer'
import { createOAuthFlowRegistry } from '@thyrox/provider/accounts/oauth/flowRegistry'
import { type LoginOptions, type LoginOutcome, type LoginRunnerDeps, runOAuthLogin } from '@thyrox/provider/accounts/oauth/loginRunner'
import { createOAuthFlows } from '@thyrox/provider/accounts/oauth/oauthFlows'
import { openBrowser } from '@thyrox/storage/browser.js'

export interface OAuthLoginIo {
  write: (text: string) => void
  interactive: boolean
  promptSecret: (question: string) => Promise<string>
  readStdin: () => Promise<string>
}

export function createOAuthLogin(io: OAuthLoginIo): (store: LoginRunnerDeps['store'], options: LoginOptions) => Promise<LoginOutcome> {
  return (store, options) =>
    runOAuthLogin(options, {
      flows: createOAuthFlows(createOAuthFlowRegistry()),
      store,
      write: io.write,
      openBrowser: async url => void (await openBrowser(url)),
      readToken: async () => (io.interactive ? io.promptSecret('Paste the access token: ') : (await io.readStdin()).trim()),
      startCallbackServer,
      sleep: ms => Bun.sleep(ms),
      now: () => Date.now(),
    })
}
