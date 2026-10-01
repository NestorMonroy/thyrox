/**
 * Afinidad de sesión en la selección de credenciales — porte de CLIProxyAPI
 * (`sdk/cliproxy/auth/selector.go`, `SessionAffinitySelector`, e
 * `isHierarchyParent` de `home_session_alias.go`, leídos como referencia).
 *
 * Envuelve a otro selector: la primera petición de una sesión la decide el
 * respaldo y queda vinculada; las siguientes vuelven a la misma credencial
 * mientras siga disponible, porque el proveedor conserva la caché del
 * prompt en esa cuenta. La clave de la vinculación es
 * `proveedor::sesión::modelo` con el modelo sin sufijo de razonamiento.
 *
 * La sesión sale, por orden, de una identidad explícita del cliente o de la
 * ejecución (`extractSessionInfo`), de la identidad derivada que dejó
 * `enrich`, o de un hash FNV-1a de 64 bits sobre el sistema, el primer
 * usuario y el primer asistente, cortados a 100 bytes. Cuando hay dos
 * identidades —una conversación y su `prompt_cache_key`, un turno con y sin
 * respuesta, un subagente y su padre— la segunda es el respaldo: hereda su
 * vinculación y, salvo en subagentes y bifurcaciones, se vincula como alias.
 *
 * Una vinculación viva gana a la prioridad: si la credencial vinculada sigue
 * disponible se reutiliza aunque se recupere otra de más prioridad. El
 * respaldo sólo ve el nivel de prioridad más alto disponible.
 *
 * Sin identidad explícita y con un `caller_scope` en la metadata, antes de
 * la derivada y el hash decide el comparador de prefijo común
 * (`./lcpMatcher.ts`): la historia de la conversación nombra la credencial,
 * y las bifurcaciones y compactaciones heredan su linaje. `pick` deja las
 * huellas en la metadata para que `onResult` refresque o retire la
 * secuencia exacta sin volver a leer el cuerpo.
 *
 * Divergencias declaradas:
 * - `shouldSkipCredentialCooldown` es del conductor, que thyrox aún no
 *   tiene: quien informa el resultado lo declara con `skipCooldown`.
 *   pendiente: derivarlo del clasificador de errores (tarea #91).
 * - Sin `context.Context`: el registro de depuración por petición y los
 *   candidatos prevalidados por el `Manager` no se portan.
 */
import {
  availableCredentials,
  canonicalModelKey,
  type CredentialSelector,
  highestPriorityCredentials,
  type PickOptions,
  positiveWeightCredentials,
  type ProxyCredential,
  RoundRobinSelector,
  type SelectionResult,
  WeightedRoundRobinSelector,
} from '../credentialSelectors.ts'
import { extractCanonicalTurns } from './canonicalTurns.ts'
import { derivedId } from './enrich.ts'
import { CANDIDATE_SESSION_PREFIXES, normalizeExplicitId } from './identity.ts'
import { boundSessionIdentity, extractSessionInfo, METADATA_KEYS, type SessionHeaders, type SessionMetadata } from './info.ts'
import { getPath, type JsonObject, type JsonValue, parsePayload, textAt } from './payload.ts'
import { MerklePrefixMatcher, type MerklePrefixBindResult } from './lcpMatcher.ts'
import { SessionCache } from './sessionCache.ts'

export type { PickOptions, SelectionResult } from '../credentialSelectors.ts'

const DEFAULT_TTL_MS = 60 * 60 * 1000
const MESSAGE_PREFIX_BYTES = 100

export type SessionAffinityConfig = {
  fallback?: CredentialSelector
  ttlMs?: number
  /** Si un subagente hereda la credencial de su padre; por defecto, sí. */
  subagentAffinity?: boolean
  maxEntries?: number
  now?: () => number
  cleanup?: boolean
}

export type AffinityStatus = 'bound' | 'unbound' | 'ambiguous' | 'unsupported'
export type AffinityLookup = { authId: string; status: AffinityStatus }


