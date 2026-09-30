/**
 * El guardián de bucles entre pares: cuánto puede enviar un remitente por
 * segundo, si repite el mismo cuerpo, y si la cadena de saltos delata un
 * reenvío circular o demasiado largo. También lleva el aviso agrupado de lo
 * descartado y el token propio con que una sesión reconoce sus propios
 * saltos.
 *
 * Porte de `csn`, `LRr`, `Cko`, `NRr`, `$Rr`, `GOt`, `FRr`, `Rko`, `URr` y
 * `zOt` (`chunk-qcy58j4w.js`) de 2.1.283, con `H`/`M`/`B`/`_e` como internos
 * compartidos con `ie` (el ritmo de salida, en `udsClient.ts`). `x`/`rF`
 * (`chunk-t6pwageh.js`) ya viven portados como
 * `getFeatureValue_CACHED_MAY_BE_STALE`/`getFeatureValue_CACHED_WITH_REFRESH`;
 * `t` (`chunk-zkn0228z.js`) es `logForDebugging`; `p` (`chunk-d09a8ccq.js`)
 * es `reportFeatureSad`; `lFt` (`chunk-q8a07cv0.js`) es `MAX_HOP_CHAIN`, ya
 * en `peerEnvelope.ts`.
 *
 * Divergencia declarada: `zOt` valida su configuración remota con un esquema
 * zod (`k`/`u`, `chunk-dk5kbfrn.js`, la biblioteca entera vendorizada en ese
 * chunk). `@thyrox/local-observability` no depende de `zod` y no se le añade
 * la dependencia sólo por esto — se valida cada campo a mano, con el mismo
 * contrato por campo que un `.min().max().catch(default)`: fuera de rango o
 * de tipo, cae al valor por omisión de ESE campo, no del objeto entero.
 *
 * `P` (`chunk-vq0drrah.js`, pluralizar por conteo) no tenía porte propio
 * accesible desde aquí: existe como función privada equivalente en
 * `@thyrox/permission: permissions.ts` (`pluralize`), pero ese paquete no es
 * una dependencia de éste y el símbolo no se exporta — se repite aquí como
 * lo que es, una función pura de una línea.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE, getFeatureValue_CACHED_WITH_REFRESH } from '@thyrox/config/feature-flags'
import { sleep } from '@thyrox/config/sleep'
import { randomBytes } from 'node:crypto'

import { logForDebugging } from '../debug.ts'
import { reportFeatureSad } from './featureTelemetry.ts'
import { hopId, slugifyName, MAX_HOP_CHAIN } from './peerEnvelope.ts'
import { isBareAddress } from './peerAddress.ts'
import { messagingState, type OutboundPacer, type PeerDrop } from './messagingState.ts'
import type { DropReason } from './peerMessageStatus.ts'

/** `P`: singular o plural según el conteo; repetido, ver divergencia de cabecera. */
function pluralize(count: number, singular: string, pluralForm: string = `${singular}s`): string {
  return count === 1 ? singular : pluralForm
}

/** `H`: LRU con tope de tamaño y un desalojo elegido por predicado, o el más viejo si ninguno cumple. */
function lruGetOrCreate<K, V>(map: Map<K, V>, key: K, maxSize: number, create: () => V, canEvict: (value: V) => boolean = () => true): V {
  const existing = map.get(key)
  if (existing !== undefined) {
    map.delete(key)
    map.set(key, existing)
    return existing
  }
  while (map.size >= Math.max(1, maxSize)) {
    let victim: K | undefined
    for (const [candidateKey, candidateValue] of map) {
      if (canEvict(candidateValue)) {
        victim = candidateKey
        break
      }
    }
    victim ??= map.keys().next().value
    if (victim === undefined) break
    map.delete(victim)
  }
  const created = create()
  map.set(key, created)
  return created
}

/** `M`: los tokens tras rellenar linealmente entre `lastRefill` y `now`, sin pasar de `capacity`. */
export function refillTokens(tokens: number, lastRefill: number, now: number, capacity: number, refillPerSecond: number): number {
  const elapsedSeconds = Math.max(0, now - lastRefill) / 1000
  return Math.min(capacity, tokens + elapsedSeconds * refillPerSecond)
}

