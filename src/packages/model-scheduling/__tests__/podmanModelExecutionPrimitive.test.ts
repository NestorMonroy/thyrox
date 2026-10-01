/**
 * `PodmanModelExecutionPrimitive` contra un `PodmanExecutor` doble que anota
 * cada argv. Qué haría fallar a esta suite: tocar Podman con un grant
 * caducado, de generación vieja o con la coordinación caída; una unidad sin la
 * identidad que la reconciliación necesita; una materialización a medias que
 * no se declara `partial`; un `destroy` que confunde «no existía» con «falló»;
 * o cualquier borrado de imágenes o volúmenes.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import type { PodmanCommandResult, PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { MODEL_UNIT_CONTAINER_PREFIX, MODEL_UNIT_LABELS, PodmanModelExecutionPrimitive } from '../podmanModelExecutionPrimitive.ts'

const NOW = new Date('2026-10-01T00:30:00.000Z')
const PORT = 61_234
const GPU = 'GPU-6a9c1d2e-0000-0000-0000-000000000000'
const SHA = 'b'.repeat(64)
const CONTAINER_ID = 'c0ffee'.repeat(10) + 'abcd'
const GRANT: ExecutionGrant = {
  grantId: 'grant-request-1',
  requestId: 'request-1',
  artifact: resolvedArtifact({ artifactId: SHA }),
  runtime: 'ollama',
  placement: { kind: 'gpu', devices: [GPU] },
  residency: { mode: 'create', instance: 'residency/qwen/gpu0', generation: 3 },
  residencyVramMib: 900,
  requestVramMib: 200,
  contextLength: 4_096,
  kvCacheType: 'f16',
  issuedAt: '2026-10-01T00:00:00.000Z',
  expiresAt: '2026-10-01T01:00:00.000Z',
}

type PodmanReply = (args: readonly string[]) => PodmanCommandResult

class RecordingPodman implements PodmanExecutor {
  readonly calls: string[][] = []
  constructor(private readonly respond: PodmanReply) {}
  async run(args: readonly string[]): Promise<PodmanCommandResult> {
    this.calls.push([...args])
    return this.respond(args)
  }
}

const ok = (stdout = ''): PodmanCommandResult => ({ exitCode: 0, stdout, stderr: '' })
const fail = (stderr: string): PodmanCommandResult => ({ exitCode: 125, stdout: '', stderr })

function inspectJson(): string {
  return JSON.stringify([{ Id: CONTAINER_ID, State: { Pid: 4242, CgroupPath: '/machine.slice/libpod-x.scope' } }])
}

/** Un Podman que crea, arranca e inspecciona sin quejarse. */
function healthyPodman(overrides: Partial<Record<string, PodmanCommandResult>> = {}): RecordingPodman {
  return new RecordingPodman(args => overrides[args[0]!] ?? (args[0] === 'create' ? ok(`${CONTAINER_ID}\n`) : args[0] === 'inspect' ? ok(inspectJson()) : ok()))
}

let generation: number | 'unavailable'

function primitiveWith(podman: RecordingPodman): PodmanModelExecutionPrimitive {
  return new PodmanModelExecutionPrimitive({
    podman,
    currentGeneration: async () => generation,
    profiles: { ollama: { image: 'docker.io/ollama/ollama:0.35.0', environment: port => ({ OLLAMA_HOST: `127.0.0.1:${port}` }) } },
    allocatePort: async () => PORT,
    now: () => NOW,
  })
}

function verbs(podman: RecordingPodman): string[] {
  return podman.calls.map(call => call[0]!)
}

beforeEach(() => {
  generation = GRANT.residency.generation
})

describe('PodmanModelExecutionPrimitive: rechazar sin tocar Podman', () => {
  test('un grant caducado', async () => {
    const podman = healthyPodman()
    const outcome = await primitiveWith(podman).materialize({ ...GRANT, expiresAt: '2026-10-01T00:10:00.000Z' })
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'expired_grant' })
    expect(podman.calls).toEqual([])
  })

  test('un grant de una generación que ya no es la vigente', async () => {
    generation = 4
    const podman = healthyPodman()
    expect(await primitiveWith(podman).materialize(GRANT)).toMatchObject({ status: 'rejected', reason: 'stale_generation' })
    expect(podman.calls).toEqual([])
  })

  test('con la coordinación no disponible', async () => {
    generation = 'unavailable'
    const podman = healthyPodman()
    expect(await primitiveWith(podman).materialize(GRANT)).toMatchObject({ status: 'rejected', reason: 'stale_generation' })
    expect(podman.calls).toEqual([])
  })

  test('un runtime sin perfil de contenedor', async () => {
    const podman = healthyPodman()
    expect(await primitiveWith(podman).materialize({ ...GRANT, runtime: 'llama.cpp' })).toMatchObject({ status: 'failed', partial: false })
    expect(podman.calls).toEqual([])
  })
})

