/**
 * Puerto de `ccnmt: packages/storage/src/sessionStart.ts` (232 líneas
 * fuente). CABLEADO PURO en su mayor parte: `processSessionStartHooks` y
 * `processSetupHooks` son orquestación pura sobre OCHO colaboradores
 * hermanos ausentes —
 *
 *   - `executeSessionStartHooks`/`executeSetupHooks`/
 *     `shouldAllowManagedHooksOnly`/`updateWatchPaths` (`agent/hooks.js`,
 *     `agent/hooksConfigSnapshot.js`, `agent/fileChangedWatcher.js`) —
 *     todo el subsistema de ejecución de hooks del paquete `agent`.
 *   - `createAttachmentMessage` (`agent/attachments.js`) — construcción
 *     de mensajes tipados del paquete `agent`.
 *   - `getMainThreadAgentType` (`app-host/bootstrap/state.js`).
 *   - `loadPluginHooks` (`config/plugin/loadPluginHooks.js`) — el
 *     sistema de plugins completo.
 *   - `withDiagnosticsTiming`/`logError` (`local-observability/logging`).
 *   - `HookResultMessage` (`agent/messageShapes`) — RETIRADO de esta lista
 *     en TASK-THYROX-0233: ya se importa del paquete real. Su bloqueo
 *     declarado (el ciclo) era premisa rancia; ver su docstring abajo.
 *
 * Ninguno de los ocho se reimplementa con lógica real — son no-ops o
 * valores por defecto seguros (generador async vacío, función que no
 * hace nada, `undefined`), porque reconstruir el sistema de hooks o el
 * de plugins está muy fuera del alcance de este pase. SIN TEST sobre
 * `processSessionStartHooks`/`processSetupHooks` en sí — su correctitud
 * depende enteramente de esos ocho subsistemas ausentes.
 *
 * DOS piezas SÍ son lógica propia, extraídas y CON test:
 *
 *  - `takeInitialUserMessage` — el canal lateral de un solo valor
 *    (set-and-clear), autocontenido.
 *  - `guidanceForPluginHookError` — la heurística de sugerencia por
 *    substring (network/permisos/config) que la fuente tenía inline en
 *    el catch de `processSessionStartHooks`; se nombra y se exporta para
 *    poder probarla aislada del resto de la orquestación.
 *
 * `isBareMode` SÍ es fiel a `@thyrox/config: env/utils.ts` (que existe de
 * verdad en este monorepo) — no se importa cruzando de paquete (mismo
 * criterio que `sessionActivity.ts`/`sessionState.ts`); se reimplementa
 * fiel a esa fuente real: `CLAUDE_CODE_SIMPLE` truthy o `--bare` en
 * `process.argv`. `isEnvTruthy`, que esa fórmula consume, también se
 * duplica aquí en vez de importarse — el shim de este paquete
 * (`./internal/pendingCrossPackageDeps.ts`) no lo exporta.
 */
import { randomUUID } from 'node:crypto'
import { logForDebugging } from './internal/pendingCrossPackageDeps.js'
import { logError } from './logging.js'

/** Fiel a `@thyrox/config: env/utils.ts::isEnvTruthy` — ver docstring. */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalized = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

// ---------------------------------------------------------------------------
// Tipos mínimos — ver docstring del archivo.
// ---------------------------------------------------------------------------

/**
 * PREMISA RANCIA RETIRADA (TASK-THYROX-0233): esto era
 * `Record<string, unknown>`, un sustituto cuyo bloqueo declarado decia que
 * la direccion storage -> agent «reabriria el ciclo». Medido, las dos
 * mitades de esa premisa son falsas hoy:
 *
 *   - la REFERENCIA hace exactamente este import
 *     (`ccnmt: packages/storage/src/sessionStart.ts:2`), asi que no es un
 *     ciclo que ella evite;
 *   - es un `import type`, que TypeScript borra al emitir: no hay arista
 *     en tiempo de ejecucion que cerrar.
 *
 * Y el manifiesto de este paquete YA declara `@thyrox/agent` (`workspace:*`,
 * enlazado en la raiz izada). El sustituto no ahorraba una dependencia: la
 * tenia declarada y la ignoraba, y su tipo laxo enmascaraba el desajuste que
 * `agent/compaction/sessionMemoryCompact.ts` publicaba como TS2345.
 */
import type { HookResultMessage } from '@thyrox/agent/messageShapes'
export type { HookResultMessage }

type SessionStartHooksOptions = {
  sessionId?: string
  agentType?: string
  model?: string
  forceSyncExecution?: boolean
}

// ---------------------------------------------------------------------------
// Sustitutos — ver docstring del archivo.
// ---------------------------------------------------------------------------

/** Fiel a `@thyrox/config: env/utils.ts::isBareMode` — ver docstring. */
function isBareMode(): boolean {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) ||
    process.argv.includes('--bare')
  )
}