export class SessionAffinitySelector implements CredentialSelector {
  readonly cache: SessionCache
  private readonly matcher: MerklePrefixMatcher
  private readonly fallback: CredentialSelector
  private readonly subagentAffinity: boolean

  constructor(config: SessionAffinityConfig = {}) {
    this.fallback = config.fallback ?? new RoundRobinSelector()
    this.subagentAffinity = config.subagentAffinity ?? true
    const ttlMs = config.ttlMs && config.ttlMs > 0 ? config.ttlMs : DEFAULT_TTL_MS
    this.cache = new SessionCache({ ttlMs, maxEntries: config.maxEntries, now: config.now, cleanup: config.cleanup })
    this.matcher = new MerklePrefixMatcher({ ttlMs, now: config.now })
  }

  pick(provider: string, model: string, credentials: ProxyCredential[], now = new Date(), options: PickOptions = {}): ProxyCredential {
    const metadata = options.metadata ?? {}
    metadata[METADATA_KEYS.sessionAffinityProvider] = provider
    metadata[METADATA_KEYS.sessionAffinityModel] = model
    const request = { ...options, metadata }

    const [explicitId, explicitFallback] = extractExplicitSessionIds(request.headers, request.payload, metadata)
    if (!explicitId) {
      const lcp = this.pickLcp(provider, model, credentials, now, request, metadata)
      if (lcp) return lcp
    } else {
      delete metadata[METADATA_KEYS.lcpAffinitySession]
      delete metadata[METADATA_KEYS.lcpAccessGeneration]
      delete metadata[METADATA_KEYS.isCompaction]
      delete metadata[METADATA_KEYS.nodeKind]
      if (explicitFallback) metadata[METADATA_KEYS.parentSession] = boundSessionIdentity(explicitFallback)
      else delete metadata[METADATA_KEYS.parentSession]
      if (metadata[METADATA_KEYS.isFork] !== true) delete metadata[METADATA_KEYS.isFork]
    }

    let [primaryId, fallbackId] = explicitId ? [explicitId, explicitFallback] : extractSessionIds(request.headers, request.payload, metadata)
    if (primaryId) {
      primaryId = boundSessionIdentity(primaryId)
      if (fallbackId) fallbackId = boundSessionIdentity(fallbackId)
      metadata[METADATA_KEYS.canonicalSession] = primaryId
    }
    const candidates = this.fallback instanceof WeightedRoundRobinSelector ? positiveWeightCredentials(credentials) : credentials
    if (!primaryId) {
      return this.fallback.pick(provider, model, availableCredentials(candidates, provider, model, now), now, request)
    }

    // Una sola pasada de disponibilidad: la vinculada se valida contra todos
    // los niveles; el respaldo sigue viendo sólo el más alto.
    const available = availableCredentials(candidates, provider, model, now, true)
    const fallbackPool = highestPriorityCredentials(available)
    const modelKey = canonicalModelKey(model)
    const cacheKey = `${provider}::${primaryId}::${modelKey}`
    const isFork = metadata[METADATA_KEYS.isFork] === true
    const isSubagent = !isFork && isSubagentSession(primaryId, fallbackId)
    const fallbackKey = fallbackId && fallbackId !== primaryId ? `${provider}::${fallbackId}::${modelKey}` : ''
    const bind = (authId: string) => {
      if (fallbackKey && !isSubagent && !isFork) this.cache.setAliases(authId, cacheKey, fallbackKey)
      else this.cache.set(cacheKey, authId)
    }
    const boundAvailable = (authId: string | undefined) => (authId === undefined ? undefined : available.find(c => c.id === authId))

    const cached = this.cache.getAndRefresh(cacheKey)
    if (cached !== undefined) {
      const bound = boundAvailable(cached) ?? this.fallback.pick(provider, model, fallbackPool, now, request)
      bind(bound.id)
      return bound
    }
    if (fallbackKey && (!isSubagent || this.subagentAffinity)) {
      const inherited = boundAvailable(this.cache.get(fallbackKey))
      if (inherited) {
        bind(inherited.id)
        return inherited
      }
    }
    const picked = this.fallback.pick(provider, model, fallbackPool, now, request)
    bind(picked.id)
    return picked
  }

