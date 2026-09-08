/**
 * `appRuntime` — el adaptador de host bindings del paquete swarm.
 *
 * Procedencia: `ccnmt: packages/swarm/src/adapters/appRuntime.ts` (595 líneas,
 * 148 exports). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo
 * se **reimplementa** y no se copia. La LISTA de nombres de binding sí se
 * deriva de la fuente: es el contrato con el anfitrión, no texto.
 *
 * QUÉ RESUELVE. Swarm necesita docenas de servicios del anfitrión —cwd, git,
 * sesiones, herramientas, settings, telemetría— cuyos tipos no tienen nada en
 * común entre sí. En vez de importarlos, los pide por NOMBRE a un mapa que el
 * anfitrión instala al arrancar. El mapa es `Record<string, unknown>` a
 * propósito: el contrato de cada uno se comprueba en el sitio de llamada, no
 * al guardarlo, y las conversiones de este archivo son ese cruce declarado, no
 * desajustes escondidos.
 *
 * LOS DOS ESTADOS DE UN BINDING, y la diferencia importa:
 *
 * - **función** (105) — arranca como un stub que LANZA al tocarse, con su
 *   propio nombre en el mensaje. Un anfitrión al que le falta uno recibe un
 *   error accionable en vez del mismo fallo genérico 105 veces.
 * - **valor** (19) — arranca con un literal razonable y NO lanza. Son
 *   constantes: una etiqueta, un nombre de herramienta, una lista de colores.
 *   Que no lancen es lo que permite importar el módulo sin instalar nada.
 *
 * La tarea #240 declaraba este módulo bloqueado porque «cruza 3 tipos».
 * Re-medido: su único import externo es `zod`, y sus dos referencias a
 * hermanos son reexportaciones de tipo que existen en este árbol.
 *
 * DIVERGENCIA DECLARADA: el mapa se tipa `Record<string, unknown>` en vez de
 * `Record<string, any>`. Es el mismo cruce, dicho sin apagar el comprobador
 * para todo el archivo — las conversiones quedan en el punto donde ocurren.
 */
import { z } from 'zod'

/**
 * Los nombres de binding de FUNCIÓN, derivados de la fuente.
 *
 * Se exportan porque son el contrato: quien instale el runtime necesita saber
 * qué se le pide, y un gate futuro puede compararlos contra la fuente sin
 * releer 595 líneas.
 */
export const SWARM_FUNCTION_BINDINGS = [
  'getSystemPrompt',
  'processMailboxPermissionResponse',
  'registerPermissionCallback',
  'unregisterPermissionCallback',
  'logEvent',
  'getAutoCompactThreshold',
  'buildPostCompactMessages',
  'compactConversation',
  'resetMicrocompactState',
  'createTaskStateBase',
  'generateTaskId',
  'isTerminalTaskStatus',
  'createActivityDescriptionResolver',
  'createProgressTracker',
  'getProgressUpdate',
  'updateProgressFromMessage',
  'runAgent',
  'awaitClassifierAutoApproval',
  'getSpinnerVerbs',
  'createAssistantAPIErrorMessage',
  'createUserMessage',
  'evictTaskOutput',
  'evictTerminalTask',
  'registerTask',
  'updateTaskState',
  'tokenCountWithEstimation',
  'createAbortController',
  'runWithAgentContext',
  'count',
  'cloneFileStateCache',
  'applyPermissionUpdates',
  'persistPermissionUpdates',
  'applyPermissionUpdate',
  'hasPermissionsToUseTool',
  'emitTaskTerminatedSdk',
  'sleep',
  'jsonParse',
  'jsonStringify',
  'asSystemPrompt',
  'claimTask',
  'listTasks',
  'updateTask',
  'sanitizePathComponent',
  'getTasksDir',
  'notifyTasksUpdated',
  'createTeammateContext',
  'runWithTeammateContext',
  'getAgentId',
  'getAgentName',
  'getDynamicTeamContext',
  'getTeamName',
  'getTeammateColor',
  'isTeammate',
  'registerPerfettoAgent',
  'unregisterPerfettoAgent',
  'isPerfettoTracingEnabled',
  'registerAgent',
  'unregisterAgent',
  'createContentReplacementState',
  'formatAgentId',
  'generateRequestId',
  'parseAgentId',
  'registerCleanup',
  'getSessionId',
  'getIsNonInteractiveSession',
  'getChromeFlagOverride',
  'getFlagSettingsPath',
  'getInlinePlugins',
  'getMainLoopModelOverride',
  'getSessionBypassPermissionsMode',
  'getSessionCreatedTeams',
  'quote',
  'isInBundledMode',
  'getPlatform',
  'getGlobalConfig',
  'saveGlobalConfig',
  'execFileNoThrow',
  'execFileNoThrowWithCwd',
  'getTeamsDir',
  'errorMessage',
  'getErrnoCode',
  'lock',
  'lockSync',
  'unlock',
  'check',
  'gitExe',
  'parseGitConfigValue',
  'getCommonDir',
  'readWorktreeHeadSha',
  'resolveGitDir',
  'resolveRef',
  'findCanonicalGitRoot',
  'findGitRoot',
  'getBranch',
  'getDefaultBranch',
  'executeWorktreeCreateHook',
  'executeWorktreeRemoveHook',
  'hasWorktreeCreateHook',
  'addFunctionHook',
  'containsPathTraversal',
  'getInitialSettings',
  'getRelativeSettingsFilePathForSource',
  'getCwd',
  'saveCurrentProjectConfig',
  'getAPIProvider',
] as const

