/**
 * Compresión del contexto antes de enviarlo, para que una petición no choque
 * con la ventana del modelo — porte de `open-sse/services/contextManager.ts`
 * de OmniRoute (a58000c7, MIT).
 *
 * `compressContext` aplica capas de agresividad creciente y se detiene en la
 * primera que deja la petición dentro del objetivo (la ventana menos una
 * reserva para la respuesta):
 * 1. recorta los resultados de herramienta largos;
 * 2. sustituye las imágenes en línea más antiguas por un aviso;
 * 3. retira el razonamiento de los mensajes de asistente que no son el último;
 * 4. descarta los mensajes más antiguos, conservando el sistema y los pares de
 *    herramienta íntegros.
 *
 * La estimación es de cuatro caracteres por token; una imagen o un documento
 * en línea cuenta como un presupuesto fijo y no por su base64.
 *
 * Divergencias declaradas:
 * - La ventana de un modelo no sale de un registro de proveedores ni de un
 *   catálogo sincronizado: la da `contextWindowOf`, que inyecta quien construye
 *   el proxy. Sin él quedan las variables de entorno, las pistas por nombre de
 *   modelo y los valores por defecto.
 * - Sin los valores por defecto propios de un proveedor (hyperagent) ni el
 *   límite de un combo, que vive con los combos.
 * - Las variables llevan el prefijo de thyrox: `THYROX_CONTEXT_LENGTH_<PROVEEDOR>`,
 *   `THYROX_CONTEXT_LENGTH_DEFAULT`, `THYROX_CONTEXT_RESERVE_TOKENS` y
 *   `THYROX_CONTEXT_KEEP_LATEST_IMAGES`.
 */

type Message = Record<string, unknown>
type Block = Record<string, unknown>

/** La ventana de un modelo, si quien construye el proxy la conoce. */
export type ContextWindowOf = (provider: string, model: string) => number | undefined

const DEFAULT_LIMITS: Record<string, number> = {
  claude: 200_000,
  openai: 128_000,
  gemini: 1_000_000,
  codex: 400_000,
  default: 128_000,
}

const CHARS_PER_TOKEN = 4
/** Presupuesto fijo por imagen en línea, en vez de medir su base64 como texto. */
const IMAGE_TOKEN_ESTIMATE = 1200
/** El mismo presupuesto para un documento en línea: un PDF en forma `inlineData` ya se mide así. */
const DOCUMENT_TOKEN_ESTIMATE = IMAGE_TOKEN_ESTIMATE
const DEFAULT_KEEP_LATEST_IMAGES = 2
const IMAGE_REMOVED_PLACEHOLDER = '[Earlier image removed to fit context window]'
const TOOL_RESULT_MAX_CHARS = 2000
const TRUNCATED_SUFFIX = '\n... [truncated]'
// Sin la cuenta de mensajes retirados: el aviso va en el mensaje 0 y un texto
// que cambia en cada petición rompería la caché de prefijo del upstream.
const DROPPED_NOTICE = '[Context compressed: earlier messages removed to fit context window]'

function positiveEnv(name: string, allowZero = false): number | null {
  const value = process.env[name]
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) || parsed < (allowZero ? 0 : 1) ? null : parsed
}

function envLimit(provider: string): number | null {
  return positiveEnv(`THYROX_CONTEXT_LENGTH_${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`)
    ?? positiveEnv('THYROX_CONTEXT_LENGTH_DEFAULT')
}

// ─── Imágenes y documentos en línea ─────────────────────────────────────────

const INLINE_BASE64_IMAGE = /^data:image\/[a-zA-Z0-9.+-]+;base64,/
const INLINE_BASE64_DATA = /^data:[^;,]+;base64,/

const isInlineImageUrl = (value: unknown) => typeof value === 'string' && INLINE_BASE64_IMAGE.test(value)
const isInlineDataUrl = (value: unknown) => typeof value === 'string' && INLINE_BASE64_DATA.test(value)
const record = (value: unknown): Block | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Block) : null

/** Chat de OpenAI e `input_image` de Responses: `image_url` como cadena o como `{ url }`. */
function isOpenAIImageUrl(node: Block): boolean {
  return isInlineImageUrl(node.image_url) || isInlineImageUrl(record(node.image_url)?.url)
}

