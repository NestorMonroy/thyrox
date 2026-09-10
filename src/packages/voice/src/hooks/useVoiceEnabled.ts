/**
 * Puerto de `ccnmt: packages/voice/src/hooks/useVoiceEnabled.ts` (25
 * líneas).
 *
 * Cobertura DECLARADA: 0 de 1 exports portados en forma verbatim.
 *
 * `useVoiceEnabled()` es enteramente un hook de React: usa `useMemo` de
 * `react` sobre `useAppState()` (`../appStateHooks.js`, ya portado en
 * este árbol con su propio `require()` diferido — ver ese módulo). El
 * bloqueador es `react` mismo: medido con
 * `Bun.resolveSync('react', <dir>)` desde este paquete →
 * "Cannot find package 'react'" (0 `.tsx` pre-existentes, 0 dependencia
 * `react` en todo `thyrox`).
 *
 * Se conserva la firma exacta (`(): boolean`) con un cuerpo que difiere
 * `require('react')` — mismo patrón que `useVoice()`
 * (`./useVoice.ts`) y `remote-setup.tsx`'s `call()`
 * (`@thyrox/teleport`): el módulo carga sin fallar; sólo invocar
 * `useVoiceEnabled()` de verdad dispara el error con el motivo
 * explícito.
 *
 * La lógica NO-React que la fuente combina —`hasVoiceAuth()` +
 * `isVoiceGrowthBookEnabled()`— YA está portada verbatim en
 * `./voiceModeEnabled.ts` de este mismo paquete y es usable
 * directamente sin pasar por este hook.
 */

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function useVoiceEnabled(): boolean {
  // `react` no existe como paquete en este árbol (medido con
  // Bun.resolveSync arriba en el docstring del módulo). Se resuelve con
  // require() diferido — es la ÚNICA excepción admitida a "sin lazy
  // imports": el especificador no resuelve hoy, no una preferencia de
  // estilo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react')
  throw new Error(
    'useVoiceEnabled() no está portado: depende de react#useMemo sobre ' +
      'useAppState(), ninguno de los dos presente en este árbol como ' +
      'hook funcional. Usar hasVoiceAuth() + isVoiceGrowthBookEnabled() ' +
      'de ./voiceModeEnabled.ts directamente — es la lógica no-React ' +
      'que este hook combina, y está portada.',
  )
}
