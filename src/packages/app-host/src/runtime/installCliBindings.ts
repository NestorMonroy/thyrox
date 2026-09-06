/**
 * Adaptación de @claude-code-how-works/app-host: src/runtime/installCliBindings.ts.
 * Capa 1 tramo B — porte FIEL de la lógica; importaciones DECLARADAS
 * COLGANTES, sin traducir y sin stub.
 *
 * La fuente instala tres bindings del paquete `cli`
 * (`createHeadlessStore`, `runHeadless`, `getStructuredIO`) leyendo su
 * implementación real de dos paquetes hermanos:
 *
 *   - `@claude-code-how-works/cli` (`installCliHostBindings`,
 *     `HeadlessStoreParams`), `/cli/print.js` (`runHeadless`) y
 *     `/cli/structuredIOHelper.js` (`getStructuredIO`) — el paquete `cli`
 *     NO existe en este árbol.
 *   - `@claude-code-how-works/agent/sessionStores.js`
 *     (`createHeadlessSessionStore`) — `@thyrox/agent` SÍ existe, pero su
 *     `package.json` (`exports`) no expone ningún `sessionStores.js`; el
 *     módulo tampoco está portado en `src/packages/agent/`. Mismo
 *     criterio que `agent/internal/macroFallback.ts` fija para
 *     `@claude-code-how-works/config/env`: la ausencia del PAQUETE no es
 *     lo que se declara — es la ausencia del MÓDULO/EXPORT concreto.
 *
 * Ninguno de los cuatro símbolos se stubea localmente: el import queda
 * literal, pinneado contra la fuente. La función y su guard
 * (`cliBindingsInstalled`) se portan verbatim porque son la única parte
 * de este archivo con lógica propia — el resto es wiring puro hacia
 * bindings ausentes.
 *
 * El auto-run `installCliBindings()` al final del módulo (igual que la
 * fuente) es lo que hace este archivo NO TESTEABLE: como side-effect de
 * módulo llama de inmediato a `installCliHostBindings`, que no existe.
 * Aun sin ese auto-run, los cuatro imports estáticos ya agotan la
 * resolución de módulos antes de que corra cualquier código.
 *
 * Sin test: no hay forma de importar este archivo sin que la resolución
 * de módulos falle en la primera línea de import de valor. Mismo estado
 * que `installBridgeBindings.ts`/`installMcpRuntimeBindings.ts`
 * (hermanos en este directorio) y que los tres binding-installers ya
 * portados sin suite (`installCommandRuntimeBindings.ts`,
 * `installProviderBindings.ts`, `installToolRegistryBindings.ts`).
 */
import {
  installCliHostBindings,
  type HeadlessStoreParams,
} from '@claude-code-how-works/cli'
import { runHeadless } from '@claude-code-how-works/cli/print.js'
import { getStructuredIO } from '@claude-code-how-works/cli/structuredIOHelper.js'
import { createHeadlessSessionStore } from '@claude-code-how-works/agent/sessionStores.js'

let cliBindingsInstalled = false

export function installCliBindings(): void {
  if (cliBindingsInstalled) return

  installCliHostBindings({
    createHeadlessStore: params =>
      createHeadlessSessionStore(params as HeadlessStoreParams),
    runHeadless: (...args) =>
      runHeadless(...(args as Parameters<typeof runHeadless>)),
    getStructuredIO,
  })

  cliBindingsInstalled = true
}

installCliBindings()
