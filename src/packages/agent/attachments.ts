/**
 * Attachment-cadence config + system-directories path walker — porte
 * PARCIAL DECLARADO de `ccnmt: packages/agent/attachments.ts` (124 029
 * bytes en la fuente).
 *
 * La fuente es el orquestador completo de "system-reminder" attachments:
 * memorias relevantes, recordatorios de plan-mode/auto-mode, TODO
 * reminders, selección de líneas en el IDE, archivos anidados CLAUDE.md
 * por directorio, etc. Este puerto sólo trae los símbolos que sus tests
 * ejercitan hasta ahora — dos ejes independientes, sin cruce entre sí:
 *
 *  1. Las cinco constantes de cadencia/memoria (`TODO_REMINDER_CONFIG`,
 *     `PLAN_MODE_ATTACHMENT_CONFIG`, `AUTO_MODE_ATTACHMENT_CONFIG`,
 *     `RELEVANT_MEMORIES_CONFIG`, `VERIFY_PLAN_REMINDER_CONFIG`) — sus
 *     valores literales SON su contrato (gobiernan cadencia real de
 *     re-inyección), se reproducen verbatim.
 *  2. `getDirectoriesToProcess` — el recorrido puro de directorios que
 *     decide qué `CLAUDE.md`/`.claude/rules/*.md` se cargan por archivo
 *     tocado. Reimplementado (no copiado) a partir del algoritmo de la
 *     fuente: mismo comportamiento observable, escrito de cero.
 *
 *  3. `createAttachmentMessage` — el mensaje de transcripción que envuelve
 *     un adjunto: contrato de `Kd` en 2.1.275 (`chunk-mdt3sxrw.js`).
 *
 *  4. Lo que `compaction/compact.ts` consume al re-anunciar el estado tras
 *     una compactación: `generateFileAttachment` (:3121, con
 *     `tryGetPDFReference`), `getAgentListingDeltaAttachment` (:1592),
 *     `getMcpInstructionsDeltaAttachment` (:1661) y
 *     `getDeferredToolsDeltaAttachment` (:1557). Los tipos de adjunto que
 *     devuelven (`FileAttachment`, `PDFReferenceAttachment`, …) viven en la
 *     fuente en `repl/replTypes/message.js`; aquí `AttachmentMessage` sólo
 *     exige `{ type: string }`, así que se declaran localmente con los
 *     campos que la fuente construye.
 *
 *     Dos de ellas quedan PARCIALES, declaradas, porque su dependencia
 *     vive en un archivo fuera del alcance de este porte:
 *
 *     - `getDeferredToolsDeltaAttachment`: su cálculo
 *       (`getDeferredToolsDelta`, `modelSupportsToolReference`,
 *       `isDeferredToolsDeltaEnabled`, `DeferredToolsDeltaScanContext`)
 *       vive en `toolSearch.ts`, y el gate que este árbol publica
 *       (`provider/src/internal/legacyRuntimeSupport.ts`) devuelve `false`.
 *       Se conserva su firma y las dos guardas que sí existen; hasta que
 *       `toolSearch.ts` porte el resto devuelve `[]`, que es exactamente lo
 *       que la fuente devuelve con el gate cerrado.
 *     - `getAgentListingDeltaAttachment`: su gate
 *       (`shouldInjectAgentListInMessages`) y el formato de cada línea
 *       (`formatAgentLine`) viven en
 *       `tool-registry/src/tools/AgentTool/prompt.ts`, que el mapa de
 *       exports de `@thyrox/tool-registry` NO publica (sí publica
 *       `AgentTool.js`, `constants.js`, `loadAgentsDir.js`…). Hasta que ese
 *       mapa lo exponga, la función conserva su firma y devuelve `[]` —
 *       lo que la fuente devuelve con el gate cerrado—. Por la misma razón
 *       `generateFileAttachment` omite la comprobación previa de tamaño en
 *       modo `at-mention` (`getDefaultFileReadingLimits`, de
 *       `FileReadTool/limits.ts`, tampoco publicado): un archivo demasiado
 *       grande sigue llegando a `FileReadTool`, que lanza
 *       `FileTooLargeError`, y de ahí a la lectura truncada; lo que se
 *       pierde es el corte temprano y su evento de telemetría.
 *
 * NO se portan (sin consumidor en este árbol todavía): el resto del
 * orquestador — `getIdeSelectionAttachment`, `memoryFilesToAttachments`,
 * los builders de plan-mode/auto-mode/TODO reminder que consumen estas
 * constantes, el surfacer de memorias relevantes. Cada uno se trae
 * cuando un test lo ejercite, no antes (mismo criterio que
 * `attachments/mailbox.ts` aplica a su propio recorte).
 */
