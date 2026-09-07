/**
 * Puerto de `ccnmt: packages/voice/src/hooks/useVoiceIntegration.tsx`
 * (720 líneas).
 *
 * Cobertura DECLARADA: 0 de 3 exports portados en forma funcional.
 *
 * Los tres exports (`useVoiceIntegration`, `useVoiceKeybindingHandler`,
 * `VoiceKeybindingHandler`) son, sin excepción, capa de integración
 * React+ink: manejo de `useRef`/`useCallback`/`useEffect`/`useMemo`,
 * `useInput`/`KeyboardEvent`/`useOptionalKeybindingContext`/
 * `keystrokesEqual`/`ParsedKeystroke` de `@anthropic/ink`, y
 * `useNotifications`/`useIsModalOverlayActive` de
 * `@claude-code-how-works/repl/*`. Ningún fragmento del archivo es
 * lógica pura separable del árbol de eventos de teclado del REPL — a
 * diferencia de `./useVoice.ts` (que sí tenía 3 exports puros
 * extraíbles), aquí el propio helper interno no exportado
 * (`matchesKeyboardEvent`) ya depende del tipo `KeyboardEvent` de ink.
 *
 * Bloqueador MEDIDO en DOS capas independientes, cualquiera basta:
 *   1. `react` no existe como paquete en este árbol (medido con
 *      `Bun.resolveSync('react', <dir>)` desde este paquete →
 *      "Cannot find package 'react'").
 *   2. `@anthropic/ink` y `@thyrox/repl` (la familia de 11 paquetes
 *      TUI) están ausentes por completo (medido: `find src/packages
 *      -maxdepth 1 -iname repl` → 0 resultados; `thyrox` es un harness
 *      headless por diseño, sin capa TUI interactiva).
 *
 * Los tres exports se declaran con su firma exacta (los tipos que en
 * la fuente usan `React.Dispatch`/`React.RefObject`/`KeyboardEvent` de
 * ink se sustituyen aquí por alias locales de forma equivalente, sin
 * traer la dependencia real) y un cuerpo que difiere `require('react')`
 * — mismo patrón que `./useVoice.ts`, `./useVoiceEnabled.ts` y
 * `../voiceContext.tsx`: el módulo carga sin fallar; sólo invocar
 * cualquiera de los tres dispara el error, con el motivo explícito.
 */

// Sustituto local de `React.Dispatch<React.SetStateAction<string>>` —
// react no está presente; se documenta la forma sin traer la
// dependencia.
type SetStringState = (value: string | ((prev: string) => string)) => void

// Sustituto local de `React.RefObject<T>`.
type RefLike<T> = { current: T }

// Sustituto local de `KeyboardEvent` de `@anthropic/ink` — sólo se usa
// como parámetro de tipo en las firmas bloqueadas de abajo, nunca se
// inspecciona su forma real aquí.
type InkKeyboardEvent = unknown

type InsertTextHandle = {
  insert: (text: string) => void
  setInputWithCursor: (value: string, cursor: number) => void
  cursorOffset: number
}

export type UseVoiceIntegrationArgs = {
  setInputValueRaw: SetStringState
  inputValueRef: RefLike<string>
  insertTextRef: RefLike<InsertTextHandle | null>
}

export type InterimRange = { start: number; end: number }

export type StripOpts = {
  // Qué carácter recortar (la tecla de sostenido configurada). Por
  // defecto, espacio.
  char?: string
  // Captura el ancla de prefijo/sufijo de voz en la posición recortada.
  anchor?: boolean
  // Cuenta mínima final a dejar — evita recortar los caracteres de
  // warmup intencionales al limpiar fugas defensivamente.
  floor?: number
}

export type UseVoiceIntegrationResult = {
  // Devuelve el número de caracteres finales restantes tras recortar.
  stripTrailing: (maxStrip: number, opts?: StripOpts) => number
  // Deshace el espacio de separación y resetea los refs de ancla tras
  // una activación de voz fallida.
  resetAnchor: () => void
  handleKeyEvent: (fallbackMs?: number) => void
  interimRange: InterimRange | null
}

function requireReactAndInkUnavailable(symbol: string): never {
  // `react` y `@anthropic/ink`/`@thyrox/repl` no existen en este árbol
  // (medido: ver docstring del módulo). Se resuelve con require()
  // diferido — es la ÚNICA excepción admitida a "sin lazy imports": el
  // especificador no resuelve hoy, no una preferencia de estilo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react')
  throw new Error(
    `${symbol}() no está portado: es capa de integración React+ink ` +
      '(useNotifications, useIsModalOverlayActive, useInput, ' +
      'KeyboardEvent, useOptionalKeybindingContext), ninguno presente ' +
      'en este árbol. Ver el docstring de useVoiceIntegration.tsx.',
  )
}

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function useVoiceIntegration(
  _args: UseVoiceIntegrationArgs,
): UseVoiceIntegrationResult {
  return requireReactAndInkUnavailable('useVoiceIntegration')
}

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function useVoiceKeybindingHandler(_args: {
  voiceHandleKeyEvent: (fallbackMs?: number) => void
  stripTrailing: (maxStrip: number, opts?: StripOpts) => number
  resetAnchor: () => void
  isActive: boolean
}): { handleKeyDown: (e: InkKeyboardEvent) => void } {
  return requireReactAndInkUnavailable('useVoiceKeybindingHandler')
}

/**
 * NO PORTADO — ver docstring del módulo. En la fuente es un componente
 * JSX shim; aquí se declara como función que dispara el error de
 * bloqueo si se invoca.
 */
export function VoiceKeybindingHandler(_props: {
  voiceHandleKeyEvent: (fallbackMs?: number) => void
  stripTrailing: (maxStrip: number, opts?: StripOpts) => number
  resetAnchor: () => void
  isActive: boolean
}): null {
  return requireReactAndInkUnavailable('VoiceKeybindingHandler')
}
