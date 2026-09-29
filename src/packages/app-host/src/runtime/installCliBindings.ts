/**
 * Adaptación de @claude-code-how-works/app-host: src/runtime/installCliBindings.ts.
 *
 * Instala tres bindings del host CLI (`createHeadlessStore`, `runHeadless`,
 * `getStructuredIO`) leyendo su implementación real de `@thyrox/cli` y de
 * `@thyrox/agent/sessionStores.js` (`createHeadlessSessionStore`,
 * `HeadlessStoreParams`).
 *
 * Cada símbolo de `@thyrox/cli` se importa por su propia ruta
 * (`host.js`, `print.js`, `structuredIOHelper.js`), nunca por el barrel `.`
 * (`cli/src/index.ts`). El barrel reexporta el punto de entrada de
 * `entry/run-cli.js`, que encadena `entry/run-program.js` ->
 * `commands/mitm-commands.js`: importarlo arrastraría el despacho de
 * comandos entero de la CLI y el paquete `@thyrox/mitm` sólo para instalar
 * unos enlaces. `installCliHostBindings` se importa de `./host.js`, el
 * export propio de `cli/src/host.ts`: el mismo patrón que `runtimeHostSetup.js`
 * sigue en `@thyrox/bridge` y `@thyrox/mcp-runtime`.
 *
 * `installCliBindingsImports.test.ts` mide el grafo de módulos en runtime
 * (`require.cache`) tras cargar este archivo: ninguna entrada corresponde a
 * `cli/src/index.ts` ni a `@thyrox/mitm`.
 */
import { installCliHostBindings } from '@thyrox/cli/host.js'
import { runHeadless } from '@thyrox/cli/print.js'
import { getStructuredIO } from '@thyrox/cli/structuredIOHelper.js'
import { createHeadlessSessionStore, type HeadlessSessionStore, type HeadlessStoreParams } from '@thyrox/agent/sessionStores.js'
import { onChangeAppState } from '@thyrox/repl/onChangeAppState.js'
import { onRefusalFallbackRestored } from '../state/refusalFallbackRestore.js'
import type { AppState } from './appStateCompatShim.js'

/**
 * `b8r` YA NO es sólo esto: el `b8r(() => {_r = void 0})` literal de 2.1.283
 * (`chunk-ycnq45th.js`) está portado en `run-streaming.ts`
 * (`onRefusalFallbackRestored` limpia `activeUserSpecifiedModel`, el espejo
 * real de `_r`). Esta función es OTRO consumidor de la misma señal, no un
 * sustituto: `subscribeRefusalFallbackReset` sólo está cableado al AppState
 * interactivo (`app-host/runtime/bootstrap.ts`), y el store que
 * `createHeadlessSessionStore` construye para el SDK headless / `-p` mode
 * (`agent/sessionStores.ts`) es un `AppState` propio y separado — nada más
 * limpia su `mainLoopModelForSession` cuando la restauración ocurre. Sigue
 * siendo necesaria mientras ese store exista y nadie la reemplace por
 * `subscribeRefusalFallbackReset` cableado directamente a él. Exportada
 * aparte para medirla sin pasar por `installCliHostBindings`.
 */
export function wireRefusalFallbackRestoreForHeadlessStore(
  store: HeadlessSessionStore,
): () => void {
  return onRefusalFallbackRestored(() => {
    store.setState(prev => ({ ...prev, mainLoopModelForSession: null }))
  })
}

let cliBindingsInstalled = false

export function installCliBindings(): void {
  if (cliBindingsInstalled) return

  installCliHostBindings({
    createHeadlessStore: params => {
      const store = createHeadlessSessionStore(params as HeadlessStoreParams, onChangeAppState)
      wireRefusalFallbackRestoreForHeadlessStore(store)
      return {
        getState: () => store.getState(),
        // Lo que llega es el actualizador de `setAppState`; el store lo aplica.
        setState: (...args: unknown[]) =>
          store.setState(args[0] as (prev: AppState) => AppState),
      }
    },
    runHeadless: (...args) =>
      runHeadless(...(args as Parameters<typeof runHeadless>)) as Promise<void>,
    getStructuredIO,
  })

  cliBindingsInstalled = true
}

installCliBindings()
