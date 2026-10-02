/**
 * `OllamaModelInstaller` (TASK-THYROX-0729): el adapter que instala un modelo
 * en el Ollama gestionado corriendo `bin/installModel.ts` como trabajo de la
 * primitiva de Podman.
 *
 * Dos niveles. Con un Podman doble que, al esperar el contenedor, ejecuta la
 * lógica del trabajo en proceso contra un Ollama falso: cómo se materializa el
 * trabajo —componiendo la autorización canónica, clase `maintenance` y la cita
 * de su tarea, nunca un spec suelto— y cómo se decide el desenlace (sólo
 * `installed` si el runtime resuelve el contenido pedido). Con el Podman real, si
 * la imagen está local: que el trabajo alcanza el Ollama del loopback y deja su
 * reporte.
 *
 * Métrica: el argv entregado a `podman create`, el estado del Ollama falso y
 * el desenlace devuelto.
 * Ciega a: el Ollama real (su `/api/create` y su almacén de blobs); el falso
 * resuelve el nombre al blob que la prueba declara.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { EXECUTION_ID_LABEL_KEY, EXECUTION_KIND_LABEL_KEY, EXECUTION_REFERENCE_LABEL_KEY } from '@thyrox/podman-execution/executionAuthorization.ts'
import { createPodmanExecutor, type PodmanCommandResult, type PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { OLLAMA_PORT_VAR } from '../managedOllama.js'
import type { ModelInstallRequest } from '../modelInstaller.js'
import { OllamaApi, installModelIntoOllama } from '../ollamaApi.js'
import { INSTALL_REPORT_NAME, OllamaModelInstaller, type OllamaModelInstallerOptions } from '../ollamaModelInstaller.js'

const REPOSITORY_ROOT = resolve(import.meta.dir, '../../../..')
const MODEL_NAME = 'thyrox-library--qwen2.5-0.5b:q4_k_m'
/** La imagen del trabajo: declarada, sirve para recortar el comando del argv de `create`. */
const INSTALLER_IMAGE = 'sha256:' + 'b'.repeat(64)
const HTTP_OK = 200
const HTTP_CREATED = 201
const HTTP_NOT_FOUND = 404
const HTTP_SERVER_ERROR = 500
const BLOB_PREFIX = '/api/blobs/sha256:'

interface StatefulOllama {
  readonly port: number
  readonly models: Map<string, string>
  stop(): Promise<void>
}

/**
 * Ollama con estado. `substitute` imita un runtime que, tras crear el
 * modelo, resuelve el nombre a OTRO blob; `showStatus` fuerza el estado de
 * `/api/show`.
 */
function startStatefulOllama(behaviour: { substitute?: string, showStatus?: number } = {}): StatefulOllama {
  const blobs = new Set<string>()
  const models = new Map<string, string>()
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname
      const body = new Uint8Array(await request.arrayBuffer())
      if (path.startsWith(BLOB_PREFIX)) {
        const digest = path.slice(BLOB_PREFIX.length)
        if (request.method === 'HEAD') return new Response(null, { status: blobs.has(digest) ? HTTP_OK : HTTP_NOT_FOUND })
        blobs.add(digest)
        return new Response(null, { status: HTTP_CREATED })
      }
      const document = JSON.parse(new TextDecoder().decode(body) || '{}') as { model: string, files?: Record<string, string> }
      if (path === '/api/create') {
        models.set(document.model, behaviour.substitute ?? String(document.files?.['model.gguf']).replace('sha256:', ''))
        return new Response('{"status":"success"}', { status: HTTP_OK })
      }
      if (path === '/api/show') {
        if (behaviour.showStatus) return new Response('{"error":"forced"}', { status: behaviour.showStatus })
        const digest = models.get(document.model)
        if (!digest) return new Response('{"error":"model not found"}', { status: HTTP_NOT_FOUND })
        return Response.json({ modelfile: `# Modelfile\nFROM /root/.ollama/models/blobs/sha256-${digest}\n` })
      }
      return new Response('{"error":"not found"}', { status: HTTP_NOT_FOUND })
    },
  })
  return { port: server.port as number, models, stop: () => server.stop(true) }
}

let workdir: string
let ollama: StatefulOllama | undefined
beforeEach(() => { workdir = mkdtempSync(join(tmpdir(), 'ollama-model-installer-')) })
afterEach(async () => {
  await ollama?.stop()
  ollama = undefined
  rmSync(workdir, { recursive: true, force: true })
})

function artifact(content: string): ModelInstallRequest {
  const artifactPath = join(workdir, 'cache-model.gguf')
  writeFileSync(artifactPath, content)
  return { name: MODEL_NAME, artifactPath, contentSha256: new Bun.CryptoHasher('sha256').update(content).digest('hex') }
}

