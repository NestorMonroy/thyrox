import type { AppStateLike as AppState } from './contracts.js'
import { fileHistoryRestoreStateFromLog } from '@thyrox/agent/file-history'
import { feature } from 'bun:bundle'
import { attributionRestoreStateFromLog } from '@thyrox/agent/commitAttribution.js'
import { isTodoV2Enabled } from '@thyrox/agent/tasks.js'
import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import { isGoalCommandEnabled } from '@thyrox/agent/goalStopHook.js'
import { restoreGoalFromTranscript } from '@thyrox/agent/goalStopHook.js'
import { type AgentDefinition } from '@thyrox/tool-registry/tools/AgentTool/loadAgentsDir.js'
import { type AgentDefinitionsResult } from '@thyrox/tool-registry/tools/AgentTool/loadAgentsDir.js'
import { setMainThreadAgentType } from '@thyrox/app-host/bootstrap/state.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getMainLoopModelOverride } from '@thyrox/app-host/bootstrap/state.js'
import { setMainLoopModelOverride } from '@thyrox/app-host/bootstrap/state.js'
import { parseUserSpecifiedModel } from '@thyrox/provider/model.js'
import type { PersistedWorktreeSession } from '@thyrox/agent/logsTypes.js'
import { getCurrentWorktreeSession } from '@thyrox/swarm'
import { saveWorktreeState } from './sessionStorage.js'
import { setCwd } from '@thyrox/shell/Shell.js'
import { setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { restoreWorktreeSession } from '@thyrox/swarm'
import { clearMemoryFileCaches } from './claudemd.js'
import { clearSystemPromptSections } from '@thyrox/provider/systemPromptSections'
import { getPlansDirectory } from './plans.js'
import type { Message } from '@thyrox/agent/messageShapes'
import type { FileHistorySnapshot } from '@thyrox/agent/file-history'
import type { AttributionSnapshotMessage } from '@thyrox/agent/logsTypes.js'
import type { ContextCollapseCommitEntry } from '@thyrox/agent/logsTypes.js'
import type { ContextCollapseSnapshotEntry } from '@thyrox/agent/logsTypes.js'
import type { TodoList } from '@thyrox/tool-registry/todo/types.js'
import { TODO_WRITE_TOOL_NAME } from '@thyrox/tool-registry/tools/TodoWriteTool/constants.js'
import { TodoListSchema } from '@thyrox/tool-registry/todo/types.js'
/**
 * Restauración de sesión al reanudar (`--resume`).
 *
 * Adaptación de ccnmt `packages/storage/src/sessionRestore.ts` (573 líneas).
 *
 * PORTE PARCIAL DECLARADO — sólo se porta `computeStandaloneAgentContext`
 * (1 de más de una docena de símbolos del archivo fuente: entre otros
 * `restoreAgentFromSession`, `restoreFileHistoryFromLastSession`, y el
 * cuerpo de `--resume`/`--continue` que compone el estado inicial del REPL).
 * Es la única función que el conjunto de tests portado hasta ahora ejerce.
 * El resto del archivo depende de tipos y símbolos de `@thyrox/agent`
 * (`AppState`, `refreshAgentDefinitionsForModeSwitch`, bootstrap de
 * mainThreadAgentType) que este paquete no importa todavía (DEC-04) y que
 * no tienen contraparte medida aquí. Se declara ausente en vez de portarse
 * en silencio.
 */

/** El subconjunto de `AppState['standaloneAgentContext']` que esta función produce. */
export interface StandaloneAgentContext {
  name: string
  color: string | undefined
}

/**
 * Calcula el contexto del badge de "agente standalone" que se muestra en el
 * banner del REPL, a partir del nombre y color de agente resueltos al
 * reanudar la sesión.
 *
 * `agentColor === 'default'` es el centinela de "sin color explícito" y se
 * normaliza a `undefined` — sin esta normalización el badge renderizaría la
 * palabra literal "default" como nombre de color.
 */
export function computeStandaloneAgentContext(
  agentName: string | undefined,
  agentColor: string | undefined,
): StandaloneAgentContext | undefined {
  if (!agentName && !agentColor) {
    return undefined
  }
  return {
    name: agentName ?? '',
    color: agentColor === 'default' ? undefined : agentColor,
  }
}

type ResumeResult = {
  messages?: Message[]
  fileHistorySnapshots?: FileHistorySnapshot[]
  attributionSnapshots?: AttributionSnapshotMessage[]
  contextCollapseCommits?: ContextCollapseCommitEntry[]
  contextCollapseSnapshot?: ContextCollapseSnapshotEntry
}
/**
 * Scan the transcript for the last TodoWrite tool_use block and return its todos.
 * Used to hydrate AppState.todos on SDK --resume so the model's todo list
 * survives session restarts without file persistence.
 */
function extractTodosFromTranscript(messages: Message[]): TodoList {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.type !== 'assistant') continue
    const content = msg.message.content as Array<{
      type: string
      name?: string
      input?: unknown
    }>
    const toolUse = content.find(
      block => block.type === 'tool_use' && block.name === TODO_WRITE_TOOL_NAME,
    )
    if (!toolUse || toolUse.type !== 'tool_use') continue
    const input = toolUse.input
    if (input === null || typeof input !== 'object') return []
    const parsed = TodoListSchema().safeParse(
      (input as Record<string, unknown>).todos,
    )
    return parsed.success ? parsed.data : []
  }
  return []
}
/**
 * Restore session state (file history, attribution, todos) from log on resume.
 * Used by both SDK (print.ts) and interactive (REPL.tsx, main.tsx) resume paths.
 */