/** AI SDK: `{ type: 'image', image: 'data:…' }`. */
const isAiSdkImage = (node: Block) => node.type === 'image' && isInlineImageUrl(node.image)

/** Anthropic: `{ type: 'image' | 'document', source: { type: 'base64', data } }`. */
function isAnthropicBase64Source(node: Block, type: string): boolean {
  const source = record(node.source)
  return node.type === type && source?.type === 'base64' && typeof source.data === 'string'
}

/** Gemini: `{ inlineData | inline_data: { data } }`. */
function isGeminiInlineData(node: Block): boolean {
  return typeof record(node.inlineData ?? node.inline_data)?.data === 'string'
}

/** Chat de OpenAI `{ type: 'file', file: { file_data | data } }` y Responses `{ type: 'input_file', file_data }`. */
function isOpenAIFile(node: Block): boolean {
  if (node.type === 'input_file') return isInlineDataUrl(node.file_data)
  const file = record(node.file)
  return node.type === 'file' && !!file && (isInlineDataUrl(file.file_data) || isInlineDataUrl(file.data))
}

/**
 * Un documento en línea. Va aparte de la imagen: la imagen también decide qué
 * se poda, y retirar un PDF adjunto no es lo mismo que retirar una captura
 * vieja. Éste sólo alimenta la estimación.
 */
export function isInlineBase64DocumentBlock(node: Block): boolean {
  return isOpenAIFile(node) || isAnthropicBase64Source(node, 'document')
}

/** Una imagen en línea en cualquiera de sus formas. */
export function isInlineBase64ImageBlock(node: Block): boolean {
  return isOpenAIImageUrl(node) || isAiSdkImage(node) || isAnthropicBase64Source(node, 'image') || isGeminiInlineData(node)
}

function imagePlaceholder(block: Block): Block {
  // Una parte de Responses sigue siendo de Responses.
  if (block.type === 'input_image') return { type: 'input_text', text: IMAGE_REMOVED_PLACEHOLDER }
  if (block.inlineData || block.inline_data) return { text: IMAGE_REMOVED_PLACEHOLDER }
  return { type: 'text', text: IMAGE_REMOVED_PLACEHOLDER }
}

/**
 * Sustituye por un aviso las imágenes en línea más antiguas y conserva las
 * `keepLatest` más recientes. Con `targetTokens`, para en cuanto cabe.
 */
export function pruneOlderInlineImages(
  messages: Message[],
  options: { keepLatest?: number; targetTokens?: number } = {},
): { messages: Message[]; pruned: number } {
  const keepLatest = options.keepLatest ?? positiveEnv('THYROX_CONTEXT_KEEP_LATEST_IMAGES', true) ?? DEFAULT_KEEP_LATEST_IMAGES
  const locations: { message: number; part: number }[] = []
  messages.forEach((message, m) => {
    if (!Array.isArray(message?.content)) return
    message.content.forEach((part, p) => {
      const block = record(part)
      if (block && isInlineBase64ImageBlock(block)) locations.push({ message: m, part: p })
    })
  })
  if (locations.length <= keepLatest) return { messages, pruned: 0 }

  const next = messages.map(message => (Array.isArray(message.content) ? { ...message, content: [...message.content] } : message))
  let pruned = 0
  for (const location of locations.slice(0, locations.length - keepLatest)) {
    if (options.targetTokens != null && estimateTokens(next) <= options.targetTokens) break
    const content = next[location.message]!.content as unknown[]
    content[location.part] = imagePlaceholder(content[location.part] as Block)
    pruned += 1
  }
  return { messages: next, pruned }
}

/**
 * Recorre la estructura y cambia cada imagen o documento en línea por un
 * marcador corto, sumando su presupuesto fijo. Lo demás se mide después como
 * texto. Tolera ciclos.
 */
function extractMediaTokens(node: unknown, seen: Set<unknown>): { node: unknown; tokens: number } {
  if (node === null || typeof node !== 'object' || seen.has(node)) return { node, tokens: 0 }
  seen.add(node)
  const media = record(node)
  if (media && isInlineBase64ImageBlock(media)) return { node: { __image_token_estimate__: IMAGE_TOKEN_ESTIMATE }, tokens: IMAGE_TOKEN_ESTIMATE }
  if (media && isInlineBase64DocumentBlock(media)) return { node: { __document_token_estimate__: DOCUMENT_TOKEN_ESTIMATE }, tokens: DOCUMENT_TOKEN_ESTIMATE }
  let tokens = 0
  if (Array.isArray(node)) {
    const out = node.map(item => {
      const result = extractMediaTokens(item, seen)
      tokens += result.tokens
      return result.node
    })
    return { node: out, tokens }
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    const result = extractMediaTokens(value, seen)
    out[key] = result.node
    tokens += result.tokens
  }
  return { node: out, tokens }
}

