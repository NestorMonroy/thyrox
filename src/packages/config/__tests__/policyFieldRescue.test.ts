/**
 * El rescate de política campo a campo — porte de `os` (`chunk-379zyrv7.js`,
 * ejecutable 2.1.283; extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`). `os` valida
 * TODO el documento de una vez: un campo inválido invalidaba el documento
 * entero. Este módulo valida campo a campo: un campo inválido se descarta o,
 * si es una de las claves restrictivas de `Zo` (aquí, `restrictiveGates`,
 * derivada de `RESTRICTIVE_SETTINGS` — el porte ya existente de `Qe` en
 * `policyMerge.ts`), se sustituye por su valor restrictivo.
 */
import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import * as R from '../settings/policyFieldRescue.ts'

describe('las puertas restrictivas (Zo, derivadas de Qe)', () => {
  test('sólo incluye claves de un solo nivel presentes en el esquema, sin las gestionadas aparte', () => {
    const keys = R.restrictiveGates().map(gate => gate.key)
    expect(keys).toContain('allowManagedHooksOnly')
    expect(keys).toContain('allowManagedMcpServersOnly')
    expect(keys).toContain('allowManagedPermissionRulesOnly')
    expect(keys).toContain('disableAutoMode')
    // Gestionadas aparte en el binario: fuera de Zo() aunque estén en hn().
    expect(keys).not.toContain('strictPluginOnlyCustomization')
    expect(keys).not.toContain('disableAllHooks')
    // De Qe pero no declarada en nuestro SettingsSchema: no puede aparecer.
    expect(keys).not.toContain('enforceAvailableModels')
  })
})

describe('rescueField: un campo, su esquema y la tabla de puertas', () => {
  test('un valor válido no produce ningún aviso', () => {
    const result = R.rescueField('model', 'claude-sonnet-5', z.string())
    expect(result).toEqual({ value: 'claude-sonnet-5' })
  })

  test('un campo inválido sin puerta se descarta y queda rescatado', () => {
    const result = R.rescueField('maxTurns', 'nope', z.number().int().positive())
    expect(result.value).toBeUndefined()
    expect(result.issue?.path).toBe('maxTurns')
    expect(result.issue?.substituted).toBeUndefined()
    expect(result.issue?.removed).toBeUndefined()
  })

  test('un campo inválido con puerta se sustituye por su valor restrictivo', () => {
    const gates: readonly R.RestrictiveGate[] = [{ key: 'allowManagedHooksOnly', restrictive: true }]
    const result = R.rescueField('allowManagedHooksOnly', 'nope', z.boolean(), gates)
    expect(result.value).toBe(true)
    expect(result.issue).toMatchObject({ path: 'allowManagedHooksOnly', substituted: true })
  })

  test('una puerta "disable" sustituye con el booleano más restrictivo, no con la cadena', () => {
    const gates: readonly R.RestrictiveGate[] = [{ key: 'disableAutoMode', restrictive: 'disable' }]
    const result = R.rescueField('disableAutoMode', 3, z.boolean(), gates)
    expect(result.value).toBe(true)
    expect(result.issue).toMatchObject({ path: 'disableAutoMode', substituted: true })
  })

  test('un "false" válido en una puerta "disable" es un no-op: se retira y se marca removed', () => {
    const gates: readonly R.RestrictiveGate[] = [{ key: 'disableAutoMode', restrictive: 'disable' }]
    const result = R.rescueField('disableAutoMode', false, z.boolean(), gates)
    expect(result.value).toBeUndefined()
    expect(result.issue).toMatchObject({ path: 'disableAutoMode', removed: true })
    expect(result.issue?.substituted).toBeUndefined()
  })

  test('un "true" válido en una puerta "disable" se conserva tal cual', () => {
    const gates: readonly R.RestrictiveGate[] = [{ key: 'disableAutoMode', restrictive: 'disable' }]
    const result = R.rescueField('disableAutoMode', true, z.boolean(), gates)
    expect(result).toEqual({ value: true })
  })
})

describe('rescuePolicyDocument: el documento entero, campo a campo', () => {
  test('un campo inválido no invalida a los demás — la diferencia con SettingsSchema().safeParse', () => {
    const result = R.rescuePolicyDocument({ model: 'claude-sonnet-5', maxTurns: 'nope' })
    expect(result.settings).toEqual({ model: 'claude-sonnet-5' })
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]!.path).toBe('maxTurns')
  })

  test('una clave sin declarar en el esquema pasa sin tocar (passthrough)', () => {
    const result = R.rescuePolicyDocument({ managedSourcesBehavior: 'merge' })
    expect(result.settings).toEqual({ managedSourcesBehavior: 'merge' })
    expect(result.issues).toEqual([])
  })

  test('una puerta inválida se sustituye dentro del documento completo', () => {
    const result = R.rescuePolicyDocument({ allowManagedMcpServersOnly: 'nope' })
    expect(result.settings).toEqual({ allowManagedMcpServersOnly: true })
    expect(result.issues[0]).toMatchObject({ path: 'allowManagedMcpServersOnly', substituted: true })
  })
})

describe('isPolicyNoOp (Ed, reducida a lo que hn()/ts() deciden sin rutas anidadas)', () => {
  test('un valor null nunca cuenta como escritura de política', () => {
    expect(R.isPolicyNoOp('model', null)).toBe(true)
  })
  test('un valor normal cuenta como escritura de política', () => {
    expect(R.isPolicyNoOp('model', 'claude-sonnet-5')).toBe(false)
  })
  test('"false" en una puerta "disable" es un no-op', () => {
    const gates: readonly R.RestrictiveGate[] = [{ key: 'disableAutoMode', restrictive: 'disable' }]
    expect(R.isPolicyNoOp('disableAutoMode', false, gates)).toBe(true)
  })
  test('"true" en una puerta "disable" SÍ cuenta como escritura de política', () => {
    const gates: readonly R.RestrictiveGate[] = [{ key: 'disableAutoMode', restrictive: 'disable' }]
    expect(R.isPolicyNoOp('disableAutoMode', true, gates)).toBe(false)
  })
  test('"false" en una puerta booleana simple (no "disable") sí cuenta', () => {
    const gates: readonly R.RestrictiveGate[] = [{ key: 'skipWebFetchPreflight', restrictive: false }]
    expect(R.isPolicyNoOp('skipWebFetchPreflight', false, gates)).toBe(false)
  })
})
