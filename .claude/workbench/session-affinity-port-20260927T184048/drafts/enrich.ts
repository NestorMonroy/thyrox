/**
 * Enriquecer una petición con su identidad de sesión — porte de `Enrich` y
 * `hasExplicitSession` de CLIProxyAPI (`sdk/cliproxy/session/identity.go`,
 * leído como referencia).
 *
 * La identidad se decide una vez y se copia a los dos mapas de metadata que
 * la referencia mantiene —el de la petición y el de las opciones—, en este
 * orden de preferencia:
 *
 *   1. una sesión explícita (cabecera o cuerpo): `canonical_session_id` y su
 *      padre salen de `extractSessionInfo`, y no se deriva nada;
 *   2. una sesión canónica o de comparador de prefijos que ya traiga la
 *      metadata (llamadores embebidos, etapas enrutadas antes);
 *   3. una sesión de ejecución: `execution:<id>`;
 *   4. si no hay nada de lo anterior, `deriveId` sobre el contenido, en
 *      `derived_session_id`.
 *
 * Nunca muta los mapas que recibe: devuelve copias.
 */
import { deriveId, normalizeExplicitId, metadataIdentities } from './identity.ts'
import { boundSessionIdentity, extractSessionInfo, METADATA_KEYS, SESSION_HEADERS, type SessionHeaders, type SessionMetadata, sessionHeaderValue } from './info.ts'
import { getPath, isObject, type JsonObject, parsePayload, textAt } from './payload.ts'

export type EnrichInput = {
  payload?: string | JsonObject
  /** El cuerpo original; sin él se usa `payload`, sin copiarlo. */
  originalRequest?: string | JsonObject
  headers?: SessionHeaders
  sourceFormat?: string
  requestMetadata?: SessionMetadata
  optionsMetadata?: SessionMetadata
}

export type EnrichResult = {
  originalRequest: string | JsonObject | undefined
  requestMetadata: SessionMetadata | undefined
  optionsMetadata: SessionMetadata | undefined
}

/** Cabeceras que declaran sesión: con una válida, no se deriva. */
const EXPLICIT_HEADERS = [
  SESSION_HEADERS.messagesSession, SESSION_HEADERS.messagesAgent, SESSION_HEADERS.messagesParentAgent,
  SESSION_HEADERS.codexSession, SESSION_HEADERS.codexSessionUnderscore,
  SESSION_HEADERS.codexParentThread, SESSION_HEADERS.codexTurnMetadata, SESSION_HEADERS.openaiSubagent,
  SESSION_HEADERS.antigravitySession, SESSION_HEADERS.genericSession, SESSION_HEADERS.opencodeAffinity,
  SESSION_HEADERS.parentSession, SESSION_HEADERS.opencodeParentAffinity, SESSION_HEADERS.parent,
  SESSION_HEADERS.piSlot, SESSION_HEADERS.piParentSlot, SESSION_HEADERS.task, SESSION_HEADERS.parentTask,
  SESSION_HEADERS.conversation, SESSION_HEADERS.parentConversation, SESSION_HEADERS.thread,
  SESSION_HEADERS.parentThread, SESSION_HEADERS.codexThread, SESSION_HEADERS.clientRequest,
]

/** Rutas del cuerpo que declaran sesión. */
const EXPLICIT_PATHS = [
  'session_id', 'sessionId', 'sessionID', 'child_session_id', 'childSessionId',
  'task_id', 'taskId', 'taskID', 'action_id', 'actionId',
  'cachedContent', 'cached_content', 'thread_id', 'threadId',
  'conversation_id', 'conversationId', 'chat_id', 'chatId', 'prompt_cache_key', 'promptCacheKey',
  'parent_session_id', 'parentSessionId', 'parent_thread_id', 'parentThreadId',
  'parent_id', 'parentId', 'parentID', 'parent_task_id', 'parentTaskId',
  'parent_action_id', 'parentActionId', 'parent_session', 'parentSession', 'parent_subagent_id',
  'forkSource.sessionId', 'previousSessionId', 'forked_from_thread_id', 'forked_from_id',
  'metadata.session_id', 'metadata.sessionId', 'metadata.task_id', 'metadata.taskId',
  'metadata.thread_id', 'metadata.conversation_id', 'metadata.parent_id', 'metadata.parent_task_id',
  'metadata.parent_agent_id', 'extra_body.session_id', 'extra_body.task_id',
  'extra_body.parent_id', 'extra_body.parent_task_id',
]

/** `hasExplicitSession`: ¿la petición declara su sesión por cabecera o por cuerpo? */
export function hasExplicitSession(headers: SessionHeaders, payload: string | JsonObject | undefined): boolean {
  if (EXPLICIT_HEADERS.some(name => sessionHeaderValue(headers, name) !== '')) return true
  const root = parsePayload(payload)
  if (!isObject(root)) return false
  const request = getPath(root, 'request')
  const nested = request !== undefined && getPath(root, 'contents') === undefined
  const explicitAt = (path: string) =>
    normalizeExplicitId(textAt(root, path)) !== '' || (nested && normalizeExplicitId(textAt(request, path)) !== '')
  if (EXPLICIT_PATHS.some(explicitAt)) return true
  if (metadataIdentities(payload).sessionId !== '') return true
  let userId = textAt(root, 'metadata.user_id').trim()
  if (!userId && nested) userId = textAt(request, 'metadata.user_id').trim()
  if (normalizeExplicitId(userId) !== '') return true
  let conversation = getPath(root, 'conversation')
  if (conversation === undefined && nested) conversation = getPath(request, 'conversation')
  if (normalizeExplicitId(textAt(conversation, 'id')) !== '') return true
  return typeof conversation === 'string' && normalizeExplicitId(conversation) !== ''
}

