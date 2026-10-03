/**
 * Las imágenes que thyrox puede construir, por identidad lógica.
 *
 * Una construcción declarada no recibe contexto, Containerfile, red, ciclo de
 * vida ni etiqueta de quien la pide: todo sale de esta definición versionada.
 * Así el plano de control puede pedir «construye la imagen X» sin ganar el
 * `build-image` genérico, cuyo contexto y Containerfile elegidos por el
 * llamador son un programa arbitrario. El registro de destino no vive aquí:
 * lo decide la configuración de `ImageRegistry` al publicar.
 */
import type { BuildDefinition } from './imageRequirement.ts'

/** La etiqueta con la identidad lógica de la definición que produjo la imagen. */
export const DEFINITION_LABEL = 'io.thyrox.image.definition'
/** La etiqueta con el commit completo en que esa definición estaba versionada. */
export const DEFINITION_COMMIT_LABEL = 'io.thyrox.image.definition-commit'
/** Este catálogo, relativo a la raíz: forma parte de la definición de cada imagen que declara. */
export const DEFINITION_CATALOG_PATH = 'src/packages/image-registry/declaredImages.ts'

const COMMIT_PATTERN = /^[0-9a-f]{40}$/
const CANDIDATE_TAG_PREFIX = 'candidate-'
const SHORT_COMMIT_LENGTH = 12

export type DeclaredImage = Omit<BuildDefinition, 'tag'> & {
  /** Identidad lógica: lo único que el solicitante nombra. */
  id: string
  /** Repositorio local de la candidata; la etiqueta se deriva del commit. */
  repository: string
  /** Toda imagen declarada es una herramienta que se distribuye. */
  lifecycle: 'permanent'
  /** La red de sus RUN la decide la definición, nunca el solicitante. */
  network: 'none' | 'host'
  /** Pico de disco de construirla; la admisión lo reserva antes de que Podman empiece. */
  estimatedDiskBytes: number
}

export const DECLARED_IMAGES: readonly DeclaredImage[] = [
  {
    id: 'thyrox-model-quantizer',
    // Contexto relativo a la raíz del repositorio; su Containerfile es el del contexto.
    context: 'src/packages/model-artifacts/quantizer-image',
    repository: 'localhost/thyrox-model-quantizer',
    lifecycle: 'permanent',
    // Sus RUN instalan paquetes del sistema: el único egreso es el proxy del anfitrión.
    network: 'host',
    // Medido: la primera construcción por esta ruta bajó el disco libre de 5316 a 2452 MiB
    // (banco publish-quantizer-image-20261003T005015); 3 GiB lo cubre, el piso lo pone la admisión.
    estimatedDiskBytes: 3 * 1024 ** 3,
  },
]

export class UndeclaredImageError extends Error {
  constructor(id: string) {
    super(`imagen no declarada: ${id} (declaradas: ${DECLARED_IMAGES.map(image => image.id).join(', ')})`)
    this.name = 'UndeclaredImageError'
  }
}

export class UnversionedDefinitionError extends Error {
  constructor(image: DeclaredImage, reason: string) {
    super(`la definición de ${image.id} (${image.context}) no tiene identidad versionada: ${reason}`)
    this.name = 'UnversionedDefinitionError'
  }
}

export function findDeclaredImage(id: string): DeclaredImage {
  const image = DECLARED_IMAGES.find(candidate => candidate.id === id)
  if (image === undefined) throw new UndeclaredImageError(id)
  return image
}

/** El estado de la definición en el repositorio: el commit y si su contexto difiere de él. */
export type DefinitionRevision = { commit: string; clean: boolean }

/** La etiqueta de la candidata construida desde `commit`; nunca `:dev` ni una elegida a mano. */
export function candidateTag(image: DeclaredImage, revision: DefinitionRevision): string {
  if (!COMMIT_PATTERN.test(revision.commit)) throw new UnversionedDefinitionError(image, `el commit tiene que ser completo; llegó «${revision.commit}»`)
  if (!revision.clean) throw new UnversionedDefinitionError(image, 'su contexto tiene cambios sin commitear')
  return `${image.repository}:${CANDIDATE_TAG_PREFIX}${revision.commit.slice(0, SHORT_COMMIT_LENGTH)}`
}

export function definitionLabels(image: DeclaredImage, revision: DefinitionRevision): Record<string, string> {
  return { [DEFINITION_LABEL]: image.id, [DEFINITION_COMMIT_LABEL]: revision.commit }
}
