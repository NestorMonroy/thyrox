/**
 * Puerto de `Ma`/`em`/`le()` de 2.1.283 (`chunk-379zyrv7.js`): el estado de
 * la última carga remota, guardado por host. Recortado a los cuatro campos
 * que un consumidor futuro necesita para el aviso de servidores MCP
 * retenidos, los fallos `ruled_empty` y `servedSnapshot`
 * (`lastLoadStatus`, `projectedView`, `sessionCache`, `verifiedPayload`);
 * el resto de `Ma` (el asistente diferido, la elegibilidad memoizada, el
 * listener de reset, `consentedPayload`/`deferredPayload`) no tiene
 * consumidor portado en este árbol y queda fuera.
 *
 * DIVERGENCIA — `Ma.lastLoadStatusChanged`: la fuente emite un evento en
 * cada cambio de estado; aquí no hay suscriptor (el futuro consumidor lee
 * `lastLoadStatus` de forma síncrona), así que el emisor no se porta.
 *
 * DIVERGENCIA — `Xk()`/`om()`: la fuente deriva `projectedView.view` del
 * crudo con una transformación (`om`) que no está portada en este árbol;
 * aquí la vista es el propio crudo, y `recordProjectedView` conserva sólo
 * la memoización por identidad de referencia.
 */

import { getConfigHostBindings } from '../host.js'
import type { SettingsJson } from '../settings/types.js'

/** Motivo por el que un fetch remoto no llegó a `'ok'`. */
export type RemoteSettingsFailure = {
  errorKind: string
  message: string
}

/** `lastLoadStatus` de `Ma`, tal como lo deja `ign()` en la fuente. */
export type RemoteLoadStatus =
  | { state: 'ineligible'; reason: string }
  | { state: 'ok'; hasSettings: boolean }
  | { state: 'stale_cache'; failure: RemoteSettingsFailure; transportEnvWithheld: boolean }
  | { state: 'failed'; failure: RemoteSettingsFailure }

/** `raw`/`view` de `Xk()` — ver la divergencia del docstring del módulo. */
export type RemoteProjectedView<T> = {
  raw: T
  view: T
}

/** Puerto de `Ma`, recortado a los cuatro campos que este árbol consume. */
export class RemoteLoadState<T> {
  private cache: T | null = null
  private verified: T | null = null
  private projected: RemoteProjectedView<T> | null = null
  private status: RemoteLoadStatus | undefined = undefined

  get sessionCache(): T | null {
    return this.cache
  }

  get verifiedPayload(): T | null {
    return this.verified
  }

  get projectedView(): RemoteProjectedView<T> | null {
    return this.projected
  }

  get lastLoadStatus(): RemoteLoadStatus | undefined {
    return this.status
  }

  /** `Ma.replaceSessionCache`, sin la rama de `consentDeferred` (fuera de alcance). */
  recordSessionCache(value: T, verified: boolean): void {
    this.cache = value
    if (verified) this.verified = value
  }

  /** `Xk()`: memoiza por identidad del crudo, como hace la fuente. */
  recordProjectedView(raw: T): RemoteProjectedView<T> {
    if (this.projected === null || this.projected.raw !== raw) {
      this.projected = { raw, view: raw }
    }
    return this.projected
  }

  setLastLoadStatus(status: RemoteLoadStatus): void {
    this.status = status
  }

  /** `Ma.reset()`, recortado a los cuatro campos portados. */
  reset(): void {
    this.cache = null
    this.verified = null
    this.projected = null
    this.status = undefined
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
