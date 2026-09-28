/**
 * El tier de suscripción de Code Assist que devuelve `loadCodeAssist`: el
 * que se muestra y el que se pide al onboardar.
 *
 * Porte de `omniroute: open-sse/services/codeAssistSubscription.ts` (MIT).
 */
type JsonRecord = Record<string, unknown>

const LEGACY_TIER = 'legacy-tier'

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function tierField(tier: unknown, field: 'name' | 'id'): string | null {
  const value = toRecord(tier)[field]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isIneligible(subscription: JsonRecord): boolean {
  return Array.isArray(subscription.ineligibleTiers) && subscription.ineligibleTiers.length > 0
}

function defaultAllowedTier(subscription: JsonRecord): JsonRecord | null {
  if (!Array.isArray(subscription.allowedTiers)) return null
  return subscription.allowedTiers.map(toRecord).find(tier => tier.isDefault) ?? null
}

/** Para mostrar: el pagado, el actual si la cuenta es elegible, o el de por defecto marcado como restringido. */
export function codeAssistSubscriptionTier(subscriptionInfo: unknown): string | null {
  const subscription = toRecord(subscriptionInfo)
  if (Object.keys(subscription).length === 0) return null
  const paid = tierField(subscription.paidTier, 'name') || tierField(subscription.paidTier, 'id')
  if (paid) return paid
  if (!isIneligible(subscription)) return tierField(subscription.currentTier, 'name') || tierField(subscription.currentTier, 'id')
  const fallback = defaultAllowedTier(subscription)
  const label = fallback ? tierField(fallback, 'name') || tierField(fallback, 'id') : null
  return label ? `${label} (Restricted)` : null
}

/** Para `onboardUser`: pagado → actual si es elegible → el de por defecto → el actual → `legacy-tier`. */
export function codeAssistOnboardTierId(subscriptionInfo: unknown): string {
  const subscription = toRecord(subscriptionInfo)
  const eligibleCurrent = isIneligible(subscription) ? null : tierField(subscription.currentTier, 'id')
  const fallback = defaultAllowedTier(subscription)
  return (
    tierField(subscription.paidTier, 'id') ??
    eligibleCurrent ??
    (fallback ? tierField(fallback, 'id') : null) ??
    tierField(subscription.currentTier, 'id') ??
    LEGACY_TIER
  )
}
