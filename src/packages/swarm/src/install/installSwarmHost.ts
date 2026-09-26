import { installSwarmAppRuntime } from '../adapters/appRuntime.js'
import { installSwarmAppUi } from '../adapters/appUi.js'
import { TEAMMATE_MESSAGE_TAG } from '@thyrox/command-runtime/xml.js'
import {
  processMailboxPermissionResponse,
  registerPermissionCallback,
  unregisterPermissionCallback,
} from '@thyrox/repl/hooks/useSwarmPermissionPoller.js'
import { useExitOnCtrlCDWithKeybindings } from '@thyrox/repl/hooks/useExitOnCtrlCDWithKeybindings.js'
import { Spinner } from '@thyrox/repl/components/Spinner.js'
import {
  type OptionWithDescription,
  Select,
} from '@thyrox/repl/components/CustomSelect/index.js'
import { logEvent } from '@thyrox/local-observability'
import { getAutoCompactThreshold } from '@thyrox/agent/compaction/autoCompact.js'
import {
  buildPostCompactMessages,
  compactConversation,
  ERROR_MESSAGE_USER_ABORT,
} from '@thyrox/agent/compaction/compact.js'
import { resetMicrocompactState } from '@thyrox/agent/compaction/microCompact.js'
import {
  createTaskStateBase,
  generateTaskId,
  isTerminalTaskStatus,
} from '@thyrox/tool-registry/Task.js'
import {
  createActivityDescriptionResolver,
  createProgressTracker,
  getProgressUpdate,
  updateProgressFromMessage,
} from '@thyrox/agent/localAgentTask.js'
import { AGENT_COLORS } from '@thyrox/tool-registry/tools/AgentTool/agentColorManager.js'
import { runAgent } from '@thyrox/tool-registry/tools/AgentTool/runAgent.js'
import { awaitClassifierAutoApproval } from '@thyrox/tool-registry/tools/BashTool/bashPermissions.js'
import { BASH_TOOL_NAME } from '@thyrox/tool-registry/tools/BashTool/toolName.js'
import { SEND_MESSAGE_TOOL_NAME } from '@thyrox/tool-registry/tools/SendMessageTool/constants.js'
import { TASK_CREATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskCreateTool/constants.js'
import { TASK_GET_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskGetTool/constants.js'
import { TASK_LIST_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskListTool/constants.js'
import { TASK_UPDATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskUpdateTool/constants.js'
import { TEAM_CREATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TeamCreateTool/constants.js'
import { TEAM_DELETE_TOOL_NAME } from '@thyrox/tool-registry/tools/TeamDeleteTool/constants.js'
import type { getSystemPrompt as getSystemPromptSignature } from '@thyrox/agent/constants/prompts.js'
import { getSpinnerVerbs } from '@thyrox/agent/constants/spinnerVerbs.js'
import { TURN_COMPLETION_VERBS } from '@thyrox/agent/constants/turnCompletionVerbs.js'
import {
  createAssistantAPIErrorMessage,
  createUserMessage,
  SUBAGENT_REJECT_MESSAGE,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
} from '@thyrox/agent/messages.js'
import { evictTaskOutput } from '@thyrox/storage/task/diskOutput.js'
import {
  evictTerminalTask,
  registerTask,
  STOPPED_DISPLAY_MS,
  updateTaskState,
} from '@thyrox/agent/task/framework.js'
import { tokenCountWithEstimation } from '@thyrox/agent/tokens.js'
import { createAbortController } from '@thyrox/agent/abortController.js'
import { runWithAgentContext } from '@thyrox/agent/agentContext.js'
import { count } from '@thyrox/tool-registry/utils/array.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { logError } from '@thyrox/local-observability/log.js'
import { cloneFileStateCache } from '@thyrox/tool-registry/fileStateCache'
import {
  applyPermissionUpdate,
  applyPermissionUpdates,
  persistPermissionUpdates,
} from '@thyrox/permission/PermissionUpdate'
import { hasPermissionsToUseTool } from '@thyrox/permission/permissions'
import { emitTaskTerminatedSdk } from '@thyrox/agent/sdkEventQueue.js'
import { sleep } from '@thyrox/config/sleep'
import { jsonParse, jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { asSystemPrompt } from '@thyrox/provider/systemPromptType.js'
import {
  claimTask,
  listTasks,
  updateTask,
  sanitizePathComponent,
  getTasksDir,
  notifyTasksUpdated,
} from '@thyrox/agent/tasks.js'
import { PermissionModeSchema } from '@thyrox/headless-sdk/coreSchemas.js'
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
} from '@thyrox/local-observability/telemetry/perfettoTracing.js'
import { createContentReplacementState } from '@thyrox/storage/toolResultStorage.js'
import {
  formatAgentId,
  generateRequestId,
  parseAgentId,
} from '@thyrox/agent/agentIdUtils'
import { registerCleanup } from '@thyrox/app-host/bootstrap/cleanupRegistry.js'
import {
  getChromeFlagOverride,
  getFlagSettingsPath,
  getInlinePlugins,
  getIsNonInteractiveSession,
  getMainLoopModelOverride,
  getSessionBypassPermissionsMode,
  getSessionCreatedTeams,
  getSessionId,
} from '@thyrox/app-host/bootstrap/state.js'
import { quote } from '@thyrox/shell/bash/shellQuote.js'
import { isInBundledMode } from '@thyrox/config/bundledMode'
import { getPlatform } from '@thyrox/config/platform'
import {
  getGlobalConfig,
  saveCurrentProjectConfig,
  saveGlobalConfig,
} from '@thyrox/config'
import { env } from '@thyrox/config/env/paths'
import {
  execFileNoThrow,
  execFileNoThrowWithCwd,
} from '@thyrox/shell/execFileNoThrow.js'
import { getTeamsDir } from '@thyrox/config/env/utils'
import { errorMessage, getErrnoCode } from '@thyrox/local-observability/errorHelpers.js'
import { lazySchema } from '@thyrox/tool-registry/utils/lazySchema.js'
import { check, lock, lockSync, unlock } from '@thyrox/storage/lockfile.js'
import {
  findCanonicalGitRoot,
  findGitRoot,
  getBranch,
  getDefaultBranch,
  gitExe,
} from '@thyrox/storage/git.js'
import { parseGitConfigValue } from '@thyrox/agent/git/gitConfigParser.js'
import {
  getCommonDir,
  readWorktreeHeadSha,
  resolveGitDir,
  resolveRef,
} from '@thyrox/agent/git/gitFilesystem.js'
import {
  executeWorktreeCreateHook,
  executeWorktreeRemoveHook,
  hasWorktreeCreateHook,
} from '@thyrox/agent/hooks.js'
import { addFunctionHook } from '@thyrox/agent/hooks/sessionHooks.js'
import { containsPathTraversal } from '@thyrox/storage/path.js'
import {
  getInitialSettings,
  getRelativeSettingsFilePathForSource,
} from '@thyrox/config/settings/core/settings.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { CLAUDE_OPUS_4_7_CONFIG } from '@thyrox/provider/model/configs.js'
import { getAPIProvider } from '@thyrox/provider/model/providers.js'

let installed = false

export function installSwarmHost(): void {
  if (installed) {
    return
  }

  installSwarmAppRuntime({
    async getSystemPrompt(...args: Parameters<typeof getSystemPromptSignature>) {
      const mod = await import('@thyrox/agent/constants/prompts.js')
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
