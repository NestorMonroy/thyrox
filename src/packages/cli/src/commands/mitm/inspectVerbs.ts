/**
 * Los verbos de `thyrox mitm inspect`: las peticiones capturadas, sus
 * anotaciones y su repetición, la exportación HAR, las sesiones de grabación,
 * los hosts propios y los modos de captura. El búfer vive en el proceso de
 * `thyrox mitm serve`, así que van a su API publicada.
 */
import { INSPECTOR_BASE } from '@thyrox/mitm/api/routes/inspector/basePath'

import type { ApiRequest, MitmApiCall } from './inProcessApi.ts'
import { tailLiveStream } from './liveTail.ts'
import { publishedApiUrl, type PublishedApiDeps } from './publishedApi.ts'
import { callAndPrint, isUsageError, reportUsage, usage, type UsageError } from './verbResult.ts'

export const INSPECT_VERB = 'inspect'
const TAIL = 'tail'

/** Las opciones de filtro de la lista, con el nombre que espera la consulta. */
const LIST_FILTERS: Record<string, string> = {
  '--profile': 'profile',
  '--host': 'host',
  '--agent': 'agent',
  '--status': 'status',
  '--source': 'source',
  '--session': 'sessionId',
}
const HOST_OPTIONS: Record<string, string> = { '--label': 'label', '--kind': 'kind' }
const SYSTEM_PROXY_OPTIONS: Record<string, string> = { '--port': 'port', '--guard-minutes': 'guardMinutes' }

export interface InspectVerbDeps extends PublishedApiDeps {
  connect: (baseUrl: string) => MitmApiCall
  write: (text: string) => void
  /** Resuelve cuando `tail` tiene que parar. */
  waitForStop: () => Promise<void>
}

/** Pares `--opción valor` de una tabla cerrada; cualquier otra palabra es un error de uso. */
function options(args: string[], table: Record<string, string>): Record<string, string> | UsageError {
  const found: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 2) {
    const key = table[args[i]!]
    if (!key) return usage(`unknown option '${args[i]}'; expected one of: ${Object.keys(table).join(', ')}`)
    const value = args[i + 1]
    if (value === undefined) return usage(`${args[i]} needs a value`)
    found[key] = value
  }
  return found
}

function integerOptions(values: Record<string, string>): Record<string, number> | UsageError {
  const numbers: Record<string, number> = {}
  for (const [key, text] of Object.entries(values)) {
    if (!/^\d+$/.test(text)) return usage(`${key} expects an integer`)
    numbers[key] = Number(text)
  }
  return numbers
}

function at(route: string): string {
  return `${INSPECTOR_BASE}${route}`
}

function segment(value: string): string {
  return encodeURIComponent(value)
}

function filtered(route: string, args: string[]): ApiRequest | UsageError {
  const filters = options(args, LIST_FILTERS)
  if (isUsageError(filters)) return filters
  const query = new URLSearchParams(filters).toString()
  return { method: 'GET', path: at(query ? `${route}?${query}` : route) }
}

function requestId(id: string | undefined, suffix = ''): string | UsageError {
  return id ? at(`/requests/${segment(id)}${suffix}`) : usage('a request id is required')
}

function sessionRequest([action, id, name]: string[]): ApiRequest | UsageError {
  if (action === undefined) return { method: 'GET', path: at('/sessions') }
  if (action === 'start') return { method: 'POST', path: at('/sessions'), body: id === undefined ? {} : { name: id } }
  if (!id) return usage(`sessions ${action} needs a session id`)
  const path = at(`/sessions/${segment(id)}`)
  switch (action) {
    case 'show':
      return { method: 'GET', path }
    case 'stop':
      return { method: 'PATCH', path, body: { action: 'stop' } }
    case 'rename':
      return name ? { method: 'PATCH', path, body: { action: 'rename', name } } : usage('sessions rename needs a name')
    case 'delete':
      return { method: 'DELETE', path }
    case 'export-har':
      return { method: 'GET', path: `${path}/export.har` }
    default:
      return usage('sessions expects start, show, stop, rename, delete or export-har')
  }
}

