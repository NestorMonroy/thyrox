/**
 * Cuándo un modelo local es elegible para una clase de tarea: sólo si una
 * suite midió, sobre ese modelo exacto (nombre contractual con su revisión),
 * las dos cosas que la clase exige, y ninguna se infiere de la otra:
 *
 * - **protocolo** (`kind: 'protocol'`): que emite llamadas a herramienta bien
 *   formadas. Es condición necesaria, no competencia: un modelo de 0,5B
 *   aprobó `tool-calling@1` 6/6 y respondió «3» a «2+2».
 * - **tarea** (`kind: 'task'`): que resuelve el trabajo de la clase, medido
 *   con un ítem real y su verify.
 *
 * Cada medición declara su condición: `isolated` (sin otra carga que la
 * desplace) o `contended`. Una velocidad contendida no ordena candidatos: se
 * sabe inválida para comparar.
 *
 * Es el contrato entre quien mide (`bin/model-qualify`) y quien elige el
 * modelo de una tarea (el recomendador): los dos leen y escriben esta forma.
 */

import type { ModelCatalogEntry } from './catalogEntry.js'

/** Las clases de tarea de thyrox; las mismas que `TASK_KINDS` del recomendador. */
export const LOCAL_TASK_CLASSES = ['mecanica', 'analisis', 'adversarial', 'frontera'] as const
export type LocalTaskClass = (typeof LOCAL_TASK_CLASSES)[number]

/** Qué demuestra una cualificación: el formato del protocolo, la tarea de una clase o la recuperación por embeddings. */
export type QualificationKind = 'protocol' | 'task' | 'embedding'

/** Si la medición corrió sola o con otra carga que la desplazaba. */
export type MeasurementCondition = 'isolated' | 'contended'

export interface ModelQualification {
  /** Nombre contractual del catálogo. */
  readonly model: string
  readonly kind: QualificationKind
  /** La clase que una cualificación de tarea mide; una de protocolo no tiene. */
  readonly taskClass?: LocalTaskClass
  /** Identificador y versión de la suite que midió (`tool-calling@1`). */
  readonly suite: string
  readonly casesPassed: number
  readonly casesTotal: number
  readonly passed: boolean
  /** Contexto con que se sirvió el modelo durante la medición, en tokens. */
  readonly contextTokens: number
  readonly tokensPerSecond: number
  readonly measurementCondition: MeasurementCondition
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

const QUALIFICATION_KINDS: readonly QualificationKind[] = ['protocol', 'task', 'embedding']
const KIND_LABELS: Readonly<Record<QualificationKind, string>> = { protocol: 'protocolo', task: 'tarea', embedding: 'embeddings' }
const MEASUREMENT_CONDITIONS: readonly MeasurementCondition[] = ['isolated', 'contended']

function requireOneOf<T extends string>(record: Record<string, unknown>, key: string, allowed: readonly T[], path: string): T {
  const value = requireString(record, key, path)
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidQualificationError(`${path}.${key}`, `«${value}» no es ${allowed.join(', ')}`)
  }
  return value as T
}

