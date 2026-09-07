/**
 * Porte de `ccnmt: packages/provider/src/providerHostSetup.ts` — sus 3
 * exportaciones (`installProviderRuntimeBindings`,
 * `resetProviderRuntimeBindingsForTests`, el tipo `ProviderHostBindings`).
 *
 * En la fuente este archivo es un proxy delgado hacia
 * `ccnmt: packages/provider/src/host.ts`. CORREGIDO en este pase: `host.ts`
 * (con su `ProviderHostBindings` real, `installProviderHostBindings` y
 * `getProviderHostBindings`) YA se portó — este archivo dejó de fusionar
 * una copia propia de esos tres símbolos (y de `contracts.ts`/`types.ts`
 * vía `internal/providerTypes.ts`) y delega a `./host.ts`, que es su
 * hogar real. `installProviderHostBindings`/`getProviderHostBindings` se
 * re-exportan aquí con esos mismos nombres porque `claudeLegacy.ts` ya
 * los consume de `providerHostSetup.ts` (no de `host.ts` directo) —
 * cambiar ese import no es necesario para cerrar la duplicación.
 *
 * `internal/providerTypes.ts` sigue vivo: lo consumen también `claude.ts`,
 * `claudeLegacyRuntime.ts` e `internal/legacyRuntimeSupport.ts`, fuera del
 * alcance de este archivo — re-apuntar esos tres a `contracts.ts`/`types.ts`
 * es un refactor aparte, declarado como pendiente en el reporte final de
 * este pase, no silenciado.
 */

import { getProviderHostBindings, installProviderHostBindings } from './host.js'
import type { ProviderHostBindings } from './host.js'

export { getProviderHostBindings, installProviderHostBindings }
export type { ProviderHostBindings }

let providerHostBindingsInstalled = false

export function installProviderRuntimeBindings(bindings: ProviderHostBindings): void {
  if (providerHostBindingsInstalled) {
    return
  }
  installProviderHostBindings(bindings)
  providerHostBindingsInstalled = true
}

export function resetProviderRuntimeBindingsForTests(): void {
  providerHostBindingsInstalled = false
}
