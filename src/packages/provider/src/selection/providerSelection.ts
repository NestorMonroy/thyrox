/**
 * La selección de proveedor para un ítem de trabajo: entre los candidatos
 * que las fuentes declaran, participan sólo los que la política permite,
 * se descartan los no elegibles para la capacidad y la clase pedidas, y el
 * orden lo decide la política con una estrategia de `ComboRouter`. El
 * primero gana; sin ninguno, la ejecución queda bloqueada con la causa de
 * cada candidato.
 *
 * El selector no conoce a ningún proveedor por su nombre: un proveedor
 * local, una API remota o `claude-cli` son candidatos con el mismo contrato.
 * Ningún proveedor es respaldo obligatorio: el lote tiene que poder
 * ejecutarse sin claude-cli. La
 * elegibilidad la trae cada candidato de su fuente —una cualificación
 * aprobada, o la causa de no tenerla—, y el selector sólo la lee.
 *
 * Política:
 *
 *   { "strategy": "priority",
 *     "allowed": [
 *       { "provider": "local-qwen-coder", "priority": 10, "match": { "repository": "Qwen/…" } },
 *       { "provider": "deepseek-api", "priority": 20 } ] }
 *
 * `priority` ordena de menor a mayor; `strategy` es una de
 * `COMBO_STRATEGIES` y se aplica sobre ese orden (`priority`, la de por
 * defecto, lo conserva). `match` acota por atributos del candidato, sin
 * distinguir mayúsculas.
 */

import { COMBO_STRATEGIES, isComboStrategy, type ComboRouter, type ComboStrategy } from '../proxy/combo/comboRouter.ts'

export type Locality = 'local' | 'remote'

export type Eligibility =
  | { readonly eligible: true, readonly evidence: string }
  | { readonly eligible: false, readonly reason: string }

export interface ProviderCandidate {
  /** El nombre con que la política permite al proveedor. */
  readonly provider: string
  readonly model: string
  /** Identidad única del candidato; con ella se midió su cualificación. */
  readonly name: string
  readonly locality: Locality
  /** El mecanismo que lo ejecuta: `ollama`, `openai-compatible`, `claude-cli`… */
  readonly adapter: string
  /** Lo que un selector puede acotar: repositorio, cuantización, fuente… */
  readonly attributes: Readonly<Record<string, string>>
  readonly eligibility: Eligibility
}

export interface AllowedProvider {
  readonly provider: string
  readonly priority: number
  readonly weight?: number
  readonly match?: Readonly<Record<string, string>>
}

export interface ProviderPolicy {
  readonly strategy: ComboStrategy
  readonly allowed: readonly AllowedProvider[]
}

export type ProviderSelection =
  | (Omit<ProviderCandidate, 'eligibility' | 'attributes'> & { readonly status: 'selected', readonly selectionReason: string })
  | { readonly status: 'blocked', readonly blockedReason: string }

export class ProviderPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderPolicyError'
  }
}

const DEFAULT_STRATEGY: ComboStrategy = 'priority'
const SELECTION_GROUP = 'provider-selection'

export function parseProviderPolicy(text: string): ProviderPolicy {
  const document = parseObject(text)
  if (document.fallback !== undefined) {
    throw new ProviderPolicyError('`fallback` se retiró: ningún proveedor es respaldo obligatorio; cada proveedor permitido se lista en `allowed` con su prioridad')
  }
  const strategy = document.strategy ?? DEFAULT_STRATEGY
  if (!isComboStrategy(strategy)) throw new ProviderPolicyError(`strategy «${String(strategy)}» no es ${COMBO_STRATEGIES.join(', ')}`)
  if (!Array.isArray(document.allowed)) throw new ProviderPolicyError('`allowed` es la lista de proveedores permitidos')
  return { strategy, allowed: document.allowed.map(allowedProviderOf) }
}

