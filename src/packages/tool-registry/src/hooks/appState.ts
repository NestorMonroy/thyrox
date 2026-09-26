// Runtime re-export of app state hooks via host binding, so tool UI code
// stays free of direct src/state/AppState imports (V7 §7.2).
// The actual implementations live in the app, and are resolved lazily
// via require() at call site to avoid eager coupling.
// El TIPO sí se importa: `import type` no acopla en ejecución, y sin él
// `getState()` devolvía `unknown` a quien espera `AppState` (BashTool/UI.tsx).
import type { AppState } from '@thyrox/app-host/state/AppState.js'

type Store<S> = {
  getState: () => S
  setState: (updater: (prev: S) => S) => void
  subscribe: (listener: () => void) => () => void
}
type SetAppState = (updater: (prev: AppState) => AppState) => void

export function useAppStateStore(): Store<AppState> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as { useAppStateStore: () => Store<AppState> }
  return mod.useAppStateStore()
}

export function useSetAppState(): SetAppState {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as { useSetAppState: () => SetAppState }
  return mod.useSetAppState()
}
