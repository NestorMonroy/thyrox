/**
 * Alias estructurales locales para el paquete `agent` — porte de
 * `ccnmt: packages/agent/internalTypes.ts`.
 *
 * Reemplazan un import de tipo directo desde `app-compat` que violaría el
 * límite V7 §8 (`agent` no puede importar tipos de `app-compat`): en vez de
 * acoplarse a esa forma exacta, cada tipo de aquí es un equivalente
 * estructural mínimo — quien lo consuma en la capa de integración lo
 * satisface por tipado estructural de TypeScript, sin cast explícito.
 *
 * El archivo es AUTOCONTENIDO: no importa nada externo. Se porta completo.
 */

// ── Tipos de mensaje ────────────────────────────────────────────────────────

/** Forma mínima de mensaje que usan los stop hooks y el query loop. */
export type AgentMessage = {
  type: string
  uuid?: string
  isApiErrorMessage?: boolean
  message?: {
    content: unknown[]
    usage?: { [key: string]: number }
  }
  [key: string]: unknown
}

export type AgentAssistantMessage = AgentMessage & {
  type: 'assistant'
  message: { content: unknown[]; usage?: { [key: string]: number } }
}

export type AgentStreamEvent = {
  type: string
  [key: string]: unknown
}

export type AgentRequestStartEvent = {
  type: 'stream_request_start'
}

export type AgentTombstoneMessage = {
  type: 'tombstone'
  message: AgentMessage
}

export type AgentToolUseSummaryMessage = {
  type: 'tool_use_summary'
  [key: string]: unknown
}

// ── Tipos de hook ────────────────────────────────────────────────────────────

/** Forma mínima de los datos de progreso de un hook. */
export type AgentHookProgress = {
  command?: string
  promptText?: string
  [key: string]: unknown
}

/** Info mínima de un stop hook. */
export type AgentStopHookInfo = {
  command: string
  promptText?: string
  durationMs?: number
}

/** Resultado que produce un generador de ejecución de hooks. */
export type AgentHookResult = {
  message?: AgentMessage
  blockingError?: { blockingError: string }
  preventContinuation?: boolean
  stopReason?: string
  [key: string]: unknown
}

// ── Tipos de tool / contexto ─────────────────────────────────────────────────

/** Forma mínima de ToolUseContext que necesitan los stop hooks y el query loop. */
export type AgentToolUseContext = {
  agentId?: string
  agentType?: string
  abortController: AbortController
  getAppState: () => { toolPermissionContext: { mode: string }; [key: string]: unknown }
  setAppState?: (f: (prev: unknown) => unknown) => void
  addNotification?: (n: { key: string; text: string; priority: string }) => void
  queryTracking?: { chainId: string; depth: number }
  appendSystemMessage?: (msg: unknown) => void
  options: {
    mainLoopModel: string
    tools: unknown[]
    isNonInteractiveSession?: boolean
    [key: string]: unknown
  }
  [key: string]: unknown
}

// ── Tipo de system prompt ────────────────────────────────────────────────────

/** Forma mínima de SystemPrompt. */
export type AgentSystemPrompt = Array<{ content: unknown }>

// ── Fuente de la query ───────────────────────────────────────────────────────

/** Identificador de fuente de la query — coincide con la unión de strings de app-compat. */
export type AgentQuerySource = string

// ── Contexto de hook de REPL ─────────────────────────────────────────────────

/** Equivalente estructural de REPLHookContext para el paquete `agent`. */
export type AgentREPLHookContext = {
  messages: AgentMessage[]
  systemPrompt: AgentSystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  toolUseContext: AgentToolUseContext
  querySource: AgentQuerySource
}

// ── Tipos de tarea ───────────────────────────────────────────────────────────

/** Forma mínima de tarea que usan los stop hooks. */
export type AgentTask = {
  id: string
  status: string
  owner?: string
  subject?: string
  description?: string
  [key: string]: unknown
}

// ── Tipo de opción de log (para el historial de archivos) ───────────────────

/** Forma mínima de LogOption que necesita fileHistoryCore. */
export type AgentLogOption = {
  messages: Array<{ sessionId?: string; [key: string]: unknown }>
  fileHistorySnapshots?: unknown[]
  [key: string]: unknown
}

// ── Marca de metadata de analytics ───────────────────────────────────────────

/**
 * Tipo con marca ("branded") para los valores que se pasan a logEvent, que
 * confirma que NO son código ni rutas de archivo. Coincide con la
 * definición de app-compat (`never`) para que un valor de este tipo sólo
 * pueda asignarse vía un cast explícito.
 */
export type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = never
