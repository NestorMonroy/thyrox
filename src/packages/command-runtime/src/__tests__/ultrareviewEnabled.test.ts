/**
 * Porte de `ccnmt: packages/command-runtime/src/__tests__/ultrareviewEnabled.test.ts`.
 *
 * DIVERGENCIA DE ALCANCE: el `mock.module` de la fuente apunta a
 * `@claude-code-how-works/config/feature-flags`, ausente en este árbol.
 * Se sustituye por `../commands/review/featureFlags.ts` — ver la cabecera
 * de ese archivo y la de `../commands/review/ultrareviewEnabled.ts` (mismo
 * patrón que `@thyrox/agent/featureFlags.ts` para `agentSwarmsEnabled.ts`).
 * El resto del test —casos, datos, aserciones— es idéntico a la fuente.
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test'

const realFeatureFlags = await import('../commands/review/featureFlags.js')
let growthBookValue: unknown = null

mock.module('../commands/review/featureFlags.js', () => ({
  ...realFeatureFlags,
  getFeatureValue_CACHED_MAY_BE_STALE: <T>(_key: string, fallback: T) =>
    growthBookValue !== null ? (growthBookValue as T) : fallback,
}))

const { isUltrareviewEnabled } = await import(
  '../commands/review/ultrareviewEnabled.js'
)

beforeEach(() => {
  growthBookValue = null
})

describe('isUltrareviewEnabled', () => {
  test('returns false when GrowthBook value is null (default)', () => {
    growthBookValue = null
    expect(isUltrareviewEnabled()).toBe(false)
  })

  test('returns false when config has enabled=false', () => {
    growthBookValue = { enabled: false }
    expect(isUltrareviewEnabled()).toBe(false)
  })

  test('returns true when config has enabled=true', () => {
    growthBookValue = { enabled: true }
    expect(isUltrareviewEnabled()).toBe(true)
  })

  test('CRITICAL — checks enabled === true (NOT just truthy)', () => {
    // Strict equality on `=== true`. Refactor to truthy check would
    // accept "true" string, 1, etc.
    growthBookValue = { enabled: 'true' }
    expect(isUltrareviewEnabled()).toBe(false)

    growthBookValue = { enabled: 1 }
    expect(isUltrareviewEnabled()).toBe(false)

    growthBookValue = { enabled: 'yes' }
    expect(isUltrareviewEnabled()).toBe(false)
  })

  test('config without enabled field → false', () => {
    growthBookValue = { otherField: 'value' }
    expect(isUltrareviewEnabled()).toBe(false)
  })

  test('config with enabled=undefined → false', () => {
    growthBookValue = { enabled: undefined }
    expect(isUltrareviewEnabled()).toBe(false)
  })

  test('config with enabled=null → false', () => {
    growthBookValue = { enabled: null }
    expect(isUltrareviewEnabled()).toBe(false)
  })
})
