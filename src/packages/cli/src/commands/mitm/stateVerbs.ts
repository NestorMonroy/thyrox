/**
 * Los verbos de estado de `thyrox mitm`: `status`, `agents`, `agent`,
 * `detect`, `mappings`, `bypass` y `config`. Cada uno se traduce a una
 * petición a la API del MITM y su salida es el JSON de la respuesta.
 */
import type { ApiRequest, MitmApiCall } from './inProcessApi.ts'
import { callAndPrint, isUsageError, reportUsage, usage, type UsageError } from './verbResult.ts'

const BASE = '/api/tools/agent-bridge'

export const STATE_VERBS = ['status', 'agents', 'agent', 'detect', 'mappings', 'bypass', 'config'] as const

export interface StateVerbDeps {
  api: MitmApiCall
  readFile: (path: string) => string
  write: (text: string) => void
}


function agentPath(id: string | undefined, suffix = ''): string | UsageError {
  return id ? `${BASE}/agents/${encodeURIComponent(id)}${suffix}` : usage('an agent id is required')
}

/** Los pares `--set origen=destino` de `mappings`. */
function mappingPairs(args: string[]): Array<{ source: string; target: string }> | UsageError {
  const pairs: Array<{ source: string; target: string }> = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--set') continue
    const [source, target] = (args[++i] ?? '').split('=', 2)
    if (!source || !target) return usage('--set expects source=target')
    pairs.push({ source, target })
  }
  return pairs
}

/** La petición de un verbo, o por qué sus argumentos no alcanzan. */
export function stateVerbRequest(args: string[], readFile?: (path: string) => string): ApiRequest | UsageError {
  const [verb, first, second] = args
  switch (verb) {
    case 'status':
      return { method: 'GET', path: `${BASE}/state` }
    case 'agents':
      return { method: 'GET', path: `${BASE}/agents` }
    case 'agent': {
      const path = agentPath(first)
      return typeof path === 'string' ? { method: 'GET', path } : path
    }
    case 'detect': {
      const path = agentPath(first, '/detect')
      return typeof path === 'string' ? { method: 'GET', path } : path
    }
    case 'mappings': {
      const path = agentPath(first, '/mappings')
      if (typeof path !== 'string') return path
      if (!args.includes('--set')) return { method: 'GET', path }
      const mappings = mappingPairs(args.slice(2))
      return isUsageError(mappings) ? mappings : { method: 'PUT', path, body: { mappings } }
    }
    case 'bypass':
      if (first === undefined || first === 'list') return { method: 'GET', path: `${BASE}/bypass` }
      if (first === 'set') return { method: 'POST', path: `${BASE}/bypass`, body: { patterns: args.slice(2) } }
      if (first === 'remove') {
        return second
          ? { method: 'DELETE', path: `${BASE}/bypass?pattern=${encodeURIComponent(second)}` }
          : usage('bypass remove needs a pattern')
      }
      return usage('bypass expects list, set or remove')
    case 'config':
      if (first === 'export') return { method: 'GET', path: `${BASE}/config` }
      if (first === 'import') {
        if (!second || !readFile) return usage('config import needs a file')
        return { method: 'POST', path: `${BASE}/config`, body: JSON.parse(readFile(second)) }
      }
      return usage('config expects export or import')
    default:
      return usage(`unknown verb '${verb ?? ''}'`)
  }
}

export async function runStateVerb(args: string[], deps: StateVerbDeps): Promise<number> {
  const request = stateVerbRequest(args, deps.readFile)
  if (isUsageError(request)) return reportUsage(args[0], request, deps.write)
  return callAndPrint(args[0], request, deps.api, deps.write)
}
