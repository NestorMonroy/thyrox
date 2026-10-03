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
 * La de **flujo** (`kind: 'workflow'`) mide el worker entero en un worktree
 * aislado; es otra evidencia, no entra en la elegibilidad de la clase.
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

/**
 * Qué demuestra una cualificación: el formato del protocolo, la tarea de una
 * clase, el flujo entero del worker sobre un repositorio (`workflow`,
 * `repo-code-change@1`) o la recuperación por embeddings.
 */
export type QualificationKind = 'protocol' | 'task' | 'workflow' | 'embedding'

/** Si la medición corrió sola o con otra carga que la desplazaba. */
export type MeasurementCondition = 'isolated' | 'contended'
/** Con qué razonamiento respondió el modelo durante la medición: apagado, o el que el runtime aplica por defecto. */
export type ReasoningEffort = 'none' | 'model-default'
/**
 * El perfil con que corre un worker local: el relé admitido pide
 * `reasoning_effort: none` salvo que la petición pida razonar. Sólo una
 * cualificación medida con este perfil es evidencia para ese worker.
 */
export const LOCAL_REASONING_EFFORT: ReasoningEffort = 'none'

export interface ModelQualification {
  /** Nombre contractual del catálogo. */
  readonly model: string
  readonly kind: QualificationKind
  /** La clase que una cualificación de tarea o de flujo mide; las demás no tienen. */
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
  /** El razonamiento con que se midió; ausente en las cualificaciones anteriores al perfil. */
  readonly reasoningEffort?: ReasoningEffort
  /** El perfil completo con que corrió (TASK-THYROX-0931); ausente en las anteriores. */
  readonly runtimeProfile?: QualificationRuntimeProfile
}

/** Si el runtime guardó prompts entre peticiones: apagada, encendida, o lo que el runtime haga sin declararlo. */
export type PromptCachePolicy = 'disabled' | 'enabled' | 'runtime-default'

/**
 * Con qué corrió la medición, además del contexto y el razonamiento: lo que
 * hace que una cifra sea reproducible en otra ejecución (TASK-THYROX-0931).
 */
export interface QualificationRuntimeProfile {
  /** sha256 del artefacto servido y su revisión completa. */
  readonly artifactSha256: string
  readonly revision: string
  readonly quantization: string
  readonly kvCacheType: string
  readonly promptCache: PromptCachePolicy
  /** Imagen del runtime, con su versión (`docker.io/ollama/ollama:0.35.0`). */
  readonly runtime: string
  readonly cpus: number
  readonly memoryMib: number
  /** Hilos del runtime; `null` si no se declaran y el runtime decide. */
  readonly threads: number | null
  /** Herramientas ofrecidas al modelo; vacío si la suite no ofrece ninguna. */
  readonly tools: readonly string[]
  /** Presupuesto del prompt de sistema del worker; `null` si la suite no lo usa. */
  readonly systemBudgetTokens: number | null
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

const QUALIFICATION_KINDS: readonly QualificationKind[] = ['protocol', 'task', 'workflow', 'embedding']
const KIND_LABELS: Readonly<Record<QualificationKind, string>> = { protocol: 'protocolo', task: 'tarea', workflow: 'flujo', embedding: 'embeddings' }
const MEASUREMENT_CONDITIONS: readonly MeasurementCondition[] = ['isolated', 'contended']
const REASONING_EFFORTS: readonly ReasoningEffort[] = ['none', 'model-default']
const PROMPT_CACHE_POLICIES: readonly PromptCachePolicy[] = ['disabled', 'enabled', 'runtime-default']

function requireOneOf<T extends string>(record: Record<string, unknown>, key: string, allowed: readonly T[], path: string): T {
  const value = requireString(record, key, path)
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidQualificationError(`${path}.${key}`, `«${value}» no es ${allowed.join(', ')}`)
  }
  return value as T
}

/** La clase es obligatoria en una cualificación de tarea y no existe en las demás. */
function taskClassFor(kind: QualificationKind, record: Record<string, unknown>, path: string): LocalTaskClass | undefined {
  if (kind === 'task' || kind === 'workflow') return requireTaskClass(record, path)
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
    ...(record.reasoningEffort === undefined ? {} : { reasoningEffort: requireOneOf(record, 'reasoningEffort', REASONING_EFFORTS, path) }),
    ...(record.runtimeProfile === undefined ? {} : { runtimeProfile: runtimeProfileOf(record.runtimeProfile, `${path}.runtimeProfile`) }),
  }
}

