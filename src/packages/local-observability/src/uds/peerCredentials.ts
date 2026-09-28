/**
 * Quién está al otro lado de una conexión del buzón: su pid, su arranque y la
 * cadena de sus padres. Con eso se distingue un par que es otra sesión de un
 * proceso hijo de esta misma.
 *
 * Porte de `lsn`, `te`, `Yce` y `aUr` (`chunk-qcy58j4w.js`,
 * `chunk-x5vr5vwm.js`) de 2.1.283. La referencia lee el pid con
 * `Bun.ant.getPeerPid(fd)`, una API de su propio Bun que el Bun de este árbol
 * no trae (`typeof Bun.ant` es `undefined`). Aquí sale de
 * `getsockopt` por `bun:ffi`: en Linux `SO_PEERCRED` devuelve el
 * `struct ucred` del par; en macOS `LOCAL_PEERPID` devuelve sólo su pid. En
 * otra plataforma, o sin la biblioteca, no hay credenciales y el pid queda sin
 * conocer, como cuando `getPeerPid` falla.
 */
import { dlopen, FFIType, ptr } from 'bun:ffi'
import { readFileSync } from 'node:fs'
import type { Socket } from 'node:net'

import { getPlatform } from '@thyrox/config/platform'

import { logForDebugging } from '../debug.ts'
import { parseProcStatStartTime } from './processIdentity.ts'

/** Cuántos padres sube `aUr` como máximo. */
const PARENT_CHAIN_DEPTH = 12

export type PeerCredentials = { pid: number; uid?: number; gid?: number }

/** Qué pedirle a `getsockopt` en cada plataforma para conocer al par. */
export type PeerCredentialQuery = { library: string; level: number; option: number; bytes: number }

/** `SOL_SOCKET`/`SO_PEERCRED` en Linux; `SOL_LOCAL`/`LOCAL_PEERPID` en macOS. */
export function peerCredentialQuery(platform: string): PeerCredentialQuery | null {
  if (platform === 'linux') return { library: 'libc.so.6', level: 1, option: 17, bytes: 12 }
  if (platform === 'darwin') return { library: '/usr/lib/libSystem.B.dylib', level: 0, option: 2, bytes: 4 }
  return null
}

type Getsockopt = (fd: number, level: number, name: number, value: ReturnType<typeof ptr>, length: ReturnType<typeof ptr>) => number
let getsockopt: { call: Getsockopt; query: PeerCredentialQuery } | null | undefined

function loadGetsockopt(): { call: Getsockopt; query: PeerCredentialQuery } | null {
  if (getsockopt !== undefined) return getsockopt
  const query = peerCredentialQuery(process.platform)
  try {
    getsockopt =
      query === null
        ? null
        : {
            call: dlopen(query.library, { getsockopt: { args: [FFIType.i32, FFIType.i32, FFIType.i32, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 } })
              .symbols.getsockopt,
            query,
          }
  } catch {
    getsockopt = null
  }
  return getsockopt
}

/** `te`: el descriptor del socket, o -1 si su handle no lo expone. */
export function socketFd(socket: Socket): number {
  const handle = (socket as unknown as { _handle?: { fd?: unknown } })._handle
  return typeof handle?.fd === 'number' ? handle.fd : -1
}

/** Las credenciales del par de un socket Unix, o `null` si no se pueden leer. */
export function readPeerCredentials(fd: number): PeerCredentials | null {
  if (fd < 0) return null
  const loaded = loadGetsockopt()
  if (loaded === null) return null
  const value = new Int32Array(loaded.query.bytes / 4)
  const length = new Uint32Array([loaded.query.bytes])
  if (loaded.call(fd, loaded.query.level, loaded.query.option, ptr(value), ptr(length)) !== 0) return null
  return value.length === 3 ? { pid: value[0]!, uid: value[1]!, gid: value[2]! } : { pid: value[0]! }
}

export interface PeerPidOptions {
  platform?: string
  getPeerPid?: (fd: number) => number | null
  warn?: (message: string) => void
}

/** `lsn`: el pid del proceso al otro lado, o `undefined` si no se puede saber. */
export function peerPid(socket: Socket, options: PeerPidOptions = {}): number | undefined {
  const {
    platform = getPlatform(),
    getPeerPid = fd => readPeerCredentials(fd)?.pid ?? null,
    warn = message => logForDebugging(message, { level: 'warn' }),
  } = options
  if (platform === 'windows') return undefined
  const fd = socketFd(socket)
  try {
    const pid = fd < 0 ? null : getPeerPid(fd)
    if (pid !== null && pid > 0) return pid
    warn(`[peer-cred] peer pid unavailable (fd=${fd}, got=${pid})`)
    return undefined
  } catch (error) {
    warn(`[peer-cred] peer pid lookup failed: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

const readProcFile = (path: string): string => readFileSync(path, 'utf8')

/** `Yce`: el token de inicio de un proceso, leído de forma síncrona. */
export function readStartTokenSync(pid: number, read: (path: string) => string = readProcFile): string | undefined {
  try {
    const token = parseProcStatStartTime(read(`/proc/${pid}/stat`))
    return token && token.length > 0 ? token : undefined
  } catch {
    return undefined
  }
}

/** `aUr`: los padres de `pid`, del más cercano hacia `init`, hasta `depth`. */
export function parentPidChain(pid: number, depth: number = PARENT_CHAIN_DEPTH, read: (path: string) => string = readProcFile): number[] {
  const chain: number[] = []
  let current = pid
  for (let level = 0; level < depth; level++) {
    let parent = 0
    try {
      const stat = read(`/proc/${current}/stat`)
      parent = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1])
    } catch {
      break
    }
    if (!Number.isInteger(parent) || parent < 1) break
    chain.push(parent)
    if (parent === 1) break
    current = parent
  }
  return chain
}
