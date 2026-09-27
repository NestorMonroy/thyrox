/**
 * Selectores de credenciales — porte de CLIProxyAPI (Go)
 * `sdk/cliproxy/auth/selector.go`, con el peso de
 * `internal/credentialweight/weight.go` y el sufijo de
 * `internal/thinking/suffix.go`.
 *
 * Tres estrategias sobre el mismo filtro de disponibilidad: fill-first (la
 * primera por id), round-robin (retoma tras la identidad de la última, no de
 * un índice: un índice sobre una lista que encoge al excluir reintentos o
 * credenciales en enfriamiento reasienta la rotación y mata de hambre a
 * unas) y round-robin ponderado suave (los créditos acumulados sólo se
 * reinician cuando cambia el peso configurado, nunca porque el conjunto
 * encoja de forma transitoria).
 *
 * El filtro deja el nivel de prioridad más alto disponible, ordenado por id;
 * si todas están enfriando para el modelo, falla con `ModelCooldownError`
 * (429 y `Retry-After`).
 *
 * Divergencias declaradas, con su razón:
 * - `preferCodexWebsocketAuths` y la afinidad por sesión
 *   (`SessionAffinitySelector`) no se portan en este pase: son de Codex y de
 *   la vinculación de sesión, que thyrox aún no enruta. pendiente: portarlas
 *   con el servidor proxy (tarea #77), que es quien tiene sesión y proveedor.
 * - `ModelCooldownError` no lleva la causa aguas arriba: su resumen pasa por
 *   `ExtractUpstreamErrorSummary` y un saneador de ~20 expresiones que es
 *   otro módulo. pendiente: portarlo junto a los traductores (tarea #76).
 * - `hasUnauthorizedAuthFailure` y la caducidad del token de acceso se
 *   modelan como dos campos de la credencial (`unauthorized`,
 *   `accessTokenExpiresAt`) en vez de derivarse del estado de Go.
 * - El contexto de Go (`prevalidatedAuthCandidatesKey`, el modelo de estado
 *   ponderado) no se porta: sin `context.Context`, quien llama pasa el modelo.
 */

export type QuotaState = { exceeded?: boolean; reason?: string; nextRecoverAt?: Date }

export type ModelState = {
  status?: 'active' | 'disabled'
  unavailable?: boolean
  nextRetryAfter?: Date
  quota?: QuotaState
}

export type ProxyCredential = {
  id: string
  disabled?: boolean
  unauthorized?: boolean
  accessTokenExpiresAt?: Date
  unavailable?: boolean
  nextRetryAfter?: Date
  quota?: QuotaState
  modelStates?: Record<string, ModelState | undefined>
  attributes?: Record<string, string>
  metadata?: Record<string, unknown>
}

export type BlockReason = 'none' | 'cooldown' | 'disabled' | 'other'
export type Block = { blocked: boolean; reason: BlockReason; next?: Date }

/** `credentialweight.Default` y `credentialweight.Max`. */
export const DEFAULT_WEIGHT = 1
export const MAX_WEIGHT = 1_000_000
/** Tope de claves de cursor por selector (`maxKeys` por defecto de Go). */
export const DEFAULT_MAX_KEYS = 4096
/** Tope de entradas de un acumulador ponderado (`maxSmoothWeightedStateEntries`). */
export const MAX_SMOOTH_WEIGHTED_STATE_ENTRIES = 1024

export class SelectorError extends Error {
  constructor(
    readonly code: 'auth_not_found' | 'auth_unavailable',
    message: string,
    readonly statusCode?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message)
  }
}

