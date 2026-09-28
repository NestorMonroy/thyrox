/**
 * Comparar y cambiar al persistir un refresco. El mutex por conexión no
 * protege de un tercer escritor (otro proceso, una comprobación de salud
 * concurrente) que ya guardó una rotación más nueva: pisarla devuelve la fila
 * a un refresh token consumido, y el siguiente refresco hace que el proveedor
 * revoque la familia entera. Justo antes de guardar se relee la fila; si ya no
 * tiene el token que se presentó, no se guarda. Quien llamó recibe igual el
 * access token nuevo.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/casGuard.ts` (MIT).
 */
import { AsyncLocalStorage } from 'node:async_hooks'

import { type RefreshLogger, wasRefreshTokenRotated } from './refreshErrors.ts'

export interface CasGuard {
  /** El refresh token presentado: la versión contra la que se compara. */
  expectedRefreshToken: string | null
  /** El refresh token guardado ahora mismo, descifrado. */
  reread: () => Promise<string | null | undefined>
}

const casGuardStore = new AsyncLocalStorage<CasGuard>()
const casGuardStats = { skipped: 0, persisted: 0 }

export function runWithCasGuard<T>(guard: CasGuard | undefined | null, fn: () => Promise<T>): Promise<T> {
  return guard ? casGuardStore.run(guard, fn) : fn()
}

export function getActiveCasGuard(): CasGuard | undefined {
  return casGuardStore.getStore()
}

/** Cuántos guardados se omitieron y cuántos se hicieron bajo una guarda. */
export function getCasGuardStats(): { skipped: number; persisted: number } {
  return { ...casGuardStats }
}

export function resetCasGuardStats(): void {
  casGuardStats.skipped = 0
  casGuardStats.persisted = 0
}

/** `true` si otro escritor ya rotó la fila; ante una relectura fallida se guarda igual. */
export async function casGuardShouldSkipPersist(log?: RefreshLogger): Promise<boolean> {
  const guard = getActiveCasGuard()
  if (!guard || !guard.expectedRefreshToken) return false
  let current: string | null | undefined
  try {
    current = await guard.reread()
  } catch {
    return false
  }
  if (wasRefreshTokenRotated(guard.expectedRefreshToken, current)) {
    casGuardStats.skipped++
    log?.warn?.('TOKEN_REFRESH', 'CAS guard: skipping persist — a concurrent writer already rotated the refresh_token')
    return true
  }
  casGuardStats.persisted++
  return false
}
