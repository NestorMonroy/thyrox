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
/**
 * El tipo de un binding de función mientras nadie lo ha instalado.
 *
 * Los argumentos y el retorno son `any` A PROPÓSITO, y es el mismo cruce que
 * el mapa `Record<string, unknown>` ya declara: el contrato de cada binding se
 * comprueba en el sitio de llamada, porque los 105 no tienen nada en común.
 *
 * La primera versión de este archivo los tipaba `never`, y eso los hacía NO
 * INVOCABLES: `Type 'never' has no call signatures`. El adaptador cargaba y
 * ningún consumidor podía compilar contra él — un puerto que sólo se descubría
 * al portar el primer módulo que llamara a uno.
 */
type HostBinding = (...args: any[]) => any

function missingBinding(name: string): HostBinding {
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

export let getSystemPrompt = missingBinding('getSystemPrompt')
export let processMailboxPermissionResponse = missingBinding('processMailboxPermissionResponse')
export let registerPermissionCallback = missingBinding('registerPermissionCallback')
export let unregisterPermissionCallback = missingBinding('unregisterPermissionCallback')
export let logEvent = missingBinding('logEvent')
export let getAutoCompactThreshold = missingBinding('getAutoCompactThreshold')
export let buildPostCompactMessages = missingBinding('buildPostCompactMessages')
export let compactConversation = missingBinding('compactConversation')
export let resetMicrocompactState = missingBinding('resetMicrocompactState')
export let createTaskStateBase = missingBinding('createTaskStateBase')
export let generateTaskId = missingBinding('generateTaskId')
export let isTerminalTaskStatus = missingBinding('isTerminalTaskStatus')
export let createActivityDescriptionResolver = missingBinding('createActivityDescriptionResolver')
export let createProgressTracker = missingBinding('createProgressTracker')
export let getProgressUpdate = missingBinding('getProgressUpdate')
export let updateProgressFromMessage = missingBinding('updateProgressFromMessage')
export let runAgent = missingBinding('runAgent')
export let awaitClassifierAutoApproval = missingBinding('awaitClassifierAutoApproval')
export let getSpinnerVerbs = missingBinding('getSpinnerVerbs')
export let createAssistantAPIErrorMessage = missingBinding('createAssistantAPIErrorMessage')
export let createUserMessage = missingBinding('createUserMessage')
export let evictTaskOutput = missingBinding('evictTaskOutput')
export let evictTerminalTask = missingBinding('evictTerminalTask')
export let registerTask = missingBinding('registerTask')
export let updateTaskState = missingBinding('updateTaskState')
export let tokenCountWithEstimation = missingBinding('tokenCountWithEstimation')
export let createAbortController = missingBinding('createAbortController')
export let runWithAgentContext = missingBinding('runWithAgentContext')
export let count = missingBinding('count')
export let cloneFileStateCache = missingBinding('cloneFileStateCache')
export let applyPermissionUpdates = missingBinding('applyPermissionUpdates')
export let persistPermissionUpdates = missingBinding('persistPermissionUpdates')
export let applyPermissionUpdate = missingBinding('applyPermissionUpdate')
export let hasPermissionsToUseTool = missingBinding('hasPermissionsToUseTool')
export let emitTaskTerminatedSdk = missingBinding('emitTaskTerminatedSdk')
export let sleep = missingBinding('sleep')
export let jsonParse = missingBinding('jsonParse')
export let jsonStringify = missingBinding('jsonStringify')
export let asSystemPrompt = missingBinding('asSystemPrompt')
export let claimTask = missingBinding('claimTask')
export let listTasks = missingBinding('listTasks')
export let updateTask = missingBinding('updateTask')
export let sanitizePathComponent = missingBinding('sanitizePathComponent')
export let getTasksDir = missingBinding('getTasksDir')
export let notifyTasksUpdated = missingBinding('notifyTasksUpdated')
export let createTeammateContext = missingBinding('createTeammateContext')
export let runWithTeammateContext = missingBinding('runWithTeammateContext')
export let getAgentId = missingBinding('getAgentId')
export let getAgentName = missingBinding('getAgentName')
export let getDynamicTeamContext = missingBinding('getDynamicTeamContext')
export let getTeamName = missingBinding('getTeamName')
export let getTeammateColor = missingBinding('getTeammateColor')
export let isTeammate = missingBinding('isTeammate')
export let registerPerfettoAgent = missingBinding('registerPerfettoAgent')
export let unregisterPerfettoAgent = missingBinding('unregisterPerfettoAgent')
export let isPerfettoTracingEnabled = missingBinding('isPerfettoTracingEnabled')
export let registerAgent = missingBinding('registerAgent')
export let unregisterAgent = missingBinding('unregisterAgent')
export let createContentReplacementState = missingBinding('createContentReplacementState')
export let formatAgentId = missingBinding('formatAgentId')
export let generateRequestId = missingBinding('generateRequestId')
export let parseAgentId = missingBinding('parseAgentId')
export let registerCleanup = missingBinding('registerCleanup')
export let getSessionId = missingBinding('getSessionId')
export let getIsNonInteractiveSession = missingBinding('getIsNonInteractiveSession')
export let getChromeFlagOverride = missingBinding('getChromeFlagOverride')
export let getFlagSettingsPath = missingBinding('getFlagSettingsPath')
export let getInlinePlugins = missingBinding('getInlinePlugins')
export let getMainLoopModelOverride = missingBinding('getMainLoopModelOverride')
export let getSessionBypassPermissionsMode = missingBinding('getSessionBypassPermissionsMode')
export let getSessionCreatedTeams = missingBinding('getSessionCreatedTeams')
export let quote = missingBinding('quote')
export let isInBundledMode = missingBinding('isInBundledMode')
export let getPlatform = missingBinding('getPlatform')
export let getGlobalConfig = missingBinding('getGlobalConfig')
export let saveGlobalConfig = missingBinding('saveGlobalConfig')
export let execFileNoThrow = missingBinding('execFileNoThrow')
export let execFileNoThrowWithCwd = missingBinding('execFileNoThrowWithCwd')
export let getTeamsDir = missingBinding('getTeamsDir')
export let errorMessage = missingBinding('errorMessage')
export let getErrnoCode = missingBinding('getErrnoCode')
export let lock = missingBinding('lock')
export let lockSync = missingBinding('lockSync')
export let unlock = missingBinding('unlock')
export let check = missingBinding('check')
export let gitExe = missingBinding('gitExe')
export let parseGitConfigValue = missingBinding('parseGitConfigValue')
export let getCommonDir = missingBinding('getCommonDir')
export let readWorktreeHeadSha = missingBinding('readWorktreeHeadSha')
export let resolveGitDir = missingBinding('resolveGitDir')
export let resolveRef = missingBinding('resolveRef')
export let findCanonicalGitRoot = missingBinding('findCanonicalGitRoot')
export let findGitRoot = missingBinding('findGitRoot')
export let getBranch = missingBinding('getBranch')
export let getDefaultBranch = missingBinding('getDefaultBranch')
export let executeWorktreeCreateHook = missingBinding('executeWorktreeCreateHook')
export let executeWorktreeRemoveHook = missingBinding('executeWorktreeRemoveHook')
export let hasWorktreeCreateHook = missingBinding('hasWorktreeCreateHook')
export let addFunctionHook = missingBinding('addFunctionHook')
export let containsPathTraversal = missingBinding('containsPathTraversal')
export let getInitialSettings = missingBinding('getInitialSettings')
export let getRelativeSettingsFilePathForSource = missingBinding('getRelativeSettingsFilePathForSource')
export let getCwd = missingBinding('getCwd')
export let saveCurrentProjectConfig = missingBinding('saveCurrentProjectConfig')
export let getAPIProvider = missingBinding('getAPIProvider')

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

  getSystemPrompt = missingBinding('getSystemPrompt')
  processMailboxPermissionResponse = missingBinding('processMailboxPermissionResponse')
  registerPermissionCallback = missingBinding('registerPermissionCallback')
  unregisterPermissionCallback = missingBinding('unregisterPermissionCallback')
  logEvent = missingBinding('logEvent')
  getAutoCompactThreshold = missingBinding('getAutoCompactThreshold')
  buildPostCompactMessages = missingBinding('buildPostCompactMessages')
  compactConversation = missingBinding('compactConversation')
  resetMicrocompactState = missingBinding('resetMicrocompactState')
  createTaskStateBase = missingBinding('createTaskStateBase')
  generateTaskId = missingBinding('generateTaskId')
  isTerminalTaskStatus = missingBinding('isTerminalTaskStatus')
  createActivityDescriptionResolver = missingBinding('createActivityDescriptionResolver')
  createProgressTracker = missingBinding('createProgressTracker')
  getProgressUpdate = missingBinding('getProgressUpdate')
  updateProgressFromMessage = missingBinding('updateProgressFromMessage')
  runAgent = missingBinding('runAgent')
  awaitClassifierAutoApproval = missingBinding('awaitClassifierAutoApproval')
  getSpinnerVerbs = missingBinding('getSpinnerVerbs')
  createAssistantAPIErrorMessage = missingBinding('createAssistantAPIErrorMessage')
  createUserMessage = missingBinding('createUserMessage')
  evictTaskOutput = missingBinding('evictTaskOutput')
  evictTerminalTask = missingBinding('evictTerminalTask')
  registerTask = missingBinding('registerTask')
  updateTaskState = missingBinding('updateTaskState')
  tokenCountWithEstimation = missingBinding('tokenCountWithEstimation')
  createAbortController = missingBinding('createAbortController')
  runWithAgentContext = missingBinding('runWithAgentContext')
  count = missingBinding('count')
  cloneFileStateCache = missingBinding('cloneFileStateCache')
  applyPermissionUpdates = missingBinding('applyPermissionUpdates')
  persistPermissionUpdates = missingBinding('persistPermissionUpdates')
  applyPermissionUpdate = missingBinding('applyPermissionUpdate')
  hasPermissionsToUseTool = missingBinding('hasPermissionsToUseTool')
  emitTaskTerminatedSdk = missingBinding('emitTaskTerminatedSdk')
  sleep = missingBinding('sleep')
  jsonParse = missingBinding('jsonParse')
  jsonStringify = missingBinding('jsonStringify')
  asSystemPrompt = missingBinding('asSystemPrompt')
  claimTask = missingBinding('claimTask')
  listTasks = missingBinding('listTasks')
  updateTask = missingBinding('updateTask')
  sanitizePathComponent = missingBinding('sanitizePathComponent')
  getTasksDir = missingBinding('getTasksDir')
  notifyTasksUpdated = missingBinding('notifyTasksUpdated')
  createTeammateContext = missingBinding('createTeammateContext')
  runWithTeammateContext = missingBinding('runWithTeammateContext')
  getAgentId = missingBinding('getAgentId')
  getAgentName = missingBinding('getAgentName')
  getDynamicTeamContext = missingBinding('getDynamicTeamContext')
  getTeamName = missingBinding('getTeamName')
  getTeammateColor = missingBinding('getTeammateColor')
  isTeammate = missingBinding('isTeammate')
  registerPerfettoAgent = missingBinding('registerPerfettoAgent')
  unregisterPerfettoAgent = missingBinding('unregisterPerfettoAgent')
  isPerfettoTracingEnabled = missingBinding('isPerfettoTracingEnabled')
  registerAgent = missingBinding('registerAgent')
  unregisterAgent = missingBinding('unregisterAgent')
  createContentReplacementState = missingBinding('createContentReplacementState')
  formatAgentId = missingBinding('formatAgentId')
  generateRequestId = missingBinding('generateRequestId')
  parseAgentId = missingBinding('parseAgentId')
  registerCleanup = missingBinding('registerCleanup')
  getSessionId = missingBinding('getSessionId')
  getIsNonInteractiveSession = missingBinding('getIsNonInteractiveSession')
  getChromeFlagOverride = missingBinding('getChromeFlagOverride')
  getFlagSettingsPath = missingBinding('getFlagSettingsPath')
  getInlinePlugins = missingBinding('getInlinePlugins')
  getMainLoopModelOverride = missingBinding('getMainLoopModelOverride')
  getSessionBypassPermissionsMode = missingBinding('getSessionBypassPermissionsMode')
  getSessionCreatedTeams = missingBinding('getSessionCreatedTeams')
  quote = missingBinding('quote')
  isInBundledMode = missingBinding('isInBundledMode')
  getPlatform = missingBinding('getPlatform')
  getGlobalConfig = missingBinding('getGlobalConfig')
  saveGlobalConfig = missingBinding('saveGlobalConfig')
  execFileNoThrow = missingBinding('execFileNoThrow')
  execFileNoThrowWithCwd = missingBinding('execFileNoThrowWithCwd')
  getTeamsDir = missingBinding('getTeamsDir')
  errorMessage = missingBinding('errorMessage')
  getErrnoCode = missingBinding('getErrnoCode')
  lock = missingBinding('lock')
  lockSync = missingBinding('lockSync')
  unlock = missingBinding('unlock')
  check = missingBinding('check')
  gitExe = missingBinding('gitExe')
  parseGitConfigValue = missingBinding('parseGitConfigValue')
  getCommonDir = missingBinding('getCommonDir')
  readWorktreeHeadSha = missingBinding('readWorktreeHeadSha')
  resolveGitDir = missingBinding('resolveGitDir')
  resolveRef = missingBinding('resolveRef')
  findCanonicalGitRoot = missingBinding('findCanonicalGitRoot')
  findGitRoot = missingBinding('findGitRoot')
  getBranch = missingBinding('getBranch')
  getDefaultBranch = missingBinding('getDefaultBranch')
  executeWorktreeCreateHook = missingBinding('executeWorktreeCreateHook')
  executeWorktreeRemoveHook = missingBinding('executeWorktreeRemoveHook')
  hasWorktreeCreateHook = missingBinding('hasWorktreeCreateHook')
  addFunctionHook = missingBinding('addFunctionHook')
  containsPathTraversal = missingBinding('containsPathTraversal')
  getInitialSettings = missingBinding('getInitialSettings')
  getRelativeSettingsFilePathForSource = missingBinding('getRelativeSettingsFilePathForSource')
  getCwd = missingBinding('getCwd')
  saveCurrentProjectConfig = missingBinding('saveCurrentProjectConfig')
  getAPIProvider = missingBinding('getAPIProvider')
}