/** `B`: si quedan tokens para admitir un envío más. */
function hasToken(tokens: number): boolean {
  return tokens >= 1
}

export type PeerLoopGuardLimits = {
  bucketCapacity: number
  refillPerSecond: number
  dedupWindowMs: number
  maxSelfHops: number
  maxChainLength: number
  maxTrackedSenders: number
}

/** `csn`. */
export const DEFAULT_PEER_LOOP_GUARD_LIMITS: PeerLoopGuardLimits = {
  bucketCapacity: 30,
  refillPerSecond: 0.5,
  dedupWindowMs: 30000,
  maxSelfHops: 10,
  maxChainLength: 28,
  maxTrackedSenders: 256,
}

/** `_e`: cuántos saltos de `hopChain` son tokens propios ya vistos. */
function countSelfHops(hopChain: readonly string[] | undefined, ownTokens: ReadonlySet<string>): number {
  if (!hopChain || ownTokens.size === 0) return 0
  let count = 0
  for (const hop of hopChain) if (ownTokens.has(hop)) count++
  return count
}

type SenderBucket = { tokens: number; lastRefill: number; lastBody: string | undefined; lastBodyAt: number }

export type PeerLoopGuardMessage = {
  senderKey: string
  body: string
  hopChain?: readonly string[]
  ownTokens?: ReadonlySet<string>
}

export type PeerLoopGuardVerdict = { admitted: true } | { admitted: false; reason: DropReason }

export type PeerLoopGuard = {
  admit(message: PeerLoopGuardMessage): PeerLoopGuardVerdict
  checkHopChain(hopChain: readonly string[] | undefined, ownTokens: ReadonlySet<string> | undefined): PeerLoopGuardVerdict | undefined
  trackedSenderCount(): number
}

/** `LRr`: admite o rechaza un mensaje entrante de un par, por ritmo, duplicado o cadena de saltos. */
export function createPeerLoopGuard(
  overrides: Partial<PeerLoopGuardLimits> & { now?: () => number } = {},
  liveOverrides?: () => Partial<PeerLoopGuardLimits>,
): PeerLoopGuard {
  const base: PeerLoopGuardLimits & { now: () => number } = { ...DEFAULT_PEER_LOOP_GUARD_LIMITS, now: () => Date.now(), ...overrides }
  const limits = (): PeerLoopGuardLimits & { now: () => number } => (liveOverrides ? { ...base, ...liveOverrides() } : base)
  const buckets = new Map<string, SenderBucket>()

  function bucketFor(senderKey: string, current: PeerLoopGuardLimits & { now: () => number }): SenderBucket {
    return lruGetOrCreate(buckets, senderKey, current.maxTrackedSenders, () => ({ tokens: current.bucketCapacity, lastRefill: current.now(), lastBody: undefined, lastBodyAt: 0 }))
  }

  function checkHopChain(hopChain: readonly string[] | undefined, ownTokens: ReadonlySet<string> | undefined): PeerLoopGuardVerdict | undefined {
    const current = limits()
    if (hopChain !== undefined && hopChain.length > current.maxChainLength) return { admitted: false, reason: 'hop-runaway' }
    if (countSelfHops(hopChain, ownTokens ?? new Set()) >= current.maxSelfHops) return { admitted: false, reason: 'hop-loop' }
    return undefined
  }

  function admit(message: PeerLoopGuardMessage): PeerLoopGuardVerdict {
    const current = limits()
    const now = current.now()
    const hopVerdict = checkHopChain(message.hopChain, message.ownTokens)
    if (hopVerdict) return hopVerdict
    const bucket = bucketFor(message.senderKey, current)
    if (bucket.lastBody !== undefined && bucket.lastBody === message.body && now - bucket.lastBodyAt < current.dedupWindowMs) {
      return { admitted: false, reason: 'duplicate' }
    }
    bucket.tokens = refillTokens(bucket.tokens, bucket.lastRefill, now, current.bucketCapacity, current.refillPerSecond)
    bucket.lastRefill = now
    if (!hasToken(bucket.tokens)) return { admitted: false, reason: 'rate-limited' }
    bucket.tokens -= 1
    bucket.lastBody = message.body
    bucket.lastBodyAt = now
    return { admitted: true }
  }

  return { admit, checkHopChain, trackedSenderCount: () => buckets.size }
}