function withValue(metadata: SessionMetadata | undefined, key: string, value: unknown): SessionMetadata {
  return { ...metadata, [key]: value }
}

function withoutKey(metadata: SessionMetadata | undefined, key: string): SessionMetadata | undefined {
  if (!metadata || !(key in metadata)) return metadata
  const { [key]: _removed, ...rest } = metadata
  return rest
}

/** `firstNormalizedMetadataID`: el primer valor de texto válido de la clave. */
function firstNormalizedId(key: string, ...sets: (SessionMetadata | undefined)[]): string {
  for (const metadata of sets) {
    const raw = metadata?.[key]
    if (typeof raw !== 'string') continue
    const normalized = normalizeExplicitId(raw)
    if (normalized) return normalized
  }
  return ''
}

/** `metadataString`: el valor como texto recortado; lo que no es texto, en su forma impresa. */
function metadataString(metadata: SessionMetadata | undefined, key: string): string {
  const value = metadata?.[key]
  if (value === undefined || value === null) return ''
  return (typeof value === 'string' ? value : String(value)).trim()
}

/** Los dos mapas a la vez: la referencia escribe siempre el mismo cambio en ambos. */
class MetadataPair {
  constructor(public request: SessionMetadata | undefined, public options: SessionMetadata | undefined) {}
  set(key: string, value: unknown): void {
    this.request = withValue(this.request, key, value)
    this.options = withValue(this.options, key, value)
  }
  remove(key: string): void {
    this.request = withoutKey(this.request, key)
    this.options = withoutKey(this.options, key)
  }
  keepExecution(executionId: string): void {
    if (executionId) this.set(METADATA_KEYS.executionSession, executionId)
    else this.remove(METADATA_KEYS.executionSession)
  }
  setCanonicalWithParent(canonical: string, parent: string): void {
    this.set(METADATA_KEYS.canonicalSession, boundSessionIdentity(canonical))
    if (parent && parent !== canonical) this.set(METADATA_KEYS.parentSession, boundSessionIdentity(parent))
    else this.remove(METADATA_KEYS.parentSession)
  }
}

/** `Enrich`: la identidad de sesión de la petición, decidida una vez y copiada a los dos mapas. */
export function enrich(input: EnrichInput): EnrichResult {
  const originalRequest = input.originalRequest ?? input.payload
  const pair = new MetadataPair(input.requestMetadata, input.optionsMetadata)
  const done = (): EnrichResult => ({ originalRequest, requestMetadata: pair.request, optionsMetadata: pair.options })
  const executionId = firstNormalizedId(METADATA_KEYS.executionSession, pair.options, pair.request)

  if (hasExplicitSession(input.headers, originalRequest)) {
    pair.remove(METADATA_KEYS.derivedSession)
    pair.keepExecution(executionId)
    const info = extractSessionInfo(input.headers, originalRequest, pair.options)
    if (info?.sessionId) pair.setCanonicalWithParent(info.sessionId, info.parentSessionId ?? '')
    return done()
  }

  for (const key of [METADATA_KEYS.canonicalSession, METADATA_KEYS.lcpAffinitySession]) {
    const preset = firstNormalizedId(key, pair.options, pair.request)
    if (!preset) continue
    pair.remove(METADATA_KEYS.derivedSession)
    pair.keepExecution(executionId)
    pair.setCanonicalWithParent(preset, firstNormalizedId(METADATA_KEYS.parentSession, pair.options, pair.request))
    return done()
  }

  if (executionId) {
    pair.remove(METADATA_KEYS.derivedSession)
    pair.remove(METADATA_KEYS.parentSession)
    pair.set(METADATA_KEYS.executionSession, executionId)
    pair.set(METADATA_KEYS.canonicalSession, boundSessionIdentity(`execution:${executionId}`))
    return done()
  }

  pair.remove(METADATA_KEYS.executionSession)
  pair.remove(METADATA_KEYS.parentSession)
  let derivedId = firstNormalizedId(METADATA_KEYS.derivedSession, pair.options, pair.request)
  pair.remove(METADATA_KEYS.derivedSession)
  if (!derivedId) {
    const scope = metadataString(pair.options, METADATA_KEYS.callerScope) || metadataString(pair.request, METADATA_KEYS.callerScope)
    derivedId = deriveId(input.sourceFormat ?? '', originalRequest, scope)
  }
  if (derivedId) pair.set(METADATA_KEYS.derivedSession, derivedId)
  return done()
}

/** `DerivedID`: la identidad derivada guardada en un mapa de metadata. */
export function derivedId(metadata: SessionMetadata | undefined): string {
  const value = metadata?.[METADATA_KEYS.derivedSession]
  return typeof value === 'string' ? value.trim() : ''
}
