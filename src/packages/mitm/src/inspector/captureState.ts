/**
 * El estado en proceso de los modos de captura del inspector: el proxy HTTP
 * en marcha, el proxy del sistema aplicado (con el estado anterior y una
 * guarda que lo revierte sola al vencer) y la intercepción TLS. Estas
 * funciones son la única vía de escritura.
 *
 * Porte de `omniroute: src/lib/inspector/captureState.ts` (MIT). La
 * reversión se importa estática (no hay ciclo: `systemProxyConfig` no
 * importa este módulo); la intercepción TLS lee
 * `THYROX_INSPECTOR_TLS_INTERCEPT` al consultarla mientras nadie la fije,
 * y `setTlsIntercept(null)` vuelve a esa lectura.
 */
import type { HttpProxyServerHandle } from './httpProxyServer.ts'
import { revert, type PreviousState } from './systemProxyConfig.ts'

let httpProxyHandle: HttpProxyServerHandle | null = null

export function getHttpProxyHandle(): HttpProxyServerHandle | null {
  return httpProxyHandle
}

export function setHttpProxyHandle(handle: HttpProxyServerHandle | null): void {
  httpProxyHandle = handle
}

export interface SystemProxyState {
  applied: boolean
  port: number | null
  /** ISO 8601. */
  guardUntil: string | null
  previousState: PreviousState | null
}

const NOT_APPLIED: SystemProxyState = { applied: false, port: null, guardUntil: null, previousState: null }

let systemProxyState: SystemProxyState = { ...NOT_APPLIED }
let guardTimer: ReturnType<typeof setTimeout> | null = null

export function getSystemProxyState(): Readonly<SystemProxyState> {
  return { ...systemProxyState }
}

/** Registra el proxy aplicado y arma la guarda que lo revierte al vencer. */
export function setSystemProxyApplied(port: number, previousState: PreviousState, guardMinutes: number): void {
  if (guardTimer) clearTimeout(guardTimer)
  const guardUntil = new Date(Date.now() + guardMinutes * 60_000).toISOString()
  systemProxyState = { applied: true, port, guardUntil, previousState }
  guardTimer = setTimeout(() => {
    guardTimer = null
    const previous = systemProxyState.previousState
    systemProxyState = { ...NOT_APPLIED }
    // De mejor esfuerzo: una reversión fallida no tiene a quién avisar.
    if (previous) revert(previous).catch(() => {})
  }, guardMinutes * 60_000)
}

export function clearSystemProxy(): void {
  if (guardTimer) {
    clearTimeout(guardTimer)
    guardTimer = null
  }
  systemProxyState = { ...NOT_APPLIED }
}

let tlsInterceptOverride: boolean | null = null

export function isTlsInterceptEnabled(): boolean {
  return tlsInterceptOverride ?? process.env.THYROX_INSPECTOR_TLS_INTERCEPT === 'true'
}

export function setTlsIntercept(enabled: boolean | null): void {
  tlsInterceptOverride = enabled
}
