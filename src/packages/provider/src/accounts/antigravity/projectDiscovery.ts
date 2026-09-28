/**
 * El proyecto de Cloud Code de una cuenta de Google: se consulta con
 * `loadCodeAssist` y, si la cuenta todavía no tiene uno, se onboarda y se
 * vuelve a consultar. Si ya lo tiene, el onboarding sigue en segundo plano
 * con pocos intentos y espera con jitter, para no parecer automatización.
 * Lo usan el inicio de sesión y el refresco, que recupera el proyecto de una
 * cuenta que lo perdió o nunca lo tuvo.
 *
 * Porte de `omniroute: src/lib/oauth/providers/antigravity.ts` y de
 * `ensureAntigravityProjectAssigned`/`isUsableAntigravityProjectId` en
 * `open-sse/services/antigravityProjectBootstrap.ts` (MIT).
 */
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { codeAssistHeaders, type ClientProfile, type ClientVersionsView, loadCodeAssistMetadata } from './clientIdentity.ts'
import { createClientVersions } from './clientVersion.ts'
import { codeAssistOnboardTierId } from './codeAssistTier.ts'

/**
 * Por qué no hay proyecto. `requires_manual_project`: el onboarding respondió
 * sin proyecto, la cuenta tiene que traer el suyo y reintentar no lo arregla.
 * `discovery_failed`: la consulta falló o no hubo onboarding que la resolviera.
 */
export type ProjectDiscoveryOutcome = 'requires_manual_project' | 'discovery_failed'

export interface DiscoveredProject {
  projectId: string
  tierId: string
  projectDiscoveryOutcome?: ProjectDiscoveryOutcome
}

export interface CodeAssistEndpoints {
  loadCodeAssistEndpoints: readonly string[]
  onboardUserEndpoints: readonly string[]
}

export interface ProjectDiscoveryDeps {
  profile: ClientProfile
  fetch?: typeof globalThis.fetch
  versions?: ClientVersionsView
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  /** Plataforma y arquitectura que se declaran en los metadatos de Code Assist. */
  platform?: readonly [string, string]
}

export const CODE_ASSIST_TIMEOUT_MS = 8_000
const MAX_ONBOARD_ATTEMPTS = 3
const ONBOARD_BASE_DELAY_MS = 3000
const ONBOARD_JITTER_MS = 4000
const DEFAULT_TIER = 'legacy-tier'

/** Un id de proyecto que se puede mandar: texto no vacío. */
export function isUsableProjectId(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function extractProjectId(data: JsonRecord): string {
  const project = data.cloudaicompanionProject
  if (typeof project === 'string') return project
  if (!project || typeof project !== 'object' || Array.isArray(project)) return ''
  const id = (project as JsonRecord).id
  return typeof id === 'string' ? id : ''
}

export function createProjectDiscovery(deps: ProjectDiscoveryDeps) {
  const fetch = deps.fetch ?? globalThis.fetch
  const versions = deps.versions ?? createClientVersions({ fetch })
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const random = deps.random ?? Math.random
  const [platform, arch] = deps.platform ?? [process.platform, process.arch]
  const { profile } = deps

  /** El primer endpoint que responde 2xx; si ninguno, el último error. */
  const fetchFirstOk = async (endpoints: readonly string[], init: RequestInit): Promise<Response> => {
    let lastError: unknown = new Error('No Antigravity endpoints configured')
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { ...init, signal: AbortSignal.timeout(CODE_ASSIST_TIMEOUT_MS) })
        if (response.ok) return response
        lastError = new Error(`${response.status} ${await response.text()}`)
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  const onboardInBackground = async (endpoints: CodeAssistEndpoints, init: (tierId: string) => RequestInit, tierId: string) => {
    for (let attempt = 0; attempt < MAX_ONBOARD_ATTEMPTS; attempt += 1) {
      try {
        const result = (await (await fetchFirstOk(endpoints.onboardUserEndpoints, init(tierId))).json()) as { done?: boolean }
        if (result.done === true) return
      } catch {
        return
      }
      await sleep(ONBOARD_BASE_DELAY_MS + random() * ONBOARD_JITTER_MS)
    }
  }

  const discover = async (endpoints: CodeAssistEndpoints, accessToken: string): Promise<DiscoveredProject> => {
    const headers = codeAssistHeaders(profile, versions, accessToken)
    const metadata = loadCodeAssistMetadata(platform, arch)
    const loadInit: RequestInit = { method: 'POST', headers, body: JSON.stringify({ metadata }) }
    const onboardInit = (tierId: string): RequestInit => ({ method: 'POST', headers, body: JSON.stringify({ tier_id: tierId, metadata }) })

    let projectId = ''
    let tierId = DEFAULT_TIER
    let loadFailed = false
    try {
      const data = (await (await fetchFirstOk(endpoints.loadCodeAssistEndpoints, loadInit)).json()) as JsonRecord
      projectId = extractProjectId(data)
      tierId = codeAssistOnboardTierId(data)
    } catch {
      loadFailed = true
    }

    if (projectId) {
      void onboardInBackground(endpoints, onboardInit, tierId).catch(() => {})
      return { projectId, tierId }
    }
    if (endpoints.onboardUserEndpoints.length === 0) {
      return loadFailed ? { projectId, tierId, projectDiscoveryOutcome: 'discovery_failed' } : { projectId, tierId }
    }

    // Una cuenta sin proyecto necesita un onboarding antes de que la consulta lo encuentre.
    let onboardSucceeded = false
    try {
      const onboard = await fetchFirstOk(endpoints.onboardUserEndpoints, onboardInit(tierId))
      onboardSucceeded = true
      const onboardBody = await onboard.text().catch(() => '')
      // La consulta se repite siempre: el proyecto puede crearse después de aceptar el onboarding.
      const retry = await fetchFirstOk(endpoints.loadCodeAssistEndpoints, loadInit)
      projectId = extractProjectId((await retry.json()) as JsonRecord)
      if (!projectId && onboardBody) {
        projectId = extractProjectId(((await new Response(onboardBody).json().catch(() => ({}))) as JsonRecord))
      }
    } catch {
      // Sin onboarding o sin segunda consulta: lo decide `onboardSucceeded`.
    }
    if (projectId) return { projectId, tierId }
    return { projectId, tierId, projectDiscoveryOutcome: onboardSucceeded ? 'requires_manual_project' : 'discovery_failed' }
  }

  return { discover }
}