import uniqBy from 'lodash-es/uniqBy.js'
import { randomUUID, type UUID } from 'node:crypto'
import { dirname, parse, relative, resolve } from 'node:path'
import type { AttachmentMessage, Message, MessageOrigin } from './messageShapes.js'
import { logEvent } from '@thyrox/local-observability'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import type { Tools, ToolPermissionContext, ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import type { TaskType, TaskStatus } from '@thyrox/tool-registry/Task.js'
import { FileReadTool, MaxFileReadTokenExceededError, type Output as FileReadToolOutput, readImageWithTokenBudget } from '@thyrox/tool-registry/tools/FileReadTool/FileReadTool.js'
import { MAX_LINES_TO_READ, FILE_READ_TOOL_NAME } from '@thyrox/tool-registry/tools/FileReadTool/prompt.js'
import { getPDFPageCount } from '@thyrox/tool-registry/pdf.js'
import { FileTooLargeError, readFileInRange } from '@thyrox/repl/readFileInRange.js'
import { getFileModificationTimeAsync } from '@thyrox/storage/file.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { isPDFExtension } from '@thyrox/storage/pdfUtils.js'
import { getConditionalRulesForCwdLevelDirectory, type MemoryFileInfo } from '@thyrox/storage/claudemd.js'
import { getManagedAndUserConditionalRules } from '@thyrox/storage/claudemd.js'
import { PDF_AT_MENTION_INLINE_THRESHOLD } from '@thyrox/provider/apiLimits.js'
import { countCharInString } from '@thyrox/output/utils/stringUtils.js'
import { matchingRuleForInput, pathInAllowedWorkingPath } from '@thyrox/permission/filesystem'
import type { MCPServerConnection } from '@thyrox/mcp-runtime/types.js'
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { type ClientSideInstruction, getMcpInstructionsDelta, isMcpInstructionsDeltaEnabled } from '@thyrox/mcp-runtime/mcpInstructionsDelta'
import { isToolSearchEnabledOptimistic, isToolSearchToolAvailable } from './toolSearch.js'
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from './claudeInChromeCommon.js'
import { CHROME_TOOL_SEARCH_INSTRUCTIONS } from './claudeInChrome/prompt.js'
import { feature } from 'bun:bundle'
import type { Base64ImageSource, ImageBlockParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import type { PastedContent } from '@thyrox/config'
import { isValidImagePaste, getImagePasteIds } from '@thyrox/repl/textInputTypes.js'
import { maybeResizeAndDownsampleImageBlock } from '@thyrox/storage/imageResizer.js'
import { isHumanTurn } from './messagePredicates.js'
import { uniq } from '@thyrox/tool-registry/utils/array.js'
import type { FileStateCache } from '@thyrox/tool-registry/fileStateCache'
import type { Command } from './command'
import type { DiscoverySignal } from './skillSearch/signals.js'
import { checkForAsyncHookResponses, removeDeliveredAsyncHooks } from './hooks/AsyncHookRegistry.js'
import { logForDebugging, logError, logAntError } from './internal/logging.js'
import { jsonStringify, isENOENT, isEnvTruthy } from './internalUtils.js'
import type { QueuedCommand } from '@thyrox/repl/textInputTypes.js'
import type { IDESelection } from '@thyrox/ide/hooks/useIdeSelection.js'
import type { QuerySource } from './querySource.js'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability'
import { needsAutoModeExitAttachment, setNeedsAutoModeExitAttachment, getSdkBetas, getKairosActive, getLastEmittedDate, setLastEmittedDate, getTotalCostUSD, hasExitedPlanModeInSession, setHasExitedPlanMode, needsPlanModeExitAttachment, setNeedsPlanModeExitAttachment, getSessionId, getProjectRoot, getTotalOutputTokens, getCurrentTurnTokenBudget, getTurnOutputTokens } from '@thyrox/app-host/bootstrap/state.js'
import { cacheKeys } from '@thyrox/tool-registry/fileStateCache'
import { getSnippetForTwoFileDiff } from '@thyrox/tool-registry/tools/FileEditTool/utils.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { getContextWindowForModel } from './context.js'
import { isAutoCompactEnabled, getEffectiveContextWindowSize } from './compaction/autoCompact.js'
import { tokenCountWithEstimation, tokenCountFromLastAPIResponse } from './tokens.js'
import { getLocalISODate } from '@thyrox/config/commonConstants.js'
import { flushOnDateChange } from './sessionTranscript/sessionTranscript.js'
import { toolMatchesName } from '@thyrox/tool-registry/Tool.js'
import { BASH_TOOL_NAME } from '@thyrox/tool-registry/tools/BashTool/toolName.js'
import { diagnosticTracker, type DiagnosticFile } from '@thyrox/tool-registry/diagnosticTracking.js'
import { readdir, stat } from 'node:fs/promises'
import { checkForLSPDiagnostics, clearAllLSPDiagnostics } from '@thyrox/ide/lsp/LSPDiagnosticRegistry.js'
import { toError, isAbortError } from '@thyrox/local-observability/errorHelpers.js'
import { getOriginalCwd } from './internal/sessionRuntime.js'
import { getPlan, getPlanFilePath } from '@thyrox/storage/plans.js'
import { extractTextContent, getUserMessageText, isThinkingMessage } from './messages.js'
import { getConnectedIdeName } from '@thyrox/ide/ide.js'
import { TASK_UPDATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskUpdateTool/constants.js'
import { readEnv } from '@thyrox/config/env/utils'
import { listTasks, getTaskListId, isTodoV2Enabled } from './tasks.js'
import { TASK_CREATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskCreateTool/constants.js'
import { TODO_WRITE_TOOL_NAME } from '@thyrox/tool-registry/tools/TodoWriteTool/constants.js'
import { hasUltrathinkKeyword, isUltrathinkEnabled } from '@thyrox/provider/thinking.js'
import { applyTaskOffsetsAndEvictions, generateTaskAttachments } from './task/framework.js'
import { getTaskOutputPath } from '@thyrox/storage/task/diskOutput.js'
import type { AgentDefinition } from '@thyrox/tool-registry/tools/AgentTool/loadAgentsDir.js'
import { memoryAge, memoryFreshnessText } from '@thyrox/memory/memoryAge'
import { isAutoMemoryEnabled, getAutoMemPath } from '@thyrox/memory/paths'
import { createChildAbortController, createAbortController } from './abortController.js'
import { findRelevantMemories } from '@thyrox/memory'
import { getAgentMemoryDir } from '@thyrox/memory/agentMemory'
import { SKILL_TOOL_NAME } from '@thyrox/tool-registry/tools/SkillTool/constants.js'
import { formatCommandsWithinBudget } from '@thyrox/tool-registry/tools/SkillTool/prompt.js'
import { getSkillToolCommands, getMcpSkillCommands } from '@thyrox/command-runtime/runtime'
import { expandPath } from '@thyrox/storage/path.js'
import { emitAtMention } from './atMentionTelemetry.js'
import type { HookEvent } from './types/hooks.js'
import type { SyncHookJSONOutput } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type { HookBlockingError } from './hooks.js'
import type { Task } from './tasks.js'
import type { TodoList } from '@thyrox/tool-registry/todo/types.js'
import { isWorkflowsEnabled } from './goalStopHook.js'
import { isAgentSwarmsEnabled } from './agentSwarmsEnabled.js'
import { drainPendingMessages } from './localAgentTask.js'
import { getSettings } from '@thyrox/config/settings'
import { hasUltraworkKeyword } from '@thyrox/repl/ultraplan/keyword.js'
import { getTeamContextAttachment, getTeammateMailboxAttachments } from './attachments/mailbox.js'





// Declaraciones copiadas verbatim de la fuente (ítem __declarations__:types).

export type AgentMentionAttachment = {
  type: 'agent_mention'
  agentType: string
}

export type AsyncHookResponseAttachment = {
  type: 'async_hook_response'
  processId: string
  hookName: string
  hookEvent: HookEvent | 'StatusLine' | 'FileSuggestion'
  toolName?: string
  response: SyncHookJSONOutput
  stdout: string
  stderr: string
  exitCode?: number
}

export type HookAttachment =
  | HookCancelledAttachment
  | {
      type: 'hook_blocking_error'
      blockingError: HookBlockingError
      hookName: string
      toolUseID: string
      hookEvent: HookEvent
    }
  | HookNonBlockingErrorAttachment
  | HookErrorDuringExecutionAttachment
  | {
      type: 'hook_stopped_continuation'
      message: string
      hookName: string
      toolUseID: string
      hookEvent: HookEvent
    }
  | HookSuccessAttachment
  | {
      type: 'hook_additional_context'
      content: string[]
      hookName: string
      toolUseID: string
      hookEvent: HookEvent
    }
  | HookSystemMessageAttachment
  | HookPermissionDecisionAttachment

export type HookPermissionDecisionAttachment = {
  type: 'hook_permission_decision'
  decision: 'allow' | 'deny'
  toolUseID: string
  hookEvent: HookEvent
}

export type HookSystemMessageAttachment = {
  type: 'hook_system_message'
  content: string
  hookName: string
  toolUseID: string
  hookEvent: HookEvent
}

export type HookCancelledAttachment = {
  type: 'hook_cancelled'
  hookName: string
  toolUseID: string
  hookEvent: HookEvent
  command?: string
  durationMs?: number
}

export type HookErrorDuringExecutionAttachment = {
  type: 'hook_error_during_execution'
  content: string
  hookName: string
  toolUseID: string
  hookEvent: HookEvent
  command?: string
  durationMs?: number
}

export type HookSuccessAttachment = {
  type: 'hook_success'
  content: string
  hookName: string
  toolUseID: string
  hookEvent: HookEvent
  stdout?: string
  stderr?: string
  exitCode?: number
  command?: string
  durationMs?: number
}

export type HookNonBlockingErrorAttachment = {
  type: 'hook_non_blocking_error'
  hookName: string
  stderr: string
  stdout: string
  exitCode: number
  toolUseID: string
  hookEvent: HookEvent
  command?: string
  durationMs?: number
}

export type Attachment =
  /**
   * User at-mentioned the file
   */
  | FileAttachment
  | CompactFileReferenceAttachment
  | PDFReferenceAttachment
  | AlreadyReadFileAttachment
  /**
   * An at-mentioned file was edited
   */
  | {
      type: 'edited_text_file'
      filename: string
      snippet: string
    }
  | {
      type: 'edited_image_file'
      filename: string
      content: FileReadToolOutput
    }
  | {
      type: 'directory'
      path: string
      content: string
      /** Path relative to CWD at creation time, for stable display */
      displayPath: string
    }
  | {
      type: 'selected_lines_in_ide'
      ideName: string
      lineStart: number
      lineEnd: number
      filename: string
      content: string
      /** Path relative to CWD at creation time, for stable display */
      displayPath: string
    }
  | {
      type: 'opened_file_in_ide'
      filename: string
    }
  | {
      type: 'todo_reminder'
      content: TodoList
      itemCount: number
    }
  | {
      type: 'task_reminder'
      content: Task[]
      itemCount: number
    }
  | {
      type: 'nested_memory'
      path: string
      content: MemoryFileInfo
      /** Path relative to CWD at creation time, for stable display */
      displayPath: string
    }
  | {
      type: 'relevant_memories'
      memories: {
        path: string
        content: string
        mtimeMs: number
        /**
         * Pre-computed header string (age + path prefix).  Computed once
         * at attachment-creation time so the rendered bytes are stable
         * across turns — recomputing memoryAge(mtimeMs) at render time
         * calls Date.now(), so "saved 3 days ago" becomes "saved 4 days
         * ago" across turns → different bytes → prompt cache bust.
         * Optional for backward compat with resumed sessions; render
         * path falls back to recomputing if missing.
         */
        header?: string
        /**
         * lineCount when the file was truncated by readMemoriesForSurfacing,
         * else undefined. Threaded to the readFileState write so
         * getChangedFiles skips truncated memories (partial content would
         * yield a misleading diff).
         */
        limit?: number
      }[]
    }
  | {
      type: 'dynamic_skill'
      skillDir: string
      skillNames: string[]
      /** Path relative to CWD at creation time, for stable display */
      displayPath: string
    }
  | {
      type: 'skill_listing'
      content: string
      skillCount: number
      isInitial: boolean
    }
  | {
      type: 'skill_discovery'
      skills: { name: string; description: string; shortId?: string }[]
      signal: DiscoverySignal
      source: 'native' | 'aki' | 'both'
    }
  | {
      type: 'queued_command'
      prompt: string | Array<ContentBlockParam>
      source_uuid?: UUID
      imagePasteIds?: number[]
      /** Original queue mode — 'prompt' for user messages, 'task-notification' for system events */
      commandMode?: string
      /** Provenance carried from QueuedCommand so mid-turn drains preserve it */
      origin?: MessageOrigin
      /** Carried from QueuedCommand.isMeta — distinguishes human-typed from system-injected */
      isMeta?: boolean
    }
  | {
      type: 'output_style'
      style: string
    }
  | {
      type: 'diagnostics'
      files: DiagnosticFile[]
      isNew: boolean
    }
  | {
      type: 'plan_mode'
      reminderType: 'full' | 'sparse'
      isSubAgent?: boolean
      planFilePath: string
      planExists: boolean
    }
  | {
      type: 'plan_mode_reentry'
      planFilePath: string
    }
  | {
      type: 'plan_mode_exit'
      planFilePath: string
      planExists: boolean
    }
  | {
      type: 'auto_mode'
      reminderType: 'full' | 'sparse'
    }
  | {
      type: 'auto_mode_exit'
    }
  | {
      type: 'critical_system_reminder'
      content: string
    }
  | {
      type: 'plan_file_reference'
      planFilePath: string
      planContent: string
    }
  | {
      type: 'mcp_resource'
      server: string
      uri: string
      name: string
      description?: string
      content: ReadResourceResult
    }
  | {
      type: 'command_permissions'
      allowedTools: string[]
      model?: string
    }
  | AgentMentionAttachment
  | {
      type: 'task_status'
      taskId: string
      taskType: TaskType
      status: TaskStatus
      description: string
      deltaSummary: string | null
      outputFilePath?: string
    }
  | AsyncHookResponseAttachment
  | {
      type: 'token_usage'
      used: number
      total: number
      remaining: number
    }
  | {
      type: 'budget_usd'
      used: number
      total: number
      remaining: number
    }
  | {
      type: 'output_token_usage'
      turn: number
      session: number
      budget: number | null
    }
  | {
      type: 'structured_output'
      data: unknown
    }
  | TeammateMailboxAttachment
  | TeamContextAttachment
  | HookAttachment
  | {
      type: 'invoked_skills'
      skills: Array<{
        name: string
        path: string
        content: string
      }>
    }
  | {
      type: 'verify_plan_reminder'
    }
  | {
      type: 'max_turns_reached'
      maxTurns: number
      turnCount: number
    }
  | {
      type: 'current_session_memory'
      content: string
      path: string
      tokenCount: number
    }
  | {
      type: 'teammate_shutdown_batch'
      count: number
    }
  | {
      type: 'compaction_reminder'
    }
  | {
      type: 'context_efficiency'
    }
  | {
      type: 'date_change'
      newDate: string
    }
  | {
      type: 'ultrathink_effort'
      level: 'high'
    }
  | {
      // ant 4135.js FZ3 / 4269.js — the user typed `ultrawork`, asking the
      // model to drive the request through the autonomous-work (workflow)
      // path rather than answering inline. ccb has no Workflow tool; the
      // renderer steers the model into the /goal Stop-hook loop instead.
      type: 'ultrawork_request'
    }
  | {
      type: 'deferred_tools_delta'
      addedNames: string[]
      addedLines: string[]
      removedNames: string[]
    }
  | {
      type: 'agent_listing_delta'
      addedTypes: string[]
      addedLines: string[]
      removedTypes: string[]
      /** True when this is the first announcement in the conversation */
      isInitial: boolean
      /** Whether to include the "launch multiple agents concurrently" note (non-pro subscriptions) */
      showConcurrencyNote: boolean
    }
  | {
      type: 'mcp_instructions_delta'
      addedNames: string[]
      addedBlocks: string[]
      removedNames: string[]
    }
  | {
      type: 'bagel_console'
      errorCount: number
      warningCount: number
      sample: string
    }
  | {
      type: 'goal_status'
      met: boolean
      condition: string
      sentinel?: boolean
      reason?: string
      iterations?: number
      durationMs?: number
      tokens?: number
      // ant v2.1.143: only meaningful when met=false. Indicates the goal
      // was judged genuinely unachievable by the prompt-hook evaluator.
      // Renders as red "Goal could not be achieved" instead of dim
      // "Goal not yet met… continuing".
      failed?: boolean
    }

export type TeammateMailboxAttachment = {
  type: 'teammate_mailbox'
  messages: Array<{
    from: string
    text: string
    timestamp: string
    color?: string
    summary?: string
  }>
}

export type TeamContextAttachment = {
  type: 'team_context'
  agentId: string
  agentName: string
  teamName: string
  teamConfigPath: string
  taskListPath: string
}

export type MemoryPrefetch = {
  promise: Promise<Attachment[]>
  /** Set by promise.finally(). null until the promise settles. */
  settledAt: number | null
  /** Set by the collect point in query.ts. -1 until consumed. */
  consumedOnIteration: number
  [Symbol.dispose](): void
}

interface AtMentionedFileLines {
  filename: string
  lineStart?: number
  lineEnd?: number
}








export const TODO_REMINDER_CONFIG = {
  TURNS_SINCE_WRITE: 10,
  TURNS_BETWEEN_REMINDERS: 10,
} as const

export const PLAN_MODE_ATTACHMENT_CONFIG = {
  TURNS_BETWEEN_ATTACHMENTS: 5,
  FULL_REMINDER_EVERY_N_ATTACHMENTS: 5,
} as const

export const AUTO_MODE_ATTACHMENT_CONFIG = {
  TURNS_BETWEEN_ATTACHMENTS: 5,
  FULL_REMINDER_EVERY_N_ATTACHMENTS: 5,
} as const

export const RELEVANT_MEMORIES_CONFIG = {
  // Presupuesto por turno: 5 archivos × 4KB = 20KB. El tope de sesión es
  // ~3 inyecciones completas (60KB); pasado eso, las memorias más
  // relevantes ya están en contexto y seguir buscando no aporta.
  MAX_SESSION_BYTES: 60 * 1024,
} as const

export const VERIFY_PLAN_REMINDER_CONFIG = {
  TURNS_BETWEEN_REMINDERS: 10,
} as const

/**
 * Directorios a recorrer para cargar memoria anidada (CLAUDE.md +
 * `.claude/rules/*.md`) al tocar `targetPath` desde `originalCwd`.
 *
 * Devuelve dos listas, ambas ordenadas de padre a hijo:
 *  - `nestedDirs`: directorios ENTRE `originalCwd` y el directorio de
 *    `targetPath` (se procesan para CLAUDE.md + TODAS las reglas).
 *  - `cwdLevelDirs`: directorios desde la raíz del filesystem hasta
 *    `originalCwd` (se procesan sólo para reglas condicionales).
 *
 * `targetPath` se resuelve con `resolve()` — un path relativo se
 * resuelve contra `process.cwd()`, no contra `originalCwd`.
 */
export function getDirectoriesToProcess(
  targetPath: string,
  originalCwd: string,
): { nestedDirs: string[]; cwdLevelDirs: string[] } {
  const targetDir = dirname(resolve(targetPath))

  const nestedDirs: string[] = []
  let cursor = targetDir
  while (cursor !== originalCwd && cursor !== parse(cursor).root) {
    if (cursor.startsWith(originalCwd)) {
      nestedDirs.push(cursor)
    }
    cursor = dirname(cursor)
  }
  nestedDirs.reverse()

  const cwdLevelDirs: string[] = []
  cursor = originalCwd
  while (cursor !== parse(cursor).root) {
    cwdLevelDirs.push(cursor)
    cursor = dirname(cursor)
  }
  cwdLevelDirs.reverse()

  return { nestedDirs, cwdLevelDirs }
}

/**
 * Envuelve un adjunto en un mensaje de transcripción con su propio uuid y
 * la marca de tiempo ISO de su creación (≙ `Kd` de 2.1.275).
 */
export function createAttachmentMessage<T extends { type: string }>(attachment: T): AttachmentMessage<T> {
  return {
    type: 'attachment',
    attachment,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  } as AttachmentMessage<T>
}

// ---------------------------------------------------------------------------
// Estado del listado de skills — porte de 2.1.275 (2026-09-24): la clase
// `xJn` por sesión y `VB`, `I1r`, `P1r`, `M6n`, `O6n`, `eCs`
// (`chunk-q2gh92k2.js`). Recuerda qué skills se anunciaron a cada agente
// (clave vacía = hilo principal) para anunciar sólo las nuevas.
// ---------------------------------------------------------------------------

type SkillListingState = {
  sentSkillNames: Map<string, Set<string>>
  suppressNext: boolean
  resumeSeedNames: Set<string> | null
}

const skillListingBySession = new Map<string, SkillListingState>()

// `c7`: el estado de la sesión actual; sin estado de app, una sesión única.
function skillListingState(): SkillListingState {
  let session = 'default'
  try {
    session = require('@thyrox/app-host/bootstrap/state.js').getSessionId() ?? session
  } catch {}
  let state = skillListingBySession.get(session)
  if (!state) {
    state = { sentSkillNames: new Map(), suppressNext: false, resumeSeedNames: null }
    skillListingBySession.set(session, state)
  }
  return state
}

/** `VB`: olvida todo lo anunciado, la supresión y la semilla. */
export function resetSentSkillNames(): void {
  const state = skillListingState()
  state.sentSkillNames.clear()
  state.suppressNext = false
  state.resumeSeedNames = null
}

/** `I1r`: el próximo listado del hilo principal se da por visto (p. ej. al reanudar). */
export function suppressNextSkillListing(): void {
  skillListingState().suppressNext = true
}

/** `P1r`: nombres que la transcripción reanudada ya anunció. */
export function seedSentSkillNames(names: Iterable<string>): void {
  const state = skillListingState()
  if (state.resumeSeedNames === null) state.resumeSeedNames = new Set()
  for (const name of names) state.resumeSeedNames.add(name)
}

/** `M6n`: olvida lo anunciado a un agente. */
export function forgetSentSkillsForAgent(agentId: string): void {
  skillListingState().sentSkillNames.delete(agentId)
}

/** `O6n`: olvida unos nombres en todos los agentes, y en la semilla. */
export function forgetSentSkillNames(names: Iterable<string>): void {
  const state = skillListingState()
  const list = [...names]
  for (const sent of state.sentSkillNames.values()) for (const name of list) sent.delete(name)
  if (state.resumeSeedNames !== null) for (const name of list) state.resumeSeedNames.delete(name)
}

/**
 * `eCs`: las skills que faltan por anunciar a ese agente, y si es el primer
 * anuncio; `null` si no hay nada nuevo. La semilla y la supresión sólo
 * valen para el hilo principal y se consumen al usarse.
 */
export function getSkillListingDelta<S extends { name: string }>(
  agentId: string | undefined,
  skills: S[],
): { newSkills: S[]; isInitial: boolean } | null {
  const state = skillListingState()
  const key = agentId ?? ''
  let sent = state.sentSkillNames.get(key)
  if (!sent) state.sentSkillNames.set(key, (sent = new Set()))
  if (state.resumeSeedNames !== null && agentId === undefined) {
    for (const skill of skills) if (state.resumeSeedNames.has(skill.name)) sent.add(skill.name)
    state.resumeSeedNames = null
  }
  if (state.suppressNext && agentId === undefined) {
    state.suppressNext = false
    for (const skill of skills) sent.add(skill.name)
    return null
  }
  const newSkills = skills.filter(skill => !sent!.has(skill.name))
  if (newSkills.length === 0) return null
  const isInitial = sent.size === 0
  for (const skill of newSkills) sent.add(skill.name)
  return { newSkills, isInitial }
}

// ---------------------------------------------------------------------------
// Adjuntos de archivo y re-anuncio de estado tras compactación — porte de
// `ccnmt: packages/agent/attachments.ts` (:1557-1688, :3087-3300, :3813).
// ---------------------------------------------------------------------------

/**
 * Un adjunto de estado: lo único que `AttachmentMessage` exige es su `type`.
 * NO se exporta: `repl/components/messages/AttachmentMessage.tsx` importa un
 * `Attachment` de este módulo esperando la unión discriminada de la fuente
 * (`repl/replTypes/message.js`), y publicar aquí esta forma laxa le
 * volvería `unknown` cada campo (medido: 8 → 78 errores en ese archivo).
 */
type StateAttachment = { type: string; [key: string]: unknown }

export type FileAttachment = {
  type: 'file'
  filename: string
  content: FileReadToolOutput
  truncated?: boolean
  displayPath: string
}

export type CompactFileReferenceAttachment = {
  type: 'compact_file_reference'
  filename: string
  displayPath: string
}

export type PDFReferenceAttachment = {
  type: 'pdf_reference'
  filename: string
  pageCount: number
  fileSize: number
  displayPath: string
}

export type AlreadyReadFileAttachment = {
  type: 'already_read_file'
  filename: string
  displayPath: string
  content: {
    type: 'text'
    file: {
      filePath: string
      content: string
      numLines: number
      startLine: number
      totalLines: number
    }
  }
}

/**
 * Sitio de llamada del escaneo de herramientas diferidas
 * (`ccnmt: packages/agent/toolSearch.ts:618`). Su hogar es `toolSearch.ts`;
 * se declara aquí porque ese archivo queda fuera de este porte y la firma de
 * `getDeferredToolsDeltaAttachment` lo necesita.
 */
export type DeferredToolsDeltaScanContext = {
  callSite: 'attachments_main' | 'attachments_subagent' | 'compact_full' | 'compact_partial' | 'reactive_compact'
  querySource?: string
}

/**
 * Diferencia entre el pool de herramientas diferidas y lo ya anunciado en
 * la conversación (`ccnmt: attachments.ts:1557`).
 *
 * PARCIAL, declarado en la cabecera: el gate y el cálculo del delta viven en
 * `toolSearch.ts`, fuera de este porte. Las dos guardas que sí existen se
 * conservan en su orden; el resto devuelve `[]`, que es lo que la fuente
 * devuelve con `isDeferredToolsDeltaEnabled()` cerrado — el valor que este
 * árbol publica hoy.
 */
export function getDeferredToolsDeltaAttachment(
  tools: Tools,
  model: string,
  messages: Message[] | undefined,
  scanContext?: DeferredToolsDeltaScanContext,
): StateAttachment[] {
  // pendiente: `isDeferredToolsDeltaEnabled()` (toolSearch.ts:639) — el gate
  // de este árbol devuelve false, así que la fuente cortaría aquí.
  if (!isToolSearchEnabledOptimistic()) return []
  if (!isToolSearchToolAvailable(tools)) return []
  // pendiente: `modelSupportsToolReference(model)` (toolSearch.ts:239) y
  // `getDeferredToolsDelta(tools, messages ?? [], scanContext)`
  // (toolSearch.ts:653) — sin ellos no hay delta que anunciar.
  void model
  void messages
  void scanContext
  return []
}

/**
 * Diferencia entre el pool de agentes filtrado y lo ya anunciado en la
 * conversación, reconstruido de los `agent_listing_delta` previos
 * (`ccnmt: attachments.ts:1592`). Exportada para `compact.ts`: tras
 * compactar, re-anuncia el pool entero.
 *
 * PARCIAL, declarado en la cabecera: devuelve `[]` hasta que
 * `@thyrox/tool-registry` publique `tools/AgentTool/prompt.js`.
 */
export function getAgentListingDeltaAttachment(
  toolUseContext: ToolUseContext,
  messages: Message[] | undefined,
): StateAttachment[] {
  // pendiente: `shouldInjectAgentListInMessages()` (AgentTool/prompt.ts:59)
  // es el gate de la fuente, y `formatAgentLine` (:43) el formato de cada
  // línea anunciada; el filtrado (requisitos MCP → reglas de denegación →
  // `allowedAgentTypes`) y la reconstrucción de lo ya anunciado a partir
  // de los `agent_listing_delta` del historial van detrás de ese gate.
  void toolUseContext
  void messages
  return []
}

/**
 * Exportada para `compact.ts` / `reactiveCompact.ts` — única fuente del gate
 * (`ccnmt: attachments.ts:1661`).
 */
export function getMcpInstructionsDeltaAttachment(
  mcpClients: MCPServerConnection[],
  tools: Tools,
  model: string,
  messages: Message[] | undefined,
): StateAttachment[] {
  if (!isMcpInstructionsDeltaEnabled()) return []

  // La pista de ToolSearch para Chrome la redacta el cliente y depende de
  // ToolSearch; las `instructions` reales del servidor son incondicionales.
  // La parte del cliente se decide aquí y entra al diff como una entrada
  // sintetizada.
  // pendiente: `modelSupportsToolReference(model)` (toolSearch.ts:239) — la
  // tercera condición de la fuente para la pista de Chrome; sin ella la
  // pista se anuncia sólo con las dos guardas que este árbol tiene.
  void model
  const clientSide: ClientSideInstruction[] = []
  if (isToolSearchEnabledOptimistic() && isToolSearchToolAvailable(tools)) {
    clientSide.push({
      serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME,
      block: CHROME_TOOL_SEARCH_INSTRUCTIONS,
    })
  }

  const delta = getMcpInstructionsDelta(mcpClients, messages ?? [], clientSide)
  if (!delta) return []
  return [{ type: 'mcp_instructions_delta', ...delta }]
}

export async function tryGetPDFReference(filename: string): Promise<PDFReferenceAttachment | null> {
  const ext = parse(filename).ext.toLowerCase()
  if (!isPDFExtension(ext)) {
    return null
  }
  try {
    const [stats, pageCount] = await Promise.all([getFsImplementation().stat(filename), getPDFPageCount(filename)])
    // Con conteo de páginas se usa; si no, heurística de tamaño (~100KB por página).
    const effectivePageCount = pageCount ?? Math.ceil(stats.size / (100 * 1024))
    if (effectivePageCount > PDF_AT_MENTION_INLINE_THRESHOLD) {
      logEvent('tengu_pdf_reference_attachment', {
        pageCount: effectivePageCount,
        fileSize: stats.size,
        hadPdfinfo: pageCount !== null,
      })
      return {
        type: 'pdf_reference',
        filename,
        pageCount: effectivePageCount,
        fileSize: stats.size,
        displayPath: relative(getCwd(), filename),
      }
    }
  } catch {
    // Si no se puede hacer stat, null: sigue la lectura normal.
  }
  return null
}

/**
 * Lee un archivo con FileReadTool (contenido fresco, validación propia) y lo
 * envuelve como adjunto (`ccnmt: attachments.ts:3121`). En modo `compact` un
 * archivo demasiado grande se reduce a una referencia; en `at-mention` a su
 * cabecera.
 */
export async function generateFileAttachment(
  filename: string,
  toolUseContext: ToolUseContext,
  successEventName: string,
  errorEventName: string,
  mode: 'compact' | 'at-mention',
  options?: {
    offset?: number
    limit?: number
  },
): Promise<FileAttachment | CompactFileReferenceAttachment | PDFReferenceAttachment | AlreadyReadFileAttachment | null> {
  const { offset, limit } = options ?? {}

  // ¿Hay una regla de denegación para este archivo?
  const appState = toolUseContext.getAppState()
  if (isFileReadDenied(filename, appState.toolPermissionContext)) {
    return null
  }

  // pendiente: en modo `at-mention` la fuente corta antes de leer si el
  // archivo supera `getDefaultFileReadingLimits().maxSizeBytes`
  // (`FileReadTool/limits.ts`, no publicado por `@thyrox/tool-registry`) y
  // emite `tengu_attachment_file_too_large`; aquí el archivo grande llega a
  // `FileReadTool`, que lanza `FileTooLargeError`, y cae a la lectura
  // truncada de más abajo.

  // Un PDF grande mencionado con @ se devuelve como referencia ligera.
  if (mode === 'at-mention') {
    const pdfRef = await tryGetPDFReference(filename)
    if (pdfRef) {
      return pdfRef
    }
  }

  // ¿El archivo ya está en contexto con su versión más reciente?
  const existingFileState = toolUseContext.readFileState.get(filename)
  if (existingFileState && mode === 'at-mention') {
    try {
      const mtimeMs = await getFileModificationTimeAsync(filename)

      // FileReadTool guarda Date.now() al leer; FileEdit/Write guardan el
      // mtimeMs del archivo. Sólo con un timestamp que coincida con el
      // mtime se puede afirmar que el archivo no cambió.
      if (existingFileState.timestamp <= mtimeMs && mtimeMs === existingFileState.timestamp) {
        logEvent(successEventName, {})
        return {
          type: 'already_read_file',
          filename,
          displayPath: relative(getCwd(), filename),
          content: {
            type: 'text',
            file: {
              filePath: filename,
              content: existingFileState.content,
              numLines: countCharInString(existingFileState.content, '\n') + 1,
              startLine: offset ?? 1,
              totalLines: countCharInString(existingFileState.content, '\n') + 1,
            },
          },
        }
      }
    } catch {
      // Sin stat, sigue la lectura normal.
    }
  }

  try {
    const fileInput = {
      file_path: filename,
      offset,
      limit,
    }

    const readTruncatedFile = async (): Promise<FileAttachment | CompactFileReferenceAttachment | null> => {
      if (mode === 'compact') {
        return {
          type: 'compact_file_reference',
          filename,
          displayPath: relative(getCwd(), filename),
        }
      }

      // Reglas de denegación también antes de la lectura truncada.
      const appState = toolUseContext.getAppState()
      if (isFileReadDenied(filename, appState.toolPermissionContext)) {
        return null
      }

      try {
        // Sólo las primeras MAX_LINES_TO_READ líneas de un archivo demasiado grande.
        const truncatedInput = {
          file_path: filename,
          offset: offset ?? 1,
          limit: MAX_LINES_TO_READ,
        }
        const result = await FileReadTool.call(truncatedInput, toolUseContext)
        logEvent(successEventName, {})

        return {
          type: 'file',
          filename,
          content: result.data,
          truncated: true,
          displayPath: relative(getCwd(), filename),
        }
      } catch {
        logEvent(errorEventName, {})
        return null
      }
    }

    // ¿La ruta es válida?
    const isValid = await FileReadTool.validateInput(fileInput, toolUseContext)
    if (!isValid.result) {
      return null
    }

    try {
      const result = await FileReadTool.call(fileInput, toolUseContext)
      logEvent(successEventName, {})
      return {
        type: 'file',
        filename,
        content: result.data,
        displayPath: relative(getCwd(), filename),
      }
    } catch (error) {
      if (error instanceof MaxFileReadTokenExceededError || error instanceof FileTooLargeError) {
        return await readTruncatedFile()
      }
      throw error
    }
  } catch {
    logEvent(errorEventName, {})
    return null
  }
}

function isFileReadDenied(filePath: string, toolPermissionContext: ToolPermissionContext): boolean {
  const denyRule = matchingRuleForInput(filePath, toolPermissionContext, 'read', 'deny')
  return denyRule !== null
}

// --- porte por miembros: un ancla por ítem ---
const skillSearchModules = feature('EXPERIMENTAL_SKILL_SEARCH')
  ? {
      featureCheck:
        require('@thyrox/command-runtime/skills/featureCheck.js') as typeof import('@thyrox/command-runtime/skills/featureCheck.js'),
      prefetch:
        require('./skillSearch/prefetch.js') as typeof import('./skillSearch/prefetch.js'),
    }
  : null
const autoModeStateModule = feature('TRANSCRIPT_CLASSIFIER')
  ? (require('@thyrox/permission/autoModeState.js') as typeof import('@thyrox/permission/autoModeState.js'))
  : null
const BRIEF_TOOL_NAME: string | null =
  feature('KAIROS') || feature('KAIROS_BRIEF')
    ? (
        require('@thyrox/tool-registry/tools/BriefTool/prompt.js') as typeof import('@thyrox/tool-registry/tools/BriefTool/prompt.js')
      ).BRIEF_TOOL_NAME
    : null
const MAX_MEMORY_LINES = 200
const MAX_MEMORY_BYTES = 4096
const INLINE_NOTIFICATION_MODES = new Set(['prompt', 'task-notification'])
const sentSkillNames = new Map<string, Set<string>>()
let suppressNext = false
const FILTERED_LISTING_MAX = 30
async function buildImageContentBlocks(
  pastedContents: Record<number, PastedContent> | undefined,
): Promise<ImageBlockParam[]> {
  if (!pastedContents) {
    return []
  }
  const imageContents = Object.values(pastedContents).filter(isValidImagePaste)
  if (imageContents.length === 0) {
    return []
  }
  const results = await Promise.all(
    imageContents.map(async img => {
      const imageBlock: ImageBlockParam = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: (img.mediaType ||
            'image/png') as Base64ImageSource['media_type'],
          data: img.content,
        },
      }
      const resized = await maybeResizeAndDownsampleImageBlock(imageBlock)
      return resized.block
    }),
  )
  return results
}
export function collectRecentSuccessfulTools(
  messages: ReadonlyArray<Message>,
  lastUserMessage: Message,
): readonly string[] {
  const useIdToName = new Map<string, string>()
  const resultByUseId = new Map<string, boolean>()
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m) continue
    if (isHumanTurn(m) && m !== lastUserMessage) break
    if (m.type === 'assistant' && m.message.content !== undefined && typeof m.message.content !== 'string') {
      for (const block of m.message.content) {
        if (block.type === 'tool_use') useIdToName.set(block.id, block.name)
      }
    } else if (
      m.type === 'user' &&
      'message' in m &&
      Array.isArray(m.message.content)
    ) {
      for (const block of m.message.content) {
        if (isToolResultBlock(block)) {
          resultByUseId.set(block.tool_use_id, block.is_error === true)
        }
      }
    }
  }
  const failed = new Set<string>()
  const succeeded = new Set<string>()
  for (const [id, name] of useIdToName) {
    const errored = resultByUseId.get(id)
    if (errored === undefined) continue
    if (errored) {
      failed.add(name)
    } else {
      succeeded.add(name)
    }
  }
  return [...succeeded].filter(t => !failed.has(t))
}
/**
 * Scan messages for past relevant_memories attachments.  Returns both the
 * set of surfaced paths (for selector de-dup) and cumulative byte count
 * (for session-total throttle).  Scanning messages rather than tracking
 * in toolUseContext means compact naturally resets both — old attachments
 * are gone from the compacted transcript, so re-surfacing is valid again.
 */
