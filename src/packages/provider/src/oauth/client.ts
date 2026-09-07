/**
 * Porte de `ccnmt: packages/provider/src/oauth/client.ts` — cliente OAuth
 * para los flujos de autenticación con los servicios de Claude. Sus 14
 * exportaciones, ninguna omitida.
 *
 * `./types.js` → `internal/oauthTypes.ts` (ver su cabecera: incluso en la
 * fuente estos tipos son un stub `unknown`). `./getOauthProfile.js` no está
 * asignado a este pase; `getOauthProfileFromOauthToken` se re-implementa
 * aquí mismo (es la única función de ese archivo que este módulo consume,
 * y es autocontenida). `./refreshTokenDeadSet.js` → `internal/refreshTokenDeadSet.ts`,
 * compartido con `authAlias.ts` (ambos de los 18 consumen el mismo Set).
 * `@thyrox/config` (`getGlobalConfig`/`saveGlobalConfig`) → `require()` diferido.
 */

import axios from 'axios'
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability'
import { ALL_OAUTH_SCOPES, CLAUDE_AI_INFERENCE_SCOPE, CLAUDE_AI_OAUTH_SCOPES, getOauthConfig, OAUTH_BETA_HEADER } from '../oauthConstants.ts'
import { checkAndRefreshOAuthTokenIfNeeded, getClaudeAIOAuthTokens, hasProfileScope, isClaudeAISubscriber, saveApiKey } from '../authAlias.ts'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { readEnv } from '@thyrox/config/env/utils'
import type {
  AccountInfo,
  BillingType,
  OAuthProfileResponse,
  OAuthTokenExchangeResponse,
  OAuthTokens,
  RateLimitTier,
  SubscriptionType,
  UserRolesResponse,
} from '../internal/oauthTypes.ts'
import { markRefreshTokenDead } from '../internal/refreshTokenDeadSet.ts'

function requireConfig(): {
  getGlobalConfig: () => {
    oauthAccount?: AccountInfo
    [key: string]: unknown
  }
  saveGlobalConfig: (updater: (current: { oauthAccount?: AccountInfo; [key: string]: unknown }) => { oauthAccount?: AccountInfo; [key: string]: unknown }) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config')
}

/**
 * Porte de `ccnmt: packages/provider/src/oauth/getOauthProfile.ts` — sólo
 * `getOauthProfileFromOauthToken` (la única función de ese archivo que
 * este módulo consume). No asignado a este pase; autocontenido.
 */
async function getOauthProfileFromOauthToken(accessToken: string): Promise<OAuthProfileResponse | undefined> {
  const endpoint = `${getOauthConfig().BASE_API_URL}/api/oauth/profile`
  try {
    const response = await axios.get<OAuthProfileResponse>(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'anthropic-beta': OAUTH_BETA_HEADER,
      },
      timeout: 10000,
    })
    return response.data
  } catch {
    return undefined
  }
}

const OAUTH_ERROR_TYPE_PATTERN = /^[a-z][a-z_]{0,39}$/

function isAxiosErrorDuckTyped(
  error: unknown,
): error is { isAxiosError: true; response?: { status: number; data: unknown } } {
  return Boolean(error && typeof error === 'object' && (error as { isAxiosError?: unknown }).isAxiosError === true)
}

/** Detecta una respuesta `invalid_grant`, mirando hasta 3 capas del error axios. */
export function isInvalidGrantError(error: unknown): boolean {
  if (!isAxiosErrorDuckTyped(error) || !error.response) return false
  const status = error.response.status
  if (status !== 400 && status !== 401) return false
  const data = error.response.data
  if (!data || typeof data !== 'object') return false
  const err = (data as { error?: unknown }).error
  const type = typeof err === 'string' ? err : err && typeof err === 'object' ? (err as { type?: unknown }).type : undefined
  return type === 'invalid_grant'
}

