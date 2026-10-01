/**
 * El refresco de Kimi Coding con la identidad de dispositivo que Kimi exige
 * (`X-Msh-*`). El id estable guardado al iniciar sesión evita la detección de
 * bots; sin él, se deriva del refresh token para que al menos no cambie entre
 * refrescos del mismo token.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/kimiCoding.ts` (MIT).
 */
import { pbkdf2Sync } from 'node:crypto'
import { arch, hostname, release, type } from 'node:os'

import { buildKimiCodeIdentityHeaders, kimiCliVersion, kimiDeviceModel, normalizeKimiDeviceId } from '../../kimi/kimiIdentity.ts'
import type { ClientIdSource, Environment } from '../../oauth/flows/clientId.ts'
import { KIMI_CODING_TOKEN_URL } from '../../oauth/flows/kimiCodingFlow.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshedTokens, type RefreshOutcome, unrecoverableFor } from './refreshResult.ts'

const DEVICE_ID_SALT = 'kimi-device-id'
const DEVICE_ID_ITERATIONS = 1000
const DEVICE_ID_BYTES = 16
const ERROR_EXCERPT = 200

export interface HostDescription {
  hostname: string
  release: string
  type: string
  arch: string
}

const currentHost = (): HostDescription => ({ hostname: hostname(), release: release(), type: type(), arch: arch() })
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export async function refreshKimiCodingToken(refreshToken: string, providerSpecificData: Record<string, unknown> | null | undefined, deps: RefreshDeps & { config: ClientIdSource; env?: Environment; system?: HostDescription }): Promise<RefreshOutcome | (RefreshedTokens & { tokenType?: string; scope?: string })> {
  const fetch = deps.fetch ?? globalThis.fetch
  const system = deps.system ?? currentHost()
  const deviceId = normalizeKimiDeviceId(providerSpecificData?.deviceId) || normalizeKimiDeviceId(pbkdf2Sync(refreshToken, DEVICE_ID_SALT, DEVICE_ID_ITERATIONS, DEVICE_ID_BYTES, 'sha256').toString('hex'))
  const identity = {
    deviceId,
    deviceName: providerSpecificData?.deviceName || system.hostname,
    deviceModel: text(providerSpecificData?.deviceModel) || kimiDeviceModel(system),
    osVersion: providerSpecificData?.osVersion || system.release,
  }
  try {
    const response = await fetch(KIMI_CODING_TOKEN_URL, {
      method: 'POST',
      headers: { ...FORM_HEADERS, ...buildKimiCodeIdentityHeaders(identity, kimiCliVersion(deps.env ?? process.env)) },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: deps.config.clientId || '' }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      let dead = null
      try {
        dead = unrecoverableFor((JSON.parse(errorText) as { error?: string })?.error ?? null)
      } catch {
        // no es JSON: fallo pasajero
      }
      if (dead) {
        deps.log?.error?.('TOKEN_REFRESH', 'Kimi Coding refresh token invalid. Re-authentication required.', { errorCode: dead.code })
        return dead
      }
      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Kimi Coding token', { status: response.status, error: errorText.slice(0, ERROR_EXCERPT) })
      return null
    }
    const tokens = (await response.json()) as Record<string, unknown>
    deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Kimi Coding token', { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
    return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined, tokenType: tokens.token_type as string | undefined, scope: tokens.scope as string | undefined }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', `Network error refreshing Kimi Coding token: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}
