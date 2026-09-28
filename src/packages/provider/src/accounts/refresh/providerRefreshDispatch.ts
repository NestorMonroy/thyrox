/**
 * Lleva el refresco de cada proveedor a su ruta, con la configuración que
 * declaran sus variables. Un proveedor retirado termina sin llamar a nadie;
 * una cuenta de Antigravity sin proyecto lo recupera con el access token
 * nuevo; un proveedor sin ruta propia usa su extremo de tokens.
 *
 * Porte de `_getAccessTokenInternal` y `supportsTokenRefresh` de
 * `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import { normalizeClientProfile } from '../antigravity/clientIdentity.ts'
import { createClientVersions } from '../antigravity/clientVersion.ts'
import { createProjectDiscovery, isUsableProjectId } from '../antigravity/projectDiscovery.ts'
import { anthropicOAuthConfig } from '../oauth/flows/anthropicFlow.ts'
import { antigravityOAuthConfig } from '../oauth/flows/antigravityFlow.ts'
import { type Environment, readVariable } from '../oauth/flows/clientId.ts'
import { codexOAuthConfig } from '../oauth/flows/codexFlow.ts'
import { githubOAuthConfig } from '../oauth/flows/githubFlow.ts'
import { gitlabDuoOAuthConfig } from '../oauth/flows/gitlabDuoFlow.ts'
import { kimiCodingOAuthConfig } from '../oauth/flows/kimiCodingFlow.ts'
import { kiroOAuthConfig } from '../oauth/flows/kiroFlow.ts'
import { openferenceOAuthConfig } from '../oauth/flows/openferenceFlow.ts'
import { qoderOAuthConfig } from '../oauth/flows/qoderFlow.ts'
import { deprecatedRefreshOutcome } from './deprecatedProviders.ts'
import { refreshWithTokenEndpoint, type TokenEndpoint } from './genericRefresh.ts'
import type { GoogleOauthClientMarker } from './googleClientBinding.ts'
import { googleRefreshClient } from './googleClients.ts'
import { refreshAnthropicOAuthToken } from './providers/anthropicRefresh.ts'
import { refreshClineToken } from './providers/clineRefresh.ts'
import { refreshCodebuddyCnToken } from './providers/codebuddyCnRefresh.ts'
import { refreshCodexToken } from './providers/codexRefresh.ts'
import { refreshCursorToken } from './providers/cursorRefresh.ts'
import { refreshGithubToken } from './providers/githubRefresh.ts'
import { refreshGitLabDuoToken } from './providers/gitlabDuoRefresh.ts'
import { refreshGoogleToken } from './providers/googleRefresh.ts'
import { type HostDescription, refreshKimiCodingToken } from './providers/kimiCodingRefresh.ts'
import { refreshKiroToken } from './providers/kiroRefresh.ts'
import { refreshMuseCodeToken } from './providers/museCodeRefresh.ts'
import { refreshOpenferenceToken } from './providers/openferenceRefresh.ts'
import { refreshQoderToken } from './providers/qoderRefresh.ts'
import type { RefreshDeps, RefreshOutcome } from './providers/refreshResult.ts'

type ProviderData = Record<string, unknown>

export interface RefreshCredentials {
  refreshToken: string
  providerSpecificData?: ProviderData | null
  projectId?: string | null
  connectionId?: string | null
}

/** Cualquier resultado de un refrescador: tokens con los campos que cada proveedor añade, un token muerto, o `null`. */
export type ProviderRefreshOutcome = RefreshOutcome | (Record<string, unknown> & { accessToken: string })

export interface ProviderRefreshDispatchDeps extends RefreshDeps {
  env?: Environment
  now?: () => number
  random?: () => number
  sleep?: (ms: number) => Promise<void>
  system?: HostDescription
  platform?: readonly [string, string]
  /** El extremo de tokens de un proveedor sin ruta propia. */
  genericEndpoint?: (provider: string) => TokenEndpoint | null
  /** El proyecto de Cloud Code de la cuenta; por defecto, la consulta de Code Assist. */
  discoverProject?: (accessToken: string, providerSpecificData: ProviderData) => Promise<string | null | undefined | void>
  /** Guarda el proyecto recuperado en la conexión; no debe lanzar. */
  persistProjectId?: (connectionId: string, projectId: string, providerSpecificData: ProviderData) => Promise<void> | void
}

const SUPPORTED_PROVIDERS = new Set(['gemini', 'antigravity', 'agy', 'claude', 'codex', 'openference', 'qoder', 'github', 'kiro', 'amazon-q', 'cline', 'kimi-coding', 'muse-code', 'gitlab-duo', 'codebuddy-cn', 'cursor'])
const PROJECT_PROVIDERS = new Set(['antigravity', 'agy'])