const KNOWN_DROP_REASONS: ReadonlySet<string> = new Set(['rate-limited', 'duplicate', 'hop-loop', 'hop-runaway', 'queue-full'])

/** `Cko`: el motivo de descarte tal cual, si es de los reconocidos. */
export function asKnownDropReason(value: unknown): DropReason | undefined {
  return typeof value === 'string' && KNOWN_DROP_REASONS.has(value) ? (value as DropReason) : undefined
}

/** `NRr`: cuántos ids de mensaje agrupa un aviso de descarte pendiente. */
export const MAX_TRACKED_DROP_MESSAGE_IDS = 256
const REPORT_WINDOW_MS = 60000
const MAX_TRACKED_ENTRIES = 256
const MAX_DROP_REPORTS_PER_WINDOW = 20
const MAX_FLUSH_ADMISSIONS_PER_WINDOW = 40
const DEFAULT_FLUSH_RECEIPTS_TIMEOUT_MS = 500
const DEFAULT_RECEIPT_TRAIL_MS = 5000

/** `$Rr`: fija el token de salto propio, enmascarado con la clave de este proceso. */
export function setOwnUdsHopToken(rawToken: string | undefined): void {
  messagingState().ingress.ownUdsHopToken = rawToken === undefined ? undefined : ownHopMask(rawToken)
}

/** `GOt`: fija cómo resolver la dirección propia del puente, para enmascararla al pedir los saltos propios. */
export function setOwnBridgePeerAddressResolver(resolver: (() => string | undefined) | undefined): void {
  messagingState().ingress.ownBridgePeerAddressResolver = resolver
}

/** `dLe`: enmascara un texto con la clave aleatoria de este proceso, vía `hopId`. */
const OWN_HOP_KEY = randomBytes(32).toString('hex')
export function ownHopMask(text: string): string {
  return hopId(text, OWN_HOP_KEY)
}

/** `Dae`: si esta sesión corre en un entorno remoto, el destino de puente que ese entorno declara.
 *
 * Divergencia declarada: la referencia, además, traduce el id entre sus dos
 * formas `cse_*`/`session_*` con una compuerta de activación (`Wc`,
 * `cseShimGate`, `chunk-2vygpg3s.js`) — un subsistema de sesiones en la nube
 * ajeno al alcance de UDS C y sin porte en este árbol. Aquí sólo se valida
 * la forma del id y se devuelve tal cual.
 */
const REMOTE_SESSION_ID = /^(?:session|cse)_[a-zA-Z0-9_-]+$/
export function remoteEnvironmentBridgeTarget(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.THYROX_CODE_REMOTE !== 'true') return undefined
  const sessionId = env.THYROX_CODE_REMOTE_SESSION_ID ?? ''
  return REMOTE_SESSION_ID.test(sessionId) ? sessionId : undefined
}

/** `FRr`: los saltos propios enmascarados — el token de par y, si hay, el del puente propio. */
export function ownAddressHopIds(): Set<string> {
  const { ownUdsHopToken, ownBridgePeerAddressResolver } = messagingState().ingress
  const ids = new Set<string>()
  if (ownUdsHopToken) ids.add(ownUdsHopToken)
  const bridgeAddress = ownBridgePeerAddressResolver?.()
  if (bridgeAddress) ids.add(ownHopMask(bridgeAddress))
  const remoteTarget = remoteEnvironmentBridgeTarget()
  if (remoteTarget) ids.add(ownHopMask(`bridge:${encodeURIComponent(remoteTarget)}`))
  return ids
}

const DROP_REASON_TEXT: Record<Exclude<DropReason, 'queue-full'>, string> = {
  'rate-limited': 'sender exceeded the peer message rate limit',
  duplicate: 'identical to the previous message from this sender',
  'hop-loop': 'message has already passed through this session (a peer messaging loop)',
  'hop-runaway': 'peer relay chain is too long (runaway forwarding)',
}

/** `X`: de dónde vino un mensaje descartado, saneado para mostrarse. */
function sanitizedDropOrigin(drop: Pick<PeerDrop, 'from' | 'name'>): { from: string; name: string } {
  return { from: isBareAddress(drop.from) ? drop.from : '(unrenderable sender address)', name: drop.name ? slugifyName(drop.name) : '' }
}

