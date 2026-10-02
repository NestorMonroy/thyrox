/**
 * La política de ejecución que declara un consumidor (TASK-THYROX-0758): qué
 * modelos locales puede usar su trabajo y si, sin ninguno cualificado, cae al
 * proveedor.
 *
 *   { "allowed": [{ "runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF",
 *                   "quantization": "q4_k_m" }],
 *     "fallback": { "enabled": false } }
 *
 * Un modelo local se permite por su repositorio de origen (y su cuantización,
 * si se declara), no por su nombre contractual: el nombre lleva la revisión y
 * la fuente, y la política no tiene que reescribirse al reimportar. El
 * proveedor no se lista como permitido: se alcanza sólo por el respaldo, y el
 * respaldo no tiene valor por defecto. Una política que no lo declara se
 * rehúsa, porque un default decidiría por el consumidor justo lo que la
 * política existe para decidir.
 */
import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'

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
}

export interface ExecutionPolicy {
  readonly allowed: readonly LocalModelSelector[]
  readonly fallback: { readonly enabled: boolean }
}

const LOCAL_RUNTIME = 'ollama'

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
  if (selector.quantization === undefined) return { runtime: LOCAL_RUNTIME, repository: selector.repository }
  if (typeof selector.quantization !== 'string') throw new ExecutionPolicyError(`allowed[${index}]: la cuantización es un texto`)
  return { runtime: LOCAL_RUNTIME, repository: selector.repository, quantization: selector.quantization }
}

/** ¿La política permite esta entrada del catálogo? Repositorio y cuantización sin distinguir mayúsculas. */
export function allowsEntry(policy: ExecutionPolicy, entry: ModelCatalogEntry): boolean {
  return policy.allowed.some(selector => selector.repository.toLowerCase() === entry.repository.toLowerCase()
    && (selector.quantization === undefined || selector.quantization.toLowerCase() === entry.quantization.toLowerCase()))
}
