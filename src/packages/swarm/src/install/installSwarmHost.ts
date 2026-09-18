import { installSwarmAppRuntime } from '../adapters/appRuntime.js'
import { installSwarmAppUi } from '../adapters/appUi.js'
import { TEAMMATE_MESSAGE_TAG } from '@claude-code-how-works/command-runtime/xml.js'
import {
  processMailboxPermissionResponse,
  registerPermissionCallback,
  unregisterPermissionCallback,
} from '@claude-code-how-works/repl/hooks/useSwarmPermissionPoller.js'
import { useExitOnCtrlCDWithKeybindings } from '@claude-code-how-works/repl/hooks/useExitOnCtrlCDWithKeybindings.js'
import { Spinner } from '@claude-code-how-works/repl/components/Spinner.js'
import {
  type OptionWithDescription,
  Select,
} from '@claude-code-how-works/repl/components/CustomSelect/index.js'
import { logEvent } from '@claude-code-how-works/local-observability'
import { getAutoCompactThreshold } from '@claude-code-how-works/agent/compaction/autoCompact.js'
import {
  buildPostCompactMessages,
  compactConversation,
  ERROR_MESSAGE_USER_ABORT,
} from '@claude-code-how-works/agent/compaction/compact.js'
import { resetMicrocompactState } from '@claude-code-how-works/agent/compaction/microCompact.js'
import {
  createTaskStateBase,
  generateTaskId,
  isTerminalTaskStatus,
} from '@claude-code-how-works/tool-registry/Task.js'
import {
  createActivityDescriptionResolver,
  createProgressTracker,
  getProgressUpdate,
  updateProgressFromMessage,
} from '@claude-code-how-works/agent/localAgentTask.js'
import { AGENT_COLORS } from '@claude-code-how-works/tool-registry/tools/AgentTool/agentColorManager.js'
import { runAgent } from '@claude-code-how-works/tool-registry/tools/AgentTool/runAgent.js'
import { awaitClassifierAutoApproval } from '@claude-code-how-works/tool-registry/tools/BashTool/bashPermissions.js'
import { BASH_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/BashTool/toolName.js'
import { SEND_MESSAGE_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/SendMessageTool/constants.js'
import { TASK_CREATE_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/TaskCreateTool/constants.js'
import { TASK_GET_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/TaskGetTool/constants.js'
import { TASK_LIST_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/TaskListTool/constants.js'
import { TASK_UPDATE_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/TaskUpdateTool/constants.js'
import { TEAM_CREATE_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/TeamCreateTool/constants.js'
import { TEAM_DELETE_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/TeamDeleteTool/constants.js'
import { getSpinnerVerbs } from '@claude-code-how-works/agent/constants/spinnerVerbs.js'
import { TURN_COMPLETION_VERBS } from '@claude-code-how-works/agent/constants/turnCompletionVerbs.js'
import {
  createAssistantAPIErrorMessage,
  createUserMessage,
  SUBAGENT_REJECT_MESSAGE,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
} from '@claude-code-how-works/agent/messages.js'
import { evictTaskOutput } from '@claude-code-how-works/storage/task/diskOutput.js'
import {
  evictTerminalTask,
  registerTask,
  STOPPED_DISPLAY_MS,
  updateTaskState,
} from '@claude-code-how-works/agent/task/framework.js'
import { tokenCountWithEstimation } from '@claude-code-how-works/agent/tokens.js'
import { createAbortController } from '@claude-code-how-works/agent/abortController.js'
import { runWithAgentContext } from '@claude-code-how-works/agent/agentContext.js'
import { count } from '@claude-code-how-works/tool-registry/utils/array.js'
import { logForDebugging } from '@claude-code-how-works/local-observability/debug.js'
import { logError } from '@claude-code-how-works/local-observability/log.js'
import { cloneFileStateCache } from '@claude-code-how-works/tool-registry/fileStateCache'
import {
  applyPermissionUpdate,
  applyPermissionUpdates,
  persistPermissionUpdates,
} from '@claude-code-how-works/permission/PermissionUpdate'
import { hasPermissionsToUseTool } from '@claude-code-how-works/permission/permissions'
import { emitTaskTerminatedSdk } from '@claude-code-how-works/agent/sdkEventQueue.js'
import { sleep } from '@claude-code-how-works/config/sleep'
import { jsonParse, jsonStringify } from '@claude-code-how-works/local-observability/slowOperations.js'
import { asSystemPrompt } from '@claude-code-how-works/provider/systemPromptType.js'
import {
  claimTask,
  listTasks,
  updateTask,
  sanitizePathComponent,
  getTasksDir,
  notifyTasksUpdated,
} from '@claude-code-how-works/agent/tasks.js'
import { PermissionModeSchema } from '@claude-code-how-works/headless-sdk/coreSchemas.js'
import {
  createTeammateContext,
  runWithTeammateContext,
} from '../teammateContextAlias.js'
import {
  getAgentId,
  getAgentName,
  getDynamicTeamContext,
  getTeamName,
  getTeammateColor,
  isTeammate,
} from '../teammateState.js'
import {
  isPerfettoTracingEnabled,
  registerAgent,
  unregisterAgent,
} from '@claude-code-how-works/local-observability/telemetry/perfettoTracing.js'
import { createContentReplacementState } from '@claude-code-how-works/storage/toolResultStorage.js'
import {
  formatAgentId,
  generateRequestId,
  parseAgentId,
} from '@claude-code-how-works/agent/agentIdUtils'
import { registerCleanup } from '@claude-code-how-works/app-host/bootstrap/cleanupRegistry.js'
import {
  getChromeFlagOverride,
  getFlagSettingsPath,
  getInlinePlugins,
  getIsNonInteractiveSession,
  getMainLoopModelOverride,
  getSessionBypassPermissionsMode,
  getSessionCreatedTeams,
  getSessionId,
} from '@claude-code-how-works/app-host/bootstrap/state.js'
import { quote } from '@claude-code-how-works/shell/bash/shellQuote.js'
import { isInBundledMode } from '@claude-code-how-works/config/bundledMode'
import { getPlatform } from '@claude-code-how-works/config/platform'
import {
  getGlobalConfig,
  saveCurrentProjectConfig,
  saveGlobalConfig,
} from '@claude-code-how-works/config'
import { env } from '@claude-code-how-works/config/env/paths'
import {
  execFileNoThrow,
  execFileNoThrowWithCwd,
} from '@claude-code-how-works/shell/execFileNoThrow.js'
import { getTeamsDir } from '@claude-code-how-works/config/env/utils'
import { errorMessage, getErrnoCode } from '@claude-code-how-works/local-observability/errorHelpers.js'
import { lazySchema } from '@claude-code-how-works/tool-registry/utils/lazySchema.js'
import { check, lock, lockSync, unlock } from '@claude-code-how-works/storage/lockfile.js'
import {
  findCanonicalGitRoot,
  findGitRoot,
  getBranch,
  getDefaultBranch,
  gitExe,
} from '@claude-code-how-works/storage/git.js'
import { parseGitConfigValue } from '@claude-code-how-works/agent/git/gitConfigParser.js'
import {
  getCommonDir,
  readWorktreeHeadSha,
  resolveGitDir,
  resolveRef,
} from '@claude-code-how-works/agent/git/gitFilesystem.js'
import {
  executeWorktreeCreateHook,
  executeWorktreeRemoveHook,
  hasWorktreeCreateHook,
} from '@claude-code-how-works/agent/hooks.js'
import { addFunctionHook } from '@claude-code-how-works/agent/hooks/sessionHooks.js'
import { containsPathTraversal } from '@claude-code-how-works/storage/path.js'
import {
  getInitialSettings,
  getRelativeSettingsFilePathForSource,
} from '@claude-code-how-works/config/settings/core/settings.js'
import { getCwd } from '@claude-code-how-works/app-host/bootstrap/cwd.js'
import { CLAUDE_OPUS_4_7_CONFIG } from '@claude-code-how-works/provider/model/configs.js'
import { getAPIProvider } from '@claude-code-how-works/provider/model/providers.js'

let installed = false

export function installSwarmHost(): void {
  if (installed) {
    return
  }

  installSwarmAppRuntime({
    async getSystemPrompt(...args: any[]) {
      const mod = await import('@claude-code-how-works/agent/constants/prompts.js')
      return mod.getSystemPrompt(...args)
    },
    TEAMMATE_MESSAGE_TAG,
    processMailboxPermissionResponse,
    registerPermissionCallback,
    unregisterPermissionCallback,
    logEvent,
    getAutoCompactThreshold,
    buildPostCompactMessages,
    compactConversation,
    ERROR_MESSAGE_USER_ABORT,
    resetMicrocompactState,
    createTaskStateBase,
    generateTaskId,
    isTerminalTaskStatus,
    createActivityDescriptionResolver,
    createProgressTracker,
    getProgressUpdate,
    updateProgressFromMessage,
    runAgent,
    AGENT_COLORS,
    awaitClassifierAutoApproval,
    BASH_TOOL_NAME,
    SEND_MESSAGE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_GET_TOOL_NAME,
    TASK_LIST_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    TEAM_CREATE_TOOL_NAME,
    TEAM_DELETE_TOOL_NAME,
    getSpinnerVerbs,
    TURN_COMPLETION_VERBS,
    createAssistantAPIErrorMessage,
    createUserMessage,
    SUBAGENT_REJECT_MESSAGE,
    SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
    evictTaskOutput,
    evictTerminalTask,
    registerTask,
    STOPPED_DISPLAY_MS,
    updateTaskState,
    tokenCountWithEstimation,
    createAbortController,
    runWithAgentContext,
    count,
    logForDebugging,
    logError,
    cloneFileStateCache,
    applyPermissionUpdates,
    persistPermissionUpdates,
    applyPermissionUpdate,
    hasPermissionsToUseTool,
    emitTaskTerminatedSdk,
    sleep,
    jsonParse,
    jsonStringify,
    asSystemPrompt,
    claimTask,
    listTasks,
    updateTask,
    sanitizePathComponent,
    getTasksDir,
    notifyTasksUpdated,
    PermissionModeSchema,
    createTeammateContext,
    runWithTeammateContext,
    getAgentId,
    getAgentName,
    getDynamicTeamContext,
    getTeamName,
    getTeammateColor,
    isTeammate,
    registerPerfettoAgent: registerAgent,
    unregisterPerfettoAgent: unregisterAgent,
    isPerfettoTracingEnabled,
    registerAgent,
    unregisterAgent,
    createContentReplacementState,
    formatAgentId,
    generateRequestId,
    parseAgentId,
    registerCleanup,
    getSessionId,
    getIsNonInteractiveSession,
    getChromeFlagOverride,
    getFlagSettingsPath,
    getInlinePlugins,
    getMainLoopModelOverride,
    getSessionBypassPermissionsMode,
    getSessionCreatedTeams,
    quote,
    isInBundledMode,
    getPlatform,
    getGlobalConfig,
    saveGlobalConfig,
    env,
    execFileNoThrow,
    execFileNoThrowWithCwd,
    getTeamsDir,
    errorMessage,
    getErrnoCode,
    lazySchema,
    lock,
    lockSync,
    unlock,
    check,
    gitExe,
    parseGitConfigValue,
    getCommonDir,
    readWorktreeHeadSha,
    resolveGitDir,
    resolveRef,
    findCanonicalGitRoot,
    findGitRoot,
    getBranch,
    getDefaultBranch,
    executeWorktreeCreateHook,
    executeWorktreeRemoveHook,
    hasWorktreeCreateHook,
    addFunctionHook,
    containsPathTraversal,
    getInitialSettings,
    getRelativeSettingsFilePathForSource,
    getCwd,
    saveCurrentProjectConfig,
    CLAUDE_OPUS_4_7_CONFIG,
    getAPIProvider,
  })

  installSwarmAppUi({
    Select,
    Spinner,
    useExitOnCtrlCDWithKeybindings,
  })

  installed = true
}

installSwarmHost()

export type { OptionWithDescription }
