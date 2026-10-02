/**
 * La política de ejecución que declara un consumidor (TASK-THYROX-0773): qué
 * modelos locales puede usar su trabajo y si, sin ninguno cualificado, cae al
 * proveedor.
 *
 *   { "allowed": [{ "runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF",
 *                   "quantization": "q4_k_m" }],
 *     "fallback": { "enabled": false } }
 *
 * Un modelo local se permite por su repositorio de origen (y su cuantización,
 * si se declara), no por su nombre contractual: el nombre lleva la revisión y
 * la fuente, y la política no tiene que reescribirse al reimportar. La fuente
 * (`hf` u `ollama`) se declara cuando el repositorio solo no basta: el
 * `library/…` de la biblioteca de Ollama podría ser también una organización
 * de Hugging Face (TASK-THYROX-0778). Sin declararla, cualquier fuente cumple. El
 * proveedor no se lista como permitido: se alcanza sólo por el respaldo, y el
 * respaldo no tiene valor por defecto. Una política que no lo declara se
 * rehúsa, porque un default decidiría por el consumidor justo lo que la
 * política existe para decidir.
 */
import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { ModelSource } from '@thyrox/model-artifacts/modelName.ts'

export class ExecutionPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExecutionPolicyError'
  }
}

export interface LocalModelSelector {
  readonly runtime: 'ollama'
  readonly repository: string
  readonly quantization?: string
  readonly source?: ModelSource
}

export interface ExecutionPolicy {
  readonly allowed: readonly LocalModelSelector[]
  readonly fallback: { readonly enabled: boolean }
}

const LOCAL_RUNTIME = 'ollama'
const MODEL_SOURCES: readonly ModelSource[] = ['hf', 'ollama']

export function parseExecutionPolicy(text: string): ExecutionPolicy {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new ExecutionPolicyError(`política ilegible: ${(error as Error).message}`)
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new ExecutionPolicyError('la política es un objeto JSON')
  const { allowed, fallback } = raw as Record<string, unknown>
  if (!Array.isArray(allowed)) throw new ExecutionPolicyError('`allowed` es la lista de modelos locales permitidos')
  const enabled = (fallback as { enabled?: unknown } | null | undefined)?.enabled
  if (typeof enabled !== 'boolean') {
    throw new ExecutionPolicyError('`fallback.enabled` se declara (true o false): el respaldo al proveedor no tiene valor por defecto')
  }
  return { allowed: allowed.map(selectorOf), fallback: { enabled } }
}

function selectorOf(value: unknown, index: number): LocalModelSelector {
  const selector = (value ?? {}) as Record<string, unknown>
  if (selector.runtime !== LOCAL_RUNTIME) {
    throw new ExecutionPolicyError(`allowed[${index}]: sólo se permiten modelos locales (runtime ${LOCAL_RUNTIME}); `
      + 'el proveedor no se lista, se alcanza sólo con fallback.enabled')
  }
  if (typeof selector.repository !== 'string' || selector.repository === '') {
    throw new ExecutionPolicyError(`allowed[${index}]: falta el repositorio de origen del modelo`)
  }
  const quantization = quantizationOf(selector.quantization, index)
  const source = sourceOf(selector.source, index)
  return {
    runtime: LOCAL_RUNTIME,
    repository: selector.repository,
    ...(quantization === undefined ? {} : { quantization }),
    ...(source === undefined ? {} : { source }),
  }
}

function quantizationOf(value: unknown, index: number): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new ExecutionPolicyError(`allowed[${index}]: la cuantización es un texto`)
  return value
}

function sourceOf(value: unknown, index: number): ModelSource | undefined {
  if (value === undefined) return undefined
  if (!MODEL_SOURCES.includes(value as ModelSource)) {
    throw new ExecutionPolicyError(`allowed[${index}]: la fuente es una de ${MODEL_SOURCES.join(', ')}`)
  }
  return value as ModelSource
}

/** ¿La política permite esta entrada del catálogo? Repositorio y cuantización sin distinguir mayúsculas. */
export function allowsEntry(policy: ExecutionPolicy, entry: ModelCatalogEntry): boolean {
  return policy.allowed.some(selector => selectorMatches(selector, entry))
}

function selectorMatches(selector: LocalModelSelector, entry: ModelCatalogEntry): boolean {
  return sameText(selector.repository, entry.repository)
    && (selector.quantization === undefined || sameText(selector.quantization, entry.quantization))
    && (selector.source === undefined || selector.source === entry.source)
}

function sameText(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}
