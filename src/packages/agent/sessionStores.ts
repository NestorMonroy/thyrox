/**
 * Puerto de `ccnmt: packages/agent/sessionStores.ts` (111 líneas). Los seis
 * símbolos exportados (`MCPServerConnection`, `McpCommand`,
 * `HeadlessStoreParams`, `InteractiveSessionStore`, `HeadlessSessionStore`,
 * `createInteractiveSessionStore`, `createHeadlessSessionStore`,
 * `projectInteractiveHostSessionState` — ocho, contando los tipos) se
 * portan VERBATIM en firma y comportamiento; sólo cambian las diez rutas de
 * import, cada una medida contra este árbol.
 *
 * Ya consumido (deferred `require`) por
 * `app-host: src/runtime/installCliBindings.ts` — antes de este porte,
 * `@thyrox/agent/sessionStores.js` no resolvía ningún archivo (su propio
 * docstring lo declaraba: *"el módulo tampoco está portado"*); ahora
 * resuelve vía el `./*.js` wildcard de `agent/package.json`.
 *
 * DIVERGENCIAS DE ALCANCE, declaradas — de las diez rutas fuente:
 *
 *   - `Tool` / `ToolPermissionContext`
 *     (`@claude-code-how-works/tool-registry/runtime`) — tipos, y el
 *     paquete `tool-registry` está AUSENTE POR COMPLETO en este árbol
 *     (mismo hallazgo que `coordinatorMode.ts` documenta). Se deja SIN
 *     traducir: un `import type` se borra en runtime, así que la
 *     resolución nunca se intenta — sólo typecheck queda pendiente.
 *   - `AppState` / `getDefaultAppState`
 *     (`@claude-code-how-works/app-host/state/AppStateCompat.js`) —
 *     `@thyrox/app-host` SÍ existe y SÍ tiene el símbolo, pero en otra
 *     ruta: `runtime/appStateCompatShim.ts` (medido:
 *     `grep -n "^export" src/packages/app-host/src/runtime/appStateCompatShim.ts`
 *     → `AppState`, `getDefaultAppState`). Se apunta ahí directamente —
 *     mismos símbolos, mismo comportamiento, ruta real en vez de la
 *     inexistente.
 *   - `projectHostSessionState` / `HostSessionState`
 *     (`.../app-host/state/hostSessionState.js`) — SÍ resuelve tal cual
 *     (medido: `Bun.resolveSync` OK).
 *   - `onChangeAppState` (`@claude-code-how-works/repl/onChangeAppState.js`)
 *     — el paquete `repl` NO existe como miembro del workspace (medido:
 *     ausente de `src/packages/package.json`). Se deja SIN traducir y se
 *     difiere con `require()`.
 *   - `createStore` / `Store` (`.../app-host/state/store.js`) —
 *     `@thyrox/app-host` existe pero no expone `state/store.ts` (medido: 0
 *     hits de `export function createStore` en `app-host/src/`). El tipo
 *     `Store<T>` se re-declara localmente como `unknown` (erosionado, sólo
 *     para que `InteractiveSessionStore`/`HeadlessSessionStore` typechequen
 *     con la misma forma pública); `createStore`, el valor, se difiere con
 *     `require()`.
 *   - `parseEffortValue` / `toPersistableEffort` (`./effort.js`, hermano
 *     LOCAL en este mismo paquete) — SÍ resuelve (medido:
 *     `Bun.resolveSync('./effort.js', …)` → `agent/effort.ts`).
 *   - `isFastModeEnabled` / `getFastModeUnavailableReason` /
 *     `isFastModeSupportedByModel` (`@claude-code-how-works/provider/fastMode.js`)
 *     — `@thyrox/provider` existe pero no expone `fastMode.ts` (medido: 0
 *     hits en todo el paquete). Se difieren con `require()`.
 *   - `getInitialSettings` (`@claude-code-how-works/config/settings`) —
 *     `@thyrox/config` existe pero no expone `settings` con esta forma
 *     (medido: `Bun.resolveSync('@thyrox/config/settings', …)` falla — sólo
 *     existe `./load` → `settings/load.ts`, sin `getInitialSettings`). Se
 *     difiere con `require()`.
 *   - `feature` (`bun:bundle`) — mismo estado que en `coordinatorMode.ts`:
 *     resuelve el especificador, `feature(...)` es no-op/`undefined` fuera
 *     del bundler de ccnmt.
 *
 * Con TODOS los símbolos ausentes deferred, `createInteractiveSessionStore`
 * y `createHeadlessSessionStore` siguen siendo IMPORTABLES; sólo fallan si
 * alguien las invoca de verdad (y entonces fallan en el paso concreto que
 * les falta, no en el import).
 */
import { feature } from 'bun:bundle'
import {
  type AppState,
  getDefaultAppState,
} from '@thyrox/app-host/runtime/appStateCompatShim.js'
import {
  projectHostSessionState,
  type HostSessionState,
} from '@thyrox/app-host/state/hostSessionState.js'
import { parseEffortValue, toPersistableEffort } from './effort.js'

// ---- Tipos estructurales mínimos — ver docstring del módulo. ----
// `Tool`/`ToolPermissionContext`: el paquete tool-registry está ausente por
// completo; `import type` se borra en runtime, así que se deja sin traducir.
// biome-ignore-all assist/source/organizeImports: import type sin resolver a propósito (ver docstring)
import type { Tool, ToolPermissionContext } from '@claude-code-how-works/tool-registry/runtime'