/** Extrae `oauth_error_status`/`oauth_error_type` de un error axios para telemetría. */
export function extractOAuthErrorFields(error: unknown): { oauth_error_status?: string; oauth_error_type?: string } {
  if (!isAxiosErrorDuckTyped(error) || !error.response) return {}
  const status = error.response.status
  const data = error.response.data
  let type = 'unparseable'
  if (data && typeof data === 'object') {
    const err = (data as { error?: unknown }).error
    const rawType = typeof err === 'string' ? err : err && typeof err === 'object' ? (err as { type?: unknown }).type : undefined
    if (typeof rawType === 'string' && OAUTH_ERROR_TYPE_PATTERN.test(rawType)) {
      type = rawType
    }
  }
  return { oauth_error_status: String(status), oauth_error_type: type }
}

/** @private Sólo para código de auth OAuth. */
export function shouldUseClaudeAIAuth(scopes: string[] | undefined): boolean {
  return Boolean(scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE))
}

export function parseScopes(scopeString?: string): string[] {
  return scopeString?.split(' ').filter(Boolean) ?? []
}

export function buildAuthUrl({
  codeChallenge,
  state,
  port,
  isManual,
  loginWithClaudeAi,
  inferenceOnly,
  orgUUID,
  loginHint,
  loginMethod,
}: {
  codeChallenge: string
  state: string
  port: number
  isManual: boolean
  loginWithClaudeAi?: boolean
  inferenceOnly?: boolean
  orgUUID?: string
  loginHint?: string
  loginMethod?: string
}): string {
  const authUrlBase = loginWithClaudeAi ? getOauthConfig().CLAUDE_AI_AUTHORIZE_URL : getOauthConfig().CONSOLE_AUTHORIZE_URL

  const authUrl = new URL(authUrlBase)
  authUrl.searchParams.append('code', 'true')
  authUrl.searchParams.append('client_id', getOauthConfig().CLIENT_ID)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('redirect_uri', isManual ? getOauthConfig().MANUAL_REDIRECT_URL : `http://localhost:${port}/callback`)
  const scopesToUse = inferenceOnly ? [CLAUDE_AI_INFERENCE_SCOPE] : ALL_OAUTH_SCOPES
  authUrl.searchParams.append('scope', scopesToUse.join(' '))
  authUrl.searchParams.append('code_challenge', codeChallenge)
  authUrl.searchParams.append('code_challenge_method', 'S256')
  authUrl.searchParams.append('state', state)

  if (orgUUID) authUrl.searchParams.append('orgUUID', orgUUID)
  if (loginHint) authUrl.searchParams.append('login_hint', loginHint)
  if (loginMethod) authUrl.searchParams.append('login_method', loginMethod)

  return authUrl.toString()
}

type AM = AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
function featureOk(n: string): void {
  logEvent('tengu_feature_ok', { feature_name: n as AM })
}
function featureBad(n: string, code: string): void {
  logEvent('tengu_feature_bad', { feature_name: n as AM, error_code: code as AM })
}
function featureSad(n: string, code: string): void {
  logEvent('tengu_feature_sad', { feature_name: n as AM, error_code: code as AM })
}

export async function exchangeCodeForTokens(
  authorizationCode: string,
  state: string,
  codeVerifier: string,
  port: number,
  useManualRedirect: boolean = false,
  expiresIn?: number,
): Promise<OAuthTokenExchangeResponse> {
  const requestBody: Record<string, string | number> = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: useManualRedirect ? getOauthConfig().MANUAL_REDIRECT_URL : `http://localhost:${port}/callback`,
    client_id: getOauthConfig().CLIENT_ID,
    code_verifier: codeVerifier,
    state,
  }
  if (expiresIn !== undefined) requestBody.expires_in = expiresIn

  const response = await axios.post(getOauthConfig().TOKEN_URL, requestBody, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  })

  if (response.status !== 200) {
    const reason = response.status === 401 ? 'oauth_exchange_invalid_code' : 'oauth_exchange_http_error'
    logEvent('tengu_oauth_token_exchange_failed', { reason, status: String(response.status) })
    featureBad('oauth_token_exchange', reason)
    throw new Error(
      response.status === 401 ? 'Authentication failed: Invalid authorization code' : `Token exchange failed (${response.status}): ${response.statusText}`,
    )
  }
  logEvent('tengu_oauth_token_exchange_success', {})
  featureOk('oauth_token_exchange')
  return response.data
}

