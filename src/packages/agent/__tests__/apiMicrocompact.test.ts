import { describe, expect, test } from 'bun:test'
import { getAPIContextManagement, type ApiMicrocompactDeps } from '../compaction/apiMicrocompact.ts'
import type { ToolNameConstants } from '../compaction/types.ts'

const toolNames: ToolNameConstants = {
  fileEdit: 'Edit',
  fileRead: 'Read',
  fileWrite: 'Write',
  glob: 'Glob',
  grep: 'Grep',
  webFetch: 'WebFetch',
  webSearch: 'WebSearch',
  notebookEdit: 'NotebookEdit',
  shellToolNames: ['Bash'],
}

function deps(env: Record<string, string> = {}): ApiMicrocompactDeps {
  return { toolNames, getEnv: (key) => env[key] }
}

describe('getAPIContextManagement', () => {
  test('sin thinking y sin USER_TYPE=ant, no hay nada que configurar: undefined', () => {
    expect(getAPIContextManagement(deps())).toBeUndefined()
  })

  test('con thinking activo y sin redact, agrega clear_thinking con keep "all"', () => {
    const result = getAPIContextManagement(deps(), { hasThinking: true })
    expect(result).toEqual({ edits: [{ type: 'clear_thinking_20251015', keep: 'all' }] })
  })

  test('con clearAllThinking, keep se reduce a 1 turno', () => {
    const result = getAPIContextManagement(deps(), { hasThinking: true, clearAllThinking: true })
    expect(result?.edits[0]).toEqual({
      type: 'clear_thinking_20251015',
      keep: { type: 'thinking_turns', value: 1 },
    })
  })

  test('con isRedactThinkingActive, NO se agrega la estrategia de thinking', () => {
    const result = getAPIContextManagement(deps(), { hasThinking: true, isRedactThinkingActive: true })
    expect(result).toBeUndefined()
  })

  test('las estrategias de limpieza de herramientas exigen USER_TYPE=ant', () => {
    const withoutAnt = getAPIContextManagement(
      deps({ USE_API_CLEAR_TOOL_RESULTS: '1' }),
    )
    expect(withoutAnt).toBeUndefined()

    const withAnt = getAPIContextManagement(
      deps({ USER_TYPE: 'ant', USE_API_CLEAR_TOOL_RESULTS: '1' }),
    )
    expect(withAnt?.edits.length).toBe(1)
    expect(withAnt?.edits[0]?.type).toBe('clear_tool_uses_20250919')
  })

  test('sin ninguno de los dos flags USE_API_CLEAR_TOOL_*, ant solo no basta', () => {
    expect(getAPIContextManagement(deps({ USER_TYPE: 'ant' }))).toBeUndefined()
  })

  test('USE_API_CLEAR_TOOL_RESULTS usa clear_tool_inputs con las herramientas de resultado', () => {
    const result = getAPIContextManagement(deps({ USER_TYPE: 'ant', USE_API_CLEAR_TOOL_RESULTS: '1' }))
    const edit = result?.edits[0] as { clear_tool_inputs?: string[] }
    expect(edit.clear_tool_inputs).toEqual(['Bash', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'])
  })

  test('USE_API_CLEAR_TOOL_USES usa exclude_tools con las herramientas de escritura', () => {
    const result = getAPIContextManagement(deps({ USER_TYPE: 'ant', USE_API_CLEAR_TOOL_USES: '1' }))
    const edit = result?.edits[0] as { exclude_tools?: string[] }
    expect(edit.exclude_tools).toEqual(['Edit', 'Write', 'NotebookEdit'])
  })

  test('los dos flags a la vez agregan las dos estrategias', () => {
    const result = getAPIContextManagement(
      deps({ USER_TYPE: 'ant', USE_API_CLEAR_TOOL_RESULTS: '1', USE_API_CLEAR_TOOL_USES: 'true' }),
    )
    expect(result?.edits.length).toBe(2)
  })

  test('los umbrales usan API_MAX_INPUT_TOKENS / API_TARGET_INPUT_TOKENS cuando están, si no el default', () => {
    const withEnv = getAPIContextManagement(
      deps({
        USER_TYPE: 'ant',
        USE_API_CLEAR_TOOL_RESULTS: '1',
        API_MAX_INPUT_TOKENS: '100000',
        API_TARGET_INPUT_TOKENS: '30000',
      }),
    )
    const edit = withEnv?.edits[0] as { trigger: { value: number }; clear_at_least: { value: number } }
    expect(edit.trigger.value).toBe(100_000)
    expect(edit.clear_at_least.value).toBe(70_000)

    const withoutEnv = getAPIContextManagement(deps({ USER_TYPE: 'ant', USE_API_CLEAR_TOOL_RESULTS: '1' }))
    const editDefault = withoutEnv?.edits[0] as { trigger: { value: number }; clear_at_least: { value: number } }
    expect(editDefault.trigger.value).toBe(180_000)
    expect(editDefault.clear_at_least.value).toBe(140_000)
  })
})
