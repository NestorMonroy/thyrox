import { beforeEach, describe, expect, test } from 'bun:test'

import {
  InvalidDesiredResourceError,
  LEGACY_ROLE_DRIFT,
  RESOURCE_KIND_LABEL_KEY,
  RESOURCE_NAME_LABEL_KEY,
  SECRET_REDACTION,
  ensureResource,
  type DesiredResource,
  type ResourceMaterializationDeps,
} from '../resourceMaterialization.js'
import { OWNER_ID_LABEL_KEY, OWNER_KIND_LABEL_KEY, OWNER_PID_LABEL_KEY, WORKER_CONTAINER_NAME_PREFIX } from '../workerContainerLifecycle.js'
import { FakePodmanHost } from '../testing/fakePodmanHost.js'

const PASSWORD = 'super-secret-value-4471'
const NAME = 'thyrox-postgres'
const VOLUME = 'thyrox-postgres-data'
const SECRET = 'thyrox-postgres-password'

function desired(overrides: Partial<DesiredResource> = {}): DesiredResource {
  return {
    kind: 'infrastructure',
    name: NAME,
    owner: { kind: 'infrastructure', id: 'infrastructure-bootstrap', pid: 4242 },
    image: 'docker.io/pgvector/pgvector:0.8.0-pg16',
    network: { mode: 'named', name: 'thyrox-infra' },
    publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: 55432, containerPort: 5432 }],
    namedVolumes: [{ volume: VOLUME, destination: '/var/lib/postgresql/data' }],
    environment: { POSTGRES_USER: 'thyrox', POSTGRES_DB: 'thyrox', POSTGRES_PASSWORD_FILE: '/run/secrets/postgres-password' },
    secrets: [{ secret: SECRET, target: 'postgres-password' }],
    restartPolicy: 'on-failure',
    health: { command: ['pg_isready', '-U', 'thyrox'], timeoutSeconds: 4, intervalSeconds: 1 },
    legacyRoleLabel: { key: 'io.thyrox.role', value: 'infrastructure' },
    ...overrides,
  }
}

const SECRETS = new Map([[SECRET, PASSWORD]])

let host: FakePodmanHost
let deps: ResourceMaterializationDeps

beforeEach(() => {
  host = new FakePodmanHost()
  host.networks.add('thyrox-infra')
  deps = { podman: host, isProcessAlive: host.isProcessAlive, sleep: async () => {} }
})

/** Lo que ninguna convergencia hace nunca: retirar un volumen. */
function expectNoVolumeRemoved(): void {
  expect(host.calls.filter(argv => argv[0] === 'volume' && argv[1] === 'rm')).toEqual([])
  expect(host.calls.filter(argv => argv[0] === 'rm' && argv.includes('--volumes'))).toEqual([])
  expect(host.calls.filter(argv => argv[0] === 'rm' && argv.includes('-v'))).toEqual([])
}

/** El valor secreto no viaja en ningún argv ni queda en el entorno del contenedor. */
function expectSecretNeverPublished(): void {
  for (const argv of host.calls) expect(argv.join(' ')).not.toContain(PASSWORD)
  for (const container of host.containers.values()) expect(container.env.join(' ')).not.toContain(PASSWORD)
}

async function ensureHealthy(resource: DesiredResource = desired()) {
  host.healthyContainers.add(resource.name)
  return ensureResource(deps, resource, SECRETS)
}

