/**
 * Textos de atribución de commits y PRs: el contrato del binario 2.1.275.
 *
 * `buildAttributionTexts` es `MMo`: pie de PR y `Co-Authored-By` por defecto,
 * el override de `settings.attribution` campo por campo, y el vacío cuando
 * `includeCoAuthoredBy` es `false`. `getEnhancedPRAttribution` es `UMo`: el
 * pie enriquecido con el porcentaje de Claude, los prompts desde la última
 * compactación y las memorias leídas.
 */
import { describe, expect, test } from 'bun:test'
import {
  PR_FOOTER,
  buildAttributionTexts,
  countMemoryAccesses,
  countSinceLastCompaction,
  formatEnhancedPRAttribution,
  getEnhancedPRAttribution,
} from '../attribution.ts'

const MODEL = 'claude-opus-5'

describe('buildAttributionTexts', () => {
  test('por defecto: Co-Authored-By con el nombre del modelo y el pie de PR', () => {
    const texts = buildAttributionTexts({}, 'Claude Opus 5')
    expect(texts.commit).toBe('Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>')
    expect(texts.pr).toBe(PR_FOOTER)
    expect(PR_FOOTER).toBe('\u{1F916} Generated with [Claude Code](https://claude.com/claude-code)')
  })

  test('settings.attribution sustituye campo por campo', () => {
    expect(buildAttributionTexts({ attribution: { commit: 'C' } }, 'M')).toEqual({ commit: 'C', pr: PR_FOOTER })
    expect(buildAttributionTexts({ attribution: { pr: 'P' } }, 'M')).toEqual({
      commit: 'Co-Authored-By: M <noreply@anthropic.com>',
      pr: 'P',
    })
  })

  test('includeCoAuthoredBy: false deja los dos vacíos', () => {
    expect(buildAttributionTexts({ includeCoAuthoredBy: false }, 'M')).toEqual({ commit: '', pr: '' })
  })
})

describe('formatEnhancedPRAttribution', () => {
  test('sin datos devuelve el pie tal cual', () => {
    expect(formatEnhancedPRAttribution({ footer: 'F', claudePercent: 0, promptCount: 0, memoryAccessCount: 0, model: MODEL })).toBe('F')
  })

  test('con datos: porcentaje, prompts y modelo', () => {
    expect(formatEnhancedPRAttribution({ footer: 'F', claudePercent: 87, promptCount: 3, memoryAccessCount: 0, model: MODEL })).toBe(
      'F (87% 3-shotted by claude-opus-5)',
    )
  })

  test('las memorias se nombran en singular o plural', () => {
    const base = { footer: 'F', claudePercent: 50, promptCount: 2, model: MODEL }
    expect(formatEnhancedPRAttribution({ ...base, memoryAccessCount: 1 })).toBe('F (50% 2-shotted by claude-opus-5, 1 memory recalled)')
    expect(formatEnhancedPRAttribution({ ...base, memoryAccessCount: 2 })).toBe('F (50% 2-shotted by claude-opus-5, 2 memories recalled)')
  })
})

const user = (text: string, extra: Record<string, unknown> = {}) => ({ type: 'user', message: { content: text }, ...extra })
const toolUse = (name: string, input: Record<string, unknown>) => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name, input }] },
})

describe('conteo desde la última compactación', () => {
  test('sólo cuenta lo posterior a la última frontera de compactación', () => {
    const entries = [
      user('antes'),
      { type: 'system', subtype: 'compact_boundary' },
      user('uno'),
      user('meta', { isMeta: true }),
      user('lateral', { isSidechain: true }),
      user('resumen', { isCompactSummary: true }),
      user('dos'),
    ]
    expect(countSinceLastCompaction(entries, () => false).promptCount).toBe(2)
  })

  test('cuenta las lecturas y escrituras de archivos de memoria', () => {
    const entries = [
      toolUse('Read', { file_path: '/mem/a.md' }),
      toolUse('Edit', { file_path: '/src/x.ts' }),
      toolUse('Write', { file_path: '/mem/b.md' }),
      toolUse('Bash', { command: 'cat /mem/a.md' }),
    ]
    expect(countMemoryAccesses(entries, p => p.startsWith('/mem/'))).toBe(2)
  })
})

describe('getEnhancedPRAttribution', () => {
  const deps = (over: Record<string, unknown> = {}) => ({
    settings: () => ({}),
    claudePercent: async () => 87,
    transcriptEntries: async () => [user('uno'), user('dos'), toolUse('Read', { file_path: '/mem/a.md' })],
    isMemoryPath: (p: string) => p.startsWith('/mem/'),
    model: () => MODEL,
    ...over,
  })

  test('arma el pie enriquecido con los tres datos', async () => {
    expect(await getEnhancedPRAttribution(() => ({}), deps())).toBe(`${PR_FOOTER} (87% 2-shotted by claude-opus-5, 1 memory recalled)`)
  })

  test('settings.attribution.pr gana sobre todo', async () => {
    expect(await getEnhancedPRAttribution(() => ({}), deps({ settings: () => ({ attribution: { pr: 'P' } }) }))).toBe('P')
  })

  test('includeCoAuthoredBy: false devuelve vacío', async () => {
    expect(await getEnhancedPRAttribution(() => ({}), deps({ settings: () => ({ includeCoAuthoredBy: false }) }))).toBe('')
  })

  test('un dato que falla no rompe el pie: cuenta como ausente', async () => {
    const d = deps({ claudePercent: async () => { throw new Error('sin git') }, transcriptEntries: async () => [] })
    expect(await getEnhancedPRAttribution(() => ({}), d)).toBe(PR_FOOTER)
  })
})
