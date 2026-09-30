/**
 * El upstream `claude-cli` del proxy local: atiende `/v1/messages` lanzando
 * `claude -p` en un entorno donde claude autentica solo y el proxy no tiene
 * credencial propia (decisión del ejecutor 2026-09-29: todo pasa por el
 * proxy). Restricción medida: claude ejecuta sus propias herramientas y no
 * devuelve `tool_use` al cliente. Por eso las tools de la petición se le
 * exponen como el servidor MCP puente (`./bridge.ts`): cuando claude invoca
 * una, la llamada queda suspendida, el cliente recibe ese `tool_use` con
 * `stop_reason: tool_use`, y la siguiente petición —la que trae el
 * `tool_result`— reanuda el mismo proceso. Una conversación conocida sin
 * proceso vivo se reanuda con `--resume`; una desconocida arranca su sesión.
 *
 * Reparte como `./sdk/cloudForwarder.ts`: lo que no es un upstream
 * `claude-cli` sigue a `next`.
 *
 * Divergencias declaradas:
 * - `count_tokens` no existe en `claude -p`: 501.
 * - Un `tool_result` de una conversación que el proxy ya no retiene es un
 *   400 que nombra el `tool_use`; no hay cómo entregárselo a claude.
 * - Un mensaje de usuario nuevo sobre un turno todavía suspendido abandona
 *   ese turno (claude no recibirá el resultado) y reanuda la sesión.
 * - El hijo nunca hereda `ANTHROPIC_BASE_URL`, `ANTHROPIC_UNIX_SOCKET` ni
 *   `CLAUDE_CODE_SESSION_ID`, vengan del proceso o de la configuración: el
 *   primero lo haría hablar con este mismo proxy; el último le daría la
 *   sesión de quien lanza al proxy (`claude-p-from-shell-20260928T234121`).
 */
import { randomUUID } from 'node:crypto'
import { errorResponse, type ForwardRequest } from '../server.ts'
import { sseFromEvents } from '../sdk/sdkForward.ts'
import { type BridgeCall, BridgeRegistry, ToolBridge } from './bridge.ts'
import { type CliCommand, type SpawnCli, spawnCliProcess } from './claudeProcess.ts'
import { ConversationRegistry, prefixAlias, toolUseAlias } from './conversations.ts'
import {
  bridgeToolDefinitions,
  claudeArgv,
  type CliSession,
  type ContentBlock,
  contentBlocksOf,
  type ConversationMessage,
  conversationPrefixKey,
  foldedUserInput,
  systemPromptOf,
  toolResultIdsOf,
  userInputLineOf,
} from './requestTranslation.ts'
import { clientFacingContent, messageSseEvents, type MessagesResponse, messagesResponseOf } from './responseTranslation.ts'
import { awaitOutcome, type RunningTurn, runTurn, type TurnFinish } from './turn.ts'

type Forwarder = (request: ForwardRequest) => Promise<Response>

export type CliUpstreamConfig = {
  name: string
  command: CliCommand
  cwd?: string
  /** Variables añadidas al entorno del hijo, encima del entorno del proxy. */
  env?: Record<string, string | undefined>
  /** Cuánto puede tardar un turno hasta su siguiente desenlace; por defecto, una hora. */
  turnTimeoutMs?: number
  /** Cuánto se retiene un turno suspendido a la espera del `tool_result`; por defecto, media hora. */
  pendingResultTtlMs?: number
  /** Cuánto se recuerda una conversación para reanudarla; por defecto, una hora. */
  conversationTtlMs?: number
}

export type CliUpstreamForwarderConfig = {
  next: Forwarder
  upstreams: Record<string, CliUpstreamConfig | undefined>
  /** La URL pública del puente para un token: la del propio proxy más su ruta. */
  bridgeUrlOf: (token: string) => string
  /** El entorno base del hijo; por defecto, el del proceso. */
  baseEnv?: Record<string, string | undefined>
  spawn?: SpawnCli
}

export type CliUpstreamForwarder = {
  forward: Forwarder
  serveBridge: (token: string, request: Request) => Promise<Response>
  stop: () => void
}

const MESSAGES_PATH = '/v1/messages'
const DEFAULT_TURN_TIMEOUT_MS = 3_600_000
const DEFAULT_PENDING_RESULT_TTL_MS = 1_800_000
const DEFAULT_CONVERSATION_TTL_MS = 3_600_000
const STRIPPED_CHILD_ENV = ['ANTHROPIC_BASE_URL', 'ANTHROPIC_UNIX_SOCKET', 'CLAUDE_CODE_SESSION_ID'] as const
const SSE_HEADERS = { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }
const ABANDONED_REASON = 'el cliente no volvió con el tool_result antes del plazo'

type Located =
  | { kind: 'new' }
  | { kind: 'resume'; sessionId: string }
  | { kind: 'live'; turn: RunningTurn }
  | { kind: 'stale'; toolUseIds: string[] }