describe('ensureResource — primera materialización', () => {
  test('ausente: crea el volumen, el secreto y el contenedor, arranca y comprueba la salud por separado', async () => {
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('created')
    expect(outcome.created).toBe(true)
    expect(outcome.started).toBe(true)
    expect(outcome.health).toBe('healthy')
    expect(outcome.drift).toEqual([])
    expect(outcome.volumes).toEqual([{ volume: VOLUME, state: 'created' }])
    expect(host.volumes.has(VOLUME)).toBe(true)
    // el volumen es de la infraestructura que lo declaró, no del proceso que lo creó
    const volumeLabels = host.volumeLabels.get(VOLUME) ?? {}
    expect(volumeLabels[OWNER_KIND_LABEL_KEY]).toBe('infrastructure')
    expect(volumeLabels[OWNER_ID_LABEL_KEY]).toBe("infrastructure-bootstrap")
    expect(volumeLabels[RESOURCE_KIND_LABEL_KEY]).toBe('infrastructure')
    expect(volumeLabels[RESOURCE_NAME_LABEL_KEY]).toBe(NAME)
    expect(Object.keys(volumeLabels)).not.toContain(OWNER_PID_LABEL_KEY)
    expect(host.secrets.get(SECRET)?.value).toBe(PASSWORD)
    const container = host.containers.get(NAME)
    expect(container?.labels[OWNER_KIND_LABEL_KEY]).toBe('infrastructure')
    expect(container?.mounts).toEqual([{ Type: 'volume', Name: VOLUME, Destination: '/var/lib/postgresql/data' }])
    expect(container?.secrets).toEqual([{ name: SECRET, target: 'postgres-password' }])
    expectSecretNeverPublished()
    expectNoVolumeRemoved()
  })

  test('el secreto viaja por stdin, nunca en argv', async () => {
    await ensureHealthy()
    expect(host.stdins).toContain(PASSWORD)
    const created = host.calls.find(argv => argv[0] === 'secret' && argv[1] === 'create')
    expect(created?.[created.length - 1]).toBe('-')
  })

  test('una red con nombre ausente se crea antes del contenedor', async () => {
    host.networks.clear()
    await ensureHealthy()
    const networkAt = host.calls.findIndex(argv => argv[0] === 'network' && argv[1] === 'create')
    const createAt = host.calls.findIndex(argv => argv[0] === 'create')
    expect(networkAt).toBeGreaterThanOrEqual(0)
    expect(networkAt).toBeLessThan(createAt)
  })

  test('sin salud declarada no ejecuta exec y lo dice', async () => {
    const outcome = await ensureResource(deps, desired({ health: undefined }), SECRETS)
    expect(outcome.health).toBe('not-declared')
    expect(host.calls.some(argv => argv[0] === 'exec')).toBe(false)
  })
})

