/**
 * Tests del puerto de `host.ts`/`errors.ts`/`permissionRuleParser.ts`
 * (los tres, porte COMPLETO — ver sus docstrings).
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  AbortError,
  AskRequiredError,
  ContextError,
  DeniedError,
  HostBindingsError,
  PermissionBaseError,
} from '../src/errors.ts'
import { getPermissionHostBindings, installPermissionHostBindings } from '../src/host.ts'
import {
  escapeRuleContent,
  getLegacyToolNames,
  normalizeLegacyToolName,
  permissionRuleValueFromString,
  permissionRuleValueToString,
  unescapeRuleContent,
} from '../src/permissionRuleParser.ts'

describe('errors.ts — las seis clases', () => {
  test('cada una guarda su código estable y su name propio', () => {
    expect(new PermissionBaseError('X', 'm').code).toBe('X')
    expect(new DeniedError('m').code).toBe('PERMISSION_DENIED')
    expect(new AskRequiredError('m').code).toBe('PERMISSION_ASK_REQUIRED')
    expect(new ContextError('m').code).toBe('PERMISSION_CONTEXT_ERROR')
    expect(new AbortError().code).toBe('PERMISSION_ABORTED')
    expect(new AbortError().message).toBe('Permission request aborted')
    expect(new HostBindingsError('m').code).toBe('PERMISSION_HOST_BINDINGS_ERROR')
  })

  test('todas son instanceof Error', () => {
    expect(new DeniedError('m')).toBeInstanceOf(Error)
  })
})

describe('host.ts — antes de instalar', () => {
  test('getPermissionHostBindings lanza HostBindingsError', () => {
    expect(() => getPermissionHostBindings()).toThrow(/host bindings have not been installed/i)
  })
})

describe('host.ts — después de instalar', () => {
  beforeAll(() => {
    installPermissionHostBindings({ logDebug: () => {}, now: () => 42 })
  })

  test('devuelve el binding instalado', () => {
    const bindings = getPermissionHostBindings()
    expect(bindings.now?.()).toBe(42)
  })
})

describe('permissionRuleParser — round-trip', () => {
  test('parsea una regla con contenido', () => {
    expect(permissionRuleValueFromString('Bash(git push:*)')).toEqual({
      toolName: 'Bash',
      ruleContent: 'git push:*',
    })
  })

  test('parsea una regla SIN paréntesis (herramienta entera)', () => {
    expect(permissionRuleValueFromString('Read')).toEqual({ toolName: 'Read' })
  })

  test('"*" como contenido se trata como sin contenido', () => {
    expect(permissionRuleValueFromString('Bash(*)')).toEqual({ toolName: 'Bash' })
  })

  test('toString es el inverso de fromString', () => {
    const original = 'Bash(git push:*)'
    expect(permissionRuleValueToString(permissionRuleValueFromString(original))).toBe(original)
  })

  test('escapa y desescapa paréntesis dentro del contenido', () => {
    const escaped = escapeRuleContent('rm -rf (peligroso)')
    expect(escaped).toContain('\\(')
    expect(unescapeRuleContent(escaped)).toBe('rm -rf (peligroso)')
  })

  test('alias legado: Task -> Agent, KillShell -> TaskStop', () => {
    expect(normalizeLegacyToolName('Task')).toBe('Agent')
    expect(normalizeLegacyToolName('KillShell')).toBe('TaskStop')
    expect(normalizeLegacyToolName('YaEsCanonico')).toBe('YaEsCanonico')
  })

  test('getLegacyToolNames es el inverso: nombre canónico -> alias legados', () => {
    expect(getLegacyToolNames('Agent')).toContain('Task')
  })
})
