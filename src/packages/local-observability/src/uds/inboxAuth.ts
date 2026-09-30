/**
 * La autenticación del buzón: los tokens de la sesión, la línea con que un
 * par se identifica y el nombre del archivo donde se publica la clave. Porte
 * de `X`, `v`, `ofn`, `YDo`, `Iv`, `J`, `Q`, `zFr`, `eLo` y `tLo`
 * (`chunk-5mcqvwzx.js`) y de `v0` (`chunk-t0sp7zte.js`) de 2.1.283.
 *
 * Hay dos tokens: el de par, que se publica en un archivo 0600 para que otras
 * sesiones del mismo usuario lo lean, y el de hijo, que sólo reciben los
 * procesos que la sesión lanza. El buzón sabe así si un mensaje viene de otra
 * sesión o de un hijo propio.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { resolve } from 'node:path'

import { localPipeName } from './socketPath.ts'

export const AUTH_FRAME_TYPE = 'auth'
const TOKEN_BYTES = 16

export type InboxTokens = { peerToken: string; childToken: string }
export type TokenOrigin = 'peer' | 'child'

/** `ofn`: sólo en Windows el buzón exige la línea de autenticación sin configurarlo. */
export function authRequiredByDefault(platform: string): boolean {
  return platform === 'windows'
}

/** `YDo`: los dos tokens de esta sesión. */
export function createInboxTokens(): InboxTokens {
  return { peerToken: randomBytes(TOKEN_BYTES).toString('hex'), childToken: randomBytes(TOKEN_BYTES).toString('hex') }
}

/** `zFr`: la primera línea que un par envía. */
export function authFrameLine(token: string): string {
  return `${JSON.stringify({ type: AUTH_FRAME_TYPE, token })}\n`
}

/** `eLo`: si un mensaje recibido es un marco de autenticación. */
export function isAuthFrame(value: unknown): value is { type: 'auth'; token?: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value && (value as { type: unknown }).type === AUTH_FRAME_TYPE
}

/** `v0`: compara dos tokens en tiempo constante; un vacío o una longitud distinta no coinciden. */
export function timingSafeTokenEquals(candidate: unknown, expected: string | undefined): boolean {
  if (typeof candidate !== 'string' || !expected || candidate.length === 0) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** `tLo`: de qué clase es el token presentado, o `undefined` si no es de esta sesión. */
export function matchInboxToken(token: unknown, tokens: InboxTokens | undefined): TokenOrigin | undefined {
  if (tokens === undefined) return undefined
  if (timingSafeTokenEquals(token, tokens.peerToken)) return 'peer'
  if (timingSafeTokenEquals(token, tokens.childToken)) return 'child'
  return undefined
}

const PARENT_SEGMENT = /(^|[\\/])\.\.([\\/]|$)/

/**
 * `Iv`: la forma canónica de una dirección de buzón. Un pipe se nombra en
 * minúsculas bajo `\\.\pipe\`; una ruta con `..` no tiene forma canónica.
 */
export function canonicalSocketAddress(address: string): string | undefined {
  const pipe = localPipeName(address)
  if (pipe !== undefined) return `\\\\.\\pipe\\${pipe.replace(/[A-Z]/g, char => char.toLowerCase())}`
  if (PARENT_SEGMENT.test(address)) return undefined
  return resolve(address)
}

/** `J`: el resumen de la dirección que nombra su archivo de clave. */
function addressDigest(address: string): string | undefined {
  const canonical = canonicalSocketAddress(address)
  return canonical === undefined ? undefined : createHash('sha256').update(canonical).digest('hex')
}

/** `Q`: `<pid>.<sha256 de la dirección>.key`. */
export function inboxKeyFileName(pid: number, address: string): string {
  const digest = addressDigest(address)
  if (digest === undefined) throw new Error('refusing to derive a messaging key name for a non-canonical socket path')
  return `${pid}.${digest}.key`
}

/** `rfn`: el nombre de un archivo de clave publicado, con su pid. */
export const INBOX_KEY_FILE = /^(\d+)\.[0-9a-f]{64}\.key$/
/** `ke`: el temporal de una escritura atómica de clave que quedó a medias. */
export const INBOX_KEY_TEMP_FILE = /^(\d+)\.[0-9a-f]{64}\.key\.tmp\.[0-9a-f]+$/

/** El sufijo que comparten todas las claves de una dirección, para buscarlas. */
export function inboxKeySuffix(address: string): string | undefined {
  const digest = addressDigest(address)
  return digest === undefined ? undefined : `.${digest}.key`
}
