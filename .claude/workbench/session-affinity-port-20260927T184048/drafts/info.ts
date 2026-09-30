/**
 * Extracción de la sesión de una petición — porte de CLIProxyAPI
 * (`sdk/cliproxy/session/info.go`, leído como referencia).
 *
 * Cada cliente declara su conversación a su manera: cabeceras propias (la
 * pareja de sesión y agente del cliente de Messages, `Session-Id` y
 * `X-Codex-Turn-Metadata` de Codex, `X-Http-Session-Id` de Antigravity,
 * `X-Session-Affinity` de OpenCode, `X-Slot-Session-Id` de pi, las de tarea
 * de Roo Code y Cline), campos del cuerpo (`thread_id`, `session_id`,
 * `task_id`, `prompt_cache_key`, `conversation`, `metadata.user_id`) o la
 * metadata de ejecución. `extractSessionInfo` los recorre en el orden de la
 * referencia y devuelve la primera identidad, con su padre y su agente.
 *
 * Los nombres de cabecera van en minúscula y en una sola lista, y se buscan
 * sin distinguir mayúsculas: la forma de OmniRoute para cabeceras de
 * clientes ajenos.
 *
 * Divergencias declaradas:
 * - Con claves duplicadas en un objeto, `JSON.parse` conserva la última y
 *   gjson encuentra la primera que responda la ruta. Los casos de
 *   `info_duplicate_test.go` (un objeto vacío seguido del que lleva la
 *   sesión) dan lo mismo; un duplicado cuyo PRIMER valor responda y el
 *   segundo no, no.
 * - `Headers` de fetch une en `a, b` los valores repetidos de una cabecera;
 *   `http.Header` de Go los recorre uno a uno. Con un objeto de listas se
 *   conserva la conducta de la referencia.
 */
import { createHash } from 'node:crypto'
import { metadataIdentities, normalizeExplicitId } from './identity.ts'
import { getPath, isObject, type JsonObject, type JsonValue, parsePayload, textAt } from './payload.ts'

/** Claves de la metadata de ejecución (`sdk/cliproxy/executor/types.go`). */
export const METADATA_KEYS = {
  callerScope: 'caller_scope',
  executionSession: 'execution_session_id',
  derivedSession: 'derived_session_id',
  lcpAffinitySession: 'lcp_affinity_session_id',
  canonicalSession: 'canonical_session_id',
  parentSession: 'parent_session_id',
  isCompaction: 'is_compaction',
} as const

export type SessionMetadata = Record<string, unknown>
export type SessionHeaders = Headers | Record<string, string | readonly string[] | undefined> | undefined

export type SessionInfo = {
  sessionId: string
  parentSessionId?: string
  agentName?: string
  clientType?: string
  callerScope?: string
  nodeKind?: string
  isFork?: boolean
  isCompaction?: boolean
  isSubagent?: boolean
}

/** Las cabeceras de sesión de clientes ajenos, en minúscula. */
export const SESSION_HEADERS = {
  messagesSession: 'x-claude-code-session-id',
  messagesAgent: 'x-claude-code-agent-id',
  messagesParentAgent: 'x-claude-code-parent-agent-id',
  codexSession: 'session-id',
  codexSessionUnderscore: 'session_id',
  codexThread: 'thread-id',
  codexThreadUnderscore: 'thread_id',
  codexTurnMetadata: 'x-codex-turn-metadata',
  codexParentThread: 'x-codex-parent-thread-id',
  openaiSubagent: 'x-openai-subagent',
  antigravitySession: 'x-http-session-id',
  genericSession: 'x-session-id',
  opencodeAffinity: 'x-session-affinity',
  opencodeParentAffinity: 'x-parent-session-affinity',
  piSlot: 'x-slot-session-id',
  piParentSlot: 'x-parent-slot-session-id',
  task: 'x-task-id',
  taskUnderscore: 'x-task_id',
  parentTask: 'x-parent-task-id',
  parentSession: 'x-parent-session-id',
  parent: 'x-parent-id',
  conversation: 'x-conversation-id',
  parentConversation: 'x-parent-conversation-id',
  thread: 'x-thread-id',
  parentThread: 'x-parent-thread-id',
  clientRequest: 'x-client-request-id',
  agent: 'x-agent-id',
} as const

