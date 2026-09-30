/**
 * Shared bridge auth/URL resolution. Consolidates the ant-only
 * CLAUDE_BRIDGE_* dev overrides that were previously copy-pasted across
 * a dozen files — inboundAttachments, BriefTool/upload, bridgeMain,
 * initReplBridge, remoteBridgeCore, daemon workers, /rename,
 * /remote-control.
 *
 * Two layers: *Override() returns the ant-only env var (or undefined);
 * the non-Override versions fall through to the real OAuth store/config.
 * Callers that compose with a different auth source (e.g. daemon workers
 * using IPC auth) use the Override getters directly.
 */

import { isEnvTruthy } from '@thyrox/config/env/utils'
import { getOauthConfig } from '@thyrox/provider/oauthConstants'
import { getClaudeAIOAuthTokens } from '@thyrox/provider/authAlias.js'

/** Ant-only dev override: THYROX_BRIDGE_OAUTH_TOKEN, else undefined. */
export function getBridgeTokenOverride(): string | undefined {
  return (
    (process.env.USER_TYPE === 'ant' &&
      process.env.THYROX_BRIDGE_OAUTH_TOKEN) ||
    undefined
  )
}

/** Ant-only dev override: THYROX_BRIDGE_BASE_URL, else undefined. */
export function getBridgeBaseUrlOverride(): string | undefined {
  return (
    (process.env.USER_TYPE === 'ant' && process.env.THYROX_BRIDGE_BASE_URL) ||
    undefined
  )
}

/** Ant-only dev override: THYROX_BRIDGE_SESSION_INGRESS_URL, else undefined. */
export function getBridgeSessionIngressUrlOverride(): string | undefined {
  return (
    (process.env.USER_TYPE === 'ant' &&
      process.env.THYROX_BRIDGE_SESSION_INGRESS_URL) ||
    undefined
  )
}

/**
 * Dev override que fuerza el transporte CCR v2 aunque el servidor no lo
 * pida (THYROX_BRIDGE_USE_CCR_V2). Sin guarda de build interna, igual que
 * sus dos lectores de origen.
 */
export function isBridgeCcrV2Forced(): boolean {
  return isEnvTruthy(process.env.THYROX_BRIDGE_USE_CCR_V2)
}

/**
 * Access token for bridge API calls: dev override first, then the OAuth
 * keychain. Undefined means "not logged in".
 */
export function getBridgeAccessToken(): string | undefined {
  return getBridgeTokenOverride() ?? getClaudeAIOAuthTokens()?.accessToken
}

/**
 * Base URL for bridge API calls: dev override first, then the production
 * OAuth config. Always returns a URL.
 */
export function getBridgeBaseUrl(): string {
  return getBridgeBaseUrlOverride() ?? getOauthConfig().BASE_API_URL
}