function options(port: number, overrides: Partial<OllamaModelInstallerOptions> = {}): OllamaModelInstallerOptions {
  return {
    podman: { run: async () => ({ exitCode: 0, stdout: '0\n', stderr: '' }) },
    image: INSTALLER_IMAGE,
    bunPath: process.execPath,
    repositoryRoot: REPOSITORY_ROOT,
    scratchDir: join(workdir, 'scratch'),
    environment: { [OLLAMA_PORT_VAR]: String(port) },
    owner: { kind: 'pool', id: 'model-install', pid: process.pid },
    workerId: 'model-install-test',
    limits: { cpus: 1, memoryMib: 512, pidsLimit: 64 },
    ...overrides,
  }
}

/** Podman doble: al esperar el contenedor corre `job` y deja (o no) su reporte en el montaje. */
function podmanRunningInProcess(scratchDir: string, job: () => Promise<unknown>): PodmanExecutor {
  return {
    run: async (args): Promise<PodmanCommandResult> => {
      if (args[0] === 'wait') {
        const report = await job()
        if (report !== undefined) writeFileSync(join(scratchDir, INSTALL_REPORT_NAME), JSON.stringify(report))
        return { exitCode: 0, stdout: '0\n', stderr: '' }
      }
      if (args[0] === 'logs') return { exitCode: 0, stdout: '', stderr: 'diagnóstico del trabajo' }
      return { exitCode: 0, stdout: '', stderr: '' }
    },
  }
}

function installerRunningInProcess(port: number, request: ModelInstallRequest): OllamaModelInstaller {
  const scratchDir = join(workdir, 'scratch')
  const job = () => installModelIntoOllama(new OllamaApi(`http://127.0.0.1:${port}`), request)
  return new OllamaModelInstaller(options(port, { podman: podmanRunningInProcess(scratchDir, job) }))
}

/**
 * El doble que registra el argv de `podman create`. Sin reporte en el montaje,
 * `install` devuelve antes de confirmar el runtime, así que ninguna prueba de
 * composición toca Ollama: lo que se mide es cómo se materializa el trabajo.
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

/** El trabajo que el instalador materializa: el argv con que `podman create` lo recibió y el artefacto pedido. */
async function createdInstallJob(overrides: Partial<OllamaModelInstallerOptions> = {}): Promise<{ argv: string[]; request: ModelInstallRequest }> {
  const request = artifact('gguf')
  const recorder = recordingPodman()
  await new OllamaModelInstaller(options(4321, { ...overrides, podman: recorder.podman })).install(request)
  return { argv: recorder.created[0] ?? [], request }
}

/** Lo que recibe el contenedor como comando: lo que sigue a la imagen en el argv de `create`. */
function containerCommand(argv: readonly string[]): string[] {
  return argv.slice(argv.indexOf(INSTALLER_IMAGE) + 1)
}

describe('la composición del trabajo', () => {
  test('red host, bun y repositorio de sólo lectura, el GGUF de sólo lectura y el montaje de trabajo rw', async () => {
    const { argv, request } = await createdInstallJob()
    const joined = argv.join(' ')
    expect(joined).toContain('--network host')
    expect(joined).toContain('--read-only')
    expect(joined).toContain(`-v ${process.execPath}:/usr/local/bin/bun:ro`)
    expect(joined).toContain(`-v ${REPOSITORY_ROOT}:/w:ro`)
    expect(joined).toContain(`-v ${request.artifactPath}:/artifact/model.gguf:ro`)
    expect(joined).toContain(`-v ${join(workdir, 'scratch')}:/scratch:rw`)
    expect(containerCommand(argv)).toEqual([
      '/usr/local/bin/bun', '/w/src/packages/local-models/bin/installModel.ts',
      '--ollama-url', 'http://127.0.0.1:4321',
      '--name', MODEL_NAME,
      '--artifact', '/artifact/model.gguf',
      '--sha256', request.contentSha256,
      '--report', `/scratch/${INSTALL_REPORT_NAME}`,
    ])
  })

  test('la URL de Ollama sale del entorno declarado', async () => {
    const { argv } = await createdInstallJob({ environment: {} })
    expect(argv.join(' ')).toContain('http://127.0.0.1:51434')
  })

  test('el trabajo no recibe ningún secreto', async () => {
    const { argv } = await createdInstallJob()
    expect(argv.join(' ')).not.toMatch(/TOKEN|PASSWORD|SECRET|KEY|containers\/storage/i)
  })
})

describe('la autorización del trabajo', () => {
  test('corre como una ejecución autorizada: clase maintenance y la cita de su tarea', async () => {
    const { argv } = await createdInstallJob()
    const joined = argv.join(' ')
    expect(joined).toContain(`--label ${EXECUTION_KIND_LABEL_KEY}=maintenance`)
    expect(joined).toContain(`--label ${EXECUTION_REFERENCE_LABEL_KEY}=task:TASK-THYROX-0729`)
    expect(joined).toContain(`--label ${EXECUTION_ID_LABEL_KEY}=model-install-test`)
  })

  test('la cita de la tarea que autoriza es declarable por el llamador', async () => {
    const { argv } = await createdInstallJob({ taskCitation: 'TASK-THYROX-0001' })
    expect(argv.join(' ')).toContain(`--label ${EXECUTION_REFERENCE_LABEL_KEY}=task:TASK-THYROX-0001`)
  })
})

