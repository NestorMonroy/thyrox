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
 *   - `syncHookResponseSchema`, `hookJSONOutputSchema` — los esquemas Zod
 *     de validación en tiempo de ejecución. Mismo bloqueo de `lazySchema`,
 *     más los tipos de permisos (`permissionBehaviorSchema`,
 *     `permissionUpdateSchema` de `@claude-code-how-works/permission/*`,
 *     tampoco presentes). `isSyncHookJSONOutput`/`isAsyncHookJSONOutput`
 *     no necesitan el esquema — son guardas estructurales puras sobre la
 *     clave `async`.
 *   - `HookCallbackContext`, `HookCallback`, `HookCallbackMatcher` — el
 *     contrato de un hook de tipo callback (registrado, no persistible) y
 *     su contexto (`AttributionState` de `../commitAttribution.js`,
 *     `AppState` opaco). Sin consumidor en `hookTypeGuards.test.ts` ni en
 *     `goalStopHook.test.ts` (que sólo usa hooks `prompt`, vía
 *     `HookCommand`).
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
