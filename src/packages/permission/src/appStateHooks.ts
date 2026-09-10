/**
 * El puente al estado de la aplicación, sin arrastrarla.
 *
 * Procedencia: `ccnmt: packages/permission/src/appStateHooks.ts` (36
 * líneas, 3 funciones + 1 tipo). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se reimplementa y no se copia. Porte
 * COMPLETO.
 *
 * POR QUÉ EL `require` VA DENTRO Y NO ARRIBA. El módulo de estado del
 * anfitrión es un componente de React. Si se importara al tope, cualquier
 * consumidor de este paquete —incluida la ruta de impresión, que no dibuja
 * nada— arrastraría React sólo por existir. Con el require perezoso, el
 * coste lo paga quien llama, que es quien ya está dentro de un render.
 *
 * Y aquí ese detalle tiene una consecuencia MEDIDA, no teórica: `react` no
 * resuelve desde este paquete —«Cannot find package 'react'»— pero
 * `@thyrox/app-host/state/AppState.js` sí, porque app-host lo tiene
 * enlazado. El shim funciona precisamente por ser perezoso; su hermano
 * `classifierApprovalsHook.ts`, que importa React directo, no se puede
 * portar todavía por eso mismo.
 *
 * DIVERGENCIA DECLARADA: ninguna. Los argumentos viajan verbatim.
 */

/** El estado de la aplicación es opaco aquí: este paquete no lo modela. */
export type AppState = unknown

type ModuloDeEstado = {
  useAppState: <U>(selector: (state: unknown) => U) => U
  useSetAppState: () => (updater: (prev: unknown) => unknown) => void
  useAppStateStore: () => {
    getState: () => unknown
    setState: (updater: (prev: unknown) => unknown) => void
    subscribe: (listener: () => void) => () => void
  }
}

function hostStateModule(): ModuloDeEstado {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/state/AppState.js') as ModuloDeEstado
}

export function useAppState<T>(selector: (state: unknown) => T): T {
  return hostStateModule().useAppState<T>(selector)
}

export function useSetAppState(): (updater: (prev: unknown) => unknown) => void {
  return hostStateModule().useSetAppState()
}

export function useAppStateStore(): {
  getState: () => unknown
  setState: (updater: (prev: unknown) => unknown) => void
  subscribe: (listener: () => void) => () => void
} {
  return hostStateModule().useAppStateStore()
}