let _shouldAllowManagedHooksOnly: () => boolean = () => false
export function setShouldAllowManagedHooksOnlyFn(fn: () => boolean): void {
  _shouldAllowManagedHooksOnly = fn
}

let _loadPluginHooks: () => Promise<void> = () => Promise.resolve()
export function setLoadPluginHooksFn(fn: () => Promise<void>): void {
  _loadPluginHooks = fn
}

type SessionStartHookResult = {
  message?: HookResultMessage
  additionalContexts?: string[]
  initialUserMessage?: string
  watchPaths?: string[]
}
async function* executeSessionStartHooksStub(
  ..._args: unknown[]
): AsyncGenerator<SessionStartHookResult> {
  // Generador vacío — el subsistema real de hooks (`agent/hooks.js`) está
  // ausente del árbol. Ver docstring del archivo.
}
let _executeSessionStartHooks = executeSessionStartHooksStub
export function setExecuteSessionStartHooksFn(
  fn: typeof executeSessionStartHooksStub,
): void {
  _executeSessionStartHooks = fn
}

type SetupHookResult = {
  message?: HookResultMessage
  additionalContexts?: string[]
}
async function* executeSetupHooksStub(
  ..._args: unknown[]
): AsyncGenerator<SetupHookResult> {}
let _executeSetupHooks = executeSetupHooksStub
export function setExecuteSetupHooksFn(fn: typeof executeSetupHooksStub): void {
  _executeSetupHooks = fn
}

let _updateWatchPaths: (paths: string[]) => void = () => {}
export function setUpdateWatchPathsFn(fn: (paths: string[]) => void): void {
  _updateWatchPaths = fn
}

let _getMainThreadAgentType: () => string | undefined = () => undefined
export function setGetMainThreadAgentTypeFn(fn: () => string | undefined): void {
  _getMainThreadAgentType = fn
}

