/**
 * Tests del porte fiel de `bashClassifier.ts` (stub externo — ver su
 * docstring) y de `dangerousPatterns.ts`.
 */
import { describe, expect, test } from 'bun:test'
import {
  classifyBashCommand,
  createPromptRuleContent,
  extractPromptDescription,
  generateGenericDescription,
  getBashPromptAllowDescriptions,
  getBashPromptAskDescriptions,
  getBashPromptDenyDescriptions,
  isClassifierPermissionsEnabled,
} from '../src/bashClassifier.ts'
import {
  CROSS_PLATFORM_CODE_EXEC,
  DANGEROUS_BASH_PATTERNS,
} from '../src/dangerousPatterns.ts'

describe('bashClassifier — stub externo, fail-closed', () => {
  test('el clasificador semántico está deshabilitado', () => {
    expect(isClassifierPermissionsEnabled()).toBe(false)
  })

  test('classifyBashCommand nunca "matches" — nunca auto-aprueba nada', async () => {
    const result = await classifyBashCommand(
      'rm -rf /',
      '/tmp',
      ['delete everything'],
      'allow',
      new AbortController().signal,
      false,
    )
    expect(result.matches).toBe(false)
    expect(result.reason).toBe('This feature is disabled')
  })

  test('las tres listas de descripciones de prompt están siempre vacías', () => {
    expect(getBashPromptDenyDescriptions({})).toEqual([])
    expect(getBashPromptAskDescriptions({})).toEqual([])
    expect(getBashPromptAllowDescriptions({})).toEqual([])
  })

  test('extractPromptDescription siempre da null (no hay parseo real)', () => {
    expect(extractPromptDescription('prompt: run tests')).toBeNull()
  })

  test('createPromptRuleContent antepone el prefijo y recorta', () => {
    expect(createPromptRuleContent('  run tests  ')).toBe('prompt: run tests')
  })

  test('generateGenericDescription devuelve la específica si existe', async () => {
    const withSpecific = await generateGenericDescription(
      'ls',
      'list files',
      new AbortController().signal,
    )
    expect(withSpecific).toBe('list files')
    const withoutSpecific = await generateGenericDescription(
      'ls',
      undefined,
      new AbortController().signal,
    )
    expect(withoutSpecific).toBeNull()
  })
})

describe('dangerousPatterns', () => {
  test('DANGEROUS_BASH_PATTERNS incluye todo CROSS_PLATFORM_CODE_EXEC', () => {
    for (const interpreter of CROSS_PLATFORM_CODE_EXEC) {
      expect(DANGEROUS_BASH_PATTERNS).toContain(interpreter)
    }
  })

  test('sin USER_TYPE=ant, los patrones exclusivos de ant NO aparecen', () => {
    // Este proceso de test no fija USER_TYPE=ant.
    expect(process.env.USER_TYPE).not.toBe('ant')
    expect(DANGEROUS_BASH_PATTERNS).not.toContain('coo')
    expect(DANGEROUS_BASH_PATTERNS).not.toContain('kubectl')
  })

  test('python/node/bash están en la lista — intérpretes de ejecución de código', () => {
    expect(DANGEROUS_BASH_PATTERNS).toContain('python')
    expect(DANGEROUS_BASH_PATTERNS).toContain('node')
    expect(DANGEROUS_BASH_PATTERNS).toContain('bash')
    expect(DANGEROUS_BASH_PATTERNS).toContain('sudo')
  })
})
