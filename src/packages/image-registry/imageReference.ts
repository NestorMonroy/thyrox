/**
 * La referencia OCI de una imagen: `registro/repositorio[:etiqueta][@sha256:…]`.
 *
 * El registro siempre es explícito: una referencia corta como `ubuntu:24.04`
 * no se completa con `docker.io`, porque esa suposición es justo la que ataría
 * Thyrox a un proveedor. La forma canónica, la que guarda un catálogo y pide
 * un consumidor, es la fijada por digest: `registro/repositorio@sha256:<digest>`.
 * La etiqueta es una ayuda para personas; no identifica nada.
 */

export type ImageReference = { registry: string; repository: string; tag?: string; digest?: string }

export type PinnedImageReference = ImageReference & { digest: string }

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/
const DIGEST_SEPARATOR = '@'
const LOCAL_REGISTRY = 'localhost'

export class InvalidImageReferenceError extends Error {
  constructor(text: string, reason: string) {
    super(`referencia de imagen inválida «${text}»: ${reason}`)
    this.name = 'InvalidImageReferenceError'
  }
}

export function isDigest(value: string): boolean {
  return DIGEST_PATTERN.test(value)
}

/** Un primer segmento es un registro si lleva un punto, un puerto o es `localhost`. */
function isRegistryHost(segment: string): boolean {
  return segment.includes('.') || segment.includes(':') || segment === LOCAL_REGISTRY
}

export function parseImageReference(text: string): ImageReference {
  const [named, digest, extra] = text.trim().split(DIGEST_SEPARATOR)
  if (named === undefined || named === '' || extra !== undefined) throw new InvalidImageReferenceError(text, 'se espera registro/repositorio[:etiqueta][@digest]')
  if (digest !== undefined && !isDigest(digest)) throw new InvalidImageReferenceError(text, `digest ilegible «${digest}»`)
  const firstSlash = named.indexOf('/')
  const registry = firstSlash === -1 ? '' : named.slice(0, firstSlash)
  if (!isRegistryHost(registry)) throw new InvalidImageReferenceError(text, 'falta el registro: escríbelo explícito (p. ej. registry.example.com/…)')
  const path = named.slice(firstSlash + 1)
  const tagSeparator = path.lastIndexOf(':')
  const repository = tagSeparator === -1 ? path : path.slice(0, tagSeparator)
  const tag = tagSeparator === -1 ? undefined : path.slice(tagSeparator + 1)
  if (repository === '' || tag === '') throw new InvalidImageReferenceError(text, 'repositorio o etiqueta vacíos')
  return { registry, repository, ...(tag === undefined ? {} : { tag }), ...(digest === undefined ? {} : { digest }) }
}

export function isPinned(reference: ImageReference): reference is PinnedImageReference {
  return reference.digest !== undefined && isDigest(reference.digest)
}

export function pin(reference: ImageReference, digest: string): PinnedImageReference {
  if (!isDigest(digest)) throw new InvalidImageReferenceError(digest, 'digest ilegible')
  return { ...reference, digest }
}

/** `registro/repositorio[:etiqueta]`, sin digest: la forma con que se publica. */
export function taggedReference(reference: ImageReference): string {
  return `${reference.registry}/${reference.repository}${reference.tag === undefined ? '' : `:${reference.tag}`}`
}

/** `registro/repositorio@sha256:<digest>`: la forma canónica, sin etiqueta. */
export function canonicalReference(reference: PinnedImageReference): string {
  return `${reference.registry}/${reference.repository}${DIGEST_SEPARATOR}${reference.digest}`
}