const PARENT_PATHS = [
  'parent_session_id', 'parentSessionId', 'parentSessionID',
  'parent_thread_id', 'parentThreadId', 'parentThreadID',
  'forked_from_thread_id', 'forked_from_id',
  'parent_conversation_id', 'parentConversationId', 'parentConversationID',
  'parent_id', 'parentId', 'parentID',
  'parent_task_id', 'parentTaskId', 'parentTaskID',
  'parent_action_id', 'parentActionId', 'parentActionID',
  'parent_session', 'parentSession',
  'parent_subagent_id', 'parentSubagentId',
  'forkSource.sessionId', 'fork_source.session_id',
  'previousSessionId', 'previous_session_id',
  'metadata.parent_session_id', 'metadata.parentSessionId', 'metadata.parentSessionID',
  'metadata.parent_thread_id', 'metadata.parentThreadId',
  'metadata.forked_from_thread_id', 'metadata.forked_from_id',
  'metadata.parent_id', 'metadata.parentId', 'metadata.parentID',
  'metadata.parent_task_id', 'metadata.parentTaskId', 'metadata.parentTaskID',
  'metadata.parent_action_id', 'metadata.parentActionId',
  'metadata.parent_subagent_id', 'metadata.parentSubagentId',
  'metadata.parent_session', 'metadata.parentSession',
  'metadata.parent_agent_id', 'metadata.parentAgentId',
  'metadata.forkSource.sessionId', 'metadata.previousSessionId',
  'extra_body.parent_session_id', 'extra_body.parentSessionId', 'extra_body.parentSessionID',
  'extra_body.parent_thread_id', 'extra_body.parentThreadId',
  'extra_body.forked_from_thread_id', 'extra_body.forked_from_id',
  'extra_body.parent_id', 'extra_body.parentId', 'extra_body.parentID',
  'extra_body.parent_task_id', 'extra_body.parentTaskId',
  'extra_body.parent_action_id', 'extra_body.parentActionId',
  'extra_body.parent_subagent_id', 'extra_body.parentSubagentId',
  'extra_body.parent_session', 'extra_body.parentSession',
]
const FORK_PATHS = [
  'forked_from_thread_id', 'forked_from_id',
  'forkSource.sessionId', 'fork_source.session_id',
  'previousSessionId', 'previous_session_id',
  'metadata.forked_from_thread_id', 'metadata.forked_from_id',
  'metadata.forkSource.sessionId', 'metadata.previousSessionId',
  'extra_body.forked_from_thread_id', 'extra_body.forked_from_id',
  'extra_body.forkSource.sessionId', 'extra_body.previousSessionId',
]
const CODEX_FORK_PATHS = [
  'forked_from_thread_id', 'forked_from_id',
  'metadata.forked_from_thread_id', 'metadata.forked_from_id',
  'extra_body.forked_from_thread_id', 'extra_body.forked_from_id',
]
const THREAD_PATHS = ['thread_id', 'threadId', 'metadata.thread_id']
const SESSION_PATHS = [
  'session_id', 'sessionId', 'sessionID',
  'child_session_id', 'childSessionId',
  'metadata.session_id', 'metadata.sessionId', 'metadata.sessionID',
  'metadata.child_session_id',
  'extra_body.session_id', 'extra_body.sessionId', 'extra_body.sessionID',
]
const TASK_PATHS = [
  'task_id', 'taskId', 'taskID',
  'action_id', 'actionId', 'actionID',
  'metadata.task_id', 'metadata.taskId', 'metadata.taskID',
  'metadata.action_id', 'metadata.actionId', 'metadata.actionID',
  'extra_body.task_id', 'extra_body.taskId', 'extra_body.taskID',
]
const CONVERSATION_PATHS = ['conversation_id', 'conversationId', 'chat_id', 'chatId', 'metadata.conversation_id', 'extra_body.conversation_id']

const MAX_IDENTITY_BYTES = 256

/** `sessionHeaderValue`: el primer valor válido de la cabecera, sin distinguir mayúsculas. */
export function sessionHeaderValue(headers: SessionHeaders, name: string): string {
  if (!headers) return ''
  if (headers instanceof Headers) return normalizeExplicitId(headers.get(name) ?? '')
  const wanted = name.toLowerCase()
  for (const [key, raw] of Object.entries(headers)) {
    if (key.toLowerCase() !== wanted || raw === undefined) continue
    for (const value of typeof raw === 'string' ? [raw] : raw) {
      const normalized = normalizeExplicitId(value)
      if (normalized) return normalized
    }
  }
  return ''
}

