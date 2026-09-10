/**
 * Puerto de `ccnmt: packages/teleport/src/api.ts` (466 líneas fuente,
 * 100% portado). Cliente HTTP contra la Sessions API (`/v1/sessions`) y
 * la Environment API — listar/crear sesiones, enviar eventos, renombrar
 * y resolver credenciales OAuth + UUID de organización.
 */

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { randomUUID } from 'crypto'
import { getOauthConfig } from '@thyrox/provider/oauthConstants'
import { getOrganizationUUID } from '@thyrox/provider/oauth/client.js'
import z from 'zod/v4'
import { getClaudeAIOAuthTokens } from '@thyrox/provider/authAlias.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { parseGitHubRepository } from '@thyrox/storage/detectRepository.js'
import { errorMessage, toError } from '@thyrox/local-observability/errorHelpers.js'
import { lazySchema } from '@thyrox/config/internal/lazySchema.js'
import { logError } from '@thyrox/local-observability/logging'
import { sleep } from '@thyrox/config/sleep'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'

// Configuracion de reintento para las peticiones de la API de teleport
const TELEPORT_RETRY_DELAYS = [2000, 4000, 8000, 16000] // 4 reintentos con backoff exponencial
const MAX_TELEPORT_RETRIES = TELEPORT_RETRY_DELAYS.length

export const CCR_BYOC_BETA = 'ccr-byoc-2025-07-29'

/**
 * Comprueba si un error de axios es un error de red transitorio que
 * deberia reintentarse.
 */
export function isTransientNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }

  // Reintenta ante errores de red (sin respuesta recibida)
  if (!error.response) {
    return true
  }

  // Reintenta ante errores de servidor (5xx)
  if (error.response.status >= 500) {
    return true
  }

  // No reintenta ante errores de cliente (4xx) - no son transitorios
  return false
}

/**
 * Hace una peticion GET de axios con reintento automatico ante errores
 * de red transitorios. Usa backoff exponencial: 2s, 4s, 8s, 16s (4
 * reintentos = 5 intentos totales).
 */
export async function axiosGetWithRetry<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_TELEPORT_RETRIES; attempt++) {
    try {
      return await axios.get<T>(url, config)
    } catch (error) {
      lastError = error

      // No reintenta si esto no es un error transitorio
      if (!isTransientNetworkError(error)) {
        throw error
      }

      // No reintenta si ya se agotaron los reintentos
      if (attempt >= MAX_TELEPORT_RETRIES) {
        logForDebugging(
          `Teleport request failed after ${attempt + 1} attempts: ${errorMessage(error)}`,
        )
        throw error
      }

      const delay = TELEPORT_RETRY_DELAYS[attempt] ?? 2000
      logForDebugging(
        `Teleport request failed (attempt ${attempt + 1}/${MAX_TELEPORT_RETRIES + 1}), retrying in ${delay}ms: ${errorMessage(error)}`,
      )
      await sleep(delay)
    }
  }

  throw lastError
}

// Tipos que calzan con la respuesta real de la Sessions API de
// api/schemas/sessions/sessions.py
export type SessionStatus = 'requires_action' | 'running' | 'idle' | 'archived'

export type GitSource = {
  type: 'git_repository'
  url: string
  revision?: string | null
  allow_unrestricted_git_push?: boolean
}

export type KnowledgeBaseSource = {
  type: 'knowledge_base'
  knowledge_base_id: string
}

export type SessionContextSource = GitSource | KnowledgeBaseSource

// Tipos de outcome de api/schemas/sandbox.py
export type OutcomeGitInfo = {
  type: 'github'
  repo: string
  branches: string[]
}

export type GitRepositoryOutcome = {
  type: 'git_repository'
  git_info: OutcomeGitInfo
}

export type Outcome = GitRepositoryOutcome

export type SessionContext = {
  sources: SessionContextSource[]
  cwd: string
  outcomes: Outcome[] | null
  custom_system_prompt: string | null
  append_system_prompt: string | null
  model: string | null
  // Siembra el filesystem con un git bundle vía Files API
  seed_bundle_file_id?: string
  github_pr?: { owner: string; repo: string; number: number }
  reuse_outcome_branches?: boolean
}

export type SessionResource = {
  type: 'session'
  id: string
  title: string | null
  session_status: SessionStatus
  environment_id: string
  created_at: string
  updated_at: string
  session_context: SessionContext
}

export type ListSessionsResponse = {
  data: SessionResource[]
  has_more: boolean
  first_id: string | null
  last_id: string | null
}

