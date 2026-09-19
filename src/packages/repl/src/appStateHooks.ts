// V7 §7.2 — lazy require() shim so repl package UI doesn't directly
// import src/state/AppState at top level. Forwards args verbatim.
import type { Context, ReactNode } from 'react'

// ESTRECHADO 2026-09-19 (TASK-THYROX-0203), no portado verbatim.
//
// La referencia declara los dos como `unknown`
// (`ccnmt: packages/repl/src/appStateHooks.ts:5-6`). Su propio CLAUDE.md:274
// fija el umbral que decide cuando eso se estrecha: un shim `unknown` solo
// rinde sobre consumidores de patron ACCESS (`x.campo`), y a partir de tres
// sitios vale estrecharlo. Medido aqui: 340 TS18046 de la forma
// `useAppState(s => s.campo)` y `setAppState(prev => ({...prev}))` nacen de
// estas dos lineas.
//
// El re-export es de SOLO TIPO, asi que se borra al compilar: no introduce
// el import de modulo que el shim existe para evitar, y `@thyrox/app-host`
// ya es dependencia declarada de este paquete.
import type { AppState } from '@thyrox/app-host/state/AppStateStore.js'
export type { AppState, FooterItem } from '@thyrox/app-host/state/AppStateStore.js'

/**
 * Lazy accessor for the AppStoreContext singleton. Returns the same React
 * Context instance each call — safe to pass to useContext(). Consumers that
 * need the Context at render time should call this inline:
 *
 *   const store = useContext(getAppStoreContext())
 */
export function getAppStoreContext(): Context<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    AppStoreContext: Context<unknown>
  }
  return mod.AppStoreContext
}

export function useAppState<T>(selector: (state: AppState) => T): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    useAppState: <U>(s: (state: AppState) => U) => U
  }
  return mod.useAppState<T>(selector)
}

export function useAppStateMaybeOutsideOfProvider<T>(
  selector: (state: AppState) => T,
): T | undefined {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    useAppStateMaybeOutsideOfProvider: <U>(s: (state: AppState) => U) => U | undefined
  }
  return mod.useAppStateMaybeOutsideOfProvider<T>(selector)
}

export function useSetAppState(): (updater: (prev: AppState) => AppState) => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    useSetAppState: () => (updater: (prev: AppState) => AppState) => void
  }
  return mod.useSetAppState()
}

export function useAppStateStore(): {
  getState: () => AppState
  setState: (updater: (prev: AppState) => AppState) => void
  subscribe: (listener: () => void) => () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    useAppStateStore: () => {
      getState: () => AppState
      setState: (updater: (prev: AppState) => AppState) => void
      subscribe: (listener: () => void) => () => void
    }
  }
  return mod.useAppStateStore()
}

export function AppStateProvider(props: {
  initialState: AppState
  children: ReactNode
}): ReactNode {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    AppStateProvider: (p: { initialState: AppState; children: ReactNode }) => ReactNode
  }
  return mod.AppStateProvider(props)
}
