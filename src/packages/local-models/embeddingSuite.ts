/**
 * Suite de cualificación de EMBEDDINGS: mide que un modelo sirve para
 * recuperar, no que carga (eso lo valida `llama-embedding` al importar) ni
 * que conversa (eso es `toolCallingSuite.ts` y `taskSuite.ts`).
 *
 * Cada caso declara una consulta, su documento relevante y al menos un
 * distractor. Aprueba si la consulta queda más cerca, por coseno, del
 * relevante que de cada distractor. Un caso sin distractores se rehúsa al
 * leer: aprobaría cualquier modelo.
 *
 * Métrica: orden por coseno del relevante frente a los distractores, binaria
 * por caso, más el margen (coseno del relevante menos el del distractor más
 * cercano).
 * Ciega a: la calidad sobre documentos que ningún caso nombra, y a la
 * calibración absoluta del coseno entre modelos distintos.
 */

import { readFile } from 'node:fs/promises'

export interface EmbeddingCase {
  readonly id: string
  readonly query: string
  readonly relevant: string
  readonly distractors: readonly string[]
}

export interface EmbeddingSuite {
  readonly id: string
  readonly cases: readonly EmbeddingCase[]
}

/** Los vectores de un caso, en el mismo orden que sus textos. */
export interface EmbeddingCaseVectors {
  readonly query: readonly number[]
  readonly relevant: readonly number[]
  readonly distractors: readonly (readonly number[])[]
}

export interface EmbeddingScore {
  readonly passed: boolean
  /** Coseno del relevante menos el del distractor más cercano; positivo si aprueba. */
  readonly margin: number
}

export class InvalidEmbeddingSuiteError extends Error {
  constructor(readonly path: string, readonly field: string, reason: string) {
    super(`suite de embeddings inválida (${path}) en ${field}: ${reason}`)
    this.name = 'InvalidEmbeddingSuiteError'
  }
}

/** Un vector que no admite coseno: puntuarlo daría un número sin significado. */
export class InvalidEmbeddingVectorError extends Error {
  constructor(reason: string) {
    super(`vector de embedding inválido: ${reason}`)
    this.name = 'InvalidEmbeddingVectorError'
  }
}

type JsonObject = Record<string, unknown>

export async function loadEmbeddingSuite(path: string): Promise<EmbeddingSuite> {
  const document = parseDocument(path, await readSuite(path))
  const id = requireText(path, 'id', document.id)
  const cases = document.cases
  if (!Array.isArray(cases) || cases.length === 0) throw new InvalidEmbeddingSuiteError(path, 'cases', 'se espera una lista no vacía')
  return { id, cases: cases.map((value, index) => embeddingCase(path, value, index)) }
}

export function scoreEmbeddingCase(vectors: EmbeddingCaseVectors): EmbeddingScore {
  const relevant = cosine(vectors.query, vectors.relevant)
  const nearestDistractor = Math.max(...vectors.distractors.map(distractor => cosine(vectors.query, distractor)))
  const margin = relevant - nearestDistractor
  return { passed: margin > 0, margin }
}

function cosine(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length) throw new InvalidEmbeddingVectorError(`dimensiones distintas: ${left.length} y ${right.length}`)
  const leftNorm = norm(left)
  const rightNorm = norm(right)
  if (leftNorm === 0 || rightNorm === 0) throw new InvalidEmbeddingVectorError('vector nulo: el coseno no está definido')
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] as number), 0)
  return dot / (leftNorm * rightNorm)
}

function norm(vector: readonly number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
}

function embeddingCase(path: string, value: unknown, index: number): EmbeddingCase {
  const field = `cases[${index}]`
  if (!isObject(value)) throw new InvalidEmbeddingSuiteError(path, field, 'se espera un objeto')
  const distractors = value.distractors
  if (!Array.isArray(distractors) || distractors.length === 0) {
    throw new InvalidEmbeddingSuiteError(path, `${field}.distractors`, 'se espera al menos un distractor: sin él el caso aprueba cualquier modelo')
  }
  return {
    id: requireText(path, `${field}.id`, value.id),
    query: requireText(path, `${field}.query`, value.query),
    relevant: requireText(path, `${field}.relevant`, value.relevant),
    distractors: distractors.map((text, position) => requireText(path, `${field}.distractors[${position}]`, text)),
  }
}

function requireText(path: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || value === '') throw new InvalidEmbeddingSuiteError(path, field, 'se espera una cadena no vacía')
  return value
}

async function readSuite(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    throw new InvalidEmbeddingSuiteError(path, '<archivo>', (error as Error).message)
  }
}

function parseDocument(path: string, text: string): JsonObject {
  let document: unknown
  try {
    document = JSON.parse(text) as unknown
  } catch (error) {
    throw new InvalidEmbeddingSuiteError(path, '<raíz>', `no es JSON (${(error as Error).message})`)
  }
  if (!isObject(document)) throw new InvalidEmbeddingSuiteError(path, '<raíz>', 'se espera un objeto')
  return document
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