/** Los nombres de binding de VALOR — los que arrancan con literal. */
export const SWARM_VALUE_BINDINGS = [
  'TEAMMATE_MESSAGE_TAG',
  'ERROR_MESSAGE_USER_ABORT',
  'BASH_TOOL_NAME',
  'SEND_MESSAGE_TOOL_NAME',
  'TASK_CREATE_TOOL_NAME',
  'TASK_GET_TOOL_NAME',
  'TASK_LIST_TOOL_NAME',
  'TASK_UPDATE_TOOL_NAME',
  'TEAM_CREATE_TOOL_NAME',
  'TEAM_DELETE_TOOL_NAME',
  'TURN_COMPLETION_VERBS',
  'SUBAGENT_REJECT_MESSAGE',
  'SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX',
  'STOPPED_DISPLAY_MS',
  'AGENT_COLORS',
  'CLAUDE_OPUS_4_7_CONFIG',
  'env',
  'logForDebugging',
  'logError',
] as const

type RuntimeBindingMap = Record<string, unknown>

let runtimeBindings: RuntimeBindingMap | null = null

/**
 * El stub de una función no instalada: lanza al TOCARSE, no al declararse.
 *
 * Lanzar al declararse impediría importar el módulo; lanzar al tocarse deja
 * que el anfitrión instale sólo lo que use y se entere justo de lo que le
 * falta.
 */
function missingBinding(name: string): (...args: never[]) => never {
  return () => {
    throw new Error(
      `Swarm runtime binding "${name}" is unavailable. ` +
        'installSwarmAppRuntime() must run before using @thyrox/swarm runtime helpers.',
    )
  }
}

function getBinding<T>(name: string): T {
  if (!runtimeBindings || !(name in runtimeBindings)) {
    throw new Error(
      `Swarm runtime binding "${name}" is unavailable. ` +
        'installSwarmAppRuntime() must run before using @thyrox/swarm runtime helpers.',
    )
  }
  return runtimeBindings[name] as T
}

/**
 * Construye tarde y una sola vez.
 *
 * `??=` y no `||=`: con el segundo, un valor falsy se reconstruiría en cada
 * llamada y la memoización sería un adorno.
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

export const PermissionModeSchema = lazySchema(() =>
  z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan', 'dontAsk']),
)

/**
 * Los tipos son LAXOS a propósito, igual que en la fuente: cada uno nombra un
 * contrato del anfitrión que este paquete no puede conocer, y fingir una forma
 * concreta aquí declararía una promesa que nadie sostiene.
 */
export type CanUseToolFn = (...args: any[]) => Promise<any>
export type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = string
export type AppState = unknown
export type Tool = unknown
export type AgentProgress = unknown
export type CustomAgentDefinition = unknown
export type AgentDefinition = unknown
export type AgentToolResult = unknown
export type PermissionDecision = unknown
export type AgentContext = unknown
export type ModelAlias = string
export type PermissionUpdate = unknown
export type PermissionMode = string
export type Task = unknown
export type SetAppState = (updater: (prev: AppState) => AppState) => void
export type TeammateContext = unknown
export type AgentColorName = string

export type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'
export type { Message } from '@thyrox/agent/messageShapes.js'

