import { describe, expect, test } from 'bun:test'
import {
  stripHtmlComments,
  isMemoryFilePath,
  getLargeMemoryFiles,
} from '@thyrox/storage/claudemd.js'
import { buildEffectiveSystemPrompt } from '@thyrox/provider/systemPrompt.js'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'

// Los campos que el contrato exige y que estas pruebas no ejercitan: sin
// agente del hilo principal, `toolUseContext` no se lee.
const noAgent = {
  mainThreadAgentDefinition: undefined,
  toolUseContext: { options: {} as ToolUseContext['options'] },
  customSystemPrompt: undefined,
  appendSystemPrompt: undefined,
}

// ─── CLAUDE.md Integration with System Prompt ─────────────────────────

describe('Context build: CLAUDE.md + system prompt integration', () => {
  test('buildEffectiveSystemPrompt passes through default prompt', () => {
    const result = buildEffectiveSystemPrompt({
      ...noAgent,
      defaultSystemPrompt: ['You are Claude.'],
    })
    // Result is an array of strings (may be split differently)
    const joined = Array.from(result).join('')
    expect(joined).toBe('You are Claude.')
  })

  test('buildEffectiveSystemPrompt handles empty prompts', () => {
    const result = buildEffectiveSystemPrompt({
      ...noAgent,
      defaultSystemPrompt: [''],
    })
    const joined = Array.from(result).join('')
    expect(joined).toBe('')
  })

  test('buildEffectiveSystemPrompt with overrideSystemPrompt replaces everything', () => {
    const result = buildEffectiveSystemPrompt({
      ...noAgent,
      defaultSystemPrompt: ['Default'],
      overrideSystemPrompt: 'Override',
    })
    const joined = Array.from(result).join('')
    expect(joined).toBe('Override')
  })

  test('buildEffectiveSystemPrompt with customSystemPrompt replaces default', () => {
    const result = buildEffectiveSystemPrompt({
      ...noAgent,
      defaultSystemPrompt: ['Default'],
      customSystemPrompt: 'Custom',
    })
    const joined = Array.from(result).join('')
    expect(joined).toBe('Custom')
  })

  test('buildEffectiveSystemPrompt with appendSystemPrompt includes both', () => {
    const result = buildEffectiveSystemPrompt({
      ...noAgent,
      defaultSystemPrompt: ['Main prompt'],
      appendSystemPrompt: 'Appended',
    })
    const joined = Array.from(result).join('')
    expect(joined).toContain('Main prompt')
    expect(joined).toContain('Appended')
    // Appended should come after main
    expect(joined.indexOf('Main prompt')).toBeLessThan(
      joined.indexOf('Appended'),
    )
  })
})

// ─── CLAUDE.md Discovery with Real File System ───────────────────────

describe('Context build: CLAUDE.md file system integration', () => {
  test('strips HTML comments from CLAUDE.md content', () => {
    const input = '<!-- this is a comment -->Actual content'
    const { content, stripped } = stripHtmlComments(input)
    expect(content).toBe('Actual content')
    expect(stripped).toBe(true)
  })

  test('preserves code blocks when stripping HTML comments', () => {
    const input = '```\n<!-- not a real comment -->\n```\nReal text'
    const { content } = stripHtmlComments(input)
    expect(content).toContain('<!-- not a real comment -->')
    expect(content).toContain('Real text')
  })

  test('isMemoryFilePath correctly identifies CLAUDE.md paths', () => {
    expect(isMemoryFilePath('/project/CLAUDE.md')).toBe(true)
    expect(isMemoryFilePath('/project/CLAUDE.local.md')).toBe(true)
    expect(isMemoryFilePath('/project/.claude/rules/file.md')).toBe(true)
    expect(isMemoryFilePath('/project/README.md')).toBe(false)
    expect(isMemoryFilePath('/project/src/index.ts')).toBe(false)
  })
})

// ─── Large Memory File Filtering ──────────────────────────────────────

describe('Context build: large memory file filtering', () => {
  test('getLargeMemoryFiles returns empty for empty input', () => {
    expect(getLargeMemoryFiles([])).toEqual([])
  })

  test('getLargeMemoryFiles returns empty when all files are small', () => {
    const files = [
      { path: '/a/CLAUDE.md', type: 'Project' as const, content: 'small' },
      { path: '/b/CLAUDE.md', type: 'Project' as const, content: 'also small' },
    ]
    expect(getLargeMemoryFiles(files)).toEqual([])
  })
})
