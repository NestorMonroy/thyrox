/**
 * La observación de Podman es del paquete (P3): compone el argv de sólo
 * lectura, deriva las referencias y nunca emite un verbo que mute.
 */
import { describe, expect, test } from 'bun:test'

import { runExecutionCommand, type ExecutionCommandDeps } from '../executionCommand.ts'
import { inspectContainer, inspectVolume, snapshot } from '../podmanObservation.ts'
import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.ts'

const POSTGRES_ID = 'a'.repeat(64)
const IMAGE_ID = 'b'.repeat(64)
const UNUSED_IMAGE_ID = 'c'.repeat(64)
const CONTAINER = {
  Id: POSTGRES_ID, Name: 'thyrox-postgres', Image: IMAGE_ID, ImageName: 'docker.io/pgvector/pgvector:0.8.0-pg16', Created: 't0',
  State: { Status: 'running', Running: true, Pid: 42 }, Config: { Labels: { 'thyrox.owner-kind': 'infrastructure' } },
  HostConfig: { PortBindings: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55432' }] } },
  Mounts: [{ Type: 'volume', Name: 'thyrox-postgres-data', Source: '/v/_data', Destination: '/var/lib/postgresql/data', RW: true }],
}
const VOLUMES = [{ Name: 'thyrox-postgres-data', Mountpoint: '/v/_data', CreatedAt: 'c0', Labels: {} },
  { Name: 'spare', Mountpoint: '/s/_data', CreatedAt: 'c1', Labels: null }]
const IMAGES = [{ Id: IMAGE_ID, RepoTags: ['docker.io/pgvector/pgvector:0.8.0-pg16'], RepoDigests: [], Size: 10, Created: 'i0', Config: { Labels: {} } },
  { Id: UNUSED_IMAGE_ID, RepoTags: [], RepoDigests: ['ghcr.io/x@sha256:d'], Size: 20, Created: 'i1', Labels: { title: 'x' } }]

function ok(stdout: unknown): PodmanCommandResult {
  return { exitCode: 0, stdout: typeof stdout === 'string' ? stdout : JSON.stringify(stdout), stderr: '' }
}

function fakePodman(calls: string[][]): PodmanExecutor {
  return {
    async run(args) {
      calls.push([...args])
      const key = args.slice(0, 2).join(' ')
      if (key === 'container inspect') {
        return args[2] === POSTGRES_ID || args[2] === 'thyrox-postgres' ? ok([CONTAINER]) : { exitCode: 125, stdout: '', stderr: 'Error: no such container x' }
      }
      if (key === 'volume inspect') {
        const found = VOLUMES.filter(volume => args.slice(2).includes(volume.Name))
        return found.length ? ok(found) : { exitCode: 125, stdout: '', stderr: 'Error: no such volume x' }
      }
      if (key === 'ps --all') return ok(`${POSTGRES_ID}\n`)
      if (key === 'volume ls') return ok(VOLUMES.map(volume => volume.Name).join('\n'))
      if (key === 'images --all') return ok(`${IMAGE_ID}\n${UNUSED_IMAGE_ID}\n${IMAGE_ID}\n`)
      if (key === 'image inspect') return ok(IMAGES)
      if (key === 'info --format') return ok({ store: { graphRoot: '/var/lib/containers/storage' }, host: { databaseBackend: 'sqlite' }, version: { Version: '4.9.3' } })
      if (key === 'system df') {
        return ok(['Images space usage:', '',
          'REPOSITORY                   TAG         IMAGE ID      CREATED     SIZE    SHARED SIZE  UNIQUE SIZE  CONTAINERS',
          `docker.io/pgvector/pgvector  0.8.0-pg16  ${IMAGE_ID.slice(0, 12)}  13 months   10B     0B           10B          1`,
          `ghcr.io/x                    <none>      ${UNUSED_IMAGE_ID.slice(0, 12)}  46 hours    2.958GB  0B          20B          0`,
          '', 'Containers space usage:', ''].join('\n'))
      }
      if (key.startsWith('rmi')) return ok('')
      return { exitCode: 125, stdout: '', stderr: `inesperado: ${args.join(' ')}` }
    },
  }
}

describe('podmanObservation', () => {
  test('inspecciona un contenedor y su volumen con sus campos de identidad', async () => {
    const calls: string[][] = []
    const container = await inspectContainer(fakePodman(calls), 'thyrox-postgres')
    expect(container).toMatchObject({ id: POSTGRES_ID, name: 'thyrox-postgres', running: true, pid: 42,
      portBindings: { '5432/tcp': [{ hostIp: '127.0.0.1', hostPort: '55432' }] } })
    expect(container?.mounts[0]).toMatchObject({ type: 'volume', name: 'thyrox-postgres-data' })
    expect(await inspectVolume(fakePodman(calls), 'thyrox-postgres-data')).toMatchObject({ mountpoint: '/v/_data', createdAt: 'c0' })
  })

  test('lo que no existe es null, no un error', async () => {
    expect(await inspectContainer(fakePodman([]), 'missing')).toBeNull()
    expect(await inspectVolume(fakePodman([]), 'missing')).toBeNull()
  })

  test('la instantánea deriva qué contenedor usa cada volumen e imagen, y el tamaño propio', async () => {
    const calls: string[][] = []
    const state = await snapshot(fakePodman(calls))
    expect(state.storage).toEqual({ graphRoot: '/var/lib/containers/storage', databaseBackend: 'sqlite', version: '4.9.3' })
    expect(state.volumes.map(volume => [volume.name, volume.usedBy])).toEqual([['thyrox-postgres-data', ['thyrox-postgres']], ['spare', []]])
    expect(state.images.map(image => [image.id, image.usedBy, image.uniqueBytes])).toEqual([[IMAGE_ID, ['thyrox-postgres'], 10], [UNUSED_IMAGE_ID, [], 20]])
  })

  test('observar no emite ningún verbo que mute', async () => {
    const calls: string[][] = []
    await snapshot(fakePodman(calls))
    const verbs = new Set(calls.map(args => args[0]))
    for (const mutating of ['create', 'start', 'run', 'rm', 'rmi', 'stop', 'exec', 'build', 'kill']) expect(verbs.has(mutating)).toBe(false)
  })
})

function commandDeps(calls: string[][], output: string[]): ExecutionCommandDeps {
  return {
    env: {}, readStdin: async () => '', output: { stdout: text => output.push(text), stderr: text => output.push(text) },
    pid: 1, now: () => 0, podman: fakePodman(calls), repositoryRoot: '/repo', isProcessAlive: () => true,
  } as ExecutionCommandDeps
}

describe('podman-execution-execute observe / remove-image', () => {
  test('observe volume imprime el JSON del volumen', async () => {
    const output: string[] = []
    expect(await runExecutionCommand(['observe', 'volume', 'thyrox-postgres-data'], commandDeps([], output))).toBe(0)
    expect(JSON.parse(output.join(''))).toMatchObject({ name: 'thyrox-postgres-data', mountpoint: '/v/_data' })
  })

  test('observe de un recurso inexistente imprime null y sale 1', async () => {
    const output: string[] = []
    expect(await runExecutionCommand(['observe', 'container', 'missing'], commandDeps([], output))).toBe(1)
    expect(output.join('').trim()).toBe('null')
  })

  test('remove-image rehúsa una imagen que un contenedor usa', async () => {
    const calls: string[][] = []
    expect(await runExecutionCommand(['remove-image', '--task', 'TASK-THYROX-0001', '--id', IMAGE_ID], commandDeps(calls, []))).toBe(2)
    expect(calls.some(args => args[0] === 'rmi')).toBe(false)
  })

  test('remove-image retira una imagen sin usuarios, y exige la tarea', async () => {
    const calls: string[][] = []
    expect(await runExecutionCommand(['remove-image', '--task', 'TASK-THYROX-0001', '--id', UNUSED_IMAGE_ID], commandDeps(calls, []))).toBe(0)
    expect(calls).toContainEqual(['rmi', UNUSED_IMAGE_ID])
    expect(await runExecutionCommand(['remove-image', '--task', 'no-es-tarea', '--id', UNUSED_IMAGE_ID], commandDeps([], []))).toBe(2)
  })
})

describe('parseHumanSize', () => {
  test('lee las unidades decimales de Podman', async () => {
    const { parseHumanSize } = await import('../podmanObservation.ts')
    expect(parseHumanSize('2.958GB')).toBe(2_958_000_000)
    expect(parseHumanSize('161B')).toBe(161)
    expect(parseHumanSize('1.39kB')).toBe(1390)
    expect(() => parseHumanSize('mucho')).toThrow()
  })
})

describe('observe container --raw', () => {
  test('devuelve el documento completo, con los campos que la vista proyecta fuera', async () => {
    const output: string[] = []
    expect(await runExecutionCommand(['observe', 'container', 'thyrox-postgres', '--raw'], commandDeps([], output))).toBe(0)
    expect(JSON.parse(output.join(''))).toMatchObject({ Id: POSTGRES_ID, HostConfig: { PortBindings: { '5432/tcp': [{ HostPort: '55432' }] } } })
  })
})
