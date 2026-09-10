/**
 * Resolución compartida de auth/URL del bridge. Consolida los overrides
 * de desarrollo CLAUDE_BRIDGE_* sólo-ant que antes estaban copiados y
 * pegados a lo largo de una docena de archivos — inboundAttachments,
 * BriefTool/upload, bridgeMain, initReplBridge, remoteBridgeCore,
 * workers del daemon, /rename, /remote-control.
 *
 * Dos capas: *Override() devuelve la variable de entorno sólo-ant (o
 * undefined); las versiones sin Override caen al almacén/config OAuth
 * real. Los llamadores que componen con otra fuente de auth (p. ej. los
 * workers del daemon usando auth por IPC) usan los getters Override
 * directamente.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgeConfig.ts`.
 */

import { getOauthConfig, getClaudeAIOAuthTokens } from './internal/pendingCrossPackageDeps.js'

/** Override de dev sólo-ant: CLAUDE_BRIDGE_OAUTH_TOKEN, si no undefined. */
export function getBridgeTokenOverride(): string | undefined {
  return (
    (process.env.USER_TYPE === 'ant' &&
      process.env.CLAUDE_BRIDGE_OAUTH_TOKEN) ||
    undefined
  )
}

/** Override de dev sólo-ant: CLAUDE_BRIDGE_BASE_URL, si no undefined. */
export function getBridgeBaseUrlOverride(): string | undefined {
  return (
    (process.env.USER_TYPE === 'ant' && process.env.CLAUDE_BRIDGE_BASE_URL) ||
    undefined
  )
}

/**
 * Access token para llamadas a la API del bridge: primero el override de
 * dev, luego el keychain OAuth. Undefined significa "no ha iniciado sesión".
 */
export function getBridgeAccessToken(): string | undefined {
  return getBridgeTokenOverride() ?? getClaudeAIOAuthTokens()?.accessToken
}

/**
 * URL base para llamadas a la API del bridge: primero el override de dev,
 * luego la config OAuth de producción. Siempre devuelve una URL.
 */
export function getBridgeBaseUrl(): string {
  return getBridgeBaseUrlOverride() ?? getOauthConfig().BASE_API_URL
}
