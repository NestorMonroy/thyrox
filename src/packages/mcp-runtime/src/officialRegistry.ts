/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/officialRegistry.ts` —
 * sus 3 exportaciones, ninguna omitida.
 *
 * `axios` declarado en `package.json` (`^1.20.0`, mismo rango que ya fija
 * `@thyrox/local-observability`), sin `node_modules` enlazado todavía.
 *
 * Reapuntados a `@thyrox/local-observability` (subpath + símbolo
 * verificados en runtime): `./debug.js` (`logForDebugging`) y
 * `./errorHelpers.js` (`errorMessage`).
 */
import axios from 'axios'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'

type RegistryServer = {
  server: {
    remotes?: Array<{ url: string }>
  }
}

type RegistryResponse = {
  servers: RegistryServer[]
}

// URLs sin query string ni barra final — coincide con la normalización que
// hace getLoggingSafeMcpBaseUrl, para que Set.has() funcione directamente.
let officialUrls: Set<string> | undefined

function normalizeUrl(url: string): string | undefined {
  try {
    const u = new URL(url)
    u.search = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

/**
 * Fetch fire-and-forget del registro oficial de MCP.
 * Puebla officialUrls para las consultas de isOfficialMcpUrl.
 */
export async function prefetchOfficialMcpUrls(): Promise<void> {
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) {
    return
  }

  try {
    const response = await axios.get<RegistryResponse>(
      'https://api.anthropic.com/mcp-registry/v0/servers?version=latest&visibility=commercial',
      { timeout: 5000 },
    )

    const urls = new Set<string>()
    for (const entry of response.data.servers) {
      for (const remote of entry.server.remotes ?? []) {
        const normalized = normalizeUrl(remote.url)
        if (normalized) {
          urls.add(normalized)
        }
      }
    }
    officialUrls = urls
    logForDebugging(`[mcp-registry] Loaded ${urls.size} official MCP URLs`)
  } catch (error) {
    logForDebugging(`Failed to fetch MCP registry: ${errorMessage(error)}`, {
      level: 'error',
    })
  }
}

/**
 * Devuelve true si y sólo si la URL dada (ya normalizada vía
 * getLoggingSafeMcpBaseUrl) está en el registro oficial de MCP. Registro
 * indefinido → false (fail-closed).
 */
export function isOfficialMcpUrl(normalizedUrl: string): boolean {
  return officialUrls?.has(normalizedUrl) ?? false
}

export function resetOfficialMcpUrlsForTesting(): void {
  officialUrls = undefined
}
