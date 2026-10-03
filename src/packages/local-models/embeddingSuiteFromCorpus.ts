/**
 * Deriva una suite de embeddings de un corpus propio en vez de casos escritos
 * a mano: el corpus de hallazgos de thyrox es el trabajo real que la
 * búsqueda semántica tiene que recuperar. Cada registro aporta su resumen
 * como consulta y su contenido como documento relevante; los distractores
 * son contenidos de otros registros.
 *
 * La selección es determinista sin generador aleatorio: los registros se
 * ordenan por sha256(semilla + id), y la misma semilla sobre el mismo corpus
 * da la misma suite en cualquier orden de entrada.
 *
 * Métrica que habilita: recuperación del contenido propio frente a contenidos
 * ajenos del mismo dominio.
 * Ciega a: consultas que no se parezcan a un resumen (preguntas libres), y a
 * dos registros con contenido casi idéntico, que el caso contaría como fallo.
 */

import { createHash } from 'node:crypto'

import type { EmbeddingCase, EmbeddingSuite } from './embeddingSuite.js'

export interface CorpusRecord {
  readonly id: string
  readonly summary: string
  readonly content: string
}

export interface CorpusSuiteOptions {
  readonly id: string
  readonly caseCount: number
  readonly distractorsPerCase: number
  readonly seed: string
}

export class InsufficientCorpusError extends Error {
  constructor(readonly usable: number, readonly needed: number) {
    super(`el corpus tiene ${usable} registro(s) utilizables; la suite pide ${needed} (casos más distractores)`)
    this.name = 'InsufficientCorpusError'
  }
}

export function buildEmbeddingSuiteFromCorpus(records: readonly CorpusRecord[], options: CorpusSuiteOptions): EmbeddingSuite {
  const ordered = records.filter(isUsableRecord).sort(bySeededHash(options.seed))
  const needed = options.caseCount + options.distractorsPerCase
  if (ordered.length < needed) throw new InsufficientCorpusError(ordered.length, needed)
  const cases = ordered.slice(0, options.caseCount).map((record, index) => caseOf(record, distractorsFor(ordered, index, options.distractorsPerCase)))
  return { id: options.id, cases }
}

/** Un resumen vacío o idéntico al contenido haría el caso trivial o vacío. */
function isUsableRecord(record: CorpusRecord): boolean {
  return record.summary.trim() !== '' && record.content.trim() !== '' && record.summary !== record.content
}

function bySeededHash(seed: string): (left: CorpusRecord, right: CorpusRecord) => number {
  const keyOf = (record: CorpusRecord): string => createHash('sha256').update(`${seed}\0${record.id}`).digest('hex')
  return (left, right) => keyOf(left).localeCompare(keyOf(right))
}

/** Los registros que siguen al caso en el orden sembrado, con vuelta al inicio y sin el propio. */
function distractorsFor(ordered: readonly CorpusRecord[], caseIndex: number, count: number): string[] {
  const distractors: string[] = []
  for (let offset = 1; distractors.length < count; offset += 1) {
    const content = (ordered[(caseIndex + offset) % ordered.length] as CorpusRecord).content
    if (content !== (ordered[caseIndex] as CorpusRecord).content && !distractors.includes(content)) distractors.push(content)
  }
  return distractors
}

function caseOf(record: CorpusRecord, distractors: readonly string[]): EmbeddingCase {
  return { id: record.id, query: record.summary, relevant: record.content, distractors }
}
