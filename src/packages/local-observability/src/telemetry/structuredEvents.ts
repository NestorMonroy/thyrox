/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/structuredEvents.ts`
 * (221 líneas fuente, 100 % portado). Cada helper envuelve `logOTelEvent`
 * con la forma exacta de metadata que emite para un tipo de evento
 * específico. Sin dependencias de paquete hermano fuera de `./events.js`.
 */

import { logOTelEvent } from './events.js'

// -- compaction ---------------------------------------------------------
export type CompactionEvent = {
  trigger: string
  success: boolean
  durationMs: number
  preTokens?: number
  postTokens?: number
  error?: string
}
export async function logCompactionEvent(e: CompactionEvent): Promise<void> {
  await logOTelEvent('compaction', {
    trigger: e.trigger,
    success: String(e.success),
    duration_ms: String(Math.round(e.durationMs)),
    pre_tokens: e.preTokens !== undefined ? String(e.preTokens) : undefined,
    post_tokens: e.postTokens !== undefined ? String(e.postTokens) : undefined,
    error: e.error,
  })
}

// -- internal_error ------------------------------------------------------
// Guardado contra reentrancia: el reportero de errores nunca debe
// recursar si emitir el evento mismo lanza, o una falla del logger
// encadenaría para siempre.
let internalErrorReentrancyGuard = false
export function logInternalErrorEvent(error: Error): void {
  if (internalErrorReentrancyGuard) return
  internalErrorReentrancyGuard = true
  try {
    const errorName =
      error.name !== 'Error'
        ? error.name
        : (error.constructor?.name ?? 'Error')
    const code = (error as Error & { code?: unknown }).code
    const errorCode =
      typeof code === 'string' && /^[A-Z][A-Z0-9_]*$/.test(code)
        ? code
        : undefined
    // No se espera — los errores internos deben ser fire-and-forget;
    // que falle emitir no debe detener la recuperación del llamador.
    void logOTelEvent('internal_error', {
      error_name: errorName,
      error_code: errorCode,
    })
  } finally {
    internalErrorReentrancyGuard = false
  }
}

// -- at_mention -----------------------------------------------------------
export async function logAtMentionEvent(args: {
  mentionType: string
  success: boolean
}): Promise<void> {
  await logOTelEvent('at_mention', {
    mention_type: args.mentionType,
    success: String(args.success),
  })
}

// -- permission_mode_changed -----------------------------------------------
export async function logPermissionModeChangeEvent(args: {
  from: string
  to: string
  trigger?: string
}): Promise<void> {
  // Omite transiciones no-op (equivalente a `if (H.from === H.to) return;`).
  if (args.from === args.to) return
  await logOTelEvent('permission_mode_changed', {
    from_mode: args.from,
    to_mode: args.to,
    trigger: args.trigger,
  })
}

// -- mcp_server_connection --------------------------------------------------
export async function logMcpServerConnectionEvent(args: {
  serverName: string
  transportType?: string // por defecto 'stdio' si es undefined
  serverScope: string
  status: string
  durationMs: number
  errorCode?: string
  errorDetail?: string // sólo se adjunta en builds ant no-customer
  /** Cuando es false, se despoja server_name + detalle de error (gate de PII). */
  includeIdentifyingFields?: boolean
}): Promise<void> {
  const includePII = args.includeIdentifyingFields ?? false
  await logOTelEvent('mcp_server_connection', {
    status: args.status,
    transport_type: args.transportType ?? 'stdio',
    server_scope: args.serverScope,
    duration_ms: String(Math.round(args.durationMs)),
    error_code: args.errorCode,
    server_name: includePII ? args.serverName : undefined,
    error: includePII ? args.errorDetail : undefined,
  })
}

// -- system_prompt -----------------------------------------------------------
export async function logSystemPromptEvent(args: {
  hash: string
  content: string
  length: number
  truncated: boolean
}): Promise<void> {
  await logOTelEvent('system_prompt', {
    system_prompt_hash: args.hash,
    system_prompt: args.content,
    system_prompt_length: String(args.length),
    system_prompt_truncated: args.truncated ? 'true' : undefined,
  })
}

// -- api_retries_exhausted --------------------------------------------------
export async function logApiRetriesExhaustedEvent(args: {
  model: string
  error: string
  statusCode?: string
  totalAttempts: number
  totalRetryDurationMs: number
  speed: 'fast' | 'normal'
  querySource?: string
  effort?: string
}): Promise<void> {
  await logOTelEvent('api_retries_exhausted', {
    model: args.model,
    error: args.error,
    status_code: args.statusCode,
    total_attempts: String(args.totalAttempts),
    total_retry_duration_ms: String(args.totalRetryDurationMs),
    speed: args.speed,
    query_source: args.querySource,
    effort: args.effort,
  })
}

// -- skill_activated -----------------------------------------------------
export async function logSkillActivatedEvent(args: {
  skillName: string
  invocationTrigger: string
  skillSource?: string
  skillKind?: string
  /** Si esta skill es "oficial" (builtin/bundled/plugin de anthropic). */
  isOfficial: boolean
  pluginName?: string
  marketplaceName?: string
}): Promise<void> {
  await logOTelEvent('skill_activated', {
    'skill.name': args.isOfficial ? args.skillName : 'custom_skill',
    invocation_trigger: args.invocationTrigger,
    'skill.source': args.skillSource,
    'skill.kind': args.skillKind,
    'plugin.name': args.isOfficial ? args.pluginName : undefined,
    'marketplace.name': args.isOfficial ? args.marketplaceName : undefined,
  })
}

// -- plugin_installed -------------------------------------------------------
export async function logPluginInstalledEvent(args: {
  pluginName: string
  pluginVersion?: string
  marketplaceName?: string
  isOfficialMarketplace: boolean
  trigger?: string
  /** Si la identidad del plugin puede viajar con el evento (gate de PII). */
  includeIdentifyingFields?: boolean
}): Promise<void> {
  const includePII = args.includeIdentifyingFields ?? false
  await logOTelEvent('plugin_installed', {
    'plugin.name': includePII ? args.pluginName : undefined,
    'plugin.version': includePII ? args.pluginVersion : undefined,
    'marketplace.name': includePII ? args.marketplaceName : undefined,
    'marketplace.is_official': String(args.isOfficialMarketplace),
    'install.trigger': args.trigger,
  })
}

// -- feedback_survey ---------------------------------------------------------
export type FeedbackSurveyEvent = {
  eventType: 'appeared' | 'dismissed' | 'submitted'
  appearanceId: string
  surveyType: string
  enabledViaOverride?: boolean
}
export async function logFeedbackSurveyEvent(
  e: FeedbackSurveyEvent,
): Promise<void> {
  await logOTelEvent('feedback_survey', {
    event_type: e.eventType,
    appearance_id: e.appearanceId,
    survey_type: e.surveyType,
    enabled_via_override:
      e.enabledViaOverride !== undefined
        ? String(e.enabledViaOverride)
        : undefined,
  })
}
