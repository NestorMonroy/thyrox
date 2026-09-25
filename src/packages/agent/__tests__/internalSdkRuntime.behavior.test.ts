import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Source-level pins for `internal/sdkRuntime.ts` — 6 facades that feed
 * the SDK result envelope (errors / duration / cost / model usage).
 *
 * Critical invariants:
 *  1. getTotalCost / getTotalAPIDuration default to 0 (NUMERIC zero, not
 *     null/undefined). The result envelope multiplies these.
 *  2. categorizeRetryableAPIError ECHOES the input when no host has a
 *     classifier — caller still has the original error to surface, no
 *     swallowing.
 *  3. getFastModeState falls back to null (NOT undefined). Caller checks
 *     `=== null` explicitly to distinguish "off" from "not configured".
 *  4. getInMemoryErrors fallback is [] (so callers can iterate safely).
 *  5. getModelUsage fallback is {} (caller spreads into a result).
 */
describe('internal/sdkRuntime fallbacks', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'sdkRuntime.ts'),
    'utf-8',
  )

  test('getInMemoryErrors: no host → [] (NOT undefined)', () => {
    expect(source).toMatch(/getInMemoryErrors\?\.\(\) \?\? \[\]/)
  })

  test('categorizeRetryableAPIError: no host → unknown', () => {
    // Pin: the result lands in the `error` field of an `api_retry` SDK
    // message, whose schema is the SDKAssistantMessageError enum. Echoing
    // the raw error object (the previous fallback) broke that schema;
    // 'unknown' is the value X5t of 2.1.281 returns when nothing matches.
    expect(source).toMatch(
      /categorizeRetryableAPIError\?\.\(error\) \?\? 'unknown'/,
    )
  })

  test('getTotalAPIDuration: no host → 0', () => {
    expect(source).toMatch(/getTotalAPIDuration\?\.\(\) \?\? 0/)
  })

  test('getTotalCost: no host → 0', () => {
    // Pin: numeric zero. SDK consumers multiply / add this; null would
    // crash arithmetic.
    expect(source).toMatch(/getTotalCost\?\.\(\) \?\? 0/)
  })

  test('getModelUsage: no host → {} (NOT undefined)', () => {
    // Pin: caller spreads with `{ ...result, model_usage: getModelUsage()
    // }`. {} is the safe default.
    expect(source).toMatch(/getModelUsage\?\.\(\) \?\? \{\}/)
  })

  test('getFastModeState: no host → off', () => {
    // Pin: every caller assigns the result to an optional
    // `fast_mode_state`, whose schema is 'off' | 'cooldown' | 'on' — null
    // is not a member, and no caller compares against null. Without a
    // provider fast mode is not active, which is 'off'.
    expect(source).toMatch(
      /getFastModeState\?\.\(model, fastMode\) \?\? 'off'/,
    )
  })

  test('getFastModeState passes both args (model, fastMode)', () => {
    expect(source).toMatch(
      /getFastModeState\?\.\(model, fastMode\)/,
    )
  })

  test('all 6 facades are exported', () => {
    const exports = source.match(/^export function /gm)
    expect(exports?.length).toBe(6)
  })
})
