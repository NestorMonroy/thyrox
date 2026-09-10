/**
 * Porte de `ccnmt: packages/provider/src/authAlias.ts` — el agregador de
 * autenticación (API key, OAuth, AWS/GCP auth-refresh, suscripción). Sus
 * 64 exportaciones, ninguna omitida.
 *
 * Es el archivo con más divergencias medidas de los 18, por profundidad de
 * dependencias hacia módulos hermanos NO asignados a este pase:
 *
 * - `@thyrox/config` (`getGlobalConfig`/`saveGlobalConfig`/
 *   `checkHasTrustDialogAccepted`) y `@thyrox/config/settings`
 *   (`getSettings`/`getSettingsForSource`) no existen hoy →
 *   `require()` diferido centralizado (`requireConfig`/`requireSettingsApi`).
 * - `./mockRateLimits.js` (sólo relevante para `USER_TYPE==='ant'`, que
 *   nunca es true fuera de Anthropic) → sustituto trivial en línea.
 * - `./aws.ts`/`./awsAuthStatusManager.ts` NO asignados → la validación de
 *   identidad STS real (`checkStsCallerIdentity`/`isValidAwsStsOutput`/
 *   `clearAwsIniCache`) se reemplaza por `require()` diferido; el
 *   status-manager singleton se re-implementa localmente con
 *   `createSignal` (mismo contrato observable: `getInstance`,
 *   `startAuthentication`, `addOutput`, `setError`, `endAuthentication`).
 * - `./betas.ts` (`clearBetasCaches`) y `@claude-code-how-works/tool-registry`
 *   (`clearToolSchemaCache`) → no-op en `internal/pendingCrossPackageDeps.ts`.
 * - `execa` se sustituye por `node:child_process` (`execFile`/`exec`
 *   promisificados) en los tres sitios que lo usaban
 *   (`_executeApiKeyHelper`, `saveApiKey`, `maybeRemoveApiKeyFromMacOSKeychainThrows`)
 *   — mismo comportamiento observable (timeout, captura de stdout/stderr,
 *   código de salida), sin añadir una dependencia externa nueva.
 * - `./oauth/saveApiKey.ts`/`./authPortable.ts`/`./authFileDescriptor.ts`
 *   (siblings NO asignados) se re-implementan en este mismo archivo /
 *   `internal/authFileDescriptor.ts` — son pequeños y de un único
 *   consumidor.
 *
 * Lo que SÍ resuelve y se importa estático: `@thyrox/config/env/utils`
 * (falta `isRunningOnHomespace`, sustituto en `pendingCrossPackageDeps.ts`),
 * `@thyrox/storage/secureStorage.js` (`getSecureStorage`, real y completo),
 * `@thyrox/storage/lockfile.js` (`lock`, real), `@thyrox/storage/secureStorage/macOsKeychainHelpers.js`
 * (`getMacOsKeychainStorageServiceName`/`getUsername`/`clearKeychainCache`,
 * reales), `@thyrox/shell/execFileNoThrow.js` (`execSyncWithDefaults`, real),
 * `@thyrox/local-observability/{debug,errorHelpers,log}.js` (reales).
 */

import chalk from 'chalk'
import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, stat } from 'node:fs/promises'
import memoize from 'lodash-es/memoize.js'
import { join } from 'node:path'
import { CLAUDE_AI_PROFILE_SCOPE } from './oauthConstants.ts'
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability'
import { getModelStrings } from './internal/modelSupport.ts'
import { getAPIProvider } from './providers.ts'
import { isOAuthTokenExpired, refreshOAuthToken, shouldUseClaudeAIAuth } from './oauth/client.ts'
import { clearRefreshTokenDeadSet, isRefreshTokenDead, markRefreshTokenDead as _markDead } from './internal/refreshTokenDeadSet.ts'
import {
  getApiKeyFromFileDescriptor,
  getOAuthTokenFromFileDescriptor,
  setOauthTokenFromFd,
} from './internal/authFileDescriptor.ts'
import { logForDebugging, logAntError } from '@thyrox/local-observability/debug.js'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import { isRunningOnHomespace } from './internal/pendingCrossPackageDeps.ts'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { execSyncWithDefaults } from '@thyrox/shell/execFileNoThrow.js'
import * as lockfile from '@thyrox/storage/lockfile.js'
import { logError } from '@thyrox/local-observability/log.js'
import { memoizeWithTTLAsync, sleep, jsonParse, clearBetasCaches, clearToolSchemaCache, createSignal } from './internal/pendingCrossPackageDeps.ts'
import { getSecureStorage } from '@thyrox/storage/secureStorage.js'
import { getMacOsKeychainStorageServiceName, getUsername, clearKeychainCache } from '@thyrox/storage/secureStorage/macOsKeychainHelpers.js'
import type { AccountInfo, OAuthTokens, SubscriptionType } from './internal/oauthTypes.ts'

void _markDead // re-exportada indirectamente vía oauth/client.ts

const execFileAsync = promisify(execFile)

const DEFAULT_API_KEY_HELPER_TTL = 5 * 60 * 1000

// ── config / settings — deferred (ver cabecera) ─────────────────────────
type GlobalConfigShape = {
  oauthAccount?: AccountInfo
  primaryApiKey?: string
  customApiKeyResponses?: { approved?: string[]; rejected?: string[] }
  penguinModeOrgEnabled?: boolean
  [key: string]: unknown
}
function requireConfig(): {
  getGlobalConfig: () => GlobalConfigShape
  saveGlobalConfig: (updater: (current: GlobalConfigShape) => GlobalConfigShape) => void
  checkHasTrustDialogAccepted: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config')
}
type SettingsShape = {
  apiKeyHelper?: string
  awsAuthRefresh?: string
  awsCredentialExport?: string
  gcpAuthRefresh?: string
  otelHeadersHelper?: string
  modelType?: string
  [key: string]: unknown
}
function requireSettingsApi(): {
  getSettings: () => SettingsShape | undefined
  getSettingsForSource: (source: string) => SettingsShape | undefined
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/settings')
}
function getSettings(): SettingsShape | undefined {
  try {
    return requireSettingsApi().getSettings()
  } catch {
    return undefined
  }
}
function getSettingsForSource(source: string): SettingsShape | undefined {
  try {
    return requireSettingsApi().getSettingsForSource(source)
  } catch {
    return undefined
  }
}
function getGlobalConfig(): GlobalConfigShape {
  try {
    return requireConfig().getGlobalConfig()
  } catch {
    return {}
  }
}
function saveGlobalConfig(updater: (current: GlobalConfigShape) => GlobalConfigShape): void {
  try {
    requireConfig().saveGlobalConfig(updater)
  } catch {
    // config no portado todavía — no-op fail-open, ver cabecera
  }
}
function checkHasTrustDialogAccepted(): boolean {
  try {
    return requireConfig().checkHasTrustDialogAccepted()
  } catch {
    return true
  }
}
function isBareMode(): boolean {
  return isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) || process.argv.includes('--bare')
}

// `./mockRateLimits.js` es ant-only; USER_TYPE 'ant' nunca es true fuera de
// Anthropic. Sustituto trivial fiel a ese camino frío.
function shouldUseMockSubscription(): boolean {
  return false
}
function getMockSubscriptionType(): SubscriptionType | null {
  return null
}

function isManagedOAuthContext(): boolean {
  return isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE')) || readEnv('CLAUDE_CODE_ENTRYPOINT') === 'claude-desktop'
}

