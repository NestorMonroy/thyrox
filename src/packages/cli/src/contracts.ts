export type HeadlessStateStore<TState = unknown> = {
  getState: () => TState
  setState: (...args: unknown[]) => unknown
}

export type StructuredIOOptions = {
  sdkUrl: string | undefined
  replayUserMessages?: boolean
}

export type CliHostBindings = {
  logDebug?: (message: string, metadata?: unknown) => void
  createHeadlessStore?: (params: unknown) => HeadlessStateStore
  runHeadless?: (...args: unknown[]) => Promise<void>
  getStructuredIO?: (
    inputPrompt: string | AsyncIterable<string>,
    options: StructuredIOOptions,
  ) => unknown
}

/**
 * Structural stand-in for app-level AppState used by cli handlers that
 * need to type state interactions without importing src/state/AppState
 * (V7 §7.2).
 *
 * DIVERGENCIA de modo estricto, declarada. La fuente declara este tipo con
 * una firma de índice desnuda y nada más, y le basta porque compila con
 * `"strict": false` (`ccnmt: tsconfig.json`): sin `strictFunctionTypes`, las
 * posiciones de parámetro son bivariantes y un `setAppState` tipado sobre
 * este alias es intercambiable con uno tipado sobre el `SettingsChangeTarget`
 * que `@thyrox/config/applySettingsChange` declara. Nosotros compilamos con
 * `"strict": true`, así que esa asignación se comprueba en una sola dirección
 * y el alias desnudo la falla — le faltan las dos propiedades REQUERIDAS.
 *
 * Las tres claves se copian de `SettingsChangeTarget`, que es el contrato que
 * las exige. Medido por conducta, no por lectura de las reglas
 * (`.claude/workbench/appstatelike-modo-estricto-*`): con la firma de índice
 * sola la asignación falla; con las dos requeridas pasa; y un tipo SIN firma
 * de índice también pasa, porque TypeScript se la concede implícita a un
 * alias de objeto — o sea que lo que bloqueaba no era la firma de índice.
 */
export type AppStateLike = {
  toolPermissionContext: unknown
  settings: { effortLevel?: unknown }
  effortValue?: unknown
  [key: string]: unknown
}
