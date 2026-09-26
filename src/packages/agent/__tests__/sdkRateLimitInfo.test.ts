/**
 * Contrato de `toSDKRateLimitInfo`: la conducta de `ka` en 2.1.281
 * (`chunk-049e548v.js`), extraída a
 * `.claude/workbench/rate-limit-info-port-20260925T205710/ka.js`.
 */
import { describe, expect, test } from 'bun:test'
import { toSDKRateLimitInfo } from '../messages/mappers.js'
import type { ClaudeAILimits } from '@thyrox/provider/claudeAiLimits.js'

const base: ClaudeAILimits = { status: 'allowed', unifiedRateLimitFallbackAvailable: false }

describe('toSDKRateLimitInfo', () => {
  test('sin límites devuelve undefined', () => {
    expect(toSDKRateLimitInfo(undefined)).toBeUndefined()
  })

  test('no emite los campos internos ni un type', () => {
    expect(toSDKRateLimitInfo(base)).toEqual({ status: 'allowed' })
  })

  test('org_spend_cap_reached se publica como org_level_disabled_until', () => {
    const out = toSDKRateLimitInfo({ ...base, overageDisabledReason: 'org_spend_cap_reached' })
    expect(out?.overageDisabledReason).toBe('org_level_disabled_until')
  })

  test('overageScope se publica como limitScope', () => {
    expect(toSDKRateLimitInfo({ ...base, overageScope: 'channel' })?.limitScope).toBe('channel')
  })

  test('overageInUse sólo sale si includeOverageInUse no lo apaga', () => {
    const limits = { ...base, overageInUse: true }
    expect(toSDKRateLimitInfo(limits)?.overageInUse).toBe(true)
    expect(toSDKRateLimitInfo(limits, { includeOverageInUse: false })?.overageInUse).toBeUndefined()
  })

  test('rateLimitGraceActive sólo sale cuando es true', () => {
    expect(toSDKRateLimitInfo({ ...base, rateLimitGraceActive: true })?.rateLimitGraceActive).toBe(true)
    expect('rateLimitGraceActive' in (toSDKRateLimitInfo({ ...base, rateLimitGraceActive: false }) ?? {}))
      .toBe(false)
  })

  test('los campos de crédito y periodo pasan tal cual', () => {
    const out = toSDKRateLimitInfo({
      ...base,
      overagePeriodMonthly: { utilization: 0.4 },
      overagePeriodChannel: { utilization: 0.1 },
      errorCode: 'credits_required',
      canUserPurchaseCredits: false,
      hasChargeableSavedPaymentMethod: true,
    })
    expect(out).toEqual({
      status: 'allowed',
      overagePeriodMonthly: { utilization: 0.4 },
      overagePeriodChannel: { utilization: 0.1 },
      errorCode: 'credits_required',
      canUserPurchaseCredits: false,
      hasChargeableSavedPaymentMethod: true,
    })
  })

  test('unifiedWindows viene de la opción, no de los límites', () => {
    const windows = { five_hour: { utilization: 0.2, resetsAt: 100 } }
    expect(toSDKRateLimitInfo(base, { unifiedWindows: windows })?.unifiedWindows).toEqual(windows)
  })
})