/** Tokens estimados: cuatro caracteres por token, y cada imagen o documento en línea a presupuesto fijo. */
export function estimateTokens(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'string') return Math.ceil(value.length / CHARS_PER_TOKEN)
  const { node, tokens } = extractMediaTokens(value, new Set())
  return Math.ceil((JSON.stringify(node)?.length ?? 0) / CHARS_PER_TOKEN) + tokens
}

// ─── Ventana del modelo ──────────────────────────────────────────────────────

/**
 * La ventana y si salió de una fuente propia del proveedor o del modelo
 * (`specific`) o sólo del valor genérico. El orden: entorno, la ventana
 * inyectada, la pista por nombre de modelo, el valor del proveedor y el
 * genérico.
 */
export function resolveTokenLimit(provider: string, model: string | null = null, contextWindowOf?: ContextWindowOf): { limit: number; specific: boolean } {
  const fromEnv = envLimit(provider)
  if (fromEnv) return { limit: fromEnv, specific: true }
  if (model) {
    const injected = contextWindowOf?.(provider, model)
    if (injected && injected > 0) return { limit: injected, specific: true }
    const lower = model.toLowerCase()
    if (lower.includes('claude')) return { limit: DEFAULT_LIMITS.claude!, specific: true }
    if (lower.includes('gemini')) return { limit: DEFAULT_LIMITS.gemini!, specific: true }
    if (['gpt', 'o1', 'o3', 'o4', 'codex'].some(hint => lower.includes(hint))) return { limit: DEFAULT_LIMITS.codex!, specific: true }
  }
  const byProvider = DEFAULT_LIMITS[provider]
  return byProvider ? { limit: byProvider, specific: true } : { limit: DEFAULT_LIMITS.default!, specific: false }
}

export function getTokenLimit(provider: string, model: string | null = null, contextWindowOf?: ContextWindowOf): number {
  return resolveTokenLimit(provider, model, contextWindowOf).limit
}

// ─── Compresión ──────────────────────────────────────────────────────────────

export type CompressOptions = {
  provider?: string
  model?: string
  maxTokens?: number
  reserveTokens?: number
  keepLatestImages?: number
  contextWindowOf?: ContextWindowOf
}

export type CompressStats = { original?: number; final?: number; layers?: { name: string; tokens: number }[] }

export function compressContext<T extends Record<string, unknown> | null | undefined>(
  body: T,
  options: CompressOptions = {},
): { body: T; compressed: boolean; stats: CompressStats } {
  if (!body || !Array.isArray(body.messages)) return { body, compressed: false, stats: {} }
  const maxTokens = options.maxTokens
    || getTokenLimit(options.provider || 'default', (body.model as string) || options.model || null, options.contextWindowOf)
  const defaultReserve = Math.min(16_000, Math.max(256, Math.floor(maxTokens * 0.15)))
  const reserve = Math.min(options.reserveTokens ?? positiveEnv('THYROX_CONTEXT_RESERVE_TOKENS') ?? defaultReserve, Math.max(0, maxTokens - 1))
  const target = Math.max(0, maxTokens - reserve)

  let messages = [...(body.messages as Message[])]
  let tokens = estimateTokens(messages)
  if (tokens <= target) return { body, compressed: false, stats: { original: tokens, final: tokens } }
  const stats = { original: tokens, layers: [] as { name: string; tokens: number }[] }
  const done = () => ({ body: { ...body, messages } as T, compressed: true, stats: { ...stats, final: tokens } })
  const measure = (name: string) => {
    tokens = estimateTokens(messages)
    stats.layers.push({ name, tokens })
    return tokens <= target
  }

  messages = trimToolMessages(messages, TOOL_RESULT_MAX_CHARS)
  if (measure('trim_tools')) return done()

  const images = pruneOlderInlineImages(messages, { keepLatest: options.keepLatestImages, targetTokens: target })
  if (images.pruned > 0) {
    messages = images.messages
    if (measure('prune_images')) return done()
  }

  messages = compressThinking(messages)
  if (measure('compress_thinking')) return done()

  messages = purifyHistory(messages, target)
  measure('purify_history')
  return done()
}