export async function refreshOAuthToken(
  refreshToken: string,
  { scopes: requestedScopes, expiresIn, clientId }: { scopes?: string[]; expiresIn?: number; clientId?: string } = {},
): Promise<OAuthTokens> {
  const requestBody: Record<string, unknown> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId ?? getOauthConfig().CLIENT_ID,
    scope: (requestedScopes?.length ? requestedScopes : CLAUDE_AI_OAUTH_SCOPES).join(' '),
  }
  if (expiresIn !== undefined) requestBody.expires_in = expiresIn

  try {
    const response = await axios.post(getOauthConfig().TOKEN_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    })

    if (response.status !== 200) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = response.data as OAuthTokenExchangeResponse
    const { access_token: accessToken, refresh_token: newRefreshToken = refreshToken, expires_in: newExpiresIn } = data

    const expiresAt = Date.now() + newExpiresIn * 1000
    const scopes = parseScopes(data.scope)

    logEvent('tengu_oauth_token_refresh_success', {})
    featureOk('oauth_token_refresh')

    const config = requireConfig().getGlobalConfig()
    const existing = getClaudeAIOAuthTokens()
    const haveProfileAlready =
      config.oauthAccount?.billingType !== undefined &&
      config.oauthAccount?.accountCreatedAt !== undefined &&
      config.oauthAccount?.subscriptionCreatedAt !== undefined &&
      config.oauthAccount?.ccOnboardingFlags !== undefined &&
      existing?.subscriptionType != null &&
      existing?.rateLimitTier != null

    const profileInfo = haveProfileAlready ? null : await fetchProfileInfo(accessToken)

    if (profileInfo && config.oauthAccount) {
      const updates: Partial<AccountInfo> = {}
      if (profileInfo.displayName !== undefined) updates.displayName = profileInfo.displayName
      if (typeof profileInfo.hasExtraUsageEnabled === 'boolean') updates.hasExtraUsageEnabled = profileInfo.hasExtraUsageEnabled
      if (profileInfo.billingType !== null) updates.billingType = profileInfo.billingType
      if (profileInfo.accountCreatedAt !== undefined) updates.accountCreatedAt = profileInfo.accountCreatedAt
      if (profileInfo.subscriptionCreatedAt !== undefined) updates.subscriptionCreatedAt = profileInfo.subscriptionCreatedAt
      if (profileInfo.rawProfile) {
        updates.ccOnboardingFlags = profileInfo.ccOnboardingFlags
        updates.claudeCodeTrialEndsAt = profileInfo.claudeCodeTrialEndsAt
        updates.claudeCodeTrialDurationDays = profileInfo.claudeCodeTrialDurationDays
        updates.seatTier = profileInfo.seatTier
      }
      if (Object.keys(updates).length > 0) {
        requireConfig().saveGlobalConfig(current => ({
          ...current,
          oauthAccount: current.oauthAccount ? { ...current.oauthAccount, ...updates } : current.oauthAccount,
        }))
      }
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      scopes,
      clientId,
      subscriptionType: profileInfo?.subscriptionType ?? existing?.subscriptionType ?? null,
      rateLimitTier: profileInfo?.rateLimitTier ?? existing?.rateLimitTier ?? null,
      profile: profileInfo?.rawProfile,
      tokenAccount: data.account
        ? { uuid: data.account.uuid, emailAddress: data.account.email_address, organizationUuid: data.organization?.uuid }
        : undefined,
    }
  } catch (error) {
    logEvent('tengu_oauth_token_refresh_failure', {
      error: (error as Error).message as AM,
      ...extractOAuthErrorFields(error),
    })
    if (isInvalidGrantError(error)) {
      markRefreshTokenDead(refreshToken)
      logEvent('tengu_oauth_refresh_token_marked_dead_invalid_grant', {})
      featureBad('oauth_token_refresh', 'oauth_refresh_invalid_grant')
    } else {
      featureSad('oauth_token_refresh', 'oauth_refresh_request_failed')
    }
    throw error
  }
}