describe('PodmanModelExecutionPrimitive: materializar', () => {
  test('crea, arranca e inspecciona; la unidad lleva su identidad completa', async () => {
    const podman = healthyPodman()
    const outcome = await primitiveWith(podman).materialize(GRANT)
    if (outcome.status !== 'materialized') throw new Error(JSON.stringify(outcome))
    expect(verbs(podman)).toEqual(['create', 'start', 'inspect'])
    expect(outcome.unit).toMatchObject({
      grantId: GRANT.grantId, artifact: GRANT.artifact, residencyKey: GRANT.residency.instance,
      generation: 3, runtime: 'ollama', endpoint: `http://127.0.0.1:${PORT}`, containerId: CONTAINER_ID,
      devices: [GPU], hostPids: [4242], cgroup: '/machine.slice/libpod-x.scope', createdAt: NOW.toISOString(),
    })
  })

  test('el contenedor va en loopback, con el dispositivo concedido y las etiquetas de la unidad', async () => {
    const podman = healthyPodman()
    const outcome = await primitiveWith(podman).materialize(GRANT)
    if (outcome.status !== 'materialized') throw new Error(JSON.stringify(outcome))
    const create = podman.calls[0]!.join(' ')
    expect(create).toContain('--network host')
    expect(create).toContain(`OLLAMA_HOST=127.0.0.1:${PORT}`)
    expect(create).toContain(`nvidia.com/gpu=${GPU}`)
    expect(create).toContain(`--name ${MODEL_UNIT_CONTAINER_PREFIX}${outcome.unit.unitId}`)
    for (const [key, value] of [
      [MODEL_UNIT_LABELS.unit, outcome.unit.unitId], [MODEL_UNIT_LABELS.grant, GRANT.grantId],
      [MODEL_UNIT_LABELS.residency, GRANT.residency.instance], [MODEL_UNIT_LABELS.generation, '3'], [MODEL_UNIT_LABELS.sha256, SHA],
      [MODEL_UNIT_LABELS.model, GRANT.artifact.modelId], [MODEL_UNIT_LABELS.revision, GRANT.artifact.revision],
      [MODEL_UNIT_LABELS.quantization, GRANT.artifact.quantization], [MODEL_UNIT_LABELS.format, 'gguf'],
      [MODEL_UNIT_LABELS.repository, GRANT.artifact.repository], [MODEL_UNIT_LABELS.source, 'hf'], [MODEL_UNIT_LABELS.bytes, String(GRANT.artifact.bytes)],
    ]) expect(create).toContain(`--label ${key}=${value}`)
    expect(podman.calls[0]).toContain('docker.io/ollama/ollama:0.35.0')
  })

  test('en CPU no pide dispositivos', async () => {
    const podman = healthyPodman()
    await primitiveWith(podman).materialize({ ...GRANT, placement: { kind: 'cpu' } })
    expect(podman.calls[0]!.join(' ')).not.toContain('nvidia.com/gpu')
  })

  test('si create falla no quedó nada: partial false', async () => {
    const podman = healthyPodman({ create: fail('image not known') })
    expect(await primitiveWith(podman).materialize(GRANT)).toMatchObject({ status: 'failed', partial: false })
  })

  test('si start falla quedó un contenedor: partial true con su unitId', async () => {
    const podman = healthyPodman({ start: fail('crun: no device') })
    const outcome = await primitiveWith(podman).materialize(GRANT)
    expect(outcome).toMatchObject({ status: 'failed', partial: true })
    expect(outcome.status === 'failed' && outcome.unitId).toBeTruthy()
  })
})