/** `Rko`: la línea de aviso de un mensaje descartado. */
export function describeDroppedPeerMessage(drop: PeerDrop): string {
  const { from, name } = sanitizedDropOrigin(drop)
  const label = name ? `@${name} (${from})` : from
  const suppressed = drop.suppressed > 0 ? ` (+${drop.suppressed} similar ${pluralize(drop.suppressed, 'drop')} suppressed)` : ''
  const reasonText = drop.reason === 'queue-full' ? 'this session has too many undelivered peer messages queued' : (DROP_REASON_TEXT as Record<string, string>)[drop.reason]
  return `Dropped a peer message from ${label}: ${reasonText}.${suppressed}`
}

type ReceiptBucket = {
  lastImmediateAt: number
  pendingIds: string[]
  pending: number
  timer: ReturnType<typeof setTimeout> | undefined
  pendingSend: ((ids: string[]) => unknown) | undefined
}

export type PeerDropReporter = {
  report(drop: PeerDrop, now?: number): void
  noteDropForReceipt(senderKey: string, messageId: string | undefined, flush: (messageIds: string[]) => unknown, now?: number): void
  flushPendingReceipts(timeoutMs?: number): Promise<void>
  dispose(): void
}

/** `URr`: agrupa recibos de descarte por remitente y avisos de descarte por (remitente, motivo). */
export function createPeerDropReporter({ trailMs = DEFAULT_RECEIPT_TRAIL_MS }: { trailMs?: number } = {}): PeerDropReporter {
  const buckets = new Map<string, ReceiptBucket>()
  let flushWindowStart = 0
  let flushAdmittedInWindow = 0

  function admitFlush(now: number = Date.now()): boolean {
    if (now - flushWindowStart >= REPORT_WINDOW_MS) {
      flushWindowStart = now
      flushAdmittedInWindow = 0
    }
    if (flushAdmittedInWindow >= MAX_FLUSH_ADMISSIONS_PER_WINDOW) return false
    flushAdmittedInWindow++
    return true
  }

  function flushBucket(bucket: ReceiptBucket, admit: () => boolean): unknown {
    if (bucket.timer !== undefined) {
      clearTimeout(bucket.timer)
      bucket.timer = undefined
    }
    const { pending, pendingIds, pendingSend } = bucket
    bucket.pending = 0
    bucket.pendingIds = []
    bucket.pendingSend = undefined
    if (pending > 0 && pendingSend && admit()) return pendingSend(pendingIds)
    return undefined
  }

  function noteDropForReceipt(senderKey: string, messageId: string | undefined, flush: (ids: string[]) => unknown, now: number = Date.now()): void {
    let bucket = buckets.get(senderKey)
    if (bucket === undefined) bucket = { lastImmediateAt: Number.NEGATIVE_INFINITY, pendingIds: [], pending: 0, timer: undefined, pendingSend: undefined }
    buckets.delete(senderKey)
    buckets.set(senderKey, bucket)
    if (buckets.size > MAX_TRACKED_ENTRIES) {
      const oldestKey = buckets.keys().next().value
      if (oldestKey !== undefined && oldestKey !== senderKey) {
        const oldest = buckets.get(oldestKey)
        buckets.delete(oldestKey)
        if (oldest !== undefined) flushBucket(oldest, () => admitFlush(now))
      }
    }
    if (now - bucket.lastImmediateAt >= REPORT_WINDOW_MS && bucket.pending === 0) {
      bucket.lastImmediateAt = now
      if (admitFlush(now)) flush([])
      return
    }
    bucket.pending++
    if (messageId !== undefined && bucket.pendingIds.length < MAX_TRACKED_DROP_MESSAGE_IDS) bucket.pendingIds.push(messageId)
    bucket.pendingSend = flush
    if (bucket.timer === undefined) {
      const capturedBucket = bucket
      bucket.timer = setTimeout(() => flushBucket(capturedBucket, () => admitFlush()), trailMs)
      bucket.timer.unref?.()
    }
  }

  const reportKeys = new Map<string, { lastReportAt: number; suppressed: number }>()
  let reportWindowStart = 0
  let reportsInWindow = 0
  let overflowSuppressed = 0

  function report(drop: PeerDrop, now: number = Date.now()): void {
    const { from, name } = sanitizedDropOrigin(drop)
    logForDebugging(`[peer-guard] drop ${drop.reason} from ${from}${name ? ` (@${name})` : ''}`)
    const key = `${drop.from}\0${drop.reason}`
    const existing = reportKeys.get(key)
    if (existing && now - existing.lastReportAt < REPORT_WINDOW_MS) {
      existing.suppressed++
      return
    }
    if (now - reportWindowStart >= REPORT_WINDOW_MS) {
      reportWindowStart = now
      reportsInWindow = 0
    }
    if (reportsInWindow >= MAX_DROP_REPORTS_PER_WINDOW) {
      overflowSuppressed++
      return
    }
    reportsInWindow++
    const suppressed = (existing?.suppressed ?? 0) + overflowSuppressed
    overflowSuppressed = 0
    reportKeys.delete(key)
    reportKeys.set(key, { lastReportAt: now, suppressed: 0 })
    if (reportKeys.size > MAX_TRACKED_ENTRIES) {
      const oldestKey = reportKeys.keys().next().value
      if (oldestKey !== undefined) reportKeys.delete(oldestKey)
    }
    const withSuppressed: PeerDrop = { ...drop, suppressed }
    logForDebugging(`[peer-guard] Dropped peer message from ${from}${name ? ` (@${name})` : ''}: ${drop.reason}${suppressed > 0 ? ` (+${suppressed} suppressed)` : ''}`, { level: 'warn' })
    reportFeatureSad('peer_loop_guard', drop.reason)
    messagingState().ingress.messageDropped.emit(withSuppressed)
  }

  async function flushPendingReceipts(timeoutMs: number = DEFAULT_FLUSH_RECEIPTS_TIMEOUT_MS): Promise<void> {
    const pending: unknown[] = []
    for (const bucket of buckets.values()) {
      if (bucket.pending > 0) pending.push(flushBucket(bucket, () => admitFlush()))
      else if (bucket.timer !== undefined) {
        clearTimeout(bucket.timer)
        bucket.timer = undefined
      }
    }
    if (pending.length === 0) return
    await Promise.race([Promise.allSettled(pending), sleep(timeoutMs, undefined, { unref: true })])
  }

  function dispose(): void {
    for (const bucket of buckets.values()) if (bucket.timer !== undefined) clearTimeout(bucket.timer)
    buckets.clear()
  }

  return { report, noteDropForReceipt, flushPendingReceipts, dispose }
}

