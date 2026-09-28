/**
 * La fusión de los escalones administrados de `policySettings` — porte de
 * `jy`, `_d`, `ks`, `Wy`, `xd`, `Md` y `S6` de `chunk-379zyrv7.js` en el
 * ejecutable 2.1.283 (extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/symbol-UP-level4.txt`).
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const M = (await import(
  process.env.POLICY_MERGE_MODULE ?? '../settings/policyMerge.ts'
)) as typeof import('../settings/policyMerge.ts')

describe('el valor más restrictivo de cada clave (_d)', () => {
  test('un booleano restrictivo gana si algún escalón lo pone', () => {
    const target: Record<string, unknown> = { disableAllHooks: false }
    M.applyMostRestrictive(target, [{ disableAllHooks: false }, { disableAllHooks: true }])
    expect(target.disableAllHooks).toBe(true)
  })
  test('en una clave cuyo valor restrictivo es false, gana false', () => {
    const target: Record<string, unknown> = { enableWorkflows: true }
    M.applyMostRestrictive(target, [{ enableWorkflows: true }, { enableWorkflows: false }])
    expect(target.enableWorkflows).toBe(false)
  })
  test('en una escala gana el valor más bajo de la escala', () => {
    const target: Record<string, unknown> = {}
    M.applyMostRestrictive(target, [{ maxEffortLevel: 'high' }, { maxEffortLevel: 'medium' }, { maxEffortLevel: 'max' }])
    expect(target.maxEffortLevel).toBe('medium')
  })
  test('las rutas anidadas también', () => {
    const target: Record<string, unknown> = {}
    M.applyMostRestrictive(target, [{}, { sandbox: { network: { allowManagedDomainsOnly: true } } }])
    expect(target).toEqual({ sandbox: { network: { allowManagedDomainsOnly: true } } })
  })
  test('sin valor restrictivo, lo que el primer escalón no escribe se retira', () => {
    const target: Record<string, unknown> = { disableAllHooks: false, model: 'm' }
    M.applyMostRestrictive(target, [{}, { disableAllHooks: false }])
    expect(target).toEqual({ model: 'm' })
    const kept: Record<string, unknown> = { disableAllHooks: false }
    M.applyMostRestrictive(kept, [{ disableAllHooks: false }])
    expect(kept).toEqual({ disableAllHooks: false })
  })
  test('las listas de strictPluginOnlyCustomization se unen', () => {
    const target: Record<string, unknown> = { strictPluginOnlyCustomization: ['a'] }
    M.applyMostRestrictive(target, [{ strictPluginOnlyCustomization: ['a'] }, { strictPluginOnlyCustomization: ['b', 'a'] }])
    expect(target.strictPluginOnlyCustomization).toEqual(['a', 'b'])
  })
  test('sin listas se retira salvo que el primer escalón la declare', () => {
    const target: Record<string, unknown> = { strictPluginOnlyCustomization: [] }
    M.applyMostRestrictive(target, [{}, {}])
    expect('strictPluginOnlyCustomization' in target).toBe(false)
  })
  test('true en strictPluginOnlyCustomization no se toca', () => {
    const target: Record<string, unknown> = { strictPluginOnlyCustomization: true }
    M.applyMostRestrictive(target, [{ strictPluginOnlyCustomization: true }, { strictPluginOnlyCustomization: ['b'] }])
    expect(target.strictPluginOnlyCustomization).toBe(true)
  })
})

describe('cómo se funde un valor (S6, Md, xd, ks, Wy)', () => {
  test('S6: modelPicker se copia; fallbackModel se reemplaza; las listas se unen', () => {
    const picker = { options: [{ id: 'a' }] }
    const merged = M.mergeManagedValue(undefined, picker, 'modelPicker') as typeof picker
    expect(merged).toEqual(picker)
    expect(merged.options[0]).not.toBe(picker.options[0])
    expect(M.mergeManagedValue(['a'], ['b'], 'fallbackModel')).toEqual(['b'])
    expect(M.mergeManagedValue(['a', 'b'], ['b', 'c'], 'x')).toEqual(['a', 'b', 'c'])
    expect(M.mergeManagedValue({ a: 1 }, { b: 2 }, 'managedMcpServers')).toEqual({ a: 1, b: 2 })
    expect(M.mergeManagedValue({ a: 1 }, { b: 2 }, 'extraKnownMarketplaces')).toEqual({ a: 1, b: 2 })
    expect(M.mergeManagedValue({ a: 1 }, { b: 2 }, 'other')).toBeUndefined()
  })
  test('Md: entre escalones la lista del que se funde va primero', () => {
    expect(M.mergeTierValue(['a', 'b'], ['b', 'c'], 'x')).toEqual(['b', 'c', 'a'])
    expect(M.mergeTierValue(['a'], ['b'], 'fallbackModel')).toEqual(['b'])
  })
  test('xd: una lista de permitidos se reemplaza entera, sin compartirla', () => {
    const list = ['m']
    const replaced = M.mergeTierValue(['n'], list, 'availableModels') as string[]
    expect(replaced).toEqual(['m'])
    expect(replaced).not.toBe(list)
    expect(M.mergeTierValue(['n'], undefined, 'availableModels')).toEqual(['n'])
    const map = { a: [1] }
    const copied = M.mergeTierValue({ b: [2] }, map, 'allowedMcpServers') as { a: number[] }
    expect(copied).toEqual({ a: [1] })
    expect(copied.a).not.toBe(map.a)
  })
  test('awsPairs se reemplaza, suprimiendo las variables AWS que sólo nombraba el de abajo', () => {
    const below = [{ accessKeyIdVar: 'AWS_ACCESS_KEY_ID' }]
    const above = [{ accessKeyIdVar: 'MY_KEY' }]
    expect(M.mergeTierValue(below, above, 'awsPairs')).toEqual([
      { accessKeyIdVar: 'MY_KEY' },
      { accessKeyIdVar: 'AWS_ACCESS_KEY_ID', secretAccessKeyVar: '_PARENT_PAIR_SUPPRESSOR_1_' },
    ])
  })
  test('ks reemplaza también awsPairs y ripgrep; Wy no', () => {
    expect(M.mergeTierValue(['a'], ['b'], 'ripgrep')).toEqual(['b'])
    expect(M.mergeSlotValue(['a'], ['b'], 'ripgrep')).toEqual(['b', 'a'])
    expect(M.mergeSlotValue(['a'], ['b'], 'availableModels')).toEqual(['b'])
  })
})

describe('la fusión de escalones (jy)', () => {
  test('sin escalones no hay administrador', () => {
    expect(M.mergeAdminTiers([], undefined, false, 0, 'linux')).toEqual({ admin: null, merged: false })
  })
  test('un escalón solo es el administrador, sin su clave de modo', () => {
    const tier = { model: 'a', managedSourcesBehavior: 'first-wins' }
    expect(M.mergeAdminTiers([tier], undefined, false, 0, 'linux')).toEqual({ admin: { model: 'a' }, merged: false })
    const plain = { model: 'a' }
    expect(M.mergeAdminTiers([plain], undefined, false, 0, 'linux').admin).toBe(plain)
  })
  test('sin fusión, el primero gana pero toma lo más restrictivo de los extra', () => {
    const result = M.mergeAdminTiers([{ model: 'a' }, { disableAllHooks: true, model: 'b' }], 'first-wins', false, 1, 'linux')
    expect(result).toEqual({ admin: { model: 'a', disableAllHooks: true }, merged: false })
  })
  test('con fusión, el superior gana y las listas se unen desde abajo', () => {
    const result = M.mergeAdminTiers(
      [{ model: 'a', permissions: { allow: ['Read'] } }, { model: 'b', permissions: { allow: ['Edit'] }, disableAllHooks: true }],
      'merge', false, 0, 'linux',
    )
    expect(result.merged).toBe(true)
    expect(result.admin).toEqual({ model: 'a', permissions: { allow: ['Read', 'Edit'] }, disableAllHooks: true })
  })
  test('con fusión, el superior no afloja una restricción de abajo', () => {
    const result = M.mergeAdminTiers([{ disableAllHooks: false }, { disableAllHooks: true }], 'merge', false, 0, 'linux')
    expect(result.admin).toEqual({ disableAllHooks: true })
  })
  test('las claves que sólo lee el escalón superior no suben desde abajo', () => {
    const result = M.mergeAdminTiers([{ model: 'a' }, { apiKeyHelper: 'x', env: { A: '1' }, forceLoginMethod: 'sso' }], 'merge', false, 0, 'linux')
    expect(result.admin).toEqual({ model: 'a' })
  })
  test('con la instantánea primero, el escalón bajo el superior conserva sus claves', () => {
    const result = M.mergeAdminTiers([{ model: 'a' }, { env: { A: '1' } }], 'merge', true, 0, 'linux')
    expect(result.admin).toEqual({ model: 'a', env: { A: '1' } })
  })
  test('defaultMode y replaceBuiltInOptions no suben desde abajo', () => {
    const result = M.mergeAdminTiers([{}, { permissions: { defaultMode: 'plan', allow: ['Read'] }, modelPicker: { replaceBuiltInOptions: true } }], 'merge', false, 0, 'linux')
    expect(result.admin).toEqual({ permissions: { allow: ['Read'] } })
  })
  test('un sandbox de otra plataforma se descarta; el de esta pierde su lista', () => {
    const other = M.mergeAdminTiers([{}, { sandbox: { enabled: true, enabledPlatforms: ['macos'] } }], 'merge', false, 0, 'linux')
    expect(other.admin).toEqual({})
    const here = M.mergeAdminTiers([{}, { sandbox: { enabled: true, enabledPlatforms: ['linux'] } }], 'merge', false, 0, 'linux')
    expect(here.admin).toEqual({ sandbox: { enabled: true } })
  })
  test('con fusión, modelOverrides se hereda según availableModels', () => {
    const result = M.mergeAdminTiers([{ availableModels: ['a'] }, { modelOverrides: { a: 'b' } }], 'merge', false, 0, 'linux')
    expect(result.admin).toEqual({ availableModels: ['a'] })
  })
})
