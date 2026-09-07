/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/headersHelper.ts` — su
 * única exportación pública (`getMcpServerHeaders`) más el helper privado
 * que consume, ninguno omitido.
 *
 * Repuntados (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/local-observability/debug.js` (`logAntError`),
 * `@thyrox/local-observability/errorHelpers.js` (`errorMessage`),
 * `@thyrox/local-observability/logging` (`logError`, `logMCPDebug`,
 * `logMCPError`) y `@thyrox/local-observability/slowOperations.js`
 * (`jsonParse`).
 *
 * `getIsNonInteractiveSession` (`@claude-code-how-works/app-host/bootstrap/state.js`
 * — `@thyrox/app-host` no declara `./bootstrap/state.js`),
 * `checkHasTrustDialogAccepted` (`@claude-code-how-works/config` — ausente de
 * la raíz de `@thyrox/config`, verificado con resolución real) y
 * `execFileNoThrowWithCwd` (`@claude-code-how-works/shell/execFileNoThrow.js`
 * — `@thyrox/shell` no declara ese subpath) NO resuelven — ninguno de los
 * tres subpaths existe en el `exports` del paquete correspondiente,
 * verificado contra la lista completa de cada uno. Los tres se usan sólo
 * dentro del cuerpo de `getMcpHeadersFromHelper` (nunca a nivel de módulo),
 * así que se envuelven con `require()` diferido: un `import` estático de un
 * paquete cuya base (`@claude-code-how-works/*`) no existe en este árbol
 * hace fallar la carga del MÓDULO ENTERO (`Cannot find module`, medido con
 * `bun -e "import(...)"` antes de esta corrección), no sólo la función que
 * los usa. Mismo patrón que ya evita `appStateHooks.ts` de este puerto.
 *
 * `MACRO.FEEDBACK_CHANNEL` es un define de build de ccnmt (`scripts/defines.ts`)
 * sin sustituto en este árbol; se deja verbatim en el mensaje de error, que
 * de cualquier forma sólo se compone si `checkHasTrustDialogAccepted` (arriba
 * diferido) llegara a resolver `false` — hoy la rama es inalcanzable.
 */
import { logAntError } from '@thyrox/local-observability/debug.js'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { logError, logMCPDebug, logMCPError } from '@thyrox/local-observability/logging'
import { jsonParse } from '@thyrox/local-observability/slowOperations.js'
import { logEvent } from '@thyrox/local-observability'
import type {
  McpHTTPServerConfig,
  McpSSEServerConfig,
  McpWebSocketServerConfig,
  ScopedMcpServerConfig,
} from './types.js'

function requireAppHostBootstrapState(): {
  getIsNonInteractiveSession: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/state.js')
}

function requireConfig(): {
  checkHasTrustDialogAccepted: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config')
}

type ExecFileNoThrowResult = { code: number; stdout: string; stderr: string }

function requireShellExecFileNoThrow(): {
  execFileNoThrowWithCwd: (
    file: string,
    args: string[],
    options: {
      shell?: boolean
      timeout?: number
      env?: NodeJS.ProcessEnv
    },
  ) => Promise<ExecFileNoThrowResult>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/execFileNoThrow.js')
}

/**
 * Verifica si la configuración del servidor MCP viene de la configuración
 * de proyecto (projectSettings o localSettings). Es relevante para los
 * checks de seguridad.
 */
function isMcpServerFromProjectOrLocalSettings(
  config: ScopedMcpServerConfig,
): boolean {
  return config.scope === 'project' || config.scope === 'local'
}

/**
 * Obtiene los encabezados dinámicos de un servidor MCP usando su script
 * headersHelper.
 * @param serverName El nombre del servidor MCP
 * @param config La configuración del servidor MCP
 * @returns Objeto de encabezados, o null si no está configurado o falló
 */
async function getMcpHeadersFromHelper(
  serverName: string,
  config: McpSSEServerConfig | McpHTTPServerConfig | McpWebSocketServerConfig,
): Promise<Record<string, string> | null> {
  if (!config.headersHelper) {
    return null
  }

  // Check de seguridad para configuración de proyecto/local. Se salta el
  // check de trust en sesión no-interactiva (p. ej. CI/CD, automatización).
  if (
    'scope' in config &&
    isMcpServerFromProjectOrLocalSettings(config as ScopedMcpServerConfig) &&
    !requireAppHostBootstrapState().getIsNonInteractiveSession()
  ) {
    // Verifica si el trust ya se estableció para este proyecto.
    const hasTrust = requireConfig().checkHasTrustDialogAccepted()
    if (!hasTrust) {
      const error = new Error(
        `Security: headersHelper for MCP server '${serverName}' executed before workspace trust is confirmed. If you see this message, post in ${MACRO.FEEDBACK_CHANNEL}.`,
      )
      logAntError('MCP headersHelper invoked before trust check', error)
      logEvent('tengu_mcp_headersHelper_missing_trust', {})
      return null
    }
  }

  try {
    logMCPDebug(serverName, 'Executing headersHelper to get dynamic headers')
    const execResult = await requireShellExecFileNoThrow().execFileNoThrowWithCwd(
      config.headersHelper,
      [],
      {
        shell: true,
        timeout: 10000,
        // Pasa el contexto de servidor para que un solo script helper pueda
        // servir a varios servidores MCP (estilo git credential-helper). Ver
        // deshaw/anthropic-issues#28.
        env: {
          ...process.env,
          CLAUDE_CODE_MCP_SERVER_NAME: serverName,
          CLAUDE_CODE_MCP_SERVER_URL: config.url,
        },
      },
    )
    if (execResult.code !== 0 || !execResult.stdout) {
      throw new Error(
        `headersHelper for MCP server '${serverName}' did not return a valid value`,
      )
    }
    const result = execResult.stdout.trim()

    const headers = jsonParse(result)
    if (
      typeof headers !== 'object' ||
      headers === null ||
      Array.isArray(headers)
    ) {
      throw new Error(
        `headersHelper for MCP server '${serverName}' must return a JSON object with string key-value pairs`,
      )
    }

    // Valida que todos los valores sean cadenas.
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value !== 'string') {
        throw new Error(
          `headersHelper for MCP server '${serverName}' returned non-string value for key "${key}": ${typeof value}`,
        )
      }
    }

    logMCPDebug(
      serverName,
      `Successfully retrieved ${Object.keys(headers).length} headers from headersHelper`,
    )
    return headers as Record<string, string>
  } catch (error) {
    logMCPError(
      serverName,
      `Error getting headers from headersHelper: ${errorMessage(error)}`,
    )
    logError(
      new Error(
        `Error getting MCP headers from headersHelper for server '${serverName}': ${errorMessage(error)}`,
      ),
    )
    // Devuelve null en vez de lanzar, para no bloquear la conexión.
    return null
  }
}

/**
 * Obtiene los encabezados combinados (estáticos + dinámicos) de un servidor
 * MCP.
 * @param serverName El nombre del servidor MCP
 * @param config La configuración del servidor MCP
 * @returns Objeto de encabezados combinado
 */
export async function getMcpServerHeaders(
  serverName: string,
  config: McpSSEServerConfig | McpHTTPServerConfig | McpWebSocketServerConfig,
): Promise<Record<string, string>> {
  const staticHeaders = config.headers || {}
  const dynamicHeaders =
    (await getMcpHeadersFromHelper(serverName, config)) || {}

  // Los encabezados dinámicos sobreescriben a los estáticos si ambos están
  // presentes.
  return {
    ...staticHeaders,
    ...dynamicHeaders,
  }
}