export function createProviderRefreshDispatch(deps: ProviderRefreshDispatchDeps = {}) {
  const env = deps.env ?? process.env
  const fetch = deps.fetch ?? globalThis.fetch
  const { log } = deps
  const base = { fetch, log }
  const versions = createClientVersions({ fetch })

  const discoverProject =
    deps.discoverProject ??
    (async (accessToken: string, data: ProviderData) => {
      const discovery = createProjectDiscovery({ profile: normalizeClientProfile(data.clientProfile), fetch, versions, sleep: deps.sleep, random: deps.random, platform: deps.platform })
      return (await discovery.discover(antigravityOAuthConfig(env), accessToken)).projectId
    })

  /** Recupera el proyecto de una cuenta que no lo tiene; un fallo no quita los tokens nuevos. */
  const recoverProject = async (credentials: RefreshCredentials, result: Record<string, unknown> & { accessToken: string }) => {
    const data = credentials.providerSpecificData ?? {}
    if (data.isProjectIdManual || isUsableProjectId(credentials.projectId) || isUsableProjectId(data.projectId)) return result
    try {
      const discovered = await discoverProject(result.accessToken, data)
      if (!isUsableProjectId(discovered)) return result
      const recovered = { ...result, projectId: discovered, providerSpecificData: { ...data, ...((result.providerSpecificData as ProviderData | undefined) ?? {}), projectId: discovered } }
      if (credentials.connectionId) await deps.persistProjectId?.(credentials.connectionId, discovered, data)
      log?.info?.('TOKEN', 'Antigravity projectId discovered during token refresh', { projectId: discovered })
      return recovered
    } catch (error) {
      log?.warn?.('TOKEN', `Antigravity projectId discovery failed: ${error instanceof Error ? error.message : String(error)}`)
      return result
    }
  }

  const refreshGoogle = async (provider: string, credentials: RefreshCredentials): Promise<ProviderRefreshOutcome> => {
    const data = credentials.providerSpecificData ?? {}
    const client = googleRefreshClient(provider, data.oauthClient as GoogleOauthClientMarker, env)
    const result = await refreshGoogleToken(credentials.refreshToken, client, base)
    if (result && 'accessToken' in result && result.accessToken && PROJECT_PROVIDERS.has(provider)) return recoverProject(credentials, { ...result })
    return result
  }

  async function refresh(provider: string, credentials: RefreshCredentials): Promise<ProviderRefreshOutcome> {
    const deprecated = deprecatedRefreshOutcome(provider, log)
    if (deprecated) return deprecated
    const { refreshToken } = credentials
    const data = credentials.providerSpecificData
    switch (provider) {
      case 'gemini':
      case 'antigravity':
      case 'agy':
        return refreshGoogle(provider, credentials)
      case 'claude':
        return refreshAnthropicOAuthToken(refreshToken, { ...base, config: anthropicOAuthConfig(env) })
      case 'codex':
        return refreshCodexToken(refreshToken, { ...base, config: codexOAuthConfig(env) })
      case 'cursor':
        return refreshCursorToken(refreshToken, { ...base, now: deps.now, random: deps.random, sleep: deps.sleep })
      case 'openference':
        return refreshOpenferenceToken(refreshToken, { ...base, config: openferenceOAuthConfig(env) })
      case 'qoder':
        return refreshQoderToken(refreshToken, { ...base, config: qoderOAuthConfig(env) })
      case 'github':
        return refreshGithubToken(refreshToken, { ...base, config: githubOAuthConfig(env), clientSecret: readVariable(env, 'THYROX_GITHUB_OAUTH_CLIENT_SECRET') })
      case 'kiro':
      case 'amazon-q':
        return refreshKiroToken(refreshToken, data, { ...base, config: kiroOAuthConfig() })
      case 'cline':
      case 'clinepass':
        return refreshClineToken(refreshToken, { ...base, now: deps.now })
      case 'kimi-coding':
        return refreshKimiCodingToken(refreshToken, data, { ...base, config: kimiCodingOAuthConfig(env), env, system: deps.system })
      case 'muse-code':
        return refreshMuseCodeToken(refreshToken, data, { ...base, now: deps.now })
      case 'gitlab-duo':
        return refreshGitLabDuoToken(refreshToken, data, { ...base, config: gitlabDuoOAuthConfig(env) })
      case 'codebuddy-cn':
        return refreshCodebuddyCnToken(refreshToken, base)
      default:
        return refreshWithTokenEndpoint(provider, refreshToken, deps.genericEndpoint?.(provider) ?? null, base)
    }
  }

  function supportsTokenRefresh(provider: string): boolean {
    if (SUPPORTED_PROVIDERS.has(provider)) return true
    const endpoint = deps.genericEndpoint?.(provider)
    return Boolean(endpoint?.refreshUrl || endpoint?.tokenUrl)
  }

  return { refresh, supportsTokenRefresh }
}
