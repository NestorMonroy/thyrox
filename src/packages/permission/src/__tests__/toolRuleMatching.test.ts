/**
 * Pruebas de `toolRuleMatching.ts`: cómo una regla nombra una herramienta
 * en 2.1.275 (`$r`, `mG`, `ws`, `ld`, `Zb`, `Ah`, `ag` de
 * `chunk-9apg35nm.js`, `chunk-0ahj7yw0.js` y `chunk-cwfdaz1m.js`).
 */
import { describe, expect, test } from 'bun:test'
import {
  getAskRuleForToolCall,
  getDenyRuleForToolCall,
  matchingFieldRule,
  permissionToolName,
  toolMatchesRuleName,
} from '../toolRuleMatching.js'

const rule = (toolName: string, ruleContent?: string, source = 'session', ruleBehavior = 'deny') =>
  ({ source, ruleBehavior, ruleValue: { toolName, ruleContent } }) as never
const ctx = (extra: Record<string, unknown> = {}) =>
  ({ alwaysAllowRules: {}, alwaysDenyRules: {}, alwaysAskRules: {}, ...extra }) as never

describe('permissionToolName (ag)', () => {
  test('una herramienta MCP se nombra mcp__servidor__herramienta, normalizada', () => {
    expect(permissionToolName({ name: 'x', mcpInfo: { serverName: 'my server', toolName: 'do.it' } })).toBe('mcp__my_server__do_it')
    expect(permissionToolName({ name: 'Bash' })).toBe('Bash')
  })
  test('un servidor de claude.ai colapsa sus guiones bajos', () => {
    expect(permissionToolName({ name: 'x', mcpInfo: { serverName: 'claude.ai  Drive ', toolName: 't' } })).toBe('mcp__claude_ai_Drive__t')
  })
})

describe('toolMatchesRuleName ($r)', () => {
  test('por nombre exacto', () => {
    expect(toolMatchesRuleName({ name: 'Bash' }, rule('Bash'))).toBe(true)
    expect(toolMatchesRuleName({ name: 'Bash' }, rule('Read'))).toBe(false)
  })
  test('la familia: la regla del padre alcanza al hijo que no es MCP', () => {
    expect(toolMatchesRuleName({ name: 'NotebookEdit', familyParentToolName: 'Edit' }, rule('Edit'))).toBe(true)
  })
  test('servidor MCP entero o con comodín', () => {
    const tool = { name: 'x', mcpInfo: { serverName: 's', toolName: 'read_file' } }
    expect(toolMatchesRuleName(tool, rule('mcp__s'))).toBe(true)
    expect(toolMatchesRuleName(tool, rule('mcp__s__*'))).toBe(true)
    expect(toolMatchesRuleName(tool, rule('mcp__s__read_*'))).toBe(true)
    expect(toolMatchesRuleName(tool, rule('mcp__s__write_*'))).toBe(false)
    expect(toolMatchesRuleName(tool, rule('mcp__other'))).toBe(false)
  })
  test('el comodín en el nombre sólo con globMatching', () => {
    expect(toolMatchesRuleName({ name: 'WebFetch' }, rule('Web*'))).toBe(false)
    expect(toolMatchesRuleName({ name: 'WebFetch' }, rule('Web*'), { globMatching: true })).toBe(true)
  })
  test('un alias sólo con proxyExpansion', () => {
    const toolAliases = { Shell: 'Bash' }
    expect(toolMatchesRuleName({ name: 'Bash' }, rule('Shell'), { toolAliases })).toBe(false)
    expect(toolMatchesRuleName({ name: 'Bash' }, rule('Shell'), { proxyExpansion: true, toolAliases })).toBe(true)
  })
})

describe('getDenyRuleForToolCall / getAskRuleForToolCall (ws, ld)', () => {
  test('sólo reglas sin contenido; con comodín y alias', () => {
    const c = ctx({ alwaysDenyRules: { session: ['Bash(rm:*)', 'Web*'] }, toolAliases: { Shell: 'Bash' } })
    expect(getDenyRuleForToolCall(c, { name: 'Bash' })).toBeNull()
    expect(getDenyRuleForToolCall(c, { name: 'WebSearch' })?.ruleValue.toolName).toBe('Web*')
  })
  test('el alias de una regla de cliArg no se expande: proxy sólo desde settings', () => {
    const fromCli = ctx({ alwaysAskRules: { cliArg: ['Shell'] }, toolAliases: { Shell: 'Bash' } })
    expect(getAskRuleForToolCall(fromCli, { name: 'Bash' })).toBeNull()
    const fromUser = ctx({ alwaysAskRules: { userSettings: ['Shell'] }, toolAliases: { Shell: 'Bash' } })
    expect(getAskRuleForToolCall(fromUser, { name: 'Bash' })?.ruleValue.toolName).toBe('Shell')
  })
  test('la herramienta de fin de conversación no se gobierna por reglas', () => {
    const c = ctx({ alwaysDenyRules: { session: ['EndConversation'] } })
    expect(getDenyRuleForToolCall(c, { name: 'EndConversation' })).toBeNull()
  })
})

describe('matchingFieldRule (Ah)', () => {
  test('una regla campo:valor casa por el valor del campo, con comodín', () => {
    const c = ctx({ alwaysDenyRules: { session: ['WebFetch(url:https://evil.*)'] } })
    expect(matchingFieldRule(c, { name: 'WebFetch' }, { url: 'https://evil.example' }, 'deny')?.ruleValue.ruleContent).toBe('url:https://evil.*')
    expect(matchingFieldRule(c, { name: 'WebFetch' }, { url: 'https://good.example' }, 'deny')).toBeNull()
  })
  test('un campo ausente o de objeto no casa', () => {
    const c = ctx({ alwaysDenyRules: { session: ['T(path:/x)'] } })
    expect(matchingFieldRule(c, { name: 'T' }, {}, 'deny')).toBeNull()
    expect(matchingFieldRule(c, { name: 'T' }, { path: { a: 1 } }, 'deny')).toBeNull()
  })
  test('el campo de contenido propio de la herramienta no se lee como campo', () => {
    const c = ctx({ alwaysDenyRules: { session: ['T(command:ls)'] } })
    expect(matchingFieldRule(c, { name: 'T', ruleContentField: 'command' }, { command: 'ls' }, 'deny')).toBeNull()
  })
})
