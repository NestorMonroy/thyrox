/**
 * El requisito de imagen de un trabajo (contratos 12, 15 y 19 de
 * TASK-THYROX-0691): qué imagen necesita, de dónde sale, a qué ciclo de vida
 * pertenece y cuánto disco cuesta tenerla. El ejecutor lo recibe declarado; no
 * interpreta un nombre suelto.
 */
import { CACHE_KEY_LABEL, type ImageOwner, LIFECYCLE_LABEL, OWNER_ID_LABEL, OWNER_KIND_LABEL } from './imageLifecycle.ts'
import { isPinned, type PinnedImageReference } from './imageReference.ts'

/** Cómo construir una imagen local: contexto, Containerfile y etiqueta de nombre. */
export type BuildDefinition = { context: string; containerfile?: string; tag: string }

type DiskCost = {
  /** Pico de disco de traerla o construirla; la admisión lo reserva antes de empezar. */
  estimatedDiskBytes: number
}

export type EphemeralImageRequirement = DiskCost & { lifecycle: 'ephemeral'; source: 'local-build'; build: BuildDefinition; owner: ImageOwner }

export type CacheImageRequirement = DiskCost & { lifecycle: 'cache'; source: 'local-build'; build: BuildDefinition; cacheKey: string }

export type PermanentImageRequirement = DiskCost & { lifecycle: 'permanent'; source: 'registry'; reference: PinnedImageReference }

export type InfrastructureImageRequirement = DiskCost & { lifecycle: 'infrastructure'; source: 'registry' | 'upstream'; reference: PinnedImageReference }

export type ImageRequirement = EphemeralImageRequirement | CacheImageRequirement | PermanentImageRequirement | InfrastructureImageRequirement

export type BuiltImageRequirement = EphemeralImageRequirement | CacheImageRequirement

export class InvalidImageRequirementError extends Error {
  constructor(lifecycle: string, reason: string) {
    super(`requisito de imagen ${lifecycle} inválido: ${reason}`)
    this.name = 'InvalidImageRequirementError'
  }
}

function isBlank(value: string): boolean {
  return value.trim() === ''
}

export function validateImageRequirement<R extends ImageRequirement>(requirement: R): R {
  const { lifecycle } = requirement
  if (!Number.isSafeInteger(requirement.estimatedDiskBytes) || requirement.estimatedDiskBytes <= 0) {
    throw new InvalidImageRequirementError(lifecycle, 'estimatedDiskBytes tiene que ser un entero positivo')
  }
  switch (requirement.lifecycle) {
    case 'permanent':
    case 'infrastructure':
      if (!isPinned(requirement.reference)) throw new InvalidImageRequirementError(lifecycle, 'la referencia tiene que estar fijada por digest; la etiqueta no es identidad')
      break
    case 'ephemeral':
      if (isBlank(requirement.owner.id)) throw new InvalidImageRequirementError(lifecycle, 'owner.id no puede estar vacío')
      break
    case 'cache':
      if (isBlank(requirement.cacheKey)) throw new InvalidImageRequirementError(lifecycle, 'cacheKey no puede estar vacía')
      break
  }
  return requirement
}

/** Las etiquetas que declaran el ciclo de vida de una imagen construida. */
export function buildLabels(requirement: BuiltImageRequirement): Record<string, string> {
  if (requirement.lifecycle === 'cache') return { [LIFECYCLE_LABEL]: 'cache', [CACHE_KEY_LABEL]: requirement.cacheKey }
  return { [LIFECYCLE_LABEL]: 'ephemeral', [OWNER_KIND_LABEL]: requirement.owner.kind, [OWNER_ID_LABEL]: requirement.owner.id }
}