export function collectSurfacedMemories(messages: ReadonlyArray<Message>): {
  paths: Set<string>
  totalBytes: number
} {
  const paths = new Set<string>()
  let totalBytes = 0
  for (const m of messages) {
    if (m.type === 'attachment' && m.attachment.type === 'relevant_memories') {
      for (const mem of m.attachment.memories as { path: string; content: string; mtimeMs: number }[]) {
        paths.add(mem.path)
        totalBytes += mem.content.length
      }
    }
  }
  return { paths, totalBytes }
}
export function extractAgentMentions(content: string): string[] {
  // Extract agent mentions in two formats:
  // 1. @agent-<agent-type> (legacy/manual typing)
  //    Example: "@agent-code-elegance-refiner" → "agent-code-elegance-refiner"
  // 2. @"<agent-type> (agent)" (from autocomplete selection)
  //    Example: '@"code-reviewer (agent)"' → "code-reviewer"
  // Supports colons, dots, and at-signs for plugin-scoped agents like "@agent-asana:project-status-updater"
  const results: string[] = []

  // Match quoted format: @"<type> (agent)"
  const quotedAgentRegex = /(^|\s)@"([\w:.@-]+) \(agent\)"/g
  let match
  while ((match = quotedAgentRegex.exec(content)) !== null) {
    if (match[2]) {
      results.push(match[2])
    }
  }

  // Match unquoted format: @agent-<type>
  const unquotedAgentRegex = /(^|\s)@(agent-[\w:.@-]+)/g
  const unquotedMatches = content.match(unquotedAgentRegex) || []
  for (const m of unquotedMatches) {
    results.push(m.slice(m.indexOf('@') + 1))
  }

  return uniq(results)
}
export function extractAtMentionedFiles(content: string): string[] {
  // Extrae nombres de archivo mencionados con @, incluida la sintaxis de rango de línea: @file.txt#L10-20
  // También admite rutas entre comillas para archivos con espacios: @"my/file with spaces.txt"
  // Ejemplo: "foo bar @baz moo" extrae "baz"
  // Ejemplo: 'check @"my file.txt" please' extrae "my file.txt"

  // Dos patrones: rutas entre comillas y rutas regulares
  const quotedAtMentionRegex = /(^|\s)@"([^"]+)"/g
  const regularAtMentionRegex = /(^|\s)@([^\s]+)\b/g

  const quotedMatches: string[] = []
  const regularMatches: string[] = []

  // Extrae primero las menciones entre comillas (omite menciones de agente como @"code-reviewer (agent)")
  let match
  while ((match = quotedAtMentionRegex.exec(content)) !== null) {
    if (match[2] && !match[2].endsWith(' (agent)')) {
      quotedMatches.push(match[2]) // El contenido dentro de las comillas
    }
  }

  // Extrae las menciones regulares
  const regularMatchArray: string[] = content.match(regularAtMentionRegex) ?? []
  regularMatchArray.forEach(match => {
    const filename = match.slice(match.indexOf('@') + 1)
    // No incluir si empieza con comilla (ya manejado como cita)
    if (!filename.startsWith('"')) {
      regularMatches.push(filename)
    }
  })

  // Combina y elimina duplicados
  return uniq([...quotedMatches, ...regularMatches])
}
/**
 * Poda los adjuntos `relevant_memories` ya vistos por `readFileState`, y
 * registra los que sobreviven para que la siguiente pasada no los repita
 * (`ccnmt: attachments.ts:2621`).
 */
