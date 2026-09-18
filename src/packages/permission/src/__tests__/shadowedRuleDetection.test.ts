/**
 * Copia de `ccnmt: packages/permission/src/__tests__/shadowedRuleDetection.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Tests de `shadowedRuleDetection` — el que alimenta los avisos de /doctor
 * sobre reglas de permiso inalcanzables en los ajustes de usuario, de
 * proyecto y de política.
 *
 * Detectar mal una regla ensombrecida produce o avisos espurios —molestos, y
 * entrenan al usuario a ignorar /doctor— o sombras que pasan desapercibidas:
 * ahí un defecto real de configuración le llega al usuario, que CREE que su
 * regla de allow le deja pasar cuando la regla de ask de más arriba bloquea
 * cada intento.
 *
 * La excepción del auto-allow de Bash con sandbox es especialmente sutil: una
 * regla de ask que abarca toda la herramienta y viene de los ajustes
 * PERSONALES no debe ensombrecer reglas de allow específicas cuando el
 * sandbox está habilitado, pero una que venga de ajustes COMPARTIDOS (de
 * proyecto o de política) TIENE que seguir avisando — puede que otros
 * miembros del equipo no tengan sandbox.
 */
import { describe, expect, test } from 'bun:test'
import {
  detectUnreachableRules,
  isSharedSettingSource,
} from '../shadowedRuleDetection.js'
import type { ToolPermissionContext } from '@thyrox/tool-registry/Tool.js'
import type { PermissionRuleSource } from '../PermissionRule.js'

describe('isSharedSettingSource', () => {
  test('projectSettings is shared (committed to git)', () => {
    expect(isSharedSettingSource('projectSettings')).toBe(true)
  })

  test('policySettings is shared (enterprise-managed)', () => {
    expect(isSharedSettingSource('policySettings')).toBe(true)
  })

  test('command is shared (slash command frontmatter)', () => {
    expect(isSharedSettingSource('command')).toBe(true)
  })

  test('userSettings is personal', () => {
    expect(isSharedSettingSource('userSettings')).toBe(false)
  })

  test('localSettings is personal (gitignored)', () => {
    expect(isSharedSettingSource('localSettings')).toBe(false)
  })

  test('cliArg is personal (runtime)', () => {
    expect(isSharedSettingSource('cliArg')).toBe(false)
  })

  test('session is personal (in-memory)', () => {
    expect(isSharedSettingSource('session')).toBe(false)
  })

  test('flagSettings is personal (--settings flag)', () => {
    expect(isSharedSettingSource('flagSettings')).toBe(false)
  })

  test('unknown source falls through to false', () => {
    expect(
      isSharedSettingSource('unknownFutureSource' as PermissionRuleSource),
    ).toBe(false)
  })
})

const buildContext = (overrides: {
  allow?: Partial<Record<PermissionRuleSource, string[]>>
  ask?: Partial<Record<PermissionRuleSource, string[]>>
  deny?: Partial<Record<PermissionRuleSource, string[]>>
}): ToolPermissionContext => {
  const empty: Record<PermissionRuleSource, string[]> = {
    cliArg: [],
    session: [],
    localSettings: [],
    flagSettings: [],
    userSettings: [],
    projectSettings: [],
    policySettings: [],
    command: [],
  }
  return {
    mode: 'default',
    additionalWorkingDirectories: new Map(),
    isBypassPermissionsModeAvailable: false,
    isAutoModeAvailable: false,
    permissionRules: [],
    alwaysAllowRules: { ...empty, ...overrides.allow },
    alwaysAskRules: { ...empty, ...overrides.ask },
    alwaysDenyRules: { ...empty, ...overrides.deny },
  } as never
}