function isMessageList(value: unknown): value is ConversationMessage[] {
  return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null && typeof (item as { role?: unknown }).role === 'string')
}

function childEnv(base: Record<string, string | undefined>, own: Record<string, string | undefined> | undefined): Record<string, string | undefined> {
  const env = { ...base, ...own }
  for (const name of STRIPPED_CHILD_ENV) delete env[name]
  return env
}

/** El contenido de un `tool_result` en la forma de un resultado MCP. */
function bridgeContentOf(content: unknown): unknown[] {
  if (content === undefined) return []
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  return contentBlocksOf(content).map(block => {
    if (block.type === 'text') return { type: 'text', text: block.text }
    if (block.type === 'image') {
      const source = block.source as { data?: string; media_type?: string } | undefined
      return { type: 'image', data: source?.data, mimeType: source?.media_type }
    }
    return { type: 'text', text: JSON.stringify(block) }
  })
}

function failureCause(turn: RunningTurn, finish: TurnFinish): string {
  const stderr = turn.process.stderrTail()
  if (finish.kind === 'result') {
    const errors = Array.isArray(finish.event.errors) ? finish.event.errors.map(String).join('; ') : finish.event.result ?? finish.event.subtype
    return `claude -p terminó con error (${finish.event.subtype ?? 'sin subtype'}): ${errors}${stderr ? ` — stderr: ${stderr}` : ''}`
  }
  return `claude -p salió con código ${finish.exitCode} sin emitir result${stderr ? `: ${stderr}` : ''}`
}