export function filterDuplicateMemoryAttachments(
  attachments: StateAttachment[],
  readFileState: FileStateCache,
): StateAttachment[] {
  const isMemoryEntry = (
    value: unknown,
  ): value is { path: string; content: string; mtimeMs: number; limit?: number } => {
    if (typeof value !== 'object' || value === null) return false
    const record = value as Record<string, unknown>
    return typeof record.path === 'string' && typeof record.content === 'string' && typeof record.mtimeMs === 'number'
  }

  return attachments
    .map(attachment => {
      if (attachment.type !== 'relevant_memories') return attachment
      const memories = Array.isArray(attachment.memories) ? attachment.memories.filter(isMemoryEntry) : []
      const filtered = memories.filter(m => !readFileState.has(m.path))
      for (const m of filtered) {
        readFileState.set(m.path, {
          content: m.content,
          timestamp: m.mtimeMs,
          offset: undefined,
          limit: m.limit,
        })
      }
      return filtered.length > 0 ? { ...attachment, memories: filtered } : null
    })
    .filter((a): a is StateAttachment => a !== null)
}
/**
 * Filter skills to bundled (Anthropic-curated) + MCP (user-connected) only.
 * Used when skill-search is enabled to resolve the turn-0 gap for subagents:
 * these sources are small, intent-signaled, and won't hit the truncation budget.
 * User/project/plugin skills (the long tail — 200+) go through discovery instead.
 *
 * Falls back to bundled-only if bundled+mcp exceeds FILTERED_LISTING_MAX.
 */
export function filterToBundledAndMcp(commands: Command[]): Command[] {
  const filtered = commands.filter(
    cmd => cmd.loadedFrom === 'bundled' || cmd.loadedFrom === 'mcp',
  )
  if (filtered.length > FILTERED_LISTING_MAX) {
    return filtered.filter(cmd => cmd.loadedFrom === 'bundled')
  }
  return filtered
}
async function getAsyncHookResponseAttachments(): Promise<StateAttachment[]> {
  const responses = await checkForAsyncHookResponses()

  if (responses.length === 0) {
    return []
  }

  logForDebugging(
    `Hooks: getAsyncHookResponseAttachments found ${responses.length} responses`,
  )

  const attachments = responses.map(
    ({
      processId,
      response,
      hookName,
      hookEvent,
      toolName,
      stdout,
      stderr,
      exitCode,
    }) => {
      logForDebugging(
        `Hooks: Creating attachment for ${processId} (${hookName}): ${jsonStringify(response)}`,
      )
      return {
        type: 'async_hook_response' as const,
        processId,
        hookName,
        hookEvent,
        toolName,
        response,
        stdout,
        stderr,
        exitCode,
      }
    },
  )

  // Remove delivered hooks from registry to prevent re-processing
  if (responses.length > 0) {
    const processIds = responses.map(r => r.processId)
    removeDeliveredAsyncHooks(processIds)
    logForDebugging(
      `Hooks: Removed ${processIds.length} delivered hooks from registry`,
    )
  }

  logForDebugging(
    `Hooks: getAsyncHookResponseAttachments found ${attachments.length} attachments`,
  )

  return attachments
}
export async function* getAttachmentMessages(
  input: string | null,
  toolUseContext: ToolUseContext,
  ideSelection: IDESelection | null,
  queuedCommands: QueuedCommand[],
  messages?: Message[],
  querySource?: QuerySource,
  options?: { skipSkillDiscovery?: boolean },
): AsyncGenerator<AttachmentMessage, void> {
  // TODO: Compute this upstream
  const attachments = await getAttachments(
    input,
    toolUseContext,
    ideSelection,
    queuedCommands,
    messages,
    querySource,
    options,
  )

  if (attachments.length === 0) {
    return
  }

  logEvent('tengu_attachments', {
    attachment_types: attachments.map(
      _ => _.type,
    ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })

  for (const attachment of attachments) {
    yield createAttachmentMessage(attachment)
  }
}
function getAutoModeAttachmentTurnCount(messages: Message[]): {
  turnCount: number
  foundAutoModeAttachment: boolean
} {
  let turnsSinceLastAttachment = 0
  let foundAutoModeAttachment = false

  // Iterate backwards to find most recent auto_mode attachment.
  // Count HUMAN turns (non-meta, non-tool-result user messages), not assistant
  // messages — the tool loop in query.ts calls getAttachmentMessages on every
  // tool round, so a single human turn with 100 tool calls would fire ~20
  // reminders if we counted assistant messages. Auto mode's target use case is
  // long agentic sessions, where this accumulated 60-105× per session.
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]

    if (
      message?.type === 'user' &&
      !message.isMeta &&
      !hasToolResultContent(message.message.content)
    ) {
      turnsSinceLastAttachment++
    } else if (
      message?.type === 'attachment' &&
      message.attachment.type === 'auto_mode'
    ) {
      foundAutoModeAttachment = true
      break
    } else if (
      message?.type === 'attachment' &&
      message.attachment.type === 'auto_mode_exit'
    ) {
      // Exit resets the throttle — treat as if no prior attachment exists
      break
    }
  }

  return { turnCount: turnsSinceLastAttachment, foundAutoModeAttachment }
}
/**
 * Cuenta los adjuntos auto_mode desde el último auto_mode_exit (o desde el
 * inicio si no hubo salida). Garantiza que el ciclo full/sparse se reinicie
 * al volver a entrar en auto mode.
 */
function countAutoModeAttachmentsSinceLastExit(messages: Message[]): number {
  let count = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message?.type === 'attachment') {
      if (message.attachment.type === 'auto_mode_exit') {
        break
      }
      if (message.attachment.type === 'auto_mode') {
        count++
      }
    }
  }
  return count
}

async function getAutoModeAttachments(
  messages: Message[] | undefined,
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  const appState = toolUseContext.getAppState()
  const permissionContext = appState.toolPermissionContext
  const inAuto = permissionContext.mode === 'auto'
  const inPlanWithAuto =
    permissionContext.mode === 'plan' &&
    (autoModeStateModule?.isAutoModeActive() ?? false)
  if (!inAuto && !inPlanWithAuto) {
    return []
  }

  // Check if we should attach based on turn count (except for first turn)
  if (messages && messages.length > 0) {
    const { turnCount, foundAutoModeAttachment } =
      getAutoModeAttachmentTurnCount(messages)
    // Only throttle if we've already sent an auto_mode attachment before
    // On first turn in auto mode, always attach
    if (
      foundAutoModeAttachment &&
      turnCount < AUTO_MODE_ATTACHMENT_CONFIG.TURNS_BETWEEN_ATTACHMENTS
    ) {
      return []
    }
  }

  // Determine if this should be a full or sparse reminder
  const attachmentCount =
    countAutoModeAttachmentsSinceLastExit(messages ?? []) + 1
  const reminderType: 'full' | 'sparse' =
    attachmentCount %
      AUTO_MODE_ATTACHMENT_CONFIG.FULL_REMINDER_EVERY_N_ATTACHMENTS ===
    1
      ? 'full'
      : 'sparse'

  return [{ type: 'auto_mode', reminderType }]
}
/**
 * Adjunto de salida de modo auto — se anuncia una sola vez, cuando el modo
 * deja de estar activo (`ccnmt: attachments.ts:1461`).
 */