function createAttachmentMessageStub(input: {
  type: string
  content: string[]
  hookName: string
  toolUseID: string
  hookEvent: string
}): HookResultMessage {
  // El stub sigue siendo stub —`createAttachmentMessage` vive en
  // `agent/attachments.js` y sigue en la lista de ausentes del docstring de
  // cabecera—, pero AHORA devuelve una forma conforme en vez de su entrada
  // cruda. Antes devolvia `input` tal cual, que no es un `Message`: le falta
  // `uuid` y su `type` es `string`, no `MessageType`. Con el tipo laxo eso
  // pasaba callado; con el real es TS2741.
  //
  // Un cast lo habria silenciado igual y habria dejado el defecto EN TIEMPO
  // DE EJECUCION para quien leyera `uuid`. La forma la fija la fuente
  // (`ccnmt: packages/agent/attachments.ts:3302`): `type: 'attachment'`,
  // `uuid: randomUUID()`, `timestamp`. Lo que falta sigue siendo el
  // subsistema —el `Attachment` real—, no la envoltura.
  return {
    ...input,
    type: 'attachment',
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}
let _createAttachmentMessage = createAttachmentMessageStub
export function setCreateAttachmentMessageFn(
  fn: typeof createAttachmentMessageStub,
): void {
  _createAttachmentMessage = fn
}

async function withDiagnosticsTiming<T>(
  _label: string,
  fn: () => Promise<T>,
): Promise<T> {
  return fn()
}

// ---------------------------------------------------------------------------
// Lógica propia — CON test (ver docstring del archivo).
// ---------------------------------------------------------------------------

// Se fija por processSessionStartHooks cuando un hook emite
// initialUserMessage; la consume una sola vez takeInitialUserMessage.
// Este canal lateral evita cambiar el tipo de retorno
// Promise<HookResultMessage[]> que main.tsx y print.ts ya esperan (la
// promesa de hooks de sesión se lanza en main.tsx y se junta después —
// hacer ondear un cambio estructural de tipo de retorno a través de ese
// traspaso tocaría cinco call-sites por un valor que sólo importa en
// modo print).
let pendingInitialUserMessage: string | undefined

export function takeInitialUserMessage(): string | undefined {
  const v = pendingInitialUserMessage
  pendingInitialUserMessage = undefined
  return v
}

/** Sólo para test. */
export function setPendingInitialUserMessageForTest(v: string | undefined): void {
  pendingInitialUserMessage = v
}

/**
 * Heurística de sugerencia al usuario cuando falla la carga de plugin
 * hooks — extraída del catch inline de `processSessionStartHooks` en la
 * fuente para poder probarla aislada.
 */
export function guidanceForPluginHookError(errorMessage: string): string {
  if (
    errorMessage.includes('Failed to clone') ||
    errorMessage.includes('network') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('ENOTFOUND')
  ) {
    return 'This appears to be a network issue. Check your internet connection and try again.'
  }
  if (
    errorMessage.includes('Permission denied') ||
    errorMessage.includes('EACCES') ||
    errorMessage.includes('EPERM')
  ) {
    return 'This appears to be a permissions issue. Check file permissions on ~/.claude/plugins/'
  }
  if (
    errorMessage.includes('Invalid') ||
    errorMessage.includes('parse') ||
    errorMessage.includes('JSON') ||
    errorMessage.includes('schema')
  ) {
    return 'This appears to be a configuration issue. Check your plugin settings in .claude/settings.json'
  }
  return 'Please fix the plugin configuration or remove problematic plugins from your settings.'
}

// ---------------------------------------------------------------------------
// Orquestación — CABLEADO PURO, sin test (ver docstring del archivo).
// ---------------------------------------------------------------------------

// Nota para CLAUDE: no agregar NINGUNA lógica de "calentamiento". Es
// **CRÍTICO** no agregar trabajo extra al arrancar.
export async function processSessionStartHooks(
  source: 'startup' | 'resume' | 'clear' | 'compact',
  {
    sessionId,
    agentType,
    model,
    forceSyncExecution,
  }: SessionStartHooksOptions = {},
): Promise<HookResultMessage[]> {
  // --bare salta todos los hooks.
  if (isBareMode()) {
    return []
  }
  const hookMessages: HookResultMessage[] = []
  const additionalContexts: string[] = []
  const allWatchPaths: string[] = []

  if (_shouldAllowManagedHooksOnly()) {
    logForDebugging('Skipping plugin hooks - allowManagedHooksOnly is enabled')
  } else {
    try {
      await withDiagnosticsTiming('load_plugin_hooks', () => _loadPluginHooks())
    } catch (error) {
      const enhancedError =
        error instanceof Error
          ? new Error(
              `Failed to load plugin hooks during ${source}: ${error.message}`,
            )
          : new Error(
              `Failed to load plugin hooks during ${source}: ${String(error)}`,
            )

      if (error instanceof Error && error.stack) {
        enhancedError.stack = error.stack
      }

      logError(enhancedError)

      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const userGuidance = guidanceForPluginHookError(errorMessage)

      logForDebugging(
        `Warning: Failed to load plugin hooks. SessionStart hooks from plugins will not execute. ` +
          `Error: ${errorMessage}. ${userGuidance}`,
      )
    }
  }

  const resolvedAgentType = agentType ?? _getMainThreadAgentType()
  for await (const hookResult of _executeSessionStartHooks(
    source,
    sessionId,
    resolvedAgentType,
    model,
    undefined,
    undefined,
    forceSyncExecution,
  )) {
    if (hookResult.message) {
      hookMessages.push(hookResult.message)
    }
    if (
      hookResult.additionalContexts &&
      hookResult.additionalContexts.length > 0
    ) {
      additionalContexts.push(...hookResult.additionalContexts)
    }
    if (hookResult.initialUserMessage) {
      pendingInitialUserMessage = hookResult.initialUserMessage
    }
    if (hookResult.watchPaths && hookResult.watchPaths.length > 0) {
      allWatchPaths.push(...hookResult.watchPaths)
    }
  }

  if (allWatchPaths.length > 0) {
    _updateWatchPaths(allWatchPaths)
  }

  if (additionalContexts.length > 0) {
    const contextMessage = _createAttachmentMessage({
      type: 'hook_additional_context',
      content: additionalContexts,
      hookName: 'SessionStart',
      toolUseID: 'SessionStart',
      hookEvent: 'SessionStart',
    })
    hookMessages.push(contextMessage)
  }

  return hookMessages
}

export async function processSetupHooks(
  trigger: 'init' | 'maintenance',
  { forceSyncExecution }: { forceSyncExecution?: boolean } = {},
): Promise<HookResultMessage[]> {
  if (isBareMode()) {
    return []
  }
  const hookMessages: HookResultMessage[] = []
  const additionalContexts: string[] = []

  if (_shouldAllowManagedHooksOnly()) {
    logForDebugging('Skipping plugin hooks - allowManagedHooksOnly is enabled')
  } else {
    try {
      await _loadPluginHooks()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logForDebugging(
        `Warning: Failed to load plugin hooks. Setup hooks from plugins will not execute. Error: ${errorMessage}`,
      )
    }
  }

  for await (const hookResult of _executeSetupHooks(
    trigger,
    undefined,
    undefined,
    forceSyncExecution,
  )) {
    if (hookResult.message) {
      hookMessages.push(hookResult.message)
    }
    if (
      hookResult.additionalContexts &&
      hookResult.additionalContexts.length > 0
    ) {
      additionalContexts.push(...hookResult.additionalContexts)
    }
  }

  if (additionalContexts.length > 0) {
    const contextMessage = _createAttachmentMessage({
      type: 'hook_additional_context',
      content: additionalContexts,
      hookName: 'Setup',
      toolUseID: 'Setup',
      hookEvent: 'Setup',
    })
    hookMessages.push(contextMessage)
  }

  return hookMessages
}
