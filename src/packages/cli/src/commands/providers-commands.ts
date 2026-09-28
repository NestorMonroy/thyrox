/**
 * `thyrox providers`: las conexiones de proveedor desde la CLI. `list` las
 * muestra sin secretos; `remove` borra una, resuelta por su selector, tras
 * confirmar. En stdin no interactiva la confirmación sólo la da `--yes`, para
 * que un guion no borre por un `y` que nadie escribió.
 *
 * Porte de `runListCommand` (`omniroute: bin/cli/commands/providers.mjs`) y
 * de `runProviderRemoveCommand` y `confirmRemoval`
 * (`bin/cli/commands/provider-crud.mjs`), MIT. Aquí el store es local: no
 * hay servidor remoto al que pedir el borrado.
 */
import { createInterface } from 'node:readline/promises'

import { openConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'

import { hasFlag } from '../entry/flags.ts'
import { EXIT_FAIL, EXIT_OK, EXIT_USAGE } from '../exitCodes.ts'
import type { ParentCommand } from './parentCommand.js'
import { resolveConnection } from './providers/connectionSelector.ts'
import { formatConnectionTable, publicConnection } from './providers/publicConnection.ts'

type Row = Record<string, unknown>

export interface ProvidersCommandDeps {
  openStore: () => { store: { list(): Row[]; delete(id: string): boolean }; close(): void }
  write: (text: string) => void
  interactive: boolean
  confirm: (question: string) => Promise<boolean>
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
}

export const PROVIDERS_VERBS = ['list', 'remove'] as const

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

/** `thyrox providers <verb>` desde la tabla de modos: el verbo es la segunda palabra. */
export async function providersCommand(argv: string[], deps: ProvidersCommandDeps = realProvidersCommandDeps): Promise<number> {
  const [, verb, ...args] = argv
  if (verb !== 'list' && verb !== 'remove') {
    deps.write(`thyrox providers: unknown verb '${verb ?? ''}'; expected one of: ${PROVIDERS_VERBS.join(', ')}\n`)
    return EXIT_USAGE
  }
  const opened = deps.openStore()
  try {
    return verb === 'list' ? listConnections(args, deps, opened.store.list()) : await removeConnection(args, deps, opened.store)
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
