/**
 * Puerto fiel de `ccnmt: packages/bridge/src/createSession.ts`.
 * `getClaudeAIOAuthTokens`/`getOrganizationUUID`/`getOauthConfig`/
 * `getOAuthHeaders`/`parseGitHubRepository`/`parseGitRemote`/
 * `getDefaultBranch`/`getMainLoopModel`/`logForDebugging`/
 * `errorMessage` son sustitutos — ver
 * `internal/pendingCrossPackageDeps.ts`. La fuente cargaba estos
 * símbolos (más `axios`) con `await import(...)` perezoso en cada
 * función exportada; aquí se izan a imports estáticos de módulo porque
 * el especificador SÍ resuelve (Regla 3): `axios` es dependencia npm
 * real, y el resto son los sustitutos de este mismo archivo — nunca
 * paquetes `@claude-code-how-works/*` que de verdad no resolverían.
 */
import axios from 'axios'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import {
  errorMessage,
  getClaudeAIOAuthTokens,
  getDefaultBranch,
  getMainLoopModel,
  getOAuthHeaders,
  getOauthConfig,
  getOrganizationUUID,
  logForDebugging,
  parseGitHubRepository,
  parseGitRemote,
} from './internal/pendingCrossPackageDeps.js'
import { extractErrorDetail } from './debugUtils.js'
import { toCompatSessionId } from './sessionIdCompat.js'

type GitSource = {
  type: 'git_repository'
  url: string
  revision?: string
}

type GitOutcome = {
  type: 'git_repository'
  git_info: { type: 'github'; repo: string; branches: string[] }
}

// Los eventos deben envolverse en { type: 'event', data: <sdk_message> }
// para el endpoint POST /v1/sessions (formato de unión discriminada).
type SessionEvent = {
  type: 'event'
  data: SDKMessage
}

/**
 * Crea una sesión en un entorno de bridge vía POST /v1/sessions.
 *
 * La usan tanto `claude remote-control` (sesión vacía para que el
 * usuario tenga dónde escribir de inmediato) como `/remote-control`
 * (sesión pre-poblada con historial de conversación).
 *
 * Devuelve el ID de sesión en éxito, o null si la creación falla (no fatal).
 */
