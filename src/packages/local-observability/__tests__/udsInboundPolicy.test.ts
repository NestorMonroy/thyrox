/**
 * La política de mensajes entrantes de otras sesiones y cuándo exige decidir
 * si un mensaje es propio: `I`, `B`, `O`, `f`, `zje`, `C`, `S` y `unr`
 * (`chunk-dv9ctjss.js`), `V1` y `NL` (`chunk-379zyrv7.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import { SettingsSchema } from '@thyrox/config/types'

import {
  currentPermissionMode,
  inboundPolicyOrigin,
  isBypassClassMode,
  needsSelfSentVerdict,
  PERMISSION_MODES,
  resolveInboundPolicy,
  type InboundPolicyReaders,
} from '../src/uds/inboundPolicy.ts'

function readers(values: Record<string, string | undefined>, overrides: Partial<InboundPolicyReaders> = {}): InboundPolicyReaders {
  return {
    isSourceEnabled: () => true,
    settingFor: source => values[source],
    hasInvalidSettingWarning: () => false,
    ...overrides,
  }
}

describe('crossSessionInbound en el esquema de settings', () => {
  test('acepta los tres niveles y convierte un valor inválido en ausente', () => {
    for (const value of ['accept', 'hold', 'refuse']) expect(SettingsSchema().parse({ crossSessionInbound: value }).crossSessionInbound).toBe(value)
    expect(SettingsSchema().parse({ crossSessionInbound: 'maybe' }).crossSessionInbound).toBeUndefined()
  })
})

describe('resolveInboundPolicy (I)', () => {
  test('sin nada declarado no hay valor ni quien decida', () => {
    expect(resolveInboundPolicy(readers({}))).toEqual({ value: undefined, decidedBy: undefined })
  })

  test('policy, flag y user: gana la primera que declara, en ese orden', () => {
    expect(resolveInboundPolicy(readers({ policySettings: 'accept', userSettings: 'refuse' }))).toEqual({ value: 'accept', decidedBy: 'policySettings' })
    expect(resolveInboundPolicy(readers({ flagSettings: 'hold', userSettings: 'refuse' }))).toEqual({ value: 'hold', decidedBy: 'flagSettings' })
    expect(resolveInboundPolicy(readers({ userSettings: 'refuse' }))).toEqual({ value: 'refuse', decidedBy: 'userSettings' })
  })

  test('una fuente deshabilitada no cuenta', () => {
    expect(resolveInboundPolicy(readers({ policySettings: 'refuse', userSettings: 'hold' }, { isSourceEnabled: source => source !== 'policySettings' }))).toEqual({
      value: 'hold',
      decidedBy: 'userSettings',
    })
  })

  test('los settings del repo sólo pueden endurecer, y entonces deciden ellos', () => {
    expect(resolveInboundPolicy(readers({ userSettings: 'accept', projectSettings: 'refuse' }))).toEqual({ value: 'refuse', decidedBy: 'repoSettings' })
    expect(resolveInboundPolicy(readers({ userSettings: 'refuse', localSettings: 'accept' }))).toEqual({ value: 'refuse', decidedBy: 'userSettings' })
    expect(resolveInboundPolicy(readers({ localSettings: 'hold' }))).toEqual({ value: 'hold', decidedBy: 'repoSettings' })
  })

  test('el repo que repite un nivel no permisivo se atribuye como repo, salvo frente a policy', () => {
    expect(resolveInboundPolicy(readers({ userSettings: 'hold', projectSettings: 'hold' }))).toEqual({ value: 'hold', decidedBy: 'repoSettings' })
    expect(resolveInboundPolicy(readers({ policySettings: 'hold', projectSettings: 'hold' }))).toEqual({ value: 'hold', decidedBy: 'policySettings' })
    expect(resolveInboundPolicy(readers({ userSettings: 'accept', projectSettings: 'accept' }))).toEqual({ value: 'accept', decidedBy: 'userSettings' })
  })

  test('un valor inválido en algún archivo retiene (hold) si nada decidió algo más estricto', () => {
    const invalid = { hasInvalidSettingWarning: () => true }
    expect(resolveInboundPolicy(readers({}, invalid))).toEqual({ value: 'hold', decidedBy: 'invalidSetting' })
    expect(resolveInboundPolicy(readers({ userSettings: 'accept' }, invalid))).toEqual({ value: 'hold', decidedBy: 'invalidSetting' })
    expect(resolveInboundPolicy(readers({ userSettings: 'refuse' }, invalid))).toEqual({ value: 'refuse', decidedBy: 'userSettings' })
  })
})

describe('inboundPolicyOrigin (O)', () => {
  test('nombra de dónde salió la decisión', () => {
    expect(inboundPolicyOrigin('policySettings')).toBe('managed-setting')
    expect(inboundPolicyOrigin('repoSettings')).toBe('repo-setting')
    expect(inboundPolicyOrigin('invalidSetting')).toBe('invalid-setting')
    expect(inboundPolicyOrigin('flagSettings')).toBe('explicit-setting')
    expect(inboundPolicyOrigin('userSettings')).toBe('explicit-setting')
    expect(inboundPolicyOrigin(undefined)).toBe('explicit-setting')
  })
})

describe('modo de permisos: C, S, V1 y unr', () => {
  test('los modos conocidos son los de la referencia', () => {
    expect([...PERMISSION_MODES]).toEqual(['acceptEdits', 'auto', 'bypassPermissions', 'default', 'dontAsk', 'plan'])
  })

  test('sin getter cableado, o si lanza, no hay modo y se registra', () => {
    const logs: string[] = []
    expect(currentPermissionMode(null, message => void logs.push(message))).toBeNull()
    expect(currentPermissionMode(() => { throw new Error('boom') }, message => void logs.push(message))).toBeNull()
    expect(logs[0]).toContain('permission-mode getter not wired')
    expect(logs[1]).toContain('mode getter threw (boom;')
  })

  test('bypass es bypassPermissions, o plan con bypass disponible en una sesión interactiva', () => {
    expect(isBypassClassMode({ mode: 'bypassPermissions' }, false)).toBe(true)
    expect(isBypassClassMode({ mode: 'plan', isBypassPermissionsModeAvailable: true }, false)).toBe(true)
    expect(isBypassClassMode({ mode: 'plan', isBypassPermissionsModeAvailable: true }, true)).toBe(false)
    expect(isBypassClassMode({ mode: 'plan', isBypassPermissionsModeAvailable: false }, false)).toBe(false)
    expect(isBypassClassMode({ mode: 'default' }, false)).toBe(false)
  })

  test('unr: sólo sin política declarada, con un modo conocido de clase bypass', () => {
    const base = { nonInteractive: false, log: () => {} }
    expect(needsSelfSentVerdict({ ...base, policyValue: undefined, getCurrentMode: () => ({ mode: 'bypassPermissions' }) })).toBe(true)
    expect(needsSelfSentVerdict({ ...base, policyValue: 'accept', getCurrentMode: () => ({ mode: 'bypassPermissions' }) })).toBe(false)
    expect(needsSelfSentVerdict({ ...base, policyValue: undefined, getCurrentMode: () => ({ mode: 'default' }) })).toBe(false)
    expect(needsSelfSentVerdict({ ...base, policyValue: undefined, getCurrentMode: () => ({ mode: 'inventado' }) })).toBe(false)
    expect(needsSelfSentVerdict({ ...base, policyValue: undefined, getCurrentMode: null })).toBe(false)
  })
})
