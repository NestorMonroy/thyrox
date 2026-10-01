/**
 * Por qué el modo rápido no está disponible, según 2.1.283
 * (`chunk-t6pwageh.js`): `gL` decide la causa, `aC` la redacta, `$g` y `Wg`
 * redactan las que vienen del servidor, y `D5`/`Bk` las combinan.
 */
import { describe, expect, test } from 'bun:test'

import {
  describeFastModeDisabledReason,
  describeFastModeUnavailability,
  extraUsageDisabledMessage,
  fastModeUnavailabilityCause,
  fastModeUnavailableMessage,
  isFastModeAvailableFor,
  type FastModeAvailabilityContext,
} from '../fastModeAvailability.js'

function context(overrides: Partial<FastModeAvailabilityContext> = {}): FastModeAvailabilityContext {
  return {
    apiProvider: 'firstParty',
    fastModeEnabled: true,
    penguinsOffMessage: null,
    isModelAllowed: () => true,
    fastModeModel: 'opus',
    resolveModel: model => (model === undefined ? 'main-loop' : (model ?? 'default-setting')),
    hasRemoteControlChannel: false,
    supportsFastMode: () => true,
    flagSettingsFastMode: undefined,
    policyFastMode: undefined,
    policyPerSessionOptIn: undefined,
    sdkOptInRequired: false,
    orgStatus: { status: 'enabled' },
    skipOrgCheckEnv: false,
    skipNetworkErrorsEnv: false,
    remoteManaged: false,
    authType: 'oauth',
    fastModeModelDisplay: 'Opus',
    usageCreditsLink: undefined,
    usageCreditsInstruction: undefined,
    ...overrides,
  }
}

describe('fastModeUnavailabilityCause (gL)', () => {
  test('disponible devuelve null', () => {
    expect(fastModeUnavailabilityCause(undefined, {}, context())).toBeNull()
  })

  test('apagado: fuera de primera parte o por el entorno', () => {
    expect(fastModeUnavailabilityCause(undefined, {}, context({ fastModeEnabled: false, apiProvider: 'bedrock' }))).toBe('not_first_party')
    expect(fastModeUnavailabilityCause(undefined, {}, context({ fastModeEnabled: false }))).toBe('disabled_by_env')
  })

  test('la bandera de apagado gana sobre todo lo que sigue', () => {
    expect(fastModeUnavailabilityCause(undefined, {}, context({ penguinsOffMessage: 'x', orgStatus: { status: 'pending' } }))).toBe('unknown')
  })

  test('modelo no permitido: sólo si el modelo del modo rápido no lo está', () => {
    const asked: unknown[] = []
    const denyOpus = context({ isModelAllowed: model => (asked.push(model), model !== 'opus'), supportsFastMode: () => true })
    expect(fastModeUnavailabilityCause(undefined, {}, denyOpus)).toBeNull()
    expect(asked).toEqual(['opus', 'main-loop'])
    expect(fastModeUnavailabilityCause(null, {}, context({ isModelAllowed: model => model !== 'opus', resolveModel: m => (m === null ? 'default-setting' : 'x') }))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, {}, context({ isModelAllowed: () => false }))).toBe('model_not_allowed')
    expect(fastModeUnavailabilityCause(undefined, {}, context({ isModelAllowed: m => m !== 'opus', supportsFastMode: () => false }))).toBe('model_not_allowed')
    expect(fastModeUnavailabilityCause(undefined, {}, context({ isModelAllowed: m => m !== 'opus', hasRemoteControlChannel: true }))).toBe('model_not_allowed')
  })

  test('el modelo que se consulta es el pedido: null es el de la configuración, undefined el del bucle', () => {
    const seen: unknown[] = []
    const ctx = context({ isModelAllowed: m => m !== 'opus', supportsFastMode: m => (seen.push(m), true) })
    fastModeUnavailabilityCause('pedido', {}, ctx)
    fastModeUnavailabilityCause(null, {}, ctx)
    fastModeUnavailabilityCause(undefined, {}, ctx)
    expect(seen).toEqual(['pedido', 'default-setting', 'main-loop'])
  })

  test('la política de la organización', () => {
    expect(fastModeUnavailabilityCause(undefined, {}, context({ policyFastMode: false }))).toBe('preference')
    expect(fastModeUnavailabilityCause(undefined, {}, context({ policyPerSessionOptIn: true }))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, { sessionOptIn: true }, context({ policyPerSessionOptIn: true }))).toBe('preference')
    expect(fastModeUnavailabilityCause(undefined, { sessionOnly: true }, context({ policyPerSessionOptIn: true }))).toBe('preference')
  })

  test('el SDK exige optar por la bandera o por la sesión', () => {
    expect(fastModeUnavailabilityCause(undefined, {}, context({ sdkOptInRequired: true }))).toBe('sdk_opt_in_required')
    expect(fastModeUnavailabilityCause(undefined, { sessionOptIn: true }, context({ sdkOptInRequired: true }))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, {}, context({ sdkOptInRequired: true, flagSettingsFastMode: true }))).toBeNull()
  })

  test('estado pendiente: salvo que se salte la comprobación o se haya optado fuera de lo remoto', () => {
    const pending = { orgStatus: { status: 'pending' } as const }
    expect(fastModeUnavailabilityCause(undefined, {}, context(pending))).toBe('pending')
    expect(fastModeUnavailabilityCause(undefined, {}, context({ ...pending, skipOrgCheckEnv: true }))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, {}, context({ ...pending, skipOrgCheckEnv: true, remoteManaged: true }))).toBe('pending')
    expect(fastModeUnavailabilityCause(undefined, { sessionOptIn: true }, context(pending))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, { sessionOptIn: true }, context({ ...pending, remoteManaged: true }))).toBe('pending')
  })

  test('deshabilitado por la organización', () => {
    const disabled = (reason: 'free' | 'network_error' | 'unknown', source?: 'server') =>
      ({ orgStatus: { status: 'disabled', reason, ...(source && { source }) } as const })
    expect(fastModeUnavailabilityCause(undefined, {}, context(disabled('free')))).toBe('free')
    expect(fastModeUnavailabilityCause(undefined, {}, context({ ...disabled('free'), skipOrgCheckEnv: true }))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, {}, context({ ...disabled('free', 'server'), skipOrgCheckEnv: true }))).toBe('free')
    expect(fastModeUnavailabilityCause(undefined, {}, context(disabled('network_error')))).toBe('network_error')
    expect(fastModeUnavailabilityCause(undefined, {}, context({ ...disabled('network_error'), skipNetworkErrorsEnv: true }))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, {}, context({ ...disabled('unknown'), skipNetworkErrorsEnv: true, remoteManaged: true }))).toBe('unknown')
    expect(fastModeUnavailabilityCause(undefined, { sessionOptIn: true }, context(disabled('unknown')))).toBeNull()
    expect(fastModeUnavailabilityCause(undefined, { sessionOptIn: true }, context(disabled('free')))).toBe('free')
  })
})

