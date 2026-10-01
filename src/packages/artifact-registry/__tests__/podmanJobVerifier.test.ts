/**
 * La verificación como trabajo de la primitiva de Podman (TASK-THYROX-0728).
 *
 * Dos niveles. Con un Podman doble: qué argv compone el trabajo (red,
 * entorno, montajes, ninguna credencial) y cómo se lee su veredicto. Con el
 * Podman real y el registry de prueba en el loopback: que el trabajo
 * materializa y verifica el artefacto sin el almacenamiento de esta sesión.
 *
 * Métrica: el argv entregado a `podman create`, el reporte del montaje y el
 * resultado del verificador.
 * Ciega a: un registry real y su límite anónimo, que mide la publicación
 * de producción, no esta suite.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { EXECUTION_ID_LABEL_KEY, EXECUTION_KIND_LABEL_KEY, EXECUTION_REFERENCE_LABEL_KEY } from '@thyrox/podman-execution/executionAuthorization.ts'
import { createPodmanExecutor, type PodmanCommandResult, type PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { describeArtifactFile } from '../artifactFiles.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { createPodmanJobVerifier, VERIFICATION_REPORT_NAME, type PodmanJobVerifierOptions } from '../podmanJobVerifier.js'
import { FAKE_PUBLISHER, startFakeOciRegistry, type FakeOciRegistry } from '../testing/fakeOciRegistry.js'

const REPOSITORY_ROOT = resolve(import.meta.dir, '../../../..')
const PINNED = { repository: 'thyrox/lab', digest: 'sha256:' + 'a'.repeat(64) }
const LOCATION = { repository: 'thyrox/lab', tag: 'v1' }

let workdir: string
beforeEach(() => { workdir = mkdtempSync(join(tmpdir(), 'podman-job-verifier-')) })
afterEach(() => { rmSync(workdir, { recursive: true, force: true }) })

function options(overrides: Partial<PodmanJobVerifierOptions> = {}): PodmanJobVerifierOptions {
  return {
    podman: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    image: 'sha256:' + 'b'.repeat(64),
    bunPath: process.execPath,
    repositoryRoot: REPOSITORY_ROOT,
    scratchDir: join(workdir, 'scratch'),
    registryUrl: 'https://registry.example',
    egress: { kind: 'proxy', proxyUrl: 'http://10.1.2.3:3128', caBundlePath: '/host/ca.crt' },
    owner: { kind: 'pool', id: 'artifact-verify', pid: process.pid },
    workerId: 'artifact-verify-test',
    limits: { cpus: 1, memoryMib: 512, pidsLimit: 64 },
    ...overrides,
  }
}

/**
 * El doble que registra el argv de `podman create`; `wait` sale 0 para que el
 * trabajo se lea entero. El veredicto no importa aquí: lo que se mide es la
 * composición con la que el contenedor se materializa.
 */
