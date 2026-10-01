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

/** Lo que una ejecución deja escrito al completar un paso. */
export interface StepRecord {
  readonly step: QuantizationStep
  readonly completedAt: string
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
): Promise<boolean> {
  const record = records.find(candidate => candidate.step === step)
  if (record === undefined) return false
  if (record.artifact === undefined || releasedSteps(records).has(step)) return true
  return isIntact(record.artifact)
}

export async function nextPendingStep(
  records: readonly StepRecord[],
  isIntact: ArtifactIntegrityCheck,
): Promise<QuantizationStep | undefined> {
  for (const step of QUANTIZATION_STEPS) {
    if (!(await isStepComplete(step, records, isIntact))) return step
  }
  return undefined
}
