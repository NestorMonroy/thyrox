/**
 * `local-models-import run --repository R --revision SHA --file F[,F…] --sha256 HEX[,HEX…]
 *  --scratch-dir DIR --run-dir DIR [--memory-limit-bytes N] [--cpus N]`
 *
 * Adquiere un GGUF Q4_K_M publicado por su autor, lo valida en el
 * laboratorio y lo registra con procedencia `external` (TASK-THYROX-0720).
 * Si el autor lo publica en shards, `--file` lista la partición completa y
 * `--sha256` el digest de cada shard en el mismo orden.
 * Salidas: 0 hecho · 1 la validación falló · 2 rehusado sin descargar ·
 * 4 otra ejecución tiene el lease.
 */
import { statfs } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join, resolve } from 'node:path'

import { localArtifactHome, localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { openSharedStateStore } from '@thyrox/shared-state/factory.ts'

import { infrastructureEnsureOf, type CommandContext } from './catalogCommand.js'
import { infrastructureReady, REDIS_CONTAINER } from './infrastructureReadiness.js'
import { EXIT_NOT_APPROVED, EXIT_OK, EXIT_REFUSED } from './commandOutput.js'
import { importExternalArtifact, importIdOf, type ExternalArtifactRequest } from './externalArtifact.js'
import { isGgufQuantization } from './ggufValidation.js'
import { QuantizationLab, containerMeasureProbe, resolveLabImage } from './quantizationLab.js'
import { DEFAULT_LAB_IMAGE, EXIT_LEASE_BUSY, LAB_IMAGE_ENV, optionsOf } from './labCommandOptions.js'
import { unitResourceAdmission } from './resourceAdmission.js'
import { RunLeaseBusyError, RunLeaseUnavailableError, acquireRunLease, globalLeaseStore } from './runLease.js'

export const IMPORT_USAGE = 'uso: local-models-import run --repository R --revision SHA --file F[,F…] --sha256 HEX[,HEX…] '
  + '--scratch-dir DIR --run-dir DIR [--quantization F16|Q8_0|Q4_K_M] [--memory-limit-bytes N] [--cpus N]'

/** Un 7B en Q4_K_M sirve con unos 5 GB; 8 GiB deja sitio a la caché KV de la validación. */
const DEFAULT_MEMORY_LIMIT_BYTES = 8 * 1024 ** 3
const DEFAULT_CPUS = 4
const DEFAULT_QUANTIZATION = 'Q4_K_M'
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const LIST_SEPARATOR = ','

interface ImportArguments {
  readonly request: ExternalArtifactRequest
  readonly cpus: number
}

export async function runImportCommand(argv: readonly string[], context: CommandContext): Promise<number> {
  const parsed = parseImportArguments(argv)
  if (parsed === undefined) {
    context.output.stderr(IMPORT_USAGE)
    return EXIT_REFUSED
  }
  const ready = await infrastructureReady([REDIS_CONTAINER], infrastructureEnsureOf(context),
    message => context.output.stderr(`local-models-import: ${message}`))
  if (!ready) return EXIT_REFUSED
  const shared = openSharedStateStore({ env: context.env })
  try {
    const lease = await acquireRunLease(globalLeaseStore(shared), importIdOf(parsed.request), `${hostname()}:${process.pid}`)
    try {
      return await acquire(parsed, context)
    } finally {
      await lease.release()
    }
  } catch (error) {
    context.output.stderr(`local-models-import: ${(error as Error).message}`)
    if (error instanceof RunLeaseBusyError) return EXIT_LEASE_BUSY
    if (error instanceof RunLeaseUnavailableError) return EXIT_REFUSED
    throw error
  } finally {
    await shared.close()
  }
}

async function acquire(parsed: ImportArguments, context: CommandContext): Promise<number> {
  const podman = createPodmanExecutor()
  const image = await resolveLabImage(podman, context.env[LAB_IMAGE_ENV] || DEFAULT_LAB_IMAGE)
  const lab = new QuantizationLab(podman, image.id, parsed.request.scratchDir,
    { memoryBytes: parsed.request.memoryLimitBytes, cpus: parsed.cpus },
    containerMeasureProbe(join(context.thyroxRoot, 'bin', 'container_measure')),
    { id: importIdOf(parsed.request), pid: process.pid })
  const outcome = await importExternalArtifact(parsed.request, {
    fetcher: url => fetch(url),
    runInLab: step => lab.run(step),
    admission: unitResourceAdmission(context.thyroxRoot, podman),
    freeBytes: async path => { const info = await statfs(path); return info.bavail * info.bsize },
    catalogPath: localModelHome(context.env, context.thyroxRoot).catalog,
    artifactCache: localArtifactHome(context.env, context.thyroxRoot).artifactCache,
    labImageDigest: image.digest,
    now: context.now,
  })
  if (outcome.kind === 'completed') {
    context.output.stdout(`registrado: ${outcome.provenance.modelName} (external, sha256 ${outcome.provenance.sha256})`)
    return EXIT_OK
  }
  context.output.stderr(`local-models-import: ${outcome.kind === 'refused' ? 'rehusado' : 'falló'}: ${outcome.reason}`)
  return outcome.kind === 'refused' ? EXIT_REFUSED : EXIT_NOT_APPROVED
}

export function parseImportArguments(argv: readonly string[]): ImportArguments | undefined {
  const [subcommand, ...rest] = argv
  if (subcommand !== 'run') return undefined
  const options = optionsOf(rest)
  if (options === undefined) return undefined
  const { repository, revision, file, sha256 } = options
  const scratchDir = options['scratch-dir']
  const runDir = options['run-dir']
  if (!repository || !revision || !file || !sha256 || !scratchDir || !runDir) return undefined
  const [files, digests] = [file.split(LIST_SEPARATOR), sha256.split(LIST_SEPARATOR)]
  if (files.length !== digests.length || files.some(name => !name) || !digests.every(digest => SHA256_PATTERN.test(digest))) return undefined
  const quantization = options.quantization ?? DEFAULT_QUANTIZATION
  if (!isGgufQuantization(quantization)) return undefined
  return {
    request: { repository, revision, parts: files.map((name, index) => ({ file: name, sha256: digests[index]! })), quantization, scratchDir: resolve(scratchDir), runDir: resolve(runDir),
      memoryLimitBytes: Number(options['memory-limit-bytes'] ?? DEFAULT_MEMORY_LIMIT_BYTES) },
    cpus: Number(options.cpus ?? DEFAULT_CPUS),
  }
}