  /**
   * Sin identidad explícita, el prefijo común: si una trayectoria enlazada
   * comparte el prefijo más largo y su credencial sigue disponible, ésa; si
   * no, la elige el respaldo y la secuencia queda enlazada. `undefined`
   * cuando el LCP no aplica (sin `caller_scope` o sin turnos).
   */
  private pickLcp(provider: string, model: string, credentials: ProxyCredential[], now: Date, request: PickOptions, metadata: SessionMetadata): ProxyCredential | undefined {
    const namespace = lcpAffinityNamespace(provider, model, metadata)
    if (!namespace) return undefined
    const turns = extractCanonicalTurns(request.sourceFormat ?? '', request.payload)
    if (!turns || turns.length === 0) return undefined
    const prepared = this.matcher.prepareExt(turns)
    const { fingerprints, minPrefixLength, tailFingerprints, envDigest } = prepared
    if (fingerprints.length === 0 || minPrefixLength <= 0 || minPrefixLength > fingerprints.length) return undefined
    metadata[METADATA_KEYS.lcpFingerprints] = fingerprints
    metadata[METADATA_KEYS.lcpMinPrefixLength] = minPrefixLength
    metadata[METADATA_KEYS.lcpTailFingerprints] = tailFingerprints
    metadata[METADATA_KEYS.lcpEnvironmentDigest] = envDigest

    const candidates = this.fallback instanceof WeightedRoundRobinSelector ? positiveWeightCredentials(credentials) : credentials
    const available = availableCredentials(candidates, provider, model, now, true)
    const found = this.matcher.matchFingerprints(namespace, fingerprints, tailFingerprints, envDigest, minPrefixLength)
    const matched = found && available.find(c => c.id === found.authId)
    if (found && matched) {
      publishLcpIdentity(metadata, found)
      return matched
    }
    const picked = this.fallback.pick(provider, model, highestPriorityCredentials(available), now, request)
    const bound = this.matcher.bindFingerprints(namespace, fingerprints, tailFingerprints, envDigest, minPrefixLength, picked.id)
    if (bound.sessionId) publishLcpIdentity(metadata, bound)
    return picked
  }

  /** Refresca la vinculación tras un éxito, o la libera tras un fallo de la credencial. */
  onResult(result: SelectionResult): void {
    if (!result.authId) return
    const options = result.options ?? {}
    const metadata = options.metadata
    let [explicitId, explicitFallback] = extractExplicitSessionIds(options.headers, options.payload, metadata)
    if (explicitId) {
      explicitId = boundSessionIdentity(explicitId)
      if (explicitFallback) explicitFallback = boundSessionIdentity(explicitFallback)
    }
    const namespace = metadataText(metadata, METADATA_KEYS.sessionAffinityProvider) || result.provider
    const modelKey = canonicalModelKey(metadataText(metadata, METADATA_KEYS.sessionAffinityModel) || result.model)
    if (!result.success && result.skipCooldown) return

    // El enlace LCP es independiente del explícito: un éxito refresca la secuencia y un fallo retira sólo la intentada.
    if (!explicitId) this.lcpResult(result, namespace, modelKey, options)
    if (!explicitId && metadata && METADATA_KEYS.lcpAffinitySession in metadata) return

    let [primaryId, fallbackId] = explicitId ? [explicitId, explicitFallback] : extractSessionIds(options.headers, options.payload, metadata)
    if (!primaryId && !fallbackId) return
    if (primaryId) primaryId = boundSessionIdentity(primaryId)
    if (fallbackId) fallbackId = boundSessionIdentity(fallbackId)

    const cacheKey = `${namespace}::${primaryId}::${modelKey}`
    const fallbackKey = fallbackId && fallbackId !== primaryId && !isSubagentSession(primaryId, fallbackId)
      ? `${namespace}::${fallbackId}::${modelKey}`
      : ''
    for (const key of fallbackKey ? [cacheKey, fallbackKey] : [cacheKey]) {
      if (result.success) this.cache.touch(key, result.authId)
      else this.cache.compareAndDelete(key, result.authId)
    }
  }

