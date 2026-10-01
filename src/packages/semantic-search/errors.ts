/**
 * Los rechazos del corpus y de sus espacios de embeddings. Cada uno nombra lo
 * que falta o el estado que lo impide: el store nunca responde con un vacío
 * que se confunda con «no hay resultados».
 */
import type { SpaceState } from './config.ts'

/** No hay espacio `active`: buscar sin él devolvería vacío sin serlo. */
export class NoActiveEmbeddingSpaceError extends Error {
  constructor() {
    super('there is no active embedding space: create one, embed the persisted chunks and activate it before searching')
    this.name = 'NoActiveEmbeddingSpaceError'
  }
}

/** El espacio pedido no existe. */
export class UnknownEmbeddingSpaceError extends Error {
  constructor(readonly spaceId: number) {
    super(`embedding space ${spaceId} does not exist`)
    this.name = 'UnknownEmbeddingSpaceError'
  }
}

/** El estado del espacio no admite la operación pedida. */
export class EmbeddingSpaceStateError extends Error {
  constructor(
    readonly spaceId: number,
    readonly state: SpaceState | 'dropped',
    operation: string,
  ) {
    super(`embedding space ${spaceId} is ${state}: cannot ${operation}`)
    this.name = 'EmbeddingSpaceStateError'
  }
}

/** Un documento o un análisis mal formado, rechazado antes de abrir la transacción. */
export class InvalidCorpusInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCorpusInputError'
  }
}

/** El dominio no está declarado en la política del corpus: un archivo que existe no es un origen. */
export class UndeclaredCorpusDomainError extends Error {
  constructor(
    readonly domain: string,
    declared: readonly string[],
  ) {
    super(`domain '${domain}' is not declared in the corpus policy; declared domains: ${declared.join(', ')}`)
    this.name = 'UndeclaredCorpusDomainError'
  }
}

/** Contenido efímero: queda fuera del corpus durable hasta que alguien lo promueva a private o shared. */
export class EphemeralContentError extends Error {
  constructor(readonly domainId: string) {
    super(`document '${domainId}' is ephemeral: it stays out of the durable corpus unless it is explicitly promoted to private or shared`)
    this.name = 'EphemeralContentError'
  }
}