export async function getAutoModeExitAttachment(
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  if (!needsAutoModeExitAttachment()) {
    return []
  }

  const appState = toolUseContext.getAppState()
  // Se omite mientras auto sigue activo — cubre tanto mode==='auto' como
  // plan-con-auto-activo (donde mode==='plan' pero el clasificador corre).
  if (
    appState.toolPermissionContext.mode === 'auto' ||
    (autoModeStateModule?.isAutoModeActive() ?? false)
  ) {
    setNeedsAutoModeExitAttachment(false)
    return []
  }

  setNeedsAutoModeExitAttachment(false)
  return [{ type: 'auto_mode_exit' }]
}
export async function getChangedFiles(
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  const filePaths = cacheKeys(toolUseContext.readFileState)
  if (filePaths.length === 0) return []

  const appState = toolUseContext.getAppState()
  const results = await Promise.all(
    filePaths.map(async filePath => {
      const fileState = toolUseContext.readFileState.get(filePath)
      if (!fileState) return null

      // pendiente: soporte de offset/limit para archivos modificados
      if (fileState.offset !== undefined || fileState.limit !== undefined) {
        return null
      }

      const normalizedPath = expandPath(filePath)

      // ¿Hay una regla de denegación configurada para este archivo?
      if (isFileReadDenied(normalizedPath, appState.toolPermissionContext)) {
        return null
      }

      try {
        const mtime = await getFileModificationTimeAsync(normalizedPath)
        if (mtime <= fileState.timestamp) {
          return null
        }

        const fileInput = { file_path: normalizedPath }

        // Valida que la ruta del archivo sea válida
        const isValid = await FileReadTool.validateInput(
          fileInput,
          toolUseContext,
        )
        if (!isValid.result) {
          return null
        }

        const result = await FileReadTool.call(fileInput, toolUseContext)
        // Extrae sólo la sección modificada
        if (result.data.type === 'text') {
          const snippet = getSnippetForTwoFileDiff(
            fileState.content,
            result.data.file.content,
          )

          // El archivo se tocó pero no se modificó
          if (snippet === '') {
            return null
          }

          return {
            type: 'edited_text_file' as const,
            filename: normalizedPath,
            snippet,
          }
        }

        // Para archivos que no son texto (imágenes), aplica la misma lógica
        // de límite de tokens que FileReadTool
        if (result.data.type === 'image') {
          try {
            const data = await readImageWithTokenBudget(normalizedPath)
            return {
              type: 'edited_image_file' as const,
              filename: normalizedPath,
              content: data,
            }
          } catch (compressionError) {
            logError(compressionError)
            logEvent('tengu_watched_file_compression_failed', {
              file: normalizedPath,
            } as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
            return null
          }
        }

        // notebook / pdf / partes — sin representación de diff; null
        // explícito para que el callback del map no tenga un camino
        // implícito a undefined.
        return null
      } catch (err) {
        // Desaloja SÓLO en ENOENT (el archivo realmente se borró). Fallos
        // transitorios de stat —carreras de guardado atómico (el editor
        // escribe a un tmp y renombra, y el stat cae en el hueco), ruido de
        // EACCES, parpadeos de sistemas de archivos en red— NO deben
        // desalojar, o el siguiente Edit falla con code-6 aunque el archivo
        // siga existiendo y el modelo lo acabe de leer. El auto-guardado /
        // format-on-save de VS Code choca con esta carrera especialmente
        // seguido. Ver el análisis de regresión en el PR #18525.
        if (isENOENT(err)) {
          toolUseContext.readFileState.delete(filePath)
        }
        return null
      }
    }),
  )
  return results.filter(result => result != null) as Attachment[]
}
export function getCompactionReminderAttachment(
  messages: Message[],
  model: string,
): StateAttachment[] {
  if (!getFeatureValue_CACHED_MAY_BE_STALE('tengu_marble_fox', false)) {
    return []
  }

  if (!isAutoCompactEnabled()) {
    return []
  }

  const contextWindow = getContextWindowForModel(model, getSdkBetas())
  if (contextWindow < 1_000_000) {
    return []
  }

  const effectiveWindow = getEffectiveContextWindowSize(model)
  const usedTokens = tokenCountWithEstimation(messages)
  if (usedTokens < effectiveWindow * 0.25) {
    return []
  }

  return [{ type: 'compaction_reminder' }]
}
/**
 * Empuje de eficiencia de contexto. Se inyecta tras cada N tokens de
 * crecimiento sin un snip. El ritmo lo controla enteramente
 * `shouldNudgeForSnips` — el intervalo de 10k se reinicia con empujes
 * previos, marcadores de snip, límites de snip y límites de compactación.
 */
export function getContextEfficiencyAttachment(
  messages: Message[],
): StateAttachment[] {
  if (!feature('HISTORY_SNIP')) {
    return []
  }
  // El gate tiene que calzar con SnipTool.isEnabled() — no empujar hacia una
  // herramienta que no está en la lista. El require perezoso mantiene este
  // archivo libre del string "snip".
  const { isSnipRuntimeEnabled, shouldNudgeForSnips } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./compaction/snipCompact.js') as typeof import('./compaction/snipCompact.js')
  if (!isSnipRuntimeEnabled()) {
    return []
  }

  if (!shouldNudgeForSnips(messages)) {
    return []
  }

  return [{ type: 'context_efficiency' }]
}
/**
 * El adjunto `date_change` se agrega al final de la conversación cuando
 * cambia la fecha local respecto de la última emitida — mantiene la fecha
 * vieja en caché en vez de invalidarla, porque regenerar el prefijo
 * convertiría toda la conversación en cache_creation en el siguiente turno
 * (~920K tokens efectivos por cruce de medianoche en una sesión nocturna).
 *
 * Exportada para testing — guarda de regresión para la eliminación del
 * borrado de caché.
 */
export function getDateChangeAttachments(
  messages: Message[] | undefined,
): Attachment[] {
  const currentDate = getLocalISODate()
  const lastDate = getLastEmittedDate()

  if (lastDate === null) {
    // Primer turno — sólo se registra, no hace falta adjunto
    setLastEmittedDate(currentDate)
    return []
  }

  if (currentDate === lastDate) {
    return []
  }

  setLastEmittedDate(currentDate)

  // Modo asistente: vuelca la transcripción de ayer al archivo diario para
  // que el skill /dream (1–5am local) la encuentre aunque hoy no dispare
  // ninguna compactación. Fire-and-forget; writeSessionTranscriptSegment
  // agrupa por timestamp del mensaje, así que un salto de varios días
  // vuelca cada día correctamente.
  if (feature('KAIROS')) {
    if (getKairosActive() && messages !== undefined) {
      flushOnDateChange(messages, currentDate)
    }
  }

  return [{ type: 'date_change', newDate: currentDate }]
}
async function getDiagnosticAttachments(
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  // Los diagnósticos sólo sirven si el agente tiene la herramienta Bash para actuar sobre ellos
  if (
    !toolUseContext.options.tools.some(t => toolMatchesName(t, BASH_TOOL_NAME))
  ) {
    return []
  }

  // Diagnósticos nuevos desde el tracker (diagnósticos del IDE vía MCP)
  const newDiagnostics = await diagnosticTracker.getNewDiagnostics()
  if (newDiagnostics.length === 0) {
    return []
  }

  return [
    {
      type: 'diagnostics',
      files: newDiagnostics,
      isNew: true,
    },
  ]
}
async function getDynamicSkillAttachments(
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  const attachments: StateAttachment[] = []

  if (
    toolUseContext.dynamicSkillDirTriggers &&
    toolUseContext.dynamicSkillDirTriggers.size > 0
  ) {
    // Se paraleliza el listado de cada directorio de skills.
    const perDirResults = await Promise.all(
      Array.from(toolUseContext.dynamicSkillDirTriggers).map(async skillDir => {
        try {
          const entries = await readdir(skillDir, { withFileTypes: true })
          const candidates = entries
            .filter(e => e.isDirectory() || e.isSymbolicLink())
            .map(e => e.name)
          // Se paraleliza el `stat` de cada candidato a SKILL.md.
          const checked = await Promise.all(
            candidates.map(async name => {
              try {
                await stat(resolve(skillDir, name, 'SKILL.md'))
                return name
              } catch {
                return null // SKILL.md no existe: se omite la entrada
              }
            }),
          )
          return {
            skillDir,
            skillNames: checked.filter((n): n is string => n !== null),
          }
        } catch {
          // Se ignoran errores al leer el directorio de skills (p. ej. no existe)
          return { skillDir, skillNames: [] }
        }
      }),
    )

    for (const { skillDir, skillNames } of perDirResults) {
      if (skillNames.length > 0) {
        attachments.push({
          type: 'dynamic_skill',
          skillDir,
          skillNames,
          displayPath: relative(getCwd(), skillDir),
        })
      }
    }

    toolUseContext.dynamicSkillDirTriggers.clear()
  }

  return attachments
}
async function getLSPDiagnosticAttachments(
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  // LSP diagnostics are only useful if the agent has the Bash tool to act on them
  if (
    !toolUseContext.options.tools.some(t => toolMatchesName(t, BASH_TOOL_NAME))
  ) {
    return []
  }

  logForDebugging('LSP Diagnostics: getLSPDiagnosticAttachments called')

  try {
    const diagnosticSets = checkForLSPDiagnostics()

    if (diagnosticSets.length === 0) {
      return []
    }

    logForDebugging(
      `LSP Diagnostics: Found ${diagnosticSets.length} pending diagnostic set(s)`,
    )

    // Convert each diagnostic set to an attachment
    const attachments: Attachment[] = diagnosticSets.map(({ files }) => ({
      type: 'diagnostics' as const,
      files,
      isNew: true,
    }))

    // Clear delivered diagnostics from registry to prevent memory leak
    // Follows same pattern as removeDeliveredAsyncHooks
    if (diagnosticSets.length > 0) {
      clearAllLSPDiagnostics()
      logForDebugging(
        `LSP Diagnostics: Cleared ${diagnosticSets.length} delivered diagnostic(s) from registry`,
      )
    }

    logForDebugging(
      `LSP Diagnostics: Returning ${attachments.length} diagnostic attachment(s)`,
    )

    return attachments
  } catch (error) {
    const err = toError(error)
    logError(
      new Error(`Failed to get LSP diagnostic attachments: ${err.message}`),
    )
    // Return empty array to allow other attachments to proceed
    return []
  }
}
function getMaxBudgetUsdAttachment(maxBudgetUsd?: number): Attachment[] {
  if (maxBudgetUsd === undefined) {
    return []
  }

  const usedCost = getTotalCostUSD()
  const remainingBudget = maxBudgetUsd - usedCost

  return [
    {
      type: 'budget_usd',
      used: usedCost,
      total: maxBudgetUsd,
      remaining: remainingBudget,
    },
  ]
}
async function getNestedMemoryAttachmentsForFile(
  filePath: string,
  toolUseContext: ToolUseContext,
  appState: { toolPermissionContext: ToolPermissionContext },
): Promise<Attachment[]> {
  const attachments: Attachment[] = []

  try {
    // Retorno temprano si la ruta no está en el working path permitido
    if (!pathInAllowedWorkingPath(filePath, appState.toolPermissionContext)) {
      return attachments
    }

    const processedPaths = new Set<string>()
    const originalCwd = getOriginalCwd()

    // Fase 1: procesar reglas condicionales Managed y User
    const managedUserRules = await getManagedAndUserConditionalRules(
      filePath,
      processedPaths,
    )
    attachments.push(
      ...memoryFilesToAttachments(managedUserRules, toolUseContext, filePath),
    )

    // Fase 2: obtener los directorios a procesar
    const { nestedDirs, cwdLevelDirs } = getDirectoriesToProcess(
      filePath,
      originalCwd,
    )

    const skipProjectLevel = getFeatureValue_CACHED_MAY_BE_STALE(
      'tengu_paper_halyard',
      false,
    )

    // Fase 3: procesar directorios anidados (CWD → destino)
    // Cada directorio aporta: CLAUDE.md + reglas incondicionales + reglas condicionales
    for (const dir of nestedDirs) {
      const memoryFiles = (
        await getMemoryFilesForNestedDirectory(dir, filePath, processedPaths)
      ).filter(
        (f: MemoryFileInfo) =>
          !skipProjectLevel || (f.type !== 'Project' && f.type !== 'Local'),
      )
      attachments.push(
        ...memoryFilesToAttachments(memoryFiles, toolUseContext, filePath),
      )
    }

    // Fase 4: procesar directorios a nivel CWD (raíz → CWD)
    // Sólo reglas condicionales (las incondicionales ya se cargaron antes)
    for (const dir of cwdLevelDirs) {
      const conditionalRules = (
        await getConditionalRulesForCwdLevelDirectory(
          dir,
          filePath,
          processedPaths,
        )
      ).filter(
        (f: MemoryFileInfo) => !skipProjectLevel || (f.type !== 'Project' && f.type !== 'Local'),
      )
      attachments.push(
        ...memoryFilesToAttachments(conditionalRules, toolUseContext, filePath),
      )
    }
  } catch (error) {
    logError(error)
  }

  return attachments
}
async function getOpenedFileFromIDE(
  ideSelection: IDESelection | null,
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  if (!ideSelection?.filePath || ideSelection.text) {
    return []
  }

  const appState = toolUseContext.getAppState()
  if (isFileReadDenied(ideSelection.filePath, appState.toolPermissionContext)) {
    return []
  }

  // Obtiene los archivos de memoria anidados
  const nestedMemoryAttachments = await getNestedMemoryAttachmentsForFile(
    ideSelection.filePath,
    toolUseContext,
    appState,
  )

  // Devuelve los adjuntos de memoria anidados seguidos del adjunto del archivo abierto
  return [
    ...nestedMemoryAttachments,
    {
      type: 'opened_file_in_ide',
      filename: ideSelection.filePath,
    },
  ]
}
function getPlanModeAttachmentTurnCount(messages: Message[]): {
  turnCount: number
  foundPlanModeAttachment: boolean
} {
  let turnsSinceLastAttachment = 0
  let foundPlanModeAttachment = false

  // Iterate backwards to find most recent plan_mode attachment.
  // Count HUMAN turns (non-meta, non-tool-result user messages), not assistant
  // messages — the tool loop in query.ts calls getAttachmentMessages on every
  // tool round, so counting assistant messages would fire the reminder every
  // 5 tool calls instead of every 5 human turns.
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]

    if (
      message?.type === 'user' &&
      !message.isMeta &&
      !hasToolResultContent(message.message.content)
    ) {
      turnsSinceLastAttachment++
    } else if (
      message?.type === 'attachment' &&
      (message.attachment.type === 'plan_mode' ||
        message.attachment.type === 'plan_mode_reentry')
    ) {
      foundPlanModeAttachment = true
      break
    }
  }

  return { turnCount: turnsSinceLastAttachment, foundPlanModeAttachment }
}
/**
 * Cuenta los adjuntos `plan_mode` desde la última `plan_mode_exit` (o desde
 * el inicio si no hubo salida). Así el ciclo full/sparse se reinicia al
 * reentrar en plan mode.
 */
function countPlanModeAttachmentsSinceLastExit(messages: Message[]): number {
  let count = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message?.type === 'attachment') {
      if (message.attachment.type === 'plan_mode_exit') {
        break
      }
      if (message.attachment.type === 'plan_mode') {
        count++
      }
    }
  }
  return count
}

async function getPlanModeAttachments(
  messages: Message[] | undefined,
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  const appState = toolUseContext.getAppState()
  const permissionContext = appState.toolPermissionContext
  if (permissionContext.mode !== 'plan') {
    return []
  }

  if (messages && messages.length > 0) {
    const { turnCount, foundPlanModeAttachment } =
      getPlanModeAttachmentTurnCount(messages)
    if (
      foundPlanModeAttachment &&
      turnCount < PLAN_MODE_ATTACHMENT_CONFIG.TURNS_BETWEEN_ATTACHMENTS
    ) {
      return []
    }
  }

  const planFilePath = getPlanFilePath(toolUseContext.agentId)
  const existingPlan = getPlan(toolUseContext.agentId)

  const attachments: StateAttachment[] = []

  if (hasExitedPlanModeInSession() && existingPlan !== null) {
    attachments.push({ type: 'plan_mode_reentry', planFilePath })
    setHasExitedPlanMode(false)
  }

  const attachmentCount =
    countPlanModeAttachmentsSinceLastExit(messages ?? []) + 1
  const reminderType: 'full' | 'sparse' =
    attachmentCount %
      PLAN_MODE_ATTACHMENT_CONFIG.FULL_REMINDER_EVERY_N_ATTACHMENTS ===
    1
      ? 'full'
      : 'sparse'

  attachments.push({
    type: 'plan_mode',
    reminderType,
    isSubAgent: !!toolUseContext.agentId,
    planFilePath,
    planExists: existingPlan !== null,
  })

  return attachments
}
/**
 * Devuelve el adjunto `plan_mode_exit` si el modelo acaba de salir de
 * plan-mode: aviso de una sola vez (`ccnmt: attachments.ts:1329`).
 */
