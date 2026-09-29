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
 * `b8r(() => {_r = void 0})`: en 2.1.283 limpia, en el runner headless
 * (`chunk-ycnq45th.js`), un espejo local del override de modelo de sesión
 * que este árbol no porta todavía (vive en el subsistema SDK headless de
 * `cli`, fuera del alcance de este ítem — ver docstring de arriba). El
 * espejo equivalente que este árbol sí tiene es `mainLoopModelForSession`
 * en el propio `AppState` del store headless: el callback lo limpia ahí.
 * Exportada aparte para medirla sin pasar por `installCliHostBindings`.
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