describe('los mensajes ($g, Wg, aC)', () => {
  test('describeFastModeDisabledReason ($g)', () => {
    const ctx = context()
    expect(describeFastModeDisabledReason('free', 'oauth', ctx)).toBe('Fast mode requires a paid subscription')
    expect(describeFastModeDisabledReason('free', 'api-key', ctx)).toBe('Fast mode unavailable during evaluation. Please purchase credits.')
    expect(describeFastModeDisabledReason('preference', 'oauth', ctx)).toBe('Fast mode has been disabled by your organization')
    expect(describeFastModeDisabledReason('network_error', 'oauth', ctx)).toBe('Fast mode unavailable due to network connectivity issues')
    expect(describeFastModeDisabledReason('unknown', 'oauth', ctx)).toBe('Fast mode is currently unavailable')
    expect(describeFastModeDisabledReason('extra_usage_disabled', 'oauth', ctx)).toBe('Fast mode requires usage credits')
    expect(describeFastModeDisabledReason('extra_usage_disabled', 'oauth', context({ usageCreditsInstruction: 'I' }))).toBe('Fast mode requires usage credits · I')
  })

  test('extraUsageDisabledMessage (Wg): el enlace gana a la instrucción', () => {
    expect(extraUsageDisabledMessage(context({ usageCreditsLink: 'L', usageCreditsInstruction: 'I' }))).toBe('Fast mode requires usage credits · L to turn them on')
    expect(extraUsageDisabledMessage(context({ usageCreditsInstruction: 'I' }))).toBe('Fast mode requires usage credits · I')
  })

  test('describeFastModeUnavailability (aC)', () => {
    const ctx = context({ fastModeModelDisplay: 'Opus 5', authType: 'api-key' })
    expect(describeFastModeUnavailability('not_first_party', ctx)).toBe('Fast mode is only available when using the Anthropic API directly')
    expect(describeFastModeUnavailability('disabled_by_env', ctx)).toBe('Fast mode is not available')
    expect(describeFastModeUnavailability('model_not_allowed', ctx)).toBe("Opus 5 is not in your organization's allowed models")
    expect(describeFastModeUnavailability('sdk_opt_in_required', ctx)).toBe('Fast mode is not available in the Agent SDK')
    expect(describeFastModeUnavailability('pending', ctx)).toBe('Checking fast mode availability')
    expect(describeFastModeUnavailability('unknown', ctx)).toBe('Fast mode is currently unavailable')
    expect(describeFastModeUnavailability('unknown', context({ penguinsOffMessage: 'apagado' }))).toBe('apagado')
    expect(describeFastModeUnavailability('free', ctx)).toBe('Fast mode unavailable during evaluation. Please purchase credits.')
  })
})

describe('fastModeUnavailableMessage (D5) e isFastModeAvailableFor (Bk)', () => {
  test('null si está disponible; si no, el mensaje, y se registra', () => {
    const logged: string[] = []
    expect(fastModeUnavailableMessage(undefined, {}, context(), line => void logged.push(line))).toBeNull()
    expect(fastModeUnavailableMessage(undefined, {}, context({ orgStatus: { status: 'pending' } }), line => void logged.push(line))).toBe('Checking fast mode availability')
    expect(logged).toEqual(['Fast mode unavailable: Checking fast mode availability'])
  })

  test('Bk exige el modo rápido habilitado y ninguna causa', () => {
    expect(isFastModeAvailableFor(undefined, context())).toBe(true)
    expect(isFastModeAvailableFor(undefined, context({ policyFastMode: false }))).toBe(false)
    expect(isFastModeAvailableFor(undefined, context({ fastModeEnabled: false }))).toBe(false)
  })
})