function firstHeader(headers: SessionHeaders, ...names: string[]): string {
  for (const name of names) {
    const value = sessionHeaderValue(headers, name)
    if (value) return value
  }
  return ''
}

/** La raíz del cuerpo y, si la petición viene anidada en `request`, esa también. */
type Roots = { root: JsonValue; request: JsonValue; nested: boolean }

function payloadRoots(payload: string | JsonObject | undefined): Roots {
  const root = parsePayload(payload)
  const request = isObject(root) ? getPath(root, 'request') : undefined
  const nested = request !== undefined && getPath(root, 'contents') === undefined
  return { root, request: nested ? request : root, nested }
}

/** El primer candidato normalizado entre las rutas, en la raíz y luego en `request`. */
function firstCandidate(roots: Roots, paths: readonly string[]): string {
  if (!isObject(roots.root)) return ''
  for (const path of paths) {
    const value = normalizeExplicitId(textAt(roots.root, path))
    if (value) return value
    if (roots.nested) {
      const nested = normalizeExplicitId(textAt(roots.request, path))
      if (nested) return nested
    }
  }
  return ''
}

function isBodyForkCandidate(roots: Roots): boolean {
  return firstCandidate(roots, FORK_PATHS) !== ''
}

/** `BoundSessionIdentity`: como mucho 256 bytes, sin partir un carácter y sin colisiones. */
export function boundSessionIdentity(id: string): string {
  const bytes = Buffer.from(id, 'utf8')
  if (bytes.length <= MAX_IDENTITY_BYTES) return id
  const hash = createHash('sha256').update(bytes).digest('hex')
  let prefix = bytes.subarray(0, MAX_IDENTITY_BYTES - 1 - 1 - hash.length)
  const decoder = new TextDecoder('utf-8', { fatal: true })
  for (;;) {
    try {
      return `${decoder.decode(prefix)}#${hash}`
    } catch {
      prefix = prefix.subarray(0, prefix.length - 1)
    }
  }
}

function finalizeSessionInfo(info: SessionInfo): SessionInfo | undefined {
  if (!info.sessionId) return undefined
  const sessionId = boundSessionIdentity(info.sessionId)
  let parentSessionId = info.parentSessionId ? boundSessionIdentity(info.parentSessionId) : undefined
  if (parentSessionId === sessionId) parentSessionId = undefined
  const finalized: SessionInfo = { ...info, sessionId, agentName: info.agentName || 'main', clientType: info.clientType || 'generic' }
  if (parentSessionId) finalized.parentSessionId = parentSessionId
  else delete finalized.parentSessionId
  return finalized
}

/** Un padre del mismo espacio, o ninguno si es la propia sesión. */
function childOf(prefix: string, sessionId: string, explicitParent: string, parentCandidate: string): Pick<SessionInfo, 'parentSessionId' | 'agentName'> {
  if (explicitParent && explicitParent !== sessionId) return { parentSessionId: prefix + explicitParent, agentName: 'subagent' }
  if (parentCandidate && parentCandidate !== sessionId) return { parentSessionId: prefix + parentCandidate, agentName: 'subagent' }
  return { agentName: 'main' }
}

function metadataText(metadata: SessionMetadata | undefined, key: string): string {
  const value = metadata?.[key]
  return typeof value === 'string' ? value : ''
}