describe('PodmanModelExecutionPrimitive: destruir y listar', () => {
  test('destroy distingue destruido, ausente y fallido', async () => {
    expect(await primitiveWith(healthyPodman()).destroy('unit-a')).toBe('destroyed')
    expect(await primitiveWith(healthyPodman({ rm: fail('Error: no container with name or ID "thyrox-model-unit-a" found: no such container') })).destroy('unit-a')).toBe('absent')
    expect(await primitiveWith(healthyPodman({ rm: fail('Error: cannot remove container: device busy') })).destroy('unit-a')).toBe('failed')
  })

  test('destroy retira sólo el contenedor de la unidad', async () => {
    const podman = healthyPodman()
    await primitiveWith(podman).destroy('unit-a')
    expect(podman.calls).toHaveLength(1)
    expect(podman.calls[0]![0]).toBe('rm')
    expect(podman.calls[0]).toContain(`${MODEL_UNIT_CONTAINER_PREFIX}unit-a`)
  })

  test('units reconstruye cada unidad de sus etiquetas e ignora contenedores ajenos', async () => {
    const labels = {
      [MODEL_UNIT_LABELS.unit]: 'unit-a', [MODEL_UNIT_LABELS.grant]: 'grant-a', [MODEL_UNIT_LABELS.model]: GRANT.artifact.modelId,
      [MODEL_UNIT_LABELS.repository]: GRANT.artifact.repository, [MODEL_UNIT_LABELS.source]: GRANT.artifact.source,
      [MODEL_UNIT_LABELS.revision]: GRANT.artifact.revision, [MODEL_UNIT_LABELS.format]: GRANT.artifact.format,
      [MODEL_UNIT_LABELS.quantization]: GRANT.artifact.quantization, [MODEL_UNIT_LABELS.bytes]: String(GRANT.artifact.bytes),
      [MODEL_UNIT_LABELS.residency]: 'residency/qwen/gpu0', [MODEL_UNIT_LABELS.generation]: '3', [MODEL_UNIT_LABELS.sha256]: SHA,
      [MODEL_UNIT_LABELS.runtime]: 'ollama', [MODEL_UNIT_LABELS.port]: String(PORT), [MODEL_UNIT_LABELS.createdAt]: NOW.toISOString(),
    }
    const listed = JSON.stringify([
      { Id: CONTAINER_ID, Names: [`${MODEL_UNIT_CONTAINER_PREFIX}unit-a`], Labels: labels, Pid: 4242 },
      { Id: 'f'.repeat(64), Names: ['thyrox-redis'], Labels: { 'thyrox.owner': 'infra' }, Pid: 99 },
    ])
    const podman = healthyPodman({ ps: ok(listed) })
    const units = await primitiveWith(podman).units()
    expect(units).toHaveLength(1)
    expect(units[0]).toMatchObject({ unitId: 'unit-a', grantId: 'grant-a', generation: 3, artifact: GRANT.artifact, endpoint: `http://127.0.0.1:${PORT}`, containerId: CONTAINER_ID })
  })

  test('nunca borra imágenes ni volúmenes', async () => {
    const podman = healthyPodman()
    const primitive = primitiveWith(podman)
    await primitive.materialize(GRANT)
    await primitive.destroy('unit-a')
    expect(podman.calls.some(call => call[0] === 'rmi' || (call[0] === 'volume' && call[1] === 'rm') || (call[0] === 'image' && call[1] === 'rm'))).toBe(false)
  })
})

describe('PodmanModelExecutionPrimitive: identidad completa', () => {
  test('una unidad cuya identidad etiquetada está incompleta no es una unidad de esta primitiva', async () => {
    const labels = {
      [MODEL_UNIT_LABELS.unit]: 'unit-a', [MODEL_UNIT_LABELS.grant]: 'grant-a', [MODEL_UNIT_LABELS.model]: GRANT.artifact.modelId,
      [MODEL_UNIT_LABELS.residency]: 'residency/qwen/gpu0', [MODEL_UNIT_LABELS.generation]: '3', [MODEL_UNIT_LABELS.sha256]: SHA,
      [MODEL_UNIT_LABELS.runtime]: 'ollama', [MODEL_UNIT_LABELS.port]: String(PORT), [MODEL_UNIT_LABELS.createdAt]: NOW.toISOString(),
    }
    const listed = JSON.stringify([{ Id: CONTAINER_ID, Names: [`${MODEL_UNIT_CONTAINER_PREFIX}unit-a`], Labels: labels, Pid: 4242 }])
    expect(await primitiveWith(healthyPodman({ ps: ok(listed) })).units()).toEqual([])
  })
})
