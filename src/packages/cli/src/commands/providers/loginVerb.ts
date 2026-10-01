/**
 * `thyrox providers login <provider>`: traduce la invocación a las opciones
 * del corredor de inicio de sesión —navegador, plazo y cuenta a
 * re-autenticar— y su desenlace a un código de salida: 0 al guardar la
 * cuenta, 124 si venció el plazo (el mismo de `timeout(1)`), 1 en cualquier
 * otro fallo. Un proveedor sin flujo de inicio de sesión se rehúsa nombrando
 * los que sí lo tienen.
 *
 * Porte de `runOAuthStart` en `omniroute: bin/cli/commands/oauth.mjs` (MIT).
 */
import type { LoginOptions, LoginOutcome } from '@thyrox/provider/accounts/oauth/loginRunner'

import { flag, hasFlag } from '../../entry/flags.ts'
import { EXIT_FAIL, EXIT_OK, EXIT_USAGE } from '../../exitCodes.ts'
import { firstPositional } from './commandArgs.ts'
import { resolveConnection } from './connectionSelector.ts'
import { canonicalProviderId } from './providerId.ts'
import { publicConnection } from './publicConnection.ts'

type Row = Record<string, unknown>

export const EXIT_TIMEOUT = 124
const VALUE_FLAGS = ['timeout', 'connection'] as const

export interface LoginVerbDeps {
  store: { list(): Row[] }
  write: (text: string) => void
  login: (options: LoginOptions) => Promise<LoginOutcome>
  /** Los proveedores con flujo de inicio de sesión. */
  providers: readonly string[]
}

export async function runLoginVerb(args: string[], deps: LoginVerbDeps): Promise<number> {
  const available = deps.providers.join(', ')
  const spelled = firstPositional(args, VALUE_FLAGS)
  const provider = spelled && canonicalProviderId(spelled)
  if (!provider) {
    deps.write(`Provider id is required. Available: ${available}\n`)
    return EXIT_USAGE
  }
  if (!deps.providers.includes(provider)) {
    deps.write(`Unknown login provider '${provider}'. Available: ${available}\n`)
    return EXIT_USAGE
  }
  const options: LoginOptions = { provider, browser: !hasFlag(args, 'no-browser') }
  const timeout = flag(args, 'timeout')
  if (timeout !== undefined) {
    const timeoutMs = Number(timeout)
    if (!/^\d+$/.test(timeout) || timeoutMs < 1) {
      deps.write('--timeout must be a positive integer (milliseconds).\n')
      return EXIT_USAGE
    }
    options.timeoutMs = timeoutMs
  }
  const selector = flag(args, 'connection')
  if (selector !== undefined) {
    let connection: Row | null
    try {
      connection = resolveConnection(deps.store.list(), selector)
    } catch (error) {
      deps.write(`${error instanceof Error ? error.message : String(error)}\n`)
      return EXIT_FAIL
    }
    if (!connection) {
      deps.write(`No provider connection matches '${selector}'.\n`)
      return EXIT_FAIL
    }
    if (connection.provider !== provider) {
      deps.write(`Connection '${selector}' belongs to provider '${String(connection.provider)}', not '${provider}'.\n`)
      return EXIT_FAIL
    }
    options.connectionId = String(connection.id)
  }
  const outcome = await deps.login(options)
  if (!outcome.ok) {
    deps.write(`Login failed: ${outcome.error}\n`)
    return outcome.timedOut ? EXIT_TIMEOUT : EXIT_FAIL
  }
  if (hasFlag(args, 'json')) deps.write(`${JSON.stringify({ connection: publicConnection(outcome.connection) }, null, 2)}\n`)
  return EXIT_OK
}