export async function createBridgeSession({
  environmentId,
  title,
  events,
  gitRepoUrl,
  branch,
  signal,
  baseUrl: baseUrlOverride,
  getAccessToken,
  permissionMode,
}: {
  environmentId: string
  title?: string
  events: SessionEvent[]
  gitRepoUrl: string | null
  branch: string
  signal: AbortSignal
  baseUrl?: string
  getAccessToken?: () => string | undefined
  permissionMode?: string
}): Promise<string | null> {
  const accessToken =
    getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken
  if (!accessToken) {
    logForDebugging('[bridge] No access token for session creation')
    return null
  }

  const orgUUID = await getOrganizationUUID()
  if (!orgUUID) {
    logForDebugging('[bridge] No org UUID for session creation')
    return null
  }

  // Construye la fuente git y el contexto de outcome
  let gitSource: GitSource | null = null
  let gitOutcome: GitOutcome | null = null

  if (gitRepoUrl) {
    const parsed = parseGitRemote(gitRepoUrl)
    if (parsed) {
      const { host, owner, name } = parsed
      const revision = branch || (await getDefaultBranch()) || undefined
      gitSource = {
        type: 'git_repository',
        url: `https://${host}/${owner}/${name}`,
        revision,
      }
      gitOutcome = {
        type: 'git_repository',
        git_info: {
          type: 'github',
          repo: `${owner}/${name}`,
          branches: [`claude/${branch || 'task'}`],
        },
      }
    } else {
      // Fallback: intenta parseGitHubRepository para el formato owner/repo
      const ownerRepo = parseGitHubRepository(gitRepoUrl)
      if (ownerRepo) {
        const [owner, name] = ownerRepo.split('/')
        if (owner && name) {
          const revision = branch || (await getDefaultBranch()) || undefined
          gitSource = {
            type: 'git_repository',
            url: `https://github.com/${owner}/${name}`,
            revision,
          }
          gitOutcome = {
            type: 'git_repository',
            git_info: {
              type: 'github',
              repo: `${owner}/${name}`,
              branches: [`claude/${branch || 'task'}`],
            },
          }
        }
      }
    }
  }

  const requestBody = {
    ...(title !== undefined && { title }),
    events,
    session_context: {
      sources: gitSource ? [gitSource] : [],
      outcomes: gitOutcome ? [gitOutcome] : [],
      model: getMainLoopModel(),
    },
    environment_id: environmentId,
    source: 'remote-control',
    ...(permissionMode && { permission_mode: permissionMode }),
  }

  const headers = {
    ...getOAuthHeaders(accessToken),
    'anthropic-beta': 'ccr-byoc-2025-07-29',
    'x-organization-uuid': orgUUID,
  }

  const url = `${baseUrlOverride ?? getOauthConfig().BASE_API_URL}/v1/sessions`
  let response
  try {
    response = await axios.post(url, requestBody, {
      headers,
      signal,
      validateStatus: s => s < 500,
    })
  } catch (err: unknown) {
    logForDebugging(
      `[bridge] Session creation request failed: ${errorMessage(err)}`,
    )
    return null
  }
  const isSuccess = response.status === 200 || response.status === 201

  if (!isSuccess) {
    const detail = extractErrorDetail(response.data)
    logForDebugging(
      `[bridge] Session creation failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
    )
    return null
  }

  const sessionData: unknown = response.data
  if (
    !sessionData ||
    typeof sessionData !== 'object' ||
    !('id' in sessionData) ||
    typeof sessionData.id !== 'string'
  ) {
    logForDebugging('[bridge] No session ID in response')
    return null
  }

  return sessionData.id
}

/**
 * Obtiene una sesión de bridge vía GET /v1/sessions/{id}.
 *
 * Devuelve el environment_id de la sesión (para el resume de
 * `--session-id`) y su título. Usa las mismas cabeceras acotadas a la
 * org que create/archive — el cliente a nivel de environments en
 * bridgeApi.ts usa una cabecera beta distinta y sin UUID de org, lo que
 * hace que la Sessions API devuelva 404.
 */
export async function getBridgeSession(
  sessionId: string,
  opts?: { baseUrl?: string; getAccessToken?: () => string | undefined },
): Promise<{ environment_id?: string; title?: string } | null> {
  const accessToken =
    opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken
  if (!accessToken) {
    logForDebugging('[bridge] No access token for session fetch')
    return null
  }

  const orgUUID = await getOrganizationUUID()
  if (!orgUUID) {
    logForDebugging('[bridge] No org UUID for session fetch')
    return null
  }

  const headers = {
    ...getOAuthHeaders(accessToken),
    'anthropic-beta': 'ccr-byoc-2025-07-29',
    'x-organization-uuid': orgUUID,
  }

  const url = `${opts?.baseUrl ?? getOauthConfig().BASE_API_URL}/v1/sessions/${sessionId}`
  logForDebugging(`[bridge] Fetching session ${sessionId}`)

  let response
  try {
    response = await axios.get<{ environment_id?: string; title?: string }>(
      url,
      { headers, timeout: 10_000, validateStatus: s => s < 500 },
    )
  } catch (err: unknown) {
    logForDebugging(
      `[bridge] Session fetch request failed: ${errorMessage(err)}`,
    )
    return null
  }

  if (response.status !== 200) {
    const detail = extractErrorDetail(response.data)
    logForDebugging(
      `[bridge] Session fetch failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
    )
    return null
  }

  return response.data
}