/** La clase es obligatoria en una cualificación de tarea y no existe en las demás. */
function taskClassFor(kind: QualificationKind, record: Record<string, unknown>, path: string): LocalTaskClass | undefined {
  if (kind === 'task') return requireTaskClass(record, path)
  if (record.taskClass !== undefined) {
    throw new InvalidQualificationError(`${path}.taskClass`, `una cualificación de ${KIND_LABELS[kind]} no mide ninguna clase`)
  }
  return undefined
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
  const kind = requireOneOf(record, 'kind', QUALIFICATION_KINDS, path)
  const taskClass = taskClassFor(kind, record, path)
  return {
    model: requireString(record, 'model', path),
    kind,
    ...(taskClass === undefined ? {} : { taskClass }),
    suite: requireString(record, 'suite', path),
    casesPassed,
    casesTotal,
    passed: record.passed,
    contextTokens,
    tokensPerSecond,
    measurementCondition: requireOneOf(record, 'measurementCondition', MEASUREMENT_CONDITIONS, path),
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

function scopeOf(qualification: ModelQualification): string {
  return qualification.kind === 'task' ? `task:${qualification.taskClass}` : qualification.kind
}

function byMeasurementKey(left: ModelQualification, right: ModelQualification): number {
  return left.model.localeCompare(right.model) || scopeOf(left).localeCompare(scopeOf(right))
    || left.measuredAt.localeCompare(right.measuredAt)
}

/** Serializa en orden estable, con salto de línea final. */
export function serializeQualifications(qualifications: readonly ModelQualification[]): string {
  return `${JSON.stringify({ qualifications: [...qualifications].sort(byMeasurementKey) }, null, 2)}\n`
}

/**
 * La medición vigente de un modelo para un alcance (protocolo, o tarea de una
 * clase): la más reciente. Una medición nueva que suspende retira la
 * aprobación de una anterior.
 */
function latestFor(qualifications: readonly ModelQualification[], model: string, scope: string): ModelQualification | undefined {
  return qualifications
    .filter((q) => q.model === model && scopeOf(q) === scope)
    .reduce<ModelQualification | undefined>((latest, q) => (!latest || q.measuredAt > latest.measuredAt ? q : latest), undefined)
}

export interface QualifiedLocalModel {
  readonly entry: ModelCatalogEntry
  /** La cualificación de tarea de la clase: la que da el contexto y la velocidad. */
  readonly qualification: ModelQualification
  readonly protocol: ModelQualification
}

function passed(qualification: ModelQualification | undefined): qualification is ModelQualification {
  return qualification !== undefined && qualification.passed
}

/** Primero las medidas aisladas, de la más rápida a la más lenta; las contendidas después, sin ordenar por velocidad. */
function bySpeedWhenIsolated(left: QualifiedLocalModel, right: QualifiedLocalModel): number {
  const leftIsolated = left.qualification.measurementCondition === 'isolated'
  const rightIsolated = right.qualification.measurementCondition === 'isolated'
  if (leftIsolated !== rightIsolated) return leftIsolated ? -1 : 1
  const speed = leftIsolated ? right.qualification.tokensPerSecond - left.qualification.tokensPerSecond : 0
  return speed || left.entry.name.localeCompare(right.entry.name)
}

/**
 * Los modelos del catálogo elegibles para `taskClass`: protocolo aprobado,
 * tarea de esa clase aprobada y al menos `minContextTokens` de contexto
 * medido en la medición de tarea. Ordenados por velocidad sólo entre medidas
 * aisladas. Una cualificación de un modelo que no está en el catálogo no
 * cuenta: el nombre lleva la revisión, así que otra revisión es otro modelo.
 * Elegible no es autorizado: decide el scheduler y autoriza el grant.
 */
export function qualifiedModels(
  entries: readonly ModelCatalogEntry[],
  qualifications: readonly ModelQualification[],
  taskClass: LocalTaskClass,
  minContextTokens: number,
): QualifiedLocalModel[] {
  return entries
    .map((entry) => ({
      entry,
      qualification: latestFor(qualifications, entry.name, `task:${taskClass}`),
      protocol: latestFor(qualifications, entry.name, 'protocol'),
    }))
    .filter((candidate): candidate is QualifiedLocalModel =>
      passed(candidate.protocol) && passed(candidate.qualification)
      && candidate.qualification.contextTokens >= minContextTokens)
    .sort(bySpeedWhenIsolated)
}

export interface QualifiedEmbeddingModel {
  readonly entry: ModelCatalogEntry
  readonly qualification: ModelQualification
}

/**
 * Los modelos del catálogo elegibles para producir embeddings: declaran la
 * capacidad `embeddings` y su medición de embeddings vigente aprobó. La
 * capacidad sale del GGUF, nunca del nombre; y la medición es la que prueba
 * que recupera. Ninguna de las dos basta sola. Elegible no es autorizado.
 */
export function qualifiedEmbeddingModels(
  entries: readonly ModelCatalogEntry[],
  qualifications: readonly ModelQualification[],
): QualifiedEmbeddingModel[] {
  return entries
    .filter((entry) => entry.capabilities.includes('embeddings'))
    .map((entry) => ({ entry, qualification: latestFor(qualifications, entry.name, 'embedding') }))
    .filter((candidate): candidate is QualifiedEmbeddingModel => passed(candidate.qualification))
}
