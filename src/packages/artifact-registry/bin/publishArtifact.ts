#!/usr/bin/env bun
/**
 * Publica un directorio —o un volumen de Podman— como artefacto permanente
 * y lo verifica antes de declarar caché la copia local (TASK-THYROX-0728).
 *
 *   publish-artifact --volume <nombre> | --source-dir <ruta>
 *                    --repository <usuario/repo> --tag <tag>
 *                    --record-file <registro.json> --artifact-type <tipo>
 *                    [--exclude a,b] --out <publicacion.json>
 *
 * La credencial del publicador se lee del `.env` en este proceso y nunca
 * entra al trabajo de verificación, que corre en la primitiva de Podman sin
 * credencial y sin el almacenamiento de esta sesión.
 *
 * Salida: 0 verificado; 1 sin publicar o sin verificar; 2 rehusado antes de
 * empezar (argumentos, credencial, imagen, admisión); 3 límite del provider.
 */
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'

import { productionDeclarations, thyroxRoot } from '@thyrox/paths/reach.ts'
import { createPodmanExecutor, type PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { inspectImage, inspectVolume } from '@thyrox/podman-execution/podmanObservation.ts'
import { MissingRegistryCredentialError, PUBLISHER_ENV, resolvePublisherCredential } from '@thyrox/registry-credentials/registryCredential.ts'

import { createDiskAdmission } from '../diskAdmission.js'
import { resolveJobEgress, JOB_EGRESS_ENV } from '../jobEgress.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { createPodmanJobVerifier } from '../podmanJobVerifier.js'
import { publishAndVerify } from '../publishArtifact.js'
import { mediaTypeOf, publicationExitCode, publicationRecord, registryBaseUrl } from '../publishCommand.js'

const REFUSED = 2
const VERIFIER_IMAGE_ENV = 'THYROX_ARTIFACT_VERIFIER_IMAGE'
const DEFAULT_VERIFIER_IMAGE = 'docker.io/library/ubuntu:24.04'
const RUNTIME_HOME_KEY = 'THYROX_RUNTIME_DIR'
const VERIFIER_LIMITS = { cpus: 1, memoryMib: 1024, pidsLimit: 128 }

function refuse(message: string): never {
  process.stderr.write(`publish-artifact: ${message}\n`)
  process.exit(REFUSED)
}

const { values } = parseArgs({
  options: {
    volume: { type: 'string' },
    'source-dir': { type: 'string' },
    repository: { type: 'string' },
    tag: { type: 'string' },
    'record-file': { type: 'string' },
    'artifact-type': { type: 'string' },
    exclude: { type: 'string', default: '' },
    out: { type: 'string' },
  },
})
for (const name of ['repository', 'tag', 'record-file', 'artifact-type', 'out'] as const) {
  if (!values[name]) refuse(`falta --${name}`)
}
if (!values.volume === !values['source-dir']) refuse('declara --volume o --source-dir, uno solo')

const declarations = productionDeclarations()
const declared = (name: string): string | undefined => declarations.declared(name) ?? undefined
const podman: PodmanExecutor = createPodmanExecutor()

/** Lo que el dueño de Podman observó, o el rechazo que nombra qué no se resolvió (P3). */
async function observed(value: Promise<string | undefined>, what: string): Promise<string> {
  let resolved: string | undefined
  try {
    resolved = await value
  } catch (error) {
    refuse(`no se pudo resolver ${what}: ${(error as Error).message}`)
  }
  if (!resolved) refuse(`no se pudo resolver ${what}`)
  return resolved
}

const sourceDir = values.volume
  ? await observed(inspectVolume(podman, values.volume).then(volume => volume?.mountpoint), `el volumen ${values.volume}`)
  : (values['source-dir'] as string)

let credential
try {
  credential = resolvePublisherCredential({
    [PUBLISHER_ENV.username]: declared(PUBLISHER_ENV.username),
    [PUBLISHER_ENV.token]: declared(PUBLISHER_ENV.token),
    [PUBLISHER_ENV.registry]: declared(PUBLISHER_ENV.registry),
  })
} catch (error) {
  if (error instanceof MissingRegistryCredentialError) refuse(error.message)
  throw error
}

const egress = (() => {
  try {
    return resolveJobEgress({
      ...process.env,
      [JOB_EGRESS_ENV.proxyUrl]: declared(JOB_EGRESS_ENV.proxyUrl),
      [JOB_EGRESS_ENV.caBundle]: declared(JOB_EGRESS_ENV.caBundle),
    })
  } catch (error) {
    refuse((error as Error).message)
  }
})()

const verifierImageRef = declared(VERIFIER_IMAGE_ENV) || DEFAULT_VERIFIER_IMAGE
const verifierImage = await observed(inspectImage(podman, verifierImageRef).then(image => image?.id), `la imagen del verificador ${verifierImageRef} (no se descarga implícitamente)`)

const root = thyroxRoot()

/** La ruta de un hogar la decide el registro de P11 (`paths/declarations.py`), no una copia de su default. */
function registeredHome(key: string): string {
  const resolved = spawnSync('bash', [join(root, 'bin', 'ensure_homes'), '--resolve', key], { encoding: 'utf8' })
  const path = resolved.stdout.trim()
  if (resolved.status !== 0 || !path) refuse(`no se resolvió el hogar ${key}: ${resolved.stderr.trim() || `exit ${resolved.status}`}`)
  return path
}

const owner = `artifact-publish-${process.pid}`
const scratchDir = join(registeredHome(RUNTIME_HOME_KEY), 'artifact-verify', owner)
await mkdir(dirname(scratchDir), { recursive: true })

const baseRecord = JSON.parse(await readFile(values['record-file'] as string, 'utf8')) as Record<string, unknown>
const registryUrl = registryBaseUrl(credential.registry)
const location = { repository: values.repository as string, tag: values.tag as string }
const admission = createDiskAdmission({ thyroxRoot: root, path: dirname(scratchDir), ownerPid: process.pid })

const outcome = await publishAndVerify(
  {
    sourceDir,
    exclude: (values.exclude as string).split(',').map(name => name.trim()).filter(Boolean),
    mediaTypeOf,
    artifactType: values['artifact-type'] as string,
    recordFor: files => ({ ...baseRecord, files }),
    location,
  },
  {
    publisher: createOciArtifactRegistry({
      baseUrl: registryUrl,
      credential: { kind: 'basic', username: credential.username, secret: () => credential.revealToken() },
      trace: line => process.stderr.write(`publish-artifact: ${line}\n`),
    }),
    verifier: createPodmanJobVerifier({
      podman,
      image: verifierImage,
      bunPath: process.execPath,
      repositoryRoot: root,
      scratchDir,
      registryUrl,
      egress,
      owner: { kind: 'lab', id: owner, pid: process.pid },
      workerId: owner,
      limits: VERIFIER_LIMITS,
    }),
    admitDisk: needBytes => admission.admit(needBytes),
    releaseDisk: () => admission.release(),
  },
)

const record = publicationRecord(outcome, credential.registry, location.tag, new Date().toISOString())
await mkdir(dirname(values.out as string), { recursive: true })
await writeFile(values.out as string, `${JSON.stringify(record, null, 2)}\n`)
process.stderr.write(`publish-artifact: ${outcome.status}${outcome.status === 'verified' ? ` ${credential.registry}/${outcome.pinned.repository}@${outcome.pinned.digest}` : ''}\n`)
process.exit(publicationExitCode(outcome))
