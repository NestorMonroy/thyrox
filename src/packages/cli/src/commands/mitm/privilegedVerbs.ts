/**
 * Los verbos privilegiados de `thyrox mitm`: arrancar, parar y reiniciar el
 * servidor MITM, confiar en su certificado, el DNS y el reinicio de un
 * agente, la reparación, el diagnóstico, la CA del upstream y la captura
 * TPROXY. Van a la API que sirve `thyrox mitm serve`, porque ella es la dueña
 * del proceso del servidor MITM. La contraseña de sudo sólo entra por stdin.
 */
import type { ApiRequest, MitmApiCall } from './inProcessApi.ts'
import { callAndPrint, isUsageError, reportUsage, usage, type UsageError } from './verbResult.ts'

const BASE = '/api/tools/agent-bridge'
const SERVER_ACTIONS = ['start', 'stop', 'restart', 'trust-cert', 'regenerate-cert'] as const
const SUDO_FROM_STDIN = '--sudo-password-stdin'
const SUDO_IN_ARGV = '--sudo-password'

export const PRIVILEGED_VERBS = [...SERVER_ACTIONS, 'cert', 'untrust-cert', 'dns', 'reset', 'repair', 'diagnose', 'upstream-ca', 'tproxy'] as const

/** Las opciones numéricas de `tproxy start`, con el nombre que espera la API. */
const TPROXY_OPTIONS: Record<string, string> = {
  '--dport': 'dport',
  '--mark': 'mark',
  '--on-port': 'onPort',
  '--route-table': 'routeTable',
  '--bypass-mark': 'bypassMark',
}

export interface PrivilegedVerbDeps {
  /** La URL de la API en marcha, o `null` si no hay ninguna. */
  apiUrl: () => string | null
  connect: (baseUrl: string) => MitmApiCall
  readSecret: () => Promise<string>
  write: (text: string) => void
}

function agentPath(id: string | undefined, suffix: string): string | UsageError {
  return id ? `${BASE}/agents/${encodeURIComponent(id)}${suffix}` : usage('an agent id is required')
}

function tproxyStartBody(args: string[]): Record<string, number> | UsageError {
  const body: Record<string, number> = {}
  for (let i = 0; i < args.length; i++) {
    const key = TPROXY_OPTIONS[args[i]!]
    if (!key) continue
    const value = Number(args[++i])
    if (!Number.isInteger(value)) return usage(`${args[i - 1]} expects an integer`)
    body[key] = value
  }
  return body
}

/** La petición de un verbo, o por qué sus argumentos no alcanzan. */
export function privilegedVerbRequest(args: string[]): ApiRequest | UsageError {
  const [verb, first, second] = args
  if ((SERVER_ACTIONS as readonly string[]).includes(verb ?? '')) {
    return { method: 'POST', path: `${BASE}/server`, body: { action: verb } }
  }
  switch (verb) {
    case 'cert':
      return { method: 'GET', path: `${BASE}/cert` }
    case 'untrust-cert':
      return { method: 'DELETE', path: `${BASE}/cert` }
    case 'dns': {
      const path = agentPath(first, '/dns')
      if (typeof path !== 'string') return path
      if (second !== 'on' && second !== 'off') return usage('dns expects on or off')
      return { method: 'POST', path, body: { enabled: second === 'on' } }
    }
    case 'reset': {
      const path = agentPath(first, '/reset')
      return typeof path === 'string' ? { method: 'POST', path, body: {} } : path
    }
    case 'repair':
      return { method: 'POST', path: `${BASE}/repair`, body: {} }
    case 'diagnose':
      return { method: 'GET', path: `${BASE}/diagnose` }
    case 'upstream-ca':
      if (first === undefined) return { method: 'GET', path: `${BASE}/upstream-ca` }
      if (!second) return usage(`upstream-ca ${first} needs a path`)
      if (first === 'set') return { method: 'POST', path: `${BASE}/upstream-ca`, body: { path: second } }
      if (first === 'test') return { method: 'POST', path: `${BASE}/upstream-ca/test`, body: { path: second } }
      return usage('upstream-ca expects set or test')
    case 'tproxy':
      if (first === undefined) return { method: 'GET', path: `${BASE}/tproxy` }
      if (first === 'stop') return { method: 'DELETE', path: `${BASE}/tproxy` }
      if (first === 'start') {
        const body = tproxyStartBody(args.slice(2))
        return isUsageError(body) ? body : { method: 'POST', path: `${BASE}/tproxy`, body }
      }
      return usage('tproxy expects start or stop')
    default:
      return usage(`unknown verb '${verb ?? ''}'`)
  }
}

export async function runPrivilegedVerb(args: string[], deps: PrivilegedVerbDeps): Promise<number> {
  const verb = args[0]
  // En argv la contraseña queda a la vista de `ps` y del historial.
  if (args.includes(SUDO_IN_ARGV)) {
    return reportUsage(verb, usage(`the sudo password is read from stdin: use ${SUDO_FROM_STDIN}`), deps.write)
  }
  const request = privilegedVerbRequest(args.filter(a => a !== SUDO_FROM_STDIN))
  if (isUsageError(request)) return reportUsage(verb, request, deps.write)
  const baseUrl = deps.apiUrl()
  if (!baseUrl) return reportUsage(verb, usage('no MITM API is running; start it with thyrox mitm serve'), deps.write)
  if (args.includes(SUDO_FROM_STDIN)) {
    request.body = { ...(request.body as object), sudoPassword: await deps.readSecret() }
  }
  return callAndPrint(verb, request, deps.connect(baseUrl), deps.write)
}
