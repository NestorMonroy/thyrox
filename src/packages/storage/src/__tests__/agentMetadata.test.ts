import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  deleteRemoteAgentMetadata,
  listRemoteAgentMetadata,
  readAgentMetadata,
  readRemoteAgentMetadata,
  writeAgentMetadata,
  writeRemoteAgentMetadata,
} from '../agentMetadata.js'
import { setOriginalCwd, setSessionId, setSessionProjectDir } from '../sessionPaths.js'

let configDir: string
const ORIGINAL_ENV = process.env.CLAUDE_CONFIG_DIR

beforeEach(async () => {
  configDir = await mkdtemp(join(tmpdir(), 'agent-metadata-'))
  process.env.CLAUDE_CONFIG_DIR = configDir
  setSessionProjectDir(join(configDir, 'projects', 'proyecto-agentes'))
  setSessionId('sesion-agentmetadata-1')
  setOriginalCwd('/home/user/no-deberia-usarse')
})

afterEach(async () => {
  if (ORIGINAL_ENV === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_ENV
  setSessionProjectDir(null)
  await rm(configDir, { recursive: true, force: true })
})

describe('writeAgentMetadata / readAgentMetadata', () => {
  test('round-trip: lo que se escribe se lee igual', async () => {
    const metadata = {
      agentType: 'general-purpose',
      worktreePath: '/home/user/wt-1',
      description: 'buscar un bug',
      name: 'find-bug',
    }
    await writeAgentMetadata('agent-1', metadata)
    expect(await readAgentMetadata('agent-1')).toEqual(metadata)
  })

  test('leer metadata de un agente sin archivo devuelve null, no lanza', async () => {
    expect(await readAgentMetadata('agent-jamas-escrito')).toBeNull()
  })

  test('los campos opcionales pueden faltar', async () => {
    await writeAgentMetadata('agent-2', { agentType: 'oracle' })
    expect(await readAgentMetadata('agent-2')).toEqual({ agentType: 'oracle' })
  })
})

describe('writeRemoteAgentMetadata / readRemoteAgentMetadata / deleteRemoteAgentMetadata', () => {
  test('round-trip completo', async () => {
    const metadata = {
      taskId: 'task-1',
      remoteTaskType: 'review',
      sessionId: 'ccr-sesion-1',
      title: 'Revisar PR',
      command: 'code-review',
      spawnedAt: 1234567890,
    }
    await writeRemoteAgentMetadata('task-1', metadata)
    expect(await readRemoteAgentMetadata('task-1')).toEqual(metadata)

    await deleteRemoteAgentMetadata('task-1')
    expect(await readRemoteAgentMetadata('task-1')).toBeNull()
  })

  test('borrar metadata inexistente no lanza', async () => {
    await expect(
      deleteRemoteAgentMetadata('task-jamas-existio'),
    ).resolves.toBeUndefined()
  })
})

describe('listRemoteAgentMetadata', () => {
  test('sin directorio remote-agents/, devuelve []', async () => {
    expect(await listRemoteAgentMetadata()).toEqual([])
  })

  test('lista todos los sidecar .meta.json escritos', async () => {
    await writeRemoteAgentMetadata('task-a', {
      taskId: 'task-a',
      remoteTaskType: 'review',
      sessionId: 'ccr-a',
      title: 'A',
      command: 'cmd-a',
      spawnedAt: 1,
    })
    await writeRemoteAgentMetadata('task-b', {
      taskId: 'task-b',
      remoteTaskType: 'review',
      sessionId: 'ccr-b',
      title: 'B',
      command: 'cmd-b',
      spawnedAt: 2,
    })

    const all = await listRemoteAgentMetadata()
    expect(all).toHaveLength(2)
    expect(all.map(m => m.taskId).sort()).toEqual(['task-a', 'task-b'])
  })

  test('un archivo .meta.json corrupto se salta sin abortar el resto', async () => {
    await writeRemoteAgentMetadata('task-bueno', {
      taskId: 'task-bueno',
      remoteTaskType: 'review',
      sessionId: 'ccr-bueno',
      title: 'Bueno',
      command: 'cmd',
      spawnedAt: 1,
    })
    const remoteAgentsDir = join(
      configDir,
      'projects',
      'proyecto-agentes',
      'sesion-agentmetadata-1',
      'remote-agents',
    )
    await mkdir(remoteAgentsDir, { recursive: true })
    await writeFile(
      join(remoteAgentsDir, 'remote-agent-task-corrupto.meta.json'),
      '{ esto no es JSON válido',
    )

    const all = await listRemoteAgentMetadata()
    expect(all).toHaveLength(1)
    expect(all[0]?.taskId).toBe('task-bueno')
  })

  test('ignora archivos que no terminan en .meta.json — aunque el CONTENIDO sea JSON válido', async () => {
    // Un .txt con contenido JSON parseable: si el filtro de sufijo no
    // discriminara, esta entrada colaría igual (a diferencia del archivo
    // corrupto del test anterior, cuyo fallo real es el JSON.parse, no el
    // filtro de nombre).
    const remoteAgentsDir = join(
      configDir,
      'projects',
      'proyecto-agentes',
      'sesion-agentmetadata-1',
      'remote-agents',
    )
    await mkdir(remoteAgentsDir, { recursive: true })
    await writeFile(
      join(remoteAgentsDir, 'notas.txt'),
      JSON.stringify({
        taskId: 'no-deberia-aparecer',
        remoteTaskType: 'review',
        sessionId: 'x',
        title: 'x',
        command: 'x',
        spawnedAt: 1,
      }),
    )

    expect(await listRemoteAgentMetadata()).toEqual([])
  })
})