describe('ensureResource — convergencia', () => {
  test('contenedor y volumen correctos: kept, sin create/rm/start, volumen preservado', async () => {
    await ensureHealthy()
    host.calls.length = 0
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('kept')
    expect(outcome.volumes).toEqual([{ volume: VOLUME, state: 'preserved' }])
    expect(host.calls.some(argv => ['create', 'rm', 'start'].includes(argv[0] as string))).toBe(false)
  })

  test('contenedor sobre otro volumen: recreated por deriva de volumen, el volumen anterior no se toca', async () => {
    await ensureHealthy()
    const container = host.containers.get(NAME)
    if (container) container.mounts = [{ Type: 'volume', Name: 'thyrox-postgres-wrong', Destination: '/var/lib/postgresql/data' }]
    host.volumes.add('thyrox-postgres-wrong')
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('recreated')
    expect(outcome.drift).toEqual(['volume'])
    expect(host.containers.get(NAME)?.mounts).toEqual([{ Type: 'volume', Name: VOLUME, Destination: '/var/lib/postgresql/data' }])
    expect(host.volumes.has('thyrox-postgres-wrong')).toBe(true)
    expect(host.volumes.has(VOLUME)).toBe(true)
    expectNoVolumeRemoved()
  })

  test('imagen distinta: recreated por deriva de imagen', async () => {
    await ensureHealthy()
    const outcome = await ensureHealthy(desired({ image: 'docker.io/pgvector/pgvector:0.8.1-pg16' }))
    expect(outcome.action).toBe('recreated')
    expect(outcome.drift).toEqual(['image'])
  })

  test('una imagen sin etiqueta es la misma que Podman guarda con :latest: no hay deriva de imagen', async () => {
    const untagged = desired({ image: 'localhost/thyrox-helper' })
    await ensureHealthy(untagged)
    const container = host.containers.get(NAME)
    if (container) container.image = 'localhost/thyrox-helper:latest'
    const outcome = await ensureHealthy(untagged)
    expect(outcome.action).toBe('kept')
    expect(outcome.drift).toEqual([])
  })

  test('entorno distinto: recreated por deriva de configuración', async () => {
    await ensureHealthy()
    const resource = desired({ environment: { POSTGRES_USER: 'other', POSTGRES_DB: 'thyrox', POSTGRES_PASSWORD_FILE: '/run/secrets/postgres-password' } })
    const outcome = await ensureHealthy(resource)
    expect(outcome.drift).toEqual(['configuration'])
  })

  test('declaración de secretos distinta: recreated por deriva de declaración de secretos', async () => {
    await ensureHealthy()
    const outcome = await ensureHealthy(desired({ secrets: [{ secret: SECRET, target: 'pg-password' }] }))
    expect(outcome.drift).toEqual(['secret-declaration'])
  })

  test('valor del secreto distinto: se reemplaza por stdin y el contenedor se recrea', async () => {
    await ensureHealthy()
    const outcome = await ensureResource(deps, desired(), new Map([[SECRET, 'rotated-value-9']]))
    expect(outcome.drift).toEqual(['secret-value'])
    expect(host.secrets.get(SECRET)?.value).toBe('rotated-value-9')
    const replaced = host.calls.find(argv => argv[0] === 'secret' && argv[1] === 'create' && argv.includes('--replace'))
    expect(replaced).toBeDefined()
    for (const argv of host.calls) expect(argv.join(' ')).not.toContain('rotated-value-9')
  })

  test('running con el PID muerto: recreated por proceso stale', async () => {
    await ensureHealthy()
    host.killProcessOf(NAME)
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('recreated')
    expect(outcome.drift).toEqual(['stale-process'])
    expectNoVolumeRemoved()
  })

  // Tras reiniciar la VM, runc conserva el directorio de estado de un contenedor
  // cuyo proceso ya no existe, y rehúsa crear otro con el mismo ID (medido el
  // 2026-10-02 con thyrox-postgres). El recurso es de thyrox: lo converge la
  // primitiva recreándolo con un ID nuevo, una sola vez y sin tocar el volumen.
  const RUNC_STALE = { exitCode: 125, stdout: '', stderr: 'Error: OCI runtime error: unable to start container "abc": runc: runc create failed: container with given ID already exists' }

  function stopWithoutProcess(): void {
    const container = host.containers.get(NAME)
    if (container) { host.alivePids.delete(container.pid); container.status = 'created'; container.pid = 0 }
  }

  test('start rehusado por estado stale de runc: recreated una vez, volumen intacto', async () => {
    await ensureHealthy()
    stopWithoutProcess()
    host.failNextStarts.push(RUNC_STALE)
    const outcome = await ensureHealthy()
    expect(outcome).toMatchObject({ action: 'recreated', drift: ['stale-runtime-state'], created: true, started: true, health: 'healthy' })
    expect(outcome.volumes).toEqual([{ volume: VOLUME, state: 'preserved' }])
    expectNoVolumeRemoved()
  })

  test('start que falla por otra causa: failed, sin recrear', async () => {
    await ensureHealthy()
    stopWithoutProcess()
    host.calls.length = 0
    host.failNextStarts.push({ exitCode: 125, stdout: '', stderr: 'Error: some other start failure' })
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('failed')
    expect(outcome.failure?.stage).toBe('start')
    expect(host.calls.some(argv => argv[0] === 'rm' || argv[0] === 'create')).toBe(false)
  })

  test('el estado stale persiste tras recrear: failed, sin bucle', async () => {
    await ensureHealthy()
    stopWithoutProcess()
    host.calls.length = 0
    host.failNextStarts.push(RUNC_STALE, RUNC_STALE)
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('failed')
    expect(host.calls.filter(argv => argv[0] === 'create').length).toBe(1)
  })

  test('detenido sin deriva: started, sin recrear', async () => {
    await ensureHealthy()
    const container = host.containers.get(NAME)
    if (container) { host.alivePids.delete(container.pid); container.status = 'exited'; container.pid = 0 }
    host.calls.length = 0
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('started')
    expect(outcome.created).toBe(false)
    expect(outcome.started).toBe(true)
    expect(host.calls.some(argv => argv[0] === 'rm' || argv[0] === 'create')).toBe(false)
  })
})

