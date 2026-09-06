/**
 * Adaptación de @claude-code-how-works/app-host: src/packageHostSetup.ts.
 * Capa 1 tramo B — porte FIEL de la lógica; importaciones DECLARADAS
 * COLGANTES, sin traducir y sin stub.
 *
 * `index.ts` (hermano en este mismo paquete, ya portado) ya adelantaba
 * esta ausencia: *"La fuente reexporta también 5 símbolos de
 * ./packageHostSetup.js […] Ese archivo cita @claude-code-how-works/agent,
 * /config, /memory y /permission (4 citas medidas), así que NO es capa 0
 * y queda fuera de este pase."* Este archivo ES ese pase — capa 1, no
 * capa 0 — y las cuatro citas siguen sin resolver:
 *
 *   - `@claude-code-how-works/agent` (`installAgentHostBindings`) —
 *     `@thyrox/agent` SÍ existe y el símbolo SÍ está portado
 *     (`agent/host.ts:167`), pero **no** está en el `exports` map del
 *     `package.json` de `@thyrox/agent` (sólo expone `.`, `./types`,
 *     `./schema`, `./registry`, `./emit/*`, `./models`, `./cost/*`,
 *     `./taggedId`, etc. — ningún `./host`). Es una ausencia de EXPORT,
 *     no de puerto: el símbolo existe, el paquete no lo deja entrar.
 *   - `@claude-code-how-works/config` (`installConfigHostBindings`) —
 *     `@thyrox/config` existe, pero su `index.ts` sólo exporta el
 *     subárbol `settings/*` (`SETTING_SOURCES`, `SettingsSchema`, …);
 *     `installConfigHostBindings` no existe en ningún archivo del
 *     paquete.
 *   - `@claude-code-how-works/memory` (`installMemoryHostBindings`) —
 *     el paquete `memory` no existe en absoluto.
 *   - `@claude-code-how-works/permission` (`installPermissionHostBindings`)
 *     — el paquete `permission` no existe en absoluto.
 *
 * Los cuatro imports se conservan literales — mismo criterio que
 * `runtime/installPluginBindings.ts` (hermano en este paquete) y
 * `agent/internal/macroFallback.ts`.
 *
 * Lo que SÍ es de este paquete y SÍ está portado —`installHostBindings`,
 * `installInteractiveSessionHostBindings` de `./host.js`, y los tipos de
 * `./contracts.js`— se traduce a ruta relativa, tal como la fuente ya lo
 * hace.
 *
 * `installCorePackageHostBindings`, `installPackageHostBindings` y
 * `resetPackageHostBindingsForTests` se portan verbatim: son la única
 * lógica propia del archivo (el guard `packageHostBindingsInstalled`, el
 * orden de instalación, el `now` por defecto). El comentario de la
 * fuente sobre por qué NO se llama a `installCliHostBindings` aquí
 * (`installCliBindings.ts`, hermano en `runtime/`, ya lo instala como
 * side-effect al importarse) se conserva tal cual — es documentación de
 * un bug ya corregido en la fuente, no una decisión de este porte.
 *
 * Sin test: los cuatro imports de valor agotan la resolución de módulos
 * antes de correr cualquier código — incluida `resetPackageHostBindingsForTests`,
 * que aunque no toca ninguno de los cuatro, vive en el mismo módulo y no
 * puede importarse sin que el módulo entero cargue primero.
 */
import { installAgentHostBindings } from '@claude-code-how-works/agent'
// los bindings de cli los conecta packages/app-host/src/runtime/installCliBindings.ts
// (auto-run al importarse). Importar installCliHostBindings aquí cerraba un
// SCC de 7 archivos entre app-host ↔ cli; la llamada explícita también era
// dañina — sobreescribía destructivamente cliHostBindings con sólo
// `{ logDebug }`, perdiendo los bindings reales (createHeadlessStore,
// runHeadless, getStructuredIO) que installCliBindings.ts instala cuando
// éste corría segundo.
import { installConfigHostBindings } from '@claude-code-how-works/config'
import { installMemoryHostBindings } from '@claude-code-how-works/memory'
import { installPermissionHostBindings } from '@claude-code-how-works/permission'
import {
  installHostBindings,
  installInteractiveSessionHostBindings,
} from './host.js'
import type { HostSessionStore, RuntimeHandles } from './contracts.js'

