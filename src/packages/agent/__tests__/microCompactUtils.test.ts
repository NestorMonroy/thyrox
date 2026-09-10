/**
 * Porte de `ccnmt: packages/agent/__tests__/microCompactUtils.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { collectCompactableToolIds } from '../compaction/microCompactUtils.js'

type Msg = Parameters<typeof collectCompactableToolIds>[0][number]

describe('collectCompactableToolIds', () => {
  test('returns empty for empty input', () => {
    expect(collectCompactableToolIds([], new Set())).toEqual([])
  })

  test('returns ids of tool_use blocks whose name is in the allowlist', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} },
            { type: 'tool_use', id: 'tu_2', name: 'Edit', input: {} },
          ],
        },
      },
    ]
    const result = collectCompactableToolIds(messages, new Set(['Bash']))
    expect(result).toEqual(['tu_1'])
  })

  test('includes ids when multiple matching tool_uses exist in one message', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} },
            { type: 'tool_use', id: 'tu_2', name: 'Bash', input: {} },
          ],
        },
      },
    ]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual(['tu_1', 'tu_2'])
  })

  test('includes ids across multiple assistant messages', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'a', name: 'Bash', input: {} }],
        },
      },
      {
        type: 'user',
      },
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'b', name: 'Bash', input: {} }],
        },
      },
    ]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual(['a', 'b'])
  })

  test('skips user messages even when content has tool_use shape', () => {
    // Critico: solo se recolectan tool_use de assistant. El comportamiento
    // de caching depende de esto — los tool_results del lado user no
    // serian ids validos para compactar.
    const messages: Msg[] = [
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_use', id: 'should_not_collect', name: 'Bash' }],
        },
      },
    ]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual([])
  })

  test('skips system messages', () => {
    const messages: Msg[] = [
      {
        type: 'system',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'Bash' }],
        },
      },
    ]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual([])
  })

  test('skips assistant messages with non-array content', () => {
    const messages: Msg[] = [
      { type: 'assistant', message: { content: 'plain string' } },
    ]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual([])
  })

  test('skips assistant messages with no message field', () => {
    const messages: Msg[] = [{ type: 'assistant' }]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual([])
  })

  test('does NOT include non-tool_use blocks (text, thinking)', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'thinking', name: 'Bash' },
            { type: 'thinking', thinking: 'inner', name: 'Bash' },
            { type: 'tool_use', id: 'real', name: 'Bash', input: {} },
          ],
        },
      },
    ]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual(['real'])
  })

  test('skips tool_use blocks with non-string name', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'bad_name', name: 123 },
            { type: 'tool_use', id: 'no_name' }, // sin name
          ],
        },
      },
    ]
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual([])
  })

  test('empty allowlist returns empty', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'Bash' }],
        },
      },
    ]
    expect(collectCompactableToolIds(messages, new Set())).toEqual([])
  })

  test('allowlist match is case-sensitive', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'bash' }],
        },
      },
    ]
    // 'Bash' (mayuscula B) esta en el allowlist; 'bash' (minuscula) es el
    // name del bloque. La igualdad estricta hace que no matcheen.
    expect(
      collectCompactableToolIds(messages, new Set(['Bash'])),
    ).toEqual([])
  })
})