/** `ExtractSessionInfo`: la identidad de sesión de la petición, o `undefined`. */
export function extractSessionInfo(
  headers: SessionHeaders,
  payload: string | JsonObject | undefined,
  metadata?: SessionMetadata,
): SessionInfo | undefined {
  const info: SessionInfo = { sessionId: '' }
  const scope = metadataText(metadata, METADATA_KEYS.callerScope).trim()
  if (scope) info.callerScope = scope

  const roots = payloadRoots(payload)
  const hasBody = isObject(roots.root)
  let parentCandidate = hasBody ? firstCandidate(roots, PARENT_PATHS) : ''
  if (hasBody && !parentCandidate) parentCandidate = metadataIdentities(payload).parentSessionId

  const bodyAgent = () => firstCandidate(roots, ['metadata.agent_id', 'metadata.subagent_id'])
  const bodyParentAgent = () => firstCandidate(roots, ['metadata.parent_agent_id', 'metadata.parentAgentId'])

  // 1. Cabeceras de sesión del cliente de Messages.
  const messagesSession = sessionHeaderValue(headers, SESSION_HEADERS.messagesSession)
  if (messagesSession) {
    info.clientType = 'claude'
    let agentId = sessionHeaderValue(headers, SESSION_HEADERS.messagesAgent)
    if (!agentId && hasBody) agentId = bodyAgent()
    if (!agentId) agentId = metadataIdentities(payload).agentId
    let parentAgentId = sessionHeaderValue(headers, SESSION_HEADERS.messagesParentAgent)
    if (!parentAgentId && hasBody) parentAgentId = bodyParentAgent()
    const base = `claude:${messagesSession}`
    if (agentId && agentId !== 'main') {
      info.agentName = agentId
      info.parentSessionId = base
      if (parentAgentId && parentAgentId !== 'main' && parentAgentId !== agentId) info.parentSessionId = `${base}:agent:${parentAgentId}`
      else if (parentCandidate && parentCandidate !== messagesSession) info.parentSessionId = `claude:${parentCandidate}`
      info.sessionId = `${base}:agent:${agentId}`
    } else {
      info.agentName = 'main'
      info.sessionId = base
      if (parentCandidate && parentCandidate !== messagesSession) {
        info.parentSessionId = `claude:${parentCandidate}`
        info.agentName = 'subagent'
      }
    }
    return finalizeSessionInfo(info)
  }

  // 2. `metadata.user_id` de Messages en el cuerpo: gana a las cabeceras genéricas.
  if (hasBody) {
    const identities = metadataIdentities(payload)
    const sid = identities.sessionId
    if (sid) {
      info.clientType = 'claude'
      let agentId = identities.agentId || sessionHeaderValue(headers, SESSION_HEADERS.messagesAgent)
      if (!agentId) agentId = bodyAgent()
      let parentAgentId = sessionHeaderValue(headers, SESSION_HEADERS.messagesParentAgent)
      if (!parentAgentId) parentAgentId = bodyParentAgent()
      const parentSid = identities.parentSessionId
      const base = `claude:${sid}`
      if (agentId && agentId !== 'main') {
        info.sessionId = `${base}:agent:${agentId}`
        info.parentSessionId = base
        if (parentAgentId && parentAgentId !== 'main' && parentAgentId !== agentId) info.parentSessionId = `${base}:agent:${parentAgentId}`
        else if (parentSid && parentSid !== sid) info.parentSessionId = `claude:${parentSid}`
        else if (parentCandidate && parentCandidate !== sid) info.parentSessionId = `claude:${parentCandidate}`
        info.agentName = agentId
      } else {
        info.sessionId = base
        if (parentSid && parentSid !== sid) {
          info.parentSessionId = `claude:${parentSid}`
          info.agentName = 'subagent'
        } else if (parentCandidate && parentCandidate !== sid) {
          info.parentSessionId = `claude:${parentCandidate}`
          info.agentName = 'subagent'
        } else {
          info.agentName = 'main'
        }
      }
      return finalizeSessionInfo(info)
    }
  }

  // 3. Codex.
  const codex = extractCodex(headers, roots, parentCandidate, info)
  if (codex !== null) return codex

  // 4. Antigravity.
  const antigravity = sessionHeaderValue(headers, SESSION_HEADERS.antigravitySession)
  if (antigravity) {
    const parent = firstHeader(headers, SESSION_HEADERS.parentSession, SESSION_HEADERS.parent)
    return finalizeSessionInfo({ ...info, clientType: 'agy', sessionId: `agy:${antigravity}`, ...childOf('agy:', antigravity, parent, parentCandidate) })
  }

  // 5. Cabeceras genéricas, OpenCode, pi, tareas, conversación, hilo y petición.
  const generic = sessionHeaderValue(headers, SESSION_HEADERS.genericSession)
  if (generic) {
    const parent = firstHeader(headers, SESSION_HEADERS.parentSession, SESSION_HEADERS.parent)
    return finalizeSessionInfo({ ...info, clientType: 'generic', sessionId: `header:${generic}`, ...childOf('header:', generic, parent, parentCandidate) })
  }
  const affinity = sessionHeaderValue(headers, SESSION_HEADERS.opencodeAffinity)
  if (affinity) {
    const parent = firstHeader(headers, SESSION_HEADERS.opencodeParentAffinity, SESSION_HEADERS.parentSession, SESSION_HEADERS.parent)
    return finalizeSessionInfo({ ...info, clientType: 'opencode', sessionId: `affinity:${affinity}`, ...childOf('affinity:', affinity, parent, parentCandidate) })
  }
  const slot = sessionHeaderValue(headers, SESSION_HEADERS.piSlot)
  if (slot) {
    const parent = firstHeader(headers, SESSION_HEADERS.piParentSlot, SESSION_HEADERS.parentSession, SESSION_HEADERS.parent)
    const edge = childOf('slot:', slot, parent, parentCandidate)
    return finalizeSessionInfo({ ...info, clientType: 'pi', sessionId: `slot:${slot}`, ...edge, agentName: edge.parentSessionId ? 'subagent' : 'slot' })
  }
  const task = firstHeader(headers, SESSION_HEADERS.task, SESSION_HEADERS.taskUnderscore)
  if (task) {
    const parent = firstHeader(headers, SESSION_HEADERS.parentTask, SESSION_HEADERS.parentSession, SESSION_HEADERS.parent)
    return finalizeSessionInfo({ ...info, clientType: 'task', sessionId: `task:${task}`, ...childOf('task:', task, parent, parentCandidate) })
  }
  const conversation = sessionHeaderValue(headers, SESSION_HEADERS.conversation)
  if (conversation) {
    const parent = firstHeader(headers, SESSION_HEADERS.parentConversation, SESSION_HEADERS.parent)
    return finalizeSessionInfo({ ...info, clientType: 'conv', sessionId: `conv:${conversation}`, ...childOf('conv:', conversation, parent, parentCandidate) })
  }
  const thread = sessionHeaderValue(headers, SESSION_HEADERS.thread)
  if (thread) {
    const parent = firstHeader(headers, SESSION_HEADERS.parentThread, SESSION_HEADERS.parent)
    return finalizeSessionInfo({ ...info, clientType: 'openai-thread', sessionId: `thread:${thread}`, ...childOf('thread:', thread, parent, parentCandidate) })
  }
  const clientRequest = sessionHeaderValue(headers, SESSION_HEADERS.clientRequest)
  if (clientRequest) {
    const parent = firstHeader(headers, SESSION_HEADERS.parentSession, SESSION_HEADERS.parent)
    return finalizeSessionInfo({ ...info, clientType: 'generic', sessionId: `clientreq:${clientRequest}`, ...childOf('clientreq:', clientRequest, parent, parentCandidate) })
  }

  // 6. El cuerpo.
  if (hasBody) {
    const body = extractFromBody(headers, roots, parentCandidate, info)
    if (body) return body
  }

  // 7. La sesión de ejecución.
  const execution = normalizeExplicitId(metadataText(metadata, METADATA_KEYS.executionSession))
  if (execution) return finalizeSessionInfo({ ...info, clientType: 'generic', sessionId: `execution:${execution}`, agentName: 'main' })

  // 8. La identidad del comparador de prefijos.
  const lcp = normalizeExplicitId(metadataText(metadata, METADATA_KEYS.lcpAffinitySession))
  if (lcp) {
    const lcpInfo: SessionInfo = { ...info, clientType: 'lcp', sessionId: lcp, agentName: 'main' }
    const parent = normalizeExplicitId(metadataText(metadata, METADATA_KEYS.parentSession))
    if (parent && parent !== lcp) {
      lcpInfo.parentSessionId = parent
      if (metadata?.[METADATA_KEYS.isCompaction] === true) {
        Object.assign(lcpInfo, { isCompaction: true, isFork: false, nodeKind: 'compaction', agentName: 'main' })
      } else {
        Object.assign(lcpInfo, { agentName: 'subagent', isFork: true, nodeKind: 'fork' })
      }
    }
    return finalizeSessionInfo(lcpInfo)
  }
  return undefined
}

