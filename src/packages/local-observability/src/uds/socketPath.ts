/**
 * Dónde escucha el buzón por socket de una sesión, y qué direcciones son
 * utilizables. Porte de `W1o`, `p9r` y `z` (`chunk-yg53q7yp.js`) y de `IL`,
 * `qce` y `b` (`chunk-q8a07cv0.js`) con `Ln`/`_N`/`jt` (`chunk-yqm14hey.js`)
 * de 2.1.283, leídos con `bin/binary symbol`.
 *
 * El directorio `cc-socks` conserva el nombre de la referencia: es donde los
 * pares de la misma máquina se buscan entre sí.
 */
import { tmpdir as systemTmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/** Bytes que admite `sun_path` con el terminador, el mismo tope que la referencia. */
export const MAX_SOCKET_PATH_BYTES = 103

const SOCKETS_DIR = 'cc-socks'
const LOCAL_PIPE_SCOPE = 'LOCAL'

type Env = Record<string, string | undefined>

export type SocketPathContext = {
  env?: Env
  pid?: number
  uid?: number
  tmpdir?: string
}

function currentUid(): number {
  return process.getuid?.() ?? 0
}

/** `p9r`: `/tmp/cc-socks-<uid>/<pid>.sock`, o `$PREFIX/tmp` en Termux. */
export function perUidFallbackSocketPath(context: SocketPathContext = {}): string {
  const env = context.env ?? process.env
  const termuxPrefix = env.TERMUX_VERSION ? env.PREFIX : undefined
  const base = termuxPrefix ? join(termuxPrefix, 'tmp') : '/tmp'
  return join(base, `${SOCKETS_DIR}-${context.uid ?? currentUid()}`, `${context.pid ?? process.pid}.sock`)
}

/**
 * `W1o`: el socket de esta sesión bajo `XDG_RUNTIME_DIR`, o bajo el directorio
 * temporal de thyrox. Si la ruta no cabe en `sun_path` cae en el respaldo por
 * uid, que es corta por construcción.
 */
export function defaultUdsSocketPath(context: SocketPathContext = {}): string {
  const env = context.env ?? process.env
  const base = env.XDG_RUNTIME_DIR || env.THYROX_CODE_TMPDIR || context.tmpdir || systemTmpdir()
  const candidate = resolve(join(base, SOCKETS_DIR, `${context.pid ?? process.pid}.sock`))
  if (Buffer.byteLength(candidate) <= MAX_SOCKET_PATH_BYTES) return candidate
  return perUidFallbackSocketPath(context)
}

const DEVICE_NAMESPACE = /^[\\/]\?\?[\\/]/

/** `Ln`: una ruta que empieza por dos separadores (UNC o espacio de dispositivos). */
function isUncLike(path: string): boolean {
  return /^[\\/]{2}/.test(path) || DEVICE_NAMESPACE.test(path)
}

/**
 * `qce`: el nombre de un pipe local (`\\.\pipe\<nombre>` o
 * `\\?\pipe\LOCAL\<nombre>`), o `undefined` si la ruta no lo es o el nombre no
 * es utilizable.
 */
export function localPipeName(path: string): string | undefined {
  const match = /^[\\/]{2}[.?][\\/]pipe[\\/](?:(LOCAL)[\\/])?([^\\/]+)$/i.exec(path)
  if (match === null || match[2] === '.' || match[2] === '..') return undefined
  if (/[. ]$/.test(match[2]!)) return undefined
  if (path.startsWith('\\\\?\\') && path.includes('/')) return undefined
  return match[1] === undefined ? match[2] : `${LOCAL_PIPE_SCOPE}\\${match[2]}`
}

/** `IL`: una ruta local sirve; una UNC, sólo si nombra un pipe local válido. */
export function isUsableLocalSocketAddress(path: string): boolean {
  if (!isUncLike(path)) return true
  return localPipeName(path) !== undefined
}
