/**
 * Puerto FIEL de `ccnmt: packages/tool-registry/src/Tool.ts` (TASK #232,
 * porte de `tool-registry` — la pieza angular: 13 de los 14 módulos que
 * faltan en `@thyrox/mcp-runtime` cuelgan de este paquete).
 *
 * Cobertura de este archivo: TODOS los símbolos exportados por la fuente
 * están presentes — es el contrato completo del tipo `Tool`, sin recortes.
 * Lo que SÍ difiere, declarado aquí y no en silencio:
 *
 * - Todos los `import type` que la fuente trae de paquetes hermanos se
 *   mantienen apuntando a `@thyrox/<paquete>/<ruta>` — se borran al
 *   transpilar (Bun no resuelve un `import type`), así que su ausencia NO
 *   bloquea la carga de este módulo. Las rutas que hoy NO resuelven en este
 *   árbol (medido): `@thyrox/repl/*` (el paquete no existe),
 *   `@thyrox/provider/thinking.js` (falta `thinking.ts` en `provider/src`),
 *   `@thyrox/command-runtime/runtime` (no hay `runtime.ts` en la raíz de
 *   `command-runtime/src`), `@thyrox/agent/file-history` (no existe aún).
 *   Cuando esos paquetes hermanos completen esa ruta, este archivo empieza
 *   a tipar contra el símbolo real sin tocarlo.
 * - `React.ReactNode` se sustituye por el alias local `ReactNodeLike` (ver
 *   más abajo): `react` no está instalado en este árbol (medido — ningún
 *   `node_modules/react` bajo este paquete) y `React` tampoco es un
 *   namespace ambiental aquí (no hay `@types/react`). El alias documenta la
 *   forma sin traer la dependencia — mismo patrón que
 *   `@thyrox/voice: src/hooks/useVoiceIntegration.tsx`.
 */
