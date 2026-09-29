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
import { createHeadlessSessionStore, type HeadlessStoreParams } from '@thyrox/agent/sessionStores.js'
import { onChangeAppState } from '@thyrox/repl/onChangeAppState.js'
import type { AppState } from './appStateCompatShim.js'

let cliBindingsInstalled = false

export function installCliBindings(): void {
  if (cliBindingsInstalled) return

  installCliHostBindings({
    createHeadlessStore: params => {
      const store = createHeadlessSessionStore(params as HeadlessStoreParams, onChangeAppState)
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
