/**
 * Pruebas de `createPermissionRequestMessage`: `su` de 2.1.275
 * (`chunk-q2gh92k2.js`), el texto que explica por qué se pide aprobación.
 */
import { describe, expect, test } from 'bun:test'
import { createPermissionRequestMessage } from '../permissions.js'
import type { PermissionRule } from '../PermissionRule.js'

describe('createPermissionRequestMessage (su)', () => {
  test('sin razón: el aviso genérico', () => {
    expect(createPermissionRequestMessage('Bash')).toBe("Claude requested permissions to use Bash, but you haven't granted it yet.")
  })
  test('clasificador', () => {
    expect(createPermissionRequestMessage('Bash', { type: 'classifier', classifier: 'yolo', reason: 'writes outside' })).toBe(
      "Classifier 'yolo' requires approval for this Bash command: writes outside",
    )
  })
  test('hook con y sin razón', () => {
    expect(createPermissionRequestMessage('Bash', { type: 'hook', hookName: 'guard', reason: 'no' })).toBe("Hook 'guard' blocked this action: no")
    expect(createPermissionRequestMessage('Bash', { type: 'hook', hookName: 'guard' })).toBe("Hook 'guard' requires approval for this Bash command")
  })
  test('regla, con su fuente', () => {
    const rule: PermissionRule = { source: 'userSettings', ruleBehavior: 'ask', ruleValue: { toolName: 'Bash', ruleContent: 'rm:*' } }
    expect(createPermissionRequestMessage('Bash', { type: 'rule', rule })).toBe(
      "Permission rule 'Bash(rm:*)' from user settings requires approval for this Bash command",
    )
  })
  test('subcomandos: sólo los que piden, y en Bash sin sus redirecciones', () => {
    const reasons = new Map([
      ['ls', { behavior: 'allow' }],
      ['echo hi > out.txt', { behavior: 'ask' }],
      ['rm -rf x', { behavior: 'passthrough' }],
    ])
    expect(createPermissionRequestMessage('Bash', { type: 'subcommandResults', reasons })).toBe(
      'This Bash command contains multiple operations. The following parts require approval: echo hi, rm -rf x',
    )
    const one = new Map([['rm x', { behavior: 'ask' }]])
    expect(createPermissionRequestMessage('PowerShell', { type: 'subcommandResults', reasons: one })).toBe(
      'This PowerShell command contains multiple operations. The following part requires approval: rm x',
    )
    expect(createPermissionRequestMessage('Bash', { type: 'subcommandResults', reasons: new Map() })).toBe(
      'This Bash command contains multiple operations that require approval',
    )
  })
  test('herramienta de aprobación, sandbox, directorio y razones libres', () => {
    expect(createPermissionRequestMessage('Bash', { type: 'permissionPromptTool', permissionPromptToolName: 'mcp__p' })).toBe(
      "Tool 'mcp__p' requires approval for this Bash command",
    )
    expect(createPermissionRequestMessage('Bash', { type: 'sandboxOverride' })).toBe('Run outside of the sandbox')
    expect(createPermissionRequestMessage('Bash', { type: 'workingDir', reason: 'fuera' })).toBe('fuera')
    expect(createPermissionRequestMessage('Bash', { type: 'safetyCheck', reason: 'sensible' })).toBe('sensible')
    expect(createPermissionRequestMessage('Bash', { type: 'other', reason: 'otra' })).toBe('otra')
    expect(createPermissionRequestMessage('Bash', { type: 'asyncAgent', reason: 'agente' })).toBe('agente')
  })
  test('modo', () => {
    expect(createPermissionRequestMessage('Bash', { type: 'mode', mode: 'default' })).toMatch(
      /^Current permission mode \(.+\) requires approval for this Bash command$/,
    )
  })
})