export async function fetchAndStoreUserRoles(accessToken: string): Promise<void> {
  const response = await axios.get(getOauthConfig().ROLES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (response.status !== 200) {
    logEvent('tengu_oauth_fetch_roles_failed', { reason: 'http_error', status: String(response.status) })
    featureBad('oauth_fetch_roles', 'oauth_roles_http_error')
    throw new Error(`Failed to fetch user roles: ${response.statusText}`)
  }
  const data = response.data as UserRolesResponse
  const config = requireConfig().getGlobalConfig()

  if (!config.oauthAccount) {
    logEvent('tengu_oauth_fetch_roles_failed', { reason: 'no_account' })
    featureBad('oauth_fetch_roles', 'oauth_roles_no_account')
    throw new Error('OAuth account information not found in config')
  }

  requireConfig().saveGlobalConfig(current => ({
    ...current,
    oauthAccount: current.oauthAccount
      ? {
          ...current.oauthAccount,
          organizationRole: data.organization_role,
          workspaceRole: data.workspace_role,
          organizationName: data.organization_name,
        }
      : current.oauthAccount,
  }))

  logEvent('tengu_oauth_roles_stored', { org_role: data.organization_role as AM })
  featureOk('oauth_fetch_roles')
}

export async function createAndStoreApiKey(accessToken: string): Promise<string | null> {
  try {
    const response = await axios.post(getOauthConfig().API_KEY_URL, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const apiKey = response.data?.raw_key
    if (apiKey) {
      await saveApiKey(apiKey)
      logEvent('tengu_oauth_api_key', { status: 'success' as AM, statusCode: response.status })
      featureOk('oauth_create_api_key')
      return apiKey
    }
    logEvent('tengu_oauth_create_api_key_failed', { reason: 'empty_response' })
    featureBad('oauth_create_api_key', 'oauth_api_key_empty_response')
    return null
  } catch (error) {
    logEvent('tengu_oauth_api_key', {
      status: 'failure' as AM,
      error: (error instanceof Error ? error.message : String(error)) as AM,
    })
    logEvent('tengu_oauth_create_api_key_failed', { reason: 'request_failed' })
    featureBad('oauth_create_api_key', 'oauth_api_key_request_failed')
    throw error
  }
}

export function isOAuthTokenExpired(expiresAt: number | null): boolean {
  if (expiresAt === null) return false
  const bufferTime = 5 * 60 * 1000
  const now = Date.now()
  return now + bufferTime >= expiresAt
}

export async function fetchProfileInfo(accessToken: string): Promise<{
  subscriptionType: SubscriptionType | null
  displayName?: string
  rateLimitTier: RateLimitTier | null
  hasExtraUsageEnabled: boolean | null
  billingType: BillingType | null
  accountCreatedAt?: string
  subscriptionCreatedAt?: string
  seatTier: string | null
  ccOnboardingFlags: Record<string, unknown>
  claudeCodeTrialEndsAt: string | null
  claudeCodeTrialDurationDays: number | null
  rawProfile?: OAuthProfileResponse
}> {
  const profile = await getOauthProfileFromOauthToken(accessToken)
  const orgType = profile?.organization?.organization_type

  let subscriptionType: SubscriptionType | null = null
  switch (orgType) {
    case 'claude_max':
      subscriptionType = 'max'
      break
    case 'claude_pro':
      subscriptionType = 'pro'
      break
    case 'claude_enterprise':
      subscriptionType = 'enterprise'
      break
    case 'claude_team':
      subscriptionType = 'team'
      break
    default:
      subscriptionType = null
  }

  const result = {
    subscriptionType,
    rateLimitTier: profile?.organization?.rate_limit_tier ?? null,
    hasExtraUsageEnabled: profile?.organization?.has_extra_usage_enabled ?? null,
    billingType: profile?.organization?.billing_type ?? null,
    seatTier: profile?.organization?.seat_tier ?? null,
    ccOnboardingFlags: profile?.organization?.cc_onboarding_flags ?? {},
    claudeCodeTrialEndsAt: profile?.organization?.claude_code_trial_ends_at ?? null,
    claudeCodeTrialDurationDays: profile?.organization?.claude_code_trial_duration_days ?? null,
  } as {
    subscriptionType: SubscriptionType | null
    displayName?: string
    rateLimitTier: RateLimitTier | null
    hasExtraUsageEnabled: boolean | null
    billingType: BillingType | null
    accountCreatedAt?: string
    subscriptionCreatedAt?: string
    seatTier: string | null
    ccOnboardingFlags: Record<string, unknown>
    claudeCodeTrialEndsAt: string | null
    claudeCodeTrialDurationDays: number | null
  }

  if (profile?.account?.display_name) result.displayName = profile.account.display_name
  if (profile?.account?.created_at) result.accountCreatedAt = profile.account.created_at
  if (profile?.organization?.subscription_created_at) result.subscriptionCreatedAt = profile.organization.subscription_created_at

  logEvent('tengu_oauth_profile_fetch_success', {})

  return { ...result, rawProfile: profile }
}

/**
 * UUID de la organización para la sesión actual. Búsqueda en 3 niveles:
 * variable de entorno override → `oauthAccount.organizationUuid` guardado
 * → fetch en vivo del perfil (requiere scope `user:profile`).
 */
export async function getOrganizationUUID(): Promise<string | null> {
  const envOrgUUID = readEnv('CLAUDE_CODE_ORGANIZATION_UUID')
  if (envOrgUUID) return envOrgUUID

  const globalConfig = requireConfig().getGlobalConfig()
  const orgUUID = globalConfig.oauthAccount?.organizationUuid
  if (orgUUID) return orgUUID

  const accessToken = getClaudeAIOAuthTokens()?.accessToken
  if (accessToken === undefined || !hasProfileScope()) {
    return null
  }
  const profile = await getOauthProfileFromOauthToken(accessToken)
  const profileOrgUUID = profile?.organization?.uuid
  if (!profileOrgUUID) return null
  return profileOrgUUID
}

/** Puebla la info de cuenta OAuth si no está ya cacheada en config. */
export async function populateOAuthAccountInfoIfNeeded(): Promise<boolean> {
  const envAccountUuid = readEnv('CLAUDE_CODE_ACCOUNT_UUID')
  const envUserEmail = readEnv('CLAUDE_CODE_USER_EMAIL')
  const envOrganizationUuid = readEnv('CLAUDE_CODE_ORGANIZATION_UUID')
  const hasEnvVars = Boolean(envAccountUuid && envUserEmail && envOrganizationUuid)
  if (envAccountUuid && envUserEmail && envOrganizationUuid) {
    if (!requireConfig().getGlobalConfig().oauthAccount) {
      storeOAuthAccountInfo({
        accountUuid: envAccountUuid,
        emailAddress: envUserEmail,
        organizationUuid: envOrganizationUuid,
      })
    }
  }

  await checkAndRefreshOAuthTokenIfNeeded()

  const config = requireConfig().getGlobalConfig()
  if (
    (config.oauthAccount &&
      config.oauthAccount.billingType !== undefined &&
      config.oauthAccount.accountCreatedAt !== undefined &&
      config.oauthAccount.subscriptionCreatedAt !== undefined &&
      config.oauthAccount.ccOnboardingFlags !== undefined) ||
    !isClaudeAISubscriber() ||
    !hasProfileScope()
  ) {
    return false
  }

  const tokens = getClaudeAIOAuthTokens()
  if (tokens?.accessToken) {
    const profile = await getOauthProfileFromOauthToken(tokens.accessToken)
    if (profile) {
      if (hasEnvVars) {
        logForDebugging('OAuth profile fetch succeeded, overriding env var account info', { level: 'info' })
      }
      storeOAuthAccountInfo({
        accountUuid: profile.account.uuid,
        emailAddress: profile.account.email,
        organizationUuid: profile.organization.uuid,
        displayName: profile.account.display_name || undefined,
        hasExtraUsageEnabled: profile.organization.has_extra_usage_enabled ?? false,
        billingType: profile.organization.billing_type ?? undefined,
        accountCreatedAt: profile.account.created_at,
        subscriptionCreatedAt: profile.organization.subscription_created_at ?? undefined,
        ccOnboardingFlags: profile.organization?.cc_onboarding_flags ?? {},
        claudeCodeTrialEndsAt: profile.organization?.claude_code_trial_ends_at ?? null,
        claudeCodeTrialDurationDays: profile.organization?.claude_code_trial_duration_days ?? null,
        seatTier: profile.organization?.seat_tier ?? null,
      })
      return true
    }
  }
  return false
}

export function storeOAuthAccountInfo({
  accountUuid,
  emailAddress,
  organizationUuid,
  displayName,
  hasExtraUsageEnabled,
  billingType,
  accountCreatedAt,
  subscriptionCreatedAt,
  ccOnboardingFlags,
  claudeCodeTrialEndsAt,
  claudeCodeTrialDurationDays,
  seatTier,
}: {
  accountUuid: string
  emailAddress: string
  organizationUuid: string | undefined
  displayName?: string
  hasExtraUsageEnabled?: boolean
  billingType?: BillingType
  accountCreatedAt?: string
  subscriptionCreatedAt?: string
  ccOnboardingFlags?: Record<string, unknown>
  claudeCodeTrialEndsAt?: string | null
  claudeCodeTrialDurationDays?: number | null
  seatTier?: string | null
}): void {
  const accountInfo: AccountInfo = {
    accountUuid,
    emailAddress,
    organizationUuid,
    hasExtraUsageEnabled,
    billingType,
    accountCreatedAt,
    subscriptionCreatedAt,
    ccOnboardingFlags,
    claudeCodeTrialEndsAt,
    claudeCodeTrialDurationDays,
    seatTier,
  }
  if (displayName) accountInfo.displayName = displayName

  requireConfig().saveGlobalConfig(current => {
    if (
      current.oauthAccount?.accountUuid === accountInfo.accountUuid &&
      current.oauthAccount?.emailAddress === accountInfo.emailAddress &&
      current.oauthAccount?.organizationUuid === accountInfo.organizationUuid &&
      current.oauthAccount?.displayName === accountInfo.displayName &&
      current.oauthAccount?.hasExtraUsageEnabled === accountInfo.hasExtraUsageEnabled &&
      current.oauthAccount?.billingType === accountInfo.billingType &&
      current.oauthAccount?.accountCreatedAt === accountInfo.accountCreatedAt &&
      current.oauthAccount?.subscriptionCreatedAt === accountInfo.subscriptionCreatedAt &&
      current.oauthAccount?.claudeCodeTrialEndsAt === accountInfo.claudeCodeTrialEndsAt &&
      current.oauthAccount?.claudeCodeTrialDurationDays === accountInfo.claudeCodeTrialDurationDays &&
      current.oauthAccount?.seatTier === accountInfo.seatTier &&
      JSON.stringify(current.oauthAccount?.ccOnboardingFlags) === JSON.stringify(accountInfo.ccOnboardingFlags)
    ) {
      return current
    }
    return { ...current, oauthAccount: accountInfo }
  })
}
