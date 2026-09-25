/**
 * Tipos de hook y sus type guards — porte PARCIAL de
 * `ccnmt: packages/agent/types/hooks.ts`.
 *
 * Se portan los símbolos que `__tests__/hookTypeGuards.test.ts` ejercita:
 * `isHookEvent`, `isSyncHookJSONOutput`, `isAsyncHookJSONOutput`, más el
 * universo `HOOK_EVENTS`/`HookEvent` del que dependen y los stubs de
 * `HookJSONOutput`/`SyncHookJSONOutput`/`AsyncHookJSONOutput` que la fuente
 * también deja como stub (`Record<string, unknown>`,
 * `ccnmt: packages/headless-sdk/src/coreTypes.generated.ts:70-72`).
 * Se añade `HookCommand` porque `goalStopHook.ts` y `hooks/sessionHooks.ts`
 * (ambos en este mismo pase) lo necesitan como el tipo de un hook
 * persistible — no vive en este árbol el paquete `@claude-code-how-works
 * /config/types` de donde la fuente lo importa, así que se declara aquí,
 * en la forma estructural que `ccnmt: packages/config/settings/schemas
 * /hooks.ts:60-107` infiere de sus cuatro esquemas Zod (command/prompt/
 * http/agent) — sin la capa Zod, que no aporta nada a estos dos tests.
 *
 * PORTE PARCIAL declarado. Símbolos de la fuente OMITIDOS, y por qué:
 *
 *   - `promptRequestSchema`, `PromptRequest`, `PromptResponse` — el
 *     protocolo de elicitación por prompt. Depende de `lazySchema` de
 *     `@claude-code-how-works/tool-registry/utils/lazySchema.js`, paquete
 *     ausente en este árbol. Ningún test de este pase lo ejercita.
 *   - `syncHookResponseSchema` — el esquema Zod de la respuesta síncrona
 *     suelta: ningún consumidor lo importa. `hookJSONOutputSchema` sí se
 *     expone, como re-export de `HookJSONOutputSchema` de
 *     `@thyrox/headless-sdk/coreSchemas.js`, que ya porta la misma unión
 *     asíncrona | síncrona. `isSyncHookJSONOutput`/`isAsyncHookJSONOutput`
 *     no necesitan el esquema — son guardas estructurales puras sobre la
 *     clave `async`.
 *   - `HookCallbackContext`, `HookCallback`, `HookCallbackMatcher` —
 *     PORTADOS 2026-09-19 (TASK-THYROX-0201). Estaban aquí como omitidos
 *     por falta de consumidor; el consumidor apareció:
 *     `app-host/bootstrap/state.ts` tipa `registeredHooks` con
 *     `HookCallbackMatcher | PluginHookMatcher`, igual que la fuente
 *     (`ccnmt: packages/app-host/src/bootstrap/state.ts:12,22,27`). Con
 *     ellos viajan `HookInput` —stub estructural, vecino de los de
 *     salida— y el alias `AppState = unknown` que la fuente misma declara
 *     local. `AttributionState` sí existe en este árbol
 *     (`../commitAttribution.ts:240`).
 *   - `HookProgress`, `HookBlockingError`, `PermissionRequestResult`,
 *     `HookResult`, `AggregatedHookResult` — el resultado agregado de
 *     ejecutar hooks de verdad contra el host. Ninguno de los dos tests de
 *     este pase ejecuta un hook; `hooks/sessionHooks.ts` sólo necesita un
 *     tipo mínimo para el parámetro de `onHookSuccess`, declarado ahí
 *     localmente (divergencia anotada en ese archivo).
 *
 * Se porta cuando aparezca su primer consumidor real — mismo criterio que
 * ya fija `../messageShapes.ts` en este árbol.
 */

import type { AttributionState } from '../commitAttribution.js'
export { HookJSONOutputSchema as hookJSONOutputSchema } from '@thyrox/headless-sdk/coreSchemas.js'

/**
 * Universo de eventos de hook. Inlineado verbatim desde
 * `ccnmt: packages/headless-sdk/src/coreTypes.ts:25-53` (idéntico en
 * `ccnmt: packages/config/settings/schemas/hooks.ts:12-40`, dos copias que
 * la propia fuente ya mantiene sincronizadas a mano). La fuente lo importa
 * de `@claude-code-how-works/headless-sdk/coreTypes.js`, paquete ausente en
 * este árbol — se declara aquí como la única fuente local.
 */
export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Notification',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'StopFailure',
  'SubagentStart',
  'SubagentStop',
  'PreCompact',
  'PostCompact',
  'PermissionRequest',
  'PermissionDenied',
  'Setup',
  'TeammateIdle',
  'TaskCreated',
  'TaskCompleted',
  'Elicitation',
  'ElicitationResult',
  'ConfigChange',
  'WorktreeCreate',
  'WorktreeRemove',
  'InstructionsLoaded',
  'CwdChanged',
  'FileChanged',
] as const

export type HookEvent = (typeof HOOK_EVENTS)[number]

/**
 * El cuerpo del progreso de un hook en ejecución. Forma del productor del
 * binario 2.1.275 (`{type:"hook_progress", hookEvent, hookName, command,
 * promptText?, statusMessage?}`): ya tiene cuatro consumidores reales
 * (`toolHooks`, `toolExecution`, `Tool.ts`, `stopHookSpinnerSuffix`).
 */
export type HookProgress = {
  type: 'hook_progress'
  hookEvent: HookEvent
  hookName: string
  command: string
  promptText?: string
  statusMessage?: string
}

export function isHookEvent(value: string): value is HookEvent {
  return (HOOK_EVENTS as readonly string[]).includes(value)
}

