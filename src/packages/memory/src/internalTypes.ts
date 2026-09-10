/**
 * Puerto de `ccnmt: packages/memory/src/internalTypes.ts` (verbatim — sin
 * dependencias).
 *
 * Alias de tipos estructurales locales para el paquete `memory`.
 *
 * Reemplazan imports directos de tipos de `app-compat`, que violarían los
 * límites de V7 Wave 2. Los tipos de aquí son equivalentes estructurales
 * mínimos — los llamadores en la capa de integración (`app-compat`/`agent`)
 * los satisfacen por tipado estructural de TypeScript, sin casts explícitos.
 *
 * V7 §8 — `memory` no puede importar tipos de `app-compat`. Los
 * estructurales locales son el patrón de sustitución aprobado.
 */

// ── Tipos de mensaje ──────────────────────────────────────────────────────────

/** Forma mínima de mensaje que necesitan extractMemories / autoDream. */
export type MemMessage = {
  type: string
  uuid?: string
  message?: {
    content: Array<MemContentBlock>
  }
  [key: string]: unknown
}

export type MemContentBlock = {
  type: string
  name?: string
  input?: unknown
  text?: string
}

/** Recorte estructural del contenido de AssistantMessage. */
export type MemAssistantMessage = MemMessage & {
  type: 'assistant'
  message: { content: MemContentBlock[] }
}

// ── Mensaje de sistema (para el callback appendSystemMessage) ───────────────────

export type MemSystemMessage = {
  type: string
  [key: string]: unknown
}

// ── Tipos de herramienta ──────────────────────────────────────────────────────

/** Recorte estructural mínimo de Tool que necesita extractMemories. */
export type MemTool = {
  name: string
  inputSchema: {
    safeParse: (input: unknown) => { success: boolean; data: unknown }
  }
  isReadOnly?: (input: unknown) => boolean
}

/** Resultado de permiso que devuelve canUseTool. */
export type MemToolPermissionResult =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | {
      behavior: 'deny'
      message: string
      decisionReason: { type: string; reason?: string }
    }

/** La firma de la función canUseTool que usan los agentes forkeados. */
export type MemCanUseTool = (
  tool: MemTool,
  input: Record<string, unknown>,
) => Promise<MemToolPermissionResult>

// ── Contexto del hook de REPL ─────────────────────────────────────────────────

/** Recorte estructural de ToolUseContext que necesita el paquete memory. */
export type MemToolUseContext = {
  agentId?: string
  appendSystemMessage?: (msg: MemSystemMessage) => void
  [key: string]: unknown
}

/** Equivalente estructural de REPLHookContext para uso del paquete memory. */
export type MemREPLContext = {
  messages: MemMessage[]
  toolUseContext: MemToolUseContext
}
