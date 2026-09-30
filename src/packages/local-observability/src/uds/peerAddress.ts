/**
 * Las direcciones de un par: cómo se escriben (`uds:`, `bridge:`, `did:`),
 * cómo se comparan dos sockets, y a qué socket se puede responder. Porte de
 * `R`, `vye`, `M1`, `E`, `K`/`fJ`, `j`/`cLo`, `J`/`ZFr`, `lh`, `ffn`, `T`,
 * `Vce`, `mJ`, `p`, `r3n`, `P`, `N`, `m`, `Q`, `a`, `eUr`, `ee`/`D`, `dLo`,
 * `tUr`, `M`, `ne` e `I` (`chunk-q8a07cv0.js`), y de `Wh`, `zF` y `wn`
 * (`chunk-yqm14hey.js`) de 2.1.283.
 *
 * Plataforma: la referencia la lee de su detector en cada comparación; aquí es
 * parámetro, con el detector de `@thyrox/config` como valor por omisión.
 */
import { basename, dirname, resolve } from 'node:path'

import { getPlatform } from '@thyrox/config/platform'

import { ADDRESS_CHARS } from './peerEnvelope.ts'
import { isUsableLocalSocketAddress, localPipeName } from './socketPath.ts'

/** `tUr`: la capacidad de responder a sockets de los directorios por defecto. */
export const REPLY_ACROSS_DEFAULT_DIRS = 'reply_across_default_dirs'
/** `M`: el prefijo del nombre de pipe de un buzón. */
const INBOX_PIPE_PREFIX = 'cc-msg-'
/** `ne`: un pipe de buzón, con o sin ámbito `LOCAL`. */
const INBOX_PIPE = new RegExp(`^(?:LOCAL\\\\)?${INBOX_PIPE_PREFIX}[0-9a-f]{32}$`, 'i')
/** `I`: un pipe de buzón global. */
const GLOBAL_INBOX_PIPE = new RegExp(`^${INBOX_PIPE_PREFIX}[0-9a-f]{32}$`, 'i')

/** `K`. */
const PEER_ADDRESS = new RegExp(`^(?:uds|bridge|did):[${ADDRESS_CHARS}]{1,200}$`)
/** `j`. */
const BARE_ADDRESS = new RegExp(`^[${ADDRESS_CHARS}]{1,300}$`)
/** `Y`, `q` y `J`: una ruta de socket, un pipe, y el prefijo de una ruta de socket. */
const SOCKET_PATH = /^\/\S*\.sock$/
const PIPE_PATH = /^[\\/]{2}[.?][\\/]pipe[\\/]/i
const SOCKET_PATH_PREFIX = /^\/\S*\.sock/

/** `ee`: los directorios por defecto donde se buscan los pares de la máquina. */
const DEFAULT_SOCKET_DIRS = [
  /^\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
  /^\/private\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
  /^\/run\/user\/(0|[1-9]\d*)\/cc-socks$/,
  /^\/data\/data\/com\.termux\/files\/usr\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
]
const DEFAULT_SOCKET_NAME = /^(\d+(-[0-9a-f]{8})?|[0-9a-f]{1,16})\.sock$/

/** `wn`: las raíces que el volumen de datos de macOS monta también en `/`. */
const DATA_VOLUME_ROOTS = [
  'usr/local', 'usr/libexec/cups', 'usr/share/snmp', 'AppleInternal', 'Applications', 'Library', 'Users', 'Volumes',
  'cores', 'home', 'media', 'mnt', 'opt', 'pkg', 'private', 'sw',
]

export type AddressScheme = 'uds' | 'bridge' | 'did' | 'other'
export type SocketComparison = 'same' | 'maybe' | 'different'