/**
 * V7 §7.2 SDK boundary placeholder types — narrowed inputs that
 * `createHeadlessSessionStore` consumes when initialising store state
 * for headless / -p mode. cli/headless.ts re-exports these names so
 * existing SDK consumers keep working.
 *
 * @public
 */
export type MCPServerConnection = unknown
/** @public */
export type McpCommand = unknown

/**
 * Initial-state inputs for `createHeadlessSessionStore`. Lives in agent
 * because the consumer (`buildHeadlessCompatState`) does — moves agent
 * out of cli's dep graph (V7 §3.2 / §8 coupling rule).
 */
export type HeadlessStoreParams = {
  mcpClients: MCPServerConnection[]
  mcpCommands: McpCommand[]
  mcpTools: Tool[]
  toolPermissionContext: ToolPermissionContext
  effort: string | undefined
  effectiveModel: string | null
  advisorModel?: string
  kairosEnabled?: boolean
}

// `Store<T>`: `@thyrox/app-host` no expone `state/store.ts` — ver
// docstring. Forma erosionada mínima para que los dos alias de abajo
// typechequen con la misma forma pública que la fuente.
// biome-ignore-all assist/source/organizeImports: tipo local sustituto (ver docstring)
type Store<T> = {
  getState: () => T
  setState: (next: T) => void
  subscribe: (listener: (state: T) => void) => () => void
}

export type InteractiveSessionStore = Store<AppState>
export type HeadlessSessionStore = Store<AppState>

export function createInteractiveSessionStore(
  initialState?: AppState,
): InteractiveSessionStore {
  // `createStore` y `onChangeAppState`: @thyrox/app-host no expone
  // `state/store.ts` y @thyrox/repl no existe — ver docstring del módulo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createStore } = require('@thyrox/app-host/state/store.js') as {
    createStore: <T>(initial: T, onChange: (state: T) => void) => Store<T>
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { onChangeAppState } = require('@claude-code-how-works/repl/onChangeAppState.js') as {
    onChangeAppState: (state: AppState) => void
  }
  return createStore<AppState>(
    initialState ?? getDefaultAppState(),
    onChangeAppState,
  )
}

function buildHeadlessCompatState(
  params: HeadlessStoreParams,
): AppState {
  const defaultState = getDefaultAppState()
  const hostState = projectHostSessionState(defaultState)
  // `getInitialSettings`: @thyrox/config no expone `settings` con esta
  // forma — ver docstring del módulo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getInitialSettings } = require('@thyrox/config/settings') as {
    getInitialSettings: () => {
      effortLevel?: string
      fastModePerSessionOptIn?: boolean
      fastMode?: boolean
    }
  }
  const initialSettings = getInitialSettings()
  const initialEffortValue =
    parseEffortValue(params.effort) ??
    toPersistableEffort(initialSettings.effortLevel)
  // `isFastModeEnabled`/`getFastModeUnavailableReason`/
  // `isFastModeSupportedByModel`: @thyrox/provider no expone `fastMode.ts`
  // — ver docstring del módulo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fastModeMod = require('@thyrox/provider/fastMode.js') as {
    isFastModeEnabled: () => boolean
    getFastModeUnavailableReason: () => string | null
    isFastModeSupportedByModel: (model: string | null) => boolean
  }
  const initialFastMode =
    fastModeMod.isFastModeEnabled() &&
    fastModeMod.getFastModeUnavailableReason() === null &&
    fastModeMod.isFastModeSupportedByModel(params.effectiveModel) &&
    !initialSettings.fastModePerSessionOptIn &&
    initialSettings.fastMode === true

  // Cross-package types (MCPServerConnection / McpCommand / Tool /
  // ToolPermissionContext) are SDK boundary placeholders (V7 §7.2) —
  // each is a structural superset of the local AppState slot shape. The
  // construction is structurally sound; the named types are documentation
  // for SDK consumers, not internal type assertions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    ...hostState,
    ...defaultState,
    mcp: {
      ...defaultState.mcp,
      clients: params.mcpClients,
      commands: params.mcpCommands,
      tools: params.mcpTools,
    },
    toolPermissionContext: params.toolPermissionContext,
    effortValue: initialEffortValue,
    ...(fastModeMod.isFastModeEnabled() ? { fastMode: initialFastMode } : {}),
    ...(params.advisorModel ? { advisorModel: params.advisorModel } : {}),
    ...(feature('KAIROS') && params.kairosEnabled !== undefined
      ? { kairosEnabled: params.kairosEnabled }
      : {}),
  } as AppState
}

export function createHeadlessSessionStore(
  params: HeadlessStoreParams,
): HeadlessSessionStore {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createStore } = require('@thyrox/app-host/state/store.js') as {
    createStore: <T>(initial: T, onChange: (state: T) => void) => Store<T>
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { onChangeAppState } = require('@claude-code-how-works/repl/onChangeAppState.js') as {
    onChangeAppState: (state: AppState) => void
  }
  return createStore<AppState>(buildHeadlessCompatState(params), onChangeAppState)
}

export function projectInteractiveHostSessionState(
  initialState?: AppState,
): HostSessionState {
  return projectHostSessionState(initialState ?? getDefaultAppState())
}
