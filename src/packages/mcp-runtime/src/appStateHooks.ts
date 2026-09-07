/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/appStateHooks.ts` — sus
 * 3 exportaciones, ninguna omitida. Adaptación verbatim; mismo patrón de
 * `require()` diferido que ya usa
 * `@thyrox/app-host: src/runtime/appStateCompatShim.ts`.
 *
 * V7 §7.2 — shim de `require()` diferido para que el paquete mcp-runtime no
 * importe `src/state/AppState` de forma estática al nivel de módulo.
 * Reenvía los argumentos verbatim.
 *
 * El `require('@claude-code-how-works/app-host/state/AppState.js')`
 * referencia un archivo que NO existe todavía en `@thyrox/app-host` — su
 * mapa de `exports` declara `./state/AppStateStore.js` y otros selectores,
 * pero ninguno expone `useAppState`/`useSetAppState`/`useAppStateStore` bajo
 * ese nombre. Queda colgante hasta que ese archivo se adapte en un pase
 * posterior (mismo criterio que el hallazgo de esta iniciativa documenta
 * para el resto del paquete).
 */

export type AppState = unknown

export function useAppState<T>(selector: (state: unknown) => T): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@claude-code-how-works/app-host/state/AppState.js') as {
    useAppState: <U>(s: (state: unknown) => U) => U
  }
  return mod.useAppState<T>(selector)
}

export function useSetAppState(): (updater: (prev: unknown) => unknown) => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@claude-code-how-works/app-host/state/AppState.js') as {
    useSetAppState: () => (updater: (prev: unknown) => unknown) => void
  }
  return mod.useSetAppState()
}

export function useAppStateStore(): {
  getState: () => unknown
  setState: (updater: (prev: unknown) => unknown) => void
  subscribe: (listener: () => void) => () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@claude-code-how-works/app-host/state/AppState.js') as {
    useAppStateStore: () => {
      getState: () => unknown
      setState: (updater: (prev: unknown) => unknown) => void
      subscribe: (listener: () => void) => () => void
    }
  }
  return mod.useAppStateStore()
}
