#!/usr/bin/env bun
/**
 * `local-models-ensure <nombre-del-catálogo>`: deja el modelo disponible en
 * el Ollama gestionado bajo su nombre contractual (TASK-THYROX-0729).
 *
 * Es el cableado de producción de `ensureModel`: catálogo y índice de
 * ubicaciones de la instalación, descarga por digest con un trabajo de la
 * primitiva de Podman sin credencial, caché verificada en el hogar de
 * artefactos e instalación por el adaptador de Ollama, también como trabajo
 * de la primitiva. No decide residencia, GPU ni ruteo (TASK-THYROX-0703).
 *
 * Imprime el resultado en JSON por stdout. Salida: 0 READY · 1 fallo en una
 * etapa (la etapa y la causa van en el JSON) · 2 rehusado (no declarado, no
 * materializable, infraestructura o imagen ausentes).
 */
import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { JOB_EGRESS_ENV, resolveJobEgress } from '@thyrox/artifact-registry/jobEgress.ts'
import { localArtifactHome, localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { createIndexedArtifactResolver, loadArtifactLocationIndex } from '@thyrox/model-artifacts/modelArtifactResolver.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { productionDeclarations, thyroxRoot } from '@thyrox/paths/reach.ts'
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { ensureModel, type EnsureOutcome } from '../ensureModel.js'
import { infrastructureEnsureCommand, OLLAMA_CONTAINER, requireInfrastructure } from '../infrastructureReadiness.js'
import { OllamaModelInstaller } from '../ollamaModelInstaller.js'
import { createPodmanArtifactFetcher } from '../podmanArtifactFetcher.js'

const READY = 0
const FAILED = 1
const REFUSED = 2
/** La misma imagen neutra que el verificador de publicación: sólo aporta un userland donde montar `bun`. */
const JOB_IMAGE_ENV = 'THYROX_ARTIFACT_VERIFIER_IMAGE'
const DEFAULT_JOB_IMAGE = 'docker.io/library/ubuntu:24.04'
const RUNTIME_HOME_KEY = 'THYROX_RUNTIME_DIR'
const JOB_LIMITS = { cpus: 1, memoryMib: 1024, pidsLimit: 128 }

function refuse(message: string): never {
  process.stderr.write(`local-models-ensure: ${message}\n`)
  process.exit(REFUSED)
}

const [name, ...extra] = process.argv.slice(2)
if (name === undefined || name.startsWith('-') || extra.length > 0) refuse('uso: local-models-ensure <nombre-del-catálogo>')

const root = thyroxRoot()
const declarations = productionDeclarations()
const declared = (key: string): string | undefined => declarations.declared(key) ?? undefined
/** Como `local-models-catalog`: las variables de hogar y de Ollama se leen del entorno del proceso. */
const environment = process.env
const podman = createPodmanExecutor()

/** La ruta de un hogar la decide el registro de P11 (`paths/declarations.py`), no una copia de su default. */
function registeredHome(key: string): string {
  const resolved = spawnSync('bash', [join(root, 'bin', 'ensure_homes'), '--resolve', key], { encoding: 'utf8' })
  const path = resolved.stdout.trim()
  if (resolved.status !== 0 || !path) refuse(`no se resolvió el hogar ${key}: ${resolved.stderr.trim() || `exit ${resolved.status}`}`)
  return path
}

const imageRef = declared(JOB_IMAGE_ENV) || DEFAULT_JOB_IMAGE
const inspected = await podman.run(['image', 'inspect', imageRef, '--format', '{{.Id}}'])
const image = inspected.stdout.trim()
if (inspected.exitCode !== 0 || !image) refuse(`la imagen de trabajo ${imageRef} no está local (no se descarga implícitamente): ${inspected.stderr.trim()}`)

const egress = (() => {
  try {
    return resolveJobEgress({ ...process.env, [JOB_EGRESS_ENV.proxyUrl]: declared(JOB_EGRESS_ENV.proxyUrl), [JOB_EGRESS_ENV.caBundle]: declared(JOB_EGRESS_ENV.caBundle) })
  } catch (error) {
    refuse((error as Error).message)
  }
})()

try {
  await requireInfrastructure([OLLAMA_CONTAINER], infrastructureEnsureCommand(root))
} catch (error) {
  refuse((error as Error).message)
}

const owner = `model-ensure-${process.pid}`
const scratchDir = join(registeredHome(RUNTIME_HOME_KEY), 'model-install', owner)
await mkdir(scratchDir, { recursive: true })
const artifactHome = localArtifactHome(environment, root)
const jobOwner = { kind: 'lab' as const, id: owner, pid: process.pid }

const outcome: EnsureOutcome = await ensureModel(name, {
  catalog: await loadModelCatalog(localModelHome(environment, root).catalog),
  resolver: createIndexedArtifactResolver(await loadArtifactLocationIndex(artifactHome.artifactLocations)),
  cacheDir: artifactHome.artifactCache,
  fetcher: createPodmanArtifactFetcher({ podman, image, bunPath: process.execPath, repositoryRoot: root, egress, owner: jobOwner, workerId: `${owner}-fetch`, limits: JOB_LIMITS }),
  installer: new OllamaModelInstaller({ podman, image, bunPath: process.execPath, repositoryRoot: root, scratchDir, environment, owner: jobOwner, workerId: `${owner}-install`, limits: JOB_LIMITS }),
})

process.stdout.write(`${JSON.stringify(outcome)}\n`)
process.exit(outcome.status === 'ready' ? READY : outcome.status === 'failed' ? FAILED : REFUSED)
