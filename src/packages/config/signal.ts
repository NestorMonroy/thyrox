/**
 * Puerto de `ccnmt: packages/config/signal.ts` (41 líneas fuente).
 * Reimplementación fiel VERBATIM. Sin dependencias.
 *
 * Primitiva mínima de conjunto-de-listeners para señales de evento puras
 * (sin estado guardado). Colapsa a una línea el boilerplate de ~8 líneas
 * `const listeners = new Set(); function subscribe(){…};
 * function notify(){for(const l of listeners) l()}` que la fuente reporta
 * duplicado ~15 veces por el árbol.
 *
 * Distinta de un store (`AppState`, `createStore`) — no hay snapshot, no
 * hay `getState`. Se usa cuando a los suscriptores les basta saber "algo
 * pasó", opcionalmente con argumentos del evento, no "cuál es el valor
 * actual".
 *
 * Uso:
 *   const changed = createSignal<[SettingSource]>()
 *   export const subscribe = changed.subscribe
 *   // más tarde: changed.emit('userSettings')
 */

export type Signal<Args extends unknown[] = []> = {
  /** Suscribe un listener. Devuelve una función para desuscribirse. */
  subscribe: (listener: (...args: Args) => void) => () => void
  /** Llama a todos los listeners suscritos con los argumentos dados. */
  emit: (...args: Args) => void
  /** Elimina todos los listeners. Útil en rutas de dispose/reset. */
  clear: () => void
}

export function createSignal<Args extends unknown[] = []>(): Signal<Args> {
  const listeners = new Set<(...args: Args) => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit(...args) {
      for (const listener of listeners) listener(...args)
    },
    clear() {
      listeners.clear()
    },
  }
}
