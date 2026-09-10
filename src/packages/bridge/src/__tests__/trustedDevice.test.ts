/**
 * Puerto fiel de
 * `ccnmt: packages/bridge/src/__tests__/trustedDevice.test.ts`
 * (222 líneas fuente, 100% portado).
 *
 * ADAPTACIÓN de mocks: la fuente usa `mock.module()` sobre tres módulos
 * reales de ccnmt (`config/feature-flags`, `provider/policyLimits`,
 * `storage/secureStorage.js`). Aquí esos tres símbolos son puntos de
 * inyección de `../internal/pendingCrossPackageDeps.js`
 * (`setGetFeatureValueCachedMayBeStaleFn`, `setIsPolicyAllowedFn`,
 * `setWaitForPolicyLimitsToLoadFn`, `setGetSecureStorageFn`), así que el
 * test los reemplaza llamando esos setters en vez de `mock.module()`.
 * `checkGate_CACHED_OR_BLOCKING` delega en
 * `getFeatureValue_CACHED_MAY_BE_STALE` en el propio sustituto
 * (`pendingCrossPackageDeps.ts` — verbatim de la misma relación en
 * `@thyrox/config: feature-flags.ts:183`), así que un solo setter de
 * banderas cubre ambas funciones — no hace falta el truco de
 * `await import()` diferido que la fuente usa para esperar a que
 * `mock.module()` surta efecto antes de importar `trustedDevice.js`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  setGetFeatureValueCachedMayBeStaleFn,
  setGetSecureStorageFn,
  setIsPolicyAllowedFn,
  setWaitForPolicyLimitsToLoadFn,
  type SecureStorage,
  type SecureStorageData,
} from '../internal/pendingCrossPackageDeps.js'
import {
  clearTrustedDeviceToken,
  clearTrustedDeviceTokenCache,
  getTrustedDeviceToken,
  getTrustedDeviceUnenrolledReason,
  isTrustedDeviceUnenrolled,
  PROACTIVE_ENROLLMENT_DISABLED_MESSAGE,
  TRUSTED_DEVICE_UNENROLLED_MESSAGE,
} from '../trustedDevice.js'

type GateMap = Record<string, boolean>
const flagState: { gates: GateMap; policy: Record<string, boolean> } = {
  gates: {},
  policy: {},
}

setGetFeatureValueCachedMayBeStaleFn(
  <T>(name: string, fallback: T): T =>
    (flagState.gates[name] as unknown as T) ?? fallback,
)
setIsPolicyAllowedFn((name: string): boolean => flagState.policy[name] ?? true) // fail-open, igual que ant
setWaitForPolicyLimitsToLoadFn(async () => {})

// ---- secureStorage falso, para que el test no toque el keychain real ----
const storageState: { data: SecureStorageData | null } = { data: {} }

const fakeSecureStorage: SecureStorage = {
  read: () =>
    storageState.data === null ? null : { ...storageState.data },
  update: (data: SecureStorageData) => {
    storageState.data = { ...data }
    return { success: true }
  },
}
setGetSecureStorageFn(() => fakeSecureStorage)

const GATE = 'tengu_sessions_elevated_auth_enforcement'
const PROACTIVE_DISABLE_GATE =
  'tengu_sessions_elevated_auth_disable_proactive_enrollment'
const POLICY = 'require_trusted_devices'

beforeEach(() => {
  flagState.gates = {}
  flagState.policy = {}
  storageState.data = {}
  delete process.env.CLAUDE_TRUSTED_DEVICE_TOKEN
  clearTrustedDeviceTokenCache()
})

afterEach(() => {
  delete process.env.CLAUDE_TRUSTED_DEVICE_TOKEN
})

describe('isTrustedDeviceGateEnabled (ant wgH)', () => {
  test('returns false when GrowthBook gate is off, regardless of policy', () => {
    flagState.gates[GATE] = false
    flagState.policy[POLICY] = true
    storageState.data = { trustedDeviceToken: 'x' }
    expect(getTrustedDeviceToken()).toBeUndefined()
  })

  test('returns false when gate is on but org policy denies', () => {
    flagState.gates[GATE] = true
    flagState.policy[POLICY] = false
    storageState.data = { trustedDeviceToken: 'x' }
    expect(getTrustedDeviceToken()).toBeUndefined()
  })

  test('returns token when both gate AND policy are on', () => {
    flagState.gates[GATE] = true
    flagState.policy[POLICY] = true
    storageState.data = { trustedDeviceToken: 'x' }
    expect(getTrustedDeviceToken()).toBe('x')
  })

  test('policy absent (undefined) defaults to allow (fail-open)', () => {
    flagState.gates[GATE] = true
    // política NO fijada → isPolicyAllowed devuelve true por convención ant
    storageState.data = { trustedDeviceToken: 'x' }
    expect(getTrustedDeviceToken()).toBe('x')
  })
})

describe('readStoredTrustedDeviceToken — env-var precedence', () => {
  test('CLAUDE_TRUSTED_DEVICE_TOKEN env var shadows keychain', () => {
    flagState.gates[GATE] = true
    storageState.data = { trustedDeviceToken: 'from-keychain' }
    process.env.CLAUDE_TRUSTED_DEVICE_TOKEN = 'from-env'
    clearTrustedDeviceTokenCache()
    expect(getTrustedDeviceToken()).toBe('from-env')
  })
})

describe('isTrustedDeviceUnenrolled (ant t66)', () => {
  test('returns false when gate is off (no enforcement applies)', () => {
    flagState.gates[GATE] = false
    expect(isTrustedDeviceUnenrolled()).toBe(false)
  })

  test('returns false when gate is on AND token present', () => {
    flagState.gates[GATE] = true
    storageState.data = { trustedDeviceToken: 'x' }
    expect(isTrustedDeviceUnenrolled()).toBe(false)
  })

  test('returns true when gate is on AND token absent', () => {
    flagState.gates[GATE] = true
    storageState.data = {}
    expect(isTrustedDeviceUnenrolled()).toBe(true)
  })
})

describe('getTrustedDeviceUnenrolledReason (ant U$5)', () => {
  test('returns null when gate is off', () => {
    flagState.gates[GATE] = false
    expect(getTrustedDeviceUnenrolledReason()).toBeNull()
  })

  test('returns null when device is enrolled', () => {
    flagState.gates[GATE] = true
    storageState.data = { trustedDeviceToken: 'x' }
    expect(getTrustedDeviceUnenrolledReason()).toBeNull()
  })

  test('returns proactive-disabled message when kill-switch is on', () => {
    flagState.gates[GATE] = true
    flagState.gates[PROACTIVE_DISABLE_GATE] = true
    storageState.data = {}
    expect(getTrustedDeviceUnenrolledReason()).toBe(
      PROACTIVE_ENROLLMENT_DISABLED_MESSAGE,
    )
  })

  test('returns standard message when no kill-switch', () => {
    flagState.gates[GATE] = true
    storageState.data = {}
    expect(getTrustedDeviceUnenrolledReason()).toBe(
      TRUSTED_DEVICE_UNENROLLED_MESSAGE,
    )
  })
})

describe('clearTrustedDeviceToken (ant kJ8) — kill-switch override', () => {
  test('SKIPS clearing when proactive disable gate is ON (outage guard)', () => {
    // Éste es el invariante crítico de ant: durante una caída del
    // enrolamiento, NO se debe limpiar un token existente, porque el
    // usuario no tiene forma de re-enrolar hasta que la caída termine.
    // La implementación vieja de ccb chequeaba la condición equivocada
    // y podía destruir tokens en este escenario.
    flagState.gates[PROACTIVE_DISABLE_GATE] = true
    storageState.data = { trustedDeviceToken: 'preserve-me' }
    clearTrustedDeviceToken()
    expect(storageState.data?.trustedDeviceToken).toBe('preserve-me')
  })

  test('clears token when kill-switch is off', () => {
    flagState.gates[PROACTIVE_DISABLE_GATE] = false
    storageState.data = {
      trustedDeviceToken: 'remove-me',
      other: 'preserve',
    }
    clearTrustedDeviceToken()
    expect(storageState.data?.trustedDeviceToken).toBeUndefined()
    expect(storageState.data?.other).toBe('preserve')
  })

  test('no-op when storage is unavailable (read returns null)', () => {
    storageState.data = null
    expect(() => clearTrustedDeviceToken()).not.toThrow()
  })

  test('does NOT key off the GrowthBook gate (clearing must work even when off)', () => {
    // ant kJ8 evita explícitamente gatear la limpieza por `wgH` — si el
    // gate pasó de on→off entre sesiones, igual hace falta limpiar el
    // token obsoleto del keychain.
    flagState.gates[GATE] = false
    storageState.data = { trustedDeviceToken: 'stale' }
    clearTrustedDeviceToken()
    expect(storageState.data?.trustedDeviceToken).toBeUndefined()
  })
})
