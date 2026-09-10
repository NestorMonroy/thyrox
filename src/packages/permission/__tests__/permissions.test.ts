/**
 * Tests del puerto declarado-parcial de `permissions.ts` (10 de 17
 * exports — ver docstring del archivo para el detalle de lo omitido).
 * Cubre el objetivo confirmado del pase (`getDenyRuleForTool`) y sus
 * vecinos en el mismo bloque de "reglas puras".
 */
import { describe, expect, test } from 'bun:test'
import {
  filterDeniedAgents,
  getAllowRules,
  getAskRuleForTool,
  getAskRules,
  getDenyRuleForAgent,
  getDenyRuleForTool,
  getDenyRules,
  getRuleByContentsForTool,
  getRuleByContentsForToolName,
  toolAlwaysAllowedRule,
} from '../src/permissions.ts'

function ctx(overrides: {
  allow?: Record<string, string[]>
  deny?: Record<string, string[]>
  ask?: Record<string, string[]>
}) {
  return {
    alwaysAllowRules: overrides.allow ?? {},
    alwaysDenyRules: overrides.deny ?? {},
    alwaysAskRules: overrides.ask ?? {},
  }
}

describe('getAllowRules / getDenyRules / getAskRules', () => {
  test('agrupan por fuente y adjuntan el comportamiento correcto', () => {
    const c = ctx({
      allow: { userSettings: ['Read'] },
      deny: { projectSettings: ['Bash(rm:*)'] },
      ask: { localSettings: ['Write'] },
    })
    expect(getAllowRules(c)).toEqual([
      { source: 'userSettings', ruleBehavior: 'allow', ruleValue: { toolName: 'Read' } },
    ])
    expect(getDenyRules(c)).toEqual([
      {
        source: 'projectSettings',
        ruleBehavior: 'deny',
        ruleValue: { toolName: 'Bash', ruleContent: 'rm:*' },
      },
    ])
    expect(getAskRules(c)).toEqual([
      { source: 'localSettings', ruleBehavior: 'ask', ruleValue: { toolName: 'Write' } },
    ])
  })

  test('fuente sin reglas no aporta nada (flatMap sobre array vacío)', () => {
    expect(getAllowRules(ctx({}))).toEqual([])
  })
})

describe('getDenyRuleForTool — el objetivo del pase', () => {
  test('una regla de herramienta ENTERA (sin paréntesis) casa por nombre', () => {
    const c = ctx({ deny: { userSettings: ['Bash'] } })
    expect(getDenyRuleForTool(c, { name: 'Bash' })).toEqual({
      source: 'userSettings',
      ruleBehavior: 'deny',
      ruleValue: { toolName: 'Bash' },
    })
  })

  test('una regla CON contenido (Bash(git push:*)) NO casa la herramienta entera', () => {
    // Es el comportamiento documentado en la fuente: toolMatchesRule
    // exige rule.ruleValue.ruleContent === undefined para el match de
    // herramienta completa. El contenido se resuelve por otra vía
    // (getRuleByContentsForTool / matchingRuleForInput, este último
    // fuera de alcance de este pase).
    const c = ctx({ deny: { userSettings: ['Bash(git push:*)'] } })
    expect(getDenyRuleForTool(c, { name: 'Bash' })).toBeNull()
  })

  test('sin regla que case, null', () => {
    expect(getDenyRuleForTool(ctx({}), { name: 'Read' })).toBeNull()
  })

  test('regla de servidor MCP (mcp__server1) casa mcp__server1__tool1', () => {
    const c = ctx({ deny: { userSettings: ['mcp__server1'] } })
    const found = getDenyRuleForTool(c, {
      name: 'mcp__server1__tool1',
      mcpInfo: { serverName: 'server1', toolName: 'tool1' },
    })
    expect(found?.ruleValue.toolName).toBe('mcp__server1')
  })
})

describe('getAskRuleForTool / toolAlwaysAllowedRule', () => {
  test('delegan al mismo mecanismo de match sobre su propia lista', () => {
    const c = ctx({ ask: { userSettings: ['Write'] }, allow: { userSettings: ['Read'] } })
    expect(getAskRuleForTool(c, { name: 'Write' })?.ruleValue.toolName).toBe('Write')
    expect(toolAlwaysAllowedRule(c, { name: 'Read' })?.ruleValue.toolName).toBe('Read')
    expect(toolAlwaysAllowedRule(c, { name: 'Write' })).toBeNull()
  })
})

describe('getDenyRuleForAgent / filterDeniedAgents', () => {
  test('Agent(Explore) deniega sólo el agentType Explore', () => {
    const c = ctx({ deny: { userSettings: ['Agent(Explore)'] } })
    expect(getDenyRuleForAgent(c, 'Agent', 'Explore')?.ruleValue.ruleContent).toBe('Explore')
    expect(getDenyRuleForAgent(c, 'Agent', 'Plan')).toBeNull()
  })

  test('filterDeniedAgents excluye sólo los agentTypes denegados', () => {
    const c = ctx({ deny: { userSettings: ['Agent(Explore)'] } })
    const agents = [{ agentType: 'Explore' }, { agentType: 'Plan' }, { agentType: 'Explore' }]
    expect(filterDeniedAgents(agents, c, 'Agent')).toEqual([{ agentType: 'Plan' }])
  })
})

describe('getRuleByContentsForTool / getRuleByContentsForToolName', () => {
  test('mapea contenido -> regla, para el behavior pedido', () => {
    const c = ctx({ deny: { userSettings: ['Bash(git push:*)', 'Bash(rm:*)'] } })
    const map = getRuleByContentsForTool(c, { name: 'Bash' }, 'deny')
    expect([...map.keys()].sort()).toEqual(['git push:*', 'rm:*'])
    expect(map.get('rm:*')?.ruleValue.toolName).toBe('Bash')
  })

  test('getRuleByContentsForToolName con behavior "allow"/"ask" usa la lista correcta', () => {
    const c = ctx({ allow: { userSettings: ['Read(src/**)'] } })
    expect(getRuleByContentsForToolName(c, 'Read', 'allow').has('src/**')).toBe(true)
    expect(getRuleByContentsForToolName(c, 'Read', 'deny').size).toBe(0)
  })
})