/** ¿Soportamos auth 1P directa? */
export function isAnthropicAuthEnabled(): boolean {
  if (isBareMode()) return false

  if (readEnv('ANTHROPIC_UNIX_SOCKET')) {
    return !!readEnv('CLAUDE_CODE_OAUTH_TOKEN')
  }

  const settings = getSettings() || {}
  const is3P =
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_BEDROCK')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_VERTEX')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_FOUNDRY')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_ANTHROPIC_AWS')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_MANTLE')) ||
    settings.modelType === 'openai' ||
    settings.modelType === 'gemini' ||
    !!readEnv('OPENAI_BASE_URL') ||
    !!readEnv('GEMINI_BASE_URL')
  const apiKeyHelper = settings.apiKeyHelper
  const hasExternalAuthToken = readEnv('ANTHROPIC_AUTH_TOKEN') || apiKeyHelper || readEnv('CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR')

  const { source: apiKeySource } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: true })
  const hasExternalApiKey = apiKeySource === 'ANTHROPIC_API_KEY' || apiKeySource === 'apiKeyHelper'

  const shouldDisableAuth = is3P || (Boolean(hasExternalAuthToken) && !isManagedOAuthContext()) || (hasExternalApiKey && !isManagedOAuthContext())

  return !shouldDisableAuth
}

/** De dónde sale el token de auth. Ligado a `isAnthropicAuthEnabled`. */
export function getAuthTokenSource() {
  if (isBareMode()) {
    if (getConfiguredApiKeyHelper()) {
      return { source: 'apiKeyHelper' as const, hasToken: true }
    }
    return { source: 'none' as const, hasToken: false }
  }

  if (readEnv('ANTHROPIC_AUTH_TOKEN') && !isManagedOAuthContext()) {
    return { source: 'ANTHROPIC_AUTH_TOKEN' as const, hasToken: true }
  }
  if (readEnv('CLAUDE_CODE_OAUTH_TOKEN')) {
    return { source: 'CLAUDE_CODE_OAUTH_TOKEN' as const, hasToken: true }
  }

  const oauthTokenFromFd = getOAuthTokenFromFileDescriptor()
  if (oauthTokenFromFd) {
    if (readEnv('CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')) {
      return { source: 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR' as const, hasToken: true }
    }
    return { source: 'CCR_OAUTH_TOKEN_FILE' as const, hasToken: true }
  }

  const apiKeyHelper = getConfiguredApiKeyHelper()
  if (apiKeyHelper && !isManagedOAuthContext()) {
    return { source: 'apiKeyHelper' as const, hasToken: true }
  }

  const oauthTokens = getClaudeAIOAuthTokens()
  if (shouldUseClaudeAIAuth(oauthTokens?.scopes) && oauthTokens?.accessToken) {
    return { source: 'claude.ai' as const, hasToken: true }
  }

  return { source: 'none' as const, hasToken: false }
}

export function describeHowToDisableAuthTokenSource(source: string): string {
  switch (source) {
    case 'claude.ai':
      return 'claude /logout to sign out of claude.ai.'
    case 'apiKeyHelper':
      return 'Unset the apiKeyHelper setting.'
    case 'CCR_OAUTH_TOKEN_FILE':
      return 'This token is injected by the CCR host; check the host session.'
    case 'none':
      return ''
    default:
      return `Unset the ${source} environment variable.`
  }
}

export type ApiKeySource = 'ANTHROPIC_API_KEY' | 'apiKeyHelper' | '/login managed key' | 'none'

export function getAnthropicApiKey(): null | string {
  const { key } = getAnthropicApiKeyWithSource()
  return key
}

export function hasAnthropicApiKeyAuth(): boolean {
  const { key, source } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: true })
  return key !== null && source !== 'none'
}

export function getAnthropicApiKeyWithSource(
  opts: { skipRetrievingKeyFromApiKeyHelper?: boolean } = {},
): { key: null | string; source: ApiKeySource } {
  if (isBareMode()) {
    if (readEnv('ANTHROPIC_API_KEY')) {
      return { key: readEnv('ANTHROPIC_API_KEY')!, source: 'ANTHROPIC_API_KEY' }
    }
    if (getConfiguredApiKeyHelper()) {
      return {
        key: opts.skipRetrievingKeyFromApiKeyHelper ? null : getApiKeyFromApiKeyHelperCached(),
        source: 'apiKeyHelper',
      }
    }
    return { key: null, source: 'none' }
  }

  const apiKeyEnv = isRunningOnHomespace() ? undefined : readEnv('ANTHROPIC_API_KEY')

  if (preferThirdPartyAuthentication() && apiKeyEnv) {
    return { key: apiKeyEnv, source: 'ANTHROPIC_API_KEY' }
  }

  if (isEnvTruthy(readEnv('CI')) || readEnv('NODE_ENV') === 'test') {
    const apiKeyFromFd = getApiKeyFromFileDescriptor()
    if (apiKeyFromFd) return { key: apiKeyFromFd, source: 'ANTHROPIC_API_KEY' }

    if (!apiKeyEnv && !readEnv('CLAUDE_CODE_OAUTH_TOKEN') && !readEnv('CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')) {
      throw new Error('ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN env var is required')
    }
    if (apiKeyEnv) return { key: apiKeyEnv, source: 'ANTHROPIC_API_KEY' }
    return { key: null, source: 'none' }
  }

  if (apiKeyEnv && getGlobalConfig().customApiKeyResponses?.approved?.includes(normalizeApiKeyForConfig(apiKeyEnv))) {
    return { key: apiKeyEnv, source: 'ANTHROPIC_API_KEY' }
  }

  const apiKeyFromFd = getApiKeyFromFileDescriptor()
  if (apiKeyFromFd) return { key: apiKeyFromFd, source: 'ANTHROPIC_API_KEY' }

  const apiKeyHelperCommand = getConfiguredApiKeyHelper()
  if (apiKeyHelperCommand) {
    if (opts.skipRetrievingKeyFromApiKeyHelper) {
      return { key: null, source: 'apiKeyHelper' }
    }
    return { key: getApiKeyFromApiKeyHelperCached(), source: 'apiKeyHelper' }
  }

  const apiKeyFromConfigOrMacOSKeychain = getApiKeyFromConfigOrMacOSKeychain()
  if (apiKeyFromConfigOrMacOSKeychain) return apiKeyFromConfigOrMacOSKeychain

  return { key: null, source: 'none' }
}

/** `preferThirdPartyAuthentication`/`getIsNonInteractiveSession` — de
 * `app-host/bootstrap/state.js` (zona prohibida). `require()` diferido con
 * fallback `false` (camino frío: sin CLI real detrás, nunca preferimos 3P
 * de forma implícita). */
function preferThirdPartyAuthentication(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as { preferThirdPartyAuthentication: () => boolean }).preferThirdPartyAuthentication()
  } catch {
    return false
  }
}
function getIsNonInteractiveSession(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as { getIsNonInteractiveSession: () => boolean }).getIsNonInteractiveSession()
  } catch {
    return false
  }
}

function normalizeApiKeyForConfig(apiKey: string): string {
  return apiKey.slice(-20)
}

export function getConfiguredApiKeyHelper(): string | undefined {
  if (isBareMode()) {
    return getSettingsForSource('flagSettings')?.apiKeyHelper
  }
  return (getSettings() || {}).apiKeyHelper
}

function isApiKeyHelperFromProjectOrLocalSettings(): boolean {
  const apiKeyHelper = getConfiguredApiKeyHelper()
  if (!apiKeyHelper) return false
  const projectSettings = getSettingsForSource('projectSettings')
  const localSettings = getSettingsForSource('localSettings')
  return projectSettings?.apiKeyHelper === apiKeyHelper || localSettings?.apiKeyHelper === apiKeyHelper
}

function getConfiguredAwsAuthRefresh(): string | undefined {
  return (getSettings() || {}).awsAuthRefresh
}

export function isAwsAuthRefreshFromProjectSettings(): boolean {
  const awsAuthRefresh = getConfiguredAwsAuthRefresh()
  if (!awsAuthRefresh) return false
  const projectSettings = getSettingsForSource('projectSettings')
  const localSettings = getSettingsForSource('localSettings')
  return projectSettings?.awsAuthRefresh === awsAuthRefresh || localSettings?.awsAuthRefresh === awsAuthRefresh
}

