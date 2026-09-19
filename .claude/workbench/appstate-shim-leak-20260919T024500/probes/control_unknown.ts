// Control POSITIVO del sub-patron D, en dos mitades sobre el MISMO consumidor.
// Mide el mecanismo — un shim `unknown` no restringe, el tipo real si — sin
// depender de la resolucion del workspace, que en una invocacion suelta de tsc
// no esta disponible (TS2307 medido antes de reescribir este control).
//
// Mitad A: la forma que HOY tiene agent/types/hooks.ts:19.
type AppStateShim = unknown
type ContextShim = { getAppState: () => AppStateShim }
const a: ReturnType<ContextShim['getAppState']> = 5 // compila: unknown acepta todo

// Mitad B: la forma que la fuente ORIGINAL (el leak) importa de state/AppState.
type AppStateReal = { mainLoopModel: string | null }
type ContextReal = { getAppState: () => AppStateReal }
// @ts-expect-error — con el tipo real, el numero NO es asignable. Si esta
// linea dejara de dar error, el control habria dejado de discriminar.
const b: ReturnType<ContextReal['getAppState']> = 5

export { a, b }
