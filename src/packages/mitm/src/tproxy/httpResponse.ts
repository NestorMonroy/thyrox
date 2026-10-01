/**
 * HTTP/1.1 mínimo para el reenvío del modo TPROXY: escribe una petición con
 * `connection: close` y lee la respuesta completa (estado, cabeceras, cuerpo
 * por `content-length`, `chunked` o hasta el cierre).
 *
 * Existe porque Bun ignora `createConnection` en `http.request`/`https.request`:
 * el reenvío tiene que ir por su propio socket TLS (el de la salida marcada) y
 * hablar HTTP sobre él.
 */

export interface HttpRequestInit {
  method: string
  path: string
  headers: Record<string, string>
  body: Buffer
}

export interface HttpResponse {
  status: number
  headers: Record<string, string>
  body: Buffer
}

export function formatHttpRequest(init: HttpRequestInit): Buffer {
  const lines = [`${init.method} ${init.path} HTTP/1.1`]
  for (const [name, value] of Object.entries(init.headers)) {
    const lower = name.toLowerCase()
    if (lower === 'content-length' || lower === 'connection') continue
    lines.push(`${name}: ${value}`)
  }
  lines.push(`content-length: ${init.body.length}`, 'connection: close', '', '')
  return Buffer.concat([Buffer.from(lines.join('\r\n'), 'latin1'), init.body])
}

function decodeChunked(bytes: Buffer): Buffer {
  const parts: Buffer[] = []
  let pos = 0
  while (pos < bytes.length) {
    const lineEnd = bytes.indexOf('\r\n', pos)
    if (lineEnd < 0) break
    const size = Number.parseInt(bytes.subarray(pos, lineEnd).toString('latin1').split(';')[0]!.trim(), 16)
    if (!Number.isFinite(size) || size === 0) break
    const start = lineEnd + 2
    parts.push(bytes.subarray(start, start + size))
    pos = start + size + 2
  }
  return Buffer.concat(parts)
}

/** Lee una respuesta completa; lanza si no empieza con una línea de estado HTTP. */
export function parseHttpResponse(raw: Buffer): HttpResponse {
  const headerEnd = raw.indexOf('\r\n\r\n')
  const head = (headerEnd < 0 ? raw : raw.subarray(0, headerEnd)).toString('latin1')
  const [statusLine, ...headerLines] = head.split('\r\n')
  const match = /^HTTP\/1\.[01] (\d{3})/.exec(statusLine ?? '')
  if (!match) throw new Error('upstream response has no HTTP status line')
  const headers: Record<string, string> = {}
  for (const line of headerLines) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const name = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    headers[name] = headers[name] === undefined ? value : `${headers[name]}, ${value}`
  }
  const rest = headerEnd < 0 ? Buffer.alloc(0) : raw.subarray(headerEnd + 4)
  let body = rest
  if ((headers['transfer-encoding'] ?? '').toLowerCase().includes('chunked')) {
    body = decodeChunked(rest)
  } else if (headers['content-length'] !== undefined) {
    body = rest.subarray(0, Number(headers['content-length']))
  }
  return { status: Number(match[1]), headers, body }
}
