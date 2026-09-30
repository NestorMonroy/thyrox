/**
 * El reranking matemático del store: reordena candidatos por similitud de
 * coseno exacta contra la consulta. El reranking por modelo no es del store:
 * es del worker que consume sus resultados.
 */

/** Un candidato con su vector completo, tal como sale de la búsqueda binaria. */
export type RerankCandidate<T> = { embedding: readonly number[]; item: T }

/** Un resultado reordenado, con su similitud de coseno. */
export type Reranked<T> = { item: T; similarity: number }

function norm(vector: readonly number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
}

/**
 * Similitud de coseno. Un vector de norma cero no tiene dirección: su
 * similitud con cualquier otro se define como 0, en lugar de un NaN que
 * rompería el orden.
 */
export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  const normProduct = norm(left) * norm(right)
  if (normProduct === 0) return 0
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0)
  return dot / normProduct
}

/** Los `k` candidatos de mayor similitud de coseno con `query`, de mayor a menor. */
export function rerankByCosine<T>(query: readonly number[], candidates: readonly RerankCandidate<T>[], k: number): Reranked<T>[] {
  return candidates
    .map(candidate => ({ item: candidate.item, similarity: cosineSimilarity(query, candidate.embedding) }))
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, k)
}