  private lcpResult(result: SelectionResult, provider: string, modelKey: string, options: PickOptions): void {
    const metadata = options.metadata
    const namespace = lcpAffinityNamespace(provider, modelKey, metadata)
    if (!namespace) return
    let fingerprints = stringList(metadata?.[METADATA_KEYS.lcpFingerprints])
    let minPrefixLength = typeof metadata?.[METADATA_KEYS.lcpMinPrefixLength] === 'number' ? metadata[METADATA_KEYS.lcpMinPrefixLength] as number : 0
    let tailFingerprints = stringList(metadata?.[METADATA_KEYS.lcpTailFingerprints])
    let envDigest = typeof metadata?.[METADATA_KEYS.lcpEnvironmentDigest] === 'string' ? metadata[METADATA_KEYS.lcpEnvironmentDigest] as string : ''
    if (fingerprints.length === 0) {
      const prepared = this.matcher.prepareExt(extractCanonicalTurns(options.sourceFormat ?? '', options.payload) ?? [])
      ;({ fingerprints, minPrefixLength, tailFingerprints, envDigest } = prepared)
    }
    if (fingerprints.length === 0 || minPrefixLength <= 0 || minPrefixLength > fingerprints.length) return
    if (result.success) {
      this.matcher.touchFingerprints(namespace, fingerprints, tailFingerprints, envDigest, minPrefixLength, result.authId)
      return
    }
    const generation = metadata?.[METADATA_KEYS.lcpAccessGeneration]
    this.matcher.removeFingerprintsBefore(namespace, fingerprints, result.authId, typeof generation === 'number' ? generation : 0)
  }

  /**
   * Observa la vinculación de una sesión sin efectos: no elige, no vincula,
   * no revincula y no refresca la caducidad. El filtro deja fuera las
   * credenciales que no correspondan al proveedor pedido.
   */
  lookupAffinity(provider: string, model: string, sessionId: string, authFilter?: (authId: string) => boolean): AffinityLookup {
    provider = provider.trim()
    model = model.trim()
    sessionId = sessionId.trim()
    if (!provider || !model || !sessionId) return { authId: '', status: 'unbound' }
    const modelKey = canonicalModelKey(model) || model
    const providers = provider === 'mixed' ? [provider] : [provider, 'mixed']
    const hasKnownPrefix = CANDIDATE_SESSION_PREFIXES.some(prefix => sessionId.startsWith(prefix))
    const candidates = hasKnownPrefix ? [sessionId] : [sessionId, ...CANDIDATE_SESSION_PREFIXES.map(prefix => prefix + sessionId)]
    const found = new Set<string>()
    for (const namespace of providers) {
      for (const candidate of candidates) {
        const authId = this.cache.get(`${namespace}::${boundSessionIdentity(candidate)}::${modelKey}`)
        if (authId && (!authFilter || authFilter(authId))) found.add(authId)
      }
    }
    for (const candidate of candidates) {
      const lcp = this.matcher.lookupSession(candidate)
      if (!lcp || lcp.authIds.length === 0) continue
      const parsed = parseLcpNamespace(lcp.namespace)
      if (parsed) {
        const otherProvider = provider !== 'mixed' && parsed.provider !== 'mixed' && canonicalLcpProvider(parsed.provider) !== canonicalLcpProvider(provider)
        if (otherProvider || (modelKey !== '' && parsed.model !== modelKey)) continue
      }
      for (const authId of lcp.authIds) if (!authFilter || authFilter(authId)) found.add(authId)
    }
    if (found.size === 0) return { authId: '', status: 'unbound' }
    if (found.size > 1) return { authId: '', status: 'ambiguous' }
    return { authId: [...found][0]!, status: 'bound' }
  }

  /** Retira todas las vinculaciones de una credencial limitada o caída. */
  invalidateAuth(authId: string): void {
    this.cache.invalidateAuth(authId)
    this.matcher.invalidateAuth(authId)
  }

