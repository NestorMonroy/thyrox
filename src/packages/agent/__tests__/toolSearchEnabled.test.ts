/**
 * La decisión completa de la búsqueda de herramientas de 2.1.282: `iPn`
 * (`isToolSearchEnabled`), su veredicto previo `iyt` y el umbral automático
 * `Z5n` con sus dos caminos —tokens y, si el conteo no responde, caracteres—.
 */
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { installAgentHostBindings, type AgentHostBindings } from '../host.ts'
import {
  getAutoToolSearchCharThreshold,
  getAutoToolSearchPercentage,
  getAutoToolSearchTokenThreshold,
  getToolSearchUnavailableReason,
  isToolSearchEnabled,
  modelSupportsToolReference,
} from '../toolSearch.js'

const KEYS = [
  'ENABLE_TOOL_SEARCH',
  'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS',
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'ANTHROPIC_API_KEY',
]
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})
// Leer las betas del modelo exige credencial; una falsa basta, nada sale a red.
function env(values: Record<string, string | undefined>) {
  for (const k of KEYS) delete process.env[k]
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
  for (const [k, v] of Object.entries(values)) if (v !== undefined) process.env[k] = v
}

const debugLines: string[] = []
beforeAll(() => {
  installAgentHostBindings({
    logDebug: (message: string) => debugLines.push(message),
  } as unknown as AgentHostBindings)
})

type FakeTool = { name: string; isMcp?: boolean; prompt: () => Promise<string> }
const mcpTool = (promptChars: number): FakeTool => ({
  name: 'mcp__srv__tool',
  isMcp: true,
  prompt: async () => 'x'.repeat(promptChars),
})
const toolSearch: FakeTool = { name: 'ToolSearch', prompt: async () => '' }
const permissionContext = async () => ({}) as never
const decide = (model: string, tools: FakeTool[]) =>
  isToolSearchEnabled(model, tools as never, permissionContext, [], 'test')

describe('modelSupportsToolReference (z8)', () => {
  test('los modelos de la lista por defecto no admiten tool_reference', () => {
    expect(modelSupportsToolReference('claude-3-haiku-20240307')).toBe(false)
    expect(modelSupportsToolReference('Claude-3-5-Haiku-latest')).toBe(false)
    expect(modelSupportsToolReference('claude-sonnet-4-5')).toBe(true)
  })
})

describe('getToolSearchUnavailableReason (iyt)', () => {
  test('modelo sin tool_reference', () => {
    env({})
    expect(getToolSearchUnavailableReason('claude-3-haiku', [toolSearch] as never)).toBe(
      'model_unsupported',
    )
  })

  test('en Vertex, un modelo previo a 4.5 se rechaza y uno de 4.5 no', () => {
    env({ CLAUDE_CODE_USE_VERTEX: '1' })
    expect(getToolSearchUnavailableReason('claude-sonnet-4@20250514', [toolSearch] as never)).toBe(
      'vertex_model_unsupported',
    )
    expect(
      getToolSearchUnavailableReason('claude-sonnet-4-5@20250929', [toolSearch] as never),
    ).toBeUndefined()
  })

  test('con ToolSearch en la lista no hay razón', () => {
    env({})
    expect(getToolSearchUnavailableReason('claude-sonnet-4-5', [toolSearch] as never)).toBeUndefined()
  })

  test('sin herramientas, sin registro o sin ToolSearch disponible', () => {
    env({ ENABLE_TOOL_SEARCH: 'true' })
    expect(getToolSearchUnavailableReason('claude-sonnet-4-5', [])).toBe('no_tools_in_request')
    expect(getToolSearchUnavailableReason('claude-sonnet-4-5', [mcpTool(1)] as never)).toBe(
      'mcp_search_unavailable',
    )
    env({ ENABLE_TOOL_SEARCH: 'false' })
    expect(getToolSearchUnavailableReason('claude-sonnet-4-5', [mcpTool(1)] as never)).toBe(
      'not_registered',
    )
  })
})

describe('umbrales automáticos (gEe, ryt, V5n)', () => {
  test('el porcentaje sale de auto:N y por defecto es 10', () => {
    env({})
    expect(getAutoToolSearchPercentage()).toBe(10)
    env({ ENABLE_TOOL_SEARCH: 'auto' })
    expect(getAutoToolSearchPercentage()).toBe(10)
    env({ ENABLE_TOOL_SEARCH: 'auto:25' })
    expect(getAutoToolSearchPercentage()).toBe(25)
  })

  test('el umbral de caracteres es 2.5 veces el de tokens', () => {
    env({ ENABLE_TOOL_SEARCH: 'auto:5' })
    const tokens = getAutoToolSearchTokenThreshold('claude-3-7-sonnet')
    expect(tokens).toBeGreaterThan(0)
    expect(getAutoToolSearchCharThreshold('claude-3-7-sonnet')).toBe(Math.floor(tokens * 2.5))
  })
})

describe('isToolSearchEnabled (iPn)', () => {
  test('un modelo sin tool_reference la deshabilita y lo dice', async () => {
    env({ ENABLE_TOOL_SEARCH: 'true' })
    debugLines.length = 0
    expect(await decide('claude-3-haiku', [toolSearch, mcpTool(10)])).toBe(false)
    expect(debugLines.some(l => l.includes('does not support tool_reference'))).toBe(true)
  })

  test('el modo tst la habilita y el modo standard no', async () => {
    env({ ENABLE_TOOL_SEARCH: 'true' })
    expect(await decide('claude-sonnet-4-5', [toolSearch, mcpTool(10)])).toBe(true)
    env({ ENABLE_TOOL_SEARCH: 'false' })
    expect(await decide('claude-sonnet-4-5', [toolSearch, mcpTool(10)])).toBe(false)
  })

  test('en auto, decide el tamaño de las herramientas diferidas contra el umbral', async () => {
    env({ ENABLE_TOOL_SEARCH: 'auto:1' })
    expect(await decide('claude-3-7-sonnet', [toolSearch, mcpTool(200_000)])).toBe(true)
    expect(await decide('claude-3-7-sonnet', [toolSearch, mcpTool(20)])).toBe(false)
  })
})