describe('OllamaModelInstaller.inspect', () => {
  test('un nombre que el runtime no resuelve es undefined', async () => {
    ollama = startStatefulOllama()
    expect(await new OllamaModelInstaller(options(ollama.port)).inspect(MODEL_NAME)).toBeUndefined()
  })

  test('un nombre instalado devuelve el blob de su FROM', async () => {
    ollama = startStatefulOllama()
    ollama.models.set(MODEL_NAME, 'd'.repeat(64))
    expect(await new OllamaModelInstaller(options(ollama.port)).inspect(MODEL_NAME)).toEqual({ name: MODEL_NAME, contentSha256: 'd'.repeat(64) })
  })

  test('un error de /api/show que no es 404 se propaga: no es «no instalado»', async () => {
    ollama = startStatefulOllama({ showStatus: HTTP_SERVER_ERROR })
    await expect(new OllamaModelInstaller(options(ollama.port)).inspect(MODEL_NAME)).rejects.toThrow(/500/)
  })
})

describe('OllamaModelInstaller.install con el trabajo en proceso', () => {
  test('installed cuando el runtime resuelve el contenido pedido', async () => {
    ollama = startStatefulOllama()
    const request = artifact('gguf-content')
    expect(await installerRunningInProcess(ollama.port, request).install(request)).toEqual({ status: 'installed' })
    expect(ollama.models.get(MODEL_NAME)).toBe(request.contentSha256)
  })

  test('failed si tras instalar el runtime resuelve otro contenido, aunque /api/create diera 200', async () => {
    ollama = startStatefulOllama({ substitute: 'e'.repeat(64) })
    const request = artifact('gguf-content')
    const outcome = await installerRunningInProcess(ollama.port, request).install(request)
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.reason).toContain('e'.repeat(64))
  })

  test('failed si el reporte dice installed pero el runtime no resuelve el nombre', async () => {
    ollama = startStatefulOllama()
    const request = artifact('gguf-content')
    const scratchDir = join(workdir, 'scratch')
    const installer = new OllamaModelInstaller(options(ollama.port, { podman: podmanRunningInProcess(scratchDir, async () => ({ status: 'installed' })) }))
    expect((await installer.install(request)).status).toBe('failed')
  })

  test('un trabajo sin reporte es failed con su diagnóstico', async () => {
    ollama = startStatefulOllama()
    const request = artifact('gguf-content')
    const scratchDir = join(workdir, 'scratch')
    const installer = new OllamaModelInstaller(options(ollama.port, { podman: podmanRunningInProcess(scratchDir, async () => undefined) }))
    const outcome = await installer.install(request)
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.reason).toContain('diagnóstico del trabajo')
  })

  test('un reporte failed del trabajo se devuelve con su causa', async () => {
    ollama = startStatefulOllama()
    const request = artifact('gguf-content')
    const scratchDir = join(workdir, 'scratch')
    const installer = new OllamaModelInstaller(options(ollama.port, { podman: podmanRunningInProcess(scratchDir, async () => ({ status: 'failed', reason: 'blob rechazado' })) }))
    expect(await installer.install(request)).toEqual({ status: 'failed', reason: 'blob rechazado' })
  })

  test('un reporte ilegible es failed, nunca installed', async () => {
    ollama = startStatefulOllama()
    const request = artifact('gguf-content')
    ollama.models.set(MODEL_NAME, request.contentSha256)
    const scratchDir = join(workdir, 'scratch')
    const installer = new OllamaModelInstaller(options(ollama.port, { podman: podmanRunningInProcess(scratchDir, async () => ({ status: 'ok' })) }))
    expect((await installer.install(request)).status).toBe('failed')
  })
})

const INSTALLER_TEST_IMAGE = process.env.THYROX_ARTIFACT_VERIFIER_IMAGE || 'docker.io/library/ubuntu:24.04'
const podman = createPodmanExecutor()
const imagePresent = await podman.run(['image', 'exists', INSTALLER_TEST_IMAGE]).then(result => result.exitCode === 0, () => false)
if (!imagePresent) console.error(`ollamaModelInstaller: sin Podman o sin ${INSTALLER_TEST_IMAGE} local; el nivel real queda sin medir.`)

describe.skipIf(!imagePresent)('OllamaModelInstaller contra el Podman real', () => {
  test('el trabajo sube el blob al Ollama del loopback y el runtime resuelve el contenido', async () => {
    ollama = startStatefulOllama()
    const request = artifact('g'.repeat(4096))
    const installer = new OllamaModelInstaller(options(ollama.port, { podman, image: INSTALLER_TEST_IMAGE, workerId: `model-install-real-${process.pid}` }))
    expect(await installer.install(request)).toEqual({ status: 'installed' })
    expect(ollama.models.get(MODEL_NAME)).toBe(request.contentSha256)
  }, 120_000)
})