export async function getPlanModeExitAttachment(
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  if (!needsPlanModeExitAttachment()) {
    return []
  }

  const appState = toolUseContext.getAppState()
  if (appState.toolPermissionContext.mode === 'plan') {
    setNeedsPlanModeExitAttachment(false)
    return []
  }

  setNeedsPlanModeExitAttachment(false)

  const planFilePath = getPlanFilePath(toolUseContext.agentId)
  const planExists = getPlan(toolUseContext.agentId) !== null

  return [{ type: 'plan_mode_exit', planFilePath, planExists }]
}
export async function getQueuedCommandAttachments(
  queuedCommands: QueuedCommand[],
): Promise<StateAttachment[]> {
  if (!queuedCommands) {
    return []
  }
  // Incluye comandos 'prompt' y 'task-notification' como adjuntos. Durante
  // loops agenticos proactivos, los comandos 'task-notification' se
  // quedarian en la cola permanentemente (useQueueProcessor no puede correr
  // mientras una query esta activa), haciendo que hasCommandsInQueue()
  // devuelva true y que Sleep despierte de inmediato con 0ms de duracion en
  // un loop infinito.
  const filtered = queuedCommands.filter(_ =>
    INLINE_NOTIFICATION_MODES.has(_.mode),
  )
  return Promise.all(
    filtered.map(async _ => {
      const imageBlocks = await buildImageContentBlocks(_.pastedContents)
      let prompt: string | Array<ContentBlockParam> = _.value
      if (imageBlocks.length > 0) {
        const textValue =
          typeof _.value === 'string'
            ? _.value
            : extractTextContent(_.value, '\n')
        prompt = [{ type: 'text' as const, text: textValue }, ...imageBlocks]
      }
      return {
        type: 'queued_command' as const,
        prompt,
        source_uuid: _.uuid,
        imagePasteIds: getImagePasteIds(_.pastedContents),
        commandMode: _.mode,
        origin: _.origin,
        isMeta: _.isMeta,
      }
    }),
  )
}
async function getSelectedLinesFromIDE(
  ideSelection: IDESelection | null,
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  const ideName = getConnectedIdeName(toolUseContext.options.mcpClients)
  if (
    !ideName ||
    ideSelection?.lineStart === undefined ||
    !ideSelection.text ||
    !ideSelection.filePath
  ) {
    return []
  }

  const appState = toolUseContext.getAppState()
  if (isFileReadDenied(ideSelection.filePath, appState.toolPermissionContext)) {
    return []
  }

  return [
    {
      type: 'selected_lines_in_ide',
      ideName,
      lineStart: ideSelection.lineStart,
      lineEnd: ideSelection.lineStart + ideSelection.lineCount - 1,
      filename: ideSelection.filePath,
      content: ideSelection.text,
      displayPath: relative(getCwd(), ideSelection.filePath),
    },
  ]
}
async function getTaskReminderAttachments(
  messages: Message[] | undefined,
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  if (!isTodoV2Enabled()) {
    return []
  }

  // Se omite para usuarios ant.
  if (readEnv('USER_TYPE') === 'ant') {
    return []
  }

  // Cuando SendUserMessage está en el toolkit, es el canal primario de
  // comunicación y el modelo siempre recibe la instrucción de usarlo
  // (#20467). TaskUpdate pasa a ser un canal secundario — insistir sobre él
  // choca con el flujo de brief. La herramienta sigue disponible; esto sólo
  // desactiva el recordatorio.
  if (
    BRIEF_TOOL_NAME &&
    toolUseContext.options.tools.some(t => toolMatchesName(t, BRIEF_TOOL_NAME))
  ) {
    return []
  }

  // Se omite si la herramienta TaskUpdate no está disponible.
  if (
    !toolUseContext.options.tools.some(t =>
      toolMatchesName(t, TASK_UPDATE_TOOL_NAME),
    )
  ) {
    return []
  }

  // Se omite si no hay mensajes.
  if (!messages || messages.length === 0) {
    return []
  }

  const { turnsSinceLastTaskManagement, turnsSinceLastReminder } =
    getTaskReminderTurnCounts(messages)

  // Verifica si corresponde mostrar un recordatorio.
  if (
    turnsSinceLastTaskManagement >= TODO_REMINDER_CONFIG.TURNS_SINCE_WRITE &&
    turnsSinceLastReminder >= TODO_REMINDER_CONFIG.TURNS_BETWEEN_REMINDERS
  ) {
    const tasks = await listTasks(getTaskListId())
    return [
      {
        type: 'task_reminder',
        content: tasks,
        itemCount: tasks.length,
      },
    ]
  }

  return []
}
function getTaskReminderTurnCounts(messages: Message[]): {
  turnsSinceLastTaskManagement: number
  turnsSinceLastReminder: number
} {
  let lastTaskManagementIndex = -1
  let lastReminderIndex = -1
  let assistantTurnsSinceTaskManagement = 0
  let assistantTurnsSinceReminder = 0

  // Iterate backwards to find most recent events
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]

    if (message?.type === 'assistant') {
      if (isThinkingMessage(message)) {
        // Skip thinking messages
        continue
      }

      // Check for TaskCreate or TaskUpdate usage BEFORE incrementing counter
      if (
        lastTaskManagementIndex === -1 &&
        'message' in message &&
        Array.isArray(message.message?.content) &&
        message.message.content.some(
          block =>
            block.type === 'tool_use' &&
            (block.name === TASK_CREATE_TOOL_NAME ||
              block.name === TASK_UPDATE_TOOL_NAME),
        )
      ) {
        lastTaskManagementIndex = i
      }

      // Count assistant turns before finding events
      if (lastTaskManagementIndex === -1) assistantTurnsSinceTaskManagement++
      if (lastReminderIndex === -1) assistantTurnsSinceReminder++
    } else if (
      lastReminderIndex === -1 &&
      message?.type === 'attachment' &&
      message.attachment.type === 'task_reminder'
    ) {
      lastReminderIndex = i
    }

    if (lastTaskManagementIndex !== -1 && lastReminderIndex !== -1) {
      break
    }
  }

  return {
    turnsSinceLastTaskManagement: assistantTurnsSinceTaskManagement,
    turnsSinceLastReminder: assistantTurnsSinceReminder,
  }
}
export async function getTodoReminderAttachments(
  messages: Message[] | undefined,
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  // Se omite si la herramienta TodoWrite no está disponible.
  if (
    !toolUseContext.options.tools.some(t =>
      toolMatchesName(t, TODO_WRITE_TOOL_NAME),
    )
  ) {
    return []
  }

  // Cuando SendUserMessage está en el toolkit, es el canal de comunicación
  // primario y el modelo siempre recibe instrucción de usarlo (#20467).
  // TodoWrite pasa a ser un canal secundario — recordarlo entra en conflicto
  // con el flujo breve. La herramienta sigue disponible; esto sólo bloquea
  // el recordatorio de "no la has usado en un rato".
  if (
    BRIEF_TOOL_NAME &&
    toolUseContext.options.tools.some(t => toolMatchesName(t, BRIEF_TOOL_NAME))
  ) {
    return []
  }

  // Se omite si no hay mensajes.
  if (!messages || messages.length === 0) {
    return []
  }

  const { turnsSinceLastTodoWrite, turnsSinceLastReminder } =
    getTodoReminderTurnCounts(messages)

  // Comprueba si corresponde mostrar el recordatorio.
  if (
    turnsSinceLastTodoWrite >= TODO_REMINDER_CONFIG.TURNS_SINCE_WRITE &&
    turnsSinceLastReminder >= TODO_REMINDER_CONFIG.TURNS_BETWEEN_REMINDERS
  ) {
    const todoKey = toolUseContext.agentId ?? getSessionId()
    const appState = toolUseContext.getAppState()
    const todos = appState.todos[todoKey] ?? []
    return [
      {
        type: 'todo_reminder',
        content: todos,
        itemCount: todos.length,
      },
    ]
  }

  return []
}

/**
 * Adjunto con el uso de tokens del turno, gated por env var — porte de
 * `ccnmt: attachments.ts:3634-3654`.
 */
export function getTokenUsageAttachment(
  messages: Message[],
  model: string,
): StateAttachment[] {
  if (!isEnvTruthy(readEnv('CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT'))) {
    return []
  }

  const contextWindow = getEffectiveContextWindowSize(model)
  const usedTokens = tokenCountFromLastAPIResponse(messages)

  return [
    {
      type: 'token_usage',
      used: usedTokens,
      total: contextWindow,
      remaining: contextWindow - usedTokens,
    },
  ]
}
function getUltrathinkEffortAttachment(input: string | null): StateAttachment[] {
  if (!isUltrathinkEnabled() || !input || !hasUltrathinkKeyword(input)) {
    return []
  }
  logEvent('tengu_ultrathink', {})
  return [{ type: 'ultrathink_effort', level: 'high' }]
}
async function getUnifiedTaskAttachments(
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  const appState = toolUseContext.getAppState()
  const { attachments, updatedTaskOffsets, evictedTaskIds } =
    await generateTaskAttachments(appState)

  applyTaskOffsetsAndEvictions(
    toolUseContext.setAppState,
    updatedTaskOffsets,
    evictedTaskIds,
  )

  // Convert TaskAttachment to Attachment format
  return attachments.map(taskAttachment => ({
    type: 'task_status' as const,
    taskId: taskAttachment.taskId,
    taskType: taskAttachment.taskType,
    status: taskAttachment.status,
    description: taskAttachment.description,
    deltaSummary: taskAttachment.deltaSummary,
    outputFilePath: getTaskOutputPath(taskAttachment.taskId),
  }))
}
/**
 * Adjunto de recordatorio de verificación de plan, si el modelo aún no ha
 * llamado a `VerifyPlanExecution` (`ccnmt: attachments.ts:3721`).
 */
async function getVerifyPlanReminderAttachment(
  messages: Message[] | undefined,
  toolUseContext: ToolUseContext,
): Promise<StateAttachment[]> {
  if (
    readEnv('USER_TYPE') !== 'ant' ||
    !isEnvTruthy(readEnv('CLAUDE_CODE_VERIFY_PLAN'))
  ) {
    return []
  }

  const appState = toolUseContext.getAppState()
  const pending = appState.pendingPlanVerification

  // Sólo recuerda si el plan existe y la verificación no empezó ni terminó.
  if (
    !pending ||
    pending.verificationStarted ||
    pending.verificationCompleted
  ) {
    return []
  }

  // Sólo recuerda cada N turnos.
  if (messages && messages.length > 0) {
    const turnCount = getVerifyPlanReminderTurnCount(messages)
    if (
      turnCount === 0 ||
      turnCount % VERIFY_PLAN_REMINDER_CONFIG.TURNS_BETWEEN_REMINDERS !== 0
    ) {
      return []
    }
  }

  return [{ type: 'verify_plan_reminder' }]
}
export function getVerifyPlanReminderTurnCount(messages: Message[]): number {
  let turnCount = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message && isHumanTurn(message)) {
      turnCount++
    }
    // Stop counting at plan_mode_exit attachment (marks when implementation started)
    if (
      message?.type === 'attachment' &&
      message.attachment.type === 'plan_mode_exit'
    ) {
      return turnCount
    }
  }
  // No plan_mode_exit found
  return 0
}
/**
 * Comprueba si el contenido de un mensaje de usuario contiene bloques tool_result.
 * Es más fiable que comprobar `toolUseResult === undefined` porque los mensajes de
 * resultado de herramienta de un sub-agente fijan explícitamente `toolUseResult` a
 * `undefined` cuando `preserveToolUseResults` es false (el valor por defecto para
 * agentes Explore).
 */
function hasToolResultContent(content: unknown): boolean {
  return Array.isArray(content) && content.some(isToolResultBlock)
}
type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  is_error?: boolean
}

function isToolResultBlock(b: unknown): b is ToolResultBlock {
  return (
    typeof b === 'object' &&
    b !== null &&
    (b as ToolResultBlock).type === 'tool_result' &&
    typeof (b as ToolResultBlock).tool_use_id === 'string'
  )
}
async function maybe<A>(label: string, f: () => Promise<A[]>): Promise<A[]> {
  const startTime = Date.now()
  try {
    const result = await f()
    const duration = Date.now() - startTime
    // Registra sólo el 5% de los eventos para reducir volumen
    if (Math.random() < 0.05) {
      // jsonStringify(undefined) devuelve undefined, así que .length lanzaría
      const attachmentSizeBytes = result
        .filter(a => a !== undefined && a !== null)
        .reduce((total, attachment) => {
          return total + jsonStringify(attachment).length
        }, 0)
      logEvent('tengu_attachment_compute_duration', {
        label,
        duration_ms: duration,
        attachment_size_bytes: attachmentSizeBytes,
        attachment_count: result.length,
      })
    }
    return result
  } catch (e) {
    const duration = Date.now() - startTime
    // Registra sólo el 5% de los eventos para reducir volumen
    if (Math.random() < 0.05) {
      logEvent('tengu_attachment_compute_duration', {
        label,
        duration_ms: duration,
        error: true,
      })
    }
    logError(e)
    // Para usuarios Ant, registra el error completo para ayudar con debugging
    logAntError(`Attachment error in ${label}`, e)

    return []
  }
}

function processAgentMentions(
  input: string,
  agents: AgentDefinition[],
): Attachment[] {
  const agentMentions = extractAgentMentions(input)
  if (agentMentions.length === 0) return []

  const results = agentMentions.map(mention => {
    const agentType = mention.replace('agent-', '')
    const agentDef = agents.find(def => def.agentType === agentType)

    if (!agentDef) {
      logEvent('tengu_at_mention_agent_not_found', {})
      return null
    }

    logEvent('tengu_at_mention_agent_success', {})

    return {
      type: 'agent_mention' as const,
      agentType: agentDef.agentType,
    }
  })

  return results.filter(
    (result): result is NonNullable<typeof result> => result !== null,
  )
}
export function extractMcpResourceMentions(content: string): string[] {
  // Extrae los recursos MCP mencionados con el símbolo @ en formato @server:uri
  // Ejemplo: "@server1:resource/path" extrae "server1:resource/path"
  const atMentionRegex = /(^|\s)@([^\s]+:[^\s]+)\b/g
  const matches = content.match(atMentionRegex) || []

  // Quita el prefijo (todo antes del @) de cada coincidencia
  return uniq(matches.map(match => match.slice(match.indexOf('@') + 1)))
}

