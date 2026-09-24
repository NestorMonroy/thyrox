/**
 * El contexto de permisos con que se decide UNA llamada: el de la sesión,
 * con las capas que la llamada trae aplicadas y las reescrituras de modo que
 * su origen exige.
 *
 * Reimplementación del contrato de 2.1.275 (`pe` de `chunk-zvswra5f.js`,
 * con `x`, `d`, `u`, `g`, `k`, `h`, `b`, `m` y `tS`), no copia.
 *
 * Divergencias declaradas:
 *
 * - `k` ancla el auto mode al modo registrado al pedir la llamada sólo si
 *   ese registro es una instancia de la clase del binario que lo guarda y
 *   su clasificador no está activo. Este árbol no tiene esa clase, así que
 *   la rama no se dispara: el modo queda el de la sesión.
 * - `tS` (bypass deshabilitado por settings) se lee de
 *   `permissions.disableBypassPermissionsMode` en las settings iniciales.
 */

type ModeName = string

export type WorkingDirectoryEntry = { path: string; source: string }

/** La forma del contexto de permisos que esta resolución lee y escribe. */
export type PermissionContextShape = {
  mode: ModeName
  alwaysAllowRules: Partial<Record<string, string[]>>
  alwaysDenyRules: Partial<Record<string, string[]>>
  alwaysAskRules: Partial<Record<string, string[]>>
  additionalWorkingDirectories: Map<string, WorkingDirectoryEntry>
  isBypassPermissionsModeAvailable?: boolean
  blockReadsOutsideWorkingDirectories?: boolean
  pollEventDeliveryGuard?: boolean
  strippedDangerousRules?: Partial<Record<string, string[]>>
  bashCommandClamps?: unknown[]
  shouldAvoidPermissionPrompts?: boolean
  sandboxAutoAllowSuspended?: boolean
  modeBeforeRewrite?: ModeName
  [key: string]: unknown
}

export type PermissionLayer =
  | { kind: 'allowed_tools'; allowedTools: readonly string[] }
  | { kind: 'disallowed_tools'; disallowedTools: readonly string[] }
  | { kind: 'bash_command_clamp'; rules: unknown }
  | { kind: 'avoid_prompts' }
  | { kind: 'sandbox_auto_allow_suspended' }
  | { kind: 'permission_mode'; mode: ModeName }
  | { kind: 'working_directory'; directory: string }
  | { kind: 'effort' | 'model' | 'max_thinking_tokens' | 'flag_settings'; [key: string]: unknown }

/** Lo que la resolución lee de la llamada. */
export type PermissionCallContext = {
  getAppState: () => { toolPermissionContext: PermissionContextShape }
  permissionLayers?: readonly PermissionLayer[]
  forPromptShellCommand?: boolean
  forRemoteExecution?: boolean
  permissionModeAtRequest?: unknown
}

const SKILL_TOOL_NAME = 'Skill'
const SKILL_RULE_PREFIX = 'skill__'

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

/** ¿Es un permiso de Skill? (≙ `y`). */
function isSkillAllowRule(rule: string): boolean {
  return rule === SKILL_TOOL_NAME || rule.startsWith(`${SKILL_TOOL_NAME}(`) || rule.startsWith(SKILL_RULE_PREFIX)
}

/**
 * Con la guarda de entrega de eventos activa, los permisos de Skill se
 * retiran a `strippedDangerousRules`: un evento sondeado no puede invocar
 * una skill por un permiso guardado (≙ `x`).
 */
function withoutSkillAllowRules(context: PermissionContextShape): PermissionContextShape {
  let changed = false
  const allow: Partial<Record<string, string[]>> = {}
  const stripped: Partial<Record<string, string[]>> = {}
  for (const [source, rules] of Object.entries(context.strippedDangerousRules ?? {})) {
    if (rules !== undefined) stripped[source] = [...rules]
  }
  for (const [source, rules] of Object.entries(context.alwaysAllowRules)) {
    if (rules === undefined) continue
    const kept = rules.filter(rule => !isSkillAllowRule(rule))
    if (kept.length !== rules.length) {
      changed = true
      for (const rule of rules) {
        if (!isSkillAllowRule(rule)) continue
        const bucket = (stripped[source] ??= [])
        if (!bucket.includes(rule)) bucket.push(rule)
      }
    }
    allow[source] = kept
  }
  if (!changed) return context
  return { ...context, alwaysAllowRules: allow, strippedDangerousRules: stripped }
}

/** Añade permisos a la fuente `command` (≙ `d`). */
function withCommandAllowRules(context: PermissionContextShape, rules: readonly string[]): PermissionContextShape {
  if (rules.length === 0) return context
  return {
    ...context,
    alwaysAllowRules: { ...context.alwaysAllowRules, command: unique([...(context.alwaysAllowRules.command ?? []), ...rules]) },
  }
}

