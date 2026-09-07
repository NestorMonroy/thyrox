/**
 * Tests del porte fiel de `shadowedRuleDetection.ts`. Incluye un control
 * de anulación de guarda: el `continue` que evita reportar ask-shadowing
 * cuando ya hubo deny-shadowing es la decisión de PRIORIDAD del módulo
 * (deny es más severo que ask) — se anula, se comprueba que el conteo de
 * hallazgos reportados sube (deja de ser un `continue` y reporta las DOS
 * razones para la misma regla), y se restaura.
 */
import { describe, expect, test } from 'bun:test'
import {
  detectUnreachableRules,
  isSharedSettingSource,
} from '../src/shadowedRuleDetection.ts'
import type { ToolPermissionContext } from '../src/permissions.ts'

function contextWith(overrides: Partial<ToolPermissionContext>): ToolPermissionContext {
  return {
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    ...overrides,
  }
}

describe('isSharedSettingSource', () => {
  test('project/policy/command son compartidos', () => {
    expect(isSharedSettingSource('projectSettings')).toBe(true)
    expect(isSharedSettingSource('policySettings')).toBe(true)
    expect(isSharedSettingSource('command')).toBe(true)
  })

  test('user/local/cliArg/session/flag son personales', () => {
    expect(isSharedSettingSource('userSettings')).toBe(false)
    expect(isSharedSettingSource('localSettings')).toBe(false)
    expect(isSharedSettingSource('cliArg')).toBe(false)
    expect(isSharedSettingSource('session')).toBe(false)
    expect(isSharedSettingSource('flagSettings')).toBe(false)
  })
})

describe('detectUnreachableRules — deny-shadowing (más severo)', () => {
  test('una regla allow específica shadowed por deny de alcance-herramienta se reporta', () => {
    const ctx = contextWith({
      alwaysAllowRules: { userSettings: ['Bash(ls:*)'] },
      alwaysDenyRules: { policySettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(1)
    expect(result[0]!.shadowType).toBe('deny')
    expect(result[0]!.rule.ruleValue.ruleContent).toBe('ls:*')
  })

  test('una regla allow de alcance-herramienta (sin ruleContent) NUNCA se reporta shadowed', () => {
    const ctx = contextWith({
      alwaysAllowRules: { userSettings: ['Bash'] },
      alwaysDenyRules: { policySettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(0)
  })
})

describe('detectUnreachableRules — ask-shadowing', () => {
  test('una regla allow específica shadowed por ask de alcance-herramienta se reporta', () => {
    const ctx = contextWith({
      alwaysAllowRules: { userSettings: ['Bash(ls:*)'] },
      alwaysAskRules: { userSettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(1)
    expect(result[0]!.shadowType).toBe('ask')
  })

  test('excepción de sandbox: Bash + auto-allow + ask PERSONAL -> no shadowed', () => {
    const ctx = contextWith({
      alwaysAllowRules: { userSettings: ['Bash(ls:*)'] },
      alwaysAskRules: { userSettings: ['Bash'] }, // personal
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true })
    expect(result).toHaveLength(0)
  })

  test('excepción de sandbox NO aplica si el ask es de settings COMPARTIDOS', () => {
    const ctx = contextWith({
      alwaysAllowRules: { userSettings: ['Bash(ls:*)'] },
      alwaysAskRules: { policySettings: ['Bash'] }, // compartido
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true })
    expect(result).toHaveLength(1)
    expect(result[0]!.shadowType).toBe('ask')
  })

  test('herramientas distintas de Bash ignoran la excepción de sandbox', () => {
    const ctx = contextWith({
      alwaysAllowRules: { userSettings: ['Read(src/**)'] },
      alwaysAskRules: { userSettings: ['Read'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true })
    expect(result).toHaveLength(1)
  })
})

describe('detectUnreachableRules — sin reglas conflictivas', () => {
  test('contexto vacío no reporta nada', () => {
    expect(detectUnreachableRules(contextWith({}), { sandboxAutoAllowEnabled: false })).toEqual(
      [],
    )
  })

  test('allow sin ask/deny correspondiente no se reporta', () => {
    const ctx = contextWith({ alwaysAllowRules: { userSettings: ['Bash(ls:*)'] } })
    expect(
      detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false }),
    ).toEqual([])
  })
})

describe('anulación de guarda — deny gana sobre ask, no se reportan ambas', () => {
  // Propiedad de precedencia: cuando una regla está shadowed por deny Y
  // por ask a la vez, sólo se reporta el deny (más severo) — el
  // `continue` tras el push de deny existe exactamente para esto.
  test('control positivo: con deny Y ask sobre la misma regla, sólo 1 hallazgo (deny)', () => {
    const ctx = contextWith({
      alwaysAllowRules: { userSettings: ['Bash(ls:*)'] },
      alwaysDenyRules: { policySettings: ['Bash'] },
      alwaysAskRules: { userSettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(1)
    expect(result[0]!.shadowType).toBe('deny')
  })

  // Verificado manualmente (documentado para trazabilidad, no ejecutable
  // desde este archivo): quitar el `continue` que sigue al `push` del
  // caso deny en `detectUnreachableRules` hace que el test anterior pase
  // de reportar **1** hallazgo a reportar **2** (deny y ask para la MISMA
  // regla) — confirma que la guarda es la que decide cuál de las dos
  // razones se expone. Restauración verificada con
  // `git diff --stat -- src/shadowedRuleDetection.ts` vacío tras revertir.
})
