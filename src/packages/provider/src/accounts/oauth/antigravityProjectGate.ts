/**
 * Una cuenta de Google sin proyecto de Cloud Code no se rechaza al conectar:
 * se guarda degradada, con su refresh token, para que el descubrimiento en la
 * primera petición pueda recuperarla. Aquí se decide esa marca y el estado
 * que se escribe al persistir.
 *
 * Porte de `omniroute: src/lib/oauth/antigravityProjectGate.ts` (MIT).
 */
import type { JsonRecord } from '../connectionColumns.ts'

export interface DegradedProjectState {
  testStatus: 'degraded'
  errorCode: string
  lastErrorType: string
  lastError: string
  /** El aviso que se da a quien conecta. */
  warning: string
}

const PROJECT_EXPECTED_PROVIDERS = new Set(['antigravity', 'agy'])

const BYOP_WARNING =
  'Connected, but Google did not assign a Cloud Code project to this account (BYOP). ' +
  'Create a GCP Project at console.cloud.google.com and complete Gemini Code Assist onboarding; ' +
  'the account is marked degraded until then and cannot serve requests.'

const DISCOVERY_FAILED_WARNING =
  'Connected, but the Google Cloud Code projectId could not be discovered during login ' +
  '(loadCodeAssist/onboardUser failed). The account is marked degraded; discovery retries ' +
  'automatically on the first request.'

function projectIdOf(tokenData: JsonRecord): string {
  const nested = tokenData.providerSpecificData
  const candidates = [tokenData.projectId, nested && typeof nested === 'object' ? (nested as JsonRecord).projectId : undefined]
  for (const candidate of candidates) if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  return ''
}

/** El proyecto vacío es la señal, lleve o no el resultado del descubrimiento. */
export function degradedProjectState(provider: string, tokenData: JsonRecord | null | undefined): DegradedProjectState | null {
  if (!PROJECT_EXPECTED_PROVIDERS.has(provider) || (tokenData && projectIdOf(tokenData))) return null
  const warning = tokenData?.projectDiscoveryOutcome === 'discovery_failed' ? DISCOVERY_FAILED_WARNING : BYOP_WARNING
  return { testStatus: 'degraded', errorCode: 'missing_project_id', lastErrorType: 'oauth_missing_project_id', lastError: warning, warning }
}

/** Los campos de estado que ganan sobre lo que traiga el payload. */
export function persistStatus(degraded: DegradedProjectState | null): JsonRecord {
  if (degraded) {
    return { testStatus: degraded.testStatus, errorCode: degraded.errorCode, lastErrorType: degraded.lastErrorType, lastError: degraded.lastError }
  }
  return { testStatus: 'active', errorCode: null, lastErrorType: null, lastError: null }
}
