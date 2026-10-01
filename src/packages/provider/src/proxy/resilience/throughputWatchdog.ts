/**
 * Vigilante de caudal de un stream activo — porte de OmniRoute
 * (`open-sse/services/throughputWatchdog.ts`, a58000c7, MIT).
 *
 * A diferencia del plazo de inactividad (ningún chunk), éste decide sólo
 * después de un calentamiento y de una ventana completa, y sólo cuenta como
 * salida útil el texto del asistente: los latidos y los metadatos no cuentan,
 * y las fases de herramienta o de razonamiento suspenden el juicio mientras
 * duran.
 */

export interface ThroughputWatchdogOptions {
  enabled?: boolean
  warmupMs?: number
  windowMs?: number
  minUsefulBytesPerSecond?: number
  minUsefulBytes?: number
  now?: () => number
}

export interface ThroughputWatchdogDecision {
  abort: boolean
  reason?: 'throughput_too_low'
  usefulBytes: number
  rateBytesPerSecond: number
  protectedPhase: boolean
}

export class ThroughputWatchdogError extends Error {
  readonly code = 'STREAM_THROUGHPUT_TOO_LOW'

  constructor(message = 'Upstream stream throughput remained below the configured minimum') {
    super(message)
    this.name = 'ThroughputWatchdogError'
  }
}

type ParsedEvent = { usefulBytes: number; protectedPhase: boolean }

const PROTECTED_TYPE = /(reasoning|thinking|tool|function_call)/i

/** Los bytes de texto útil de un evento SSE, y si abre una fase protegida. */
function parseEvent(event: string): ParsedEvent {
  const lines = event.split(/\r?\n/)
  const eventName = lines
    .find(line => /^event:\s*/i.test(line))
    ?.replace(/^event:\s*/i, '')
    .trim()
  const data = lines
    .filter(line => /^data:\s*/i.test(line))
    .map(line => line.replace(/^data:\s*/i, '').trim())
    .join('\n')
  if (!data || data === '[DONE]') return { usefulBytes: 0, protectedPhase: false }

  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return { usefulBytes: 0, protectedPhase: false }
  }

  const record = payload as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : eventName
  if (type && PROTECTED_TYPE.test(type)) return { usefulBytes: 0, protectedPhase: true }

  const choices = Array.isArray(record.choices) ? record.choices : []
  let useful = ''
  let protectedPhase = false
  for (const choice of choices) {
    const delta = (choice as Record<string, unknown>).delta
    if (!delta || typeof delta !== 'object') continue
    const deltaRecord = delta as Record<string, unknown>
    if (Array.isArray(deltaRecord.tool_calls) || deltaRecord.function_call) protectedPhase = true
    for (const key of ['content', 'text']) {
      if (typeof deltaRecord[key] === 'string') useful += deltaRecord[key] as string
    }
    if (typeof deltaRecord.reasoning_content === 'string' || typeof deltaRecord.reasoning === 'string') {
      protectedPhase = true
    }
  }

  if (typeof record.delta === 'string' && record.delta) useful += record.delta
  const nestedDelta = record.delta
  if (nestedDelta && typeof nestedDelta === 'object') {
    const nested = nestedDelta as Record<string, unknown>
    const nestedType = typeof nested.type === 'string' ? nested.type : ''
    if (PROTECTED_TYPE.test(nestedType)) protectedPhase = true
    if (typeof nested.text === 'string') useful += nested.text
  }
  const contentBlock = record.content_block
  if (contentBlock && typeof contentBlock === 'object') {
    const blockType = (contentBlock as Record<string, unknown>).type
    if (typeof blockType === 'string' && /(reasoning|thinking|tool_use)/i.test(blockType)) {
      protectedPhase = true
    }
  }
  if (protectedPhase) useful = ''
  return {
    usefulBytes: useful ? new TextEncoder().encode(useful).byteLength : 0,
    protectedPhase,
  }
}

export class ThroughputWatchdog {
  private readonly enabled: boolean
  private readonly warmupMs: number
  private readonly windowMs: number
  private readonly minimumRate: number
  private readonly minimumBytes: number
  private readonly now: () => number
  private startedAt: number | null = null
  private buffer = ''
  private readonly decoder = new TextDecoder()
  private samples: Array<{ at: number; bytes: number }> = []
  private protectedPhase = false

  constructor(options: ThroughputWatchdogOptions = {}) {
    this.enabled = options.enabled === true
    this.warmupMs = Math.max(0, Math.floor(options.warmupMs ?? 30_000))
    this.windowMs = Math.max(1, Math.floor(options.windowMs ?? 30_000))
    this.minimumRate = Math.max(0, options.minUsefulBytesPerSecond ?? 1)
    this.minimumBytes = Math.max(1, Math.floor(options.minUsefulBytes ?? 1))
    this.now = options.now ?? (() => Date.now())
  }

  /**
   * Suma el chunk a la ventana y decide. Sólo aborta con la ventana completa
   * tras el calentamiento, fuera de una fase protegida, y con un caudal medible
   * (nada útil, o al menos `minUsefulBytes`) por debajo del mínimo.
   */
  observe(chunk: Uint8Array | string): ThroughputWatchdogDecision {
    const at = this.now()
    if (this.startedAt === null) this.startedAt = at
    if (!this.enabled) return this.decision(false, 0)
    this.buffer += typeof chunk === 'string' ? chunk : this.decoder.decode(chunk, { stream: true })
    const events = this.buffer.split(/\r?\n\r?\n/)
    this.buffer = events.pop() ?? ''
    let useful = 0
    for (const event of events) {
      const parsed = parseEvent(event)
      useful += parsed.usefulBytes
      if (parsed.protectedPhase) this.protectedPhase = true
      if (parsed.usefulBytes > 0) this.protectedPhase = false
    }
    if (useful > 0) this.samples.push({ at, bytes: useful })
    const cutoff = at - this.windowMs
    this.samples = this.samples.filter(sample => sample.at >= cutoff)
    const windowBytes = this.samples.reduce((sum, sample) => sum + sample.bytes, 0)
    const elapsed = at - (this.startedAt ?? at)
    const rate = windowBytes / Math.max(1, this.windowMs / 1000)
    const ready = elapsed >= this.warmupMs + this.windowMs
    const measurable = windowBytes === 0 || windowBytes >= this.minimumBytes
    const abort = ready && !this.protectedPhase && measurable && rate < this.minimumRate
    return this.decision(abort, windowBytes, rate)
  }

  private decision(abort: boolean, usefulBytes: number, rateBytesPerSecond = 0): ThroughputWatchdogDecision {
    return {
      abort,
      reason: abort ? 'throughput_too_low' : undefined,
      usefulBytes,
      rateBytesPerSecond,
      protectedPhase: this.protectedPhase,
    }
  }
}

export function createThroughputWatchdog(options: ThroughputWatchdogOptions = {}): ThroughputWatchdog {
  return new ThroughputWatchdog(options)
}
