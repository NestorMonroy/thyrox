/**
 * Porte de `ccnmt: packages/agent/compaction/compactWarningState.ts`.
 *
 * Un store minimo tipo pub/sub para un booleano: si el aviso de
 * compactacion esta suprimido en la sesion actual. El guard
 * `Object.is(next, prev)` evita notificar a los listeners cuando el
 * valor fijado es identico al que ya habia.
 */

type Listener = () => void

type SimpleStore<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: Listener) => () => void
}

function createSimpleStore<T>(initialState: T): SimpleStore<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,
    setState: (updater: (prev: T) => T) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return
      state = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** El store: `true` cuando el aviso de compactacion esta suprimido. */
export const compactWarningStore = createSimpleStore<boolean>(false)

export function suppressCompactWarning(): void {
  compactWarningStore.setState(() => true)
}

export function clearCompactWarningSuppression(): void {
  compactWarningStore.setState(() => false)
}
