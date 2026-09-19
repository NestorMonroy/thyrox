/**
 * Puerto de `ccnmt: packages/voice/src/appStateHooks.ts` (13 líneas),
 * con UNA divergencia declarada respecto a la fuente: el tipo.
 *
 * LA FUENTE YA ES UN SHIM de `require()` diferido, y lo declara ella
 * misma en el comentario conservado abajo. El `require()` NO es
 * adaptación nuestra: es el mecanismo de la fuente, y se conserva.
 *
 * DIVERGENCIA DECLARADA — `AppState` NO es `unknown` aquí.
 *
 * La fuente escribe `export type AppState = unknown` y tipa el selector
 * `(state: unknown) => T`, porque en su árbol el shim existe justamente
 * para no arrastrar el tipo. En THYROX el módulo destino SÍ está, y el
 * tipo con él — medido por conducta el 2026-09-19T07:53:24:
 *
 *   - `@thyrox/app-host/state/AppState.js` resuelve a
 *     `src/packages/app-host/src/state/AppState.tsx`;
 *   - ese módulo reexporta el tipo `AppState` (`:164-167`, desde
 *     `./AppStateStore.ts`) y su propio `useAppState` ya está tipado
 *     `(state: AppState) => T` (`:273`), no contra `unknown`.
 *
 * Así que mantener `unknown` aquí sería fidelidad al LITERAL de la
 * fuente y no a su INTENCIÓN: el shim evita el import de VALOR en
 * tiempo de ejecución, no el tipo. `import type` se borra al compilar
 * —no emite `require` ni `import`— así que el mecanismo diferido queda
 * intacto y el consumidor recupera el tipo real.
 *
 * LA VERSIÓN ANTERIOR DE ESTE HEADER AFIRMABA QUE EL MÓDULO NO EXISTE,
 * citando un `find src/packages/app-host -iname 'AppState.ts'` → 0. El
 * `find` era correcto y la conclusión falsa: **el archivo es
 * `AppState.tsx`**. Buscar la extensión equivocada y concluir que el
 * módulo no existe es el sub-patrón C — medir el significante, concluir
 * sobre el significado. También había retirado el comentario en inglés
 * de la fuente; queda restaurado.
 */

// V7 §7.2 — lazy require() shim so voice package does not import
// src/state/AppState directly at top level.

// `import type` se borra al compilar: no emite `require` ni `import`, así
// que no rompe el diferimiento que este shim existe para dar.
import type { AppState } from '@thyrox/app-host/state/AppState.js'

export type { AppState }

export function useAppState<T>(selector: (state: AppState) => T): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/app-host/state/AppState.js') as {
    useAppState: <U>(s: (state: AppState) => U) => U
  }
  return mod.useAppState<T>(selector)
}
