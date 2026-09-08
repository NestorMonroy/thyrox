/**
 * Frontera SDK ↔ runtime del agente — porte de
 * `ccnmt: packages/agent/createDeps.ts` (471 líneas en la fuente).
 *
 * PORTE COMPLETO desde 2026-09-08 (#263). Entran `createProductionDeps` y
 * sus siete clases `*DepImpl` —`ProviderDepImpl`, `ToolDepImpl`,
 * `PermissionDepImpl`, `OutputDepImpl`, `HookDepImpl`, `ContextDepImpl`,
 * `SessionDepImpl`— junto a los tres símbolos autocontenidos que ya estaban
 * (`fromAgentEvent`, `toCoreMessages`, `fromCoreMessages`).
 *
 * SU LISTA DE BLOQUEOS ESTABA MAL EN LOS TRES PUNTOS, y la corrección es la
 * que autoriza el porte:
 *
 *   · «`@thyrox/tool-registry` NO existe (`findToolByName`) — 255 módulos,
 *     tarea #234». El paquete SÍ existe y el símbolo vive en
 *     `src/packages/tool-registry/src/Tool.ts:412`. Lo medido fue el nombre
 *     en `dependencies`, no el árbol: la conclusión «bloqueado por un porte
 *     de 255 módulos» no se sigue de esa medición. #234 sigue abierta por su
 *     propio motivo; no bloquea a ésta.
 *   · «`handleStopHooks` sigue sin portar». Se portó en #262.
 *   · «`recordTranscript` no existe en `./internal/runtimeBridges.ts`».
 *     Existe, en su línea 87, y delega en el host binding igual que la
 *     fuente.
 *
 * DIVERGENCIA DE IMPORT, declarada: la fuente trae `handleStopHooks` de
 * `./hooks/index.js`. Esa barrica NO existe en este árbol, así que se
 * importa por su ruta directa. Es cableado pendiente, no porte: crear la
 * barrica sin el resto de sus reexportaciones fabricaría una superficie que
 * la fuente no tiene.
 *
 * El campo `compaction` del contrato lo satisface un objeto en línea, igual
 * que en la fuente: un no-op que devuelve los mensajes intactos. Está aquí
 * porque `AgentDeps` lo declara — omitirlo devolvería algo que no cumple el
 * contrato, y el hueco sólo se vería al construir el loop.
 */
import { getProviderAdapter, getProviderContextPipeline } from '@thyrox/provider'
import '@thyrox/provider/providerHostSetup'
import { logError } from '@thyrox/local-observability/logging'
import { findToolByName } from '@thyrox/tool-registry/Tool.js'
import { handleStopHooks } from './internal/stopHooksCore.ts'
import { getAgentHostBindings } from './host.ts'
import { recordTranscript } from './internal/runtimeBridges.ts'
import type {
  AgentAssistantMessage,
  AgentMessage,
} from './internalTypes.ts'
import type {
  AgentDeps,
  ContextDep,
  CoreMessage,
  HookDep,
  OutputDep,
  PermissionDep,
  ProviderDep,
  ProviderEvent,
  ProviderStreamParams,
  SessionDep,
  StopHookContext,
  StopHookResult,
  SystemPrompt,
  ToolDep,
} from './agentDeps.ts'

/** Una herramienta del registro, en la forma que este adaptador consume. */
type RuntimeTool = {
  name: string
  aliases?: string[]
  inputJSONSchema?: unknown
  isMcp?: boolean
  userFacingName: (input?: unknown) => string
  call: (
    input: unknown,
    context: RuntimeToolUseContext,
    canUseTool: (...args: unknown[]) => Promise<unknown>,
    parentMessage: AgentAssistantMessage,
    onProgress?: (progress: unknown) => void,
  ) => Promise<unknown>
}

type RuntimeToolUseContext = {
  abortController: AbortController
  renderedSystemPrompt?: unknown
  getAppState?: () => {
    toolPermissionContext: { mode: string }
    mcp?: { tools?: unknown; clients?: { type?: string }[] }
  }
  options: {
    mainLoopModel: string
    thinkingConfig?: unknown
    tools?: unknown
    querySource?: string
    agentDefinitions?: { activeAgents: unknown[]; allowedAgentTypes: unknown[] }
    [key: string]: unknown
  }
  [key: string]: unknown
}

type CanUseToolFn = (
  tool: RuntimeTool,
  input: Record<string, unknown>,
  context: RuntimeToolUseContext,
  assistantMessage: AgentAssistantMessage,
  toolUseId: string,
) => Promise<{ behavior: 'allow' | 'deny' | 'ask'; updatedInput?: unknown }>

