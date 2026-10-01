/**
 * El plan de una cuantización, sin E/S (TASK-THYROX-0718, 0722).
 *
 * Fija el orden de los pasos, cuánto disco de trabajo exige el pico de cada
 * método y qué paso queda pendiente a partir de los registros durables de una
 * ejecución anterior. Un paso cuenta como hecho sólo si su registro existe y,
 * si dejó un artefacto que ningún paso posterior liberó, ese artefacto sigue
 * en disco con el sha256 registrado: así una reejecución salta lo verificado,
 * repite lo que cambió y se reanuda donde murió la anterior.
 *
 * El orden libera cada artefacto sólo cuando el siguiente está completo y
 * verificado: la fuente tras verificar el F16, el F16 tras validar el Q4.
 */

/** `requantized_q8_to_q4` es otro método, con su propia procedencia (TASK-THYROX-0721). */
export type QuantizationMethod = 'direct' | 'requantized_q8_to_q4'

export const QUANTIZATION_METHODS: readonly QuantizationMethod[] = ['direct', 'requantized_q8_to_q4']

export type QuantizationStep =
  | 'download'
  | 'convert'
  | 'verify-intermediate'
  | 'release-source'
  | 'quantize'
  | 'validate'
  | 'release-intermediate'
  | 'register'

export const QUANTIZATION_STEPS: readonly QuantizationStep[] = [
  'download',
  'convert',
  'verify-intermediate',
  'release-source',
  'quantize',
  'validate',
  'release-intermediate',
  'register',
]

/** Qué artefacto deja de existir cuando se completa cada paso de liberación. */
const RELEASED_BY: Readonly<Partial<Record<QuantizationStep, QuantizationStep>>> = {
  'release-source': 'download',
  'release-intermediate': 'convert',
}

/** `sha256:<64 hex>` para un archivo LFS; `gitblob:<40 hex>`, el sha1 de objeto git, para los demás. */
export type SourceDigest = `sha256:${string}` | `gitblob:${string}`

export interface SourceFile {
  readonly path: string
  readonly sizeBytes: number
  readonly digest: SourceDigest
}

export interface SourceSpec {
  readonly repository: string
  /** Revisión completa de 40 hex: una rama o un prefijo no fijan la fuente. */
  readonly revision: string
  readonly files: readonly SourceFile[]
  /** La licencia que el repositorio declara en su ficha, si la declara. */
  readonly license?: string
}

/** Bits por peso del intermedio de cada método; BF16 → F16 no cambia el ancho. */
const SOURCE_BITS_PER_WEIGHT = 16
const INTERMEDIATE_BITS_PER_WEIGHT: Readonly<Record<QuantizationMethod, number>> = {
  direct: 16,
  requantized_q8_to_q4: 8.5,
}

/**
 * Bits por peso efectivos de Q4_K_M medidos sobre un artefacto publicado:
 * 4 683 073 536 bytes para los 7,6e9 parámetros de Qwen2.5-Coder-7B dan 4,93.
 * Se redondea hacia arriba para que la estimación no quede corta.
 */
export const Q4_K_M_BITS_PER_WEIGHT = 5

/** Metadatos, vocabulario y temporales de las herramientas fuera de los tensores. */
export const SCRATCH_METADATA_MARGIN_BYTES = 256 * 1024 * 1024

const FULL_REVISION_PATTERN = /^[0-9a-f]{40}$/

export class InvalidSourceSpecError extends Error {
  constructor(reason: string) {
    super(`fuente inválida: ${reason}`)
    this.name = 'InvalidSourceSpecError'
  }
}

export function validateSourceSpec(source: SourceSpec): void {
  if (!FULL_REVISION_PATTERN.test(source.revision)) {
    throw new InvalidSourceSpecError(`la revisión debe ser un commit completo de 40 hex: ${source.revision}`)
  }
  if (source.files.length === 0) {
    throw new InvalidSourceSpecError(`${source.repository} no declara archivos`)
  }
}

export function sourceBytes(source: SourceSpec): number {
  return source.files.reduce((total, file) => total + file.sizeBytes, 0)
}

export function estimatedBytesAt(sourceSizeBytes: number, bitsPerWeight: number): number {
  return Math.ceil((sourceSizeBytes * bitsPerWeight) / SOURCE_BITS_PER_WEIGHT)
}

/**
 * El pico de disco de trabajo con la liberación en orden: primero conviven
 * fuente e intermedio, después intermedio y Q4.
 */
export function requiredScratchBytes(sourceSizeBytes: number, method: QuantizationMethod): number {
  const intermediate = estimatedBytesAt(sourceSizeBytes, INTERMEDIATE_BITS_PER_WEIGHT[method])
  const quantized = estimatedBytesAt(sourceSizeBytes, Q4_K_M_BITS_PER_WEIGHT)
  return Math.max(sourceSizeBytes + intermediate, intermediate + quantized) + SCRATCH_METADATA_MARGIN_BYTES
}

export interface ScratchCapacityInput {
  /** Lo libre que declara el sistema de archivos del scratch. */
  readonly freeBytes: number
  readonly requiredBytes: number
  /** El mínimo que exige la tarea aunque el pico estimado sea menor (0722: 40 GiB). */
  readonly minimumFreeBytes: number
}

export type ScratchCapacityVerdict =
  | { readonly admitted: true }
  | { readonly admitted: false; readonly reason: string } & ScratchCapacityInput