async function processMcpResourceAttachments(
  input: string,
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  const resourceMentions = extractMcpResourceMentions(input)
  if (resourceMentions.length === 0) return []

  const mcpClients = toolUseContext.options.mcpClients || []

  const results = await Promise.all(
    resourceMentions.map(async mention => {
      try {
        const [serverName, ...uriParts] = mention.split(':')
        const uri = uriParts.join(':') // Reune de nuevo por si la URI contiene dos puntos

        if (!serverName || !uri) {
          logEvent('tengu_at_mention_mcp_resource_error', {})
          return null
        }

        // Busca el cliente MCP
        const client = mcpClients.find(c => c.name === serverName)
        if (!client || client.type !== 'connected') {
          logEvent('tengu_at_mention_mcp_resource_error', {})
          return null
        }

        // Busca el recurso entre los disponibles para obtener sus metadatos
        const serverResources =
          toolUseContext.options.mcpResources?.[serverName] || []
        const resourceInfo = serverResources.find(r => r.uri === uri)
        if (!resourceInfo) {
          logEvent('tengu_at_mention_mcp_resource_error', {})
          return null
        }

        try {
          const result = await client.client.readResource({
            uri,
          })

          logEvent('tengu_at_mention_mcp_resource_success', {})

          return {
            type: 'mcp_resource' as const,
            server: serverName,
            uri,
            name: resourceInfo.name || uri,
            description: resourceInfo.description,
            content: result,
          }
        } catch (error) {
          logEvent('tengu_at_mention_mcp_resource_error', {})
          logError(error)
          return null
        }
      } catch {
        logEvent('tengu_at_mention_mcp_resource_error', {})
        return null
      }
    }),
  )

  return results.filter(
    (result): result is NonNullable<typeof result> => result !== null,
  ) as Attachment[]
}
/**
 * Lee memorias seleccionadas para inyectarlas en el contexto
 * (`ccnmt: attachments.ts:2380`). Cada archivo se recorta a
 * `MAX_MEMORY_LINES`/`MAX_MEMORY_BYTES` vía `readFileInRange` y se le
 * antepone su encabezado; los que fallan al leerse se descartan.
 */
export async function readMemoriesForSurfacing(
  selected: ReadonlyArray<{ path: string; mtimeMs: number }>,
  signal?: AbortSignal,
): Promise<
  Array<{
    path: string
    content: string
    mtimeMs: number
    header: string
    limit?: number
  }>
> {
  const results = await Promise.all(
    selected.map(async ({ path: filePath, mtimeMs }) => {
      try {
        const result = await readFileInRange(
          filePath,
          0,
          MAX_MEMORY_LINES,
          MAX_MEMORY_BYTES,
          signal,
          { truncateOnByteLimit: true },
        )
        const truncated =
          result.totalLines > MAX_MEMORY_LINES || result.truncatedByBytes
        const content = truncated
          ? result.content +
            `\n\n> This memory file was truncated (${result.truncatedByBytes ? `${MAX_MEMORY_BYTES} byte limit` : `first ${MAX_MEMORY_LINES} lines`}). Use the ${FILE_READ_TOOL_NAME} tool to view the complete file at: ${filePath}`
          : result.content
        return {
          path: filePath,
          content,
          mtimeMs,
          header: memoryHeader(filePath, mtimeMs),
          limit: truncated ? result.lineCount : undefined,
        }
      } catch {
        return null
      }
    }),
  )
  return results.filter(r => r !== null)
}

/**
 * Encabezado de un bloque de memoria relevante. Exportada para que
 * `messages.ts` pueda reconstruirlo en sesiones reanudadas donde el
 * encabezado guardado falta.
 */
export function memoryHeader(path: string, mtimeMs: number): string {
  const staleness = memoryFreshnessText(mtimeMs)
  return staleness
    ? `${staleness}\n\nMemory: ${path}:`
    : `Memory (saved ${memoryAge(mtimeMs)}): ${path}:`
}
export function startRelevantMemoryPrefetch(
  messages: ReadonlyArray<Message>,
  toolUseContext: ToolUseContext,
): MemoryPrefetch | undefined {
  if (
    !isAutoMemoryEnabled() ||
    !getFeatureValue_CACHED_MAY_BE_STALE('tengu_moth_copse', false)
  ) {
    return undefined
  }

  const lastUserMessage = messages.findLast(m => m.type === 'user' && !m.isMeta)
  if (!lastUserMessage) {
    return undefined
  }

  const input = getUserMessageText(lastUserMessage)
  // Los prompts de una sola palabra no dan suficiente contexto para extraer
  // términos con sentido.
  if (!input || !/\s/.test(input.trim())) {
    return undefined
  }

  const surfaced = collectSurfacedMemories(messages)
  if (surfaced.totalBytes >= RELEVANT_MEMORIES_CONFIG.MAX_SESSION_BYTES) {
    return undefined
  }

  // Encadenado al abort del turno para que Escape cancele la sideQuery de
  // inmediato, no sólo en [Symbol.dispose] al salir de queryLoop.
  const controller = createChildAbortController(toolUseContext.abortController)
  const firedAt = Date.now()
  const promise = getRelevantMemoryAttachments(
    input,
    toolUseContext.options.agentDefinitions.activeAgents,
    toolUseContext.readFileState,
    collectRecentSuccessfulTools(messages, lastUserMessage),
    controller.signal,
    surfaced.paths,
  ).catch(e => {
    if (!isAbortError(e)) {
      logError(e)
    }
    return []
  })

  const handle: MemoryPrefetch = {
    promise,
    settledAt: null,
    consumedOnIteration: -1,
    [Symbol.dispose]() {
      controller.abort()
      logEvent('tengu_memdir_prefetch_collected', {
        hidden_by_first_iteration:
          handle.settledAt !== null && handle.consumedOnIteration === 0,
        consumed_on_iteration: handle.consumedOnIteration,
        latency_ms: (handle.settledAt ?? Date.now()) - firedAt,
      })
    },
  }
  void promise.finally(() => {
    handle.settledAt = Date.now()
  })
  return handle
}

// --- porte por miembros: un ancla por ítem ---

// --- porte por miembros: un ancla por ítem ---
/**
 * Processes paths that need nested memory attachments and checks for nested CLAUDE.md files
 * Uses nestedMemoryAttachmentTriggers field from ToolUseContext
 */
