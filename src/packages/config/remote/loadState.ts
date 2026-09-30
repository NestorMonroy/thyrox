/**
 * Puerto de `Ma`/`em`/`le()` de 2.1.283 (`chunk-379zyrv7.js`): el estado de
 * la última carga remota, guardado por host, con TODOS sus campos y métodos,
 * más la capa de accesores de una línea que la fuente pone encima y que sus
 * consumidores (`Qq`, `_x`, `lgn`, `Xk`, `agn`, `B`, `ot`, `st`) llaman:
 *
 * | Fuente | Aquí |
 * |---|---|
 * | `He()` | `Signal` |
 * | `le()` | `getRemoteLoadState` |
 * | `jye` | `getRemoteResetEpoch` |
 * | `sgn` / `P5n` / `B1r` | `getConsentedRemotePayload` / `markRemotePayloadConsented` / `dropRemoteConsentDeferral` |
 * | `f8e` | `replaceRemoteSessionCache` |
 * | `$v` / `sft` | `isRemoteSessionCacheVerified` / `isRemoteSessionCacheConsented` |
 * | `j1r` / `W1r` | `registerSyncCacheResetListener` / `resetRemoteLoadState` |
 * | `G1r` / `z1r` | `markPolicySettingsNotified` / `isPolicySettingsNotified` |
 * | `V1r` / `Ine` / `MUt` | `recordRemoteEligibility` / `getRemoteEligibilityMemo` / `getRemoteIneligibleReason` |
 * | `ign` / `jx` / `DUt` | `setRemoteLoadStatus` / `getRemoteLoadStatus` / `subscribeRemoteLoadStatus` |
 * | `cUe` / `q1r` | `isEvalPolicySnapshotOnly` / `setEvalPolicySnapshotOnly` |
 * | `S$o` | `isServedSnapshot` |
 * | `JE` | `getRemoteSettingsOverridePath` |
 *
 * `Ss(s)` —`dl().invalidateAll(s)`, la caché de settings por capa— se
 * traduce a `resetSettingsCache()`: este paquete tiene una sola caché
 * fusionada, sin capas ni etiqueta de fuente, así que el argumento no viaja.
 *
 * DIVERGENCIA — `backendView` (`Na`, con `cs`/`dUe`/`$Ut`): la vista del
 * almacén `storageV5` que en 2.1.283 sustituye a la sonda de disco. Medido:
 * `rg -l storageV5 src/packages` no da ningún archivo de este paquete; el
 * almacén no existe aquí. El campo se conserva con su tipo y siempre
 * `undefined`, de modo que `seedFromDisk`/`lgn` toman la rama de disco que
 * la fuente toma cuando `cs()` devuelve `undefined`. Condición de cierre:
 * portar `storageV5` y `Na`.
 *
 * DIVERGENCIA — `seedFromDisk` y la atestación (`Da`/`im`/`ds`): la fuente
 * sólo consiente el crudo de disco si no trae ajustes peligrosos, o si el
 * sidecar de atestación coincide con su hash. Medido: `rg -l attestation
 * src/packages/config` no da ningún módulo de hash de ajustes peligrosos.
 * El método recibe el juicio como predicado (`consentAttested`) y por
 * defecto lo da por bueno, que es la rama `Da(e) === undefined` de la
 * fuente. Condición de cierre: portar `P0`/`ba` y el sidecar `im`.
 *
 * DIVERGENCIA — `Ujt` (`AsyncResource.bind` sobre cada listener de `He()`):
 * conserva el contexto asíncrono del suscriptor. Aquí el listener se guarda
 * tal cual; ningún consumidor de este paquete depende de `AsyncLocalStorage`.
 *
 * `JE()` está compilada a `return` en 2.1.283: la anulación por archivo
 * (`CLAUDE_CODE_REMOTE_SETTINGS_PATH`) no existe en esa build. Se porta como
 * una función que devuelve `undefined`, para que `Ka`/`lgn`/`Xk` conserven
 * su forma y la anulación tenga un solo sitio donde volver.
 */

import { getConfigHostBindings, tryGetConfigHostBindings } from '../host.js'
import { HostBindingsError } from '../errors.js'
import type { PolicyError } from '../settings/policyComposition.js'
import { resetSettingsCache } from '../settings/settingsCache.js'
import type { SettingsJson } from '../settings/types.js'

/** Motivo por el que un fetch remoto no llegó a `'ok'`; `rulings` sólo con `ruled_empty`. */
export type RemoteSettingsFailure = {
  errorKind: string
  message: string
  httpStatus?: number
  rulings?: PolicyError[]
}

