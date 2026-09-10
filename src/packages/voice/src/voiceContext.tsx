/**
 * Puerto de `ccnmt: packages/voice/src/voiceContext.tsx` (76 líneas).
 *
 * Cobertura DECLARADA: 1 de 5 exports.
 *
 * Portado VERBATIM (sin dependencia de React ni de ningún módulo
 * ausente — es sólo un alias de tipo, dato puro):
 *   - `VoiceState` (el tipo local de este módulo — el estado de UI de
 *     voz: `voiceState`/`voiceError`/`voiceInterimTranscript`/
 *     `voiceAudioLevels`/`voiceWarmingUp`. NO es el mismo `VoiceState`
 *     de `../contracts.ts`, que describe el runtime completo — son dos
 *     tipos homónimos con alcance de módulo distinto, igual que en la
 *     fuente).
 *
 * NO portados (4 de 5): `VoiceProvider`, `useVoiceState`,
 * `useSetVoiceState`, `useGetVoiceState`. Bloqueador MEDIDO en DOS
 * capas independientes, cualquiera de las dos ya basta:
 *
 *   1. React: `VoiceProvider` es un componente JSX (`<VoiceContext.
 *      Provider>`); los otros tres usan `createContext`/`useContext`/
 *      `useState`/`useSyncExternalStore`. `react` no existe como
 *      paquete en este árbol (medido con
 *      `Bun.resolveSync('react', <dir>)` desde este paquete →
 *      "Cannot find package 'react'").
 *   2. `@claude-code-how-works/repl/stateStore.js` (`createStore`,
 *      `Store<T>`) — el paquete `repl` entero está ausente de
 *      `thyrox` (medido: `find src/packages -maxdepth 1 -iname repl`
 *      → 0 resultados; es la familia de 11 paquetes que cubre la capa
 *      TUI interactiva completa de ccnmt, fuera del alcance de este
 *      harness headless por diseño).
 *
 * Los cuatro se declaran con su firma exacta y un cuerpo que difiere
 * `require('react')` — mismo patrón que `./hooks/useVoice.ts` y
 * `./hooks/useVoiceEnabled.ts`: el módulo carga sin fallar; sólo
 * invocar cualquiera de los cuatro dispara el error, con el motivo
 * explícito.
 */

export type VoiceState = {
  voiceState: 'idle' | 'recording' | 'processing'
  voiceError: string | null
  voiceInterimTranscript: string
  voiceAudioLevels: number[]
  voiceWarmingUp: boolean
}

function requireReactUnavailable(symbol: string): never {
  // `react` no existe como paquete en este árbol, y tampoco
  // `@thyrox/repl/stateStore.js` (medido: ver docstring del módulo). Se
  // resuelve con require() diferido — es la ÚNICA excepción admitida a
  // "sin lazy imports": el especificador no resuelve hoy, no una
  // preferencia de estilo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react')
  throw new Error(
    `${symbol}() no está portado: depende de react (createContext/` +
      'useContext/useState/useSyncExternalStore) y de ' +
      '@thyrox/repl/stateStore.js (createStore/Store), ninguno de los ' +
      'dos presente en este árbol.',
  )
}

/**
 * NO PORTADO — ver docstring del módulo. En la fuente es un componente
 * JSX; aquí se declara como función que dispara el error de bloqueo si
 * se invoca.
 */
export function VoiceProvider(_props: { children: unknown }): never {
  return requireReactUnavailable('VoiceProvider')
}

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function useVoiceState<T>(_selector: (state: VoiceState) => T): T {
  return requireReactUnavailable('useVoiceState')
}

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function useSetVoiceState(): (
  updater: (prev: VoiceState) => VoiceState,
) => void {
  return requireReactUnavailable('useSetVoiceState')
}

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function useGetVoiceState(): () => VoiceState {
  return requireReactUnavailable('useGetVoiceState')
}