let packageHostBindingsInstalled = false

export type PackageHostBindingInstallers = {
  installProviderBindings?: () => void
  installToolRegistryBindings?: () => void
  installCommandRuntimeBindings?: () => void
  installMcpRuntimeBindings?: () => void
  installCliBindings?: () => void
}

export type PackageHostCoreResolvers = {
  createInteractiveStore: (initialState?: unknown) => HostSessionStore
  getConfigHomeDir: () => string
  getGlobalClaudeFile?: () => string
  getProjectRoot: () => string | undefined
  logDebug: (message: string, metadata?: unknown) => void
  now?: () => number
  syncRuntimeHandlesFromAppState: (
    handles: RuntimeHandles,
    state: unknown,
  ) => void
  // V7 §8.6 — puente de mcp-runtime hacia config para agregar errores.
  getMcpErrorsByScope?: (scope: string) => Array<{
    file?: string
    path: string
    message: string
    source?: string
  }>
  // V7 — bindings extra que se reenvían a los paquetes de subsistema.
  // TODOS los require('src/...') se quedan en
  // src/services/packageHostSetup.ts; packages/app-host sólo reenvía los
  // valores ya resueltos.
  extraConfigBindings?: Record<string, unknown>
  extraPermissionBindings?: Record<string, unknown>
  extraMemoryBindings?: Record<string, unknown>
  extraAgentBindings?: Record<string, unknown>
}

export function installCorePackageHostBindings(
  resolvers: PackageHostCoreResolvers,
): void {
  if (packageHostBindingsInstalled) {
    return
  }

  const now = resolvers.now ?? (() => Date.now())

  installConfigHostBindings({
    getConfigHomeDir: resolvers.getConfigHomeDir,
    getGlobalClaudeFile: resolvers.getGlobalClaudeFile,
    getProjectRoot: resolvers.getProjectRoot,
    logDebug: resolvers.logDebug,
    getMcpErrorsByScope: resolvers.getMcpErrorsByScope,
    ...resolvers.extraConfigBindings,
  } as any)

  installPermissionHostBindings({
    now,
    logDebug: resolvers.logDebug,
    ...resolvers.extraPermissionBindings,
  } as any)

  installMemoryHostBindings({
    now,
    logDebug: resolvers.logDebug,
    ...resolvers.extraMemoryBindings,
  } as any)

  installAgentHostBindings({
    now,
    logDebug: resolvers.logDebug,
    getClaudeConfigHomeDir: resolvers.getConfigHomeDir,
    ...resolvers.extraAgentBindings,
  } as any)

  // installCliHostBindings: removido — ver comentario al inicio del archivo.

  installInteractiveSessionHostBindings({
    createInteractiveStore: resolvers.createInteractiveStore,
    syncRuntimeHandles: resolvers.syncRuntimeHandlesFromAppState,
  })

  packageHostBindingsInstalled = true
}

export function installPackageHostBindings(
  resolvers: PackageHostCoreResolvers,
  installers: PackageHostBindingInstallers = {},
): void {
  installHostBindings({
    installCorePackageBindings: () => installCorePackageHostBindings(resolvers),
    installProviderBindings: installers.installProviderBindings,
    installToolRegistryBindings: installers.installToolRegistryBindings,
    installCommandRuntimeBindings: installers.installCommandRuntimeBindings,
    installMcpRuntimeBindings: installers.installMcpRuntimeBindings,
    installCliBindings:
      installers.installCliBindings ??
      (() => installCorePackageHostBindings(resolvers)),
  })
}

export function resetPackageHostBindingsForTests(): void {
  packageHostBindingsInstalled = false
}
