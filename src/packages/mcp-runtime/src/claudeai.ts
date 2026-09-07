/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/claudeai.ts` — sus 4
 * exportaciones, ninguna omitida.
 *
 * Repuntados a `@thyrox/local-observability` (subpath verificado en el
 * `exports` del paquete y símbolo confirmado con resolución real —
 * `bun -e "import(...)"`, nunca `grep`): `.` (`logEvent`) y `./debug.js`
 * (`logForDebugging`). El tipo `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`
 * se re-exporta desde la raíz del paquete (declarado en `compat.ts`), igual
 * que ya lo usa `mcpConnectionTelemetry.ts` de este mismo puerto.
 *
 * `isEnvDefinedFalsy` usa el sustituto local de
 * `./internal/pendingCrossPackageDeps.ts` (no está entre los tres símbolos
 * que `@thyrox/config/env/utils` sí trae — porte parcial TASK-DOCS-0200;
 * ver H-DOCS-1160 para el episodio en que confundir esto con
 * `getClaudeConfigHomeDir` produjo un repunte falso por `grep`).
 *
 * `getGlobalConfig`/`saveGlobalConfig` (`@claude-code-how-works/config`),
 * `getOauthConfig` (`@claude-code-how-works/provider/oauthConstants`) y
 * `getClaudeAIOAuthTokens` (`@claude-code-how-works/provider/authAlias.js`)
 * se usan sólo dentro de cuerpos de función (nunca a nivel de módulo), así
 * que se envuelven con `require()` diferido: un `import` estático de un
 * paquete cuya base (`@claude-code-how-works/*`) no existe en este árbol
 * hace fallar la carga del MÓDULO ENTERO (`Cannot find module`, medido con
 * `bun -e "import(...)"` antes de esta corrección), no sólo la función que
 * los usa. Mismo patrón que ya evita `appStateHooks.ts` de este puerto.
 */

import axios from 'axios'
import memoize from 'lodash-es/memoize.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isEnvDefinedFalsy } from './internal/pendingCrossPackageDeps.js'
import { clearMcpAuthCache } from './client.js'
import { normalizeNameForMCP } from './normalization.js'
import type { ScopedMcpServerConfig } from './types.js'

function requireProviderOauthConstants(): {
  getOauthConfig: () => { BASE_API_URL: string }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/provider/oauthConstants')
}

function requireProviderAuthAlias(): {
  getClaudeAIOAuthTokens: () =>
    | { accessToken?: string; scopes?: string[] }
    | undefined
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/provider/authAlias.js')
}

function requireConfig(): {
  getGlobalConfig: () => { claudeAiMcpEverConnected?: string[] }
  saveGlobalConfig: (
    updater: (current: {
      claudeAiMcpEverConnected?: string[]
    }) => { claudeAiMcpEverConnected?: string[] },
  ) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/config')
}

type ClaudeAIMcpServer = {
  type: 'mcp_server'
  id: string
  display_name: string
  url: string
  created_at: string
}

type ClaudeAIMcpServersResponse = {
  data: ClaudeAIMcpServer[]
  has_more: boolean
  next_page: string | null
}

const FETCH_TIMEOUT_MS = 5000
const MCP_SERVERS_BETA_HEADER = 'mcp-servers-2025-12-04'

/**
 * Obtiene configuraciones de servidor MCP de los configs de organización de
 * Claude.ai. Estos servidores son gestionados por la organización vía
 * Claude.ai.
 *
 * Los resultados se memoizan por la vida de la sesión (un fetch por sesión
 * de CLI).
 */
