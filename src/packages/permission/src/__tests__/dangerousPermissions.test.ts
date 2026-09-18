/**
 * Copia de `ccnmt: packages/permission/src/__tests__/dangerousPermissions.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Tests de la detección de permisos peligrosos — la puerta del registro de
 * reglas del modo automático. Detectar mal produce una de dos cosas:
 *   - bloquea reglas legítimas (un roce de experiencia de uso)
 *   - deja pasar reglas peligrosas (auto-permite la ejecución de código, y el
 *     usuario pierde la protección del sandbox)
 *
 * `isDangerousBashPermission` e `isDangerousPowerShellPermission` comprueban
 * en concreto las reglas que dejarían al agente correr código interpretado
 * arbitrario (`python:*`, `node:*`, etc.) saltándose el clasificador.
 */
import { describe, expect, test } from 'bun:test'
import {
  isDangerousBashPermission,
  isDangerousPowerShellPermission,
  isOverlyBroadBashAllowRule,
  isOverlyBroadPowerShellAllowRule,
} from '../permissionSetup.js'

describe('isDangerousBashPermission — tool-level allow', () => {
  test('Bash with undefined ruleContent → dangerous (allows ALL commands)', () => {
    expect(isDangerousBashPermission('Bash', undefined)).toBe(true)
  })

  test('Bash with empty ruleContent → dangerous', () => {
    expect(isDangerousBashPermission('Bash', '')).toBe(true)
  })

  test('Bash(*) standalone wildcard → dangerous', () => {
    expect(isDangerousBashPermission('Bash', '*')).toBe(true)
  })
})

describe('isDangerousBashPermission — non-Bash tools', () => {
  test('FileRead is NOT a Bash tool → false', () => {
    expect(isDangerousBashPermission('FileRead', undefined)).toBe(false)
    expect(isDangerousBashPermission('FileRead', '*')).toBe(false)
  })

  test('Lowercase "bash" is NOT recognized (toolName check is exact)', () => {
    // Documentado: sólo casa exactamente con 'Bash'.
    expect(isDangerousBashPermission('bash', undefined)).toBe(false)
  })
})

describe('isDangerousBashPermission — interpreter prefix patterns', () => {
  test('python:* (any python command) → dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'python:*')).toBe(true)
  })

  test('node:* → dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'node:*')).toBe(true)
  })

  test('python (just the binary name as rule) → dangerous (exact match)', () => {
    expect(isDangerousBashPermission('Bash', 'python')).toBe(true)
  })

  test('python* (wildcard suffix) → dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'python*')).toBe(true)
  })

  test('python * (with space + wildcard) → dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'python *')).toBe(true)
  })

  test('python -* (any flagged invocation) → dangerous', () => {
    // Documentado: bloquea los permisos del estilo `python -c 'code'`.
    expect(isDangerousBashPermission('Bash', 'python -c*')).toBe(true)
  })
})

describe('isDangerousBashPermission — case insensitivity', () => {
  test('uppercase python is normalized', () => {
    expect(isDangerousBashPermission('Bash', 'PYTHON:*')).toBe(true)
  })

  test('mixed-case wildcard', () => {
    expect(isDangerousBashPermission('Bash', 'Python*')).toBe(true)
  })

  test('whitespace trimmed before matching', () => {
    expect(isDangerousBashPermission('Bash', '   python:*   ')).toBe(true)
  })
})

describe('isDangerousBashPermission — safe patterns', () => {
  test('specific command (ls -la) → not dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'ls -la')).toBe(false)
  })

  test('git command prefix → not dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'git status')).toBe(false)
  })

  test('npm command prefix (not in dangerous patterns) → not dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'npm install')).toBe(false)
  })

  test('echo "hello" → not dangerous', () => {
    expect(isDangerousBashPermission('Bash', 'echo "hello"')).toBe(false)
  })
})

describe('isDangerousPowerShellPermission — tool-level allow', () => {
  test('PowerShell undefined → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', undefined)).toBe(true)
  })

  test('PowerShell empty string → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', '')).toBe(true)
  })

  test('PowerShell(*) → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', '*')).toBe(true)
  })
})