export interface CreateDepsParams {
  tools: RuntimeTool[]
  toolUseContext: RuntimeToolUseContext
  canUseTool: CanUseToolFn
  emitFn?: (event: unknown) => void
  querySource?: string
  contextOverrides?: {
    systemPrompt?: SystemPrompt[]
    userContext?: Record<string, string>
    systemContext?: Record<string, string>
  }
}

/** Un mensaje de asistente vacío, el que los adaptadores pasan como padre. */
function mensajePadre(): AgentAssistantMessage {
  return {
    type: 'assistant',
    uuid: crypto.randomUUID(),
    message: { role: 'assistant', content: [] },
  } as AgentAssistantMessage
}

class ProviderDepImpl implements ProviderDep {
  constructor(
    private readonly toolUseContext: RuntimeToolUseContext,
    private readonly querySource?: string,
  ) {}

  async *stream(params: ProviderStreamParams): AsyncGenerator<ProviderEvent> {
    const ctx = this.toolUseContext
    const systemPrompt = ctx.renderedSystemPrompt ?? params.systemPrompt
    const appState = ctx.getAppState?.()
    const options: Record<string, unknown> = {
      ...ctx.options,
      model: params.model ?? ctx.options.mainLoopModel,
      querySource: this.querySource ?? ctx.options.querySource ?? 'repl_main_thread',
    }
    // Enrutado por modelo: se pasa el modelo para que `connections[]` pueda
    // mandar al protocolo correcto (codex / openai / gemini / anthropic).
    const adapter = getProviderAdapter(options.model as string)

    if (!options.getToolPermissionContext && appState) {
      options.getToolPermissionContext = async () => appState.toolPermissionContext
    }
    if (!options.agents && ctx.options.agentDefinitions) {
      options.agents = ctx.options.agentDefinitions.activeAgents
    }
    if (!options.allowedAgentTypes && ctx.options.agentDefinitions) {
      options.allowedAgentTypes = ctx.options.agentDefinitions.allowedAgentTypes
    }
    if (appState) {
      if (!options.mcpTools) options.mcpTools = appState.mcp?.tools
      if (!options.hasPendingMcpServers) {
        options.hasPendingMcpServers = appState.mcp?.clients?.some(
          client => client.type === 'pending',
        )
      }
    }

    const stream = adapter.queryStream({
      messages: params.messages as never,
      systemPrompt: systemPrompt as never,
      thinkingConfig: ctx.options.thinkingConfig as never,
      tools: ctx.options.tools as never,
      signal: (params.abortSignal ?? ctx.abortController.signal) as AbortSignal,
      options: options as never,
    })

    for await (const event of stream) {
      yield event as ProviderEvent
    }
  }

  getModel(): string {
    return this.toolUseContext.options.mainLoopModel
  }
}

class ToolDepImpl implements ToolDep {
  constructor(
    private readonly tools: RuntimeTool[],
    private readonly toolUseContext: RuntimeToolUseContext,
  ) {}

  find(name: string) {
    const tool = findToolByName(this.tools as never, name) as
      | RuntimeTool
      | undefined
    return tool ? this.toCoreTool(tool) : undefined
  }

  list() {
    return this.tools.map(tool => this.toCoreTool(tool))
  }

  async execute(
    tool: { name: string },
    input: unknown,
    context: { toolUseId: string },
  ) {
    const realTool = findToolByName(this.tools as never, tool.name) as
      | RuntimeTool
      | undefined
    if (!realTool) {
      return { output: `Tool not found: ${tool.name}`, error: true }
    }

    try {
      const result = await realTool.call(
        input,
        { ...this.toolUseContext, toolUseId: context.toolUseId },
        async () => ({ decision: 'allow' as const }),
        mensajePadre(),
        () => {},
      )

      if (typeof result === 'string') return { output: result }
      return {
        output:
          typeof result === 'object' && result !== null
            ? JSON.stringify(result)
            : String(result),
      }
    } catch (error) {
      return {
        output: error instanceof Error ? error.message : String(error),
        error: true,
      }
    }
  }

  private toCoreTool(tool: RuntimeTool) {
    return {
      name: tool.name,
      description: '',
      inputSchema: (tool.inputJSONSchema ?? { type: 'object' }) as Record<
        string,
        unknown
      >,
      userFacingName: tool.userFacingName(undefined),
      isLocal: !tool.isMcp,
      isMcp: !!tool.isMcp,
    }
  }
}