export const fetchClaudeAIMcpConfigsIfEligible = memoize(
  async (): Promise<Record<string, ScopedMcpServerConfig>> => {
    try {
      if (isEnvDefinedFalsy(process.env.ENABLE_CLAUDEAI_MCP_SERVERS)) {
        logForDebugging('[claudeai-mcp] Disabled via env var')
        logEvent('tengu_claudeai_mcp_eligibility', {
          state:
            'disabled_env_var' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      const tokens = requireProviderAuthAlias().getClaudeAIOAuthTokens()
      if (!tokens?.accessToken) {
        logForDebugging('[claudeai-mcp] No access token')
        logEvent('tengu_claudeai_mcp_eligibility', {
          state:
            'no_oauth_token' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      // Se verifica el scope user:mcp_servers directamente en vez de usar
      // isClaudeAISubscriber(). En modo no-interactivo, isClaudeAISubscriber()
      // devuelve false cuando ANTHROPIC_API_KEY está fijada (incluso con
      // tokens OAuth válidos) porque preferThirdPartyAuthentication() hace
      // que isAnthropicAuthEnabled() devuelva false. Verificar el scope
      // directamente permite a usuarios con API key y token OAuth acceder a
      // los MCPs de claude.ai en modo print.
      if (!tokens.scopes?.includes('user:mcp_servers')) {
        logForDebugging(
          `[claudeai-mcp] Missing user:mcp_servers scope (scopes=${tokens.scopes?.join(',') || 'none'})`,
        )
        logEvent('tengu_claudeai_mcp_eligibility', {
          state:
            'missing_scope' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      const baseUrl = requireProviderOauthConstants().getOauthConfig().BASE_API_URL
      const url = `${baseUrl}/v1/mcp_servers?limit=1000`

      logForDebugging(`[claudeai-mcp] Fetching from ${url}`)

      const response = await axios.get<ClaudeAIMcpServersResponse>(url, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          'anthropic-beta': MCP_SERVERS_BETA_HEADER,
          'anthropic-version': '2023-06-01',
        },
        timeout: FETCH_TIMEOUT_MS,
      })

      const configs: Record<string, ScopedMcpServerConfig> = {}
      // Se registran los nombres normalizados ya usados para detectar
      // colisiones y asignar sufijos (2), (3), etc. Se verifica el nombre
      // normalizado FINAL (con su sufijo) para cubrir el caso borde donde un
      // nombre con sufijo colisiona con el nombre base de otro servidor
      // (p. ej. "Example Server 2" colisionando con "Example Server! (2)",
      // que ambos normalizan a claude_ai_Example_Server_2).
      const usedNormalizedNames = new Set<string>()

      for (const server of response.data.data) {
        const baseName = `claude.ai ${server.display_name}`

        // Se intenta sin sufijo primero, y se incrementa hasta encontrar un
        // nombre normalizado sin usar.
        let finalName = baseName
        let finalNormalized = normalizeNameForMCP(finalName)
        let count = 1
        while (usedNormalizedNames.has(finalNormalized)) {
          count++
          finalName = `${baseName} (${count})`
          finalNormalized = normalizeNameForMCP(finalName)
        }
        usedNormalizedNames.add(finalNormalized)

        configs[finalName] = {
          type: 'claudeai-proxy',
          url: server.url,
          id: server.id,
          scope: 'claudeai',
        }
      }

      logForDebugging(
        `[claudeai-mcp] Fetched ${Object.keys(configs).length} servers`,
      )
      logEvent('tengu_claudeai_mcp_eligibility', {
        state:
          'eligible' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return configs
    } catch {
      logForDebugging(`[claudeai-mcp] Fetch failed`)
      return {}
    }
  },
)

/**
 * Limpia la caché memoizada de fetchClaudeAIMcpConfigsIfEligible. Se llama
 * tras el login para que el siguiente fetch use los tokens de auth nuevos.
 */
export function clearClaudeAIMcpConfigsCache(): void {
  fetchClaudeAIMcpConfigsIfEligible.cache.clear?.()
  // También limpia la caché de auth para que los servidores recién
  // autorizados se reconecten.
  clearMcpAuthCache()
}

/**
 * Registra que un conector de claude.ai se conectó con éxito. Idempotente.
 *
 * Condiciona las notificaciones de arranque "N conectores no disponibles/
 * necesitan auth": un conector que funcionaba ayer y hoy falló es un cambio
 * de estado que vale la pena mostrar; un conector configurado por la
 * organización que lleva en needs-auth desde que apareció es uno que el
 * usuario ya ha ignorado de forma demostrable.
 */
export function markClaudeAiMcpConnected(name: string): void {
  requireConfig().saveGlobalConfig(current => {
    const seen = current.claudeAiMcpEverConnected ?? []
    if (seen.includes(name)) return current
    return { ...current, claudeAiMcpEverConnected: [...seen, name] }
  })
}

export function hasClaudeAiMcpEverConnected(name: string): boolean {
  return (requireConfig().getGlobalConfig().claudeAiMcpEverConnected ?? []).includes(name)
}
