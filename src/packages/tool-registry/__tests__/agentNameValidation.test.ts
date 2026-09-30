import { describe, expect, test } from 'bun:test'
import { agentNameSchema } from '../src/tools/AgentTool/agentNameValidation'

const PATTERN_MESSAGE =
  'name must start with a letter or digit and contain only letters, digits, underscores, or hyphens (max 64 chars)'
const MAIN_MESSAGE =
  '"main" is reserved — SendMessage routes it to the main conversation'
const RESERVED_MESSAGE =
  'name must not be a reserved name ("main", "team-lead", "user" or ' +
  '"system", in any spelling) or have the shape of an agent id — ' +
  'those already address an agent directly'

function messagesOf(name: unknown): string[] {
  const result = agentNameSchema().optional().safeParse(name)
  return result.success ? [] : result.error.issues.map(issue => issue.message)
}

describe('agent name validation (2.1.283 co.name)', () => {
  test('accepts ordinary names and omission', () => {
    for (const name of ['researcher', 'a1', 'Worker_2', 'my-agent', 'x'.repeat(64)]) {
      expect(messagesOf(name)).toEqual([])
    }
    expect(messagesOf(undefined)).toEqual([])
  })

  test('rejects names failing the pattern', () => {
    for (const name of ['', '-lead', '_x', 'has space', 'dot.name', 'x'.repeat(65)]) {
      expect(messagesOf(name)).toContain(PATTERN_MESSAGE)
    }
  })

  test('"main" reports both the main and the reserved message', () => {
    expect(messagesOf('main')).toEqual([MAIN_MESSAGE, RESERVED_MESSAGE])
  })

  test('reserved names in any spelling report the reserved message only', () => {
    for (const name of ['Main', 'MAIN', 'team-lead', 'Team-Lead', 'user', 'USER', 'System']) {
      const messages = messagesOf(name)
      expect(messages).toContain(RESERVED_MESSAGE)
      expect(messages).not.toContain(PATTERN_MESSAGE)
    }
    expect(messagesOf('Main')).not.toContain(MAIN_MESSAGE)
  })

  test('agent-id shaped names are reserved', () => {
    expect(messagesOf('a0123456789abcdef')).toEqual([RESERVED_MESSAGE])
    expect(messagesOf('aexplore-0123456789abcdef')).toEqual([RESERVED_MESSAGE])
    expect(messagesOf('a0123456789abcde')).toEqual([])
  })
})