function getConfiguredAwsCredentialExport(): string | undefined {
  return (getSettings() || {}).awsCredentialExport
}

export function isAwsCredentialExportFromProjectSettings(): boolean {
  const awsCredentialExport = getConfiguredAwsCredentialExport()
  if (!awsCredentialExport) return false
  const projectSettings = getSettingsForSource('projectSettings')
  const localSettings = getSettingsForSource('localSettings')
  return projectSettings?.awsCredentialExport === awsCredentialExport || localSettings?.awsCredentialExport === awsCredentialExport
}

export function calculateApiKeyHelperTTL(): number {
  const envTtl = readEnv('CLAUDE_CODE_API_KEY_HELPER_TTL_MS')
  if (envTtl) {
    const parsed = parseInt(envTtl, 10)
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed
    logForDebugging(`Found CLAUDE_CODE_API_KEY_HELPER_TTL_MS env var, but it was not a valid number. Got ${envTtl}`, { level: 'error' })
  }
  return DEFAULT_API_KEY_HELPER_TTL
}

let _apiKeyHelperCache: { value: string; timestamp: number } | null = null
let _apiKeyHelperInflight: { promise: Promise<string | null>; startedAt: number | null } | null = null
let _apiKeyHelperEpoch = 0

export function getApiKeyHelperElapsedMs(): number {
  const startedAt = _apiKeyHelperInflight?.startedAt
  return startedAt ? Date.now() - startedAt : 0
}

export async function getApiKeyFromApiKeyHelper(isNonInteractiveSession: boolean): Promise<string | null> {
  if (!getConfiguredApiKeyHelper()) return null
  const ttl = calculateApiKeyHelperTTL()
  if (_apiKeyHelperCache) {
    if (Date.now() - _apiKeyHelperCache.timestamp < ttl) {
      return _apiKeyHelperCache.value
    }
    if (!_apiKeyHelperInflight) {
      _apiKeyHelperInflight = { promise: _runAndCache(isNonInteractiveSession, false, _apiKeyHelperEpoch), startedAt: null }
    }
    return _apiKeyHelperCache.value
  }
  if (_apiKeyHelperInflight) return _apiKeyHelperInflight.promise
  _apiKeyHelperInflight = { promise: _runAndCache(isNonInteractiveSession, true, _apiKeyHelperEpoch), startedAt: Date.now() }
  return _apiKeyHelperInflight.promise
}

async function _runAndCache(isNonInteractiveSession: boolean, isCold: boolean, epoch: number): Promise<string | null> {
  try {
    const value = await _executeApiKeyHelper(isNonInteractiveSession)
    if (epoch !== _apiKeyHelperEpoch) return value
    if (value !== null) {
      _apiKeyHelperCache = { value, timestamp: Date.now() }
    }
    return value
  } catch (e) {
    if (epoch !== _apiKeyHelperEpoch) return ' '
    const detail = e instanceof Error ? e.message : String(e)
    console.error(chalk.red(`apiKeyHelper failed: ${detail}`))
    logForDebugging(`Error getting API key from apiKeyHelper: ${detail}`, { level: 'error' })
    if (!isCold && _apiKeyHelperCache && _apiKeyHelperCache.value !== ' ') {
      _apiKeyHelperCache = { ..._apiKeyHelperCache, timestamp: Date.now() }
      return _apiKeyHelperCache.value
    }
    _apiKeyHelperCache = { value: ' ', timestamp: Date.now() }
    return ' '
  } finally {
    if (epoch === _apiKeyHelperEpoch) {
      _apiKeyHelperInflight = null
    }
  }
}

async function _executeApiKeyHelper(isNonInteractiveSession: boolean): Promise<string | null> {
  const apiKeyHelper = getConfiguredApiKeyHelper()
  if (!apiKeyHelper) return null

  if (isApiKeyHelperFromProjectOrLocalSettings()) {
    const hasTrust = checkHasTrustDialogAccepted()
    if (!hasTrust && !isNonInteractiveSession) {
      const error = new Error('Security: apiKeyHelper executed before workspace trust is confirmed.')
      logAntError('apiKeyHelper invoked before trust check', error)
      logEvent('tengu_apiKeyHelper_missing_trust11', {})
      return null
    }
  }

  try {
    const { stdout } = await execFileAsync('/bin/sh', ['-c', apiKeyHelper], { timeout: 10 * 60 * 1000 })
    const trimmed = stdout?.trim()
    if (!trimmed) throw new Error('did not return a value')
    return trimmed
  } catch (e) {
    const err = e as { killed?: boolean; code?: number; stderr?: string; message?: string }
    const why = err.killed ? 'timed out' : `exited ${err.code}`
    const stderr = err.stderr?.trim()
    throw new Error(stderr ? `${why}: ${stderr}` : err.message ?? why)
  }
}

export function getApiKeyFromApiKeyHelperCached(): string | null {
  return _apiKeyHelperCache?.value ?? null
}

export function clearApiKeyHelperCache(): void {
  _apiKeyHelperEpoch++
  _apiKeyHelperCache = null
  _apiKeyHelperInflight = null
}

export function prefetchApiKeyFromApiKeyHelperIfSafe(isNonInteractiveSession: boolean): void {
  if (isApiKeyHelperFromProjectOrLocalSettings() && !checkHasTrustDialogAccepted()) {
    return
  }
  void getApiKeyFromApiKeyHelper(isNonInteractiveSession)
}

const DEFAULT_AWS_STS_TTL = 60 * 60 * 1000

// `./awsAuthStatusManager.ts` NO asignado a este pase — singleton local con
// el mismo contrato observable (getInstance/startAuthentication/addOutput/
// setError/endAuthentication/getStatus/onChange), respaldado por
// `createSignal` en vez de su propia implementación de pub-sub.
type AwsAuthStatus = { isAuthenticating: boolean; output: string[]; error?: string }
class LocalAuthStatusManager {
  private static instance: LocalAuthStatusManager | null = null
  private status: AwsAuthStatus = { isAuthenticating: false, output: [] }
  private changed = createSignal<[status: AwsAuthStatus]>()
  static getInstance(): LocalAuthStatusManager {
    if (!LocalAuthStatusManager.instance) LocalAuthStatusManager.instance = new LocalAuthStatusManager()
    return LocalAuthStatusManager.instance
  }
  getStatus(): AwsAuthStatus {
    return { ...this.status, output: [...this.status.output] }
  }
  startAuthentication(): void {
    this.status = { isAuthenticating: true, output: [] }
    this.changed.emit(this.getStatus())
  }
  addOutput(line: string): void {
    this.status.output.push(line)
    this.changed.emit(this.getStatus())
  }
  setError(error: string): void {
    this.status.error = error
    this.changed.emit(this.getStatus())
  }
  endAuthentication(success: boolean): void {
    this.status = { ...this.status, isAuthenticating: false, error: success ? undefined : this.status.error }
    this.changed.emit(this.getStatus())
  }
  onChange(listener: (status: AwsAuthStatus) => void): () => void {
    return this.changed.subscribe(listener)
  }
}

// `./aws.ts` NO asignado — `checkStsCallerIdentity`/`isValidAwsStsOutput`/
// `clearAwsIniCache` vía `require()` diferido.
function requireAws(): {
  checkStsCallerIdentity: () => Promise<unknown>
  isValidAwsStsOutput: (obj: unknown) => obj is { Credentials: { AccessKeyId: string; SecretAccessKey: string; SessionToken: string } }
  clearAwsIniCache: () => Promise<void>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./aws.ts')
}

