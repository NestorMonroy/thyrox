/**
 * Promover y publicar (contratos 13 y 14 de TASK-THYROX-0691).
 *
 * Construir una imagen no la publica. El único camino al registro es:
 *
 *   candidata declarada `permanent` → `promoteCandidate` → `publishPromotedImage`
 *
 * La promoción exige una definición reproducible fijada por commit, una
 * validación aprobada, procedencia, y que el historial y el `Config.Env` de la
 * imagen no lleven nada del entorno de build ni de la credencial. Una imagen
 * efímera, de caché, de infraestructura o sin clase declarada no se promueve.
 *
 * `PromotedImage` sólo lo produce `promoteCandidate`: el módulo recuerda cada
 * promoción en un `WeakSet`, así que un objeto con la misma forma construido
 * a mano no se publica.
 *
 * Sobre la fuga: además de los valores prohibidos se buscan los nombres de las
 * variables de entorno de build con cualquier valor, porque el valor de una
 * construcción anterior no coincide con el del entorno actual. El rechazo
 * nombra las variables y cuenta los valores, sin repetir ninguno.
 */
import { readLabels } from '@thyrox/podman-execution/imageStore.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { imageHistory, inspectImage } from '@thyrox/podman-execution/podmanObservation.ts'

import { lifecycleOf } from './imageLifecycle.ts'
import type { ImageReference, PinnedImageReference } from './imageReference.ts'
import { type ImageRegistry, requireWriter } from './imageRegistry.ts'

export const BUILD_ENVIRONMENT_KEYS: readonly string[] = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']

const COMMIT_PATTERN = /^[0-9a-f]{40}$/

export type PublishGuard = {
  /** Valores que no pueden viajar en la imagen: el secreto y los del entorno de build. */
  forbiddenValues: readonly string[]
  /** Variables que no pueden quedar grabadas con ningún valor; sin declarar, las de proxy. */
  forbiddenKeys?: readonly string[]
}

export type PromotionEvidence = {
  /** La definición reproducible: repositorio, commit completo y ruta del Containerfile. */
  definition: { repository: string; commit: string; path: string }
  validation: { passed: true; evidenceRef: string }
  provenance: Readonly<Record<string, string>>
}

export type PromotedImage = { readonly localImage: string; readonly evidence: PromotionEvidence }

export class PromotionRefusedError extends Error {
  constructor(image: string, reason: string) {
    super(`no se promueve ${image}: ${reason}`)
    this.name = 'PromotionRefusedError'
  }
}

export class ImageLeakError extends Error {
  constructor(source: string, keys: readonly string[], valueCount: number) {
    const parts = [keys.length > 0 ? `las variables ${keys.join(', ')}` : '', valueCount > 0 ? `${valueCount} valor(es) prohibido(s)` : ''].filter(part => part !== '')
    super(`la imagen ${source} lleva ${parts.join(' y ')} en su historial o su Config.Env; no se publica`)
    this.name = 'ImageLeakError'
  }
}

const promotions = new WeakSet<PromotedImage>()


function recordsKey(text: string, key: string): boolean {
  return new RegExp(`(^|[\\s"|])${key}=`).test(text)
}

/** Rehúsa si el historial o el entorno de la imagen graban una variable o un valor prohibidos. */
export async function assertImageFreeOf(podman: PodmanExecutor, source: string, guard: PublishGuard): Promise<void> {
  // Lo observa el dueño de Podman (ADR-007 Regla 4, P3); aquí sólo se juzga.
  const history = await imageHistory(podman, source)
  const image = await inspectImage(podman, source)
  if (!image) throw new Error(`no se pudo leer la imagen ${source}: no está en el almacén local`)
  const recorded = `${history.join('\n')}\n${JSON.stringify(image.env)}`
  const keys = (guard.forbiddenKeys ?? BUILD_ENVIRONMENT_KEYS).filter(key => recordsKey(recorded, key))
  const values = guard.forbiddenValues.filter(value => value !== '' && recorded.includes(value))
  if (keys.length > 0 || values.length > 0) throw new ImageLeakError(source, keys, values.length)
}

function assertEvidence(localImage: string, evidence: PromotionEvidence): void {
  const { definition, validation } = evidence
  if (definition.repository.trim() === '' || definition.path.trim() === '') throw new PromotionRefusedError(localImage, 'la definición necesita repositorio y ruta')
  if (!COMMIT_PATTERN.test(definition.commit)) throw new PromotionRefusedError(localImage, `la definición tiene que fijarse por un commit completo; llegó «${definition.commit}»`)
  if (validation.passed !== true || validation.evidenceRef.trim() === '') throw new PromotionRefusedError(localImage, 'falta una validación aprobada con su evidencia')
}

export async function promoteCandidate(podman: PodmanExecutor, localImage: string, evidence: PromotionEvidence, guard: PublishGuard): Promise<PromotedImage> {
  const lifecycle = lifecycleOf(await readLabels(podman, localImage))
  if (lifecycle !== 'permanent') throw new PromotionRefusedError(localImage, `declara ciclo de vida ${lifecycle ?? '(sin declarar)'}; sólo una candidata permanent se promueve`)
  assertEvidence(localImage, evidence)
  await assertImageFreeOf(podman, localImage, guard)
  const promoted: PromotedImage = Object.freeze({ localImage, evidence })
  promotions.add(promoted)
  return promoted
}

/** Publica una imagen promovida con el registro dado, sea cual sea su proveedor. */
export async function publishPromotedImage(registry: ImageRegistry, promoted: PromotedImage, destination: ImageReference): Promise<PinnedImageReference> {
  if (!promotions.has(promoted)) throw new PromotionRefusedError(promoted.localImage, 'no salió de promoteCandidate')
  return requireWriter(registry).push(promoted.localImage, destination)
}