describe('isDangerousPowerShellPermission — script-evaluator patterns', () => {
  test('iex (Invoke-Expression alias) → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'iex')).toBe(true)
  })

  test('invoke-expression → dangerous', () => {
    expect(
      isDangerousPowerShellPermission('PowerShell', 'invoke-expression'),
    ).toBe(true)
  })

  test('pwsh:* (nested PowerShell) → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'pwsh:*')).toBe(true)
  })

  test('cmd (cmd.exe escape) → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'cmd')).toBe(true)
  })

  test('wsl (cross-shell escape) → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'wsl:*')).toBe(true)
  })
})

describe('isDangerousPowerShellPermission — non-PowerShell tools', () => {
  test('Bash → false (different tool)', () => {
    expect(isDangerousPowerShellPermission('Bash', undefined)).toBe(false)
    expect(isDangerousPowerShellPermission('Bash', '*')).toBe(false)
  })

  test('lowercase "powershell" tool name → false', () => {
    // Coincidencia exacta con 'PowerShell'.
    expect(isDangerousPowerShellPermission('powershell', undefined)).toBe(false)
  })
})

describe('isDangerousPowerShellPermission — case insensitivity (PS is case-insensitive)', () => {
  test('uppercase IEX → dangerous', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'IEX')).toBe(true)
  })

  test('mixed-case Invoke-Expression', () => {
    expect(
      isDangerousPowerShellPermission('PowerShell', 'Invoke-Expression'),
    ).toBe(true)
  })
})

describe('isDangerousPowerShellPermission — safe patterns', () => {
  test('Get-ChildItem → not dangerous', () => {
    expect(
      isDangerousPowerShellPermission('PowerShell', 'Get-ChildItem'),
    ).toBe(false)
  })

  test('specific command with args → not dangerous', () => {
    expect(
      isDangerousPowerShellPermission('PowerShell', 'Get-Process -Name pwsh'),
    ).toBe(false)
  })
})

describe('isOverlyBroadBashAllowRule — tool-level Bash allow detection', () => {
  test('Bash with no ruleContent → overly broad', () => {
    expect(
      isOverlyBroadBashAllowRule({ toolName: 'Bash' } as never),
    ).toBe(true)
  })

  test('Bash with ruleContent: undefined → overly broad', () => {
    expect(
      isOverlyBroadBashAllowRule({
        toolName: 'Bash',
        ruleContent: undefined,
      } as never),
    ).toBe(true)
  })

  test('Bash with specific command → NOT overly broad', () => {
    expect(
      isOverlyBroadBashAllowRule({
        toolName: 'Bash',
        ruleContent: 'ls -la',
      } as never),
    ).toBe(false)
  })

  test('Bash with empty string ruleContent → NOT overly broad (only undefined counts)', () => {
    // Comprobación estricta contra `undefined`, documentada: '' no pasa el
    // test `=== undefined`. Es decir, una regla «Bash()» parseada a
    // `ruleContent: ''` recibe un trato distinto que «Bash» parseada a
    // `ruleContent: undefined`.
    expect(
      isOverlyBroadBashAllowRule({
        toolName: 'Bash',
        ruleContent: '',
      } as never),
    ).toBe(false)
  })

  test('different tool → false', () => {
    expect(
      isOverlyBroadBashAllowRule({ toolName: 'FileRead' } as never),
    ).toBe(false)
  })
})

describe('isOverlyBroadPowerShellAllowRule', () => {
  test('PowerShell with no ruleContent → overly broad', () => {
    expect(
      isOverlyBroadPowerShellAllowRule({ toolName: 'PowerShell' } as never),
    ).toBe(true)
  })

  test('PowerShell with specific command → NOT overly broad', () => {
    expect(
      isOverlyBroadPowerShellAllowRule({
        toolName: 'PowerShell',
        ruleContent: 'Get-Process',
      } as never),
    ).toBe(false)
  })

  test('Bash → false (different tool)', () => {
    expect(
      isOverlyBroadPowerShellAllowRule({ toolName: 'Bash' } as never),
    ).toBe(false)
  })
})