/** `time.Duration.String` de Go para una cantidad entera de segundos. */
export function goDurationString(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h${minutes}m${seconds}s`
  if (minutes > 0) return `${minutes}m${seconds}s`
  return `${seconds}s`
}

/** Todas las credenciales del modelo están enfriando (`modelCooldownError`). */
export class ModelCooldownError extends Error {
  readonly statusCode = 429
  readonly resetSeconds: number

  constructor(
    readonly model: string,
    readonly provider: string,
    readonly resetInMs: number,
  ) {
    const resetIn = Math.max(0, resetInMs)
    const resetSeconds = Math.max(0, Math.ceil(resetIn / 1000))
    const shown = resetIn > 0 && resetIn < 1000 ? 1 : Math.round(resetIn / 1000)
    let message = `All credentials for model ${model || 'requested model'} are cooling down`
    if (provider) message = `${message} via provider ${provider}`
    const body: Record<string, unknown> = {
      code: 'model_cooldown',
      message,
      model,
      reset_time: goDurationString(shown),
      reset_seconds: resetSeconds,
    }
    if (provider) body.provider = provider
    super(JSON.stringify({ error: body }))
    this.resetSeconds = resetSeconds
  }

  headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'Retry-After': String(this.resetSeconds) }
  }
}

/** El modelo sin su sufijo de razonamiento: `m(8192)` → `m`. */
export function canonicalModelKey(model: string): string {
  const trimmed = model.trim()
  if (!trimmed) return ''
  const open = trimmed.lastIndexOf('(')
  if (open === -1 || !trimmed.endsWith(')')) return trimmed
  return trimmed.slice(0, open).trim() || trimmed
}

export function authPriority(credential: ProxyCredential): number {
  const raw = credential.attributes?.priority?.trim()
  if (!raw || !/^[+-]?\d+$/.test(raw)) return 0
  return Number.parseInt(raw, 10)
}

function normalizeWeight(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0
  if (weight > MAX_WEIGHT) return 0
  return Math.trunc(weight)
}

/** El peso: el atributo gana sobre el metadato; inválido o fuera de rango, 0. */
export function authWeight(credential: ProxyCredential): number {
  const attribute = credential.attributes?.weight
  if (attribute !== undefined && attribute.trim() !== '') {
    const raw = attribute.trim()
    return /^[+-]?\d+$/.test(raw) ? normalizeWeight(Number.parseInt(raw, 10)) : 0
  }
  if (attribute !== undefined) return DEFAULT_WEIGHT
  const meta = credential.metadata?.weight
  if (meta !== undefined) return typeof meta === 'number' && Number.isInteger(meta) ? normalizeWeight(meta) : 0
  return DEFAULT_WEIGHT
}

function availabilityBlock(unavailable: boolean, quotaExceeded: boolean, nextRetryAfter: Date | undefined, nextRecoverAt: Date | undefined, now: Date): Block {
  if (!unavailable && !quotaExceeded) return { blocked: false, reason: 'none' }
  const hasRecoveryTime = nextRetryAfter !== undefined || nextRecoverAt !== undefined
  let next: Date | undefined
  for (const candidate of [nextRetryAfter, nextRecoverAt]) {
    if (candidate && candidate > now && (!next || candidate > next)) next = candidate
  }
  if (next) return { blocked: true, reason: quotaExceeded ? 'cooldown' : 'other', next }
  if (hasRecoveryTime) return { blocked: false, reason: 'none' }
  return { blocked: true, reason: 'other' }
}

/** Si la credencial está bloqueada para el modelo, por qué y hasta cuándo. */
export function isAuthBlockedForModel(credential: ProxyCredential, model: string, now: Date): Block {
  if (credential.disabled) return { blocked: true, reason: 'disabled' }
  if (credential.unauthorized) return { blocked: true, reason: 'other' }
  if (credential.accessTokenExpiresAt && credential.accessTokenExpiresAt <= now) return { blocked: true, reason: 'other' }
  const quota = credential.quota ?? {}
  if (quota.exceeded && quota.reason === 'credential_quota' && quota.nextRecoverAt && quota.nextRecoverAt > now) {
    return { blocked: true, reason: 'cooldown', next: quota.nextRecoverAt }
  }
  const states = Object.entries(credential.modelStates ?? {})
  if (model) {
    if (states.length > 0) {
      const key = canonicalModelKey(model)
      let matched = false
      let result: Block = { blocked: false, reason: 'none' }
      for (const [stateModel, state] of states) {
        if (!state || canonicalModelKey(stateModel) !== key) continue
        matched = true
        if (state.status === 'disabled') return { blocked: true, reason: 'disabled' }
        const block = availabilityBlock(!!state.unavailable, !!state.quota?.exceeded, state.nextRetryAfter, state.quota?.nextRecoverAt, now)
        if (!block.blocked) continue
        if (!block.next) return { blocked: true, reason: block.reason }
        const current = result.next
        if (!result.blocked || block.next > current! || (block.next.getTime() === current!.getTime() && block.reason === 'cooldown')) {
          result = block
        }
      }
      return matched ? result : { blocked: false, reason: 'none' }
    }
    return availabilityBlock(!!credential.unavailable, !!quota.exceeded, credential.nextRetryAfter, quota.nextRecoverAt, now)
  }
  // Sin modelo, la cuota agregada de estados por modelo no bloquea la credencial entera.
  const quotaExceeded = states.length > 0 && quota.reason !== 'credential_quota' && !credential.unavailable ? false : !!quota.exceeded
  return availabilityBlock(!!credential.unavailable, quotaExceeded, credential.nextRetryAfter, quota.nextRecoverAt, now)
}

/** Las disponibles del nivel más alto, por id; o el error que corresponde. */
export function availableCredentials(credentials: ProxyCredential[], provider: string, model: string, now: Date): ProxyCredential[] {
  if (credentials.length === 0) throw new SelectorError('auth_not_found', 'no auth candidates')
  const byPriority = new Map<number, ProxyCredential[]>()
  let cooling = 0
  let earliest: Date | undefined
  for (const credential of credentials) {
    const block = isAuthBlockedForModel(credential, model, now)
    if (!block.blocked) {
      const priority = authPriority(credential)
      byPriority.set(priority, [...(byPriority.get(priority) ?? []), credential])
      continue
    }
    if (block.reason === 'cooldown') cooling++
    if (block.reason !== 'disabled' && block.next && block.next > now && (!earliest || block.next < earliest)) earliest = block.next
  }
  if (byPriority.size === 0) {
    if (cooling === credentials.length && earliest) {
      throw new ModelCooldownError(model, provider === 'mixed' ? '' : provider, earliest.getTime() - now.getTime())
    }
    if (earliest && earliest > now) {
      throw new SelectorError('auth_unavailable', 'no auth available', 503, earliest.getTime() - now.getTime())
    }
    throw new SelectorError('auth_unavailable', 'no auth available')
  }
  const best = Math.max(...byPriority.keys())
  return [...byPriority.get(best)!].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** El índice del primer candidato con id posterior a `lastId`, con vuelta al principio. */
export function successorIndex(available: ProxyCredential[], lastId: string): number {
  if (!lastId) return 0
  const index = available.findIndex(c => c.id > lastId)
  return index === -1 ? 0 : index
}

export interface CredentialSelector {
  pick(provider: string, model: string, credentials: ProxyCredential[], now?: Date): ProxyCredential
}

export class FillFirstSelector implements CredentialSelector {
  pick(provider: string, model: string, credentials: ProxyCredential[], now = new Date()): ProxyCredential {
    return availableCredentials(credentials, provider, model, now)[0]!
  }
}

export class RoundRobinSelector implements CredentialSelector {
  private lastPicked = new Map<string, string>()

  constructor(private readonly maxKeys = DEFAULT_MAX_KEYS) {}

  pick(provider: string, model: string, credentials: ProxyCredential[], now = new Date()): ProxyCredential {
    const available = availableCredentials(credentials, provider, model, now)
    const key = `${provider}:${canonicalModelKey(model)}`
    if (!this.lastPicked.has(key) && this.lastPicked.size >= (this.maxKeys > 0 ? this.maxKeys : DEFAULT_MAX_KEYS)) {
      this.lastPicked = new Map()
    }
    const picked = available[successorIndex(available, this.lastPicked.get(key) ?? '')]!
    this.lastPicked.set(key, picked.id)
    return picked
  }

  /** Cuántas claves de cursor guarda: el tope se prueba por aquí. */
  cursorCount(): number {
    return this.lastPicked.size
  }
}

type SmoothWeightedState = { current: Map<string, number>; weights: Map<string, number> }

export class WeightedRoundRobinSelector implements CredentialSelector {
  private states = new Map<string, SmoothWeightedState>()

  constructor(private readonly maxKeys = DEFAULT_MAX_KEYS) {}

  pick(provider: string, model: string, credentials: ProxyCredential[], now = new Date()): ProxyCredential {
    const positive = credentials.filter(c => authWeight(c) > 0)
    const available = availableCredentials(positive, provider, model, now)
    const key = `${provider}:${canonicalModelKey(model)}`
    if (!this.states.has(key) && this.states.size >= (this.maxKeys > 0 ? this.maxKeys : DEFAULT_MAX_KEYS)) {
      this.states = new Map()
    }
    let state = this.states.get(key)
    if (!state) {
      state = { current: new Map(), weights: new Map() }
      this.states.set(key, state)
    }
    const weights = new Map(available.map(c => [c.id, authWeight(c)] as const).filter(([, w]) => w > 0))
    prepareState(state, weights)
    let picked: ProxyCredential | undefined
    let pickedCurrent = 0
    let total = 0
    for (const credential of available) {
      const weight = authWeight(credential)
      if (weight <= 0) continue
      const next = (state.current.get(credential.id) ?? 0) + weight
      state.current.set(credential.id, next)
      total += weight
      if (!picked || next > pickedCurrent) {
        picked = credential
        pickedCurrent = next
      }
    }
    if (!picked) throw new SelectorError('auth_unavailable', 'no auth available with positive weight')
    state.current.set(picked.id, pickedCurrent - total)
    return picked
  }
}

function prepareState(state: SmoothWeightedState, weights: Map<string, number>): void {
  let changed = false
  for (const [id, weight] of weights) {
    const previous = state.weights.get(id)
    if (previous !== undefined && previous !== weight) changed = true
  }
  if (changed) state.current = new Map()
  for (const [id, weight] of weights) state.weights.set(id, weight)
  if (state.current.size <= MAX_SMOOTH_WEIGHTED_STATE_ENTRIES && state.weights.size <= MAX_SMOOTH_WEIGHTED_STATE_ENTRIES) return
  for (const id of [...state.current.keys()]) if (!weights.has(id)) state.current.delete(id)
  for (const id of [...state.weights.keys()]) if (!weights.has(id)) state.weights.delete(id)
}