async function runAwsAuthRefresh(): Promise<boolean> {
  const awsAuthRefresh = getConfiguredAwsAuthRefresh()
  if (!awsAuthRefresh) return false

  if (isAwsAuthRefreshFromProjectSettings()) {
    const hasTrust = checkHasTrustDialogAccepted()
    if (!hasTrust && !getIsNonInteractiveSession()) {
      const error = new Error('Security: awsAuthRefresh executed before workspace trust is confirmed.')
      logAntError('awsAuthRefresh invoked before trust check', error)
      logEvent('tengu_awsAuthRefresh_missing_trust', {})
      return false
    }
  }

  try {
    logForDebugging('Fetching AWS caller identity for AWS auth refresh command')
    await requireAws().checkStsCallerIdentity()
    logForDebugging('Fetched AWS caller identity, skipping AWS auth refresh command')
    return false
  } catch {
    return refreshAwsAuth(awsAuthRefresh)
  }
}

const AWS_AUTH_REFRESH_TIMEOUT_MS = 3 * 60 * 1000

export function refreshAwsAuth(awsAuthRefresh: string): Promise<boolean> {
  logForDebugging('Running AWS auth refresh command')
  const authStatusManager = LocalAuthStatusManager.getInstance()
  authStatusManager.startAuthentication()

  return new Promise(resolve => {
    const refreshProc = exec(awsAuthRefresh, { timeout: AWS_AUTH_REFRESH_TIMEOUT_MS })
    refreshProc.stdout?.on('data', data => {
      const output = data.toString().trim()
      if (output) {
        authStatusManager.addOutput(output)
        logForDebugging(output, { level: 'debug' })
      }
    })
    refreshProc.stderr?.on('data', data => {
      const error = data.toString().trim()
      if (error) {
        authStatusManager.setError(error)
        logForDebugging(error, { level: 'error' })
      }
    })
    refreshProc.on('close', (code, signal) => {
      if (code === 0) {
        logForDebugging('AWS auth refresh completed successfully')
        authStatusManager.endAuthentication(true)
        resolve(true)
      } else {
        const timedOut = signal === 'SIGTERM'
        console.error(
          timedOut
            ? chalk.red('AWS auth refresh timed out after 3 minutes. Run your auth command manually in a separate terminal.')
            : chalk.red('Error running awsAuthRefresh (in settings or ~/.claude.json):'),
        )
        authStatusManager.endAuthentication(false)
        resolve(false)
      }
    })
  })
}

async function getAwsCredsFromCredentialExport(): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string } | null> {
  const awsCredentialExport = getConfiguredAwsCredentialExport()
  if (!awsCredentialExport) return null

  if (isAwsCredentialExportFromProjectSettings()) {
    const hasTrust = checkHasTrustDialogAccepted()
    if (!hasTrust && !getIsNonInteractiveSession()) {
      const error = new Error('Security: awsCredentialExport executed before workspace trust is confirmed.')
      logAntError('awsCredentialExport invoked before trust check', error)
      logEvent('tengu_awsCredentialExport_missing_trust', {})
      return null
    }
  }

  try {
    logForDebugging('Fetching AWS caller identity for credential export command')
    await requireAws().checkStsCallerIdentity()
    logForDebugging('Fetched AWS caller identity, skipping AWS credential export command')
    return null
  } catch {
    try {
      logForDebugging('Running AWS credential export command')
      const { stdout } = await execFileAsync('/bin/sh', ['-c', awsCredentialExport])
      if (!stdout) throw new Error('awsCredentialExport did not return a valid value')
      const awsOutput = jsonParse(stdout.trim())
      const { isValidAwsStsOutput } = requireAws()
      if (!isValidAwsStsOutput(awsOutput)) {
        throw new Error('awsCredentialExport did not return valid AWS STS output structure')
      }
      logForDebugging('AWS credentials retrieved from awsCredentialExport')
      return {
        accessKeyId: awsOutput.Credentials.AccessKeyId,
        secretAccessKey: awsOutput.Credentials.SecretAccessKey,
        sessionToken: awsOutput.Credentials.SessionToken,
      }
    } catch (e) {
      const message = chalk.red('Error getting AWS credentials from awsCredentialExport (in settings or ~/.claude.json):')
      console.error(message, e instanceof Error ? e.message : e)
      return null
    }
  }
}

export const refreshAndGetAwsCredentials = memoizeWithTTLAsync(async (): Promise<{
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
} | null> => {
  const refreshed = await runAwsAuthRefresh()
  const credentials = await getAwsCredsFromCredentialExport()
  if (refreshed || credentials) {
    try {
      await requireAws().clearAwsIniCache()
    } catch {
      // aws.ts no portado — no-op
    }
  }
  return credentials
}, DEFAULT_AWS_STS_TTL)

export function clearAwsCredentialsCache(): void {
  refreshAndGetAwsCredentials.cache.clear()
}

function getConfiguredGcpAuthRefresh(): string | undefined {
  return (getSettings() || {}).gcpAuthRefresh
}

export function isGcpAuthRefreshFromProjectSettings(): boolean {
  const gcpAuthRefresh = getConfiguredGcpAuthRefresh()
  if (!gcpAuthRefresh) return false
  const projectSettings = getSettingsForSource('projectSettings')
  const localSettings = getSettingsForSource('localSettings')
  return projectSettings?.gcpAuthRefresh === gcpAuthRefresh || localSettings?.gcpAuthRefresh === gcpAuthRefresh
}

class GcpCredentialsTimeoutError extends Error {}
const GCP_CREDENTIALS_CHECK_TIMEOUT_MS = 5_000

/**
 * Igual que la fuente: intenta cargar `google-auth-library` dinámicamente.
 * Ese paquete no está instalado en este árbol — el `import()` falla y el
 * `catch` degrada a `false`, que es EXACTAMENTE el comportamiento fail-safe
 * que la fuente ya declara para cualquier fallo de esta comprobación.
 */
export async function checkGcpCredentialsValid(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { GoogleAuth } = (await import('google-auth-library' as any)) as any
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
    const probe = (async () => {
      const client = await auth.getClient()
      await client.getAccessToken()
    })()
    const timeout = sleep(GCP_CREDENTIALS_CHECK_TIMEOUT_MS).then(() => {
      throw new GcpCredentialsTimeoutError('GCP credentials check timed out')
    })
    await Promise.race([probe, timeout])
    return true
  } catch {
    return false
  }
}

const DEFAULT_GCP_CREDENTIAL_TTL = 60 * 60 * 1000

async function runGcpAuthRefresh(): Promise<boolean> {
  const gcpAuthRefresh = getConfiguredGcpAuthRefresh()
  if (!gcpAuthRefresh) return false

  if (isGcpAuthRefreshFromProjectSettings()) {
    const hasTrust = checkHasTrustDialogAccepted()
    if (!hasTrust && !getIsNonInteractiveSession()) {
      const error = new Error('Security: gcpAuthRefresh executed before workspace trust is confirmed.')
      logAntError('gcpAuthRefresh invoked before trust check', error)
      logEvent('tengu_gcpAuthRefresh_missing_trust', {})
      return false
    }
  }

  try {
    logForDebugging('Checking GCP credentials validity for auth refresh')
    const isValid = await checkGcpCredentialsValid()
    if (isValid) {
      logForDebugging('GCP credentials are valid, skipping auth refresh command')
      return false
    }
  } catch {
    // sigue con el refresh
  }

  return refreshGcpAuth(gcpAuthRefresh)
}

const GCP_AUTH_REFRESH_TIMEOUT_MS = 3 * 60 * 1000