/** Añade denegaciones a la fuente `command` (≙ `u`). */
function withCommandDenyRules(context: PermissionContextShape, rules: readonly string[]): PermissionContextShape {
  if (rules.length === 0) return context
  return {
    ...context,
    alwaysDenyRules: { ...context.alwaysDenyRules, command: unique([...(context.alwaysDenyRules.command ?? []), ...rules]) },
  }
}

/** Cambia el modo recordando el que había antes de la primera reescritura (≙ `m`). */
function withMode(mode: ModeName, context: PermissionContextShape): PermissionContextShape {
  return { ...context, mode, modeBeforeRewrite: context.modeBeforeRewrite ?? context.mode }
}

/** ¿Deshabilitan las settings el modo bypass? (≙ `tS`/`Q7n`). */
function isBypassDisabledBySettings(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getInitialSettings } = require('@thyrox/config/settings') as {
      getInitialSettings: () => { permissions?: { disableBypassPermissionsMode?: string } } | undefined
    }
    return getInitialSettings()?.permissions?.disableBypassPermissionsMode === 'disable'
  } catch {
    return false
  }
}

/** El auto mode anclado al modo registrado al pedir la llamada (≙ `k`). */
function anchorAutoModeToRequest(call: PermissionCallContext, context: PermissionContextShape): PermissionContextShape {
  // La rama del binario exige una instancia de su clase de registro de modo;
  // este árbol no la tiene, así que el modo queda el de la sesión.
  void call.permissionModeAtRequest
  return context
}

/** La ejecución remota: sin bloqueo de lecturas, y sin acceptEdits ni bypass (≙ `h`). */
function forRemoteExecution(call: PermissionCallContext, context: PermissionContextShape): PermissionContextShape {
  if (call.forRemoteExecution !== true) return context
  const { blockReadsOutsideWorkingDirectories: _dropped, ...rest } = context
  return context.mode === 'acceptEdits' || context.mode === 'bypassPermissions'
    ? withMode('default', rest as PermissionContextShape)
    : (rest as PermissionContextShape)
}

/** Un comando de prompt no hereda el auto mode (≙ `b`). */
function forPromptShellCommand(call: PermissionCallContext, context: PermissionContextShape): PermissionContextShape {
  if (call.forPromptShellCommand !== true) return context
  return context.mode === 'auto' ? withMode('default', context) : context
}

/** Las reescrituras de modo que el origen de la llamada exige (≙ `g`). */
function applyCallRewrites(call: PermissionCallContext, context: PermissionContextShape): PermissionContextShape {
  return forPromptShellCommand(call, forRemoteExecution(call, anchorAutoModeToRequest(call, context)))
}

/**
 * El contexto de permisos para esta llamada: el de la sesión, con la guarda
 * de eventos, las capas de la llamada y sus reescrituras de modo (≙ `pe`).
 */
export function resolveToolPermissionContext(call: PermissionCallContext): PermissionContextShape {
  let context = call.getAppState().toolPermissionContext
  const guarded = context !== undefined && context.pollEventDeliveryGuard === true
  if (guarded) context = withoutSkillAllowRules(context)
  const layers = call.permissionLayers
  if (!layers) return applyCallRewrites(call, context)
  const lastWorkingDirectory = layers.findLast(layer => layer.kind === 'working_directory')
  for (const layer of layers) {
    switch (layer.kind) {
      case 'allowed_tools':
        if (!guarded) context = withCommandAllowRules(context, [...layer.allowedTools])
        break
      case 'disallowed_tools':
        context = withCommandDenyRules(context, [...layer.disallowedTools])
        break
      case 'bash_command_clamp':
        context = { ...context, bashCommandClamps: [...(context.bashCommandClamps ?? []), layer.rules] }
        break
      case 'avoid_prompts':
        if (!context.shouldAvoidPermissionPrompts) context = { ...context, shouldAvoidPermissionPrompts: true }
        break
      case 'sandbox_auto_allow_suspended':
        if (!context.sandboxAutoAllowSuspended) context = { ...context, sandboxAutoAllowSuspended: true }
        break
      case 'permission_mode':
        if (layer.mode === 'bypassPermissions' && (isBypassDisabledBySettings() || !context.isBypassPermissionsModeAvailable)) break
        context = { ...context, mode: layer.mode }
        break
      case 'working_directory':
        if (layer === lastWorkingDirectory && !context.additionalWorkingDirectories.has(layer.directory)) {
          context = {
            ...context,
            additionalWorkingDirectories: new Map([
              ...context.additionalWorkingDirectories,
              [layer.directory, { path: layer.directory, source: 'session' }],
            ]),
          }
        }
        break
      default:
        break
    }
  }
  return applyCallRewrites(call, context)
}
