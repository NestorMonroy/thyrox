/**
 * `ensureResource` contra el Podman real: lo que el doble con estado supone y
 * sólo el Podman de verdad puede confirmar. La forma del JSON de
 * `podman container inspect`, la ruta donde Podman monta un secreto con
 * `type=mount`, que el valor no aparece en inspect ni en logs, y que recrear el
 * contenedor conserva el contenido del volumen con nombre.
 *
 * Usa objetos propios —contenedor, volumen y secreto con el identificador de
 * la ejecución— y los retira al final.
 *
 * Métrica: la acción y las razones que devuelve `ensureResource`, el contenido
 * que el ayudante lee dentro del contenedor y el texto de inspect y logs.
 * Ciega a: Podman rootless y a un servicio real como PostgreSQL, que mide la
 * materialización de thyrox-postgres.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { createPodmanExecutor } from '../podmanExecutor.js'
import { ensureResource, normalizeImageReference, type DesiredResource, type ResourceMaterializationDeps } from '../resourceMaterialization.js'
import { buildHelperImage, canBuildHelperImage, type HelperImage } from '../testing/helperImage.js'

const RUN_ID = `${process.pid}-${Date.now()}`
const NAME = `thyrox-rm-real-${RUN_ID}`
const VOLUME = `thyrox-rm-real-volume-${RUN_ID}`
const SECRET = `thyrox-rm-real-secret-${RUN_ID}`
const SECRET_TARGET = 'probe-password'
const SECRET_VALUE = `real-secret-${RUN_ID}-value`
const MARKER_PATH = '/data/marker'
const MARKER_TEXT = 'durable'
const REAL_TEST_TIMEOUT_MS = 120_000

const podmanAvailable = await canBuildHelperImage()
if (!podmanAvailable) console.error('resourceMaterialization.real: sin Podman o sin gcc en el anfitrión; sin medir.')

const podman = createPodmanExecutor()
const deps: ResourceMaterializationDeps = {
  podman,
  isProcessAlive: pid => {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  },
  sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
}
const secrets = new Map([[SECRET, SECRET_VALUE]])

let helper: HelperImage

function desired(environment: Record<string, string> = { PROBE_PASSWORD_FILE: `/run/secrets/${SECRET_TARGET}` }): DesiredResource {
  return {
    kind: 'infrastructure',
    name: NAME,
    owner: { kind: 'infrastructure', id: `rm-real-${RUN_ID}`, pid: process.pid },
    image: helper.image,
    network: { mode: 'none' },
    namedVolumes: [{ volume: VOLUME, destination: '/data' }],
    environment,
    secrets: [{ secret: SECRET, target: SECRET_TARGET }],
    command: ['/bin/helper', 'term', '0'],
    health: { command: ['/bin/helper', 'read', `/run/secrets/${SECRET_TARGET}`], timeoutSeconds: 10, intervalSeconds: 1 },
  }
}

async function execInside(...command: string[]) {
  return podman.run(['exec', NAME, ...command])
}

describe.skipIf(!podmanAvailable)('ensureResource contra Podman real', () => {
  beforeAll(async () => {
    helper = await buildHelperImage(`rm-real-${RUN_ID}`)
  }, REAL_TEST_TIMEOUT_MS)

  afterAll(async () => {
    await podman.run(['rm', '--force', NAME])
    await podman.run(['volume', 'rm', '--force', VOLUME])
    await podman.run(['secret', 'rm', SECRET])
    await helper?.dispose()
  }, REAL_TEST_TIMEOUT_MS)

  test('crea, monta el secreto como archivo y no publica su valor', async () => {
    const outcome = await ensureResource(deps, desired(), secrets)
    expect(outcome).toMatchObject({ action: 'created', created: true, started: true, health: 'healthy', drift: [] })
    expect(outcome.volumes).toEqual([{ volume: VOLUME, state: 'created' }])

    const read = await execInside('/bin/helper', 'read', `/run/secrets/${SECRET_TARGET}`)
    expect(read.stdout).toBe(SECRET_VALUE)

    const inspect = await podman.run(['container', 'inspect', NAME])
    expect(inspect.exitCode).toBe(0)
    expect(inspect.stdout).not.toContain(SECRET_VALUE)
    const [document] = JSON.parse(inspect.stdout)
    expect(document.State.Status).toBe('running')
    expect(document.Config.Image).toBe(normalizeImageReference(helper.image))
    expect(document.Mounts.filter((mount: { Type: string }) => mount.Type === 'volume'))
      .toMatchObject([{ Type: 'volume', Name: VOLUME, Destination: '/data' }])

    const logs = await podman.run(['logs', NAME])
    expect(`${logs.stdout}${logs.stderr}`).not.toContain(SECRET_VALUE)
  }, REAL_TEST_TIMEOUT_MS)

  test('la misma declaración se conserva', async () => {
    const outcome = await ensureResource(deps, desired(), secrets)
    expect(outcome).toMatchObject({ action: 'kept', drift: [], health: 'healthy' })
    expect(outcome.volumes).toEqual([{ volume: VOLUME, state: 'preserved' }])
  }, REAL_TEST_TIMEOUT_MS)

  test('recrear por deriva de configuración conserva el contenido del volumen', async () => {
    const written = await execInside('/bin/helper', 'write', MARKER_PATH, MARKER_TEXT)
    expect(written.exitCode).toBe(0)
    const environment = { PROBE_PASSWORD_FILE: `/run/secrets/${SECRET_TARGET}`, PROBE_GENERATION: '2' }
    const outcome = await ensureResource(deps, desired(environment), secrets)
    expect(outcome).toMatchObject({ action: 'recreated', drift: ['configuration'], health: 'healthy' })
    const read = await execInside('/bin/helper', 'read', MARKER_PATH)
    expect(read.stdout).toBe(MARKER_TEXT)
  }, REAL_TEST_TIMEOUT_MS)
})
