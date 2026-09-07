/**
 * Puerto de `ccnmt: packages/voice/src/appStateHooks.ts` (13 líneas).
 * La fuente ya es, en sí misma, un shim de `require()` diferido — evita
 * que el paquete importe `app-host/state/AppState.js` de forma estática.
 * Se porta verbatim con el mismo mecanismo: en este árbol
 * `@thyrox/app-host/state/AppState.js` NO existe (medido: `find
 * src/packages/app-host -iname 'AppState.ts'` → 0 archivos; sólo hay
 * `AppStateStore.ts` y `runtime/appStateCompatShim.ts`, ninguno con el
 * mismo nombre de export). El `require()` diferido documentado abajo
 * fallará sólo si `useAppState()` se invoca de verdad — nada en este
 * árbol lo hace hoy.
 */

/** @dynamicRequire */
export type AppState = unknown

export function useAppState<T>(selector: (state: unknown) => T): T {
  // `@thyrox/app-host/state/AppState.js` no existe en este árbol (medido
  // con `find`, arriba). Se resuelve con require() diferido — es la
  // ÚNICA excepción admitida a "sin lazy imports": el especificador no
  // resuelve hoy, no una preferencia de estilo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    useAppState: <U>(s: (state: unknown) => U) => U
  }
  return mod.useAppState<T>(selector)
}