function recordingPodman(): { podman: PodmanExecutor; created: string[][] } {
  const created: string[][] = []
  return {
    created,
    podman: {
      run: async (args): Promise<PodmanCommandResult> => {
        if (args[0] === 'create') created.push([...args])
        if (args[0] === 'wait') return { exitCode: 0, stdout: '0\n', stderr: '' }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
    },
  }
}

/** El argv con que `podman create` materializa el trabajo, leído del doble. */
async function createdArgv(overrides: Partial<PodmanJobVerifierOptions> = {}): Promise<string> {
  const recorder = recordingPodman()
  await createPodmanJobVerifier(options({ ...overrides, podman: recorder.podman })).verify(PINNED, LOCATION)
  return (recorder.created[0] ?? []).join(' ')
}

describe('la composición del trabajo', () => {
  test('con proxy: red host, el proxy declarado y el CA montado de sólo lectura', async () => {
    const argv = await createdArgv()
    expect(argv).toContain('--network host')
    expect(argv).toContain('--env HTTPS_PROXY=http://10.1.2.3:3128')
    expect(argv).toContain('--env NODE_EXTRA_CA_CERTS=/certs/ca-bundle.crt')
    expect(argv).toContain('-v /host/ca.crt:/certs/ca-bundle.crt:ro')
    expect(argv).toContain(`-v ${REPOSITORY_ROOT}:/w:ro`)
  })

  test('sin proxy la red es bridge y no se monta ningún CA', async () => {
    const argv = await createdArgv({ egress: { kind: 'direct' } })
    expect(argv).toContain('--network bridge')
    expect(argv).not.toContain('HTTPS_PROXY')
    expect(argv).not.toContain('/certs/')
  })

  test('el trabajo no recibe credencial ni el almacenamiento de Podman', async () => {
    const argv = await createdArgv()
    expect(argv).not.toMatch(/TOKEN|PASSWORD|SECRET|containers\/storage/i)
    expect(argv).toContain(PINNED.digest)
  })
})

describe('la autorización del trabajo', () => {
  test('corre como una ejecución autorizada: clase registry-operation y la cita de su tarea', async () => {
    const argv = await createdArgv()
    expect(argv).toContain(`--label ${EXECUTION_KIND_LABEL_KEY}=registry-operation`)
    expect(argv).toContain(`--label ${EXECUTION_REFERENCE_LABEL_KEY}=task:TASK-THYROX-0728`)
    expect(argv).toContain(`--label ${EXECUTION_ID_LABEL_KEY}=artifact-verify-test`)
  })

  test('la cita de la tarea que autoriza es declarable por el llamador', async () => {
    const argv = await createdArgv({ taskCitation: 'TASK-THYROX-0001' })
    expect(argv).toContain(`--label ${EXECUTION_REFERENCE_LABEL_KEY}=task:TASK-THYROX-0001`)
  })
})

describe('createPodmanJobVerifier con un Podman doble', () => {
  function podmanWritingReport(scratchDir: string, report: unknown, exitCode = '0'): PodmanExecutor {
    return {
      run: async (args): Promise<PodmanCommandResult> => {
        if (args[0] === 'wait') {
          if (report !== undefined) writeFileSync(join(scratchDir, VERIFICATION_REPORT_NAME), JSON.stringify(report))
          return { exitCode: 0, stdout: `${exitCode}\n`, stderr: '' }
        }
        if (args[0] === 'logs') return { exitCode: 0, stdout: '', stderr: 'boom' }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
    }
  }

  test('devuelve el veredicto que el trabajo dejó en su montaje', async () => {
    const scratchDir = join(workdir, 'scratch')
    const report = { status: 'verified', verification: { resolvedDigest: PINNED.digest, blobsVerified: [], measuredPeakBytes: 7 } }
    const outcome = await createPodmanJobVerifier(options({ podman: podmanWritingReport(scratchDir, report) })).verify(PINNED, LOCATION)
    expect(outcome).toEqual(report as never)
  })

  test('un trabajo que sale sin veredicto es unverified con su diagnóstico, nunca verified', async () => {
    const scratchDir = join(workdir, 'scratch')
    const outcome = await createPodmanJobVerifier(options({ podman: podmanWritingReport(scratchDir, undefined, '1') })).verify(PINNED, LOCATION)
    expect(outcome.status).toBe('unverified')
    if (outcome.status === 'unverified') expect(outcome.result).toMatchObject({ status: 'job_failed', exitCode: 1 })
  })
})

const VERIFIER_TEST_IMAGE = process.env.THYROX_ARTIFACT_VERIFIER_IMAGE || 'docker.io/library/ubuntu:24.04'
const podman = createPodmanExecutor()
const imagePresent = await podman.run(['image', 'exists', VERIFIER_TEST_IMAGE]).then(result => result.exitCode === 0, () => false)
if (!imagePresent) console.error(`podmanJobVerifier: sin Podman o sin ${VERIFIER_TEST_IMAGE} local; el nivel real queda sin medir.`)

describe.skipIf(!imagePresent)('createPodmanJobVerifier contra el Podman real', () => {
  let registry: FakeOciRegistry
  beforeEach(() => { registry = startFakeOciRegistry() })
  afterEach(() => registry.stop())

  test('el trabajo materializa y verifica cada blob desde el registry, sin credencial', async () => {
    const source = join(workdir, 'source')
    mkdirSync(source)
    writeFileSync(join(source, 'model.gguf'), 'g'.repeat(4096))
    const publisher = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } })
    const file = await describeArtifactFile(join(source, 'model.gguf'), 'model.gguf', 'application/vnd.thyrox.gguf')
    const pushed = await publisher.pushArtifact({ artifactType: 'application/vnd.thyrox.test', files: [file], config: { mediaType: 'application/json', bytes: new TextEncoder().encode('{}') }, annotations: {} }, LOCATION)
    if (pushed.status !== 'success') throw new Error(pushed.status)

    const verifier = createPodmanJobVerifier(options({
      podman,
      image: VERIFIER_TEST_IMAGE,
      registryUrl: registry.baseUrl,
      // red host para alcanzar el registry de prueba en el loopback del anfitrión
      egress: { kind: 'proxy', proxyUrl: 'http://127.0.0.1:9' },
      workerId: `artifact-verify-real-${process.pid}`,
    }))
    const outcome = await verifier.verify(pushed.value, LOCATION)
    expect(outcome.status).toBe('verified')
    if (outcome.status === 'verified') expect(outcome.verification.blobsVerified.map(blob => blob.title)).toEqual(['model.gguf'])
  }, 120_000)
})