export function restoreSessionStateFromLog(
  result: ResumeResult,
  setAppState: (f: (prev: AppState) => AppState) => void,
): void {
  // Restore file history state
  if (result.fileHistorySnapshots && result.fileHistorySnapshots.length > 0) {
    fileHistoryRestoreStateFromLog(result.fileHistorySnapshots, newState => {
      setAppState(prev => ({ ...prev, fileHistory: newState }))
    })
  }

  // Restore attribution state (ant-only feature)
  if (
    feature('COMMIT_ATTRIBUTION') &&
    result.attributionSnapshots &&
    result.attributionSnapshots.length > 0
  ) {
    attributionRestoreStateFromLog(result.attributionSnapshots, newState => {
      setAppState(prev => ({ ...prev, attribution: newState }))
    })
  }

  // Restore context-collapse commit log + staged snapshot. Must run before
  // the first query() so projectView() can rebuild the collapsed view from
  // the resumed Message[]. Called unconditionally (even with
  // undefined/empty entries) because restoreFromEntries resets the store
  // first — without that, an in-session /resume into a session with no
  // commits would leave the prior session's stale commit log intact.
  if (feature('CONTEXT_COLLAPSE')) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    ;(
      require('@thyrox/agent/contextCollapse/persist.js') as typeof import('@thyrox/agent/contextCollapse/persist.js')
    ).restoreFromEntries(
      result.contextCollapseCommits ?? [],
      result.contextCollapseSnapshot,
    )
    /* eslint-enable @typescript-eslint/no-require-imports */
  }

  // Restore TodoWrite state from transcript (SDK/non-interactive only).
  // Interactive mode uses file-backed v2 tasks, so AppState.todos is unused there.
  if (!isTodoV2Enabled() && result.messages && result.messages.length > 0) {
    const todos = extractTodosFromTranscript(result.messages)
    if (todos.length > 0) {
      const agentId = getSessionId()
      setAppState(prev => ({
        ...prev,
        todos: { ...prev.todos, [agentId]: todos },
      }))
    }
  }

  // Port of ant v2.1.136 5037.js E0_/cP6 — restore active /goal from the
  // resumed transcript. The Stop hook and AppState.activeGoal both need
  // to be rebuilt so the resumed session resumes its goal-loop behaviour.
  // Gated on `tengu_maple_tide` (isGoalCommandEnabled) so dogfood sessions
  // skip the cost when the feature is off.
  if (isGoalCommandEnabled() && result.messages) {
    restoreGoalFromTranscript(
      result.messages as Parameters<typeof restoreGoalFromTranscript>[0],
      setAppState as Parameters<typeof restoreGoalFromTranscript>[1],
      getSessionId(),
    )
  }
}
/**
 * Restore agent setting from a resumed session.
 *
 * When resuming a conversation that used a custom agent, this re-applies the
 * agent type and model override (unless the user specified --agent on the CLI).
 * Mutates bootstrap state via setMainThreadAgentType / setMainLoopModelOverride.
 *
 * Returns the restored agent definition and its agentType string, or undefined
 * if no agent was restored.
 */