/** Un perfil se declara entero: un campo que falta no se presume. */
function runtimeProfileOf(value: unknown, path: string): QualificationRuntimeProfile {
  const record = requireRecord(value, path)
  return {
    artifactSha256: requireString(record, 'artifactSha256', path),
    revision: requireString(record, 'revision', path),
    quantization: requireString(record, 'quantization', path),
    kvCacheType: requireString(record, 'kvCacheType', path),
    promptCache: requireOneOf(record, 'promptCache', PROMPT_CACHE_POLICIES, path),
    runtime: requireString(record, 'runtime', path),
    cpus: requirePositiveNumber(record, 'cpus', path),
    memoryMib: requirePositiveNumber(record, 'memoryMib', path),
    threads: record.threads === null ? null : requirePositiveNumber(record, 'threads', path),
    tools: requireStringList(record, 'tools', path),
    systemBudgetTokens: record.systemBudgetTokens === null ? null : requirePositiveNumber(record, 'systemBudgetTokens', path),
  }
}

function requirePositiveNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidQualificationError(`${path}.${key}`, 'se espera un número positivo')
  }
  return value
}

function requireStringList(record: Record<string, unknown>, key: string, path: string): string[] {
  const value = record[key]
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new InvalidQualificationError(`${path}.${key}`, 'se espera una lista de textos')
  }
  return [...value] as string[]
}

/** Lee el archivo de cualificaciones (`{"qualifications":[…]}`). */
export function parseQualifications(text: string): ModelQualification[] {
  const document = requireRecord(JSON.parse(text) as unknown, 'qualifications-file')
  const list = document.qualifications
  if (!Array.isArray(list)) throw new InvalidQualificationError('qualifications-file.qualifications', 'se espera una lista')
  return list.map((item, index) => validateQualification(item, `qualifications[${index}]`))
}

function scopeOf(qualification: ModelQualification): string {
  const measuresClass = qualification.kind === 'task' || qualification.kind === 'workflow'
  return measuresClass ? `${qualification.kind}:${qualification.taskClass}` : qualification.kind
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

export interface QualifiedLocalModel<Entry extends { readonly name: string } = ModelCatalogEntry> {
  readonly entry: Entry
  /** La cualificación de tarea de la clase: la que da el contexto y la velocidad. */
  readonly qualification: ModelQualification
  readonly protocol: ModelQualification
}

function passed(qualification: ModelQualification | undefined): qualification is ModelQualification {
  return qualification !== undefined && qualification.passed
}

/** Primero las medidas aisladas, de la más rápida a la más lenta; las contendidas después, sin ordenar por velocidad. */
function bySpeedWhenIsolated<Entry extends { readonly name: string }>(left: QualifiedLocalModel<Entry>, right: QualifiedLocalModel<Entry>): number {
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
/** ¿Medida sin razonar y con su perfil de ejecución declarado? */
export function isWorkerProfileMeasurement(qualification: ModelQualification): boolean {
  return qualification.reasoningEffort === LOCAL_REASONING_EFFORT && qualification.runtimeProfile !== undefined
}

export function qualifiedModels<Entry extends { readonly name: string } = ModelCatalogEntry>(
  entries: readonly Entry[],
  qualifications: readonly ModelQualification[],
  taskClass: LocalTaskClass,
  minContextTokens: number,
): QualifiedLocalModel<Entry>[] {
  // Sólo cuentan las medidas con el perfil del worker local: una tomada
  // razonando no dice nada de cómo trabaja sin razonar.
  // Y sólo las que declaran el perfil con que corrieron (TASK-THYROX-0931).
  const ofWorkerProfile = qualifications.filter(isWorkerProfileMeasurement)
  return entries
    .map((entry) => ({
      entry,
      qualification: latestFor(ofWorkerProfile, entry.name, `task:${taskClass}`),
      protocol: latestFor(ofWorkerProfile, entry.name, 'protocol'),
    }))
    .filter((candidate): candidate is QualifiedLocalModel<Entry> =>
      passed(candidate.protocol) && passed(candidate.qualification)
      && candidate.qualification.contextTokens >= minContextTokens)
    .sort(bySpeedWhenIsolated)
}

/** Lo mínimo que un candidato declara para competir: su nombre y sus capacidades, sea local o de API. */
export interface CapabilityDeclaringModel {
  readonly name: string
  readonly capabilities: readonly ModelCatalogEntry['capabilities'][number][]
}

export interface QualifiedEmbeddingModel<Entry extends CapabilityDeclaringModel = CapabilityDeclaringModel> {
  readonly entry: Entry
  readonly qualification: ModelQualification
}

/**
 * Los modelos del catálogo elegibles para producir embeddings: declaran la
 * capacidad `embeddings` y su medición de embeddings vigente aprobó. La
 * capacidad sale del GGUF, nunca del nombre; y la medición es la que prueba
 * que recupera. Ninguna de las dos basta sola. Elegible no es autorizado.
 */
export function qualifiedEmbeddingModels<Entry extends CapabilityDeclaringModel>(
  entries: readonly Entry[],
  qualifications: readonly ModelQualification[],
): QualifiedEmbeddingModel<Entry>[] {
  return entries
    .filter((entry) => entry.capabilities.includes('embeddings'))
    .map((entry) => ({ entry, qualification: latestFor(qualifications, entry.name, 'embedding') }))
    .filter((candidate): candidate is QualifiedEmbeddingModel<Entry> => passed(candidate.qualification))
}
