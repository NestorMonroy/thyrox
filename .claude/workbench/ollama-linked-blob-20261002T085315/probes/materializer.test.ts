
describe('el montaje declara su modo y se prepara antes de crear la unidad (TASK-THYROX-0782)', () => {
  function primitiveWithMount(podman: RecordingPodman, mount: ArtifactMount): PodmanModelUnitMaterializer {
    return new PodmanModelUnitMaterializer({
      podman,
      currentGeneration: async () => generation,
      profiles: { ollama: { image: 'docker.io/ollama/ollama:0.35.0', containerPort: 11_434, environment: {}, artifactMount: mount } },
      owner: { kind: 'model-coordinator', id: 'host-coordinator', pid: 4321 },
      limits: { cpus: 2, memoryMib: 4_096, pidsLimit: 256 },
      allocatePort: async () => PORT,
      now: () => NOW,
    })
  }

  test('un montaje rw llega a la unidad como rw, preparado antes del create', async () => {
    const podman = healthyPodman()
    const staged: string[] = []
    const mount: ArtifactMount = {
      hostDirectory: artifact => `/srv/models-${artifact.artifactId}`, containerDirectory: '/root/.ollama/models', mode: 'rw',
      stage: async artifact => { staged.push(`${artifact.artifactId}@${podman.calls.length}`) },
    }
    expect((await primitiveWithMount(podman, mount).materialize(GRANT)).status).toBe('materialized')
    const create = podman.calls.find(call => call[0] === 'create')!.join(' ')
    expect(create).toContain(`-v /srv/models-${GRANT.artifact.artifactId}:/root/.ollama/models:rw`)
    expect(staged).toHaveLength(1)
    expect(Number(staged[0]!.split('@')[1])).toBeLessThanOrEqual(podman.calls.findIndex(call => call[0] === 'create'))
  })

  test('un staging que falla no crea la unidad y lo dice', async () => {
    const podman = healthyPodman()
    const mount: ArtifactMount = {
      hostDirectory: () => '/srv/x', containerDirectory: '/root/.ollama/models', mode: 'rw',
      stage: async () => { throw new Error('falta el artefacto en la caché') },
    }
    const outcome = await primitiveWithMount(podman, mount).materialize(GRANT)
    expect(outcome.status).toBe('failed')
    expect(JSON.stringify(outcome)).toContain('falta el artefacto en la caché')
    expect(podman.calls.some(call => call[0] === 'create')).toBe(false)
  })
})