export function createCliUpstreamForwarder(config: CliUpstreamForwarderConfig): CliUpstreamForwarder {
  const spawn = config.spawn ?? spawnCliProcess
  const baseEnv = config.baseEnv ?? process.env
  const bridges = new BridgeRegistry()
  const registries = new Map<string, ConversationRegistry>()

  function registryOf(upstream: CliUpstreamConfig): ConversationRegistry {
    let registry = registries.get(upstream.name)
    if (!registry) {
      registry = new ConversationRegistry({ conversationTtlMs: upstream.conversationTtlMs ?? DEFAULT_CONVERSATION_TTL_MS })
      registries.set(upstream.name, registry)
    }
    return registry
  }

  /**
   * Abandona un turno: el proceso muere ANTES de que el puente responda, para
   * que claude no reciba el error como resultado y siga gastando turnos
   * sobre él; la respuesta del puente sólo asienta la llamada suspendida.
   */
  function abandon(turn: RunningTurn, reason: string): void {
    bridges.release(turn.token)
    turn.process.kill()
    turn.bridge.abortPending(reason)
  }

  function locate(registry: ConversationRegistry, messages: ConversationMessage[]): Located {
    const last = messages[messages.length - 1]
    if (!last) return { kind: 'new' }
    const toolUseIds = toolResultIdsOf(last)
    if (toolUseIds.length > 0) {
      const sessionId = registry.sessionOf(toolUseIds.map(toolUseAlias))
      const turn = sessionId === undefined ? undefined : registry.take(sessionId)
      return turn ? { kind: 'live', turn } : { kind: 'stale', toolUseIds }
    }
    if (messages.length > 1) {
      const sessionId = registry.sessionOf([prefixAlias(conversationPrefixKey(messages.slice(0, -1)))])
      if (sessionId !== undefined) return { kind: 'resume', sessionId }
    }
    return { kind: 'new' }
  }

  function startTurn(upstream: CliUpstreamConfig, request: ForwardRequest, session: CliSession, content: ContentBlock[]): RunningTurn {
    const body = request.body
    const tools = bridgeToolDefinitions(Array.isArray(body.tools) ? body.tools as Record<string, unknown>[] : [])
    const bridge = new ToolBridge(tools)
    const token = bridges.register(bridge)
    const args = claudeArgv({
      session,
      model: request.upstreamModel,
      toolNames: tools.map(tool => tool.name),
      bridgeUrl: config.bridgeUrlOf(token),
      systemPrompt: systemPromptOf(body.system),
    })
    try {
      const child = spawn({ command: upstream.command, args, cwd: upstream.cwd, env: childEnv(baseEnv, upstream.env), inputLine: userInputLineOf(content) })
      return runTurn({ sessionId: session.sessionId, process: child, bridge, token })
    } catch (error) {
      bridges.release(token)
      throw error
    }
  }

  /** Entrega cada `tool_result` a la llamada que lo espera; el id que ninguna espera es un error. */
  function deliverResults(turn: RunningTurn, last: ConversationMessage): string | undefined {
    for (const block of contentBlocksOf(last.content)) {
      if (block.type !== 'tool_result') continue
      const id = String(block.tool_use_id)
      const call: BridgeCall | undefined = turn.awaiting.get(id)
      if (!call) return id
      turn.awaiting.delete(id)
      call.deliver({ content: bridgeContentOf(block.content), isError: block.is_error === true })
    }
    turn.resetAssistant()
    return undefined
  }

  function respond(request: ForwardRequest, response: MessagesResponse): Response {
    const wantsStream = request.body.stream === true
    if (!wantsStream) return Response.json(response)
    const events = (async function* () { yield* messageSseEvents(response) })()
    return new Response(sseFromEvents(events, { requestId: request.requestId }), { headers: SSE_HEADERS })
  }

  async function settle(upstream: CliUpstreamConfig, registry: ConversationRegistry, request: ForwardRequest, turn: RunningTurn, messages: ConversationMessage[]): Promise<Response> {
    const onAbort = () => turn.process.kill()
    request.signal.addEventListener('abort', onAbort, { once: true })
    let outcome
    try {
      outcome = await awaitOutcome(turn, upstream.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS)
    } finally {
      request.signal.removeEventListener('abort', onAbort)
    }
    if (outcome.kind === 'timeout') {
      abandon(turn, 'el turno agotó su plazo')
      return errorResponse(502, 'api_error', `claude -p no llegó a un desenlace en ${upstream.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS} ms`, request.requestId)
    }
    if (outcome.kind === 'suspended') {
      registry.bind(turn.sessionId, [...turn.awaiting.keys()].map(toolUseAlias))
      registry.bind(turn.sessionId, [prefixAlias(conversationPrefixKey([...messages, { role: 'assistant', content: outcome.content }]))])
      registry.hold(turn, upstream.pendingResultTtlMs ?? DEFAULT_PENDING_RESULT_TTL_MS, held => abandon(held, ABANDONED_REASON))
      return respond(request, messagesResponseOf({ message: outcome.assistant, content: outcome.content, fallbackModel: request.upstreamModel, stopReason: 'tool_use', fallbackId: `msg_${randomUUID()}` }))
    }
    bridges.release(turn.token)
    const failed = outcome.finish.kind === 'exited' || outcome.finish.event.is_error === true
    if (failed) return errorResponse(502, 'api_error', failureCause(turn, outcome.finish), request.requestId)
    const content = clientFacingContent(outcome.assistant)
    registry.bind(turn.sessionId, [prefixAlias(conversationPrefixKey([...messages, { role: 'assistant', content }]))])
    return respond(request, messagesResponseOf({ message: outcome.assistant, content, fallbackModel: request.upstreamModel, stopReason: 'end_turn', fallbackId: `msg_${randomUUID()}` }))
  }

  async function serve(upstream: CliUpstreamConfig, request: ForwardRequest): Promise<Response> {
    if (request.path !== MESSAGES_PATH) return errorResponse(501, 'not_supported', 'claude -p no sirve esta ruta', request.requestId)
    const messages = request.body.messages
    if (!isMessageList(messages) || messages.length === 0) return errorResponse(400, 'invalid_request_error', 'messages debe ser una lista no vacía', request.requestId)
    const registry = registryOf(upstream)
    const located = locate(registry, messages)
    const last = messages[messages.length - 1]!
    if (located.kind === 'stale') {
      return errorResponse(400, 'invalid_request_error', `el proxy no retiene la conversación del tool_use ${located.toolUseIds.join(', ')}; su plazo venció o nunca pasó por aquí`, request.requestId)
    }
    let turn: RunningTurn
    if (located.kind === 'live') {
      turn = located.turn
      const unexpected = deliverResults(turn, last)
      if (unexpected !== undefined) {
        registry.hold(turn, upstream.pendingResultTtlMs ?? DEFAULT_PENDING_RESULT_TTL_MS, held => abandon(held, ABANDONED_REASON))
        return errorResponse(400, 'invalid_request_error', `ninguna llamada suspendida espera el tool_use ${unexpected}`, request.requestId)
      }
    } else {
      if (located.kind === 'resume') {
        const suspended = registry.take(located.sessionId)
        if (suspended) abandon(suspended, 'el cliente siguió la conversación sin entregar el tool_result')
      }
      const session: CliSession = located.kind === 'resume' ? { kind: 'resume', sessionId: located.sessionId } : { kind: 'new', sessionId: randomUUID() }
      const content = located.kind === 'resume' ? contentBlocksOf(last.content) : foldedUserInput(messages)
      try {
        turn = startTurn(upstream, request, session, content)
      } catch (error) {
        return errorResponse(502, 'api_error', `no se pudo lanzar claude -p: ${error instanceof Error ? error.message : String(error)}`, request.requestId)
      }
    }
    return settle(upstream, registry, request, turn, messages)
  }

  return {
    forward: request => {
      const upstream = config.upstreams[request.upstream.name]
      return upstream ? serve(upstream, request) : config.next(request)
    },
    serveBridge: (token, request) => bridges.serve(token, request),
    stop: () => {
      for (const registry of registries.values()) registry.stop(turn => abandon(turn, 'el proxy se detuvo'))
      registries.clear()
    },
  }
}
