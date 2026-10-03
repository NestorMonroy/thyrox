/**
 * La política de ejecución que declara un consumidor (TASK-THYROX-0773): qué
 * modelos locales puede usar su trabajo y si, sin ninguno cualificado, cae al
 * proveedor.
 *
 *   { "allowed": [{ "runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF",
 *                   "quantization": "q4_k_m" }],
 *     "fallback": { "enabled": true,
 *                   "chain": [{ "runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF",
 *                               "quantization": "q4_k_m" },
 *                             { "runtime": "claude-cli" }] } }
 *
 * `fallback.enabled` es el interruptor; `fallback.chain`, el orden de los
 * respaldos (TASK-THYROX-0920). Sin `chain` declarada rige `[claude-cli]`.
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

/** Si el controlador implementa (excepción bootstrap) o sólo orquesta workers gestionados. */
export type ControllerImplementation = 'bootstrap-exception' | 'managed-only'

/**
 * Los permisos del controlador que lee el preflight (`src/session/execution_policy.py`):
 * despachar subagentes, ejecutar payloads fuera de la ejecución gestionada y
 * escribir el producto. Independientes de `fallback`, que gobierna la selección.
 */
export interface ControllerPolicy {
  readonly subagents: boolean
  readonly unmanagedPayloads: boolean
  readonly implementation: ControllerImplementation
}

/** El proveedor ejecutado por `claude -p`: sólo se alcanza como eslabón de la cadena. */
export interface ProviderTarget {
  readonly runtime: 'claude-cli'
}

export type FallbackTarget = LocalModelSelector | ProviderTarget

/**
 * El respaldo, en la forma de la referencia `claude-code-bin` (`rre`/`$a`): `enabled` es el
 * interruptor (`CLAUDE_CODE_NO_MODEL_FALLBACK` invertido) y `chain` el orden en
 * que se prueban los respaldos, cada uno dentro de lo permitido.
 */
export interface FallbackPolicy {
  readonly enabled: boolean
  readonly chain: readonly FallbackTarget[]
}

export interface ExecutionPolicy {
  readonly allowed: readonly LocalModelSelector[]
  readonly fallback: FallbackPolicy
  readonly controller?: ControllerPolicy
}

const LOCAL_RUNTIME = 'ollama'
const PROVIDER_RUNTIME = 'claude-cli'
const CONTROLLER_IMPLEMENTATIONS: readonly ControllerImplementation[] = ['bootstrap-exception', 'managed-only']
const MODEL_SOURCES: readonly ModelSource[] = ['hf', 'ollama']

export function parseExecutionPolicy(text: string): ExecutionPolicy {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new ExecutionPolicyError(`política ilegible: ${(error as Error).message}`)
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new ExecutionPolicyError('la política es un objeto JSON')
  const { allowed, fallback, controller } = raw as Record<string, unknown>
  if (!Array.isArray(allowed)) throw new ExecutionPolicyError('`allowed` es la lista de modelos locales permitidos')
  const enabled = (fallback as { enabled?: unknown } | null | undefined)?.enabled
  if (typeof enabled !== 'boolean') {
    throw new ExecutionPolicyError('`fallback.enabled` se declara (true o false): el respaldo al proveedor no tiene valor por defecto')
  }
  const selectors = allowed.map(selectorOf)
  const chain = chainOf((fallback as { chain?: unknown }).chain, selectors)
  const parsed = { allowed: selectors, fallback: { enabled, chain } }
  return controller === undefined ? parsed : { ...parsed, controller: controllerOf(controller) }
}

/** Una sección `controller` declara sus tres campos: uno que falta no se presume abierto. */
function controllerOf(value: unknown): ControllerPolicy {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ExecutionPolicyError('`controller` es un objeto')
  const { subagents, unmanagedPayloads, implementation } = value as Record<string, unknown>
  if (typeof subagents !== 'boolean') throw new ExecutionPolicyError('`controller.subagents` se declara (true o false)')
  if (typeof unmanagedPayloads !== 'boolean') throw new ExecutionPolicyError('`controller.unmanagedPayloads` se declara (true o false)')
  if (!CONTROLLER_IMPLEMENTATIONS.includes(implementation as ControllerImplementation)) {
    throw new ExecutionPolicyError(`\`controller.implementation\` es una de ${CONTROLLER_IMPLEMENTATIONS.join(', ')}`)
  }
  return { subagents, unmanagedPayloads, implementation: implementation as ControllerImplementation }
}

function selectorOf(value: unknown, index: number): LocalModelSelector {
  const selector = (value ?? {}) as Record<string, unknown>
  if (selector.runtime !== LOCAL_RUNTIME) {
    throw new ExecutionPolicyError(`allowed[${index}]: sólo se permiten modelos locales (runtime ${LOCAL_RUNTIME}); `
      + 'el proveedor no se lista, se alcanza sólo como eslabón de fallback.chain')
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
  return policy.allowed.some(selector => matchesSelector(selector, entry))
}

/** ¿Esta entrada del catálogo cumple el selector? */
export function matchesSelector(selector: LocalModelSelector, entry: ModelCatalogEntry): boolean {
  return sameText(selector.repository, entry.repository)
    && (selector.quantization === undefined || sameText(selector.quantization, entry.quantization))
    && (selector.source === undefined || selector.source === entry.source)
}

function sameText(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

/** ¿La política deja llegar al proveedor? Interruptor abierto y `claude-cli` en la cadena. */
export function allowsProvider(policy: ExecutionPolicy): boolean {
  return policy.fallback.enabled && policy.fallback.chain.some(isProviderTarget)
}

export function isProviderTarget(target: FallbackTarget): target is ProviderTarget {
  return target.runtime === PROVIDER_RUNTIME
}

/**
 * La cadena declarada. Sin declararla rige `[claude-cli]`, el respaldo que
 * `enabled` daba antes de existir la cadena. Una entrada local tiene que estar
 * en `allowed` (el `Hr` de la referencia): un respaldo no amplía lo permitido,
 * y aquí se rehúsa en vez de filtrarse en silencio.
 */
function chainOf(value: unknown, allowed: readonly LocalModelSelector[]): readonly FallbackTarget[] {
  if (value === undefined) return [{ runtime: PROVIDER_RUNTIME }]
  if (!Array.isArray(value)) throw new ExecutionPolicyError('`fallback.chain` es la lista ordenada de respaldos')
  return value.map((item, index) => chainTargetOf(item, index, allowed))
}

function chainTargetOf(value: unknown, index: number, allowed: readonly LocalModelSelector[]): FallbackTarget {
  const runtime = (value as { runtime?: unknown } | null | undefined)?.runtime
  if (runtime === PROVIDER_RUNTIME) return { runtime: PROVIDER_RUNTIME }
  if (runtime !== LOCAL_RUNTIME) {
    throw new ExecutionPolicyError(`fallback.chain[${index}]: el runtime es ${LOCAL_RUNTIME} o ${PROVIDER_RUNTIME}`)
  }
  const selector = selectorOf(value, index)
  if (!allowed.some(candidate => sameSelector(candidate, selector))) {
    throw new ExecutionPolicyError(`fallback.chain[${index}]: ${selector.repository} no está en allowed; un respaldo no amplía lo permitido`)
  }
  return selector
}

function sameSelector(left: LocalModelSelector, right: LocalModelSelector): boolean {
  return sameText(left.repository, right.repository)
    && (left.quantization ?? '').toLowerCase() === (right.quantization ?? '').toLowerCase()
    && left.source === right.source
}