export let TEAMMATE_MESSAGE_TAG = 'teammate-message'
export let ERROR_MESSAGE_USER_ABORT = ''
export let BASH_TOOL_NAME = ''
export let SEND_MESSAGE_TOOL_NAME = ''
export let TASK_CREATE_TOOL_NAME = ''
export let TASK_GET_TOOL_NAME = ''
export let TASK_LIST_TOOL_NAME = ''
export let TASK_UPDATE_TOOL_NAME = ''
export let TEAM_CREATE_TOOL_NAME = ''
export let TEAM_DELETE_TOOL_NAME = ''
export let TURN_COMPLETION_VERBS: string[] = []
export let SUBAGENT_REJECT_MESSAGE = ''
export let SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX = ''
export let STOPPED_DISPLAY_MS = 0
export let AGENT_COLORS: string[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'cyan',
]
// La configuracion de un modelo esta indexada POR PROVEEDOR: el mismo
// modelo tiene identificador distinto en cada uno, y devolver el de
// primera parte a un cliente de Bedrock produce una peticion que su
// endpoint no entiende. Por eso es un mapa y no un nombre suelto.
export let CLAUDE_OPUS_4_7_CONFIG: Record<string, string> = {}
export let env: any = {}
export let logForDebugging = (() => {}) as any
export let logError = (() => {}) as any