describe('detectUnreachableRules — no shadowing', () => {
  test('empty context → no unreachable rules', () => {
    const ctx = buildContext({})
    expect(detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })).toEqual([])
  })

  test('only allow rules, no ask/deny → no shadowing', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)', 'Bash(cat:*)'] },
    })
    expect(detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })).toEqual([])
  })

  test('tool-wide allow + tool-wide ask: NOT marked unreachable (no specific rule)', () => {
    // Documentado: una regla de allow que abarca toda la herramienta no
    // puede quedar «ensombrecida» — sólo se comprueban las específicas, las
    // que llevan `ruleContent`.
    const ctx = buildContext({
      allow: { localSettings: ['Bash'] },
      ask: { localSettings: ['Bash'] },
    })
    expect(detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })).toEqual([])
  })

  test('different tool: ask on Edit doesn\'t shadow Bash allow', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { localSettings: ['Edit'] },
    })
    expect(detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })).toEqual([])
  })
})

describe('detectUnreachableRules — deny shadowing (most severe)', () => {
  test('tool-wide Bash deny shadows specific Bash(ls:*) allow', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      deny: { policySettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(1)
    expect(result[0]?.shadowType).toBe('deny')
    expect(result[0]?.reason).toContain('deny rule')
  })

  test('deny shadowing prevents ask shadowing reporting (priority)', () => {
    // Documentado: cuando la sombra la produce un deny, NO se reporta además la sombra del ask.
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { localSettings: ['Bash'] },
      deny: { localSettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(1)
    expect(result[0]?.shadowType).toBe('deny')
  })

  test('multiple specific allow rules all flagged when tool-wide deny', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)', 'Bash(cat:*)'] },
      deny: { policySettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(2)
    expect(result.every(r => r.shadowType === 'deny')).toBe(true)
  })
})

describe('detectUnreachableRules — ask shadowing', () => {
  test('tool-wide ask + specific allow → shadowed', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { projectSettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(1)
    expect(result[0]?.shadowType).toBe('ask')
    expect(result[0]?.reason).toContain('ask rule')
  })

  test('fix message references both rule sources', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { projectSettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result[0]?.fix).toBeDefined()
    expect(typeof result[0]?.fix).toBe('string')
    expect(result[0]?.fix.length).toBeGreaterThan(0)
  })
})

describe('detectUnreachableRules — Bash sandbox auto-allow exception', () => {
  test('Bash + sandbox enabled + ask from PERSONAL settings → NOT shadowed', () => {
    // Documentado: un Bash en sandbox se auto-permite, así que la regla de
    // ask de los ajustes personales es irrelevante.
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { localSettings: ['Bash'] }, // localSettings is personal
    })
    expect(
      detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true }),
    ).toEqual([])
  })

  test('Bash + sandbox enabled + ask from userSettings (personal) → NOT shadowed', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { userSettings: ['Bash'] },
    })
    expect(
      detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true }),
    ).toEqual([])
  })

  test('Bash + sandbox enabled + ask from projectSettings (SHARED) → STILL shadowed', () => {
    // Documentado: los ajustes compartidos avisan siempre, incluso con
    // sandbox — puede que otros miembros del equipo no lo tengan habilitado.
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { projectSettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true })
    expect(result).toHaveLength(1)
  })

  test('Bash + sandbox enabled + ask from policySettings (SHARED) → STILL shadowed', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { policySettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true })
    expect(result).toHaveLength(1)
  })

  test('non-Bash tool: sandbox doesn\'t apply, ask still shadows', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Edit(*.ts)'] },
      ask: { localSettings: ['Edit'] },
    })
    // `sandboxAutoAllowEnabled` no aplica a Edit.
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: true })
    expect(result).toHaveLength(1)
  })
})

describe('detectUnreachableRules — across multiple sources', () => {
  test('allow in localSettings, ask in userSettings → shadowed (across sources)', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { userSettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    expect(result).toHaveLength(1)
  })

  test('all three rules in different sources still detected', () => {
    const ctx = buildContext({
      allow: { localSettings: ['Bash(ls:*)'] },
      ask: { projectSettings: ['Bash'] },
      deny: { policySettings: ['Bash'] },
    })
    const result = detectUnreachableRules(ctx, { sandboxAutoAllowEnabled: false })
    // gana deny (es más severo)
    expect(result).toHaveLength(1)
    expect(result[0]?.shadowType).toBe('deny')
  })
})
