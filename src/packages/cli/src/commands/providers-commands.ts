/**
 * `thyrox providers`: las conexiones de proveedor desde la CLI. `list` las
 * muestra sin secretos; `remove` borra una, resuelta por su selector, tras
 * confirmar; `test`, `test-all` y `validate` las prueban o las revisan
 * (`./providers/testVerbs.ts`); `add`, `edit` e `import` las escriben
 * (`./providers/writeVerbs.ts`); `login` inicia sesión en un proveedor OAuth
 * (`./providers/loginVerb.ts`). En stdin no interactiva la confirmación sólo la da `--yes`, para
 * que un guion no borre por un `y` que nadie escribió.
 *
 * Porte de `runListCommand` (`omniroute: bin/cli/commands/providers.mjs`) y
 * de `runProviderRemoveCommand` y `confirmRemoval`
 * (`bin/cli/commands/provider-crud.mjs`), MIT. Aquí el store es local: no
 * hay servidor remoto al que pedir el borrado.
 */
import fs from 'node:fs'
import { createInterface } from 'node:readline/promises'

import { testProviderApiKey } from '@thyrox/provider/accounts/apiKeyProbe'
import type { ConnectionTestDeps } from '@thyrox/provider/accounts/connectionTest'
import { OAUTH_LOGIN_PROVIDERS } from '@thyrox/provider/accounts/oauth/flowRegistry'
import type { LoginOptions, LoginOutcome, LoginRunnerDeps } from '@thyrox/provider/accounts/oauth/loginRunner'
import { openConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import { validateWebCookieProvider } from '@thyrox/provider/accounts/webCookie/webCookieProbe'

import { hasFlag } from '../entry/flags.ts'
import { EXIT_FAIL, EXIT_OK, EXIT_USAGE } from '../exitCodes.ts'
import type { ParentCommand } from './parentCommand.js'
import { resolveConnection } from './providers/connectionSelector.ts'
import { formatConnectionTable, publicConnection } from './providers/publicConnection.ts'
import { promptHidden } from './providers/secretPrompt.ts'
import { runTestAllVerb, runTestVerb, runValidateVerb } from './providers/testVerbs.ts'
import { runAddVerb, runEditVerb, runImportVerb } from './providers/writeVerbs.ts'
import { runLoginVerb } from './providers/loginVerb.ts'
import { createOAuthLogin } from './providers/oauthLogin.ts'

type Row = Record<string, unknown>

type ProvidersStore = { list(): Row[]; delete(id: string): boolean; update(id: string, fields: Row): Row | null; create(data: Row): Row | null }
type OpenedProvidersStore = { store: ProvidersStore; close(): void }

export interface ProvidersCommandDeps {
  openStore: () => OpenedProvidersStore
  write: (text: string) => void
  interactive: boolean
  confirm: (question: string) => Promise<boolean>
  testDeps: ConnectionTestDeps
  now: () => string
  env: Record<string, string | undefined>
  readStdin: () => Promise<string>
  promptSecret: (question: string) => Promise<string>
  readFile: (path: string) => string
  /** Inicia sesión en un proveedor y guarda la cuenta en el store abierto. */
  login: (store: LoginRunnerDeps['store'], options: LoginOptions) => Promise<LoginOutcome>
}

async function readAllStdin(): Promise<string> {
  let text = ''
  for await (const chunk of process.stdin) text += String(chunk)
  return text
}

async function askOnTerminal(question: string): Promise<boolean> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return /^y(?:es)?$/i.test((await prompt.question(question)).trim())
  } finally {
    prompt.close()
  }
}

export const realProvidersCommandDeps: ProvidersCommandDeps = {
  openStore: () => openConnectionStore(),
  write: text => void process.stdout.write(text),
  get interactive() {
    return process.stdin.isTTY === true
  },
  confirm: askOnTerminal,
  testDeps: { probe: input => testProviderApiKey(input), webCookie: request => validateWebCookieProvider(request) },
  now: () => new Date().toISOString(),
  env: process.env,
  readStdin: readAllStdin,
  promptSecret: question => promptHidden(question, process.stdin, process.stdout),
  readFile: path => fs.readFileSync(path, 'utf8'),
  login: (store, options) =>
    createOAuthLogin({
      write: realProvidersCommandDeps.write,
      interactive: realProvidersCommandDeps.interactive,
      promptSecret: realProvidersCommandDeps.promptSecret,
      readStdin: realProvidersCommandDeps.readStdin,
    })(store, options),
}

export const PROVIDERS_VERBS = ['list', 'add', 'edit', 'import', 'remove', 'test', 'test-all', 'validate', 'login'] as const
type ProvidersVerb = (typeof PROVIDERS_VERBS)[number]

const isProvidersVerb = (verb: string | undefined): verb is ProvidersVerb => (PROVIDERS_VERBS as readonly string[]).includes(verb ?? '')

