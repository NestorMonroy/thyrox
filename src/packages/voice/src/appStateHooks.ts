/**
 * Puerto de `ccnmt: packages/voice/src/appStateHooks.ts` (13 líneas),
 * 100 % portado, byte a byte tras normalizar el alcance.
 *
 * ESTE ARCHIVO NO ES UN STUB NUESTRO: la FUENTE ya es un shim de
 * `require()` diferido, y lo declara ella misma en su comentario
 * («V7 §7.2 — lazy require() shim…», conservado abajo verbatim). El
 * `require()` y el `export type AppState = unknown` son decisiones de la
 * fuente, no adaptaciones.
 *
 * LA VERSIÓN ANTERIOR DE ESTE HEADER AFIRMABA ALGO FALSO, y en dos
 * sentidos — corregido el 2026-09-19T07:50:35:
 *
 *   1. Decía que `@thyrox/app-host/state/AppState.js` «NO existe en este
 *      árbol (medido: `find src/packages/app-host -iname AppState.ts` → 0
 *      archivos)». El `find` era correcto y la conclusión falsa: el
 *      archivo es `AppState.tsx`, no `.ts`, y el specifier resuelve —
 *      medido por conducta a `src/packages/app-host/src/state/AppState.tsx`.
 *      Buscar la extensión equivocada y concluir que el módulo no existe
 *      es el sub-patrón C: medir el significante, concluir sobre el
 *      significado.
 *   2. Había RETIRADO el comentario en inglés de la fuente y puesto en su
 *      lugar una justificación propia del `require()`. El `require()` no
 *      necesita justificación nuestra: es de la fuente.
 *
 * CONSECUENCIA MEDIDA, declarada y NO corregida aquí: `AppState = unknown`
 * hace que `useVoiceEnabled.ts` dé dos `TS18046: 's' is of type
 * 'unknown'`. Es fidelidad a la fuente, no un defecto introducido por el
 * porte — el selector de la fuente ya está tipado `(state: unknown) => T`.
 * Estrechar el tipo sería DIVERGIR de la fuente, y esa decisión es la
 * tarea #512 («triar los 9 shims de AppState por patrón ACCESS, con el
 * umbral que ccnmt declara»), no ésta.
 */

// V7 §7.2 — lazy require() shim so voice package does not import
// src/state/AppState directly at top level.

/** @dynamicRequire */
export type AppState = unknown

export function useAppState<T>(selector: (state: unknown) => T): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    useAppState: <U>(s: (state: unknown) => U) => U
  }
  return mod.useAppState<T>(selector)
}
