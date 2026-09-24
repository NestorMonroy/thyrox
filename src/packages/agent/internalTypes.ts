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

/**
 * El cuerpo de un mensaje tal como lo LEE el bucle. Dos campos divergen de la
 * fuente (`ccnmt: packages/agent/internalTypes.ts:16-25`), y los dos porque la
 * declaracion contradecia a sus propios lectores, medido con el censo de
 * lecturas por type checker (`.claude/workbench/agent-message-field-census-*`):
 *
 *   - `content`: la fuente declara `unknown[]`, y `QueryEngine` lo lee con
 *     `typeof msg.message.content === 'string'` antes de `.includes`. Con la
 *     fuente compilando en `"strict": false` (`ccnmt: tsconfig.json:7`) eso
 *     pasa; con `"strict": true` (`tsconfig.json:8`) la rama string es `never`.
 *     Es opcional porque el mensaje canonico lo declara opcional.
 *   - `usage`: la fuente declara `{ [key: string]: number }`, y su unico
 *     lector (`query.ts`) lo castea antes de leerlo; el `usage` real es el
 *     `BetaUsage` del API, que no cabe en esa firma.
 *
 * Con esos dos campos el `Message` canonico satisface esta forma por tipado
 * estructural, que es lo que el encabezado de este archivo promete: el bucle
 * conserva su modelo propio y quien lo llama no necesita cast.
 */
export type AgentMessageBody = {
  content?: string | readonly unknown[]
  usage?: unknown
  [key: string]: unknown
}

/** Forma mínima de mensaje que usan los stop hooks y el query loop. */
export type AgentMessage = {
  type: string
  uuid?: string
  isApiErrorMessage?: boolean
  message?: AgentMessageBody
  [key: string]: unknown
}

export type AgentAssistantMessage = AgentMessage & {
  type: 'assistant'
  message: AgentMessageBody
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
