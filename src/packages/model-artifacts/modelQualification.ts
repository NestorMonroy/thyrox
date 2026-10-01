/**
 * Cuándo un modelo local cumple una clase de tarea: sólo si existe una
 * medición aprobada de esa clase sobre ese modelo exacto (nombre contractual
 * con su revisión). Un modelo local no declara rango de capacidad como lo hace
 * el catálogo del proveedor; lo que se publica aquí es lo que una suite midió.
 *
 * Es el contrato entre quien mide (`bin/model-qualify`) y quien elige el
 * modelo de una tarea (el recomendador): los dos leen y escriben esta forma.
 */

import type { ModelCatalogEntry } from './catalogEntry.js'

/** Las clases de tarea de thyrox; las mismas que `TASK_KINDS` del recomendador. */
export const LOCAL_TASK_CLASSES = ['mecanica', 'analisis', 'adversarial', 'frontera'] as const
export type LocalTaskClass = (typeof LOCAL_TASK_CLASSES)[number]

export interface ModelQualification {
  /** Nombre contractual del catálogo. */
  readonly model: string
  readonly taskClass: LocalTaskClass
  /** Identificador y versión de la suite que midió (`tool-calling@1`). */
  readonly suite: string
  readonly casesPassed: number
  readonly casesTotal: number
  readonly passed: boolean
  /** Contexto con que se sirvió el modelo durante la medición, en tokens. */
  readonly contextTokens: number
  readonly tokensPerSecond: number
  /** Instante ISO 8601 en UTC. */
  readonly measuredAt: string
}

export class InvalidQualificationError extends Error {
  constructor(readonly path: string, reason: string) {
    super(`cualificación inválida en ${path}: ${reason}`)
    this.name = 'InvalidQualificationError'
  }
}

const ISO_UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new InvalidQualificationError(path, 'se espera un objeto')
  return value as Record<string, unknown>
}

function requireString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value === '') throw new InvalidQualificationError(`${path}.${key}`, 'se espera una cadena no vacía')
  return value
}

function requireNonNegativeInteger(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new InvalidQualificationError(`${path}.${key}`, 'se espera un entero no negativo')
  }
  return value
}

function requireTaskClass(record: Record<string, unknown>, path: string): LocalTaskClass {
  const value = requireString(record, 'taskClass', path)
  if (!(LOCAL_TASK_CLASSES as readonly string[]).includes(value)) {
    throw new InvalidQualificationError(`${path}.taskClass`, `«${value}» no es ${LOCAL_TASK_CLASSES.join(', ')}`)
  }
  return value as LocalTaskClass
}

/** Valida una cualificación campo a campo; el error nombra la ruta del campo. */
export function validateQualification(value: unknown, path = 'qualification'): ModelQualification {
  const record = requireRecord(value, path)
  const casesPassed = requireNonNegativeInteger(record, 'casesPassed', path)
  const casesTotal = requireNonNegativeInteger(record, 'casesTotal', path)
  if (casesTotal === 0 || casesPassed > casesTotal) {
    throw new InvalidQualificationError(`${path}.casesPassed`, `${casesPassed} de ${casesTotal} no es una medición`)
  }
  if (typeof record.passed !== 'boolean') throw new InvalidQualificationError(`${path}.passed`, 'se espera un booleano')
  const tokensPerSecond = record.tokensPerSecond
  if (typeof tokensPerSecond !== 'number' || !Number.isFinite(tokensPerSecond) || tokensPerSecond <= 0) {
    throw new InvalidQualificationError(`${path}.tokensPerSecond`, 'se espera un número positivo')
  }
  const measuredAt = requireString(record, 'measuredAt', path)
  if (!ISO_UTC_INSTANT.test(measuredAt)) throw new InvalidQualificationError(`${path}.measuredAt`, 'se espera un instante ISO 8601 en UTC')
  const contextTokens = requireNonNegativeInteger(record, 'contextTokens', path)
  if (contextTokens === 0) throw new InvalidQualificationError(`${path}.contextTokens`, 'se espera un entero positivo')
  return {
    model: requireString(record, 'model', path),
    taskClass: requireTaskClass(record, path),
    suite: requireString(record, 'suite', path),
    casesPassed,
    casesTotal,
    passed: record.passed,
    contextTokens,
    tokensPerSecond,
    measuredAt,
  }
}

/** Lee el archivo de cualificaciones (`{"qualifications":[…]}`). */
export function parseQualifications(text: string): ModelQualification[] {
  const document = requireRecord(JSON.parse(text) as unknown, 'qualifications-file')
  const list = document.qualifications
  if (!Array.isArray(list)) throw new InvalidQualificationError('qualifications-file.qualifications', 'se espera una lista')
  return list.map((item, index) => validateQualification(item, `qualifications[${index}]`))
}

function byMeasurementKey(left: ModelQualification, right: ModelQualification): number {
  return left.model.localeCompare(right.model) || left.taskClass.localeCompare(right.taskClass)
    || left.measuredAt.localeCompare(right.measuredAt)
}

/** Serializa en orden estable, con salto de línea final. */
export function serializeQualifications(qualifications: readonly ModelQualification[]): string {
  return `${JSON.stringify({ qualifications: [...qualifications].sort(byMeasurementKey) }, null, 2)}\n`
}

/**
 * La medición vigente de un modelo para una clase: la más reciente. Una
 * medición nueva que suspende retira la aprobación de una anterior.
 */
function latestFor(qualifications: readonly ModelQualification[], model: string, taskClass: LocalTaskClass): ModelQualification | undefined {
  return qualifications
    .filter((q) => q.model === model && q.taskClass === taskClass)
    .reduce<ModelQualification | undefined>((latest, q) => (!latest || q.measuredAt > latest.measuredAt ? q : latest), undefined)
}

export interface QualifiedLocalModel {
  readonly entry: ModelCatalogEntry
  readonly qualification: ModelQualification
}

/**
 * Los modelos del catálogo que cumplen `taskClass` con al menos
 * `minContextTokens` de contexto medido, del más rápido al más lento. Una
 * cualificación de un modelo que no está en el catálogo no cuenta: el nombre
 * lleva la revisión, así que otra revisión es otro modelo.
 */
export function qualifiedModels(
  entries: readonly ModelCatalogEntry[],
  qualifications: readonly ModelQualification[],
  taskClass: LocalTaskClass,
  minContextTokens: number,
): QualifiedLocalModel[] {
  return entries
    .map((entry) => ({ entry, qualification: latestFor(qualifications, entry.name, taskClass) }))
    .filter((candidate): candidate is QualifiedLocalModel =>
      candidate.qualification !== undefined && candidate.qualification.passed
      && candidate.qualification.contextTokens >= minContextTokens)
    .sort((left, right) => right.qualification.tokensPerSecond - left.qualification.tokensPerSecond
      || left.entry.name.localeCompare(right.entry.name))
}