export type PeerMessageLimits = PeerLoopGuardLimits & { maxQueuedPeerMessages: number }

/** `De`/`z`/`T`: los límites completos, con el tope de cola que `csn` no lleva. */
const MAX_QUEUED_PEER_MESSAGES_DEFAULT = 50
const PEER_MESSAGE_LIMITS_DEFAULTS: PeerMessageLimits = { ...DEFAULT_PEER_LOOP_GUARD_LIMITS, maxQueuedPeerMessages: MAX_QUEUED_PEER_MESSAGES_DEFAULT }
const PEER_MESSAGE_CONFIG_TTL_MS = 300000

function boundedNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback
}
function boundedInt(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback
}

/** `zOt`: los límites del guardián de bucles, leídos de `tengu_harbor_kite_limits` con sus cotas. */
export function peerMessageLimits(): PeerMessageLimits {
  const raw = getFeatureValue_CACHED_WITH_REFRESH('tengu_harbor_kite_limits', PEER_MESSAGE_LIMITS_DEFAULTS as unknown, PEER_MESSAGE_CONFIG_TTL_MS)
  if (typeof raw !== 'object' || raw === null) {
    logForDebugging('[peer-guard] tengu_harbor_kite_limits is not an object; using defaults', { level: 'warn' })
    return PEER_MESSAGE_LIMITS_DEFAULTS
  }
  const value = raw as Record<string, unknown>
  return {
    bucketCapacity: boundedNumber(value.bucketCapacity, 5, 500, PEER_MESSAGE_LIMITS_DEFAULTS.bucketCapacity),
    refillPerSecond: boundedNumber(value.refillPerSecond, 0.05, 50, PEER_MESSAGE_LIMITS_DEFAULTS.refillPerSecond),
    dedupWindowMs: boundedInt(value.dedupWindowMs, 0, 600000, PEER_MESSAGE_LIMITS_DEFAULTS.dedupWindowMs),
    maxSelfHops: boundedInt(value.maxSelfHops, 3, MAX_HOP_CHAIN, PEER_MESSAGE_LIMITS_DEFAULTS.maxSelfHops),
    maxChainLength: boundedInt(value.maxChainLength, 8, MAX_HOP_CHAIN - 1, PEER_MESSAGE_LIMITS_DEFAULTS.maxChainLength),
    maxTrackedSenders: boundedInt(value.maxTrackedSenders, 16, 100000, PEER_MESSAGE_LIMITS_DEFAULTS.maxTrackedSenders),
    maxQueuedPeerMessages: boundedInt(value.maxQueuedPeerMessages, 10, 5000, PEER_MESSAGE_LIMITS_DEFAULTS.maxQueuedPeerMessages),
  }
}

