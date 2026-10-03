/**
 * Mover imágenes entre el almacén local y un registro (ADR-THYROX-007,
 * TASK-THYROX-0725): subir, traer y leer el digest con que el almacén guarda
 * una imagen. Es la parte de transporte de la primitiva; no sabe de
 * proveedores, de repositorios ni de dónde sale una credencial. Los adapters
 * de `@thyrox/image-registry` deciden eso y llaman aquí.
 *
 * La credencial llega como la ruta de un authfile: nunca pasa por argv, que
 * cualquier proceso lee en `/proc`. El digest publicado es el que el registro
 * devuelve en `--digestfile`, no el del almacén local: el runtime puede
 * recomprimir las capas al subir, y entonces los dos difieren.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { PodmanCommandResult, PodmanExecutor } from './podmanExecutor.js'

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/

export type ImageTransferStage = 'push' | 'pull' | 'verify'

export class ImageTransferError extends Error {
  constructor(
    readonly stage: ImageTransferStage,
    subject: string,
    reason: string,
  ) {
    super(`falló la etapa ${stage} sobre ${subject}: ${reason}`)
    this.name = 'ImageTransferError'
  }
}

function podmanFailure(result: PodmanCommandResult): string {
  return result.stderr.trim() || `exit ${result.exitCode}`
}

function authArgs(authFile: string | undefined): string[] {
  return authFile === undefined ? [] : ['--authfile', authFile]
}

function requireDigest(stage: ImageTransferStage, subject: string, value: string): string {
  const digest = value.trim()
  if (!DIGEST_PATTERN.test(digest)) throw new ImageTransferError(stage, subject, `digest ilegible: «${digest}»`)
  return digest
}

/** Sube `source` a `destination` y devuelve el digest que asignó el registro. */
export async function pushImage(podman: PodmanExecutor, source: string, destination: string, authFile?: string): Promise<string> {
  const workDir = mkdtempSync(join(tmpdir(), 'thyrox-push-'))
  const digestFile = join(workDir, 'digest')
  try {
    const result = await podman.run(['push', ...authArgs(authFile), '--digestfile', digestFile, source, destination])
    if (result.exitCode !== 0) throw new ImageTransferError('push', destination, podmanFailure(result))
    return requireDigest('push', destination, readFileSync(digestFile, 'utf8'))
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

export async function pullImage(podman: PodmanExecutor, reference: string, authFile?: string): Promise<void> {
  const result = await podman.run(['pull', ...authArgs(authFile), reference])
  if (result.exitCode !== 0) throw new ImageTransferError('pull', reference, podmanFailure(result))
}

/** El digest de manifiesto con que el almacén local guarda la imagen. */
export async function storedDigest(podman: PodmanExecutor, reference: string): Promise<string> {
  const result = await podman.run(['image', 'inspect', reference, '--format', '{{.Digest}}'])
  if (result.exitCode !== 0) throw new ImageTransferError('verify', reference, podmanFailure(result))
  return requireDigest('verify', reference, result.stdout)
}
