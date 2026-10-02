
describe('una unidad de Transformers con el artefacto del grant montado (TASK-THYROX-0761)', () => {
  const T5_GRANT: ExecutionGrant = {
    ...GRANT, runtime: 'transformers', placement: { kind: 'cpu' },
    artifact: { ...resolvedArtifact({ artifactId: SHA, quantization: 'f32' }), format: 'safetensors' },
  }
  const TRANSFORMERS_IMAGE = 'localhost/thyrox-transformers-runtime:dev'

  function transformersPrimitive(podman: RecordingPodman): PodmanModelUnitMaterializer {
    return new PodmanModelUnitMaterializer({
      podman,
      currentGeneration: async () => generation,
      profiles: {
        transformers: {
          image: TRANSFORMERS_IMAGE, containerPort: 8_080, environment: {},
          artifactMount: { hostDirectory: artifact => `/srv/artifacts/${artifact.artifactId}`, containerDirectory: '/model' },
        },
      },
      owner: { kind: 'model-coordinator', id: 'host-coordinator', pid: 4321 },
      limits: { cpus: 2, memoryMib: 4_096, pidsLimit: 256 },
      allocatePort: async () => PORT,
      now: () => NOW,
    })
  }

  test('expone el artefacto concedido de sólo lectura en la unidad', async () => {
    const podman = healthyPodman()
    const outcome = await transformersPrimitive(podman).materialize(T5_GRANT)
    expect(outcome.status).toBe('materialized')
    const create = podman.calls.find(call => call[0] === 'create')!.join(' ')
    expect(create).toContain(`-v /srv/artifacts/${SHA}:/model:ro`)
    expect(create).toContain(TRANSFORMERS_IMAGE)
  })

  test('un perfil sin montaje declarado no monta nada, como el de Ollama', async () => {
    const podman = healthyPodman()
    await primitiveWith(podman).materialize(GRANT)
    expect(podman.calls.find(call => call[0] === 'create')!).not.toContain('-v')
  })

  test('una unidad de Transformers se reconstruye desde sus etiquetas', async () => {
    const podman = healthyPodman()
    await transformersPrimitive(podman).materialize(T5_GRANT)
    const create = podman.calls.find(call => call[0] === 'create')!
    const labels = Object.fromEntries(create.flatMap((arg, index) => arg === '--label' ? [create[index + 1]!.split(/=(.*)/s).slice(0, 2)] : []))
    const listed = JSON.stringify([{ Id: CONTAINER_ID, Names: [`${MODEL_UNIT_CONTAINER_PREFIX}${modelUnitId(T5_GRANT.grantId)}`], Labels: labels, Pid: 4242 }])
    const units = await transformersPrimitive(healthyPodman({ ps: ok(listed) })).units()
    expect(units).toHaveLength(1)
    expect(units[0]).toMatchObject({ runtime: 'transformers', artifact: T5_GRANT.artifact })
  })
})
