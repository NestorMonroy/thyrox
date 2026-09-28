/**
 * `thyrox mitm`: la superficie de uso del MITM desde la CLI. `serve` arranca
 * la API local en el puerto pedido, publica su URL en el directorio de datos
 * y la sirve hasta que llega SIGINT o SIGTERM; al parar retira la URL y el
 * destino de ingesta y cierra el store. Los verbos de estado van al store en
 * el mismo proceso; los privilegiados, a la API publicada, que es la dueña del
 * servidor MITM.
 */
import type { Database } from 'bun:sqlite'
import fs from 'node:fs'

import { startMitmApi } from '@thyrox/mitm/api/mitmApi'
import { resolveMitmDataDir } from '@thyrox/mitm/dataDir'
import { globalTrafficBuffer, type TrafficBuffer } from '@thyrox/mitm/inspector/buffer'
import { openMitmStateStore } from '@thyrox/mitm/state/stateStore'

import { flag } from '../entry/flags.ts'
import { EXIT_OK, EXIT_USAGE } from '../exitCodes.ts'
import { publishApiUrl, readApiUrl, withdrawApiUrl } from './mitm/apiEndpoint.ts'
import { inProcessApi, type MitmApiCall } from './mitm/inProcessApi.ts'
import { PRIVILEGED_VERBS, runPrivilegedVerb } from './mitm/privilegedVerbs.ts'
import { remoteApi } from './mitm/remoteApi.ts'
import { runStateVerb, STATE_VERBS } from './mitm/stateVerbs.ts'
import { readFirstLine } from './mitm/stdinSecret.ts'
import type { ParentCommand } from './parentCommand.js'

export interface MitmCommandDeps {
  openDb: () => Database
  traffic: TrafficBuffer
  write: (text: string) => void
  readFile: (path: string) => string
  /** Resuelve cuando hay que parar. */
  waitForStop: () => Promise<void>
  /** Donde `serve` publica la URL de su API mientras corre. */
  dataDir: string
  connect: (baseUrl: string) => MitmApiCall
  readSecret: () => Promise<string>
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

export const realMitmCommandDeps: MitmCommandDeps = {
  openDb: () => openMitmStateStore(),
  traffic: globalTrafficBuffer,
  write: text => process.stdout.write(text),
  readFile: path => fs.readFileSync(path, 'utf8'),
  waitForStop: untilSignal,
  get dataDir() {
    return resolveMitmDataDir()
  },
  connect: remoteApi,
  readSecret: () => readFirstLine(process.stdin),
}

export async function mitmServe(portText: string, deps: MitmCommandDeps): Promise<number> {
  const port = parsePort(portText)
  if (port === null) {
    deps.write(`thyrox mitm serve: port must be an integer from 0 to ${MAX_PORT}, got '${portText}'\n`)
    return EXIT_USAGE
  }
  const db = deps.openDb()
  const api = startMitmApi({ port, db, traffic: deps.traffic })
  try {
    publishApiUrl(deps.dataDir, api.url)
    deps.write(`MITM API listening on ${api.url}\n`)
    await deps.waitForStop()
  } finally {
    withdrawApiUrl(deps.dataDir)
    api.stop()
    db.close()
  }
  return EXIT_OK
}

const VERBS = ['serve', ...STATE_VERBS, ...PRIVILEGED_VERBS] as const

function isOneOf(verbs: readonly string[], verb: string | undefined): boolean {
  return verbs.includes(verb ?? '')
}

/** Un verbo de estado sobre el store, que se cierra al terminar. */
async function runStateVerbOnStore(args: string[], deps: MitmCommandDeps): Promise<number> {
  const db = deps.openDb()
  try {
    return await runStateVerb(args, { api: inProcessApi(db, deps.traffic), readFile: deps.readFile, write: deps.write })
  } finally {
    db.close()
  }
}

/** `thyrox mitm <verb>` desde la tabla de modos: el verbo es la segunda palabra. */
export function mitmCommand(argv: string[], deps: MitmCommandDeps = realMitmCommandDeps): Promise<number> | number {
  const verb = argv[1]
  if (verb === 'serve') return mitmServe(flag(argv, 'port') ?? '0', deps)
  if (isOneOf(STATE_VERBS, verb)) return runStateVerbOnStore(argv.slice(1), deps)
  if (isOneOf(PRIVILEGED_VERBS, verb)) {
    return runPrivilegedVerb(argv.slice(1), {
      apiUrl: () => readApiUrl(deps.dataDir),
      connect: deps.connect,
      readSecret: deps.readSecret,
      write: deps.write,
    })
  }
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
      process.exitCode = await mitmServe(options.port, realMitmCommandDeps)
    })
  // Los demás verbos comparten el mismo manejador que la tabla de modos.
  for (const verb of [...STATE_VERBS, ...PRIVILEGED_VERBS]) {
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