export function evaluateScratchCapacity(input: ScratchCapacityInput): ScratchCapacityVerdict {
  const threshold = Math.max(input.requiredBytes, input.minimumFreeBytes)
  if (input.freeBytes >= threshold) return { admitted: true }
  return {
    admitted: false,
    reason: `el scratch tiene ${input.freeBytes} bytes libres; se exigen ${threshold} (pico estimado ${input.requiredBytes}, mínimo declarado ${input.minimumFreeBytes})`,
    ...input,
  }
}

/**
 * Versión de los parámetros con que las herramientas convierten, cuantizan y
 * evalúan (`--outtype`, nivel, `-c`, `-t`, prompt de inferencia). Cambiar un
 * parámetro sin subir esta versión dejaría válido un resultado hecho con el
 * anterior.
 */
export const TOOL_PARAMETERS_VERSION = 'convert-outtype-by-method;quantize-level;ppl-c128-t4;simple-n16;v1'

/** Lo que identifica semánticamente una ejecución, además de la integridad de sus archivos. */
export interface PlanInputs {
  readonly source: SourceSpec
  readonly imageDigest: string
  readonly method: QuantizationMethod
  readonly level: string
}

/** Qué entradas consume por primera vez cada paso; los posteriores heredan las anteriores. */
const INPUTS_INTRODUCED_BY: Readonly<Partial<Record<QuantizationStep, (inputs: PlanInputs) => Record<string, unknown>>>> = {
  download: inputs => ({ revision: inputs.source.revision, files: inputs.source.files.map(file => [file.path, file.digest]) }),
  convert: inputs => ({ imageDigest: inputs.imageDigest, method: inputs.method }),
  quantize: inputs => ({ level: inputs.level }),
  validate: () => ({ toolParameters: TOOL_PARAMETERS_VERSION }),
}

/**
 * La huella de un paso: el JSON de todas las entradas acumuladas hasta él.
 * Un cambio en una entrada temprana (otra revisión) alcanza a todos los pasos
 * siguientes; uno tardío (otra imagen) deja intactos los anteriores.
 */
export function stepFingerprint(step: QuantizationStep, inputs: PlanInputs): string {
  const upTo = QUANTIZATION_STEPS.slice(0, QUANTIZATION_STEPS.indexOf(step) + 1)
  const accumulated = upTo.flatMap(candidate => {
    const introduced = INPUTS_INTRODUCED_BY[candidate]
    return introduced === undefined ? [] : [[candidate, introduced(inputs)]]
  })
  return JSON.stringify(accumulated)
}

/** Lo que una ejecución deja escrito al completar un paso. */
export interface StepRecord {
  readonly step: QuantizationStep
  readonly completedAt: string
  /** `stepFingerprint` con que se hizo; otra huella lo deja pendiente. */
  readonly fingerprint: string
  /** Ausente en los pasos que no dejan artefacto propio (liberaciones). */
  readonly artifact?: { readonly path: string; readonly sha256: string; readonly bytes: number }
}

/** ¿El artefacto registrado sigue en disco con su sha256 y sus bytes? Lo decide quien tiene E/S. */
export type ArtifactIntegrityCheck = (artifact: NonNullable<StepRecord['artifact']>) => Promise<boolean>

function releasedSteps(records: readonly StepRecord[]): Set<QuantizationStep> {
  return new Set(records.flatMap(record => RELEASED_BY[record.step] ?? []))
}

export async function isStepComplete(
  step: QuantizationStep,
  records: readonly StepRecord[],
  isIntact: ArtifactIntegrityCheck,
  inputs: PlanInputs,
): Promise<boolean> {
  const record = records.find(candidate => candidate.step === step)
  if (record === undefined || record.fingerprint !== stepFingerprint(step, inputs)) return false
  if (record.artifact === undefined || releasedSteps(records).has(step)) return true
  return isIntact(record.artifact)
}

export async function nextPendingStep(
  records: readonly StepRecord[],
  isIntact: ArtifactIntegrityCheck,
  inputs: PlanInputs,
): Promise<QuantizationStep | undefined> {
  for (const step of QUANTIZATION_STEPS) {
    if (!(await isStepComplete(step, records, isIntact, inputs))) return step
  }
  return undefined
}

/** El paso cuyo artefacto consume cada paso, para saber si su entrada ya se liberó. */
const CONSUMES: Readonly<Partial<Record<QuantizationStep, QuantizationStep>>> = {
  convert: 'download',
  'verify-intermediate': 'convert',
  quantize: 'convert',
  validate: 'quantize',
}

/**
 * Dónde empieza la ejecución: el primer paso pendiente, salvo que consuma un
 * artefacto ya liberado; entonces se retrocede hasta el paso que lo produce.
 * Desde ahí se rehace todo, porque cada paso posterior depende de él.
 */
export async function firstStepToRun(
  records: readonly StepRecord[],
  isIntact: ArtifactIntegrityCheck,
  inputs: PlanInputs,
): Promise<QuantizationStep | undefined> {
  const released = releasedSteps(records)
  let step = await nextPendingStep(records, isIntact, inputs)
  while (step !== undefined) {
    const producer = CONSUMES[step]
    if (producer === undefined || !released.has(producer)) return step
    step = producer
  }
  return undefined
}