/** Si la pausa de ritmo de envío está activa (`We`): apagada por variable de entorno o por bandera remota. */
export function outboundPacingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.THYROX_CODE_HARBOR_KITE_PACING_OFF === 'true' || env.THYROX_CODE_HARBOR_KITE_PACING_OFF === '1') return false
  return !getFeatureValue_CACHED_MAY_BE_STALE('tengu_harbor_kite_pacing_off', false)
}

type SenderPacerBucket = { tokens: number; updatedAt: number; sentInBurst: number; burstStartedAt: number }

/** `ie`: el ritmo de salida hacia cada destino — reserva con reembolso, crédito y débito. */
export function createOutboundPacer(
  getLimits: () => Pick<PeerMessageLimits, 'bucketCapacity' | 'refillPerSecond' | 'maxTrackedSenders'>,
  now: () => number = Date.now,
): OutboundPacer {
  const buckets = new Map<string, SenderPacerBucket>()

  function bucketFor(target: string, at: number): SenderPacerBucket {
    const { bucketCapacity, refillPerSecond, maxTrackedSenders } = getLimits()
    let created = false
    const bucket = lruGetOrCreate(
      buckets,
      target,
      maxTrackedSenders,
      () => {
        created = true
        return { tokens: bucketCapacity, updatedAt: at, sentInBurst: 0, burstStartedAt: at }
      },
      existing => refillTokens(existing.tokens, existing.updatedAt, at, bucketCapacity, refillPerSecond) >= bucketCapacity,
    )
    if (!created) {
      bucket.tokens = refillTokens(bucket.tokens, bucket.updatedAt, at, bucketCapacity, refillPerSecond)
      bucket.updatedAt = at
      const burstWindowMs = (bucketCapacity / Math.max(refillPerSecond, 0.000000001)) * 1000
      if (bucket.tokens >= bucketCapacity || at - bucket.burstStartedAt > burstWindowMs) {
        bucket.sentInBurst = 0
        bucket.burstStartedAt = at
      }
    }
    return bucket
  }

  function reserve(target: string): ReturnType<OutboundPacer['reserve']> {
    const bucket = bucketFor(target, now())
    if (!hasToken(bucket.tokens)) return { ok: false, sentInBurst: bucket.sentInBurst }
    bucket.tokens -= 1
    bucket.sentInBurst += 1
    let refunded = false
    return {
      ok: true,
      refund: () => {
        if (refunded) return
        refunded = true
        bucket.tokens = Math.min(getLimits().bucketCapacity, bucket.tokens + 1)
        bucket.sentInBurst = Math.max(0, bucket.sentInBurst - 1)
      },
    }
  }

  function credit(target: string): void {
    const bucket = bucketFor(target, now())
    bucket.tokens = Math.min(getLimits().bucketCapacity, bucket.tokens + 1)
    bucket.sentInBurst = Math.max(0, bucket.sentInBurst - 1)
  }

  function debit(target: string): void {
    const bucket = bucketFor(target, now())
    bucket.tokens = Math.max(0, bucket.tokens - 1)
    bucket.sentInBurst += 1
  }

  return { reserve, credit, debit }
}