class PermissionDepImpl implements PermissionDep {
  constructor(
    private readonly canUseToolFn: CanUseToolFn,
    private readonly toolUseContext: RuntimeToolUseContext,
    private readonly tools: RuntimeTool[],
  ) {}

  async canUseTool(tool: { name: string }, input: unknown) {
    const realTool = findToolByName(this.tools as never, tool.name) as
      | RuntimeTool
      | undefined
    if (!realTool) {
      return { allowed: false, reason: `Unknown tool: ${tool.name}` }
    }

    try {
      const decision = await this.canUseToolFn(
        realTool,
        (input ?? {}) as Record<string, unknown>,
        this.toolUseContext,
        mensajePadre(),
        '',
      )
      if (decision.behavior === 'allow') return { allowed: true }
      // `deny` y `ask` NO son el mismo motivo: uno es «el sistema lo
      // prohíbe» y el otro «el usuario no contestó».
      return {
        allowed: false,
        reason:
          decision.behavior === 'deny' ? 'Permission denied' : 'User cancelled',
      }
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

class OutputDepImpl implements OutputDep {
  constructor(private readonly emitFn?: (event: unknown) => void) {}

  emit(event: unknown): void {
    this.emitFn?.(event)
  }
}

class HookDepImpl implements HookDep {
  constructor(
    private readonly toolUseContext: RuntimeToolUseContext,
    private readonly querySource: string,
    private readonly contextOverrides: CreateDepsParams['contextOverrides'],
  ) {}

  async onTurnStart(): Promise<void> {}

  async onTurnEnd(): Promise<void> {}

  async onStop(
    messages: CoreMessage[],
    _context: StopHookContext,
  ): Promise<StopHookResult> {
    // `handleStopHooks` es un generador async cuyo valor de retorno vive en
    // el resultado final del iterador. Un `await` sobre él NO lo itera, así
    // que el cuerpo no corría y los hooks Stop del usuario eran un no-op
    // silencioso — es el defecto que la fuente documenta en su propio
    // cuerpo, y por eso aquí se drena a mano.
    try {
      const systemPrompt = (this.contextOverrides?.systemPrompt ?? []) as never
      const userContext = this.contextOverrides?.userContext ?? {}
      const systemContext = this.contextOverrides?.systemContext ?? {}

      // Se parte la entrada en la forma (historia, cola de asistente) que
      // `handleStopHooks` espera: la cola es todo lo posterior al último
      // mensaje de usuario o sistema.
      const ultimoNoAsistente = (messages as unknown as AgentMessage[])
        .findLastIndex(m => m.type !== 'assistant')
      const messagesForQuery =
        ultimoNoAsistente >= 0
          ? (messages.slice(0, ultimoNoAsistente + 1) as unknown as AgentMessage[])
          : []
      const assistantMessages =
        ultimoNoAsistente >= 0
          ? (messages.slice(ultimoNoAsistente + 1) as unknown as AgentAssistantMessage[])
          : (messages as unknown as AgentAssistantMessage[])

      const generator = handleStopHooks(
        messagesForQuery,
        assistantMessages,
        systemPrompt,
        userContext,
        systemContext,
        this.toolUseContext as never,
        this.querySource,
      )

      // Se drena. Lo que emite son mensajes de progreso destinados al
      // transcript del REPL; en el camino headless se descartan.
      let next = await generator.next()
      while (!next.done) next = await generator.next()
      const valor = next.value as
        | { blockingErrors?: unknown[]; preventContinuation?: boolean }
        | undefined
      return {
        blockingErrors: valor?.blockingErrors?.map(String) ?? [],
        preventContinuation: valor?.preventContinuation ?? false,
      }
    } catch {
      return { blockingErrors: [], preventContinuation: false }
    }
  }
}

class ContextDepImpl implements ContextDep {
  constructor(
    private readonly toolUseContext: RuntimeToolUseContext,
    private readonly overrides?: CreateDepsParams['contextOverrides'],
  ) {}

  /**
   * DIVERGENCIA DECLARADA, y es de momento de resolución, no de conducta.
   * La fuente resuelve el pipeline en un campo de instancia, o sea al
   * CONSTRUIR. Eso convierte una dependencia opcional en obligatoria: un
   * consumidor que pasa `contextOverrides` y nunca toca el pipeline no
   * puede ni construir el `AgentDeps` si el host no instaló los bindings de
   * provider. Aquí se resuelve al USARLO. Mismo resultado cuando se usa;
   * deja de exigir lo que no se va a llamar.
   */
  private pipeline() {
    return getProviderContextPipeline()
  }

  getSystemPrompt(): SystemPrompt[] {
    if (this.overrides?.systemPrompt) return this.overrides.systemPrompt
    if (this.toolUseContext.renderedSystemPrompt) {
      return [this.toolUseContext.renderedSystemPrompt as SystemPrompt]
    }
    return []
  }

  async getUserContext(): Promise<Record<string, string>> {
    if (this.overrides?.userContext) return this.overrides.userContext
    try {
      return await this.pipeline().getUserContext()
    } catch (e) {
      // Un fallo al construir el contexto no debe tumbar el bucle, pero
      // tampoco puede ser invisible: un CLAUDE.md ausente o un git que falla
      // cambian la conducta del prompt en silencio.
      logError(e)
      return {}
    }
  }

  async getSystemContext(): Promise<Record<string, string>> {
    if (this.overrides?.systemContext) return this.overrides.systemContext
    try {
      return await this.pipeline().getSystemContext()
    } catch (e) {
      logError(e)
      return {}
    }
  }
}

class SessionDepImpl implements SessionDep {
  getSessionId(): string {
    return getAgentHostBindings().getSessionId?.() ?? 'unknown'
  }

  async recordTranscript(messages: CoreMessage[]): Promise<void> {
    try {
      await recordTranscript(messages as unknown as AgentMessage[])
    } catch (e) {
      // Perder transcripts rompe reanudar y reproducir, así que el fallo se
      // registra aunque no corte el bucle.
      logError(e)
    }
  }
}

/**
 * La fábrica: arma el `AgentDeps` de producción a partir del contexto de uso
 * de herramientas del runtime. Cada campo es un adaptador que traduce la
 * forma de un paquete hermano a la del contrato.
 */
export function createProductionDeps(params: CreateDepsParams): AgentDeps {
  const {
    tools,
    toolUseContext,
    canUseTool,
    emitFn,
    querySource,
    contextOverrides,
  } = params

  return {
    provider: new ProviderDepImpl(toolUseContext, querySource),
    tools: new ToolDepImpl(tools, toolUseContext) as never,
    permission: new PermissionDepImpl(canUseTool, toolUseContext, tools) as never,
    output: new OutputDepImpl(emitFn),
    hooks: new HookDepImpl(toolUseContext, querySource ?? 'sdk', contextOverrides),
    compaction: {
      maybeCompact: async messages => ({ compacted: false, messages }),
    },
    context: new ContextDepImpl(toolUseContext, contextOverrides) as never,
    session: new SessionDepImpl(),
  }
}


/**
 * Proyector de eventos del SDK: adapta cada evento crudo del agente
 * (etiquetado con `type`) a la forma que consumen los clientes del SDK
 * (TypeScript SDK, extensión de vscode), o descarta el evento devolviendo
 * `undefined`.
 *
 * `message`  → desenvuelve una capa: sólo si el mensaje interior tiene a su
 *              vez un campo `.message` (forma Anthropic anidada); si no,
 *              se descarta.
 * `stream`   → el evento interior, verbatim.
 * `request_start` → un marcador sintético de forma fija; cualquier campo
 *              extra del input se ignora.
 * `done`     → se descarta (señala el fin del stream).
 * cualquier otro `type` → se descarta.
 */
export function fromAgentEvent(event: { type: string; [key: string]: unknown }) {
  switch (event.type) {
    case 'message': {
      const msg = event.message
      if (!msg) return undefined
      if (typeof msg === 'object' && msg !== null && 'message' in msg) {
        return msg
      }
      return undefined
    }
    case 'stream':
      return event.event
    case 'request_start':
      return { type: 'stream_request_start' as const }
    case 'done':
      return undefined
    default:
      return undefined
  }
}

/**
 * Marcadores de frontera de identidad entre `AgentMessage` (runtime del
 * agente) y `CoreMessage` (superficie del SDK). Son estructuralmente
 * idénticos hoy — el cast es un no-op— pero el conversor explícito hace la
 * frontera greppeable y permite que un refactor futuro evolucione las dos
 * formas de manera independiente sin reescribir cada call site.
 *
 * La fuente tipa cada uno como `(messages: AgentMessage[]): CoreMessage[]`
 * y `(messages: CoreMessage[]): AgentMessage[]`, con un cast `as` interno.
 * Ninguno de esos dos tipos existe en este porte parcial (viven en
 * `./index.ts`, que no se importó aquí); se tipan genéricos sobre `T[]` — el
 * cuerpo, la identidad y la igualdad de referencia son exactamente los
 * mismos que la fuente.
 */
export function toCoreMessages<T>(messages: T[]): T[] {
  return messages
}

export function fromCoreMessages<T>(messages: T[]): T[] {
  return messages
}
