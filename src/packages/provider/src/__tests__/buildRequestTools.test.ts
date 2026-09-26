/**
 * Las herramientas de la petición del runtime de Anthropic: un esquema por
 * herramienta, `defer_loading` en las diferidas cuando la búsqueda está
 * activa, y el recorte de un despliegue de Foundry que ya rechazó la búsqueda.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { z } from 'zod/v4'
import { installAgentHostBindings } from '@thyrox/agent'
import { buildRequestTools } from '../claudeLegacyRuntime.js'
import { recordUnsupportedCapabilities, resetFoundryCapabilities } from '../foundryCapabilities.js'

const KEYS = ['ENABLE_TOOL_SEARCH', 'CLAUDE_CODE_USE_FOUNDRY', 'ANTHROPIC_FOUNDRY_RESOURCE', 'ANTHROPIC_API_KEY']
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
beforeAll(() => {
  installAgentHostBindings({} as never)
})
beforeEach(() => {
  for (const k of KEYS) delete process.env[k]
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
  resetFoundryCapabilities()
})
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  resetFoundryCapabilities()
})

const tool = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  inputSchema: z.object({ path: z.string() }),
  prompt: async () => `usa ${name}`,
  description: async () => name,
  isEnabled: () => true,
  ...extra,
})
const options = {
  model: 'claude-sonnet-4-5',
  getToolPermissionContext: async () => ({}),
  agents: [],
  querySource: 'repl_main_thread',
} as never

const names = (schemas: unknown[]) => schemas.map(s => (s as { name: string }).name)
const deferred = (schemas: unknown[]) =>
  schemas.filter(s => (s as { defer_loading?: boolean }).defer_loading).map(s => (s as { name: string }).name)

describe('buildRequestTools', () => {
  test('sin búsqueda de herramientas, un esquema por herramienta y ninguna diferida', async () => {
    process.env.ENABLE_TOOL_SEARCH = 'false'
    const schemas = await buildRequestTools(
      [tool('Read'), tool('ToolSearch'), tool('mcp__srv__x', { isMcp: true })] as never,
      options,
    )
    expect(names(schemas)).toEqual(['Read', 'ToolSearch', 'mcp__srv__x'])
    expect(deferred(schemas)).toEqual([])
  })

  test('con la búsqueda activa, las herramientas MCP van diferidas', async () => {
    process.env.ENABLE_TOOL_SEARCH = 'true'
    const schemas = await buildRequestTools(
      [tool('Read'), tool('ToolSearch'), tool('mcp__srv__x', { isMcp: true })] as never,
      options,
    )
    expect(deferred(schemas)).toEqual(['mcp__srv__x'])
  })

  test('un despliegue de Foundry que rechazó la búsqueda recibe las herramientas sin diferir', async () => {
    process.env.ENABLE_TOOL_SEARCH = 'true'
    process.env.CLAUDE_CODE_USE_FOUNDRY = '1'
    process.env.ANTHROPIC_FOUNDRY_RESOURCE = 'mi-recurso'
    recordUnsupportedCapabilities('claude-sonnet-4-5', ['tool_search'])
    const schemas = await buildRequestTools(
      [tool('Read'), tool('ToolSearch'), tool('mcp__srv__x', { isMcp: true })] as never,
      options,
    )
    expect(names(schemas)).toContain('mcp__srv__x')
    expect(deferred(schemas)).toEqual([])
  })

  // Lo anterior ya lo apaga la decisión de búsqueda (`qpe`); esto sólo lo
  // hace el recorte sobre la lista (`Apo`).
  test('un despliegue que rechazó structured_outputs recibe los esquemas sin strict', async () => {
    process.env.CLAUDE_CODE_USE_FOUNDRY = '1'
    process.env.ANTHROPIC_FOUNDRY_RESOURCE = 'mi-recurso'
    recordUnsupportedCapabilities('claude-sonnet-4-5', ['structured_outputs'])
    const schemas = await buildRequestTools([] as never, {
      ...(options as object),
      extraToolSchemas: [{ name: 'Salida', description: 's', input_schema: { type: 'object' }, strict: true }],
    } as never)
    expect(schemas).toEqual([{ name: 'Salida', description: 's', input_schema: { type: 'object' } }] as never)
  })
})
