/**
 * Tipos OAuth compartidos entre `authAlias.ts` y `oauth/client.ts` (ambos
 * de los 18). En `ccnmt: packages/provider/src/oauth/types.ts` — sibling
 * NO asignado a este pase — estos mismos nombres están declarados como
 * "Auto-generated stub — replace with real implementation" (`= unknown`
 * cada uno): la propia fuente no tiene el contrato real todavía. Aquí se
 * reconstruyen con la forma mínima que el código de `authAlias.ts` y
 * `oauth/client.ts` efectivamente lee/escribe — deducida de sus usos, no
 * copiada de ninguna fuente (no había de dónde copiarla).
 */

export type BillingType = string
export type SubscriptionType = 'max' | 'pro' | 'enterprise' | 'team' | string

export type RateLimitTier = string

export type OAuthTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
  scopes: string[]
  clientId?: string
  subscriptionType: SubscriptionType | null
  rateLimitTier: RateLimitTier | null
  profile?: OAuthProfileResponse
  tokenAccount?: {
    uuid: string
    emailAddress: string
    organizationUuid?: string
  }
}

export type OAuthTokenExchangeResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  account?: { uuid: string; email_address: string }
  organization?: { uuid: string }
}

export type OAuthProfileResponse = {
  account: {
    uuid: string
    email: string
    display_name?: string
    created_at?: string
  }
  organization: {
    uuid: string
    organization_type?: string
    rate_limit_tier?: RateLimitTier | null
    has_extra_usage_enabled?: boolean | null
    billing_type?: BillingType | null
    seat_tier?: string | null
    cc_onboarding_flags?: Record<string, unknown>
    claude_code_trial_ends_at?: string | null
    claude_code_trial_duration_days?: number | null
    subscription_created_at?: string
  }
}

export type UserRolesResponse = {
  organization_role?: string
  workspace_role?: string
  organization_name?: string
}

export type AccountInfo = {
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
  organizationRole?: string
  workspaceRole?: string
  organizationName?: string
}