/** Elige el proveedor de un ítem: permitido por la política, elegible, y primero en el orden que la política declara. */
export async function selectProvider(candidates: readonly ProviderCandidate[], policy: ProviderPolicy, router: ComboRouter): Promise<ProviderSelection> {
  const permitted = candidates.flatMap(candidate => {
    const selector = bestSelectorFor(candidate, policy)
    return selector === undefined ? [] : [{ candidate, selector }]
  })
  if (permitted.length === 0) {
    return { status: 'blocked', blockedReason: `ningún candidato de los proveedores permitidos: ${policy.allowed.map(selector => selector.provider).join(', ') || '(ninguno)'}` }
  }
  const rejected = permitted.filter(({ candidate }) => !candidate.eligibility.eligible).map(({ candidate }) => rejectionOf(candidate))
  const eligible = permitted.filter(({ candidate }) => candidate.eligibility.eligible).sort((left, right) => left.selector.priority - right.selector.priority)
  const ordered = await router.order(policy.strategy, SELECTION_GROUP, eligible.map(entry => ({
    ...entry, executionKey: entry.candidate.name, modelStr: entry.candidate.model, provider: entry.candidate.provider, weight: entry.selector.weight ?? 1,
  })))
  const [winner] = ordered
  if (winner === undefined) return { status: 'blocked', blockedReason: `ningún proveedor permitido es elegible: ${rejected.join('; ')}` }
  return selectionOf(winner.candidate, winner.selector, policy.strategy, rejected)
}

/** El selector permitido que casa con el candidato; si casan varios, el de mayor preferencia. */
function bestSelectorFor(candidate: ProviderCandidate, policy: ProviderPolicy): AllowedProvider | undefined {
  return policy.allowed
    .filter(selector => selector.provider === candidate.provider && matchesAttributes(selector, candidate))
    .sort((left, right) => left.priority - right.priority)[0]
}

function matchesAttributes(selector: AllowedProvider, candidate: ProviderCandidate): boolean {
  return Object.entries(selector.match ?? {}).every(([key, value]) => (candidate.attributes[key] ?? '').toLowerCase() === value.toLowerCase())
}

function rejectionOf(candidate: ProviderCandidate): string {
  return `${candidate.name}: ${candidate.eligibility.eligible ? 'elegible' : candidate.eligibility.reason}`
}

function selectionOf(candidate: ProviderCandidate, selector: AllowedProvider, strategy: ComboStrategy, rejected: readonly string[]): ProviderSelection {
  const evidence = candidate.eligibility.eligible ? candidate.eligibility.evidence : ''
  const discarded = rejected.length === 0 ? '' : `; descartados: ${rejected.join('; ')}`
  const { eligibility: _eligibility, attributes: _attributes, ...identity } = candidate
  return { ...identity, status: 'selected', selectionReason: `${candidate.name}: prioridad ${selector.priority} (estrategia ${strategy}), ${evidence}${discarded}` }
}

function allowedProviderOf(value: unknown, index: number): AllowedProvider {
  if (!isObject(value)) throw new ProviderPolicyError(`allowed[${index}]: se espera un objeto`)
  if (typeof value.provider !== 'string' || value.provider === '') throw new ProviderPolicyError(`allowed[${index}].provider: se espera el nombre del proveedor`)
  if (typeof value.priority !== 'number' || !Number.isFinite(value.priority)) throw new ProviderPolicyError(`allowed[${index}].priority: se espera un número`)
  if (value.weight !== undefined && (typeof value.weight !== 'number' || value.weight < 0)) throw new ProviderPolicyError(`allowed[${index}].weight: se espera un número no negativo`)
  return {
    provider: value.provider,
    priority: value.priority,
    ...(value.weight === undefined ? {} : { weight: value.weight as number }),
    ...(value.match === undefined ? {} : { match: matchOf(value.match, index) }),
  }
}

function matchOf(value: unknown, index: number): Readonly<Record<string, string>> {
  if (!isObject(value) || !Object.values(value).every(item => typeof item === 'string')) {
    throw new ProviderPolicyError(`allowed[${index}].match: se espera un objeto de atributos de texto`)
  }
  return value as Record<string, string>
}

function parseObject(text: string): Record<string, unknown> {
  let document: unknown
  try {
    document = JSON.parse(text) as unknown
  } catch (error) {
    throw new ProviderPolicyError(`política ilegible: ${(error as Error).message}`)
  }
  if (!isObject(document)) throw new ProviderPolicyError('la política es un objeto JSON')
  return document
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
