/**
 * Puerto de `ccnmt: packages/app-host/src/state/store.ts` (1 línea fuente:
 * `export * from '@claude-code-how-works/repl/stateStore.js'`). El paquete
 * `repl` no existe en absoluto en este árbol — medido:
 * `ls /home/user/thyrox/src/packages/ | grep repl` → vacío — así que un
 * `export * from` fiel rompería la carga de ESTE archivo (y en cascada la
 * de `AppState.tsx`, que lo importa), no sólo al invocar una función; no
 * es el caso "capa colgante con require() diferido" que cubre el resto del
 * árbol, porque aquí no hay ninguna llamada que diferir — es un
 * re-export estático.
 *
 * `repl/src/stateStore.ts` (`createStore`, el único símbolo de valor que
 * exporta) es una hoja SIN dependencias propias — ni de `repl`, ni de
 * ningún otro paquete: genérico, cero imports en la fuente. Mismo criterio
 * que `config/host.ts` y `config/env/managed-constants.ts` ya aplican en
 * este árbol ("hoja sin dependencias propias, se porta en el sitio en vez
 * de bloquearse"): se porta AQUÍ, verbatim, en vez de fabricar un shim
 * `require()` hacia un paquete que no existe.
 */
type Listener = () => void
type OnChange<T> = (args: { newState: T; oldState: T }) => void

export type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: Listener) => () => void
}

export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,

    setState: (updater: (prev: T) => T) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },

    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