export function refreshGcpAuth(gcpAuthRefresh: string): Promise<boolean> {
  logForDebugging('Running GCP auth refresh command')
  const authStatusManager = LocalAuthStatusManager.getInstance()
  authStatusManager.startAuthentication()

  return new Promise(resolve => {
    const refreshProc = exec(gcpAuthRefresh, { timeout: GCP_AUTH_REFRESH_TIMEOUT_MS })
    refreshProc.stdout?.on('data', data => {
      const output = data.toString().trim()
      if (output) {
        authStatusManager.addOutput(output)
        logForDebugging(output, { level: 'debug' })
      }
    })
    refreshProc.stderr?.on('data', data => {
      const error = data.toString().trim()
      if (error) {
        authStatusManager.setError(error)
        logForDebugging(error, { level: 'error' })
      }
    })
    refreshProc.on('close', (code, signal) => {
      if (code === 0) {
        logForDebugging('GCP auth refresh completed successfully')
        authStatusManager.endAuthentication(true)
        resolve(true)
      } else {
        const timedOut = signal === 'SIGTERM'
        console.error(
          timedOut
            ? chalk.red('GCP auth refresh timed out after 3 minutes. Run your auth command manually in a separate terminal.')
            : chalk.red('Error running gcpAuthRefresh (in settings or ~/.claude.json):'),
        )
        authStatusManager.endAuthentication(false)
        resolve(false)
      }
    })
  })
}

export const refreshGcpCredentialsIfNeeded = memoizeWithTTLAsync(async (): Promise<boolean> => {
  return runGcpAuthRefresh()
}, DEFAULT_GCP_CREDENTIAL_TTL)

export function clearGcpCredentialsCache(): void {
  refreshGcpCredentialsIfNeeded.cache.clear()
}

export function prefetchGcpCredentialsIfSafe(): void {
  const gcpAuthRefresh = getConfiguredGcpAuthRefresh()
  if (!gcpAuthRefresh) return
  if (isGcpAuthRefreshFromProjectSettings()) {
    const hasTrust = checkHasTrustDialogAccepted()
    if (!hasTrust && !getIsNonInteractiveSession()) return
  }
  void refreshGcpCredentialsIfNeeded()
}

export function prefetchAwsCredentialsAndBedRockInfoIfSafe(): void {
  const awsAuthRefresh = getConfiguredAwsAuthRefresh()
  const awsCredentialExport = getConfiguredAwsCredentialExport()
  if (!awsAuthRefresh && !awsCredentialExport) return

  if (isAwsAuthRefreshFromProjectSettings() || isAwsCredentialExportFromProjectSettings()) {
    const hasTrust = checkHasTrustDialogAccepted()
    if (!hasTrust && !getIsNonInteractiveSession()) return
  }

  void refreshAndGetAwsCredentials()
  getModelStrings()
}

/** @private Usar {@link getAnthropicApiKey} o {@link getAnthropicApiKeyWithSource} */
export const getApiKeyFromConfigOrMacOSKeychain = memoize((): { key: string; source: ApiKeySource } | null => {
  if (isBareMode()) return null
  if (process.platform === 'darwin') {
    let prefetch: { stdout?: string } | undefined
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      prefetch = (require('@thyrox/storage/secureStorage/keychainPrefetch.js') as { getLegacyApiKeyPrefetchResult: () => { stdout?: string } | undefined }).getLegacyApiKeyPrefetchResult()
    } catch {
      prefetch = undefined
    }
    if (prefetch) {
      if (prefetch.stdout) {
        return { key: prefetch.stdout, source: '/login managed key' }
      }
    } else {
      const storageServiceName = getMacOsKeychainStorageServiceName()
      try {
        const result = execSyncWithDefaults(`security find-generic-password -a $USER -w -s "${storageServiceName}"`)
        if (result) {
          return { key: result, source: '/login managed key' }
        }
      } catch (e) {
        logError(e)
      }
    }
  }

  const config = getGlobalConfig()
  if (!config.primaryApiKey) return null
  return { key: config.primaryApiKey, source: '/login managed key' }
})

function isValidApiKeyFormat(apiKey: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(apiKey)
}

async function maybeRemoveApiKeyFromMacOSKeychainThrows(): Promise<void> {
  if (process.platform === 'darwin') {
    const storageServiceName = getMacOsKeychainStorageServiceName()
    try {
      await execFileAsync('/bin/sh', ['-c', `security delete-generic-password -a $USER -s "${storageServiceName}"`])
    } catch {
      throw new Error('Failed to delete keychain entry')
    }
  }
}

/**
 * Porte de `ccnmt: packages/provider/src/oauth/saveApiKey.ts` — sibling NO
 * asignado, inlineado aquí (único consumidor). `execa('security', ['-i'], …)`
 * → `execFileAsync('security', ['-i'], …)` con el mismo `input`/`timeout`.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  if (!isValidApiKeyFormat(apiKey)) {
    throw new Error('Invalid API key format. API key must contain only alphanumeric characters, dashes, and underscores.')
  }

  try {
    await maybeRemoveApiKeyFromMacOSKeychainThrows()
  } catch (e) {
    logError(e)
  }

  let savedToKeychain = false
  if (process.platform === 'darwin') {
    const service = getMacOsKeychainStorageServiceName()
    const user = getUsername()
    const hex = Buffer.from(apiKey, 'utf-8').toString('hex')
    const cmd = `add-generic-password -U -a "${user}" -s "${service}" -X "${hex}"\n`
    try {
      const child = execFile('security', ['-i'], { timeout: 5000 })
      child.stdin?.write(cmd)
      child.stdin?.end()
      await new Promise<void>((resolve, reject) => {
        let stderr = ''
        child.stderr?.on('data', d => {
          stderr += d.toString()
        })
        child.on('close', code => {
          if (code === 0) resolve()
          else reject(new Error(stderr.trim().replace(/\s*\n\s*/g, '; ')))
        })
        child.on('error', reject)
      })
      logEvent('tengu_api_key_saved_to_keychain', {})
      savedToKeychain = true
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      logEvent('tengu_api_key_keychain_error', {
        error: detail as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      throw new Error(`Failed to save API key to macOS Keychain${detail ? ` (${detail})` : ''}. Run \`claude doctor\` to diagnose keychain access.`)
    }
  } else {
    logEvent('tengu_api_key_saved_to_config', {})
  }

  const normalizedKey = normalizeApiKeyForConfig(apiKey)

  saveGlobalConfig(current => {
    const approved = current.customApiKeyResponses?.approved ?? []
    return {
      ...current,
      primaryApiKey: savedToKeychain ? current.primaryApiKey : apiKey,
      customApiKeyResponses: {
        ...current.customApiKeyResponses,
        approved: approved.includes(normalizedKey) ? approved : [...approved, normalizedKey],
        rejected: current.customApiKeyResponses?.rejected ?? [],
      },
    }
  })

  getApiKeyFromConfigOrMacOSKeychain.cache?.clear?.()
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ;(require('@thyrox/storage/secureStorage/keychainPrefetch.js') as { clearLegacyApiKeyPrefetch: () => void }).clearLegacyApiKeyPrefetch()
  } catch {
    // no portado — no-op
  }
}

export function isCustomApiKeyApproved(apiKey: string): boolean {
  const config = getGlobalConfig()
  const normalizedKey = normalizeApiKeyForConfig(apiKey)
  return config.customApiKeyResponses?.approved?.includes(normalizedKey) ?? false
}

export async function removeApiKey(): Promise<void> {
  try {
    await maybeRemoveApiKeyFromMacOSKeychainThrows()
  } catch (e) {
    logError(e)
  }

  saveGlobalConfig(current => ({ ...current, primaryApiKey: undefined }))

  getApiKeyFromConfigOrMacOSKeychain.cache?.clear?.()
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ;(require('@thyrox/storage/secureStorage/keychainPrefetch.js') as { clearLegacyApiKeyPrefetch: () => void }).clearLegacyApiKeyPrefetch()
  } catch {
    // no portado — no-op
  }
}