function truncate(text: string, maxChars: number): string {
  return text.slice(0, maxChars) + TRUNCATED_SUFFIX
}

/** Recorta cada resultado de herramienta: el mensaje `tool` de OpenAI y el bloque `tool_result` de Anthropic. */
function trimToolMessages(messages: Message[], maxChars: number): Message[] {
  return messages.map(message => {
    if (message.role === 'tool' && typeof message.content === 'string' && message.content.length > maxChars) {
      return { ...message, content: truncate(message.content, maxChars) }
    }
    if (message.role !== 'user' || !Array.isArray(message.content)) return message
    return {
      ...message,
      content: message.content.map((block: Block) =>
        block.type === 'tool_result' && typeof block.content === 'string' && block.content.length > maxChars
          ? { ...block, content: truncate(block.content, maxChars) }
          : block),
    }
  })
}

/**
 * Retira los bloques de razonamiento de todo asistente salvo el último. Las
 * etiquetas de razonamiento dentro de un texto son parte del protocolo del
 * prompt y se conservan.
 */
function compressThinking(messages: Message[]): Message[] {
  const last = messages.findLastIndex(message => message.role === 'assistant')
  return messages.map((message, i) => {
    if (message.role !== 'assistant' || i === last || !Array.isArray(message.content)) return message
    const kept = message.content.filter((block: Block) => block.type !== 'thinking')
    return { ...message, content: kept.length === 0 ? '[thinking compressed]' : kept }
  })
}

const isSystem = (message: Message) => message.role === 'system' || message.role === 'developer'

/** Los pares de herramienta rehechos tras recortar: la adyacencia puede dejar resultados huérfanos. */
function repairToolPairs(messages: Message[]): Message[] {
  return stripTrailingAssistantOrphanToolUse(fixToolPairs(fixToolAdjacency(fixToolPairs(messages))))
}

/**
 * Conserva el sistema y los últimos mensajes: cada vuelta retira el 30 % más
 * antiguo hasta caber, sin bajar de dos. Si se retiró algo, el aviso va dentro
 * del primer mensaje de sistema, o como un único mensaje de sistema al
 * principio: varias pasarelas rechazan uno de sistema fuera de la posición 0.
 */
function purifyHistory(messages: Message[], target: number): Message[] {
  const system = messages.filter(isSystem)
  const rest = messages.filter(message => !isSystem(message))
  let keep = rest.length
  while (keep > 2 && estimateTokens(repairToolPairs([...system, ...rest.slice(-keep)])) > target) {
    keep = Math.max(2, Math.floor(keep * 0.7))
  }
  const result = repairToolPairs([...system, ...rest.slice(-keep)])
  if (keep >= rest.length) return result

  const first = result[0]
  if (!first || !isSystem(first)) return [{ role: 'system', content: DROPPED_NOTICE }, ...result]
  const content = first.content
  result[0] = {
    ...first,
    content: typeof content === 'string'
      ? (content ? `${DROPPED_NOTICE}\n${content}` : DROPPED_NOTICE)
      : Array.isArray(content) ? [{ type: 'text', text: DROPPED_NOTICE }, ...content] : DROPPED_NOTICE,
  }
  return result
}

// ─── Integridad de los pares de herramienta ─────────────────────────────────

function hasBody(message: Message): boolean {
  const content = message.content
  const hasContent = typeof content === 'string' ? content.trim().length > 0 : Array.isArray(content) && content.length > 0
  return hasContent || (Array.isArray(message.tool_calls) && message.tool_calls.length > 0)
}

/** Los ids de los resultados de herramienta de un mensaje. */
function toolResultIdsOf(message: Message): string[] {
  if (message.role === 'tool' && message.tool_call_id) return [String(message.tool_call_id)]
  if (message.role !== 'user' || !Array.isArray(message.content)) return []
  return message.content.filter((b: Block) => b.type === 'tool_result' && b.tool_use_id).map((b: Block) => String(b.tool_use_id))
}

