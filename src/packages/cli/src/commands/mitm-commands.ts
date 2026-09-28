/**
 * `thyrox mitm`: la superficie de uso del MITM desde la CLI. `serve` arranca
 * la API local en el puerto pedido y la sirve hasta que llega SIGINT o
 * SIGTERM; al parar retira el destino de ingesta y cierra el store.
 */
import type { Database } from 'bun:sqlite'
import fs from 'node:fs'

import { startMitmApi } from '@thyrox/mitm/api/mitmApi'
import { globalTrafficBuffer, type TrafficBuffer } from '@thyrox/mitm/inspector/buffer'
import { openMitmStateStore } from '@thyrox/mitm/state/stateStore'

import { flag } from '../entry/flags.ts'
import { EXIT_OK, EXIT_USAGE } from '../exitCodes.ts'
import { inProcessApi } from './mitm/inProcessApi.ts'
import { runStateVerb, STATE_VERBS } from './mitm/stateVerbs.ts'
import type { ParentCommand } from './parentCommand.js'

export interface MitmServeDeps {
  openDb: () => Database
  traffic: TrafficBuffer
  write: (text: string) => void
  readFile: (path: string) => string
  /** Resuelve cuando hay que parar. */
  waitForStop: () => Promise<void>
}

const MAX_PORT = 65_535

/** 0 pide un puerto libre; cualquier otro valor tiene que ser un puerto TCP. */
function parsePort(text: string): number | null {
  if (!/^\d+$/.test(text)) return null
  const port = Number(text)
  return port <= MAX_PORT ? port : null
}

function untilSignal(): Promise<void> {
  return new Promise(resolve => {
    const stop = () => {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
      resolve()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}

export const realMitmServeDeps: MitmServeDeps = {
  openDb: () => openMitmStateStore(),
  traffic: globalTrafficBuffer,
  write: text => process.stdout.write(text),
  readFile: path => fs.readFileSync(path, 'utf8'),
  waitForStop: untilSignal,
}

export async function mitmServe(portText: string, deps: MitmServeDeps): Promise<number> {
  const port = parsePort(portText)
  if (port === null) {
    deps.write(`thyrox mitm serve: port must be an integer from 0 to ${MAX_PORT}, got '${portText}'\n`)
    return EXIT_USAGE
  }
  const db = deps.openDb()
  const api = startMitmApi({ port, db, traffic: deps.traffic })
  try {
    deps.write(`MITM API listening on ${api.url}\n`)
    await deps.waitForStop()
  } finally {
    api.stop()
    db.close()
  }
  return EXIT_OK
}

const VERBS = ['serve', ...STATE_VERBS] as const

function isStateVerb(verb: string | undefined): boolean {
  return (STATE_VERBS as readonly string[]).includes(verb ?? '')
}

/** Un verbo de estado sobre el store, que se cierra al terminar. */
async function runStateVerbOnStore(args: string[], deps: MitmServeDeps): Promise<number> {
  const db = deps.openDb()
  try {
    return await runStateVerb(args, { api: inProcessApi(db, deps.traffic), readFile: deps.readFile, write: deps.write })
  } finally {
    db.close()
  }
}

/** `thyrox mitm <verb>` desde la tabla de modos: el verbo es la segunda palabra. */
export function mitmCommand(argv: string[], deps: MitmServeDeps = realMitmServeDeps): Promise<number> | number {
  const verb = argv[1]
  if (verb === 'serve') return mitmServe(flag(argv, 'port') ?? '0', deps)
  if (isStateVerb(verb)) return runStateVerbOnStore(argv.slice(1), deps)
  deps.write(`thyrox mitm: unknown verb '${verb ?? ''}'; expected one of: ${VERBS.join(', ')}\n`)
  return EXIT_USAGE
}

export function registerMitmCommands(program: ParentCommand): void {
  const mitm = program.command('mitm').description('Inspect and control the MITM agent bridge')
  mitm
    .command('serve')
    .description('Serve the local MITM API until interrupted')
    .option('--port <port>', 'port to listen on (0 picks a free one)', '0')
    .action(async options => {
      process.exitCode = await mitmServe(options.port, realMitmServeDeps)
    })
  // Los verbos de estado comparten el mismo manejador que la tabla de modos.
  for (const verb of STATE_VERBS) {
    mitm
      .command(`${verb} [args...]`)
      .description(`MITM ${verb} (see thyrox mitm ${verb})`)
      .allowUnknownOption(true)
      .helpOption(false)
      .action(async args => {
        process.exitCode = await mitmCommand(['mitm', verb, ...(args ?? [])])
      })
  }
}