import type {
  ToolResultBlockParam,
  ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources/index.mjs'
import type {
  ElicitRequestURLParams,
  ElicitResult,
} from '@modelcontextprotocol/sdk/types.js'
import type { UUID } from 'crypto'
import type { z } from 'zod/v4'
import type { Command } from '@thyrox/command-runtime/runtime'
import type { CanUseToolFn } from '@thyrox/repl/hooks/useCanUseTool.js'
import type { ThinkingConfig } from '@thyrox/provider/thinking.js'

/**
 * Sustituto local de `React.ReactNode` — ver docstring del módulo. Sólo se
 * usa como anotación de tipo en las firmas de renderizado de abajo; ninguna
 * de esas firmas se invoca desde este archivo.
 */
export type ReactNodeLike = unknown

export type ToolInputJSONSchema = {
  [x: string]: unknown
  type: 'object'
  properties?: {
    [x: string]: unknown
  }
}

import type { Notification } from '@thyrox/repl/notifications.js'
import type {
  MCPServerConnection,
  ServerResource,
} from '@thyrox/mcp-runtime/types.js'
import type {
  AgentDefinition,
  AgentDefinitionsResult,
} from './tools/AgentTool/loadAgentsDir.js'
import type {
  AssistantMessage,
  AttachmentMessage,
  Message,
  ProgressMessage,
  SystemLocalCommandMessage,
  SystemMessage,
  UserMessage,
} from '@thyrox/agent/messageShapes'
// Los tipos de permiso se importan de una ubicación centralizada para
// romper ciclos de import.
// PermissionResult se importa de una ubicación centralizada para romper
// ciclos de import.
import type {
  AdditionalWorkingDirectory,
  PermissionMode,
  PermissionResult,
} from '@thyrox/permission/permissionTypes'
// Los tipos de progreso de herramienta se importan de una ubicación
// centralizada para romper ciclos de import.
import type {
  AgentToolProgress,
  BashProgress,
  MCPProgress,
  REPLToolProgress,
  SkillToolProgress,
  TaskOutputProgress,
  ToolProgressData,
  WebSearchProgress,
} from './progressTypes.js'
import type { FileStateCache } from './fileStateCache.js'
import type { DenialTrackingState } from '@thyrox/permission/denialTracking'
import type { SystemPrompt } from '@thyrox/provider/systemPromptType.js'
import type { ContentReplacementState } from '@thyrox/storage/toolResultStorage.js'

// Re-exporta los tipos de progreso por compatibilidad hacia atrás.
export type {
  AgentToolProgress,
  BashProgress,
  MCPProgress,
  REPLToolProgress,
  SkillToolProgress,
  TaskOutputProgress,
  WebSearchProgress,
}

import type { SpinnerMode } from '@thyrox/repl/components/Spinner.js'
import type { QuerySource } from '@thyrox/agent/querySource'
import type { SDKStatus } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type { AppState } from './appStateTypes.js'
import type {
  HookProgress,
  PromptRequest,
  PromptResponse,
} from '@thyrox/agent/types/hooks.js'
import type { AgentId } from '@thyrox/agent/idTypes'
import type { DeepImmutable } from './genericTypeUtils.js'
import type { AttributionState } from '@thyrox/agent/commitAttribution.js'
import type { FileHistoryState } from '@thyrox/agent/file-history'
import type { Theme, ThemeName } from '@anthropic/ink'

export type QueryChainTracking = {
  chainId: string
  depth: number
}

export type ValidationResult =
  | { result: true }
  | {
      result: false
      message: string
      errorCode: number
    }

export type SetToolJSXFn = (
  args: {
    jsx: ReactNodeLike | null
    shouldHidePromptInput: boolean
    shouldContinueAnimation?: true
    showSpinner?: boolean
    isLocalJSXCommand?: boolean
    isImmediate?: boolean
    /** Se pone en true para limpiar un comando JSX local (p. ej. desde su callback onDone) */
    clearLocalJSX?: boolean
  } | null,
) => void

// Los tipos de permiso de herramienta se importan de una ubicación
// centralizada para romper ciclos de import.
import type { ToolPermissionRulesBySource } from '@thyrox/permission/permissionTypes'

// Re-exporta por compatibilidad hacia atrás.
export type { ToolPermissionRulesBySource }

// Aplica DeepImmutable al tipo importado.
export type ToolPermissionContext = DeepImmutable<{
  mode: PermissionMode
  additionalWorkingDirectories: Map<string, AdditionalWorkingDirectory>
  alwaysAllowRules: ToolPermissionRulesBySource
  alwaysDenyRules: ToolPermissionRulesBySource
  alwaysAskRules: ToolPermissionRulesBySource
  isBypassPermissionsModeAvailable: boolean
  isAutoModeAvailable?: boolean
  strippedDangerousRules?: ToolPermissionRulesBySource
  /** Cuando es true, los prompts de permiso se auto-deniegan (p. ej. agentes en background que no pueden mostrar UI) */
  shouldAvoidPermissionPrompts?: boolean
  /** Cuando es true, se esperan las verificaciones automáticas (clasificador, hooks) antes de mostrar el diálogo de permiso (workers coordinadores) */
  awaitAutomatedChecksBeforeDialog?: boolean
  /** Guarda el modo de permiso previo a que el modelo entre a plan mode, para restaurarlo al salir */
  prePlanMode?: PermissionMode
}>

export const getEmptyToolPermissionContext: () => ToolPermissionContext =
  () => ({
    mode: 'default',
    additionalWorkingDirectories: new Map(),
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    isBypassPermissionsModeAvailable: false,
  })

export type CompactProgressEvent =
  | {
      type: 'hooks_start'
      hookType: 'pre_compact' | 'post_compact' | 'session_start'
    }
  | { type: 'compact_start' }
  | { type: 'compact_end' }

export type ToolUseContext = {
  options: {
    commands: Command[]
    debug: boolean
    mainLoopModel: string
    fallbackModel?: string
    tools: Tools
    verbose: boolean
    thinkingConfig: ThinkingConfig
    mcpClients: MCPServerConnection[]
    mcpResources: Record<string, ServerResource[]>
    isNonInteractiveSession: boolean
    agentDefinitions: AgentDefinitionsResult
    maxBudgetUsd?: number
    taskBudget?: { total: number; remaining?: number }
    /** System prompt personalizado que reemplaza al system prompt por defecto */
    customSystemPrompt?: string
    /** System prompt adicional, agregado después del system prompt principal */
    appendSystemPrompt?: string
    /** Sobreescribe querySource para el rastreo de analítica */
    querySource?: QuerySource
    /** Callback opcional para obtener las herramientas más recientes (p. ej. tras conectar servidores MCP a mitad de query) */
    refreshTools?: () => Tools
    /** ant 4656.js:92 — skill que disparó este query (si aplica). */
    spawnedBySkill?: string
    /** Skill activo del padre (fallback cuando spawnedBySkill no está). */
    activeSkill?: string
  }
  abortController: AbortController
  readFileState: FileStateCache
  getAppState(): AppState
  setAppState(f: (prev: AppState) => AppState): void
  /**
   * setAppState siempre-compartido para infraestructura de alcance de
   * sesión (tareas en background, hooks de sesión). A diferencia de
   * setAppState, que es un no-op para agentes async (ver
   * createSubagentContext), éste siempre llega al store raíz, así que
   * agentes a cualquier profundidad de anidamiento pueden
   * registrar/limpiar infraestructura que sobrevive un solo turno. Sólo lo
   * fija createSubagentContext; los contextos del hilo principal caen a
   * setAppState.
   */
  setAppStateForTasks?: (f: (prev: AppState) => AppState) => void
  /**
   * Manejador opcional para elicitaciones de URL disparadas por errores de
   * llamada a herramienta (-32042). En modo print/SDK, esto delega en
   * structuredIO.handleElicitation. En modo REPL, esto es indefinido y se
   * usa el camino de UI basado en cola.
   */
  handleElicitation?: (
    serverName: string,
    params: ElicitRequestURLParams,
    signal: AbortSignal,
  ) => Promise<ElicitResult>
  setToolJSX?: SetToolJSXFn
  addNotification?: (notif: Notification) => void
  /** Agrega un mensaje de sistema sólo-UI a la lista de mensajes del REPL.
   *  Se elimina en la frontera normalizeMessagesForAPI — el Exclude<> lo
   *  fuerza a nivel de tipo. */
  appendSystemMessage?: (
    msg: Exclude<SystemMessage, SystemLocalCommandMessage>,
  ) => void
  /** Envía una notificación a nivel de sistema operativo (iTerm2, Kitty, Ghostty, campana, etc.) */
  sendOSNotification?: (opts: {
    message: string
    notificationType: string
  }) => void
  nestedMemoryAttachmentTriggers?: Set<string>
  /**
   * Rutas de CLAUDE.md ya inyectadas como adjuntos nested_memory en esta
   * sesión. Deduplica para memoryFilesToAttachments — readFileState es un
   * LRU que desaloja entradas en sesiones ocupadas, así que su chequeo
   * .has() solo puede re-inyectar el mismo CLAUDE.md docenas de veces.
   */
  loadedNestedMemoryPaths?: Set<string>
  dynamicSkillDirTriggers?: Set<string>
  /** Nombres de skill que salieron a la superficie vía skill_discovery en esta sesión. Sólo telemetría (alimenta was_discovered). */
  discoveredSkillNames?: Set<string>
  userModified?: boolean
  setInProgressToolUseIDs: (f: (prev: Set<string>) => Set<string>) => void
  /** Sólo se conecta en contextos interactivos (REPL); SDK/QueryEngine no lo fijan. */
  setHasInterruptibleToolInProgress?: (v: boolean) => void
  setResponseLength: (f: (prev: number) => number) => void
  /** Sólo-ant: agrega una entrada nueva de métricas de API para el rastreo de OTPS.
   *  Lo llama el streaming de subagentes cuando arranca una nueva petición de API. */
  pushApiMetricsEntry?: (ttftMs: number) => void
  setStreamMode?: (mode: SpinnerMode) => void
  onCompactProgress?: (event: CompactProgressEvent) => void
  setSDKStatus?: (status: SDKStatus) => void
  openMessageSelector?: () => void
  updateFileHistoryState: (
    updater: (prev: FileHistoryState) => FileHistoryState,
  ) => void
  updateAttributionState: (
    updater: (prev: AttributionState) => AttributionState,
  ) => void
  setConversationId?: (id: UUID) => void
  agentId?: AgentId // Sólo se fija para subagentes; usar getSessionId() para el ID de sesión. Los hooks lo usan para distinguir llamadas de subagente.
  agentType?: string // Nombre del tipo de subagente. Para el tipo --agent del hilo principal, los hooks caen a getMainThreadAgentType().
  /** Cuando es true, canUseTool debe llamarse siempre, incluso cuando los
   *  hooks auto-aprueban. Lo usa la especulación para reescribir rutas de
   *  archivo superpuestas. */
  requireCanUseTool?: boolean
  messages: Message[]
  fileReadingLimits?: {
    maxTokens?: number
    maxSizeBytes?: number
  }
  globLimits?: {
    maxResults?: number
  }
  toolDecisions?: Map<
    string,
    {
      source: string
      decision: 'accept' | 'reject'
      timestamp: number
    }
  >
  queryTracking?: QueryChainTracking
  /** Factory de callback para pedir prompts interactivos al usuario.
   * Devuelve un callback de prompt ligado al nombre de la fuente dada.
   * Sólo disponible en contextos interactivos (REPL). */
  requestPrompt?: (
    sourceName: string,
    toolInputSummary?: string | null,
  ) => (request: PromptRequest) => Promise<PromptResponse>
  toolUseId?: string
  criticalSystemReminder_EXPERIMENTAL?: string
  /** Cuando es true, preserva toolUseResult en los mensajes incluso para
   * subagentes. Lo usan los teammates in-process cuyo transcript el
   * usuario puede ver. */
  preserveToolUseResults?: boolean
  /** Estado local de rastreo de denegación para subagentes async cuyo
   *  setAppState es un no-op. Sin esto, el contador de denegación nunca se
   *  acumula y el umbral de caída a preguntar nunca se alcanza. Mutable —
   *  el código de permisos lo actualiza en el sitio. */
  localDenialTracking?: DenialTrackingState
  /**
   * Estado de reemplazo de contenido por hilo de conversación, para el
   * presupuesto de resultado de herramienta. Cuando está presente, query.ts
   * aplica el presupuesto agregado de resultado de herramienta. Hilo
   * principal: el REPL lo provee una vez (nunca se resetea — claves UUID
   * obsoletas son inertes). Subagentes: createSubagentContext clona el
   * estado del padre por defecto (los forks que comparten caché necesitan
   * decisiones idénticas), o resumeAgentBackground enhebra uno
   * reconstruido de registros de side-chain.
   */
  contentReplacementState?: ContentReplacementState
  /**
   * Bytes del system prompt renderizado del padre, congelados al inicio
   * del turno. Lo usan los subagentes fork para compartir la caché de
   * prompt del padre — volver a llamar getSystemPrompt() al momento de
   * lanzar el fork puede divergir (GrowthBook frío→caliente) y romper la
   * caché. Ver forkSubagent.ts.
   */
  renderedSystemPrompt?: SystemPrompt
}

// Re-exporta ToolProgressData desde la ubicación centralizada.
export type { ToolProgressData }

export type Progress = ToolProgressData | HookProgress

export type ToolProgress<P extends ToolProgressData> = {
  toolUseID: string
  data: P
}

/** Filtra los mensajes de progreso de hooks (`type === 'hook_progress'`)
 *  de la lista, dejando sólo el progreso propio de la herramienta. */
export function filterToolProgressMessages(
  progressMessagesForMessage: ProgressMessage[],
): ProgressMessage<ToolProgressData>[] {
  return progressMessagesForMessage.filter(
    (msg): msg is ProgressMessage<ToolProgressData> =>
      (msg.data as { type?: string })?.type !== 'hook_progress',
  )
}

export type ToolResult<T> = {
  data: T
  newMessages?: (
    | UserMessage
    | AssistantMessage
    | AttachmentMessage
    | SystemMessage
  )[]
  // contextModifier sólo se honra para herramientas que no son concurrency-safe.
  contextModifier?: (context: ToolUseContext) => ToolUseContext
  /** Metadata del protocolo MCP (structuredContent, _meta) a pasar tal cual a consumidores del SDK */
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
}

export type ToolCallProgress<P extends ToolProgressData = ToolProgressData> = (
  progress: ToolProgress<P>,
) => void

// Tipo para cualquier esquema cuya salida sea un objeto de claves string.
export type AnyObject = z.ZodType<{ [key: string]: unknown }>

/**
 * Verifica si una herramienta coincide con el nombre dado (nombre primario o alias).
 */
export function toolMatchesName(
  tool: { name: string; aliases?: string[] },
  name: string,
): boolean {
  return tool.name === name || (tool.aliases?.includes(name) ?? false)
}

/**
 * Encuentra una herramienta por nombre o alias en una lista de herramientas.
 */
export function findToolByName(tools: Tools, name: string): Tool | undefined {
  return tools.find(t => toolMatchesName(t, name))
}

export type Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = {
  /**
   * Alias opcionales para compatibilidad hacia atrás cuando una herramienta
   * se renombra. La herramienta se puede buscar por cualquiera de estos
   * nombres además de su nombre primario.
   */
  aliases?: string[]
  /**
   * Frase de capacidad de una línea que usa ToolSearch para el
   * emparejamiento por palabra clave. Ayuda al modelo a encontrar esta
   * herramienta vía búsqueda por palabra clave cuando está diferida
   * (`deferred`). 3–10 palabras, sin punto final.
   * Preferir términos que no estén ya en el nombre de la herramienta (p.
   * ej. 'jupyter' para NotebookEdit).
   */
  searchHint?: string
  call(
    args: z.infer<Input>,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage,
    onProgress?: ToolCallProgress<P>,
  ): Promise<ToolResult<Output>>
  description(
    input: z.infer<Input>,
    options: {
      isNonInteractiveSession: boolean
      toolPermissionContext: ToolPermissionContext
      tools: Tools
    },
  ): Promise<string>
  readonly inputSchema: Input
  // Tipo para herramientas MCP que pueden especificar su esquema de entrada
  // directamente en formato JSON Schema en vez de convertirlo desde un
  // esquema Zod.
  readonly inputJSONSchema?: ToolInputJSONSchema
  // Opcional porque TungstenTool no lo define. TODO: hacerlo obligatorio.
  // Cuando se haga eso, también se puede hacer esto un poco más type-safe.
  outputSchema?: z.ZodType<unknown>
  inputsEquivalent?(a: z.infer<Input>, b: z.infer<Input>): boolean
  isConcurrencySafe(input: z.infer<Input>): boolean
  isEnabled(): boolean
  isReadOnly(input: z.infer<Input>): boolean
  /** Por defecto false. Sólo se fija cuando la herramienta hace operaciones irreversibles (borrar, sobreescribir, enviar). */
  isDestructive?(input: z.infer<Input>): boolean
  /**
   * Qué debe pasar cuando el usuario envía un mensaje nuevo mientras esta
   * herramienta está corriendo.
   *
   * - `'cancel'` — detiene la herramienta y descarta su resultado
   * - `'block'`  — sigue corriendo; el mensaje nuevo espera
   *
   * Por defecto `'block'` cuando no está implementado.
   */
  interruptBehavior?(): 'cancel' | 'block'
  /**
   * Devuelve información sobre si este uso de herramienta es una operación
   * de búsqueda o lectura que debe colapsarse en una vista condensada en la
   * UI. Ejemplos: búsqueda de archivos (Grep, Glob), lectura de archivos
   * (Read), y comandos de bash como find, grep, wc, etc.
   *
   * Devuelve un objeto que indica si la operación es de búsqueda o lectura:
   * - `isSearch: true` para operaciones de búsqueda (grep, find, patrones glob)
   * - `isRead: true` para operaciones de lectura (cat, head, tail, lectura de archivo)
   * - `isList: true` para operaciones de listado de directorio (ls, tree, du)
   * - Todos pueden ser false si la operación no debe colapsarse
   */
  isSearchOrReadCommand?(input: z.infer<Input>): {
    isSearch: boolean
    isRead: boolean
    isList?: boolean
  }
  isOpenWorld?(input: z.infer<Input>): boolean
  requiresUserInteraction?(): boolean
  isMcp?: boolean
  isLsp?: boolean
  /**
   * Cuando es true, esta herramienta está diferida (se envía con
   * defer_loading: true) y exige que se use ToolSearch antes de poder
   * llamarla.
   */
  readonly shouldDefer?: boolean
  /**
   * Cuando es true, esta herramienta nunca se difiere — su esquema
   * completo aparece en el prompt inicial incluso con ToolSearch activo.
   * Para herramientas MCP, se fija vía `_meta['anthropic/alwaysLoad']`.
   * Usar para herramientas que el modelo debe ver en el turno 1 sin un
   * viaje de ida y vuelta a ToolSearch.
   */
  readonly alwaysLoad?: boolean
  /**
   * Para herramientas MCP: los nombres de servidor y herramienta tal como
   * los recibió el servidor MCP (sin normalizar). Presente en toda
   * herramienta MCP sin importar si `name` lleva prefijo
   * (mcp__server__tool) o no (modo CLAUDE_AGENT_SDK_MCP_NO_PREFIX).
   */
  mcpInfo?: { serverName: string; toolName: string }
  readonly name: string
  /**
   * Tamaño máximo en caracteres para el resultado de la herramienta antes
   * de persistirlo a disco. Cuando se excede, el resultado se guarda en un
   * archivo y Claude recibe una vista previa con la ruta del archivo en
   * vez del contenido completo.
   *
   * Se fija a Infinity para herramientas cuya salida nunca debe
   * persistirse (p. ej. Read, donde persistir crea un bucle circular
   * Read→archivo→Read y la herramienta ya se auto-acota vía sus propios
   * límites).
   */
  maxResultSizeChars: number
  /**
   * Cuando es true, activa el modo estricto para esta herramienta, que
   * hace que la API se adhiera más estrictamente a las instrucciones de la
   * herramienta y a los esquemas de parámetros. Sólo se aplica cuando
   * tengu_tool_pear está activo.
   */
  readonly strict?: boolean

  /**
   * Se llama sobre copias de la entrada de tool_use antes de que los
   * observadores la vean (stream del SDK, transcript, canUseTool, hooks
   * PreToolUse/PostToolUse). Mutar en el sitio para agregar campos
   * legacy/derivados. Debe ser idempotente. La entrada original ligada a
   * la API nunca se muta (preserva la caché de prompt). No se reaplica
   * cuando un hook/permiso devuelve un updatedInput fresco — esos son
   * dueños de su propia forma.
   */
  backfillObservableInput?(input: Record<string, unknown>): void

  /**
   * Determina si esta herramienta puede correr con esta entrada en el
   * contexto actual. Informa al modelo por qué falló el uso de la
   * herramienta, y no muestra ninguna UI directamente.
   * @param input
   * @param context
   */
  validateInput?(
    input: z.infer<Input>,
    context: ToolUseContext,
  ): Promise<ValidationResult>

  /**
   * Determina si se le pregunta permiso al usuario. Sólo se llama después
   * de que validateInput() pasa. La lógica general de permiso está en
   * permissions.ts. Este método contiene la lógica específica de la
   * herramienta.
   * @param input
   * @param context
   */
  checkPermissions(
    input: z.infer<Input>,
    context: ToolUseContext,
  ): Promise<PermissionResult>

  // Método opcional para herramientas que operan sobre una ruta de archivo.
  getPath?(input: z.infer<Input>): string

  /**
   * Prepara un matcher para las condiciones `if` de hooks (patrones de
   * regla de permiso como "git *" a partir de "Bash(git *)"). Se llama una
   * vez por par hook-input; cualquier parseo costoso ocurre aquí. Devuelve
   * un closure que se llama por cada patrón de hook. Si no se implementa,
   * sólo funciona el emparejamiento a nivel de nombre de herramienta.
   */
  preparePermissionMatcher?(
    input: z.infer<Input>,
  ): Promise<(pattern: string) => boolean>

  prompt(options: {
    getToolPermissionContext: () => Promise<ToolPermissionContext>
    tools: Tools
    agents: AgentDefinition[]
    allowedAgentTypes?: string[]
  }): Promise<string>
  userFacingName(input: Partial<z.infer<Input>> | undefined): string
  userFacingNameBackgroundColor?(
    input: Partial<z.infer<Input>> | undefined,
  ): keyof Theme | undefined
  /**
   * Los envoltorios transparentes (p. ej. REPL) delegan todo el renderizado
   * a su manejador de progreso, que emite bloques de aspecto nativo por
   * cada llamada interna a herramienta. El envoltorio mismo no muestra nada.
   */
  isTransparentWrapper?(): boolean
  /**
   * Devuelve un resumen corto en string de este uso de herramienta, para
   * mostrar en vistas compactas.
   * @param input La entrada de la herramienta
   * @returns Un resumen corto, o null para no mostrar nada
   */
  getToolUseSummary?(input: Partial<z.infer<Input>> | undefined): string | null
  /**
   * Devuelve una descripción de actividad en presente, legible por humanos,
   * para mostrar en el spinner.
   * Ejemplo: "Reading src/foo.ts", "Running bun test", "Searching for pattern"
   * @param input La entrada de la herramienta
   * @returns String de descripción de actividad, o null para caer al nombre de la herramienta
   */
  getActivityDescription?(
    input: Partial<z.infer<Input>> | undefined,
  ): string | null
  /**
   * Devuelve una representación compacta de este uso de herramienta para
   * el clasificador de seguridad de auto-mode. Ejemplos: `ls -la` para
   * Bash, `/tmp/x: new content` para Edit. Devolver '' para saltar esta
   * herramienta en el transcript del clasificador (p. ej. herramientas sin
   * relevancia de seguridad). Puede devolver un objeto para evitar la
   * doble codificación cuando quien llama envuelve el valor en JSON.
   */
  toAutoClassifierInput(input: z.infer<Input>): unknown
  mapToolResultToToolResultBlockParam(
    content: Output,
    toolUseID: string,
  ): ToolResultBlockParam
  /**
   * Opcional. Cuando se omite, el resultado de la herramienta no renderiza
   * nada (igual que devolver null). Omitir para herramientas cuyos
   * resultados salen a la superficie en otro lado (p. ej. TodoWrite
   * actualiza el panel de todos, no el transcript).
   */
  renderToolResultMessage?(
    content: Output,
    progressMessagesForMessage: ProgressMessage<P>[],
    options: {
      style?: 'condensed'
      theme: ThemeName
      tools: Tools
      verbose: boolean
      isTranscriptMode?: boolean
      isBriefOnly?: boolean
      /** Entrada original de tool_use, cuando está disponible. Útil para
       * resúmenes compactos de resultado que referencian lo que se pidió
       * (p. ej. "Sent to #foo"). */
      input?: unknown
    },
  ): ReactNodeLike
  /**
   * Texto aplanado de lo que renderToolResultMessage muestra EN MODO
   * TRANSCRIPT (verbose=true, isTranscriptMode=true). Para el índice de
   * búsqueda del transcript: el índice cuenta ocurrencias en este string,
   * la superposición de resaltado escanea el buffer de pantalla real. Para
   * que conteo ≡ resaltado, esto debe devolver el texto que termina siendo
   * visible — no la serialización orientada al modelo de
   * mapToolResultToToolResultBlockParam (que agrega system-reminders,
   * envoltorios de salida persistida).
   *
   * El "chrome" se puede saltar (subcontar está bien). "Found 3 files in
   * 12ms" no vale la pena indexarlo. Los fantasmas no están bien — texto
   * que se declara aquí pero no renderiza es un bug de conteo≠resaltado.
   *
   * Opcional: si se omite → heurística por nombre de campo en
   * transcriptSearch.ts. El drift lo atrapa
   * test/utils/transcriptSearch.renderFidelity.test.tsx, que renderiza
   * salidas de muestra y marca texto indexado-pero-no-renderizado
   * (fantasma) o renderizado-pero-no-indexado (aviso de subconteo).
   */
  extractSearchText?(out: Output): string
  /**
   * Renderiza el mensaje de uso de herramienta. Notar que `input` es
   * parcial porque el mensaje se renderiza lo antes posible, posiblemente
   * antes de que los parámetros de la herramienta hayan terminado de
   * transmitirse.
   */
  renderToolUseMessage(
    input: Partial<z.infer<Input>>,
    options: { theme: ThemeName; verbose: boolean; commands?: Command[] },
  ): ReactNodeLike
  /**
   * Devuelve true cuando el renderizado no-verbose de esta salida está
   * truncado (es decir, hacer clic para expandir revelaría más
   * contenido). Controla el clic-para-expandir en pantalla completa —
   * sólo los mensajes donde verbose realmente muestra más obtienen un
   * affordance de hover/clic. Sin fijar significa nunca truncado.
   */
  isResultTruncated?(output: Output): boolean
  /**
   * Renderiza una etiqueta opcional para mostrar después del mensaje de
   * uso de herramienta. Se usa para metadata adicional como timeout,
   * modelo, ID de resume, etc. Devuelve null para no mostrar nada.
   */
  renderToolUseTag?(input: Partial<z.infer<Input>>): ReactNodeLike
  /**
   * Opcional. Cuando se omite, no se muestra ninguna UI de progreso
   * mientras corre la herramienta.
   */
  renderToolUseProgressMessage?(
    progressMessagesForMessage: ProgressMessage<P>[],
    options: {
      tools: Tools
      verbose: boolean
      terminalSize?: { columns: number; rows: number }
      inProgressToolCallCount?: number
      isTranscriptMode?: boolean
    },
  ): ReactNodeLike
  renderToolUseQueuedMessage?(): ReactNodeLike
  /**
   * Opcional. Cuando se omite, cae a <FallbackToolUseRejectedMessage />.
   * Definir esto sólo para herramientas que necesiten UI de rechazo
   * personalizada (p. ej. ediciones de archivo que muestran el diff
   * rechazado).
   */
  renderToolUseRejectedMessage?(
    input: z.infer<Input>,
    options: {
      columns: number
      messages: Message[]
      style?: 'condensed'
      theme: ThemeName
      tools: Tools
      verbose: boolean
      progressMessagesForMessage: ProgressMessage<P>[]
      isTranscriptMode?: boolean
    },
  ): ReactNodeLike
  /**
   * Opcional. Cuando se omite, cae a <FallbackToolUseErrorMessage />.
   * Definir esto sólo para herramientas que necesiten UI de error
   * personalizada (p. ej. herramientas de búsqueda que muestran "File not
   * found" en vez del error crudo).
   */
  renderToolUseErrorMessage?(
    result: ToolResultBlockParam['content'],
    options: {
      progressMessagesForMessage: ProgressMessage<P>[]
      tools: Tools
      verbose: boolean
      isTranscriptMode?: boolean
    },
  ): ReactNodeLike

  /**
   * Renderiza varias instancias paralelas de esta herramienta como un
   * grupo (sólo modo no-verbose). En modo verbose, cada uso individual de
   * herramienta se renderiza en su posición original.
   * @returns Nodo React para renderizar, o null para caer al renderizado individual
   */
  renderGroupedToolUse?(
    toolUses: Array<{
      param: ToolUseBlockParam
      isResolved: boolean
      isError: boolean
      isInProgress: boolean
      progressMessages: ProgressMessage<P>[]
      result?: {
        param: ToolResultBlockParam
        output: unknown
      }
    }>,
    options: {
      shouldAnimate: boolean
      tools: Tools
    },
  ): ReactNodeLike | null
}

/**
 * Una colección de herramientas. Usar este tipo en vez de `Tool[]` para
 * hacer más fácil rastrear dónde se ensamblan, pasan y filtran los
 * conjuntos de herramientas a lo largo del código base.
 */
export type Tools = readonly Tool[]

/**
 * Métodos para los que `buildTool` provee un valor por defecto. Un
 * `ToolDef` puede omitirlos; el `Tool` resultante siempre los tiene.
 */
type DefaultableToolKeys =
  | 'isEnabled'
  | 'isConcurrencySafe'
  | 'isReadOnly'
  | 'isDestructive'
  | 'checkPermissions'
  | 'toAutoClassifierInput'
  | 'userFacingName'

/**
 * Definición de herramienta que acepta `buildTool`. Misma forma que `Tool`
 * pero con los métodos con default como opcionales — `buildTool` los
 * completa para que quien llama siempre vea un `Tool` completo.
 */
export type ToolDef<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = Omit<Tool<Input, Output, P>, DefaultableToolKeys> &
  Partial<Pick<Tool<Input, Output, P>, DefaultableToolKeys>>

/**
 * Spread a nivel de tipo que refleja `{ ...TOOL_DEFAULTS, ...def }`. Para
 * cada clave con default: si D la provee (obligatoria), gana el tipo de D;
 * si D la omite o la tiene opcional (heredada de Partial<> en el
 * constraint), el default la completa. El resto de las claves vienen de D
 * verbatim — preservando aridad, presencia opcional y tipos literales
 * exactamente como lo hacía `satisfies Tool`.
 */
type BuiltTool<D> = Omit<D, DefaultableToolKeys> & {
  [K in DefaultableToolKeys]-?: K extends keyof D
    ? undefined extends D[K]
      ? ToolDefaults[K]
      : D[K]
    : ToolDefaults[K]
}

/**
 * Construye un `Tool` completo a partir de una definición parcial,
 * completando defaults seguros para los métodos comúnmente stub. Todas las
 * exportaciones de herramienta deben pasar por aquí para que los defaults
 * vivan en un solo lugar y quien llama nunca necesite `?.() ?? default`.
 *
 * Defaults (fail-closed donde importa):
 * - `isEnabled` → `true`
 * - `isConcurrencySafe` → `false` (asume que no es seguro)
 * - `isReadOnly` → `false` (asume que escribe)
 * - `isDestructive` → `false`
 * - `checkPermissions` → `{ behavior: 'allow', updatedInput }` (delega en el sistema general de permisos)
 * - `toAutoClassifierInput` → `''` (salta el clasificador — las herramientas relevantes para seguridad deben sobreescribir)
 * - `userFacingName` → `name`
 */
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?: unknown) => false,
  isReadOnly: (_input?: unknown) => false,
  isDestructive: (_input?: unknown) => false,
  checkPermissions: (
    input: { [key: string]: unknown },
    _ctx?: ToolUseContext,
  ): Promise<PermissionResult> =>
    Promise.resolve({ behavior: 'allow', updatedInput: input }),
  toAutoClassifierInput: (_input?: unknown) => '',
  userFacingName: (_input?: unknown) => '',
}

// El tipo de los defaults es la forma REAL de TOOL_DEFAULTS (parámetros
// opcionales para que tipe tanto la llamada de 0 argumentos como la de
// argumentos completos — los stubs variaban en aridad y los tests
// dependían de eso), no las firmas estrictas de la interfaz.
type ToolDefaults = typeof TOOL_DEFAULTS

// D infiere el tipo concreto de objeto-literal del sitio de la llamada. El
// constraint da tipado contextual para los parámetros de método; `any` en
// posición de constraint es estructural y nunca se filtra al tipo de
// retorno.
// BuiltTool<D> refleja a nivel de tipo el `{...TOOL_DEFAULTS, ...def}` de runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDef = ToolDef<any, any, any>

export function buildTool<D extends AnyToolDef>(def: D): BuiltTool<D> {
  // El spread de runtime es directo; el `as` salva la distancia entre el
  // constraint estructural-any y el tipo de retorno preciso BuiltTool<D>.
  // La semántica de tipos está probada por el typecheck de 0 errores a lo
  // largo de las 60+ herramientas.
  return {
    ...TOOL_DEFAULTS,
    userFacingName: () => def.name,
    ...def,
  } as BuiltTool<D>
}