export function saveOAuthTokensIfNeeded(tokens: OAuthTokens): { success: boolean; warning?: string } {
  if (!shouldUseClaudeAIAuth(tokens.scopes)) {
    logEvent('tengu_oauth_tokens_not_claude_ai', {})
    return { success: true }
  }
  if (!tokens.refreshToken || !tokens.expiresAt) {
    logEvent('tengu_oauth_tokens_inference_only', {})
    return { success: true }
  }

  const secureStorage = getSecureStorage()
  const storageBackend = secureStorage.name as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS

  try {
    const storageData = secureStorage.read() || {}
    const existingOauth = storageData.claudeAiOauth

    storageData.claudeAiOauth = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      subscriptionType: tokens.subscriptionType ?? existingOauth?.subscriptionType ?? null,
      rateLimitTier: tokens.rateLimitTier ?? existingOauth?.rateLimitTier ?? null,
    }

    const updateStatus = secureStorage.update(storageData)

    if (updateStatus.success) {
      logEvent('tengu_oauth_tokens_saved', { storageBackend })
    } else {
      logEvent('tengu_oauth_tokens_save_failed', { storageBackend })
    }

    getClaudeAIOAuthTokens.cache?.clear?.()
    clearBetasCaches()
    clearToolSchemaCache()
    return updateStatus
  } catch (error) {
    logError(error)
    logEvent('tengu_oauth_tokens_save_exception', {
      storageBackend,
      error: errorMessage(error) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return { success: false, warning: 'Failed to save OAuth tokens' }
  }
}

function inferenceOnlyToken(accessToken: string): OAuthTokens {
  return {
    accessToken,
    refreshToken: null as unknown as string,
    expiresAt: null,
    scopes: ['user:inference'],
    subscriptionType: null,
    rateLimitTier: null,
  }
}

export const getClaudeAIOAuthTokens = memoize((): OAuthTokens | null => {
  if (isBareMode()) return null

  if (readEnv('CLAUDE_CODE_OAUTH_TOKEN')) {
    return inferenceOnlyToken(readEnv('CLAUDE_CODE_OAUTH_TOKEN')!)
  }
  const oauthTokenFromFd = getOAuthTokenFromFileDescriptor()
  if (oauthTokenFromFd) return inferenceOnlyToken(oauthTokenFromFd)

  try {
    const secureStorage = getSecureStorage()
    const storageData = secureStorage.read()
    const oauthData = storageData?.claudeAiOauth as OAuthTokens | undefined

    if (!oauthData?.accessToken) return null
    return oauthData
  } catch (error) {
    logError(error)
    return null
  }
})

/** Limpia todas las cachés de tokens OAuth. Llamar en un 401. */
export function clearOAuthTokenCache(): void {
  getClaudeAIOAuthTokens.cache?.clear?.()
  clearKeychainCache()
}

let lastCredentialsMtimeMs = 0

async function invalidateOAuthCacheIfDiskChanged(): Promise<void> {
  try {
    const { mtimeMs } = await stat(join(getClaudeConfigHomeDirLocal(), '.credentials.json'))
    if (mtimeMs !== lastCredentialsMtimeMs) {
      lastCredentialsMtimeMs = mtimeMs
      clearOAuthTokenCache()
      clearRefreshTokenDeadSet()
    }
  } catch {
    getClaudeAIOAuthTokens.cache?.clear?.()
  }
}

function getClaudeConfigHomeDirLocal(): string {
  const override = readEnv('CLAUDE_CONFIG_DIR')
  if (override) return override
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '.'
  return `${home}/.claude`
}

const pending401Handlers = new Map<string, Promise<boolean>>()

type OAuthTokensView = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  scopes?: readonly string[]
  subscriptionType?: string | null
  clientId?: string
}
const asView = (t: OAuthTokens | null | undefined): OAuthTokensView | null => (t as unknown as OAuthTokensView | null) ?? null

async function readClaudeAiOauthFromDisk(): Promise<OAuthTokens | null> {
  try {
    const storage = getSecureStorage()
    return ((storage.read() as { claudeAiOauth?: OAuthTokens } | null)?.claudeAiOauth) ?? null
  } catch (error) {
    logError(error)
    return null
  }
}

export function handleOAuth401Error(failedAccessToken: string): Promise<boolean> {
  const pending = pending401Handlers.get(failedAccessToken)
  if (pending) return pending
  const promise = handleOAuth401ErrorImpl(failedAccessToken).finally(() => {
    pending401Handlers.delete(failedAccessToken)
  })
  pending401Handlers.set(failedAccessToken, promise)
  return promise
}

async function handleOAuth401ErrorImpl(failedAccessToken: string): Promise<boolean> {
  clearOAuthTokenCache()
  const currentTokens = asView(await getClaudeAIOAuthTokensAsync())

  if (!currentTokens?.refreshToken) {
    const hasEnvToken = !!readEnv('CLAUDE_CODE_OAUTH_TOKEN')
    const hasCcrToken = !!getOAuthTokenFromFileDescriptor()
    if (hasEnvToken || hasCcrToken) {
      const diskOauth = asView(await readClaudeAiOauthFromDisk())
      if (diskOauth?.accessToken && diskOauth.accessToken !== failedAccessToken) {
        if (hasEnvToken) process.env.CLAUDE_CODE_OAUTH_TOKEN = diskOauth.accessToken
        if (hasCcrToken) setOauthTokenFromFd(diskOauth.accessToken)
        clearOAuthTokenCache()
        logEvent('tengu_oauth_401_recovered_from_disk', {})
        return true
      }
    }
    return false
  }

  if (currentTokens.accessToken !== failedAccessToken) {
    logEvent('tengu_oauth_401_recovered_from_keychain', {})
    return true
  }

  return checkAndRefreshOAuthTokenIfNeeded(0, true, failedAccessToken)
}

export async function getClaudeAIOAuthTokensAsync(): Promise<OAuthTokens | null> {
  if (isBareMode()) return null
  if (readEnv('CLAUDE_CODE_OAUTH_TOKEN') || getOAuthTokenFromFileDescriptor()) {
    return getClaudeAIOAuthTokens()
  }
  return readClaudeAiOauthFromDisk()
}

let pendingRefreshCheck: Promise<boolean> | null = null

export async function withOAuthRefreshLock<T>(
  callback: (ctx: { lockedTokens: OAuthTokensView | null; lockAttempts: number }) => Promise<T>,
): Promise<T> {
  const claudeDir = getClaudeConfigHomeDirLocal()
  await mkdir(claudeDir, { recursive: true })
  const MAX_RETRIES = 5
  let retryCount = 0
  for (;;) {
    let release: (() => Promise<void>) | undefined
    try {
      logEvent('tengu_oauth_token_refresh_lock_acquiring', {})
      release = await lockfile.lock(claudeDir, oauthRefreshLockOptions(claudeDir))
      logEvent('tengu_oauth_token_refresh_lock_acquired', {})
      getClaudeAIOAuthTokens.cache?.clear?.()
      clearKeychainCache()
      return await callback({ lockedTokens: asView(await getClaudeAIOAuthTokensAsync()), lockAttempts: retryCount + 1 })
    } catch (err) {
      if ((err as { code?: string }).code === 'ELOCKED' && retryCount < MAX_RETRIES) {
        retryCount++
        logEvent('tengu_oauth_token_refresh_lock_retry', { retryCount })
        await sleep(1000 + Math.random() * 1000)
        continue
      }
      throw err
    } finally {
      if (release) {
        try {
          await release()
          logEvent('tengu_oauth_token_refresh_lock_released', {})
        } catch (releaseError) {
          logError(releaseError)
          logEvent('tengu_oauth_token_refresh_lock_release_error', {
            error: errorMessage(releaseError) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          })
        }
      }
    }
  }
}

export function checkAndRefreshOAuthTokenIfNeeded(retryCount = 0, force = false, expectedAccessToken?: string): Promise<boolean> {
  if (retryCount === 0 && !force) {
    if (pendingRefreshCheck) return pendingRefreshCheck
    const promise = checkAndRefreshOAuthTokenIfNeededImpl(retryCount, force, expectedAccessToken)
    pendingRefreshCheck = promise.finally(() => {
      pendingRefreshCheck = null
    })
    return pendingRefreshCheck
  }
  return checkAndRefreshOAuthTokenIfNeededImpl(retryCount, force, expectedAccessToken)
}

