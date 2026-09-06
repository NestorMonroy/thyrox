/**
 * El registro de bindings del host — porte de
 * `ccnmt: packages/agent/host.ts`.
 *
 * El paquete `agent` describe el comportamiento del runtime sin acoplarse a
 * quién lo ejecuta: cada binding (logging, sesión, hooks, red) la instala el
 * proceso host una sola vez con `installAgentHostBindings`, y el resto del
 * paquete la consulta con `getAgentHostBindings()`. Sin bindings instaladas,
 * `getAgentHostBindings()` lanza — un binding individual ausente (todas son
 * opcionales) se resuelve caso por caso con el operador `?.` en el módulo
 * que la consume, nunca aquí.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `AgentHostBindings`
 * de `./contracts.ts` (285 líneas, con ocho tipos más de
 * `./internalTypes.ts`) — ninguno de los dos está portado todavía en este
 * árbol. Este archivo declara el tipo **localmente**, acotado a los
 * bindings que los módulos ya portados de `internal/` consumen
 * (`runtimeSignals.ts`, `sdkRuntime.ts`, `sessionRuntime.ts`,
 * `runtimeBridges.ts`). Es un subconjunto, no una reinvención: cada campo
 * copia la firma exacta que `contracts.ts` declara para ese binding. Se
 * amplía según se porten más módulos de `internal/` que consuman bindings
 * adicionales — no se completa en un solo pase (mismo criterio que
 * `atributos-de-clase-de-modelo.md` en el proyecto hermano `kaupamex-docs`:
 * lo que la fuente declara para el símbolo que se porta, ni más ni menos).
 */
import { HostBindingsError } from './errors.ts'

/**
 * Forma mínima de un mensaje de agente para el binding
 * `createCompactBoundaryMessage`. La fuente usa el `AgentMessage` completo
 * de `internalTypes.ts` (147 líneas, sin portar); aquí basta con que el
 * binding pueda devolver una forma estructural abierta — quien la consuma
 * en `runtimeBridges.ts` la castea a `CompactBoundaryMessage`.
 */
export type AgentMessageLike = Record<string, unknown>

/** La firma exacta que `contracts.ts` declara para `createDumpPromptsFetch`. */
export type DumpPromptsFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type AgentHostBindings = {
  // ── Observabilidad (runtimeSignals.ts) ─────────────────────────────────
  headlessProfilerCheckpoint?: (name: string) => void
  queryCheckpoint?: (name: string) => void
  notifyCommandLifecycle?: (
    uuid: string,
    state: 'started' | 'completed',
  ) => void

  // ── Envelope del SDK (sdkRuntime.ts) ────────────────────────────────────
  getInMemoryErrors?: () => unknown[]
  categorizeRetryableAPIError?: (error: unknown) => unknown
  getTotalAPIDuration?: () => number
  getTotalCost?: () => number
  getModelUsage?: () => Record<string, unknown>
  getFastModeState?: (model: string, fastMode?: boolean) => unknown

  // ── Estado de sesión (sessionRuntime.ts) ────────────────────────────────
  getSessionId?: () => string
  getSdkBetas?: () => string[]
  getCurrentTurnTokenBudget?: () => number
  getTurnOutputTokens?: () => number
  incrementBudgetContinuationCount?: () => void
  getCwdState?: () => string
  setCwdState?: (cwd: string) => void
  getOriginalCwd?: () => string
  isSessionPersistenceDisabled?: () => boolean

  // ── Puentes de runtime (runtimeBridges.ts) ──────────────────────────────
  createCompactBoundaryMessage?: (
    trigger: 'manual' | 'auto',
    preTokens: number,
    lastPreCompactMessageUuid?: string,
    userContext?: string,
    messagesSummarized?: number,
  ) => AgentMessageLike
  recordTranscript?: (
    messages: AgentMessageLike[],
    teamInfo?: unknown,
    startingParentUuidHint?: string,
    allMessages?: readonly AgentMessageLike[],
  ) => Promise<string | null>
  flushSessionStorage?: () => Promise<void>
  recordContentReplacement?: (
    replacements: unknown[],
    agentId?: string,
  ) => Promise<void>
  createDumpPromptsFetch?: (agentIdOrSessionId: string) => DumpPromptsFetch
}

let agentHostBindings: AgentHostBindings | null = null

export function installAgentHostBindings(bindings: AgentHostBindings): void {
  agentHostBindings = bindings
}

export function getAgentHostBindings(): AgentHostBindings {
  if (!agentHostBindings) {
    throw new HostBindingsError(
      'Agent host bindings have not been installed. Install host bindings before using @claude-code-how-works/agent runtime APIs.',
    )
  }
  return agentHostBindings
}