export function restoreAgentFromSession(
  agentSetting: string | undefined,
  currentAgentDefinition: AgentDefinition | undefined,
  agentDefinitions: AgentDefinitionsResult,
): {
  agentDefinition: AgentDefinition | undefined
  agentType: string | undefined
} {
  // If user already specified --agent on CLI, keep that definition
  if (currentAgentDefinition) {
    return { agentDefinition: currentAgentDefinition, agentType: undefined }
  }

  // If session had no agent, clear any stale bootstrap state
  if (!agentSetting) {
    setMainThreadAgentType(undefined)
    return { agentDefinition: undefined, agentType: undefined }
  }

  const resumedAgent = agentDefinitions.activeAgents.find(
    agent => agent.agentType === agentSetting,
  )
  if (!resumedAgent) {
    logForDebugging(
      `Resumed session had agent "${agentSetting}" but it is no longer available. Using default behavior.`,
    )
    setMainThreadAgentType(undefined)
    return { agentDefinition: undefined, agentType: undefined }
  }

  setMainThreadAgentType(resumedAgent.agentType)

  // Apply agent's model if user didn't specify one
  if (
    !getMainLoopModelOverride() &&
    resumedAgent.model &&
    resumedAgent.model !== 'inherit'
  ) {
    setMainLoopModelOverride(parseUserSpecifiedModel(resumedAgent.model))
  }

  return { agentDefinition: resumedAgent, agentType: resumedAgent.agentType }
}
/**
 * Restore the worktree working directory on resume. The transcript records
 * the last worktree enter/exit; if the session crashed while inside a
 * worktree (last entry = session object, not null), cd back into it.
 *
 * process.chdir is the TOCTOU-safe existence check — it throws ENOENT if
 * the /exit dialog removed the directory, or if the user deleted it
 * manually between sessions.
 *
 * When --worktree already created a fresh worktree, that takes precedence
 * over the resumed session's state. restoreSessionMetadata just overwrote
 * project.currentSessionWorktree with the stale transcript value, so
 * re-assert the fresh worktree here before adoptResumedSessionFile writes
 * it back to disk.
 */
export function restoreWorktreeForResume(
  worktreeSession: PersistedWorktreeSession | null | undefined,
): void {
  const fresh = getCurrentWorktreeSession()
  if (fresh) {
    saveWorktreeState(fresh)
    return
  }
  if (!worktreeSession) return

  try {
    process.chdir(worktreeSession.worktreePath)
  } catch {
    // Directory is gone. Override the stale cache so the next
    // reAppendSessionMetadata records "exited" instead of re-persisting
    // a path that no longer exists.
    saveWorktreeState(null)
    return
  }

  setCwd(worktreeSession.worktreePath)
  setOriginalCwd(getCwd())
  // projectRoot is intentionally NOT set here. The transcript doesn't record
  // whether the worktree was entered via --worktree (which sets projectRoot)
  // or EnterWorktreeTool (which doesn't). Leaving projectRoot stable matches
  // EnterWorktreeTool's behavior — skills/history stay anchored to the
  // original project.
  restoreWorktreeSession(worktreeSession)
  // The /resume slash command calls this mid-session after caches have been
  // populated against the old cwd. Cheap no-ops for the CLI-flag path
  // (caches aren't populated yet there).
  clearMemoryFileCaches()
  clearSystemPromptSections()
  getPlansDirectory.cache.clear?.()
}
/**
 * Undo restoreWorktreeForResume before a mid-session /resume switches to
 * another session. Without this, /resume from a worktree session to a
 * non-worktree session leaves the user in the old worktree directory with
 * currentWorktreeSession still pointing at the prior session. /resume to a
 * *different* worktree fails entirely — the getCurrentWorktreeSession()
 * guard above blocks the switch.
 *
 * Not needed by CLI --resume/--continue: those run once at startup where
 * getCurrentWorktreeSession() is only truthy if --worktree was used (fresh
 * worktree that should take precedence, handled by the re-assert above).
 */
export function exitRestoredWorktree(): void {
  const current = getCurrentWorktreeSession()
  if (!current) return

  restoreWorktreeSession(null)
  // Worktree state changed, so cached prompt sections that reference it are
  // stale whether or not chdir succeeds below.
  clearMemoryFileCaches()
  clearSystemPromptSections()
  getPlansDirectory.cache.clear?.()

  try {
    process.chdir(current.originalCwd)
  } catch {
    // Original dir is gone (rare). Stay put — restoreWorktreeForResume
    // will cd into the target worktree next if there is one.
    return
  }
  setCwd(current.originalCwd)
  setOriginalCwd(getCwd())
}