async function checkAndRefreshOAuthTokenIfNeededImpl(retryCount: number, force: boolean, expectedAccessToken?: string): Promise<boolean> {
  const MAX_RETRIES = 5

  await invalidateOAuthCacheIfDiskChanged()

  const tokens = asView(getClaudeAIOAuthTokens())
  if (!force) {
    if (!tokens?.refreshToken || !isOAuthTokenExpired(tokens.expiresAt ?? null)) return false
  }
  if (!tokens?.refreshToken) return false
  if (isRefreshTokenDead(tokens.refreshToken)) return false
  if (!shouldUseClaudeAIAuth(tokens.scopes as string[] | undefined) && !tokens.subscriptionType) return false

  const baselineAccessToken = expectedAccessToken ?? tokens.accessToken

  getClaudeAIOAuthTokens.cache?.clear?.()
  clearKeychainCache()
  const freshTokens = asView(await getClaudeAIOAuthTokensAsync())
  if (!freshTokens?.refreshToken) return false
  if (freshTokens.accessToken !== baselineAccessToken) {
    logEvent('tengu_oauth_token_refresh_race_resolved', {})
    return true
  }
  if (!force && !isOAuthTokenExpired(freshTokens.expiresAt ?? null)) return false

  const claudeDir = getClaudeConfigHomeDirLocal()
  await mkdir(claudeDir, { recursive: true })

  let release: (() => Promise<void>) | undefined
  try {
    logEvent('tengu_oauth_token_refresh_lock_acquiring', {})
    release = await lockfile.lock(claudeDir, oauthRefreshLockOptions(claudeDir))
    logEvent('tengu_oauth_token_refresh_lock_acquired', {})
  } catch (err) {
    if ((err as { code?: string }).code === 'ELOCKED') {
      if (retryCount < MAX_RETRIES) {
        logEvent('tengu_oauth_token_refresh_lock_retry', { retryCount: retryCount + 1 })
        await sleep(1000 + Math.random() * 1000)
        return checkAndRefreshOAuthTokenIfNeededImpl(retryCount + 1, force, baselineAccessToken)
      }
      logEvent('tengu_oauth_token_refresh_lock_retry_limit_reached', { maxRetries: MAX_RETRIES })
      logEvent('tengu_feature_sad', {
        feature_name: 'oauth_token_refresh' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        error_code: 'oauth_refresh_lock_timeout' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return false
    }
    logError(err)
    logEvent('tengu_oauth_token_refresh_lock_error', {
      error: errorMessage(err) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    logEvent('tengu_feature_bad', {
      feature_name: 'oauth_token_refresh' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      error_code: 'oauth_refresh_lock_error' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return false
  }
  try {
    getClaudeAIOAuthTokens.cache?.clear?.()
    clearKeychainCache()
    const lockedTokens = asView(await getClaudeAIOAuthTokensAsync())
    if (!lockedTokens?.refreshToken) return false
    if (lockedTokens.accessToken !== baselineAccessToken) {
      logEvent('tengu_oauth_token_refresh_race_resolved', {})
      return true
    }
    if (!force && !isOAuthTokenExpired(lockedTokens.expiresAt ?? null)) return false
    if (isRefreshTokenDead(lockedTokens.refreshToken)) return false

    logEvent('tengu_oauth_token_refresh_starting', {})
    const shouldOmitScopes = (shouldUseClaudeAIAuth(lockedTokens.scopes as string[] | undefined) || Boolean(lockedTokens.subscriptionType)) && !lockedTokens.clientId
    const refreshedTokens = await refreshOAuthToken(lockedTokens.refreshToken, {
      scopes: shouldOmitScopes ? undefined : (lockedTokens.scopes as string[] | undefined),
      clientId: lockedTokens.clientId,
    })
    saveOAuthTokensIfNeeded(refreshedTokens)
    getClaudeAIOAuthTokens.cache?.clear?.()
    clearKeychainCache()
    return true
  } catch (error) {
    logError(error)
    getClaudeAIOAuthTokens.cache?.clear?.()
    clearKeychainCache()
    const currentTokens = asView(await getClaudeAIOAuthTokensAsync())
    if (currentTokens && currentTokens.accessToken !== baselineAccessToken) {
      logEvent('tengu_oauth_token_refresh_race_recovered', {})
      return true
    }
    return false
  } finally {
    logEvent('tengu_oauth_token_refresh_lock_releasing', {})
    try {
      await release()
      logEvent('tengu_oauth_token_refresh_lock_released', {})
    } catch (releaseError) {
      logError(releaseError)
      logEvent('tengu_oauth_token_refresh_lock_release_error', {
        error: errorMessage(releaseError) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
    }
  }
}

export function isClaudeAISubscriber(): boolean {
  if (!isAnthropicAuthEnabled()) return false
  return shouldUseClaudeAIAuth(getClaudeAIOAuthTokens()?.scopes as string[] | undefined)
}

/** ¿El token OAuth actual tiene el scope `user:profile`? */
export function hasProfileScope(): boolean {
  return getClaudeAIOAuthTokens()?.scopes?.includes(CLAUDE_AI_PROFILE_SCOPE) ?? false
}

export function is1PApiCustomer(): boolean {
  if (isUsing3PServices()) return false
  if (isClaudeAISubscriber()) return false
  return true
}

export function getOauthAccountInfo(): AccountInfo | undefined {
  return isAnthropicAuthEnabled() ? getGlobalConfig().oauthAccount : undefined
}

export function isOverageProvisioningAllowed(): boolean {
  const accountInfo = getOauthAccountInfo()
  const billingType = accountInfo?.billingType

  if (!isClaudeAISubscriber() || !billingType) return false

  if (billingType !== 'stripe_subscription' && billingType !== 'stripe_subscription_contracted' && billingType !== 'apple_subscription' && billingType !== 'google_play_subscription') {
    return false
  }
  return true
}

export function hasOpusAccess(): boolean {
  const subscriptionType = getSubscriptionType()
  return subscriptionType === 'max' || subscriptionType === 'enterprise' || subscriptionType === 'team' || subscriptionType === 'pro' || subscriptionType === null
}

export function getSubscriptionType(): SubscriptionType | null {
  if (shouldUseMockSubscription()) return getMockSubscriptionType()
  if (!isAnthropicAuthEnabled()) return null
  const oauthTokens = getClaudeAIOAuthTokens()
  if (!oauthTokens) return null
  return oauthTokens.subscriptionType ?? null
}

export function isMaxSubscriber(): boolean {
  return getSubscriptionType() === 'max'
}
export function isTeamSubscriber(): boolean {
  return getSubscriptionType() === 'team'
}
export function isTeamPremiumSubscriber(): boolean {
  return getSubscriptionType() === 'team' && getRateLimitTier() === 'default_claude_max_5x'
}
export function isEnterpriseSubscriber(): boolean {
  return getSubscriptionType() === 'enterprise'
}
export function getSeatTier(): string | null {
  return getOauthAccountInfo()?.seatTier ?? null
}
export function isEnterprisePAYGSubscriber(): boolean {
  return getSubscriptionType() === 'enterprise' && getSeatTier() === 'enterprise_usage_based'
}
export function isProSubscriber(): boolean {
  return getSubscriptionType() === 'pro'
}

export function __resetKnownDeadRefreshTokensForTest(): void {
  clearRefreshTokenDeadSet()
}

export function oauthRefreshLockOptions(claudeDir: string): {
  lockfilePath: string
  realpath: boolean
  stale: number
  onCompromised: (err: Error) => void
} {
  return {
    lockfilePath: join(claudeDir, '.oauth_refresh.lock'),
    realpath: false,
    stale: 10_000,
    onCompromised: err => logError(err),
  }
}

export const SDK_OAUTH_REFRESH_ENTRYPOINTS: readonly string[] = []

export function getRateLimitTier(): string | null {
  if (!isAnthropicAuthEnabled()) return null
  const oauthTokens = getClaudeAIOAuthTokens()
  if (!oauthTokens) return null
  return oauthTokens.rateLimitTier ?? null
}

export function getSubscriptionName(): string {
  switch (getSubscriptionType()) {
    case 'enterprise':
      return 'Claude Enterprise'
    case 'team':
      return 'Claude Team'
    case 'max':
      return 'Claude Max'
    case 'pro':
      return 'Claude Pro'
    default:
      return 'Claude API'
  }
}

export function isUsing3PServices(): boolean {
  return !!(
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_BEDROCK')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_VERTEX')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_FOUNDRY')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_ANTHROPIC_AWS')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_MANTLE'))
  )
}

function getConfiguredOtelHeadersHelper(): string | undefined {
  return (getSettings() || {}).otelHeadersHelper
}

export function isOtelHeadersHelperFromProjectOrLocalSettings(): boolean {
  const otelHeadersHelper = getConfiguredOtelHeadersHelper()
  if (!otelHeadersHelper) return false
  const projectSettings = getSettingsForSource('projectSettings')
  const localSettings = getSettingsForSource('localSettings')
  return projectSettings?.otelHeadersHelper === otelHeadersHelper || localSettings?.otelHeadersHelper === otelHeadersHelper
}

let cachedOtelHeaders: Record<string, string> | null = null
let cachedOtelHeadersTimestamp = 0
const DEFAULT_OTEL_HEADERS_DEBOUNCE_MS = 29 * 60 * 1000

export function getOtelHeadersFromHelper(): Record<string, string> {
  const otelHeadersHelper = getConfiguredOtelHeadersHelper()
  if (!otelHeadersHelper) return {}

  const debounceMs = parseInt(readEnv('CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS') || DEFAULT_OTEL_HEADERS_DEBOUNCE_MS.toString(), 10)
  if (cachedOtelHeaders && Date.now() - cachedOtelHeadersTimestamp < debounceMs) {
    return cachedOtelHeaders
  }

  if (isOtelHeadersHelperFromProjectOrLocalSettings()) {
    const hasTrust = checkHasTrustDialogAccepted()
    if (!hasTrust) return {}
  }

  try {
    const result = execSyncWithDefaults(otelHeadersHelper, { timeout: 30000 })?.toString().trim()
    if (!result) throw new Error('otelHeadersHelper did not return a valid value')

    const headers = jsonParse(result)
    if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
      throw new Error('otelHeadersHelper must return a JSON object with string key-value pairs')
    }
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value !== 'string') {
        throw new Error(`otelHeadersHelper returned non-string value for key "${key}": ${typeof value}`)
      }
    }

    cachedOtelHeaders = headers as Record<string, string>
    cachedOtelHeadersTimestamp = Date.now()
    return cachedOtelHeaders
  } catch (error) {
    logError(new Error(`Error getting OpenTelemetry headers from otelHeadersHelper (in settings): ${errorMessage(error)}`))
    throw error
  }
}

function isConsumerPlan(plan: SubscriptionType): plan is 'max' | 'pro' {
  return plan === 'max' || plan === 'pro'
}

export function isConsumerSubscriber(): boolean {
  const subscriptionType = getSubscriptionType()
  return isClaudeAISubscriber() && subscriptionType !== null && isConsumerPlan(subscriptionType)
}

export type UserAccountInfo = {
  subscription?: string
  tokenSource?: string
  apiKeySource?: ApiKeySource
  organization?: string
  email?: string
}

export function getAccountInformation() {
  const apiProvider = getAPIProvider()
  if (apiProvider !== 'firstParty') return undefined

  const { source: authTokenSource } = getAuthTokenSource()
  const accountInfo: UserAccountInfo = {}
  if (authTokenSource === 'CLAUDE_CODE_OAUTH_TOKEN' || authTokenSource === 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR') {
    accountInfo.tokenSource = authTokenSource
  } else if (isClaudeAISubscriber()) {
    accountInfo.subscription = getSubscriptionName()
  } else {
    accountInfo.tokenSource = authTokenSource
  }
  const { key: apiKey, source: apiKeySource } = getAnthropicApiKeyWithSource()
  if (apiKey) {
    accountInfo.apiKeySource = apiKeySource
  }

  if (authTokenSource === 'claude.ai' || apiKeySource === '/login managed key') {
    const orgName = getOauthAccountInfo()?.organizationName
    if (orgName) accountInfo.organization = orgName
  }
  const email = getOauthAccountInfo()?.emailAddress
  if ((authTokenSource === 'claude.ai' || apiKeySource === '/login managed key') && email) {
    accountInfo.email = email
  }
  return accountInfo
}

export type OrgValidationResult = { valid: true } | { valid: false; message: string }

/**
 * Valida que el token OAuth activo pertenezca a una organización permitida
 * (política `forceLoginOrgUUID`).
 */
export async function validateForceLoginOrg(): Promise<OrgValidationResult> {
  if (readEnv('ANTHROPIC_UNIX_SOCKET')) return { valid: true }
  if (!isAnthropicAuthEnabled()) return { valid: true }

  const requiredOrgUuidRaw = getSettingsForSource('policySettings')?.forceLoginOrgUUID as string | string[] | undefined
  if (requiredOrgUuidRaw === undefined) return { valid: true }

  const allowedOrgUuids = typeof requiredOrgUuidRaw === 'string' ? [requiredOrgUuidRaw] : requiredOrgUuidRaw

  if (allowedOrgUuids.length === 0) {
    return {
      valid: false,
      message: `forceLoginOrgUUID in managed settings is set to an empty array.\nNo organizations are permitted. This is almost certainly a misconfiguration.\nContact your administrator.`,
    }
  }

  const requiredPhrase = allowedOrgUuids.length === 1 ? `organization ${allowedOrgUuids[0]}` : `one of these organizations: ${allowedOrgUuids.join(', ')}`

  await checkAndRefreshOAuthTokenIfNeeded()
  const tokens = getClaudeAIOAuthTokens()
  if (!tokens) return { valid: true }

  const { source } = getAuthTokenSource()
  const isEnvVarToken = source === 'CLAUDE_CODE_OAUTH_TOKEN' || source === 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR'

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fetchProfileInfo } = require('./oauth/client.ts') as { fetchProfileInfo: (t: string) => Promise<{ rawProfile?: { organization: { uuid: string } } }> }
  const profileInfo = await fetchProfileInfo(tokens.accessToken)
  const profile = profileInfo.rawProfile
  if (!profile) {
    return {
      valid: false,
      message:
        `Unable to verify organization for the current authentication token.\n` +
        `This machine requires ${requiredPhrase} but the profile could not be fetched.\n` +
        `This may be a network error, or the token may lack the user:profile scope required for\n` +
        `verification (tokens from 'claude setup-token' do not include this scope).\n` +
        `Try again, or obtain a full-scope token via 'claude auth login'.`,
    }
  }

  const tokenOrgUuid = profile.organization.uuid
  if (allowedOrgUuids.includes(tokenOrgUuid)) return { valid: true }

  if (isEnvVarToken) {
    return {
      valid: false,
      message:
        `The ${source} environment variable provides a token for a\n` +
        `different organization than required by this machine's managed settings.\n\n` +
        `Required: ${requiredPhrase}\n` +
        `Token organization: ${tokenOrgUuid}\n\n` +
        `Remove the environment variable or obtain a token for a permitted organization.`,
    }
  }

  return {
    valid: false,
    message: `Your authentication token belongs to organization ${tokenOrgUuid},\nbut this machine requires ${requiredPhrase}.\n\nPlease log in with a permitted organization: claude auth login`,
  }
}