describe('ensureResource — ownership', () => {
  test('un contenedor con ese nombre y otro dueño es una colisión: failed, sin tocarlo', async () => {
    host.seedContainer(NAME, {
      status: 'running', pid: 77, image: 'x', mounts: [], env: [], secrets: [],
      labels: { [OWNER_KIND_LABEL_KEY]: 'daemon', [OWNER_ID_LABEL_KEY]: 'daemon-1' },
    })
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('failed')
    expect(outcome.drift).toEqual(['ownership-collision'])
    expect(host.calls.some(argv => ['rm', 'create', 'start'].includes(argv[0] as string))).toBe(false)
    expect(host.containers.get(NAME)?.labels[OWNER_KIND_LABEL_KEY]).toBe('daemon')
  })

  test('un contenedor sin etiquetas de dueño y sin la etiqueta heredada declarada también es colisión', async () => {
    host.seedContainer(NAME, { status: 'running', pid: 78, image: 'x', mounts: [], env: [], secrets: [], labels: {} })
    const outcome = await ensureHealthy()
    expect(outcome.drift).toEqual(['ownership-collision'])
  })

  test('el predecesor que la declaración reconoce por su etiqueta heredada se migra: recreated', async () => {
    host.seedContainer(NAME, {
      status: 'running', pid: 79, image: 'docker.io/pgvector/pgvector:0.8.0-pg16', env: ['POSTGRES_PASSWORD=' + PASSWORD], secrets: [],
      mounts: [{ Type: 'volume', Name: VOLUME, Destination: '/var/lib/postgresql/data' }],
      labels: { 'io.thyrox.role': 'infrastructure' },
    })
    host.volumes.add(VOLUME)
    const outcome = await ensureHealthy()
    expect(outcome.action).toBe('recreated')
    expect(outcome.drift).toEqual([LEGACY_ROLE_DRIFT])
    expect(outcome.volumes).toEqual([{ volume: VOLUME, state: 'preserved' }])
    expect(host.containers.get(NAME)?.env.join(' ')).not.toContain(PASSWORD)
    expectNoVolumeRemoved()
  })
})

describe('ensureResource — salud y fallos', () => {
  test('running no es ready: sin salud, failed con su razón y created/started reportados aparte', async () => {
    const outcome = await ensureResource(deps, desired(), SECRETS)
    expect(outcome.action).toBe('failed')
    expect(outcome.created).toBe(true)
    expect(outcome.started).toBe(true)
    expect(outcome.health).toBe('unhealthy')
    expect(outcome.drift).toEqual(['health-failure'])
    expect(outcome.failure?.stage).toBe('health')
  })

  test('un fallo de create que repite el secreto no lo publica en el mensaje', async () => {
    host.failNextCreate = { exitCode: 126, stdout: `config ${PASSWORD}`, stderr: `Error: deadlock due to lock mismatch near ${PASSWORD}` }
    const outcome = await ensureResource(deps, desired(), SECRETS)
    expect(outcome.action).toBe('failed')
    expect(outcome.failure?.stage).toBe('create')
    expect(outcome.failure?.lockCollision).toBe(true)
    expect(outcome.failure?.message).not.toContain(PASSWORD)
    expect(outcome.failure?.message).toContain(SECRET_REDACTION)
  })
})