async function getNestedMemoryAttachments(
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  // Check triggers first — getAppState() waits for a React render cycle,
  // and the common case is an empty trigger set.
  if (
    !toolUseContext.nestedMemoryAttachmentTriggers ||
    toolUseContext.nestedMemoryAttachmentTriggers.size === 0
  ) {
    return []
  }

  const appState = toolUseContext.getAppState()
  const attachments: Attachment[] = []

  for (const filePath of toolUseContext.nestedMemoryAttachmentTriggers) {
    const nestedAttachments = await getNestedMemoryAttachmentsForFile(
      filePath,
      toolUseContext,
      appState,
    )
    attachments.push(...nestedAttachments)
  }

  toolUseContext.nestedMemoryAttachmentTriggers.clear()

  return attachments
}
async function getRelevantMemoryAttachments(
  input: string,
  agents: AgentDefinition[],
  readFileState: FileStateCache,
  recentTools: readonly string[],
  signal: AbortSignal,
  alreadySurfaced: ReadonlySet<string>,
): Promise<Attachment[]> {
  // If an agent is @-mentioned, search only its memory dir (isolation).
  // Otherwise search the auto-memory dir.
  const memoryDirs = extractAgentMentions(input).flatMap(mention => {
    const agentType = mention.replace('agent-', '')
    const agentDef = agents.find(def => def.agentType === agentType)
    return agentDef?.memory
      ? [getAgentMemoryDir(agentType, agentDef.memory)]
      : []
  })
  const dirs = memoryDirs.length > 0 ? memoryDirs : [getAutoMemPath()]

  const allResults = await Promise.all(
    dirs.map(dir =>
      findRelevantMemories(
        input,
        dir,
        signal,
        recentTools,
        alreadySurfaced,
      ).catch(() => []),
    ),
  )
  // alreadySurfaced is filtered inside the selector so Sonnet spends its
  // 5-slot budget on fresh candidates; readFileState catches files the
  // model read via FileReadTool. The redundant alreadySurfaced check here
  // is a belt-and-suspenders guard (multi-dir results may re-introduce a
  // path the selector filtered in a different dir).
  const selected = allResults
    .flat()
    .filter(m => !readFileState.has(m.path) && !alreadySurfaced.has(m.path))
    .slice(0, 5)

  const memories = await readMemoriesForSurfacing(selected, signal)

  if (memories.length === 0) {
    return []
  }
  return [{ type: 'relevant_memories' as const, memories }]
}
async function getSkillListingAttachments(
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  if (readEnv('NODE_ENV') === 'test') {
    return []
  }

  // Skip skill listing for agents that don't have the Skill tool — they can't use skills directly.
  if (
    !toolUseContext.options.tools.some(t => toolMatchesName(t, SKILL_TOOL_NAME))
  ) {
    return []
  }

  const cwd = getProjectRoot()
  const localCommands = await getSkillToolCommands(cwd)
  const mcpSkills = getMcpSkillCommands(
    toolUseContext.getAppState().mcp.commands,
  )
  let allCommands =
    mcpSkills.length > 0
      ? uniqBy([...localCommands, ...mcpSkills], 'name')
      : localCommands

  // When skill search is active, filter to bundled + MCP instead of full
  // suppression. Resolves the turn-0 gap: main thread gets turn-0 discovery
  // via getTurnZeroSkillDiscovery (blocking), but subagents use the async
  // subagent_spawn signal (collected post-tools, visible turn 1). Bundled +
  // MCP are small and intent-signaled; user/project/plugin skills go through
  // discovery. feature() first for DCE — the property-access string leaks
  // otherwise even with ?. on null.
  if (
    feature('EXPERIMENTAL_SKILL_SEARCH') &&
    skillSearchModules?.featureCheck.isSkillSearchEnabled()
  ) {
    allCommands = filterToBundledAndMcp(allCommands)
  }

  const agentKey = toolUseContext.agentId ?? ''
  let sent = sentSkillNames.get(agentKey)
  if (!sent) {
    sent = new Set()
    sentSkillNames.set(agentKey, sent)
  }

  // Resume path: prior process already injected a listing; it's in the
  // transcript. Mark everything current as sent so only post-resume deltas
  // (skills loaded later via /reload-plugins etc) get announced.
  if (suppressNext) {
    suppressNext = false
    for (const cmd of allCommands) {
      sent.add(cmd.name)
    }
    return []
  }

  // Find skills we haven't sent yet
  const newSkills = allCommands.filter(cmd => !sent.has(cmd.name))

  if (newSkills.length === 0) {
    return []
  }

  // If no skills have been sent yet, this is the initial batch
  const isInitial = sent.size === 0

  // Mark as sent
  for (const cmd of newSkills) {
    sent.add(cmd.name)
  }

  logForDebugging(
    `Sending ${newSkills.length} skills via attachment (${isInitial ? 'initial' : 'dynamic'}, ${sent.size} total sent)`,
  )

  // Format within budget using existing logic
  const contextWindowTokens = getContextWindowForModel(
    toolUseContext.options.mainLoopModel,
    getSdkBetas(),
  )
  const content = formatCommandsWithinBudget(newSkills, contextWindowTokens)

  return [
    {
      type: 'skill_listing',
      content,
      skillCount: newSkills.length,
      isInitial,
    },
  ]
}
function parseAtMentionedFileLines(
  mention: string,
): AtMentionedFileLines {
  // Analiza menciones como "file.txt#L10-20", "file.txt#heading" o "file.txt" a secas
  // Soporta rangos de línea (#L10, #L10-20) y descarta fragmentos que no son rango (#heading)
  const match = mention.match(/^([^#]+)(?:#L(\d+)(?:-(\d+))?)?(?:#[^#]*)?$/)

  if (!match) {
    return { filename: mention }
  }

  const [, filename, lineStartStr, lineEndStr] = match
  const lineStart = lineStartStr ? parseInt(lineStartStr, 10) : undefined
  const lineEnd = lineEndStr ? parseInt(lineEndStr, 10) : lineStart

  return { filename: filename ?? mention, lineStart, lineEnd }
}

async function processAtMentionedFiles(
  input: string,
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  const files = extractAtMentionedFiles(input)
  if (files.length === 0) return []

  const appState = toolUseContext.getAppState()
  const results = await Promise.all(
    files.map(async file => {
      try {
        const { filename, lineStart, lineEnd } = parseAtMentionedFileLines(file)
        const absoluteFilename = expandPath(filename)

        if (
          isFileReadDenied(absoluteFilename, appState.toolPermissionContext)
        ) {
          return null
        }

        // Comprueba si es un directorio
        try {
          const stats = await stat(absoluteFilename)
          if (stats.isDirectory()) {
            try {
              const entries = await readdir(absoluteFilename, {
                withFileTypes: true,
              })
              const MAX_DIR_ENTRIES = 1000
              const truncated = entries.length > MAX_DIR_ENTRIES
              const names = entries.slice(0, MAX_DIR_ENTRIES).map(e => e.name)
              if (truncated) {
                names.push(
                  `\u2026 and ${entries.length - MAX_DIR_ENTRIES} more entries`,
                )
              }
              const stdout = names.join('\n')
              logEvent('tengu_at_mention_extracting_directory_success', {})
              emitAtMention('directory', true)
              return {
                type: 'directory' as const,
                path: absoluteFilename,
                content: stdout,
                displayPath: relative(getCwd(), absoluteFilename),
              }
            } catch {
              return null
            }
          }
        } catch {
          // Si stat falla, se continúa con la lógica de archivo
        }

        const r = await generateFileAttachment(
          absoluteFilename,
          toolUseContext,
          'tengu_at_mention_extracting_filename_success',
          'tengu_at_mention_extracting_filename_error',
          'at-mention',
          { offset: lineStart, limit: lineEnd && lineStart ? lineEnd - lineStart + 1 : undefined },
        )
        return (emitAtMention('file', r !== null), r)
      } catch {
        logEvent('tengu_at_mention_extracting_filename_error', {})
        emitAtMention('file', false)
      }
    }),
  )
  return results.filter(Boolean) as Attachment[]
}

// --- porte por miembros: un ancla por ítem ---
export async function getAttachments(
  input: string | null,
  toolUseContext: ToolUseContext,
  ideSelection: IDESelection | null,
  queuedCommands: QueuedCommand[],
  messages?: Message[],
  querySource?: QuerySource,
  options?: { skipSkillDiscovery?: boolean },
): Promise<Attachment[]> {
  if (
    isEnvTruthy(readEnv('CLAUDE_CODE_DISABLE_ATTACHMENTS')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_SIMPLE'))
  ) {
    // query.ts:removeFromQueue dequeues these unconditionally after
    // getAttachmentMessages runs — returning [] here silently drops them.
    // Coworker runs with --bare and depends on task-notification for
    // mid-tool-call notifications from Local*Task/Remote*Task.
    return (await getQueuedCommandAttachments(queuedCommands)) as Attachment[]
  }

  // This will slow down submissions
  // TODO: Compute attachments as the user types, not here (though we use this
  // function for slash command prompts too)
  const abortController = createAbortController()
  const timeoutId = setTimeout(ac => ac.abort(), 1000, abortController)
  const context = { ...toolUseContext, abortController }

  const isMainThread = !toolUseContext.agentId

  // Attachments which are added in response to on user input
  const userInputAttachments = input
    ? [
        maybe('at_mentioned_files', () =>
          processAtMentionedFiles(input, context),
        ),
        maybe('mcp_resources', () =>
          processMcpResourceAttachments(input, context),
        ),
        maybe('agent_mentions', () =>
          Promise.resolve(
            processAgentMentions(
              input,
              toolUseContext.options.agentDefinitions.activeAgents,
            ),
          ),
        ),
        // Skill discovery on turn 0 (user input as signal). Inter-turn
        // discovery runs via startSkillDiscoveryPrefetch in query.ts,
        // gated on write-pivot detection — see skillSearch/prefetch.ts.
        // feature() here lets DCE drop the 'skill_discovery' string (and the
        // function it calls) from external builds.
        //
        // skipSkillDiscovery gates out the SKILL.md-expansion path
        // (getMessagesForPromptSlashCommand). When a skill is invoked, its
        // SKILL.md content is passed as `input` here to extract @-mentions —
        // but that content is NOT user intent and must not trigger discovery.
        // Without this gate, a 110KB SKILL.md fires ~3.3s of chunked AKI
        // queries on every skill invocation (session 13a9afae).
        ...(feature('EXPERIMENTAL_SKILL_SEARCH') &&
        skillSearchModules &&
        !options?.skipSkillDiscovery
          ? [
              maybe('skill_discovery', async () => {
                const result = await skillSearchModules.prefetch.getTurnZeroSkillDiscovery(
                  input,
                  messages ?? [],
                  context,
                )
                return result ? [result] : []
              }),
            ]
          : []),
      ]
    : []

  // Process user input attachments first (includes @mentioned files)
  // This ensures files are added to nestedMemoryAttachmentTriggers before nested_memory processes them
  const userAttachmentResults = await Promise.all(userInputAttachments)

  // Thread-safe attachments available in sub-agents
  // NOTE: These must be created AFTER userInputAttachments completes to ensure
  // nestedMemoryAttachmentTriggers is populated before getNestedMemoryAttachments runs
  const allThreadAttachments = [
    // queuedCommands is already agent-scoped by the drain gate in query.ts —
    // main thread gets agentId===undefined, subagents get their own agentId.
    // Must run for all threads or subagent notifications drain into the void
    // (removed from queue by removeFromQueue but never attached).
    maybe('queued_commands', () => getQueuedCommandAttachments(queuedCommands)),
    maybe('date_change', () =>
      Promise.resolve(getDateChangeAttachments(messages)),
    ),
    maybe('ultrathink_effort', () =>
      Promise.resolve(getUltrathinkEffortAttachment(input)),
    ),
    maybe('deferred_tools_delta', () =>
      Promise.resolve(
        getDeferredToolsDeltaAttachment(
          toolUseContext.options.tools,
          toolUseContext.options.mainLoopModel,
          messages,
          {
            callSite: isMainThread
              ? 'attachments_main'
              : 'attachments_subagent',
            querySource,
          },
        ),
      ),
    ),
    maybe('agent_listing_delta', () =>
      Promise.resolve(getAgentListingDeltaAttachment(toolUseContext, messages)),
    ),
    maybe('mcp_instructions_delta', () =>
      Promise.resolve(
        getMcpInstructionsDeltaAttachment(
          toolUseContext.options.mcpClients,
          toolUseContext.options.tools,
          toolUseContext.options.mainLoopModel,
          messages,
        ),
      ),
    ),
    maybe('changed_files', () => getChangedFiles(context)),
    maybe('nested_memory', () => getNestedMemoryAttachments(context)),
    // relevant_memories moved to async prefetch (startRelevantMemoryPrefetch)
    maybe('dynamic_skill', () => getDynamicSkillAttachments(context)),
    maybe('skill_listing', () => getSkillListingAttachments(context)),
    // Inter-turn skill discovery now runs via startSkillDiscoveryPrefetch
    // (query.ts, concurrent with the main turn). The blocking call that
    // previously lived here was the assistant_turn signal — 97% of those
    // Haiku calls found nothing in prod. Prefetch + await-at-collection
    // replaces it; see src/services/skillSearch/prefetch.ts.
    maybe('plan_mode', () => getPlanModeAttachments(messages, toolUseContext)),
    maybe('plan_mode_exit', () => getPlanModeExitAttachment(toolUseContext)),
    ...(feature('TRANSCRIPT_CLASSIFIER')
      ? [
          maybe('auto_mode', () =>
            getAutoModeAttachments(messages, toolUseContext),
          ),
          maybe('auto_mode_exit', () =>
            getAutoModeExitAttachment(toolUseContext),
          ),
        ]
      : []),
    maybe('todo_reminders', () =>
      isTodoV2Enabled()
        ? getTaskReminderAttachments(messages, toolUseContext)
        : getTodoReminderAttachments(messages, toolUseContext),
    ),
    ...(isAgentSwarmsEnabled()
      ? [
          // Skip teammate mailbox for the session_memory forked agent.
          // It shares AppState.teamContext with the leader, so isTeamLead resolves
          // true and it reads+marks-as-read the leader's DMs as ephemeral attachments,
          // silently stealing messages that should be delivered as permanent turns.
          ...(querySource === 'session_memory'
            ? []
            : [
                maybe('teammate_mailbox', async () =>
                  getTeammateMailboxAttachments(toolUseContext),
                ),
              ]),
          maybe('team_context', async () =>
            getTeamContextAttachment(messages ?? []),
          ),
        ]
      : []),
    maybe('agent_pending_messages', async () =>
      getAgentPendingMessageAttachments(toolUseContext),
    ),
    maybe('critical_system_reminder', () =>
      Promise.resolve(getCriticalSystemReminderAttachment(toolUseContext)),
    ),
    ...(feature('COMPACTION_REMINDERS')
      ? [
          maybe('compaction_reminder', () =>
            Promise.resolve(
              getCompactionReminderAttachment(
                messages ?? [],
                toolUseContext.options.mainLoopModel,
              ),
            ),
          ),
        ]
      : []),
    ...(feature('HISTORY_SNIP')
      ? [
          maybe('context_efficiency', () =>
            Promise.resolve(getContextEfficiencyAttachment(messages ?? [])),
          ),
        ]
      : []),
  ]

  // Attachments which are semantically only for the main conversation or don't have concurrency-safe implementations
  const mainThreadAttachments = isMainThread
    ? [
        // ant 4135.js: ultrawork_request sits at the head of the main-thread
        // block, gated on bp() (workflows enabled) AND a regular user prompt.
        // ccb has no isRegularUserPrompt plumbing; `input` is non-null only
        // on a fresh user prompt (mid-turn re-collection passes input===null),
        // so `input && isMainThread` is the faithful equivalent. Gated on the
        // runtime workflows gate (ant bp()), no build flag.
        ...(isWorkflowsEnabled()
          ? [
              maybe('ultrawork_request', () =>
                Promise.resolve(getUltraworkRequestAttachment(input)),
              ),
            ]
          : []),
        maybe('ide_selection', async () =>
          getSelectedLinesFromIDE(ideSelection, toolUseContext),
        ),
        maybe('ide_opened_file', async () =>
          getOpenedFileFromIDE(ideSelection, toolUseContext),
        ),
        maybe('output_style', async () =>
          Promise.resolve(getOutputStyleAttachment()),
        ),
        maybe('diagnostics', async () =>
          getDiagnosticAttachments(toolUseContext),
        ),
        maybe('lsp_diagnostics', async () =>
          getLSPDiagnosticAttachments(toolUseContext),
        ),
        maybe('unified_tasks', async () =>
          getUnifiedTaskAttachments(toolUseContext),
        ),
        maybe('async_hook_responses', async () =>
          getAsyncHookResponseAttachments(),
        ),
        maybe('token_usage', async () =>
          Promise.resolve(
            getTokenUsageAttachment(
              messages ?? [],
              toolUseContext.options.mainLoopModel,
            ),
          ),
        ),
        maybe('budget_usd', async () =>
          Promise.resolve(
            getMaxBudgetUsdAttachment(toolUseContext.options.maxBudgetUsd),
          ),
        ),
        maybe('output_token_usage', async () =>
          Promise.resolve(getOutputTokenUsageAttachment()),
        ),
        maybe('verify_plan_reminder', async () =>
          getVerifyPlanReminderAttachment(messages, toolUseContext),
        ),
      ]
    : []

  // Process thread and main thread attachments in parallel (no dependencies between them)
  const [threadAttachmentResults, mainThreadAttachmentResults] =
    await Promise.all([
      Promise.all(allThreadAttachments),
      Promise.all(mainThreadAttachments),
    ])

  clearTimeout(timeoutId)
  // Defensive: a getter leaking [undefined] crashes .map(a => a.type) below.
  return ([
    ...userAttachmentResults.flat(),
    ...threadAttachmentResults.flat(),
    ...mainThreadAttachmentResults.flat(),
  ] as Attachment[]).filter(a => a !== undefined && a !== null)
}
export function getAgentPendingMessageAttachments(
  toolUseContext: ToolUseContext,
): Attachment[] {
  const agentId = toolUseContext.agentId
  if (!agentId) return []
  const drained = drainPendingMessages(
    agentId,
    toolUseContext.getAppState,
    toolUseContext.setAppStateForTasks ?? toolUseContext.setAppState,
  )
  return drained.map(msg => ({
    type: 'queued_command' as const,
    prompt: msg,
    origin: { kind: 'coordinator' as const } as unknown as MessageOrigin,
    isMeta: true,
  }))
}

function getCriticalSystemReminderAttachment(
  toolUseContext: ToolUseContext,
): Attachment[] {
  const reminder = toolUseContext.criticalSystemReminder_EXPERIMENTAL
  if (!reminder) {
    return []
  }
  return [{ type: 'critical_system_reminder', content: reminder }]
}

function getOutputStyleAttachment(): Attachment[] {
  const settings = getSettings()
  const outputStyle = settings?.outputStyle || 'default'

  // Sólo se muestra para estilos que no son el predeterminado
  if (outputStyle === 'default') {
    return []
  }

  return [
    {
      type: 'output_style',
      style: outputStyle,
    },
  ]
}

/**
 * Inyecta un adjunto `ultrawork_request` cuando el usuario escribió la
 * palabra clave `ultrawork`. Sólo aplica en un prompt de usuario fresco,
 * nunca a mitad de turno (`input === null`) ni en un subagente — ese gate
 * y la comprobación de hilo principal/prompt regular los trae la llamada;
 * este helper sólo corre el detector de la palabra clave y emite el marcador.
 *
 * A diferencia de ultraplan (que reescribe el prompt como `/ultraplan`),
 * ultrawork deja el prompt intacto y viaja en un adjunto, igual que
 * ultrathink. El renderer (`messages.ts`) convierte el marcador en un
 * system-reminder meta que dirige al modelo hacia el bucle de trabajo
 * autónomo.
 */
function getUltraworkRequestAttachment(input: string | null): Attachment[] {
  if (!input || !hasUltraworkKeyword(input)) {
    return []
  }
  logEvent('tengu_ultrawork', {})
  return [{ type: 'ultrawork_request' }]
}

function getOutputTokenUsageAttachment(): Attachment[] {
  if (feature('TOKEN_BUDGET')) {
    const budget = getCurrentTurnTokenBudget()
    if (budget === null || budget <= 0) {
      return []
    }
    return [
      {
        type: 'output_token_usage',
        turn: getTurnOutputTokens(),
        session: getTotalOutputTokens(),
        budget,
      },
    ]
  }
  return []
}

// --- porte por miembros: un ancla por ítem ---
function getTodoReminderTurnCounts(messages: Message[]): {
  turnsSinceLastTodoWrite: number
  turnsSinceLastReminder: number
} {
  let lastTodoWriteIndex = -1
  let lastReminderIndex = -1
  let assistantTurnsSinceWrite = 0
  let assistantTurnsSinceReminder = 0

  // Iterate backwards to find most recent events
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]

    if (message?.type === 'assistant') {
      if (isThinkingMessage(message)) {
        // Skip thinking messages
        continue
      }

      // Check for TodoWrite usage BEFORE incrementing counter
      // (we don't want to count the TodoWrite message itself as "1 turn since write")
      if (
        lastTodoWriteIndex === -1 &&
        'message' in message &&
        Array.isArray(message.message?.content) &&
        message.message.content.some(
          block => block.type === 'tool_use' && block.name === 'TodoWrite',
        )
      ) {
        lastTodoWriteIndex = i
      }

      // Count assistant turns before finding events
      if (lastTodoWriteIndex === -1) assistantTurnsSinceWrite++
      if (lastReminderIndex === -1) assistantTurnsSinceReminder++
    } else if (
      lastReminderIndex === -1 &&
      message?.type === 'attachment' &&
      message.attachment.type === 'todo_reminder'
    ) {
      lastReminderIndex = i
    }

    if (lastTodoWriteIndex !== -1 && lastReminderIndex !== -1) {
      break
    }
  }

  return {
    turnsSinceLastTodoWrite: assistantTurnsSinceWrite,
    turnsSinceLastReminder: assistantTurnsSinceReminder,
  }
}
// PARCIAL, declarado en la cabecera: `isInstructionsMemoryType` y
// `memoryFilesToAttachments` no se portan en este pase. Dependen de
// `InstructionsMemoryType`, `hasInstructionsLoadedHook` y
// `executeInstructionsLoadedHooks` (`ccnmt: packages/agent/hooks.ts:4704-4780`),
// que ese archivo aún no publica en este árbol (cero coincidencias en `src/`).
// Se traen cuando `hooks.ts` porte esos tres símbolos.
