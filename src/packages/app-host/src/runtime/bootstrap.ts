/**
 * Puerto de `ccnmt: packages/app-host/src/runtime/bootstrap.ts` (~90
 * líneas fuente). El adaptador de arranque que cablea los bindings del
 * host al arrancar una sesión — el equivalente de este paquete a
 * `installRuntimeSkeletonBindings()`.
 *
 * ESTADO MEDIDO: este archivo, igual que su hermano `../packageHostSetup.ts`
 * (que YA declara en su propio docstring "capa 1, no capa 0… las cuatro
 * citas siguen sin resolver"), NO CARGA hoy:
 * `bun -e "import('./bootstrap.ts')"` falla con
 * `Cannot find module '@thyrox/agent'` — el mismo fallo de
 * `packageHostSetup.ts`, propagado por el `import { installPackageHostBindings }
 * from '../packageHostSetup.js'` de abajo. No es un gap que este pase
 * introduzca; es el mismo que ya estaba documentado, un nivel más arriba
 * en la cadena de imports. Se porta igual, fiel a la fuente, para que esté
 * listo en cuanto `packageHostSetup.ts` resuelva sus cuatro citas.
 *
 * Además de ESE gap heredado, este archivo tiene 8 símbolos propios que no
 * resuelven hoy — a diferencia del gap heredado (import estático,
 * documentado arriba, se deja igual que la fuente), estos 8 se difieren
 * con `require()` para que, el día que `packageHostSetup.ts` cargue, este
 * archivo no añada NINGÚN gap nuevo de su propia cosecha más que los ya
 * declarados aquí:
 *
 * - `@claude-code-how-works/config/env/utils` → `getClaudeConfigHomeDir`.
 *   `@thyrox/config/env/utils.ts` sólo porta `isEnvTruthy`/`readEnv`/
 *   `getAllEnv` (3 de 17 símbolos de la fuente) — medido:
 *   `grep -c "^export function" src/packages/config/env/utils.ts` → 3.
 * - `@claude-code-how-works/config/env/paths` → `getGlobalClaudeFile`.
 *   `@thyrox/config` no tiene ningún `env/paths.ts`.
 * - `@claude-code-how-works/storage/git` → `findCanonicalGitRoot`.
 *   `@thyrox/storage/src/git.ts` sólo porta `normalizeGitRemoteUrl` (1 de
 *   ~29 símbolos de la fuente).
 * - `@claude-code-how-works/config/hash` → `djb2Hash`. No existe
 *   `config/hash.ts` en este árbol. Se defiere incluso en el efecto de
 *   módulo `setDjb2HashFn(djb2Hash)` — inevitable: la fuente lo llama a
 *   nivel de módulo, sin defer, y `djb2Hash` no resuelve; envolverlo en un
 *   lambda (`setDjb2HashFn(s => requireDjb2Hash()(s))`) preserva el efecto
 *   ("cablear ANTES de que cualquier consumidor toque CACHE_PATHS") sin
 *   forzar la resolución en ese instante.
 * - `@claude-code-how-works/agent/agentHostBindings` →
 *   `buildAgentHostExtraBindings`, `buildMemoryHostExtraBindings`,
 *   `buildPermissionHostExtraBindings`. No existe `agentHostBindings.ts`
 *   en `@thyrox/agent` — no es uno de los 16 de este pase.
 * - `./runtimeHandles.js` (hermano de este mismo paquete) →
 *   `syncRuntimeHandlesFromAppState`. NO existe —medido:
 *   `find src/packages/app-host -iname "runtimeHandles*"` → sólo este
 *   archivo se referencia a sí mismo en comentarios, cero implementación.
 *   Fuera de los 16 (no es state/AppState, state/store, ni runtime/bootstrap).
 */
import { installPackageHostBindings } from '../packageHostSetup.ts'
import { createInteractiveSessionStore } from '@thyrox/agent/sessionStores'
import { getCwd } from '../bootstrap/cwd.ts'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations'
import { setCwdFn, setDjb2HashFn } from '@thyrox/storage/cache-paths'

// Cablea storage/cache-paths a un cwd y hash conscientes del host ANTES de
// que cualquier consumidor toque CACHE_PATHS. Vivía antes en
// `src/utils/cachePaths.ts` (borrado en el follow-up de #136 de la
// fuente); se movió aquí para que el efecto secundario corra en cada
// bootstrap del host.
// eslint-disable-next-line custom-rules/no-top-level-side-effects
setCwdFn(() => getFsImplementation().cwd())