  stop(): void {
    this.cache.stop()
    this.matcher.clear()
  }
}

/** Publica en la metadata la sesión LCP, su padre, su generación y su clase de nodo. */
function publishLcpIdentity(metadata: SessionMetadata, identity: Omit<MerklePrefixBindResult, 'nodeKind'>): void {
  if (identity.sessionId) {
    metadata[METADATA_KEYS.lcpAffinitySession] = identity.sessionId
    metadata[METADATA_KEYS.canonicalSession] = identity.sessionId
  }
  if (identity.parentSessionId) metadata[METADATA_KEYS.parentSession] = identity.parentSessionId
  else delete metadata[METADATA_KEYS.parentSession]
  if (identity.accessNumber > 0) metadata[METADATA_KEYS.lcpAccessGeneration] = identity.accessNumber
  if (identity.isFork) {
    metadata[METADATA_KEYS.isFork] = true
    delete metadata[METADATA_KEYS.isCompaction]
    metadata[METADATA_KEYS.nodeKind] = 'fork'
  } else if (identity.isCompaction) {
    metadata[METADATA_KEYS.isCompaction] = true
    delete metadata[METADATA_KEYS.isFork]
    metadata[METADATA_KEYS.nodeKind] = 'compaction'
  } else {
    delete metadata[METADATA_KEYS.isFork]
    delete metadata[METADATA_KEYS.isCompaction]
    delete metadata[METADATA_KEYS.nodeKind]
  }
}

/** Los textos no vacíos de una lista; lo demás, lista vacía. */
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : []
}

/** Los alias de un mismo proveedor comparten espacio LCP. */
export function canonicalLcpProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase()
  if (['google', 'gemini', 'vertex', 'aistudio'].includes(normalized)) return 'google'
  if (normalized === 'codex' || normalized === 'openai') return 'openai'
  if (normalized === 'claude' || normalized === 'anthropic') return 'claude'
  return normalized
}

/** El espacio LCP: proveedor canónico, modelo sin sufijo y `caller_scope`; sin alcance, ninguno. */
export function lcpAffinityNamespace(provider: string, model: string, metadata: SessionMetadata | undefined): string {
  const canonicalProvider = canonicalLcpProvider(provider)
  const scope = metadataText(metadata, METADATA_KEYS.callerScope)
  if (!canonicalProvider || !scope) return ''
  return ['lcp:v1', canonicalProvider, canonicalModelKey(model), scope].join('::')
}

/** Las partes de un espacio LCP; el modelo puede llevar `::`, el alcance no. */
export function parseLcpNamespace(namespace: string): { provider: string; model: string; callerScope: string } | undefined {
  const prefix = 'lcp:v1::'
  if (!namespace.startsWith(prefix)) return undefined
  const rest = namespace.slice(prefix.length)
  const cut = rest.indexOf('::')
  if (cut === -1) return undefined
  const provider = rest.slice(0, cut)
  const tail = rest.slice(cut + 2)
  const last = tail.lastIndexOf('::')
  if (last === -1) return { provider, model: tail, callerScope: '' }
  return { provider, model: tail.slice(0, last), callerScope: tail.slice(last + 2) }
}