export const CodeSessionSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.enum([
      'idle',
      'working',
      'waiting',
      'completed',
      'archived',
      'cancelled',
      'rejected',
    ]),
    repo: z
      .object({
        name: z.string(),
        owner: z.object({
          login: z.string(),
        }),
        default_branch: z.string().optional(),
      })
      .nullable(),
    turns: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  }),
)

// Exporta el tipo inferido a partir del esquema Zod
export type CodeSession = z.infer<ReturnType<typeof CodeSessionSchema>>

/**
 * Valida y prepara las peticiones a la API.
 * @returns Objeto con el access token y el UUID de organizacion
 */
export async function prepareApiRequest(): Promise<{
  accessToken: string
  orgUUID: string
}> {
  const accessToken = getClaudeAIOAuthTokens()?.accessToken
  if (accessToken === undefined) {
    throw new Error(
      'Claude Code web sessions require authentication with a Claude.ai account. API key authentication is not sufficient. Please run /login to authenticate, or check your authentication status with /status.',
    )
  }

  const orgUUID = await getOrganizationUUID()
  if (!orgUUID) {
    throw new Error('Unable to get organization UUID')
  }

  return { accessToken, orgUUID }
}

/**
 * Obtiene las sesiones de codigo desde la nueva Sessions API
 * (/v1/sessions).
 * @returns Array de sesiones de codigo
 */
export async function fetchCodeSessionsFromSessionsAPI(): Promise<
  CodeSession[]
> {
  const { accessToken, orgUUID } = await prepareApiRequest()

  const url = `${getOauthConfig().BASE_API_URL}/v1/sessions`

  try {
    const headers = {
      ...getOAuthHeaders(accessToken),
      'anthropic-beta': 'ccr-byoc-2025-07-29',
      'x-organization-uuid': orgUUID,
    }

    const response = await axiosGetWithRetry<ListSessionsResponse>(url, {
      headers,
    })

    if (response.status !== 200) {
      throw new Error(`Failed to fetch code sessions: ${response.statusText}`)
    }

    // Transforma SessionResource[] al formato CodeSession[]
    const sessions: CodeSession[] = response.data.data.map(session => {
      // Extrae la info del repositorio de las fuentes git
      const gitSource = session.session_context.sources.find(
        (source): source is GitSource => source.type === 'git_repository',
      )

      let repo: CodeSession['repo'] = null
      if (gitSource?.url) {
        // Parsea la URL de GitHub con la utilidad ya existente
        const repoPath = parseGitHubRepository(gitSource.url)
        if (repoPath) {
          const [owner, name] = repoPath.split('/')
          if (owner && name) {
            repo = {
              name,
              owner: {
                login: owner,
              },
              default_branch: gitSource.revision || undefined,
            }
          }
        }
      }

      return {
        id: session.id,
        title: session.title || 'Untitled',
        description: '', // SessionResource no tiene campo description
        status: session.session_status as CodeSession['status'], // Mapea session_status a status
        repo,
        turns: [], // SessionResource no tiene campo turns
        created_at: session.created_at,
        updated_at: session.updated_at,
      }
    })

    return sessions
  } catch (error) {
    const err = toError(error)
    logError(err)
    throw error
  }
}

/**
 * Crea las cabeceras OAuth para las peticiones a la API.
 * @param accessToken El access token OAuth
 * @returns Objeto de cabeceras con Authorization, Content-Type y anthropic-version
 */
export function getOAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  }
}

/**
 * Obtiene una sesion por ID desde la Sessions API.
 * @param sessionId El ID de la sesion a obtener
 * @returns El recurso de sesion
 */
export async function fetchSession(
  sessionId: string,
): Promise<SessionResource> {
  const { accessToken, orgUUID } = await prepareApiRequest()

  const url = `${getOauthConfig().BASE_API_URL}/v1/sessions/${sessionId}`
  const headers = {
    ...getOAuthHeaders(accessToken),
    'anthropic-beta': 'ccr-byoc-2025-07-29',
    'x-organization-uuid': orgUUID,
  }

  const response = await axios.get<SessionResource>(url, {
    headers,
    timeout: 15000,
    validateStatus: status => status < 500,
  })

  if (response.status !== 200) {
    // Extrae el mensaje de error de la respuesta, si esta disponible
    const errorData = response.data as { error?: { message?: string } }
    const apiMessage = errorData?.error?.message

    if (response.status === 404) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    if (response.status === 401) {
      throw new Error('Session expired. Please run /login to sign in again.')
    }

    throw new Error(
      apiMessage ||
        `Failed to fetch session: ${response.status} ${response.statusText}`,
    )
  }

  return response.data
}