function hostRequest([action, host, ...rest]: string[]): ApiRequest | UsageError {
  if (action === undefined) return { method: 'GET', path: at('/hosts') }
  if (!host) return usage(`hosts ${action} needs a host`)
  const path = at(`/hosts/${segment(host)}`)
  switch (action) {
    case 'add': {
      const extra = options(rest, HOST_OPTIONS)
      return isUsageError(extra) ? extra : { method: 'POST', path: at('/hosts'), body: { host, ...extra } }
    }
    case 'enable':
    case 'disable':
      return { method: 'PATCH', path, body: { enabled: action === 'enable' } }
    case 'remove':
      return { method: 'DELETE', path }
    default:
      return usage('hosts expects add, enable, disable or remove')
  }
}

function captureModeRequest([mode, action, ...rest]: string[]): ApiRequest | UsageError {
  if (mode === undefined) return { method: 'GET', path: at('/capture-modes') }
  const path = at(`/capture-modes/${mode}`)
  switch (mode) {
    case 'http-proxy':
      return action === 'start' || action === 'stop' ? { method: 'POST', path, body: { action } } : usage('http-proxy expects start or stop')
    case 'system-proxy': {
      if (action === 'revert') return { method: 'POST', path, body: { action } }
      if (action !== 'apply') return usage('system-proxy expects apply or revert')
      const named = options(rest, SYSTEM_PROXY_OPTIONS)
      const numbers = isUsageError(named) ? named : integerOptions(named)
      return isUsageError(numbers) ? numbers : { method: 'POST', path, body: { action, ...numbers } }
    }
    case 'tls-intercept':
      return action === 'on' || action === 'off'
        ? { method: 'POST', path, body: { enabled: action === 'on' } }
        : usage('tls-intercept expects on or off')
    default:
      return usage('capture-modes expects http-proxy, system-proxy or tls-intercept')
  }
}

/** La petición de un verbo, o por qué sus argumentos no alcanzan. */
export function inspectVerbRequest(args: string[]): ApiRequest | UsageError {
  const [verb, first, ...rest] = args
  switch (verb) {
    case 'requests':
      return filtered('/requests', args.slice(1))
    case 'export-har':
      return filtered('/export.har', args.slice(1))
    case 'clear':
      return { method: 'DELETE', path: at('/requests') }
    case 'show': {
      const path = requestId(first)
      return typeof path === 'string' ? { method: 'GET', path } : path
    }
    case 'annotate': {
      const path = requestId(first, '/annotation')
      if (typeof path !== 'string') return path
      return rest.length > 0 ? { method: 'PUT', path, body: { annotation: rest.join(' ') } } : usage('annotate needs the annotation text')
    }
    case 'replay': {
      const path = requestId(first, '/replay')
      return typeof path === 'string' ? { method: 'POST', path } : path
    }
    case 'sessions':
      return sessionRequest(args.slice(1))
    case 'hosts':
      return hostRequest(args.slice(1))
    case 'capture-modes':
      return captureModeRequest(args.slice(1))
    default:
      return usage(`unknown verb '${verb ?? ''}'; expected requests, show, annotate, replay, clear, export-har, sessions, hosts, capture-modes or ${TAIL}`)
  }
}

export async function runInspectVerb(args: string[], deps: InspectVerbDeps): Promise<number> {
  const label = `${INSPECT_VERB} ${args[0] ?? ''}`.trim()
  const request = args[0] === TAIL ? null : inspectVerbRequest(args)
  if (request && isUsageError(request)) return reportUsage(label, request, deps.write)
  const baseUrl = publishedApiUrl(deps)
  if (typeof baseUrl !== 'string') return reportUsage(label, baseUrl, deps.write)
  if (request === null) return tailLiveStream(baseUrl, deps)
  return callAndPrint(label, request, deps.connect(baseUrl), deps.write)
}