/** La rama de Codex, o `null` si la petición no trae sesión ni hilo de Codex. */
function extractCodex(headers: SessionHeaders, roots: Roots, parentCandidate: string, info: SessionInfo): SessionInfo | undefined | null {
  let sid = firstHeader(headers, SESSION_HEADERS.codexSession, SESSION_HEADERS.codexSessionUnderscore)
  let tid = firstHeader(headers, SESSION_HEADERS.codexThread, SESSION_HEADERS.codexThreadUnderscore)
  const turn = turnMetadata(headers)
  const turnValue = (path: string) => (turn === undefined ? '' : normalizeExplicitId(textAt(turn, path)))
  if (!sid) sid = turnValue('session_id')
  if (!tid) tid = turnValue('thread_id')
  if (!tid && sid) tid = firstCandidate(roots, THREAD_PATHS)
  if (!sid && !tid) return null

  const codex: SessionInfo = { ...info, clientType: 'codex' }
  let parentThread = sessionHeaderValue(headers, SESSION_HEADERS.codexParentThread)
  if (!parentThread) parentThread = turnValue('parent_thread_id')
  let forkedFrom = turnValue('forked_from_thread_id') || turnValue('forked_from_id')
  if (!forkedFrom) forkedFrom = firstCandidate(roots, CODEX_FORK_PATHS)

  let agentName = ''
  if (turn !== undefined) {
    const raw = normalizeExplicitId(textAt(turn, 'agent_name').replace(/^\/root\//, '').replace(/^\//, '').trim())
    if (raw && raw !== 'root' && raw !== 'main') agentName = raw
  }
  const subagentHeader = sessionHeaderValue(headers, SESSION_HEADERS.openaiSubagent)
  let subagentSignal = subagentHeader !== '' && subagentHeader.toLowerCase() !== 'false' && subagentHeader !== '0'
  if (turn !== undefined && textAt(turn, 'subagent_kind') === 'thread_spawn') subagentSignal = true

  if (forkedFrom) {
    let forkSession = tid || sid
    if (forkSession === forkedFrom && sid && sid !== forkedFrom) forkSession = sid
    return finalizeSessionInfo({ ...codex, sessionId: `codex:${forkSession}`, parentSessionId: `codex:${forkedFrom}`, agentName: 'main', isFork: true, isSubagent: false })
  }

  if (subagentSignal || (tid && sid && tid !== sid) || (parentThread && parentThread !== tid && parentThread !== sid)) {
    const child = tid || sid
    const parentSid = parentThread || sid
    if (agentName && sid) {
      codex.sessionId = `codex:${sid}:agent:${agentName}`
      codex.agentName = agentName
      if (parentSid) codex.parentSessionId = `codex:${parentSid}`
      else if (parentCandidate && parentCandidate !== sid) codex.parentSessionId = `codex:${parentCandidate}`
    } else {
      codex.sessionId = `codex:${child}`
      codex.agentName = agentName || 'subagent'
      if (parentSid && parentSid !== child) codex.parentSessionId = `codex:${parentSid}`
      else if (parentCandidate && parentCandidate !== child) codex.parentSessionId = `codex:${parentCandidate}`
    }
    codex.isSubagent = true
    return finalizeSessionInfo(codex)
  }

  const session = sid || tid
  codex.sessionId = `codex:${session}`
  if (parentThread && parentThread !== session) Object.assign(codex, { parentSessionId: `codex:${parentThread}`, agentName: 'subagent', isSubagent: true })
  else if (parentCandidate && parentCandidate !== session) Object.assign(codex, { parentSessionId: `codex:${parentCandidate}`, agentName: 'subagent', isSubagent: true })
  else codex.agentName = 'main'
  return finalizeSessionInfo(codex)
}

/** `X-Codex-Turn-Metadata`, decodificada; `undefined` si falta o no es JSON. */
function turnMetadata(headers: SessionHeaders): JsonValue {
  if (!headers) return undefined
  let raw = ''
  if (headers instanceof Headers) raw = headers.get(SESSION_HEADERS.codexTurnMetadata) ?? ''
  else {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== SESSION_HEADERS.codexTurnMetadata || value === undefined) continue
      raw = typeof value === 'string' ? value : (value[0] ?? '')
      break
    }
  }
  raw = raw.trim()
  return raw ? parsePayload(raw) : undefined
}