export let getSystemPrompt = missingBinding('getSystemPrompt') as never
export let processMailboxPermissionResponse = missingBinding('processMailboxPermissionResponse') as never
export let registerPermissionCallback = missingBinding('registerPermissionCallback') as never
export let unregisterPermissionCallback = missingBinding('unregisterPermissionCallback') as never
export let logEvent = missingBinding('logEvent') as never
export let getAutoCompactThreshold = missingBinding('getAutoCompactThreshold') as never
export let buildPostCompactMessages = missingBinding('buildPostCompactMessages') as never
export let compactConversation = missingBinding('compactConversation') as never
export let resetMicrocompactState = missingBinding('resetMicrocompactState') as never
export let createTaskStateBase = missingBinding('createTaskStateBase') as never
export let generateTaskId = missingBinding('generateTaskId') as never
export let isTerminalTaskStatus = missingBinding('isTerminalTaskStatus') as never
export let createActivityDescriptionResolver = missingBinding('createActivityDescriptionResolver') as never
export let createProgressTracker = missingBinding('createProgressTracker') as never
export let getProgressUpdate = missingBinding('getProgressUpdate') as never
export let updateProgressFromMessage = missingBinding('updateProgressFromMessage') as never
export let runAgent = missingBinding('runAgent') as never
export let awaitClassifierAutoApproval = missingBinding('awaitClassifierAutoApproval') as never
export let getSpinnerVerbs = missingBinding('getSpinnerVerbs') as never
export let createAssistantAPIErrorMessage = missingBinding('createAssistantAPIErrorMessage') as never
export let createUserMessage = missingBinding('createUserMessage') as never
export let evictTaskOutput = missingBinding('evictTaskOutput') as never
export let evictTerminalTask = missingBinding('evictTerminalTask') as never
export let registerTask = missingBinding('registerTask') as never
export let updateTaskState = missingBinding('updateTaskState') as never
export let tokenCountWithEstimation = missingBinding('tokenCountWithEstimation') as never
export let createAbortController = missingBinding('createAbortController') as never
export let runWithAgentContext = missingBinding('runWithAgentContext') as never
export let count = missingBinding('count') as never
export let cloneFileStateCache = missingBinding('cloneFileStateCache') as never
export let applyPermissionUpdates = missingBinding('applyPermissionUpdates') as never
export let persistPermissionUpdates = missingBinding('persistPermissionUpdates') as never
export let applyPermissionUpdate = missingBinding('applyPermissionUpdate') as never
export let hasPermissionsToUseTool = missingBinding('hasPermissionsToUseTool') as never
export let emitTaskTerminatedSdk = missingBinding('emitTaskTerminatedSdk') as never
export let sleep = missingBinding('sleep') as never
export let jsonParse = missingBinding('jsonParse') as never
export let jsonStringify = missingBinding('jsonStringify') as never
export let asSystemPrompt = missingBinding('asSystemPrompt') as never
export let claimTask = missingBinding('claimTask') as never
export let listTasks = missingBinding('listTasks') as never
export let updateTask = missingBinding('updateTask') as never
export let sanitizePathComponent = missingBinding('sanitizePathComponent') as never
export let getTasksDir = missingBinding('getTasksDir') as never
export let notifyTasksUpdated = missingBinding('notifyTasksUpdated') as never
export let createTeammateContext = missingBinding('createTeammateContext') as never
export let runWithTeammateContext = missingBinding('runWithTeammateContext') as never
export let getAgentId = missingBinding('getAgentId') as never
export let getAgentName = missingBinding('getAgentName') as never
export let getDynamicTeamContext = missingBinding('getDynamicTeamContext') as never
export let getTeamName = missingBinding('getTeamName') as never
export let getTeammateColor = missingBinding('getTeammateColor') as never
export let isTeammate = missingBinding('isTeammate') as never
export let registerPerfettoAgent = missingBinding('registerPerfettoAgent') as never
export let unregisterPerfettoAgent = missingBinding('unregisterPerfettoAgent') as never
export let isPerfettoTracingEnabled = missingBinding('isPerfettoTracingEnabled') as never
export let registerAgent = missingBinding('registerAgent') as never
export let unregisterAgent = missingBinding('unregisterAgent') as never
export let createContentReplacementState = missingBinding('createContentReplacementState') as never
export let formatAgentId = missingBinding('formatAgentId') as never
export let generateRequestId = missingBinding('generateRequestId') as never
export let parseAgentId = missingBinding('parseAgentId') as never
export let registerCleanup = missingBinding('registerCleanup') as never
export let getSessionId = missingBinding('getSessionId') as never
export let getIsNonInteractiveSession = missingBinding('getIsNonInteractiveSession') as never
export let getChromeFlagOverride = missingBinding('getChromeFlagOverride') as never
export let getFlagSettingsPath = missingBinding('getFlagSettingsPath') as never
export let getInlinePlugins = missingBinding('getInlinePlugins') as never
export let getMainLoopModelOverride = missingBinding('getMainLoopModelOverride') as never
export let getSessionBypassPermissionsMode = missingBinding('getSessionBypassPermissionsMode') as never
export let getSessionCreatedTeams = missingBinding('getSessionCreatedTeams') as never
export let quote = missingBinding('quote') as never
export let isInBundledMode = missingBinding('isInBundledMode') as never
export let getPlatform = missingBinding('getPlatform') as never
export let getGlobalConfig = missingBinding('getGlobalConfig') as never
export let saveGlobalConfig = missingBinding('saveGlobalConfig') as never
export let execFileNoThrow = missingBinding('execFileNoThrow') as never
export let execFileNoThrowWithCwd = missingBinding('execFileNoThrowWithCwd') as never
export let getTeamsDir = missingBinding('getTeamsDir') as never
export let errorMessage = missingBinding('errorMessage') as never
export let getErrnoCode = missingBinding('getErrnoCode') as never
export let lock = missingBinding('lock') as never
export let lockSync = missingBinding('lockSync') as never
export let unlock = missingBinding('unlock') as never
export let check = missingBinding('check') as never
export let gitExe = missingBinding('gitExe') as never
export let parseGitConfigValue = missingBinding('parseGitConfigValue') as never
export let getCommonDir = missingBinding('getCommonDir') as never
export let readWorktreeHeadSha = missingBinding('readWorktreeHeadSha') as never
export let resolveGitDir = missingBinding('resolveGitDir') as never
export let resolveRef = missingBinding('resolveRef') as never
export let findCanonicalGitRoot = missingBinding('findCanonicalGitRoot') as never
export let findGitRoot = missingBinding('findGitRoot') as never
export let getBranch = missingBinding('getBranch') as never
export let getDefaultBranch = missingBinding('getDefaultBranch') as never
export let executeWorktreeCreateHook = missingBinding('executeWorktreeCreateHook') as never
export let executeWorktreeRemoveHook = missingBinding('executeWorktreeRemoveHook') as never
export let hasWorktreeCreateHook = missingBinding('hasWorktreeCreateHook') as never
export let addFunctionHook = missingBinding('addFunctionHook') as never
export let containsPathTraversal = missingBinding('containsPathTraversal') as never
export let getInitialSettings = missingBinding('getInitialSettings') as never
export let getRelativeSettingsFilePathForSource = missingBinding('getRelativeSettingsFilePathForSource') as never
export let getCwd = missingBinding('getCwd') as never
export let saveCurrentProjectConfig = missingBinding('saveCurrentProjectConfig') as never
export let getAPIProvider = missingBinding('getAPIProvider') as never

