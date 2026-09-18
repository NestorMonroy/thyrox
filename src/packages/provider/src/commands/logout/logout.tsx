import * as React from 'react'
import { clearTrustedDeviceTokenCache } from '@thyrox/bridge/trustedDevice.js'
import { refreshGrowthBookAfterAuthChange } from '@thyrox/config/feature-flags'
import {
  getGroveNoticeConfig,
  getGroveSettings,
} from '../../grove.js'
import { clearPolicyLimitsCache } from '../../policyLimits/index.js'
// flushTelemetry is loaded lazily to avoid pulling in ~1.1MB of OpenTelemetry at startup
import { clearRemoteManagedSettingsCache } from '@thyrox/config/remote'
import { getClaudeAIOAuthTokens, removeApiKey } from '../../authAlias.js'
import { clearBetasCaches } from '../../betas.js'
import { saveGlobalConfig } from '@thyrox/config'
import { getSecureStorage } from '@thyrox/storage/secureStorage.js'
import { clearToolSchemaCache } from '@thyrox/tool-registry/toolSchemaCache.js'
import { resetUserCache } from '../../user.js'

export async function performLogout({
  clearOnboarding = false,
  preserveInProcessTokens = false,
}: {
  clearOnboarding?: boolean
  // Port of ant Xw_ (3471.js) `preserveInProcessTokens` flag. installOAuthTokens
  // (ant NZH) calls performLogout to clear prior state BEFORE storing the new
  // credentials — but the in-process `oauthTokenFromFd` (BsH/A_H) and the
  // `CLAUDE_CODE_OAUTH_TOKEN` env var must NOT be wiped during this prelude,
  // because installOAuthTokens may re-establish them afterwards. A regular
  // logout (clearOnboarding-driven or user-invoked) does want them wiped.
  preserveInProcessTokens?: boolean
} = {}): Promise<void> {
  // Flush telemetry BEFORE clearing credentials to prevent org data leakage
  const { flushTelemetry } = await import(
    '@thyrox/local-observability/telemetry'
  )
  await flushTelemetry()

  // Ant Xw_: `if (!_) (delete process.env.CLAUDE_CODE_OAUTH_TOKEN, A_H(null))`.
  // Skip when re-logging in (preserveInProcessTokens=true) so the env-var path
  // (CLAUDE_CODE_OAUTH_TOKEN headless login) doesn't lose its source mid-flow.
  if (!preserveInProcessTokens) {
    // V7 §8.6: core-domain package must go through config helper for env access.
    const { deleteEnv } = await import('@thyrox/config/env/utils')
    deleteEnv('CLAUDE_CODE_OAUTH_TOKEN')
    // Lazy import to avoid circular dep through app-host barrel.
    const { setOauthTokenFromFd } = await import(
      '@thyrox/app-host/bootstrap/state.js'
    )
    setOauthTokenFromFd(null)
  }

  await removeApiKey()

  // Wipe all secure storage data on logout
  const secureStorage = getSecureStorage()
  secureStorage.delete()

  await clearAuthRelatedCaches()
  saveGlobalConfig(current => {
    const updated = { ...current }
    if (clearOnboarding) {
      updated.hasCompletedOnboarding = false
      updated.subscriptionNoticeCount = 0
      updated.hasAvailableSubscription = false
      if (updated.customApiKeyResponses?.approved) {
        updated.customApiKeyResponses = {
          ...updated.customApiKeyResponses,
          approved: [],
        }
      }
    }
    updated.oauthAccount = undefined
    return updated
  })
}

// clearing anything memoized that must be invalidated when user/session/auth changes
export async function clearAuthRelatedCaches(): Promise<void> {
  // Clear the OAuth token cache
  getClaudeAIOAuthTokens.cache?.clear?.()
  clearTrustedDeviceTokenCache()
  clearBetasCaches()
  clearToolSchemaCache()

  // Clear user data cache BEFORE GrowthBook refresh so it picks up fresh credentials
  resetUserCache()
  refreshGrowthBookAfterAuthChange()

  // Clear Grove config cache
  getGroveNoticeConfig.cache?.clear?.()
  getGroveSettings.cache?.clear?.()

  // Clear remotely managed settings cache
  await clearRemoteManagedSettingsCache()

  // Clear policy limits cache
  await clearPolicyLimitsCache()
}

export async function call(
  onDone: import('@thyrox/agent/command.js').LocalJSXCommandOnDone,
): Promise<React.ReactNode> {
  // V7 §11.6 — with connection-based multi-provider auth, "logout" is a
  // per-connection disconnect, not a global nuke. The picker shortcuts
  // to direct disconnect when there is exactly one connection, otherwise
  // it shows a disconnect-only list (no "+ Add new" entry — that's what
  // /login is for). The "nuke everything" path is still available via
  // performLogout() for the `ccb logout` CLI subcommand and disaster
  // recovery.
  const { LogoutPicker } = await import(
    '@thyrox/repl/components/LogoutPicker.js'
  )
  return React.createElement(LogoutPicker, {
    onDone: (message: string) => onDone(message),
  })
}