describe('ensureResource — validación antes de tocar Podman', () => {
  test('infraestructura con el prefijo de worker se rehúsa', async () => {
    await expect(ensureResource(deps, desired({ name: `${WORKER_CONTAINER_NAME_PREFIX}pg` }), SECRETS)).rejects.toBeInstanceOf(InvalidDesiredResourceError)
    expect(host.calls).toEqual([])
  })

  test('un worker sin el prefijo de worker se rehúsa', async () => {
    const worker = desired({ kind: 'worker', name: 'free-name', owner: { kind: 'pool', id: 'pool-1', pid: 9 } })
    await expect(ensureResource(deps, worker, SECRETS)).rejects.toBeInstanceOf(InvalidDesiredResourceError)
  })

  test('infraestructura con un dueño que no es infrastructure se rehúsa', async () => {
    const resource = desired({ owner: { kind: 'daemon', id: 'daemon-1', pid: 9 } })
    await expect(ensureResource(deps, resource, SECRETS)).rejects.toBeInstanceOf(InvalidDesiredResourceError)
  })

  test('un secreto declarado sin valor se rehúsa sin crear nada', async () => {
    await expect(ensureResource(deps, desired(), new Map())).rejects.toBeInstanceOf(InvalidDesiredResourceError)
    expect(host.calls).toEqual([])
  })

  test('un valor de entorno igual a un secreto se rehúsa: el secreto no viaja como entorno', async () => {
    const resource = desired({ environment: { POSTGRES_PASSWORD: PASSWORD } })
    await expect(ensureResource(deps, resource, SECRETS)).rejects.toBeInstanceOf(InvalidDesiredResourceError)
    expect(host.calls).toEqual([])
  })

  test('la red del anfitrión con puertos publicados se rehúsa', async () => {
    const resource = desired({ network: { mode: 'host' } })
    await expect(ensureResource(deps, resource, SECRETS)).rejects.toBeInstanceOf(InvalidDesiredResourceError)
  })
})

describe('ensureResource — provisión tras la salud', () => {
  const PROVISION = ['psql', '-v', 'ON_ERROR_STOP=1', '-U', 'thyrox', '-d', 'thyrox', '-c', 'CREATE EXTENSION IF NOT EXISTS vector']

  test('sano: aplica la provisión con exec, después de la salud', async () => {
    const outcome = await ensureHealthy(desired({ provision: [PROVISION] }))
    expect(outcome.provision).toBe('applied')
    const execs = host.calls.filter(call => call[0] === 'exec')
    expect(execs[execs.length - 1]).toEqual(['exec', NAME, ...PROVISION])
  })

  test('kept también provisiona: la provisión es idempotente y se reafirma en cada ensure', async () => {
    await ensureHealthy(desired({ provision: [PROVISION] }))
    host.calls.length = 0
    const outcome = await ensureHealthy(desired({ provision: [PROVISION] }))
    expect(outcome.action).toBe('kept')
    expect(outcome.provision).toBe('applied')
    expect(host.calls).toContainEqual(['exec', NAME, ...PROVISION])
  })

  test('una provisión que falla deja el recurso fallido, con su etapa', async () => {
    host.failingExecPrograms.add('psql')
    const outcome = await ensureHealthy(desired({ provision: [PROVISION] }))
    expect(outcome.action).toBe('failed')
    expect(outcome.provision).toBe('failed')
    expect(outcome.failure?.stage).toBe('provision')
  })

  test('la provisión no es configuración del contenedor: cambiarla no lo recrea', async () => {
    await ensureHealthy(desired())
    const outcome = await ensureHealthy(desired({ provision: [PROVISION] }))
    expect(outcome.action).toBe('kept')
  })
})
