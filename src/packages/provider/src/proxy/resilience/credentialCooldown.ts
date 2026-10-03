/**
 * El enfriamiento de una credencial, escrito donde el selector lo lee —
 * porte del camino común de `markAccountUnavailable` y `clearAccountError` de
 * OmniRoute (`src/sse/services/auth.ts`, a58000c7, MIT).
 *
 * Tras un fallo, `checkFallbackError` (`./accountCooldown.ts`) decide cuánto
 * enfriar; esta capa lo escribe en la credencial: `unavailable` y
 * `nextRetryAfter`, o el estado de un solo modelo cuando lo que falta es el
 * modelo y no la cuenta. El selector (`../credentialSelectors.ts`) ya salta
 * lo enfriado y lo recupera al vencer. Un acierto lo retira todo.
 *
 * Divergencias declaradas:
 * - El estado vive en la credencial y en esta instancia, no en una base de
 *   datos, así que no sobrevive a un reinicio.
 * - Sin exclusión mutua: la escritura es síncrona y dos fallos no se
 *   intercalan. La guarda contra el enfriamiento duplicado sí se porta.
 * - Sólo el modelo retirado (`not_found`) se bloquea por modelo. Los bloqueos
 *   por modelo de los proveedores con cuota por modelo, por familia o por IP
 *   de salida dependen de su registro y no se portan.
 * - Sin las ramas propias de un proveedor (Codex, Alibaba, Grok, agentrouter)
 *   ni la desactivación automática de una cuenta dada de baja.
 */
import type { SharedStateStore } from '@thyrox/shared-state/port.ts'
import type { ProxyCredential } from '../credentialSelectors.ts'
import { checkFallbackError, type CooldownOptions, type FallbackDecision, isProviderModelUnsupported400 } from './accountCooldown.ts'

export type CredentialFailure = {
  credential: ProxyCredential
  provider: string
  model: string
  status: number
  /** El cuerpo del error, si se leyó. */
  errorText: string | null
  headers: Headers | null
  now?: Date
}

export class CredentialCooldown {
  private readonly backoffLevels = new Map<string, number>()
  /** El último error de cada credencial, con su instante. */
  private readonly lastErrors = new Map<string, { text: string; at: number }>()
  /** Las credenciales dadas de baja: un fallo transitorio no las rehabilita. */
  private readonly terminal = new Set<string>()

  constructor(
    private readonly options: CooldownOptions = {},
    /** El estado compartido entre proxies; sin él, la conducta es local, como hoy. */
    private readonly sharedState?: SharedStateStore,
  ) {}

  backoffLevelOf(credentialId: string): number {
    return this.backoffLevels.get(credentialId) ?? 0
  }

  /** Escribe en la credencial el enfriamiento que merece este fallo, y devuelve la decisión. */
  markUnavailable(failure: CredentialFailure): FallbackDecision {
    const { credential, status, model } = failure
    const now = failure.now ?? new Date()
    const errorText = failure.errorText ?? ''
    this.lastErrors.set(credential.id, { text: failure.errorText ?? `HTTP ${status}`, at: now.getTime() })
    if (this.terminal.has(credential.id)) return { shouldFallback: true, cooldownMs: 0 }
    const remaining = cooledUntil(credential, now)
    if (remaining > 0) return { shouldFallback: true, cooldownMs: remaining }
    if (isProviderModelUnsupported400(status, errorText)) {
      return { shouldFallback: false, cooldownMs: 0, reason: 'provider_model_unsupported' }
    }

    const decision = checkFallbackError(
      status, failure.errorText, this.backoffLevelOf(credential.id), model, failure.provider,
      failure.headers, null, null, this.options,
    )
    if (!decision.shouldFallback) return decision
    const until = new Date(now.getTime() + decision.cooldownMs)
    if (decision.reason === 'not_found' && model) {
      credential.modelStates = { ...credential.modelStates, [model]: { unavailable: true, nextRetryAfter: until } }
      return decision
    }
    this.backoffLevels.set(credential.id, decision.newBackoffLevel ?? this.backoffLevelOf(credential.id))
    if (decision.permanent) this.terminal.add(credential.id)
    if (decision.cooldownMs > 0) {
      credential.unavailable = true
      credential.nextRetryAfter = until
      // Como `MarkResult` de CLIProxyAPI: sólo un 429 es cuota, y el selector
      // distingue por ella «enfriada» (429 con causa) de «no disponible» (503).
      if (status === 429) credential.quota = { exceeded: true, reason: 'quota', nextRecoverAt: until }
      this.publishCooldown(credential.id, decision.reason, until, decision.cooldownMs)
    }
    return decision
  }

  /** Publica el enfriamiento en el store compartido, si hay uno; sin él, no hace nada. */
  private publishCooldown(credentialId: string, reason: string | undefined, until: Date, cooldownMs: number): void {
    if (!this.sharedState) return
    const payload = JSON.stringify({ reason: reason ?? null, until: until.toISOString() })
    void this.sharedState.setWithTtl(sharedCooldownKey(credentialId), payload, cooldownMs).catch(() => {})
  }

  /**
   * ¿Sigue enfriada esta credencial? Primero lo local —el propio objeto, que
   * no exige red—; sólo si hace falta, el store compartido.
   */
  async isCoolingDown(credential: ProxyCredential, now: Date = new Date()): Promise<boolean> {
    if (this.terminal.has(credential.id)) return true
    if (cooledUntil(credential, now) > 0) return true
    if (!this.sharedState) return false
    const shared = await this.sharedState.getWithTtl(sharedCooldownKey(credential.id))
    return shared !== null
  }

  /** Un acierto: la credencial vuelve a estar disponible y su retroceso a cero, salvo una baja. */
  clear(credential: ProxyCredential): void {
    if (this.terminal.has(credential.id)) return
    this.backoffLevels.delete(credential.id)
    this.lastErrors.delete(credential.id)
    credential.unavailable = false
    credential.nextRetryAfter = undefined
    credential.quota = undefined
  }

  /**
   * Anota la causa legible de un fallo sin decidir ningún enfriamiento: el
   * texto de un 5xx o de una excepción, que `markUnavailable` no recibe y que
   * el mensaje de un reintento tiene que poder contar.
   */
  noteError(credential: ProxyCredential, text: string, now: Date = new Date()): void {
    this.lastErrors.set(credential.id, { text, at: now.getTime() })
  }

  /**
   * El error más reciente entre estas credenciales; a igual instante, el de id
   * mayor. Es la causa que el error de enfriamiento de todas ellas cuenta.
   */
  latestError(credentials: readonly ProxyCredential[]): string | undefined {
    let latest: { id: string; text: string; at: number } | undefined
    for (const { id } of credentials) {
      const entry = this.lastErrors.get(id)
      if (entry && (!latest || entry.at > latest.at || (entry.at === latest.at && id > latest.id))) latest = { id, ...entry }
    }
    return latest?.text
  }
}

/** Los milisegundos de enfriamiento que le quedan a la credencial, o 0. */
function cooledUntil(credential: ProxyCredential, now: Date): number {
  if (!credential.unavailable || !credential.nextRetryAfter) return 0
  return Math.max(credential.nextRetryAfter.getTime() - now.getTime(), 0)
}

/** La clave del estado compartido bajo la que vive el enfriamiento de una credencial. */
function sharedCooldownKey(credentialId: string): string {
  return `credential-cooldown:${credentialId}`
}