/**
 * Instala el mapa del anfitrión y reapunta cada binding por su nombre.
 *
 * Un mapa PARCIAL es válido: lo que no venga sigue lanzando al tocarse, que es
 * mejor que un no-op silencioso — el anfitrión que olvidó uno se entera al
 * usarlo, no al depurar por qué no pasó nada.
 */
export function installSwarmAppRuntime(bindings: RuntimeBindingMap): void {
  runtimeBindings = bindings

  TEAMMATE_MESSAGE_TAG = getBinding('TEAMMATE_MESSAGE_TAG')
  ERROR_MESSAGE_USER_ABORT = getBinding('ERROR_MESSAGE_USER_ABORT')
  BASH_TOOL_NAME = getBinding('BASH_TOOL_NAME')
  SEND_MESSAGE_TOOL_NAME = getBinding('SEND_MESSAGE_TOOL_NAME')
  TASK_CREATE_TOOL_NAME = getBinding('TASK_CREATE_TOOL_NAME')
  TASK_GET_TOOL_NAME = getBinding('TASK_GET_TOOL_NAME')
  TASK_LIST_TOOL_NAME = getBinding('TASK_LIST_TOOL_NAME')
  TASK_UPDATE_TOOL_NAME = getBinding('TASK_UPDATE_TOOL_NAME')
  TEAM_CREATE_TOOL_NAME = getBinding('TEAM_CREATE_TOOL_NAME')
  TEAM_DELETE_TOOL_NAME = getBinding('TEAM_DELETE_TOOL_NAME')
  TURN_COMPLETION_VERBS = getBinding('TURN_COMPLETION_VERBS')
  SUBAGENT_REJECT_MESSAGE = getBinding('SUBAGENT_REJECT_MESSAGE')
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX = getBinding('SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX')
  STOPPED_DISPLAY_MS = getBinding('STOPPED_DISPLAY_MS')
  AGENT_COLORS = getBinding('AGENT_COLORS')
  CLAUDE_OPUS_4_7_CONFIG = getBinding('CLAUDE_OPUS_4_7_CONFIG')
  env = getBinding('env')
  logForDebugging = getBinding('logForDebugging')
  logError = getBinding('logError')

  getSystemPrompt = getBinding('getSystemPrompt')
  processMailboxPermissionResponse = getBinding('processMailboxPermissionResponse')
  registerPermissionCallback = getBinding('registerPermissionCallback')
  unregisterPermissionCallback = getBinding('unregisterPermissionCallback')
  logEvent = getBinding('logEvent')
  getAutoCompactThreshold = getBinding('getAutoCompactThreshold')
  buildPostCompactMessages = getBinding('buildPostCompactMessages')
  compactConversation = getBinding('compactConversation')
  resetMicrocompactState = getBinding('resetMicrocompactState')
  createTaskStateBase = getBinding('createTaskStateBase')
  generateTaskId = getBinding('generateTaskId')
  isTerminalTaskStatus = getBinding('isTerminalTaskStatus')
  createActivityDescriptionResolver = getBinding('createActivityDescriptionResolver')
  createProgressTracker = getBinding('createProgressTracker')
  getProgressUpdate = getBinding('getProgressUpdate')
  updateProgressFromMessage = getBinding('updateProgressFromMessage')
  runAgent = getBinding('runAgent')
  awaitClassifierAutoApproval = getBinding('awaitClassifierAutoApproval')
  getSpinnerVerbs = getBinding('getSpinnerVerbs')
  createAssistantAPIErrorMessage = getBinding('createAssistantAPIErrorMessage')
  createUserMessage = getBinding('createUserMessage')
  evictTaskOutput = getBinding('evictTaskOutput')
  evictTerminalTask = getBinding('evictTerminalTask')
  registerTask = getBinding('registerTask')
  updateTaskState = getBinding('updateTaskState')
  tokenCountWithEstimation = getBinding('tokenCountWithEstimation')
  createAbortController = getBinding('createAbortController')
  runWithAgentContext = getBinding('runWithAgentContext')
  count = getBinding('count')
  cloneFileStateCache = getBinding('cloneFileStateCache')
  applyPermissionUpdates = getBinding('applyPermissionUpdates')
  persistPermissionUpdates = getBinding('persistPermissionUpdates')
  applyPermissionUpdate = getBinding('applyPermissionUpdate')
  hasPermissionsToUseTool = getBinding('hasPermissionsToUseTool')
  emitTaskTerminatedSdk = getBinding('emitTaskTerminatedSdk')
  sleep = getBinding('sleep')
  jsonParse = getBinding('jsonParse')
  jsonStringify = getBinding('jsonStringify')
  asSystemPrompt = getBinding('asSystemPrompt')
  claimTask = getBinding('claimTask')
  listTasks = getBinding('listTasks')
  updateTask = getBinding('updateTask')
  sanitizePathComponent = getBinding('sanitizePathComponent')
  getTasksDir = getBinding('getTasksDir')
  notifyTasksUpdated = getBinding('notifyTasksUpdated')
  createTeammateContext = getBinding('createTeammateContext')
  runWithTeammateContext = getBinding('runWithTeammateContext')
  getAgentId = getBinding('getAgentId')
  getAgentName = getBinding('getAgentName')
  getDynamicTeamContext = getBinding('getDynamicTeamContext')
  getTeamName = getBinding('getTeamName')
  getTeammateColor = getBinding('getTeammateColor')
  isTeammate = getBinding('isTeammate')
  registerPerfettoAgent = getBinding('registerPerfettoAgent')
  unregisterPerfettoAgent = getBinding('unregisterPerfettoAgent')
  isPerfettoTracingEnabled = getBinding('isPerfettoTracingEnabled')
  registerAgent = getBinding('registerAgent')
  unregisterAgent = getBinding('unregisterAgent')
  createContentReplacementState = getBinding('createContentReplacementState')
  formatAgentId = getBinding('formatAgentId')
  generateRequestId = getBinding('generateRequestId')
  parseAgentId = getBinding('parseAgentId')
  registerCleanup = getBinding('registerCleanup')
  getSessionId = getBinding('getSessionId')
  getIsNonInteractiveSession = getBinding('getIsNonInteractiveSession')
  getChromeFlagOverride = getBinding('getChromeFlagOverride')
  getFlagSettingsPath = getBinding('getFlagSettingsPath')
  getInlinePlugins = getBinding('getInlinePlugins')
  getMainLoopModelOverride = getBinding('getMainLoopModelOverride')
  getSessionBypassPermissionsMode = getBinding('getSessionBypassPermissionsMode')
  getSessionCreatedTeams = getBinding('getSessionCreatedTeams')
  quote = getBinding('quote')
  isInBundledMode = getBinding('isInBundledMode')
  getPlatform = getBinding('getPlatform')
  getGlobalConfig = getBinding('getGlobalConfig')
  saveGlobalConfig = getBinding('saveGlobalConfig')
  execFileNoThrow = getBinding('execFileNoThrow')
  execFileNoThrowWithCwd = getBinding('execFileNoThrowWithCwd')
  getTeamsDir = getBinding('getTeamsDir')
  errorMessage = getBinding('errorMessage')
  getErrnoCode = getBinding('getErrnoCode')
  lock = getBinding('lock')
  lockSync = getBinding('lockSync')
  unlock = getBinding('unlock')
  check = getBinding('check')
  gitExe = getBinding('gitExe')
  parseGitConfigValue = getBinding('parseGitConfigValue')
  getCommonDir = getBinding('getCommonDir')
  readWorktreeHeadSha = getBinding('readWorktreeHeadSha')
  resolveGitDir = getBinding('resolveGitDir')
  resolveRef = getBinding('resolveRef')
  findCanonicalGitRoot = getBinding('findCanonicalGitRoot')
  findGitRoot = getBinding('findGitRoot')
  getBranch = getBinding('getBranch')
  getDefaultBranch = getBinding('getDefaultBranch')
  executeWorktreeCreateHook = getBinding('executeWorktreeCreateHook')
  executeWorktreeRemoveHook = getBinding('executeWorktreeRemoveHook')
  hasWorktreeCreateHook = getBinding('hasWorktreeCreateHook')
  addFunctionHook = getBinding('addFunctionHook')
  containsPathTraversal = getBinding('containsPathTraversal')
  getInitialSettings = getBinding('getInitialSettings')
  getRelativeSettingsFilePathForSource = getBinding('getRelativeSettingsFilePathForSource')
  getCwd = getBinding('getCwd')
  saveCurrentProjectConfig = getBinding('saveCurrentProjectConfig')
  getAPIProvider = getBinding('getAPIProvider')
}