function listConnections(args: string[], deps: ProvidersCommandDeps, rows: Row[]): number {
  const visible = rows.map(publicConnection)
  deps.write(hasFlag(args, 'json') ? `${JSON.stringify({ providers: visible }, null, 2)}\n` : formatConnectionTable(visible))
  return EXIT_OK
}

async function confirmRemoval(label: string, args: string[], deps: ProvidersCommandDeps): Promise<boolean> {
  if (hasFlag(args, 'yes')) return true
  if (!deps.interactive) {
    deps.write(`Removal of '${label}' declined on non-interactive stdin; pass --yes to confirm.\n`)
    return false
  }
  return deps.confirm(`Remove provider connection '${label}'? [y/N] `)
}

async function removeConnection(args: string[], deps: ProvidersCommandDeps, store: ReturnType<ProvidersCommandDeps['openStore']>['store']): Promise<number> {
  const selector = args.find(arg => !arg.startsWith('--'))
  if (!selector) {
    deps.write('Provider connection id, name, or provider is required.\n')
    return EXIT_USAGE
  }
  let connection: Row | null
  try {
    connection = resolveConnection(store.list(), selector)
  } catch (error) {
    deps.write(`${error instanceof Error ? error.message : String(error)}\n`)
    return EXIT_FAIL
  }
  if (!connection) {
    deps.write(`No provider connection matches '${selector}'.\n`)
    return EXIT_FAIL
  }
  const label = String(connection.name || connection.id)
  if (hasFlag(args, 'dry-run')) {
    deps.write(`dry-run: would remove ${label}\n`)
    return EXIT_OK
  }
  if (!(await confirmRemoval(label, args, deps))) return EXIT_OK
  if (!store.delete(String(connection.id))) {
    deps.write(`Provider connection '${label}' was not removed.\n`)
    return EXIT_FAIL
  }
  deps.write(hasFlag(args, 'json') ? `${JSON.stringify({ removed: publicConnection(connection) }, null, 2)}\n` : `Removed provider connection '${label}'.\n`)
  return EXIT_OK
}

/**
 * El store se abre en su primer uso, no al despachar el verbo: abrirlo crea el
 * archivo, y un verbo que no lo toca —`add --dry-run`— no debe dejarlo creado.
 * `close` sólo cierra lo que llegó a abrirse.
 */
function openOnFirstUse(open: ProvidersCommandDeps['openStore']): OpenedProvidersStore {
  let opened: OpenedProvidersStore | undefined
  const current = (): ProvidersStore => (opened ??= open()).store
  return {
    store: {
      list: () => current().list(),
      delete: id => current().delete(id),
      update: (id, fields) => current().update(id, fields),
      create: data => current().create(data),
    },
    close: () => opened?.close(),
  }
}

/** `thyrox providers <verb>` desde la tabla de modos: el verbo es la segunda palabra. */
export async function providersCommand(argv: string[], deps: ProvidersCommandDeps = realProvidersCommandDeps): Promise<number> {
  const [, verb, ...args] = argv
  if (!isProvidersVerb(verb)) {
    deps.write(`thyrox providers: unknown verb '${verb ?? ''}'; expected one of: ${PROVIDERS_VERBS.join(', ')}\n`)
    return EXIT_USAGE
  }
  const opened = openOnFirstUse(deps.openStore)
  try {
    const testDeps = { store: opened.store, testDeps: deps.testDeps, now: deps.now, write: deps.write }
    switch (verb) {
      case 'list':
        return listConnections(args, deps, opened.store.list())
      case 'remove':
        return await removeConnection(args, deps, opened.store)
      case 'test':
        return await runTestVerb(args, testDeps)
      case 'test-all':
        return await runTestAllVerb(args, testDeps)
      case 'validate':
        return runValidateVerb(args, testDeps)
      case 'add':
        return await runAddVerb(args, { ...deps, store: opened.store })
      case 'edit':
        return await runEditVerb(args, { ...deps, store: opened.store })
      case 'import':
        return runImportVerb(args, { ...deps, store: opened.store })
      case 'login':
        return await runLoginVerb(args, {
          store: opened.store,
          write: deps.write,
          login: options => deps.login(opened.store, options),
          providers: OAUTH_LOGIN_PROVIDERS,
        })
    }
  } finally {
    opened.close()
  }
}

export function registerProvidersCommands(program: ParentCommand): void {
  const providers = program.command('providers').description('Manage provider connections')
  for (const verb of PROVIDERS_VERBS) {
    providers
      .command(`${verb} [args...]`)
      .description(`providers ${verb} (see thyrox providers ${verb})`)
      .allowUnknownOption(true)
      .helpOption(false)
      .action(async args => {
        process.exitCode = await providersCommand(['providers', verb, ...(args ?? [])])
      })
  }
}