/**
 * Extrae el primer nombre de rama de los outcomes de repositorio git de
 * una sesion.
 * @param session El recurso de sesion del que extraer
 * @returns El primer nombre de rama, o undefined si no hay ninguno
 */
export function getBranchFromSession(
  session: SessionResource,
): string | undefined {
  const gitOutcome = session.session_context.outcomes?.find(
    (outcome): outcome is GitRepositoryOutcome =>
      outcome.type === 'git_repository',
  )
  return gitOutcome?.git_info?.branches[0]
}

/**
 * Contenido de un mensaje de sesion remota.
 * Acepta un string plano o un array de bloques de contenido (texto,
 * imagen, etc.) siguiendo la especificacion de mensajes de la API de
 * Anthropic.
 */
export type RemoteMessageContent =
  | string
  | Array<{ type: string; [key: string]: unknown }>

/**
 * Envia un evento de mensaje de usuario a una sesion remota existente via
 * la Sessions API.
 * @param sessionId El ID de la sesion a la que enviar el evento
 * @param messageContent El contenido del mensaje de usuario (string o bloques de contenido)
 * @param opts.uuid UUID opcional para el evento — los llamadores que ya
 *   agregaron un UserMessage local deben pasar su UUID para que el
 *   filtrado de eco pueda deduplicar
 * @returns Promise<boolean> True si tuvo exito, false en otro caso
 */
export async function sendEventToRemoteSession(
  sessionId: string,
  messageContent: RemoteMessageContent,
  opts?: { uuid?: string },
): Promise<boolean> {
  try {
    const { accessToken, orgUUID } = await prepareApiRequest()

    const url = `${getOauthConfig().BASE_API_URL}/v1/sessions/${sessionId}/events`
    const headers = {
      ...getOAuthHeaders(accessToken),
      'anthropic-beta': 'ccr-byoc-2025-07-29',
      'x-organization-uuid': orgUUID,
    }

    const userEvent = {
      uuid: opts?.uuid ?? randomUUID(),
      session_id: sessionId,
      type: 'user',
      parent_tool_use_id: null,
      message: {
        role: 'user',
        content: messageContent,
      },
    }

    const requestBody = {
      events: [userEvent],
    }

    logForDebugging(
      `[sendEventToRemoteSession] Sending event to session ${sessionId}`,
    )
    // El endpoint puede bloquear hasta que el worker de CCR este listo.
    // Observado ~2.6s en casos normales; se deja un margen generoso para
    // contenedores con arranque en frio.
    const response = await axios.post(url, requestBody, {
      headers,
      validateStatus: status => status < 500,
      timeout: 30000,
    })

    if (response.status === 200 || response.status === 201) {
      logForDebugging(
        `[sendEventToRemoteSession] Successfully sent event to session ${sessionId}`,
      )
      return true
    }

    logForDebugging(
      `[sendEventToRemoteSession] Failed with status ${response.status}: ${jsonStringify(response.data)}`,
    )
    return false
  } catch (error) {
    logForDebugging(`[sendEventToRemoteSession] Error: ${errorMessage(error)}`)
    return false
  }
}

/**
 * Actualiza el titulo de una sesion remota existente via la Sessions API.
 * @param sessionId El ID de la sesion a actualizar
 * @param title El nuevo titulo para la sesion
 * @returns Promise<boolean> True si tuvo exito, false en otro caso
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string,
): Promise<boolean> {
  try {
    const { accessToken, orgUUID } = await prepareApiRequest()

    const url = `${getOauthConfig().BASE_API_URL}/v1/sessions/${sessionId}`
    const headers = {
      ...getOAuthHeaders(accessToken),
      'anthropic-beta': 'ccr-byoc-2025-07-29',
      'x-organization-uuid': orgUUID,
    }

    logForDebugging(
      `[updateSessionTitle] Updating title for session ${sessionId}: "${title}"`,
    )
    const response = await axios.patch(
      url,
      { title },
      {
        headers,
        validateStatus: status => status < 500,
      },
    )

    if (response.status === 200) {
      logForDebugging(
        `[updateSessionTitle] Successfully updated title for session ${sessionId}`,
      )
      return true
    }

    logForDebugging(
      `[updateSessionTitle] Failed with status ${response.status}: ${jsonStringify(response.data)}`,
    )
    return false
  } catch (error) {
    logForDebugging(`[updateSessionTitle] Error: ${errorMessage(error)}`)
    return false
  }
}
