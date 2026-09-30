/**
 * TASK-THYROX-0324 parte C: el listado de skills no ramifica por NODE_ENV.
 * La función equivalente del ejecutable 2.1.283 (`u$n`, chunk-csayct82.js)
 * sólo se salta el listado si el agente no tiene la herramienta Skill; no
 * consulta el entorno. La rama `NODE_ENV === 'test'` devolvía `[]` sólo
 * bajo `bun test`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { getAttachments, resetSentSkillNames } from '../attachments.ts'
import { installAgentHostBindings } from '../host.ts'
import { installCommandRegistryHostBindings } from '@thyrox/command-runtime'
import { FileStateCache } from '@thyrox/tool-registry/fileStateCache'
import { getEmptyToolPermissionContext, type ToolUseContext } from '@thyrox/tool-registry/Tool.js'

function contextWith(toolNames: string[]): ToolUseContext {
  return {
    options: {
      tools: toolNames.map(name => ({ name, aliases: [] })),
      mainLoopModel: 'claude-sonnet-5',
      mcpClients: [],
      commands: [],
      agentDefinitions: { activeAgents: [], allAgents: [] },
    },
    getAppState: () => ({
      mcp: { commands: [], clients: [], tools: [] },
      toolPermissionContext: getEmptyToolPermissionContext(),
      agentDefinitions: { activeAgents: [], allAgents: [] },
    }),
    messages: [],
    readFileState: new FileStateCache(100, 1_000_000),
    nestedMemoryAttachmentTriggers: new Set(),
    loadedNestedMemoryPaths: new Set(),
    dynamicSkillDirTriggers: new Set(),
  } as unknown as ToolUseContext
}

beforeEach(() => {
  installAgentHostBindings({})
  // Inyecta el registro de comandos que el ejecutable obtiene de sus skills.
  installCommandRegistryHostBindings({
    getSkillToolCommands: async () => [
      { name: 'demo-skill', description: 'Skill de prueba', type: 'prompt', source: 'projectSettings', loadedFrom: 'skills' },
    ],
    getMcpSkillCommands: () => [],
  } as never)
  resetSentSkillNames()
})
afterEach(() => resetSentSkillNames())

describe('getAttachments y el listado de skills bajo NODE_ENV=test', () => {
  test('con la herramienta Skill anuncia los skills disponibles', async () => {
    expect(process.env.NODE_ENV).toBe('test')
    const attachments = await getAttachments(null, contextWith(['Skill']), null, [])
    expect(attachments.map(a => a.type)).toContain('skill_listing')
  })

  test('sin la herramienta Skill no anuncia nada', async () => {
    const attachments = await getAttachments(null, contextWith(['Bash']), null, [])
    expect(attachments.map(a => a.type)).not.toContain('skill_listing')
  })
})