function metadataText(metadata: SessionMetadata | undefined, key: string): string {
  const value = metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Un subagente: lleva `:agent:` o comparte espacio de nombres con su respaldo. */
export function isSubagentSession(primaryId: string, fallbackId: string): boolean {
  if (primaryId.includes(':agent:')) return true
  if (!fallbackId || !primaryId || primaryId === fallbackId) return false
  return isHierarchyParent(primaryId, fallbackId)
}

/** Si `fallback` es el padre de `primary`: mismo prefijo antes de `:`, o ninguno de los dos lo lleva. */
export function isHierarchyParent(primary: string, fallback: string): boolean {
  if (!fallback || !primary || primary === fallback) return false
  if (primary.includes(':agent:')) return true
  const a = primary.indexOf(':')
  const b = fallback.indexOf(':')
  if (a > 0 && b > 0 && primary.slice(0, a) === fallback.slice(0, b)) return true
  return a === -1 && b === -1
}

type Payload = string | JsonObject | undefined

const hasPayload = (payload: Payload) => (typeof payload === 'string' ? payload.length > 0 : payload !== undefined)

/** `CanonicalSessionID`: la identidad de sesión única y acotada de la petición. */
export function canonicalSessionId(headers: SessionHeaders, payload: Payload, metadata: SessionMetadata | undefined): string {
  const [explicitId] = extractExplicitSessionIds(headers, payload, metadata)
  if (explicitId) return boundSessionIdentity(explicitId)
  const canonical = metadataText(metadata, METADATA_KEYS.canonicalSession)
  if (canonical) return boundSessionIdentity(canonical)
  const lcp = metadataText(metadata, METADATA_KEYS.lcpAffinitySession)
  if (lcp) return boundSessionIdentity(lcp)
  return boundSessionIdentity(extractSessionId(headers, payload, metadata))
}

/** `ExtractSessionID`: la sesión primaria, explícita, derivada o por hash de mensajes. */
export function extractSessionId(headers: SessionHeaders, payload: Payload, metadata: SessionMetadata | undefined): string {
  return extractSessionIds(headers, payload, metadata)[0]
}

/**
 * Sólo las identidades que da el cliente o la ejecución, con su respaldo: el
 * padre, o la conversación de un `prompt_cache_key`. Deja en la metadata si
 * la sesión es una bifurcación y quién es su padre.
 */
export function extractExplicitSessionIds(headers: SessionHeaders, payload: Payload, metadata: SessionMetadata | undefined): [string, string] {
  const info = extractSessionInfo(headers, payload, metadata)
  if (!info || info.clientType === 'lcp') return ['', '']
  if (metadata) {
    if (info.isFork) metadata[METADATA_KEYS.isFork] = true
    if (info.parentSessionId) metadata[METADATA_KEYS.parentSession] = info.parentSessionId
  }
  let fallback = info.parentSessionId ?? ''
  if (!fallback && info.sessionId.startsWith('pck:') && hasPayload(payload)) fallback = extractConversationAlias(payload)
  return [info.sessionId, fallback]
}

/** (primaria, respaldo): el respaldo conserva una vinculación anterior cuando aparece una identidad más fuerte. */
export function extractSessionIds(headers: SessionHeaders, payload: Payload, metadata: SessionMetadata | undefined): [string, string] {
  const explicit = extractExplicitSessionIds(headers, payload, metadata)
  if (explicit[0]) return explicit
  const derived = normalizeExplicitId(derivedId(metadata))
  if (derived) return [`derived:${derived}`, '']
  if (!hasPayload(payload)) return ['', '']
  return extractMessageHashIds(parsePayload(payload))
}

function extractConversationAlias(payload: Payload): string {
  const root = parsePayload(payload)
  let conversation = getPath(root, 'conversation')
  if (conversation === undefined) {
    const request = getPath(root, 'request')
    if (request !== undefined && getPath(root, 'contents') === undefined) conversation = getPath(request, 'conversation')
  }
  const byId = normalizeExplicitId(textAt(conversation, 'id'))
  if (byId) return `conv:${byId}`
  if (typeof conversation === 'string') {
    const plain = normalizeExplicitId(conversation)
    if (plain) return `conv:${plain}`
  }
  return ''
}

const encoder = new TextEncoder()
const EMPTY = new Uint8Array()

/** Los primeros 100 bytes: el corte puede partir un carácter, como en la referencia. */
const truncated = (text: string) => encoder.encode(text).subarray(0, MESSAGE_PREFIX_BYTES)

const arrayItems = (value: JsonValue): JsonValue[] => (Array.isArray(value) ? value : [])

/** El texto de un contenido: la cadena, o las partes `text` unidas por espacio. */
function messageContent(content: JsonValue): string {
  if (typeof content === 'string') return content
  return arrayItems(content)
    .filter(part => textAt(part, 'type') === 'text')
    .map(part => textAt(part, 'text'))
    .filter(Boolean)
    .join(' ')
}

/** El texto de un contenido de Responses: las partes de entrada, salida y texto. */
function responsesContent(content: JsonValue): string {
  return arrayItems(content)
    .filter(part => ['input_text', 'output_text', 'text'].includes(textAt(part, 'type')))
    .map(part => textAt(part, 'text'))
    .filter(Boolean)
    .join(' ')
}

type Turn = { system?: Uint8Array; user?: Uint8Array; assistant?: Uint8Array }

function extractMessageHashIds(root: JsonValue): [string, string] {
  const turn: Turn = {}
  const assign = (slot: keyof Turn, text: string) => {
    if (text && !turn[slot]) turn[slot] = truncated(text)
  }
  const firstPartText = (parts: JsonValue) => arrayItems(parts).map(part => textAt(part, 'text')).find(Boolean) ?? ''

  // Messages de OpenAI y del cliente de Messages.
  for (const message of arrayItems(getPath(root, 'messages'))) {
    const content = messageContent(getPath(message, 'content'))
    if (!content) continue
    const role = textAt(message, 'role')
    if (role === 'system' || role === 'user' || role === 'assistant') assign(role, content)
    if (turn.system && turn.user && turn.assistant) break
  }

  // `system` de primer nivel: lista de partes o cadena.
  if (!turn.system) {
    const top = getPath(root, 'system')
    if (Array.isArray(top)) assign('system', firstPartText(top))
    else if (typeof top === 'string') assign('system', top)
  }

  // Gemini.
  if (!turn.system && !turn.user) {
    assign('system', firstPartText(getPath(root, 'systemInstruction.parts')))
    for (const content of arrayItems(getPath(root, 'contents'))) {
      const text = firstPartText(getPath(content, 'parts'))
      const role = textAt(content, 'role')
      if (text && role === 'user') assign('user', text)
      else if (text && role === 'model') assign('assistant', text)
      if (turn.user && turn.assistant) break
    }
  }

  // Responses de OpenAI.
  if (!turn.system && !turn.user) {
    assign('system', textAt(root, 'instructions'))
    for (const item of arrayItems(getPath(root, 'input'))) {
      const type = textAt(item, 'type')
      if (type === 'reasoning' || (type && type !== 'message')) continue
      const role = textAt(item, 'role')
      if (!type && !role) continue
      const content = getPath(item, 'content')
      const text = typeof content === 'string' ? content : responsesContent(content)
      if (!text) continue
      if (role === 'developer' || role === 'system') assign('system', text)
      else if (role === 'user' || role === 'assistant') assign(role, text)
      if (turn.user && turn.assistant) break
    }
  }

  if (!turn.user) return ['', '']
  const short = sessionHash(turn.system ?? EMPTY, turn.user, EMPTY)
  if (!turn.assistant) return [short, '']
  return [sessionHash(turn.system ?? EMPTY, turn.user, turn.assistant), short]
}

const FNV_OFFSET = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const MASK_64 = (1n << 64n) - 1n

function fnv1a64(hash: bigint, bytes: Uint8Array): bigint {
  for (const byte of bytes) hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & MASK_64
  return hash
}

function sessionHash(system: Uint8Array, user: Uint8Array, assistant: Uint8Array): string {
  let hash = FNV_OFFSET
  for (const [label, bytes] of [['sys:', system], ['usr:', user], ['ast:', assistant]] as const) {
    if (bytes.length === 0) continue
    hash = fnv1a64(hash, encoder.encode(label))
    hash = fnv1a64(hash, bytes)
    hash = fnv1a64(hash, encoder.encode('\n'))
  }
  return `msg:${hash.toString(16).padStart(16, '0')}`
}

/** `computeSessionHash`: FNV-1a de 64 bits sobre sistema, usuario y asistente. */
export function computeSessionHash(systemPrompt: string, userMessage: string, assistantMessage: string): string {
  return sessionHash(encoder.encode(systemPrompt), encoder.encode(userMessage), encoder.encode(assistantMessage))
}
