/**
 * Exportación HAR 1.2 del inspector de tráfico: el formato que leen las
 * DevTools de Chrome, Charles, Fiddler o Postman. Los secretos se enmascaran
 * SIEMPRE al exportar, esté como esté la vista; la fuente de la captura va en
 * `_source`, un campo propio que el formato admite por su prefijo de guion
 * bajo.
 *
 * Porte de `omniroute: src/lib/inspector/harExport.ts` (MIT).
 */
import { PRODUCT_NAME } from '@thyrox/config/product'

import packageJson from '../../package.json'
import { maskSecret } from '../maskSecrets.ts'
import type { InterceptedRequest } from './types.ts'

const HAR_VERSION = '1.2'
export const HAR_CREATOR_NAME = `${PRODUCT_NAME} traffic inspector`

interface HarNameValue {
  name: string
  value: string
}

interface HarPostData {
  mimeType: string
  text: string
}

interface HarRequest {
  method: string
  url: string
  httpVersion: string
  headers: HarNameValue[]
  queryString: HarNameValue[]
  cookies: HarNameValue[]
  headersSize: number
  bodySize: number
  postData?: HarPostData
}

interface HarContent {
  size: number
  mimeType: string
  text?: string
}

interface HarResponse {
  status: number
  statusText: string
  httpVersion: string
  headers: HarNameValue[]
  cookies: HarNameValue[]
  content: HarContent
  redirectURL: string
  headersSize: number
  bodySize: number
}

interface HarTimings {
  send: number
  wait: number
  receive: number
}

export interface HarEntry {
  startedDateTime: string
  time: number
  request: HarRequest
  response: HarResponse
  cache: Record<string, never>
  timings: HarTimings
  serverIPAddress?: string
  _source?: string
  _agent?: string
  _detectedKind?: string
  _contextKey?: string
  _sessionId?: string
  _annotation?: string
  _note?: string
  _captureId?: string
}

export interface HarFile {
  log: {
    version: string
    creator: { name: string; version: string }
    entries: HarEntry[]
  }
}

function headersToList(headers: Record<string, string>): HarNameValue[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value: maskSecret(value) }))
}

function contentTypeOf(headers: Record<string, string>): string {
  return headers['content-type'] ?? headers['Content-Type'] ?? 'application/octet-stream'
}

/** Una entrada de CONNECT lleva de ruta `:443`: se deja como pseudo-URL opaca. */
function buildUrl(host: string, path: string): string {
  if (!host && !path.startsWith(':')) return path
  return `https://${host}${path}`
}

function buildPostData(req: InterceptedRequest): HarPostData | undefined {
  if (!req.requestBody) return undefined
  return { mimeType: contentTypeOf(req.requestHeaders), text: maskSecret(req.requestBody) }
}

function buildResponseContent(req: InterceptedRequest): HarContent {
  const mimeType = contentTypeOf(req.responseHeaders)
  if (req.responseBody == null) return { size: req.responseSize, mimeType }
  return { size: req.responseSize, mimeType, text: maskSecret(req.responseBody) }
}

function buildEntry(req: InterceptedRequest): HarEntry {
  const total = req.totalLatencyMs ?? 0
  const upstream = req.upstreamLatencyMs ?? 0
  const entry: HarEntry = {
    startedDateTime: req.timestamp,
    time: total,
    request: {
      method: req.method,
      url: buildUrl(req.host, req.path),
      httpVersion: 'HTTP/1.1',
      headers: headersToList(req.requestHeaders),
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: req.requestSize,
      postData: buildPostData(req),
    },
    response: {
      // Un estado no numérico (`in-flight`, `error`) no es un código HTTP:
      // va como 0 y su texto en `statusText`.
      status: typeof req.status === 'number' ? req.status : 0,
      statusText: typeof req.status === 'string' ? req.status : '',
      httpVersion: 'HTTP/1.1',
      headers: headersToList(req.responseHeaders),
      cookies: [],
      content: buildResponseContent(req),
      redirectURL: '',
      headersSize: -1,
      bodySize: req.responseSize,
    },
    cache: {},
    timings: { send: 0, wait: upstream, receive: total - upstream },
    _source: req.source,
    _captureId: req.id,
  }
  if (req.agent) entry._agent = req.agent
  if (req.detectedKind) entry._detectedKind = req.detectedKind
  if (req.contextKey) entry._contextKey = req.contextKey
  if (req.sessionId) entry._sessionId = req.sessionId
  if (req.annotation) entry._annotation = req.annotation
  if (req.note) entry._note = req.note
  return entry
}

/** Las peticiones capturadas como un HAR 1.2, con los secretos ya enmascarados. */
export function toHar(requests: InterceptedRequest[]): HarFile {
  return {
    log: {
      version: HAR_VERSION,
      creator: { name: HAR_CREATOR_NAME, version: (packageJson as { version: string }).version },
      entries: requests.map(buildEntry),
    },
  }
}
