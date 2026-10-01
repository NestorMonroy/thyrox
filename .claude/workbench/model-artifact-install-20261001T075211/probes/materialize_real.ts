#!/usr/bin/env bun
/**
 * Mitad de E2E 1 y 2 que no necesita Ollama (TASK-THYROX-0729): con el
 * Ollama gestionado bloqueado por TASK-THYROX-0730, ejercita contra el
 * registry real el tramo catálogo → resolver → descarga por digest en la
 * primitiva → verificación → publicación atómica en la caché, dos veces.
 *
 * Métrica: llamadas al fetcher real, estado devuelto y sha256 medido por
 * `materializeArtifact`, y el sha256 recalculado sobre el archivo publicado.
 * Ciega a: la instalación en Ollama y la petición de producto, que exigen el
 * runtime gestionado.
 *
 * Uso: bun probes/materialize_real.ts <nombre-del-catálogo> <reporte.json>
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { JOB_EGRESS_ENV, resolveJobEgress } from '@thyrox/artifact-registry/jobEgress.ts'
import { localArtifactHome, localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { createIndexedArtifactResolver, loadArtifactLocationIndex } from '@thyrox/model-artifacts/modelArtifactResolver.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { productionDeclarations, thyroxRoot } from '@thyrox/paths/reach.ts'
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { materializeArtifact, type ArtifactFetcher } from '@thyrox/local-models/modelArtifactCache.ts'
import { createPodmanArtifactFetcher } from '@thyrox/local-models/podmanArtifactFetcher.ts'
import { sha256OfFile } from '@thyrox/local-models/sha256File.ts'

const [name, reportPath] = process.argv.slice(2)
if (!name || !reportPath) {
  process.stderr.write('uso: materialize_real.ts <nombre-del-catálogo> <reporte.json>\n')
  process.exit(2)
}
const root = thyroxRoot()
const declarations = productionDeclarations()
const declared = (key: string): string | undefined => declarations.declared(key) ?? undefined
const podman = createPodmanExecutor()
const imageRef = declared('THYROX_ARTIFACT_VERIFIER_IMAGE') || 'docker.io/library/ubuntu:24.04'
const image = (await podman.run(['image', 'inspect', imageRef, '--format', '{{.Id}}'])).stdout.trim()
if (!image) {
  process.stderr.write(`materialize_real: la imagen ${imageRef} no está local\n`)
  process.exit(2)
}
const egress = resolveJobEgress({ ...process.env, [JOB_EGRESS_ENV.proxyUrl]: declared(JOB_EGRESS_ENV.proxyUrl), [JOB_EGRESS_ENV.caBundle]: declared(JOB_EGRESS_ENV.caBundle) })

const entry = (await loadModelCatalog(localModelHome(process.env, root).catalog)).byName(name)
if (!entry) {
  process.stderr.write(`materialize_real: ${name} no está en el catálogo\n`)
  process.exit(2)
}
const home = localArtifactHome(process.env, root)
const resolution = await createIndexedArtifactResolver(await loadArtifactLocationIndex(home.artifactLocations)).resolve(entry.artifact)
if (resolution.status !== 'resolved') {
  process.stderr.write(`materialize_real: ${resolution.reason}\n`)
  process.exit(2)
}

const owner = `materialize-real-${process.pid}`
const real = createPodmanArtifactFetcher({ podman, image, bunPath: process.execPath, repositoryRoot: root, egress, owner: { kind: 'lab', id: owner, pid: process.pid }, workerId: owner, limits: { cpus: 1, memoryMib: 1024, pidsLimit: 128 } })
const calls: string[] = []
const counted: ArtifactFetcher = { fetch: (pinned, destination) => { calls.push(pinned.blobDigest); return real.fetch(pinned, destination) } }

const runs = []
for (const label of ['first', 'second']) {
  const startedAt = Date.now()
  const outcome = await materializeArtifact({ artifact: entry.artifact, pinned: resolution.pinned, cacheDir: home.artifactCache, fetcher: counted })
  const recomputed = 'path' in outcome ? await sha256OfFile(outcome.path) : undefined
  runs.push({ label, outcome, recomputedSha256: recomputed, fetchCallsSoFar: calls.length, wallMs: Date.now() - startedAt })
}
const report = { name, catalogSha256: entry.artifact.sha256, pinned: resolution.pinned, runs }
await mkdir(dirname(reportPath), { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
const ok = runs[0]?.outcome.status === 'fetched' && runs[1]?.outcome.status === 'cached' && calls.length === 1
  && runs.every(run => run.recomputedSha256 === entry.artifact.sha256)
process.stderr.write(`materialize_real: ${ok ? 'ok' : 'NO'} — fetch calls ${calls.length}, ${runs.map(run => run.outcome.status).join(' → ')}\n`)
process.exit(ok ? 0 : 1)