/**
 * Devuelve todo al estado de arranque. NO es para producción.
 *
 * `bun:test` comparte el estado del módulo por proceso: sin esto, un archivo
 * que instale bindings los deja puestos para el siguiente, y el siguiente pasa
 * por una razón que no es la suya.
 */
export function _test_resetSwarmAppRuntime(): void {
  runtimeBindings = null

  TEAMMATE_MESSAGE_TAG = 'teammate-message'
  ERROR_MESSAGE_USER_ABORT = ''
  BASH_TOOL_NAME = ''
  SEND_MESSAGE_TOOL_NAME = ''
  TASK_CREATE_TOOL_NAME = ''
  TASK_GET_TOOL_NAME = ''
  TASK_LIST_TOOL_NAME = ''
  TASK_UPDATE_TOOL_NAME = ''
  TEAM_CREATE_TOOL_NAME = ''
  TEAM_DELETE_TOOL_NAME = ''
  TURN_COMPLETION_VERBS = []
  SUBAGENT_REJECT_MESSAGE = ''
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX = ''
  STOPPED_DISPLAY_MS = 0
  AGENT_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'cyan',
]
  CLAUDE_OPUS_4_7_CONFIG = {}
  env = {}
  logForDebugging = (() => {}) as any
  logError = (() => {}) as any

  getSystemPrompt = missingBinding('getSystemPrompt') as never
  processMailboxPermissionResponse = missingBinding('processMailboxPermissionResponse') as never
  registerPermissionCallback = missingBinding('registerPermissionCallback') as never
  unregisterPermissionCallback = missingBinding('unregisterPermissionCallback') as never
  logEvent = missingBinding('logEvent') as never
  getAutoCompactThreshold = missingBinding('getAutoCompactThreshold') as never
  buildPostCompactMessages = missingBinding('buildPostCompactMessages') as never
  compactConversation = missingBinding('compactConversation') as never
  resetMicrocompactState = missingBinding('resetMicrocompactState') as never
  createTaskStateBase = missingBinding('createTaskStateBase') as never
  generateTaskId = missingBinding('generateTaskId') as never
  isTerminalTaskStatus = missingBinding('isTerminalTaskStatus') as never
  createActivityDescriptionResolver = missingBinding('createActivityDescriptionResolver') as never
  createProgressTracker = missingBinding('createProgressTracker') as never
  getProgressUpdate = missingBinding('getProgressUpdate') as never
  updateProgressFromMessage = missingBinding('updateProgressFromMessage') as never
  runAgent = missingBinding('runAgent') as never
  awaitClassifierAutoApproval = missingBinding('awaitClassifierAutoApproval') as never
  getSpinnerVerbs = missingBinding('getSpinnerVerbs') as never
  createAssistantAPIErrorMessage = missingBinding('createAssistantAPIErrorMessage') as never
  createUserMessage = missingBinding('createUserMessage') as never
  evictTaskOutput = missingBinding('evictTaskOutput') as never
  evictTerminalTask = missingBinding('evictTerminalTask') as never
  registerTask = missingBinding('registerTask') as never
  updateTaskState = missingBinding('updateTaskState') as never
  tokenCountWithEstimation = missingBinding('tokenCountWithEstimation') as never
  createAbortController = missingBinding('createAbortController') as never
  runWithAgentContext = missingBinding('runWithAgentContext') as never
  count = missingBinding('count') as never
  cloneFileStateCache = missingBinding('cloneFileStateCache') as never
  applyPermissionUpdates = missingBinding('applyPermissionUpdates') as never
  persistPermissionUpdates = missingBinding('persistPermissionUpdates') as never
  applyPermissionUpdate = missingBinding('applyPermissionUpdate') as never
  hasPermissionsToUseTool = missingBinding('hasPermissionsToUseTool') as never
  emitTaskTerminatedSdk = missingBinding('emitTaskTerminatedSdk') as never
  sleep = missingBinding('sleep') as never
  jsonParse = missingBinding('jsonParse') as never
  jsonStringify = missingBinding('jsonStringify') as never
  asSystemPrompt = missingBinding('asSystemPrompt') as never
  claimTask = missingBinding('claimTask') as never
  listTasks = missingBinding('listTasks') as never
  updateTask = missingBinding('updateTask') as never
  sanitizePathComponent = missingBinding('sanitizePathComponent') as never
  getTasksDir = missingBinding('getTasksDir') as never
  notifyTasksUpdated = missingBinding('notifyTasksUpdated') as never
  createTeammateContext = missingBinding('createTeammateContext') as never
  runWithTeammateContext = missingBinding('runWithTeammateContext') as never
  getAgentId = missingBinding('getAgentId') as never
  getAgentName = missingBinding('getAgentName') as never
  getDynamicTeamContext = missingBinding('getDynamicTeamContext') as never
  getTeamName = missingBinding('getTeamName') as never
  getTeammateColor = missingBinding('getTeammateColor') as never
  isTeammate = missingBinding('isTeammate') as never
  registerPerfettoAgent = missingBinding('registerPerfettoAgent') as never
  unregisterPerfettoAgent = missingBinding('unregisterPerfettoAgent') as never
  isPerfettoTracingEnabled = missingBinding('isPerfettoTracingEnabled') as never
  registerAgent = missingBinding('registerAgent') as never
  unregisterAgent = missingBinding('unregisterAgent') as never
  createContentReplacementState = missingBinding('createContentReplacementState') as never
  formatAgentId = missingBinding('formatAgentId') as never
  generateRequestId = missingBinding('generateRequestId') as never
  parseAgentId = missingBinding('parseAgentId') as never
  registerCleanup = missingBinding('registerCleanup') as never
  getSessionId = missingBinding('getSessionId') as never
  getIsNonInteractiveSession = missingBinding('getIsNonInteractiveSession') as never
  getChromeFlagOverride = missingBinding('getChromeFlagOverride') as never
  getFlagSettingsPath = missingBinding('getFlagSettingsPath') as never
  getInlinePlugins = missingBinding('getInlinePlugins') as never
  getMainLoopModelOverride = missingBinding('getMainLoopModelOverride') as never
  getSessionBypassPermissionsMode = missingBinding('getSessionBypassPermissionsMode') as never
  getSessionCreatedTeams = missingBinding('getSessionCreatedTeams') as never
  quote = missingBinding('quote') as never
  isInBundledMode = missingBinding('isInBundledMode') as never
  getPlatform = missingBinding('getPlatform') as never
  getGlobalConfig = missingBinding('getGlobalConfig') as never
  saveGlobalConfig = missingBinding('saveGlobalConfig') as never
  execFileNoThrow = missingBinding('execFileNoThrow') as never
  execFileNoThrowWithCwd = missingBinding('execFileNoThrowWithCwd') as never
  getTeamsDir = missingBinding('getTeamsDir') as never
  errorMessage = missingBinding('errorMessage') as never
  getErrnoCode = missingBinding('getErrnoCode') as never
  lock = missingBinding('lock') as never
  lockSync = missingBinding('lockSync') as never
  unlock = missingBinding('unlock') as never
  check = missingBinding('check') as never
  gitExe = missingBinding('gitExe') as never
  parseGitConfigValue = missingBinding('parseGitConfigValue') as never
  getCommonDir = missingBinding('getCommonDir') as never
  readWorktreeHeadSha = missingBinding('readWorktreeHeadSha') as never
  resolveGitDir = missingBinding('resolveGitDir') as never
  resolveRef = missingBinding('resolveRef') as never
  findCanonicalGitRoot = missingBinding('findCanonicalGitRoot') as never
  findGitRoot = missingBinding('findGitRoot') as never
  getBranch = missingBinding('getBranch') as never
  getDefaultBranch = missingBinding('getDefaultBranch') as never
  executeWorktreeCreateHook = missingBinding('executeWorktreeCreateHook') as never
  executeWorktreeRemoveHook = missingBinding('executeWorktreeRemoveHook') as never
  hasWorktreeCreateHook = missingBinding('hasWorktreeCreateHook') as never
  addFunctionHook = missingBinding('addFunctionHook') as never
  containsPathTraversal = missingBinding('containsPathTraversal') as never
  getInitialSettings = missingBinding('getInitialSettings') as never
  getRelativeSettingsFilePathForSource = missingBinding('getRelativeSettingsFilePathForSource') as never
  getCwd = missingBinding('getCwd') as never
  saveCurrentProjectConfig = missingBinding('saveCurrentProjectConfig') as never
  getAPIProvider = missingBinding('getAPIProvider') as never
}