/** El paso 6 de la referencia: identidades que sólo trae el cuerpo. */
function extractFromBody(headers: SessionHeaders, roots: Roots, parentCandidate: string, info: SessionInfo): SessionInfo | undefined {
  const forkOrSubagent = (prefix: string, sessionId: string): Partial<SessionInfo> => {
    if (!parentCandidate || parentCandidate === sessionId) return { agentName: 'main' }
    return isBodyForkCandidate(roots)
      ? { parentSessionId: prefix + parentCandidate, isFork: true, isSubagent: false, agentName: 'main' }
      : { parentSessionId: prefix + parentCandidate, agentName: 'subagent', isSubagent: true }
  }

  const cache = firstCandidate(roots, ['cachedContent']) || firstCandidate(roots, ['cached_content'])
  if (cache) return finalizeSessionInfo({ ...info, clientType: 'gemini', sessionId: `geminicache:${cache}`, ...childOf('geminicache:', cache, '', parentCandidate) })

  const thread = firstCandidate(roots, THREAD_PATHS)
  if (thread) return finalizeSessionInfo({ ...info, clientType: 'openai-thread', sessionId: `thread:${thread}`, ...forkOrSubagent('thread:', thread) })

  let agentId = normalizeExplicitId(textAt(roots.root, 'metadata.agent_id')) || normalizeExplicitId(textAt(roots.root, 'metadata.subagent_id'))
  if (!agentId) agentId = firstHeader(headers, SESSION_HEADERS.messagesAgent, SESSION_HEADERS.agent)
  if (!agentId && roots.nested) agentId = normalizeExplicitId(textAt(roots.request, 'metadata.agent_id')) || normalizeExplicitId(textAt(roots.request, 'metadata.subagent_id'))

  const session = firstCandidate(roots, SESSION_PATHS)
  if (session) {
    const generic: SessionInfo = { ...info, clientType: 'generic' }
    if (agentId && agentId !== 'main') {
      generic.sessionId = `session:${session}:agent:${agentId}`
      generic.parentSessionId = parentCandidate && parentCandidate !== session ? `session:${parentCandidate}` : `session:${session}`
      generic.agentName = agentId
      return finalizeSessionInfo(generic)
    }
    return finalizeSessionInfo({ ...generic, sessionId: `session:${session}`, ...forkOrSubagent('session:', session) })
  }

  const task = firstCandidate(roots, TASK_PATHS)
  if (task) return finalizeSessionInfo({ ...info, clientType: 'task', sessionId: `task:${task}`, ...forkOrSubagent('task:', task) })

  let conversation = isObject(roots.root) ? getPath(roots.root, 'conversation') : undefined
  if (conversation === undefined && roots.nested) conversation = getPath(roots.request, 'conversation')
  let conversationId = ''
  const conversationObjectId = normalizeExplicitId(textAt(conversation, 'id'))
  if (conversationObjectId) conversationId = `conv:${conversationObjectId}`
  else if (typeof conversation === 'string') {
    const plain = normalizeExplicitId(conversation)
    if (plain) conversationId = `conv:${plain}`
  }

  let promptCacheKey = normalizeExplicitId(textAt(roots.root, 'prompt_cache_key')) || normalizeExplicitId(textAt(roots.root, 'promptCacheKey'))
  if (!promptCacheKey && roots.nested) {
    promptCacheKey = normalizeExplicitId(textAt(roots.request, 'prompt_cache_key')) || normalizeExplicitId(textAt(roots.request, 'promptCacheKey'))
  }
  if (promptCacheKey) return finalizeSessionInfo({ ...info, clientType: 'generic', sessionId: `pck:${promptCacheKey}`, ...childOf('pck:', promptCacheKey, '', parentCandidate) })

  if (conversationId) {
    const parent = parentCandidate && `conv:${parentCandidate}` !== conversationId
      ? { parentSessionId: `conv:${parentCandidate}`, agentName: 'subagent' }
      : { agentName: 'main' }
    return finalizeSessionInfo({ ...info, clientType: 'conv', sessionId: conversationId, ...parent })
  }

  let userId = normalizeExplicitId(textAt(roots.root, 'metadata.user_id'))
  if (!userId && roots.nested) userId = normalizeExplicitId(textAt(roots.request, 'metadata.user_id'))
  if (userId) return finalizeSessionInfo({ ...info, clientType: 'generic', sessionId: `user:${userId}`, agentName: 'main' })

  const legacyConversation = firstCandidate(roots, CONVERSATION_PATHS)
  if (legacyConversation) return finalizeSessionInfo({ ...info, clientType: 'conv', sessionId: `conv:${legacyConversation}`, ...childOf('conv:', legacyConversation, '', parentCandidate) })
  return undefined
}
