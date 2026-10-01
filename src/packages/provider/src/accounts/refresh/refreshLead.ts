/**
 * Cuánto antes de caducar se refresca el token de cada proveedor. Donde el
 * refresh token rota y refrescar una cuenta puede invalidar la familia de sus
 * hermanas (codex, Anthropic, GitLab, Kiro, Kimi), se refresca lo más tarde
 * posible; los refresh tokens de Google no rotan y admiten un margen mayor.
 *
 * Porte de `TOKEN_EXPIRY_BUFFER_MS`, `REFRESH_LEAD_MS` y `getRefreshLeadMs`
 * de `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
const MINUTE_MS = 60 * 1000

export const TOKEN_EXPIRY_BUFFER_MS = 5 * MINUTE_MS

export const REFRESH_LEAD_MS: Readonly<Record<string, number>> = {
  codex: 5 * MINUTE_MS,
  openai: 5 * MINUTE_MS,
  claude: 5 * MINUTE_MS,
  'gitlab-duo': 5 * MINUTE_MS,
  kiro: 5 * MINUTE_MS,
  'kimi-coding': 5 * MINUTE_MS,
  antigravity: 15 * MINUTE_MS,
  agy: 15 * MINUTE_MS,
}

/** El margen de la conexión si declara uno válido; si no, el del proveedor o el genérico. */
export function refreshLeadMs(provider: string, providerSpecificData?: { refreshLeadMs?: unknown } | null): number {
  const override = providerSpecificData?.refreshLeadMs
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) return override
  return REFRESH_LEAD_MS[provider] ?? TOKEN_EXPIRY_BUFFER_MS
}