function requireDjb2Hash(): (s: string) => number {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@thyrox/config/hash.js') as { djb2Hash: (s: string) => number })
    .djb2Hash
}
// eslint-disable-next-line custom-rules/no-top-level-side-effects
setDjb2HashFn(s => requireDjb2Hash()(s))

function requireClaudeConfigHomeDir(): () => string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@thyrox/config/env/utils.js') as {
    getClaudeConfigHomeDir: () => string
  }).getClaudeConfigHomeDir
}

function requireGlobalClaudeFile(): () => string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@thyrox/config/env/paths.js') as {
    getGlobalClaudeFile: () => string
  }).getGlobalClaudeFile
}

function requireFindCanonicalGitRoot(): (cwd: string) => string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@thyrox/storage/git.js') as {
    findCanonicalGitRoot: (cwd: string) => string | undefined
  }).findCanonicalGitRoot
}

type AgentHostExtraBindings = {
  buildAgentHostExtraBindings: () => Record<string, unknown>
  buildMemoryHostExtraBindings: () => Record<string, unknown>
  buildPermissionHostExtraBindings: () => Record<string, unknown>
}
function requireAgentHostBindings(): AgentHostExtraBindings | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/agent/agentHostBindings.js') as AgentHostExtraBindings
  } catch {
    return undefined
  }
}

function requireSyncRuntimeHandlesFromAppState(): (
  handles: unknown,
  state: unknown,
) => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('./runtimeHandles.js') as {
    syncRuntimeHandlesFromAppState: (handles: unknown, state: unknown) => void
  }).syncRuntimeHandlesFromAppState
}

let runtimeSkeletonBindingsInstalled = false

export function installRuntimeSkeletonBindings(): void {
  if (runtimeSkeletonBindingsInstalled) {
    return
  }

  const agentExtra = requireAgentHostBindings()

  installPackageHostBindings(
    {
      createInteractiveStore: initialState =>
        createInteractiveSessionStore(initialState as never),
      getConfigHomeDir: () => requireClaudeConfigHomeDir()(),
      getGlobalClaudeFile: () => requireGlobalClaudeFile()(),
      getProjectRoot: () => requireFindCanonicalGitRoot()(getCwd()),
      logDebug: (message, metadata) => logForDebugging(message, metadata as never),
      now: () => Date.now(),
      syncRuntimeHandlesFromAppState: (handles, state) =>
        requireSyncRuntimeHandlesFromAppState()(handles, state),
      extraAgentBindings: agentExtra?.buildAgentHostExtraBindings(),
      extraPermissionBindings: agentExtra?.buildPermissionHostExtraBindings(),
      extraMemoryBindings: agentExtra?.buildMemoryHostExtraBindings(),
    },
    {
      installProviderBindings: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./installProviderBindings.js')
      },
      installToolRegistryBindings: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./installToolRegistryBindings.js')
      },
      installCommandRuntimeBindings: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./installCommandRuntimeBindings.js')
      },
      installMcpRuntimeBindings: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./installMcpRuntimeBindings.js')
      },
      installCliBindings: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./installCliBindings.js')
      },
    },
  )
  // Los bindings de bridge no son parte del contrato de bootstrap de
  // app-host todavía, pero código de cli/headless importa
  // @claude-code-how-works/bridge directo. Se instalan desde el mismo
  // seam de runtime bootstrap.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./installBridgeBindings.js')
  // config/plugin (subárbol Wave-1) — cablea los 50+ setters del
  // subsistema de plugins migrado fuera de src/utils/plugins/ en Round 4.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./installPluginBindings.js')
  // Lector de stdin nativo (stdin-napi) → App de @anthropic/ink. Evita el
  // bug de poll TTY de libuv del standalone de Bun. Fallback no-op seguro
  // cuando no está soportado.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./installNativeStdinReader.js')
  // Logger de eventos local-only — nunca manda nada a la red. OFF por
  // defecto; se habilita con CLAUDE_CODE_LOCAL_TELEMETRY=1 para escribir
  // eventos tengu_bg_* en ~/.claude/debug/<sid>.txt.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isLocalTelemetryEnabled, installLocalEventLogger } =
    require('@thyrox/local-observability/localEventLogger.js') as typeof import('@thyrox/local-observability/localEventLogger.js')
  if (isLocalTelemetryEnabled()) installLocalEventLogger()
  runtimeSkeletonBindingsInstalled = true
}

installRuntimeSkeletonBindings()
