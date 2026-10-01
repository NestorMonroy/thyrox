/**
 * La entrada del trabajo de descarga (`bin/fetchLayer.ts`), ejecutada como
 * proceso contra el registry en proceso (TASK-THYROX-0729): lee de forma
 * anónima, deja en `--report` el resultado del puerto y su código de salida
 * distingue éxito, fallo con reporte y argumentos inválidos sin reporte.
 *
 * Métrica: código de salida, contenido de `--report` y del destino.
 * Ciega a: el contenedor; eso lo mide `podmanArtifactFetcher.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describeArtifactFile } from '../artifactFiles.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { FAKE_PUBLISHER, startFakeOciRegistry, type FakeOciRegistry } from '../testing/fakeOciRegistry.js'

const ENTRY = resolve(import.meta.dir, '../bin/fetchLayer.ts')
const REPOSITORY = 'thyrox/lab-artifacts'
const MODEL_CONTENT = 'GGUF-bytes-of-a-model'

let registry: FakeOciRegistry
let workdir: string
beforeEach(() => {
  registry = startFakeOciRegistry()
  workdir = mkdtempSync(join(tmpdir(), 'fetch-layer-entry-'))
})
afterEach(() => {
  registry.stop()
  rmSync(workdir, { recursive: true, force: true })
})

async function publishModel() {
  const source = join(workdir, 'source')
  mkdirSync(source)
  writeFileSync(join(source, 'model.gguf'), MODEL_CONTENT)
  const file = await describeArtifactFile(join(source, 'model.gguf'), 'model.gguf', 'application/vnd.thyrox.gguf')
  const publisher = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } })
  const pushed = await publisher.pushArtifact(
    { artifactType: 'application/vnd.thyrox.model-artifact.v1', files: [file], config: { mediaType: 'application/json', bytes: new TextEncoder().encode('{}') }, annotations: {} },
    { repository: REPOSITORY, tag: 'lab' },
  )
  if (pushed.status !== 'success') throw new Error(`push falló: ${JSON.stringify(pushed)}`)
  return { manifestDigest: pushed.value.digest, layerDigest: `sha256:${file.sha256}` }
}

async function runEntry(args: string[]): Promise<number> {
  const child = Bun.spawn([process.execPath, ENTRY, ...args], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
  return child.exited
}

function argsFor(manifestDigest: string, layerDigest: string): { args: string[]; destination: string; report: string } {
  const destination = join(workdir, 'out', 'model.partial')
  const report = join(workdir, 'report', 'fetch.json')
  return {
    destination,
    report,
    args: ['--registry', registry.baseUrl, '--repository', REPOSITORY, '--manifest-digest', manifestDigest, '--layer-digest', layerDigest, '--destination', destination, '--report', report],
  }
}

describe('bin/fetchLayer.ts', () => {
  test('baja la capa y deja el resultado del puerto en el reporte, sale 0', async () => {
    const { manifestDigest, layerDigest } = await publishModel()
    const { args, destination, report } = argsFor(manifestDigest, layerDigest)
    expect(await runEntry(args)).toBe(0)
    expect(readFileSync(destination, 'utf8')).toBe(MODEL_CONTENT)
    expect(JSON.parse(readFileSync(report, 'utf8'))).toMatchObject({ status: 'success', value: { digest: layerDigest, size: MODEL_CONTENT.length } })
  })

  test('un fallo del puerto queda en el reporte y sale 1', async () => {
    const { manifestDigest } = await publishModel()
    const { args, destination, report } = argsFor(manifestDigest, `sha256:${'f'.repeat(64)}`)
    expect(await runEntry(args)).toBe(1)
    expect(JSON.parse(readFileSync(report, 'utf8')).status).toBe('not_found')
    expect(existsSync(destination)).toBe(false)
  })

  test('sin un argumento obligatorio sale 2 y no escribe reporte', async () => {
    const { manifestDigest, layerDigest } = await publishModel()
    const { args, report } = argsFor(manifestDigest, layerDigest)
    expect(await runEntry(args.slice(2))).toBe(2)
    expect(existsSync(report)).toBe(false)
  })
})