/** Un asistente sin las llamadas cuyo id no esté en `keep`; `undefined` si no cambió. */
function withoutToolCalls(message: Message, keep: (id: string) => boolean): Message | undefined {
  let changed = false
  const next: Message = { ...message }
  if (Array.isArray(next.tool_calls)) {
    const calls = next.tool_calls.filter((call: Block) => !call.id || keep(String(call.id)))
    if (calls.length !== next.tool_calls.length) { next.tool_calls = calls; changed = true }
  }
  if (Array.isArray(next.content)) {
    const blocks = next.content.filter((block: Block) => block.type !== 'tool_use' || !block.id || keep(String(block.id)))
    if (blocks.length !== next.content.length) { next.content = blocks; changed = true }
  }
  return changed ? next : undefined
}

/**
 * Retira las llamadas a herramienta sin resultado y los resultados sin
 * llamada, que el upstream rechaza. Una llamada del último mensaje se
 * conserva: su resultado aún está por llegar.
 */
export function fixToolPairs(messages: Message[]): Message[] {
  const resultIds = new Set(messages.flatMap(toolResultIdsOf))
  const pruned = messages.map((message, i) =>
    message.role === 'assistant' && i !== messages.length - 1 ? withoutToolCalls(message, id => resultIds.has(id)) ?? message : message)

  const callIds = new Set<string>()
  for (const message of pruned) {
    if (message.role !== 'assistant') continue
    for (const call of Array.isArray(message.tool_calls) ? message.tool_calls : []) if (call.id) callIds.add(String(call.id))
    for (const block of Array.isArray(message.content) ? message.content : []) if (block.type === 'tool_use' && block.id) callIds.add(String(block.id))
  }

  const result: Message[] = []
  for (const message of pruned) {
    if (message.role === 'tool' && message.tool_call_id && !callIds.has(String(message.tool_call_id))) continue
    if (message.role === 'user' && Array.isArray(message.content)) {
      const blocks = message.content.filter((b: Block) => b.type !== 'tool_result' || !b.tool_use_id || callIds.has(String(b.tool_use_id)))
      if (blocks.length !== message.content.length) {
        if (blocks.length > 0) result.push({ ...message, content: blocks })
        continue
      }
    }
    if (message.role === 'assistant' && !hasBody(message)) continue
    result.push(message)
  }
  return result
}

/**
 * Anthropic exige el resultado en el mensaje INMEDIATAMENTE siguiente a la
 * llamada, no en cualquier punto posterior. Retira las llamadas cuyo resultado
 * no está en el mensaje siguiente.
 */
export function fixToolAdjacency(messages: Message[]): Message[] {
  if (messages.length <= 1) return messages
  const result: Message[] = []
  messages.forEach((message, i) => {
    const next = messages[i + 1]
    if (message.role !== 'assistant' || !next) { result.push(message); return }
    const adjacent = new Set(toolResultIdsOf(next))
    const changed = withoutToolCalls(message, id => adjacent.has(id))
    if (!changed) result.push(message)
    else if (hasBody(changed)) result.push(changed)
  })
  return result
}

/**
 * En el envío al upstream la petición no puede terminar en un asistente con
 * llamadas a herramienta: su resultado no existe. Se retiran esas llamadas, y
 * el mensaje si queda vacío.
 */
export function stripTrailingAssistantOrphanToolUse(messages: Message[]): Message[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'assistant') return messages
  const changed = withoutToolCalls(last, () => false)
  if (!changed) return messages
  return hasBody(changed) ? [...messages.slice(0, -1), changed] : messages.slice(0, -1)
}

/** Los proveedores que exigen que el último mensaje sea de usuario o de herramienta. */
const PROVIDERS_REQUIRING_USER_LAST_MESSAGE = new Set(['mistral'])

/**
 * Retira un asistente final de sólo texto para los proveedores que lo exigen.
 * Va después de `stripTrailingAssistantOrphanToolUse`, que ya quitó las llamadas.
 */
export function stripTrailingAssistantForProvider(messages: Message[], provider: string): Message[] {
  if (!PROVIDERS_REQUIRING_USER_LAST_MESSAGE.has(provider) || !Array.isArray(messages) || messages.length === 0) return messages
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'assistant') return messages
  const hasToolUse = Array.isArray(last.content) && last.content.some((b: Block) => b.type === 'tool_use')
  const hasToolCalls = Array.isArray(last.tool_calls) && last.tool_calls.length > 0
  return hasToolUse || hasToolCalls ? messages : messages.slice(0, -1)
}
