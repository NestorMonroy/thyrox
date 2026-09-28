/**
 * El guardado de un refresco viaja con la llamada: quien refresca a través
 * de un ejecutor declara cómo guardar el resultado, y el orquestador lo
 * encuentra sin que cada ejecutor tenga que recibirlo como parámetro.
 *
 * Porte de `runWithOnPersist` y `getActiveOnPersist` de
 * `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import { AsyncLocalStorage } from 'node:async_hooks'

export type RefreshPersistFn = (result: Record<string, unknown>) => Promise<void>

const persistStore = new AsyncLocalStorage<RefreshPersistFn>()

export function runWithPersist<T>(persist: RefreshPersistFn | null | undefined, fn: () => Promise<T>): Promise<T> {
  return persist ? persistStore.run(persist, fn) : fn()
}

export function activePersist(): RefreshPersistFn | undefined {
  return persistStore.getStore()
}