/** `lastLoadStatus` de `Ma`, tal como lo deja `ign()` en la fuente. */
export type RemoteLoadStatus =
  | { state: 'ineligible'; reason: string }
  | { state: 'ok'; hasSettings: boolean }
  | { state: 'stale_cache'; failure: RemoteSettingsFailure; transportEnvWithheld: boolean }
  | { state: 'failed'; failure: RemoteSettingsFailure }

/** `raw`/`view` de `Xk()` y `um()`: la vista memoizada por identidad del crudo. */
export type RemoteProjectedView<T> = {
  raw: T
  view: T
}

/** Las opciones de `Ma.replaceSessionCache`. */
export type ReplaceSessionCacheOptions = {
  verified?: boolean
  consentDeferred?: boolean
}

/** Las opciones de `Ma.recordEligibility`. */
export type RecordEligibilityOptions = {
  memoize: boolean
  ineligibleReason?: string
}

/** `He()`: una señal con suscripción, emisión y vaciado. */
export class Signal<Args extends unknown[]> {
  private readonly listeners = new Set<(...args: Args) => void>()

  subscribe(listener: (...args: Args) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Reparte a todos aunque alguno lance; los errores salen al final, juntos. */
  emit(...args: Args): void {
    let thrown: unknown[] | undefined
    for (const listener of this.listeners) {
      try {
        listener(...args)
      } catch (error) {
        (thrown ??= []).push(error)
      }
    }
    if (thrown) throw thrown.length === 1 ? thrown[0] : new AggregateError(thrown, 'Signal listener(s) threw')
  }

  clear(): void {
    this.listeners.clear()
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Puerto de `Ma`. Los campos son públicos porque los accesores de la fuente los leen y escriben directamente. */
export class RemoteLoadState<T> {
  sessionCache: T | null = null
  eligible: boolean | undefined = undefined
  eligibilityMemo: boolean | undefined = undefined
  ineligibleReason: string | undefined = undefined
  evalPolicySnapshotOnly = false
  lastLoadStatus: RemoteLoadStatus | undefined = undefined
  readonly lastLoadStatusChanged = new Signal<[RemoteLoadStatus | undefined]>()
  policySettingsNotified = false
  verifiedPayload: T | null = null
  unverifiedView: RemoteProjectedView<T> | null = null
  projectedView: RemoteProjectedView<T> | null = null
  consentedPayload: T | null = null
  deferredPayload: T | null = null
  resetEpoch = 0
  /** Ver la divergencia `backendView` del docstring del módulo: nunca se asigna. */
  readonly backendView: undefined = undefined
  resetListener: (() => void) | null = null

  replaceSessionCache(value: T, options?: ReplaceSessionCacheOptions): void {
    this.sessionCache = value
    if (options?.verified) {
      this.verifiedPayload = value
      if (options.consentDeferred) this.deferredPayload = value
    }
  }

  /** Ver la divergencia `seedFromDisk` del docstring: el juicio de atestación entra como predicado. */
  seedFromDisk(value: T, consentAttested: () => boolean = () => true): void {
    this.sessionCache = value
    if (!consentAttested()) return
    this.consentedPayload ??= value
  }

  markConsented(value: T): void {
    this.consentedPayload = value
  }

  dropConsentDeferral(): void {
    this.deferredPayload = null
  }

  markPolicySettingsNotified(): void {
    this.policySettingsNotified = true
  }

  recordEligibility(eligible: boolean, options: RecordEligibilityOptions): void {
    this.eligible = eligible
    if (options.memoize) {
      this.eligibilityMemo = eligible
      this.ineligibleReason = eligible ? undefined : options.ineligibleReason
    }
  }

  registerResetListener(listener: () => void): void {
    if (this.resetListener !== null) {
      throw new Error('registerSyncCacheResetListener: a listener is already registered; a second one would unhook the first')
    }
    this.resetListener = listener
  }

  /** Vacía todo salvo el listener de reset y `backendView`, sube la época y lo anuncia. */
  reset(): void {
    this.sessionCache = null
    this.eligible = undefined
    this.eligibilityMemo = undefined
    this.ineligibleReason = undefined
    this.evalPolicySnapshotOnly = false
    this.lastLoadStatus = undefined
    this.policySettingsNotified = false
    this.verifiedPayload = null
    this.unverifiedView = null
    this.projectedView = null
    this.consentedPayload = null
    this.deferredPayload = null
    this.resetEpoch++
    this.emitLoadStatusChanged(undefined)
  }

  /** Un listener que lanza no rompe la carga: se reporta al host y se sigue. */
  emitLoadStatusChanged(status: RemoteLoadStatus | undefined): void {
    try {
      this.lastLoadStatusChanged.emit(status)
    } catch (error) {
      tryGetConfigHostBindings().logDebug?.(`Remote settings: load-status listener threw: ${describeError(error)}`, { level: 'error' })
    }
  }
}

const remoteLoadStatesByHost = new WeakMap<object, RemoteLoadState<SettingsJson>>()

/** `le() = em.of(j().host)`: el estado de carga remota del host instalado. */
export function getRemoteLoadState(): RemoteLoadState<SettingsJson> {
  const host = getConfigHostBindings()
  const existing = remoteLoadStatesByHost.get(host)
  if (existing) return existing
  const created = new RemoteLoadState<SettingsJson>()
  remoteLoadStatesByHost.set(host, created)
  return created
}

/** `le()` cuando puede no haber host todavía: `undefined` en vez de lanzar. */
export function tryGetRemoteLoadState(): RemoteLoadState<SettingsJson> | undefined {
  try {
    return getRemoteLoadState()
  } catch (error) {
    if (error instanceof HostBindingsError) return undefined
    throw error
  }
}

/** `JE()`: compilada a `return` en 2.1.283 — ver el docstring del módulo. */
export function getRemoteSettingsOverridePath(): string | undefined {
  return undefined
}

/** `jye`. */
export function getRemoteResetEpoch(): number {
  return getRemoteLoadState().resetEpoch
}

/** `sgn`. */
export function getConsentedRemotePayload(): SettingsJson | null {
  return getRemoteLoadState().consentedPayload
}

/** `P5n`. */
export function markRemotePayloadConsented(value: SettingsJson): void {
  getRemoteLoadState().markConsented(value)
}

/** `B1r`. */
export function dropRemoteConsentDeferral(): void {
  getRemoteLoadState().dropConsentDeferral()
}

/** `f8e`: reemplaza la caché de sesión e invalida la fusionada (`Ss`). */
export function replaceRemoteSessionCache(value: SettingsJson, options?: ReplaceSessionCacheOptions): void {
  getRemoteLoadState().replaceSessionCache(value, options)
  resetSettingsCache()
}

/** `$v`: la caché de sesión es exactamente el payload verificado. */
export function isRemoteSessionCacheVerified(): boolean {
  const { sessionCache, verifiedPayload } = getRemoteLoadState()
  return sessionCache !== null && sessionCache === verifiedPayload
}

/** `sft`: verificada y, además, consentida o con consentimiento diferido. */
export function isRemoteSessionCacheConsented(): boolean {
  const { sessionCache, verifiedPayload, consentedPayload, deferredPayload } = getRemoteLoadState()
  return sessionCache !== null && sessionCache === verifiedPayload && (sessionCache === consentedPayload || sessionCache === deferredPayload)
}

/** `j1r`. */
export function registerSyncCacheResetListener(listener: () => void): void {
  getRemoteLoadState().registerResetListener(listener)
}

/** `W1r`: el reset completo, y el listener registrado se entera. */
export function resetRemoteLoadState(): void {
  const state = getRemoteLoadState()
  state.reset()
  state.resetListener?.()
}

/** `G1r`. */
export function markPolicySettingsNotified(): void {
  getRemoteLoadState().markPolicySettingsNotified()
}

/** `z1r`. */
export function isPolicySettingsNotified(): boolean {
  return getRemoteLoadState().policySettingsNotified
}

/** `V1r`: registra y memoiza la elegibilidad; devuelve lo registrado. */
export function recordRemoteEligibility(eligible: boolean, ineligibleReason?: string): boolean {
  getRemoteLoadState().recordEligibility(eligible, { memoize: true, ineligibleReason })
  return eligible
}

/** `Ine`. */
export function getRemoteEligibilityMemo(): boolean | undefined {
  return getRemoteLoadState().eligibilityMemo
}

/** `MUt`. */
export function getRemoteIneligibleReason(): string | undefined {
  return getRemoteLoadState().ineligibleReason
}

/** `ign`: guarda el desenlace y lo emite. */
export function setRemoteLoadStatus(status: RemoteLoadStatus): void {
  const state = getRemoteLoadState()
  state.lastLoadStatus = status
  state.emitLoadStatusChanged(status)
}

/** `jx`. */
export function getRemoteLoadStatus(): RemoteLoadStatus | undefined {
  return getRemoteLoadState().lastLoadStatus
}

/** `DUt`. */
export function subscribeRemoteLoadStatus(listener: (status: RemoteLoadStatus | undefined) => void): () => void {
  return getRemoteLoadState().lastLoadStatusChanged.subscribe(listener)
}

/** `cUe`. */
export function isEvalPolicySnapshotOnly(): boolean {
  return getRemoteLoadState().evalPolicySnapshotOnly
}

/** `q1r`. */
export function setEvalPolicySnapshotOnly(value: boolean): void {
  getRemoteLoadState().evalPolicySnapshotOnly = value
}

/** `S$o`: el documento servido es la vista proyectada de la sesión. */
export function isServedSnapshot(document: object | null): boolean {
  return document !== null && getRemoteLoadState().projectedView?.view === document
}
