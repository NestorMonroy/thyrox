/**
 * La cabecera PROXY v1 (protocolo PROXY de HAProxy, versión de texto) que
 * cruza el borde entre el addon y Bun: el puente transparente la antepone para
 * decir a Bun cuál era el destino original, y Bun la antepone para decir a la
 * salida marcada adónde conectar. Una línea ASCII de 107 bytes como mucho:
 *
 *   PROXY TCP4 <ip-origen> <ip-destino> <puerto-origen> <puerto-destino>\r\n
 *
 * Sólo TCP4: el socket transparente del addon es IPv4.
 */

export interface ProxyV1Header {
  srcIp: string
  srcPort: number
  dstIp: string
  dstPort: number
}

export type ProxyV1Parse =
  | { kind: 'header'; header: ProxyV1Header; rest: Buffer }
  | { kind: 'incomplete' }
  | { kind: 'invalid' }

const MAX_HEADER_BYTES = 107
const LINE = /^PROXY TCP4 (\d{1,3}(?:\.\d{1,3}){3}) (\d{1,3}(?:\.\d{1,3}){3}) (\d{1,5}) (\d{1,5})$/

export function formatProxyV1Header(header: ProxyV1Header): string {
  return `PROXY TCP4 ${header.srcIp} ${header.dstIp} ${header.srcPort} ${header.dstPort}\r\n`
}

function port(text: string): number | null {
  const value = Number(text)
  return Number.isInteger(value) && value >= 0 && value <= 65535 ? value : null
}

/** Lee la cabecera del principio de `buffer`; `incomplete` si aún falta el CRLF. */
export function parseProxyV1Header(buffer: Buffer): ProxyV1Parse {
  const end = buffer.indexOf('\r\n')
  if (end < 0) return buffer.length > MAX_HEADER_BYTES ? { kind: 'invalid' } : { kind: 'incomplete' }
  if (end > MAX_HEADER_BYTES) return { kind: 'invalid' }
  const match = LINE.exec(buffer.subarray(0, end).toString('latin1'))
  if (!match) return { kind: 'invalid' }
  const srcPort = port(match[3]!)
  const dstPort = port(match[4]!)
  if (srcPort === null || dstPort === null) return { kind: 'invalid' }
  return {
    kind: 'header',
    header: { srcIp: match[1]!, srcPort, dstIp: match[2]!, dstPort },
    rest: buffer.subarray(end + 2),
  }
}
