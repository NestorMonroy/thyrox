/**
 * Un espacio de red propio donde correr las órdenes de TPROXY sin tocar la
 * red del anfitrión: `unshare --net` lanza un proceso que lo sostiene, y cada
 * orden entra en él con `nsenter`. Lo que se aplique dentro —reglas de
 * `mangle`, rutas, `ip rule`— desaparece al cerrarlo.
 *
 * Crear el espacio exige root o CAP_SYS_ADMIN.
 */
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import { promisify } from 'node:util'

import type { CommandRunner } from './setup.ts'

const execFileAsync = promisify(execFile)

export interface NamespaceTools {
  unshare: string
  nsenter: string
}

export interface NetworkNamespace {
  /** El proceso que sostiene el espacio. */
  pid: number
  /** `/proc/<pid>/ns/net`, lo que `nsenter --net=` recibe. */
  path: string
  /** Corre una orden dentro del espacio; rechaza si sale con error. */
  run: CommandRunner
  /** Termina el proceso que lo sostiene, y con él el espacio. */
  close(): Promise<void>
}

const DEFAULT_TOOLS: NamespaceTools = { unshare: 'unshare', nsenter: 'nsenter' }
const READY_TIMEOUT_MS = 5_000
const READY_POLL_MS = 10

function sameNamespace(a: string, b: string): boolean {
  try {
    return fs.readlinkSync(a) === fs.readlinkSync(b)
  } catch {
    return true
  }
}

function exited(child: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) resolve()
    else child.once('exit', () => resolve())
  })
}

/**
 * `unshare` crea el espacio y luego ejecuta el proceso que lo sostiene con el
 * mismo pid: está listo cuando su espacio de red deja de ser el nuestro.
 */
async function awaitOwnNamespace(child: ChildProcess, path: string, failure: () => Error | null): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (sameNamespace(path, '/proc/self/ns/net')) {
    const error = failure()
    if (error) throw error
    if (Date.now() > deadline) {
      child.kill('SIGKILL')
      throw new Error(`network namespace not ready after ${READY_TIMEOUT_MS} ms`)
    }
    await Bun.sleep(READY_POLL_MS)
  }
}

export async function openNetworkNamespace(tools: NamespaceTools = DEFAULT_TOOLS): Promise<NetworkNamespace> {
  const child = spawn(tools.unshare, ['--net', '--', 'sleep', 'infinity'], { stdio: ['ignore', 'ignore', 'pipe'] })
  // Sin pid el proceso no llegó a lanzarse; el motivo llega como evento.
  if (child.pid === undefined) {
    const err = await new Promise<Error>(resolve => child.once('error', resolve))
    throw new Error(`cannot start ${tools.unshare}: ${err.message}`)
  }
  let stderr = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })
  const failure = (): Error | null =>
    child.exitCode === null ? null : new Error(`${tools.unshare} exited ${child.exitCode}: ${stderr.trim()}`)
  const pid = child.pid
  const path = `/proc/${pid}/ns/net`
  await awaitOwnNamespace(child, path, failure)

  return {
    pid,
    path,
    run: async (bin, args) => {
      await execFileAsync(tools.nsenter, [`--net=${path}`, '--', bin, ...args])
    },
    close: async () => {
      if (child.exitCode !== null || child.signalCode !== null) return
      child.kill('SIGTERM')
      await exited(child)
    },
  }
}