/** `R`: los caracteres fuera de la clase de ruta van como `%XX` de sus bytes UTF-8. */
export function encodeAddressTarget(target: string): string {
  const encoder = new TextEncoder()
  return target.replace(/[^A-Za-z0-9:_/.\\-]/gu, character =>
    Array.from(encoder.encode(character), byte => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`).join(''),
  )
}

/** `vye`. */
export function bridgeAddress(target: string): string {
  return `bridge:${encodeAddressTarget(target)}`
}

/** `M1`. */
export function udsAddress(path: string): string {
  return `uds:${encodeAddressTarget(path)}`
}

/** `E`: el destino decodificado, o el texto tal cual si no es una codificación válida. */
export function decodeAddressTarget(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** `fJ`. */
export function isPeerAddress(text: string): boolean {
  return PEER_ADDRESS.test(text)
}

/** `cLo`. */
export function isBareAddress(text: string): boolean {
  return BARE_ADDRESS.test(text)
}

/** `ZFr`. */
export function looksLikeSocketPath(text: string): boolean {
  return SOCKET_PATH_PREFIX.test(text)
}

/** `lh`: el esquema y el destino; una ruta de socket o un pipe desnudos son `uds`. */
export function parseAddress(address: string): { scheme: AddressScheme; target: string } {
  if (address.startsWith('uds:')) return { scheme: 'uds', target: decodeAddressTarget(address.slice(4)) }
  if (address.startsWith('bridge:')) return { scheme: 'bridge', target: decodeAddressTarget(address.slice(7)) }
  if (address.startsWith('did:')) return { scheme: 'did', target: address }
  if (SOCKET_PATH.test(address) || PIPE_PATH.test(address)) return { scheme: 'uds', target: address }
  return { scheme: 'other', target: address }
}

/** `ffn`: por qué no se puede enviar a `to`, o `undefined`; `source` nombra dónde buscar direcciones. */
export function validateSendTarget(to: string, source: string): string | undefined {
  if (to.trim().length === 0) return 'to must not be empty'
  const { scheme, target } = parseAddress(to)
  if ((scheme === 'bridge' || scheme === 'uds') && target.trim().length === 0) return 'address target must not be empty'
  if (!isUsableLocalSocketAddress(target) || !isUsableLocalSocketAddress(to)) return `'${to}' is not a local socket address. Use an address from ${source}.`
  return undefined
}

/** `Wh`: la ruta tiene un segmento `..`. */
export function hasParentSegment(path: string): boolean {
  return /(^|[\\/])\.\.([\\/]|$)/.test(path)
}

/** `m`: el pliegue de mayúsculas por texto completo. */
function foldCaseWhole(text: string): string {
  return text.toUpperCase().toLowerCase()
}

/** `N`: un único punto de código. */
function isSingleCodePoint(text: string): boolean {
  const codePoint = text.codePointAt(0)
  return codePoint !== undefined && text.length === (codePoint > 0xffff ? 2 : 1)
}

/** `P`: el pliegue de mayúsculas carácter a carácter, sin aceptar expansiones. */
function foldCaseSimple(text: string): string {
  let folded = ''
  for (const character of text) {
    const upper = character.toUpperCase()
    const kept = isSingleCodePoint(upper) ? upper : character
    const lower = kept.toLowerCase()
    folded += isSingleCodePoint(lower) ? lower : kept
  }
  return folded
}

/** `r3n`: minúsculas sólo en el rango ASCII. */
function lowerAscii(text: string): string {
  return text.replace(/[A-Z]/g, character => character.toLowerCase())
}

/** `zF`: una ruta bajo `/System/Volumes/Data` que el sistema también monta en `/`. */
export function stripDataVolumePrefix(path: string): string {
  const segments = path.split('/')
  if (
    segments.length < 5 ||
    segments[0] !== '' ||
    foldCaseWhole(segments[1] ?? '') !== 'system' ||
    foldCaseWhole(segments[2] ?? '') !== 'volumes' ||
    foldCaseWhole(segments[3] ?? '') !== 'data'
  )
    return path
  const rest = segments.slice(4)
  for (const root of DATA_VOLUME_ROOTS) {
    const parts = root.split('/')
    if (rest.length < parts.length) continue
    if (parts.every((part, index) => foldCaseWhole(rest[index] ?? '') === foldCaseWhole(part))) return `/${rest.join('/')}`
  }
  return path
}

/** `a`: en macOS, la misma ruta sin el volumen de datos y sin `/private`. */
function canonicalPath(path: string, platform: string): string {
  if (platform !== 'macos') return path
  const stripped = stripDataVolumePrefix(path)
  const privateMatch = /^\/private(\/(?:var|tmp|etc)(?:\/.*)?)$/.exec(stripped)
  return privateMatch ? privateMatch[1]! : stripped
}

/** `p` con `Q`: en macOS y Windows, la ruta que el sistema de archivos considera igual. */
function caseInsensitivePath(path: string, platform: string): string {
  if (platform !== 'macos' && platform !== 'windows') return path
  const composed = platform === 'macos' ? path.normalize('NFC') : path
  return canonicalPath(foldCaseSimple(composed), platform)
}

/** `T`: si dos direcciones nombran el mismo socket, quizá el mismo, o uno distinto. */
export function compareSocketAddresses(left: string, right: string, platform: string = getPlatform()): SocketComparison {
  const leftPipe = localPipeName(left)
  const rightPipe = localPipeName(right)
  if (leftPipe !== undefined || rightPipe !== undefined) {
    if (leftPipe === undefined || rightPipe === undefined) return 'different'
    if (lowerAscii(leftPipe) === lowerAscii(rightPipe)) return 'same'
    return foldCaseSimple(leftPipe) === foldCaseSimple(rightPipe) || foldCaseWhole(leftPipe) === foldCaseWhole(rightPipe) ? 'maybe' : 'different'
  }
  if (left === right) return 'same'
  if (hasParentSegment(left) || hasParentSegment(right)) {
    return caseInsensitivePath(canonicalPath(resolve(left), platform), platform) === caseInsensitivePath(canonicalPath(resolve(right), platform), platform)
      ? 'maybe'
      : 'different'
  }
  const leftPath = canonicalPath(resolve(left), platform)
  const rightPath = canonicalPath(resolve(right), platform)
  if (leftPath === rightPath) return 'same'
  const caseInsensitive = platform === 'macos' || platform === 'windows'
  return caseInsensitivePath(leftPath, platform) === caseInsensitivePath(rightPath, platform) || (caseInsensitive && foldCaseWhole(leftPath) === foldCaseWhole(rightPath))
    ? 'maybe'
    : 'different'
}

/** `Vce`. */
export function isSameSocket(left: string, right: string, platform?: string): boolean {
  return compareSocketAddresses(left, right, platform) === 'same'
}

/** `mJ`. */
export function mayBeSameSocket(left: string, right: string, platform?: string): boolean {
  return compareSocketAddresses(left, right, platform) !== 'different'
}

/** `D`: un socket con nombre de sesión en un directorio por defecto de uno de `ownerUids`. */
export function isDefaultDirSocket(path: string, ownerUids: readonly number[]): boolean {
  const absolute = resolve(path)
  if (!DEFAULT_SOCKET_NAME.test(basename(absolute))) return false
  const directory = dirname(absolute)
  for (const pattern of DEFAULT_SOCKET_DIRS) {
    const match = pattern.exec(directory)
    if (match) return match[1] === undefined || ownerUids.some(uid => String(uid) === match[1])
  }
  return false
}

export type ReplyEvidence = { verifiedPeerPid?: number; ownerUids?: readonly number[] }

/**
 * `eUr`: si se puede responder a `peer` desde el buzón `own`: otro pipe de
 * buzón, otro `.sock` del mismo directorio, o un socket de un directorio por
 * defecto cuando el par está verificado.
 */
export function isReplyableSocket(peer: string, own: string, evidence?: ReplyEvidence): boolean {
  if (localPipeName(own) !== undefined) {
    const pipe = localPipeName(peer)
    return pipe !== undefined && INBOX_PIPE.test(pipe)
  }
  if (hasParentSegment(peer)) return false
  if (dirname(resolve(peer)) === dirname(resolve(own))) return peer.endsWith('.sock')
  return evidence?.verifiedPeerPid !== undefined && evidence.ownerUids !== undefined && isDefaultDirSocket(peer, evidence.ownerUids)
}

/**
 * `dLo`: un buzón global no responde a un pipe `LOCAL`; con la capacidad
 * `reply_across_default_dirs`, también a los directorios por defecto.
 */
export function mayReplyTo(peer: string, own: string, capabilities?: readonly string[], ownerUids: readonly number[] = []): boolean {
  const peerPipe = localPipeName(peer)
  const ownPipe = localPipeName(own)
  if (peerPipe !== undefined && ownPipe !== undefined && GLOBAL_INBOX_PIPE.test(ownPipe) && !GLOBAL_INBOX_PIPE.test(peerPipe)) return false
  if (isReplyableSocket(peer, own)) return true
  return (capabilities?.includes(REPLY_ACROSS_DEFAULT_DIRS) ?? false) && isDefaultDirSocket(peer, ownerUids)
}
