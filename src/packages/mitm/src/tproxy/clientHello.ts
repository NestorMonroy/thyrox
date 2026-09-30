/**
 * La SNI de un ClientHello de TLS, leída de los primeros bytes de la conexión
 * antes de terminarla. Hace falta porque Bun no invoca `SNICallback`: el motor
 * de captura elige la hoja del host él mismo.
 *
 * Recorre el registro de handshake (tipo 0x16), el ClientHello (tipo 1), salta
 * versión, aleatorio, sesión, suites y compresión, y busca la extensión
 * `server_name` (0) con un nombre de tipo `host_name` (0). Sólo mira el primer
 * registro: un ClientHello partido en varios registros se trata como sin SNI.
 */

export type ClientHelloSni =
  | { kind: 'sni'; servername: string }
  | { kind: 'tls-without-sni' }
  | { kind: 'incomplete' }
  | { kind: 'not-tls' }

const HANDSHAKE_RECORD = 0x16
const CLIENT_HELLO = 0x01
const SERVER_NAME_EXTENSION = 0x0000
const HOST_NAME = 0x00
const RECORD_HEADER = 5

export function readClientHelloSni(bytes: Buffer): ClientHelloSni {
  if (bytes.length < 1) return { kind: 'incomplete' }
  if (bytes[0] !== HANDSHAKE_RECORD) return { kind: 'not-tls' }
  if (bytes.length < RECORD_HEADER) return { kind: 'incomplete' }
  const recordEnd = RECORD_HEADER + bytes.readUInt16BE(3)
  if (bytes.length < recordEnd) return { kind: 'incomplete' }

  let pos = RECORD_HEADER
  if (bytes[pos] !== CLIENT_HELLO) return { kind: 'not-tls' }
  pos += 4 // tipo y largo del handshake
  pos += 2 + 32 // versión del cliente y aleatorio
  if (pos + 1 > recordEnd) return { kind: 'tls-without-sni' }
  pos += 1 + bytes[pos]! // id de sesión
  if (pos + 2 > recordEnd) return { kind: 'tls-without-sni' }
  pos += 2 + bytes.readUInt16BE(pos) // suites
  if (pos + 1 > recordEnd) return { kind: 'tls-without-sni' }
  pos += 1 + bytes[pos]! // métodos de compresión
  if (pos + 2 > recordEnd) return { kind: 'tls-without-sni' }
  const extensionsEnd = Math.min(recordEnd, pos + 2 + bytes.readUInt16BE(pos))
  pos += 2

  while (pos + 4 <= extensionsEnd) {
    const type = bytes.readUInt16BE(pos)
    const length = bytes.readUInt16BE(pos + 2)
    const body = pos + 4
    if (type === SERVER_NAME_EXTENSION && body + 5 <= extensionsEnd && bytes[body + 2] === HOST_NAME) {
      const nameLength = bytes.readUInt16BE(body + 3)
      const nameStart = body + 5
      if (nameStart + nameLength <= extensionsEnd) {
        return { kind: 'sni', servername: bytes.subarray(nameStart, nameStart + nameLength).toString('ascii') }
      }
    }
    pos = body + length
  }
  return { kind: 'tls-without-sni' }
}