/**
 * Stub estructural — la fuente misma los deja como
 * `Record<string, unknown>` en su capa generada
 * (`ccnmt: packages/headless-sdk/src/coreTypes.generated.ts:70-72`); las
 * dos guardas de abajo sólo inspeccionan la clave `async`, así que un tipo
 * más preciso no cambia su comportamiento.
 */
export type HookJSONOutput = Record<string, unknown>
export type SyncHookJSONOutput = Record<string, unknown>
export type AsyncHookJSONOutput = Record<string, unknown>

/** Ant discrimina por la clave `async===true`; todo lo demás es síncrono. */
export function isSyncHookJSONOutput(
  json: HookJSONOutput,
): json is SyncHookJSONOutput {
  return !('async' in json && json.async === true)
}

export function isAsyncHookJSONOutput(
  json: HookJSONOutput,
): json is AsyncHookJSONOutput {
  return 'async' in json && json.async === true
}

/**
 * Campos comunes a los cuatro tipos de hook persistible — porte
 * estructural de `ccnmt: packages/config/settings/schemas/hooks.ts:59-107`
 * (los cuatro `z.object({...})` comparten `if`/`timeout`/`statusMessage`/
 * `once`), sin la capa Zod (divergencia declarada arriba).
 */
type HookCommandBase = {
  if?: string
  timeout?: number
  statusMessage?: string
  once?: boolean
}

export type BashCommandHook = HookCommandBase & {
  type: 'command'
  command: string
  args?: string[]
  shell?: 'bash' | 'powershell'
  async?: boolean
  asyncRewake?: boolean
}

export type PromptHook = HookCommandBase & {
  type: 'prompt'
  prompt: string
  model?: string
  continueOnBlock?: boolean
}

export type HttpHook = HookCommandBase & {
  type: 'http'
  url: string
  headers?: Record<string, string>
  allowedEnvVars?: string[]
}

export type AgentHook = HookCommandBase & {
  type: 'agent'
  prompt: string
  model?: string
}

/** ant `HookCommand` — unión discriminada de los cuatro tipos persistibles. */
export type HookCommand = BashCommandHook | PromptHook | HttpHook | AgentHook

/**
 * Stub estructural de la entrada de un hook — porte verbatim de
 * `ccnmt: packages/headless-sdk/src/coreTypes.generated.ts:69`, vecino
 * inmediato de los tres stubs de salida que este archivo ya porta arriba
 * (`:70-72`). La fuente lo importa de
 * `@claude-code-how-works/headless-sdk/agentSdkTypes.js`; aqui se declara
 * local por la misma razon que `HookJSONOutput`: ese paquete no publica el
 * simbolo en este arbol (`agentSdkTypes.ts` solo declara `HookEvent`, y
 * como `unknown`).
 */
export type HookInput = { hook_event_name: string; [key: string]: unknown }

/**
 * SHIM DE SOLO-TIPO, heredado y DELIBERADO — no un accidente del porte.
 *
 * La referencia declara este alias como `unknown` en este mismo archivo
 * (`ccnmt: packages/agent/types/hooks.ts:19`) en vez de importar el tipo
 * real, y lo hace en 8 sitios mas del arbol: son archivos con nombre de
 * shim (`appStateCompatShim`, `appStateShim`, `AppStateCompat`) cuyo
 * docstring cita la misma decision de particion, para que un paquete no
 * importe `state/AppState` a nivel de modulo. El tipo real existe y esta
 * portado, byte a byte, en `app-host/src/state/AppStateCompat.ts:89`.
 *
 * La version anterior de este comentario decia que la forma de `unknown`
 * era «la que la fuente declara», sin mas. Es cierto de la referencia
 * inmediata y no del original, que si importa el tipo real — el analisis
 * esta en `.claude/workbench/appstate-shim-leak-20260919T024500/`.
 *
 * No se estrecha aqui por el umbral que la propia referencia declara y
 * midio: estrechar un shim solo rinde sobre consumidores de patron ACCESS
 * (`x.campo`), y `HookCallbackContext` tiene CERO consumidores en los tres
 * arboles medidos. El triaje de los 9 shims es TASK-THYROX-0203.
 */
type AppState = unknown

/** Contexto que los hooks de callback reciben para acceder al estado. */
export type HookCallbackContext = {
  getAppState: () => AppState
  updateAttributionState: (
    updater: (prev: AttributionState) => AttributionState,
  ) => void
}

/** Hook que es un callback — registrado en memoria, no persistible. */
export type HookCallback = {
  type: 'callback'
  callback: (
    input: HookInput,
    toolUseID: string | null,
    abort: AbortSignal | undefined,
    /** Indice del hook, para que los de SessionStart compongan CLAUDE_ENV_FILE */
    hookIndex?: number,
    /** Contexto opcional de acceso al estado de la aplicacion */
    context?: HookCallbackContext,
  ) => Promise<HookJSONOutput>
  /** Timeout en segundos para este hook */
  timeout?: number
  /** Los hooks internos quedan fuera de las metricas de tengu_run_hook */
  internal?: boolean
}

/**
 * Un matcher de hooks de callback. Su discriminador frente al matcher de
 * plugin es la AUSENCIA de `pluginRoot` — `clearRegisteredPluginHooks` de
 * `app-host/bootstrap/state.ts` particiona con `'pluginRoot' in m`.
 */
export type HookCallbackMatcher = {
  matcher?: string
  hooks: HookCallback[]
  pluginName?: string
}

// Tipos que sus consumidores piden aquí y que son de otro paquete; entran
// por una clave declarada de su exports (medido con src/verify/namedImports.ts).
export type { PromptRequest, PromptResponse } from '@thyrox/headless-sdk/agentSdkTypes.js'