/**
 * Archiva una sesión de bridge vía POST /v1/sessions/{id}/archive.
 *
 * El servidor CCR nunca archiva sesiones automáticamente — el archivado
 * siempre es una acción explícita del cliente. Tanto `claude
 * remote-control` (bridge standalone) como el bridge del REPL
 * `/remote-control` siempre-activo llaman a esto durante el apagado
 * para archivar cualquier sesión que siga viva.
 *
 * El endpoint de archive acepta sesiones en cualquier estado (running,
 * idle, requires_action, pending) y devuelve 409 si ya está archivada,
 * lo que hace seguro llamarlo incluso si el runner del lado servidor ya
 * archivó la sesión.
 *
 * Los llamadores deben manejar errores — esta función no tiene
 * try/catch; 5xx, timeouts y errores de red lanzan. El archivado es
 * best-effort durante la limpieza; los call sites envuelven con .catch().
 */
export async function archiveBridgeSession(
  sessionId: string,
  opts?: {
    baseUrl?: string
    getAccessToken?: () => string | undefined
    timeoutMs?: number
  },
): Promise<void> {
  const accessToken =
    opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken
  if (!accessToken) {
    logForDebugging('[bridge] No access token for session archive')
    return
  }

  const orgUUID = await getOrganizationUUID()
  if (!orgUUID) {
    logForDebugging('[bridge] No org UUID for session archive')
    return
  }

  const headers = {
    ...getOAuthHeaders(accessToken),
    'anthropic-beta': 'ccr-byoc-2025-07-29',
    'x-organization-uuid': orgUUID,
  }

  const url = `${opts?.baseUrl ?? getOauthConfig().BASE_API_URL}/v1/sessions/${sessionId}/archive`
  logForDebugging(`[bridge] Archiving session ${sessionId}`)

  const response = await axios.post(
    url,
    {},
    {
      headers,
      timeout: opts?.timeoutMs ?? 10_000,
      validateStatus: s => s < 500,
    },
  )

  if (response.status === 200) {
    logForDebugging(`[bridge] Session ${sessionId} archived successfully`)
  } else {
    const detail = extractErrorDetail(response.data)
    logForDebugging(
      `[bridge] Session archive failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
    )
  }
}

/**
 * Actualiza el título de una sesión de bridge vía PATCH /v1/sessions/{id}.
 *
 * Se llama cuando el usuario renombra una sesión vía /rename mientras
 * una conexión de bridge está activa, para que el título se mantenga
 * sincronizado en claude.ai/code.
 *
 * Los errores se tragan — la sincronización de título es best-effort.
 */
export async function updateBridgeSessionTitle(
  sessionId: string,
  title: string,
  opts?: { baseUrl?: string; getAccessToken?: () => string | undefined },
): Promise<void> {
  const accessToken =
    opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken
  if (!accessToken) {
    logForDebugging('[bridge] No access token for session title update')
    return
  }

  const orgUUID = await getOrganizationUUID()
  if (!orgUUID) {
    logForDebugging('[bridge] No org UUID for session title update')
    return
  }

  const headers = {
    ...getOAuthHeaders(accessToken),
    'anthropic-beta': 'ccr-byoc-2025-07-29',
    'x-organization-uuid': orgUUID,
  }

  // El gateway de compat sólo acepta session_* (compat/convert.go:27).
  // Los llamadores v2 pasan cse_* crudo; se re-etiqueta aquí para que
  // todos los llamadores puedan pasar lo que tengan. Idempotente para el
  // session_* de v1 y el compatSessionId ya convertido de bridgeMain.
  const compatId = toCompatSessionId(sessionId)
  const url = `${opts?.baseUrl ?? getOauthConfig().BASE_API_URL}/v1/sessions/${compatId}`
  logForDebugging(`[bridge] Updating session title: ${compatId} → ${title}`)

  try {
    const response = await axios.patch(
      url,
      { title },
      { headers, timeout: 10_000, validateStatus: s => s < 500 },
    )

    if (response.status === 200) {
      logForDebugging(`[bridge] Session title updated successfully`)
    } else {
      const detail = extractErrorDetail(response.data)
      logForDebugging(
        `[bridge] Session title update failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
      )
    }
  } catch (err: unknown) {
    logForDebugging(
      `[bridge] Session title update request failed: ${errorMessage(err)}`,
    )
  }
}
