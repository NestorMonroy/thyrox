/**
 * Los dos hooks de estado de la aplicación, resueltos en la llamada.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/hooks/appState.ts` (23
 * líneas). Ese árbol declara `"license": "UNLICENSED"`: se reimplementa el
 * contrato, no se copia el cuerpo.
 *
 * Es una indirección a propósito, y su valor está justamente en no ser un
 * import estático: el código de interfaz de una herramienta no debe acoplarse
 * al módulo de estado de la aplicación en tiempo de carga. Con `require` en el
 * sitio de la llamada, un consumidor que nunca invoque estos hooks tampoco
 * arrastra el estado.
 *
 * `require` sobre un subpath de paquete hermano es el mecanismo ya asentado en
 * este árbol —42 módulos lo usan, entre ellos `provider/src/costTracker.ts`—,
 * así que la forma se conserva y sólo cambia el alcance del paquete.
 */

type Store<S> = {
  getState: () => S
  setState: (updater: (previous: S) => S) => void
  subscribe: (listener: () => void) => () => void
}

type SetAppState = (updater: (previous: unknown) => unknown) => void

const APP_STATE_MODULE = '@thyrox/app-host/state/AppState.js'

export function useAppStateStore(): Store<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const host = require(APP_STATE_MODULE) as {
    useAppStateStore: () => Store<unknown>
  }
  return host.useAppStateStore()
}

export function useSetAppState(): SetAppState {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const host = require(APP_STATE_MODULE) as {
    useSetAppState: () => SetAppState
  }
  return host.useSetAppState()
}
