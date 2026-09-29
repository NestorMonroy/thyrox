/**
 * La cesión de las respuestas de un artefacto: quién las tiene, a quién se
 * las entrega cuando otra sesión las reclama (`yield_artifact_replies`), la
 * confirmación de esa entrega en quien la pidió (`artifact_replies_yielded`)
 * y la devolución cuando la sesión que las tomó las suelta o desaparece
 * (`unyield_artifact_replies`). El estado es por anfitrión: dos sesiones del
 * mismo proceso de pruebas no se pisan.
 *
 * Porte de `fvt`, `cno`, `dno`, `uno`, `F3t`, `pno`, `fno`, `mno`, `gno`,
 * `hno`, `flr`, `yno`, `_no`, `mlr`, `glr`, `bno` y de sus internos `z`, `P`,
 * `m`, `T`, `M`, `C`, `Y`, `D`, `h`, `E`, `b`, `x` (`chunk-y9vyg7zk.js`) más
 * los tres ramales de `be` que despachan estas tres acciones
 * (`chunk-yg53q7yp.js`) de 2.1.283.
 *
 * `PerHost`/`processHost` (`q`/`j().host`) se reutilizan de
 * `sessionNameState.ts`; no se redefinen aquí.
 *
 * Divergencias declaradas:
 * - `d` (`chunk-fmsbxtrp.js`, fuera de alcance: reporta a la telemetría de
 *   producto) se sustituye por `logForDebugging` en nivel `warn`, igual que
 *   el resto de los `catch` silenciosos de este árbol.
 * - El campo que la referencia llama `writeToken` en el objeto par de `glr`
 *   (`n?.writeToken`) es, por construcción, el token de arranque verificado
 *   de la conexión — nunca el respaldo del registro de sesiones que sí puede
 *   llevar `procStart`. Aquí se llama `verifiedProcStart` para no heredar un
 *   nombre que en la referencia sólo es un accidente de minificado.
 * - `Y`/`D` dependen de si un pid sigue vivo y de si su arranque es el mismo
 *   (`Nh`/`VE`), ninguno determinista en una prueba. Las funciones exportadas
 *   que los alcanzan (`reclaimGoneHolders`, `unyieldArtifactReplies`,
 *   `respondToYieldRequest`) añaden un último parámetro `verifiers`, ausente
 *   en la referencia, con la implementación real como valor por omisión.
 * - `cG` (fallo de envío definitivamente no entregado) llega inyectado en
 *   `respondToYieldRequest`, sin equivalente portado: la referencia lo
 *   importa directo (`chunk-qcy58j4w.js`) clasificando clases de error que
 *   no están en el alcance de esta pieza.
 * - `qOt` (sesión viva de una dirección) y `Y` (id de esta sesión, distinto
 *   del `Y` interno de este archivo) llegan inyectados en
 *   `artifactReplyControlActions`, por la misma razón.
 */
import { reportFeatureOk, reportFeatureSad } from './featureTelemetry.ts'
import { canonicalSocketAddress } from './inboxAuth.ts'
import type { PeerIdentity } from './inboxConnection.ts'
import { replyableTarget } from './inboxDelivery.ts'
import type { ControlActionHandler } from './inboxRouting.ts'
import type { InboxState } from './inboxState.ts'
import { redactLogFragment, withholdTokenText } from './logRedaction.ts'
import { isProcessGone, sameStartToken, startTokenCache } from './processIdentity.ts'
import { PerHost, processHost } from './sessionNameState.ts'
import { logForDebugging } from '../debug.ts'

/** `fvt`: cuántos slugs lleva como máximo una petición o una respuesta. */
export const MAX_SLUGS = 16
/** `b`: plazo de espera de una respuesta antes de darla por perdida. */
const ANSWER_TIMEOUT_MS = 4000
/** `x`: cuántas suscripciones o entregas se recuerdan a la vez. */
const MAX_TABLE_SIZE = 64

type ParseResult<T> = { success: true; data: T } | { success: false }

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

function asBoundedString(value: unknown, max: number, min: number = 0): string | undefined {
  return typeof value === 'string' && value.length >= min && value.length <= max ? value : undefined
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asSlugArray(value: unknown, maxCount: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value) || value.length > maxCount) return undefined
  const slugs: string[] = []
  for (const item of value) {
    const slug = asBoundedString(item, maxLength)
    if (slug === undefined) return undefined
    slugs.push(slug)
  }
  return slugs
}

export type YieldArtifactRepliesFrame = {
  action: 'yield_artifact_replies'
  from: string
  msg_id: string
  session_id: string
  slugs: string[]
  reason: 'resume' | 'claim'
  sent_at: number
  claimed_at?: number
  requester?: { cwd?: unknown; tmux?: unknown }
}

/** `cno`. */
export function validateYieldArtifactRepliesFrame(value: unknown): ParseResult<YieldArtifactRepliesFrame> {
  const record = asRecord(value)
  if (record === undefined || record.action !== 'yield_artifact_replies') return { success: false }
  const from = asBoundedString(record.from, 512)
  const msgId = asBoundedString(record.msg_id, 128, 1)
  const sessionId = asBoundedString(record.session_id, 512)
  const slugs = asSlugArray(record.slugs, MAX_SLUGS, 128)
  const sentAt = asFiniteNumber(record.sent_at)
  if (from === undefined || msgId === undefined || sessionId === undefined || slugs === undefined || sentAt === undefined) return { success: false }
  const reason = record.reason === 'resume' || record.reason === 'claim' ? record.reason : 'claim'
  let claimedAt: number | undefined
  if (record.claimed_at !== undefined) {
    claimedAt = asFiniteNumber(record.claimed_at)
    if (claimedAt === undefined) return { success: false }
  }
  let requester: { cwd?: unknown; tmux?: unknown } | undefined
  if (record.requester !== undefined) {
    const requesterRecord = asRecord(record.requester)
    if (requesterRecord === undefined) return { success: false }
    requester = { cwd: requesterRecord.cwd, tmux: requesterRecord.tmux }
  }
  return {
    success: true,
    data: {
      action: 'yield_artifact_replies',
      from,
      msg_id: msgId,
      session_id: sessionId,
      slugs,
      reason,
      sent_at: sentAt,
      ...(claimedAt !== undefined && { claimed_at: claimedAt }),
      ...(requester !== undefined && { requester }),
    },
  }
}

export type ArtifactRepliesYieldedFrame = {
  action: 'artifact_replies_yielded'
  orig_msg_id: string
  yielded?: unknown
  not_held?: unknown
  refused?: unknown
}

/** `dno`. */
export function validateArtifactRepliesYieldedFrame(value: unknown): ParseResult<ArtifactRepliesYieldedFrame> {
  const record = asRecord(value)
  if (record === undefined || record.action !== 'artifact_replies_yielded') return { success: false }
  const origMsgId = asBoundedString(record.orig_msg_id, 128)
  if (origMsgId === undefined) return { success: false }
  return { success: true, data: { action: 'artifact_replies_yielded', orig_msg_id: origMsgId, yielded: record.yielded, not_held: record.not_held, refused: record.refused } }
}

export type UnyieldArtifactRepliesFrame = { action: 'unyield_artifact_replies'; orig_msg_id: string; slugs: string[]; stopped?: boolean }

/** `uno`. */
export function validateUnyieldArtifactRepliesFrame(value: unknown): ParseResult<UnyieldArtifactRepliesFrame> {
  const record = asRecord(value)
  if (record === undefined || record.action !== 'unyield_artifact_replies') return { success: false }
  const origMsgId = asBoundedString(record.orig_msg_id, 128)
  const slugs = asSlugArray(record.slugs, MAX_SLUGS, 128)
  if (origMsgId === undefined || slugs === undefined) return { success: false }
  let stopped: boolean | undefined
  if (record.stopped !== undefined) {
    if (typeof record.stopped !== 'boolean') return { success: false }
    stopped = record.stopped
  }
  return { success: true, data: { action: 'unyield_artifact_replies', orig_msg_id: origMsgId, slugs, ...(stopped !== undefined && { stopped }) } }
}

export type YieldTimers = {
  setTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeout: (timer: ReturnType<typeof setTimeout> | undefined) => void
}

/** `F3t`: temporizadores reales, sin retener el proceso. */
export const systemYieldTimers: YieldTimers = {
  setTimeout: (callback, ms) => {
    const timer = setTimeout(callback, ms)
    ;(timer as { unref?: () => void }).unref?.()
    return timer
  },
  clearTimeout: timer => clearTimeout(timer),
}

export type YieldAnswerOutcome =
  | { kind: 'timeout'; lost: string[]; lostTo: [string, string][] }
  | { kind: 'refused'; lost: string[]; lostTo: [string, string][] }
  | { kind: 'yielded'; yielded: string[]; notHeld: string[]; lost: string[]; lostTo: [string, string][] }

type OutstandingSubscription = {
  asked: Set<string>
  expectPid: number | undefined
  sentAt: number
  lost: Map<string, string>
  resolve: ((outcome: YieldAnswerOutcome) => void) | null
  onLate: ((outcome: YieldAnswerOutcome) => void) | undefined
  timer: ReturnType<typeof setTimeout> | undefined
  timers: YieldTimers
}

export type PendingClaim = { id: string; slugs: Set<string>; sentAt: number; lost: Map<string, string>; end: () => void }

export type DeliveredEntry = { slugs: Set<string>; pid: number | undefined; procStart: string | undefined }

export type ArtifactReleaseOptions = { stopped?: Set<string>; transferring?: Set<string> }

/** `(msgId, slugs, options?) => string[] | void`: a quién se le habían prestado esos slugs, si a alguien. */
export type ArtifactReverter = (msgId: string, slugs: string[], options?: ArtifactReleaseOptions) => string[] | void

export type ArtifactYieldRequest = { msgId: string; slugs: string[]; reason: 'resume' | 'claim'; requester: { cwd?: unknown; tmux?: unknown } }
export type ArtifactHolderResult = 'refused' | { yielded: string[]; notHeld: string[]; onDelivered?: () => void }
export type ArtifactHolder = (request: ArtifactYieldRequest) => ArtifactHolderResult

export type ArtifactRepliesYieldedPayload = { orig_msg_id: string; yielded: string[]; not_held: string[]; refused?: true }
/** `(address, payload, pid, verifiedProcStart) => Promise<void>`. */
export type ArtifactReplySender = (address: string, payload: ArtifactRepliesYieldedPayload, pid: number | undefined, verifiedProcStart: string | undefined) => Promise<void>

/** `z`: lo que este anfitrión sabe de la cesión de artefactos. */
export class ArtifactYieldState {
  outstanding = new Map<string, OutstandingSubscription>()
  pendingClaims = new Map<string, PendingClaim>()
  holder: ArtifactHolder | null = null
  reverter: ArtifactReverter | null = null
  sendAnswer: ArtifactReplySender | null = null
  ownAddress: string | null = null
  delivered = new Map<string, DeliveredEntry>()

  reset(): void {
    for (const entry of this.outstanding.values()) entry.timers.clearTimeout(entry.timer)
    this.outstanding.clear()
    this.pendingClaims.clear()
    this.holder = null
    this.reverter = null
    this.sendAnswer = null
    this.ownAddress = null
    this.delivered.clear()
  }
}

/** `P`. */
const statesPerHost = new PerHost<ArtifactYieldState>(() => new ArtifactYieldState())

/** `m`: el estado de este anfitrión; por omisión, el de este proceso. */
export function artifactYieldState(host: object = processHost): ArtifactYieldState {
  return statesPerHost.of(host)
}

/** `T`: descarta lo más viejo del mapa hasta caber en `MAX_TABLE_SIZE`. */
function evictOverflow<K, V>(map: Map<K, V>, onEvict?: (value: V, key: K) => void): void {
  while (map.size > MAX_TABLE_SIZE) {
    const key = map.keys().next().value
    if (key === undefined) break
    const value = map.get(key) as V
    map.delete(key)
    onEvict?.(value, key)
  }
}

/** `d`: divergencia declarada en la cabecera — sustituye a la telemetría de producto. */
function reportInternalError(error: unknown): void {
  logForDebugging(`[reply-yield] ${redactLogFragment(String(error))}`, { level: 'warn' })
}

/** `VE`: si el pid sigue siendo el mismo arranque que `procStart`. */
async function verifyProcessStartToken(pid: number, procStart: string): Promise<boolean | undefined> {
  const current = await startTokenCache.get(pid, { skipCache: true })
  return current === undefined ? undefined : sameStartToken(procStart, current)
}

export type LivenessVerifiers = {
  /** `Nh`. */
  isGone: (pid: number) => boolean
  /** `VE`. */
  verifyStart: (pid: number, procStart: string) => Promise<boolean | undefined>
}

/** Ausente en la referencia: seam de prueba para `Y`/`D`, con la implementación real por omisión. */
export const defaultLivenessVerifiers: LivenessVerifiers = { isGone: isProcessGone, verifyStart: verifyProcessStartToken }

/** `pno`. */
export interface SubscribeToYieldAnswersOptions {
  expectPid?: number
  sentAt: number
  timeoutMs?: number
  timers?: YieldTimers
  onLate?: (outcome: YieldAnswerOutcome) => void
}

export function subscribeToYieldAnswers(msgId: string, slugs: Iterable<string>, options: SubscribeToYieldAnswersOptions): Promise<YieldAnswerOutcome> {
  const timers = options.timers ?? systemYieldTimers
  const state = artifactYieldState()
  return new Promise(resolve => {
    const subscription: OutstandingSubscription = {
      asked: new Set(slugs),
      expectPid: options.expectPid,
      sentAt: options.sentAt,
      lost: new Map(),
      resolve,
      onLate: options.onLate,
      timer: undefined,
      timers,
    }
    subscription.timer = timers.setTimeout(() => {
      if (state.outstanding.get(msgId) !== subscription || subscription.resolve === null) return
      const finish = subscription.resolve
      subscription.resolve = null
      finish({ kind: 'timeout', lost: [...subscription.lost.keys()], lostTo: [...subscription.lost] })
      if (subscription.onLate === undefined) state.outstanding.delete(msgId)
    }, options.timeoutMs ?? ANSWER_TIMEOUT_MS)
    state.outstanding.set(msgId, subscription)
    evictOverflow(state.outstanding, evicted => {
      evicted.timers.clearTimeout(evicted.timer)
      evicted.resolve?.({ kind: 'timeout', lost: [...evicted.lost.keys()], lostTo: [...evicted.lost] })
      evicted.resolve = null
    })
  })
}

/** `fno`. */
export function beginPendingClaim(slugs: Iterable<string>, sentAt: number): PendingClaim {
  const state = artifactYieldState()
  const id = `claim-${sentAt}-${Math.random().toString(36).slice(2)}`
  const claim: PendingClaim = { id, slugs: new Set(slugs), sentAt, lost: new Map(), end: () => void state.pendingClaims.delete(id) }
  state.pendingClaims.set(id, claim)
  return claim
}

/** `mno`. */
export function cancelYieldSubscription(msgId: string): [string, string][] {
  const state = artifactYieldState()
  const subscription = state.outstanding.get(msgId)
  if (subscription === undefined) return []
  subscription.timers.clearTimeout(subscription.timer)
  state.outstanding.delete(msgId)
  return [...subscription.lost]
}

/** `gno`. */
export function hasOutstandingYieldRequest(msgId: unknown): boolean {
  return typeof msgId === 'string' && artifactYieldState().outstanding.has(msgId)
}

/** `hno`. */
export function resolveYieldAnswer(answer: ArtifactRepliesYieldedFrame, pid: number | undefined): boolean {
  const state = artifactYieldState()
  const pending = state.outstanding.get(answer.orig_msg_id)
  if (pending === undefined) return false
  if (pending.expectPid !== undefined && pid !== undefined && pid !== pending.expectPid) {
    reportFeatureSad('artifact_live_subscribe', 'yield_answer_pid_mismatch')
    return false
  }
  pending.timers.clearTimeout(pending.timer)
  const askedOnly = (values: unknown): string[] => (Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string' && pending.asked.has(value)) : [])
  const outcome = answer.refused === true ? { kind: 'refused' as const } : { kind: 'yielded' as const, yielded: askedOnly(answer.yielded), notHeld: askedOnly(answer.not_held) }
  if (pending.resolve !== null) {
    state.outstanding.delete(answer.orig_msg_id)
    pending.resolve({ ...outcome, lost: [...pending.lost.keys()], lostTo: [...pending.lost] })
  } else {
    state.outstanding.delete(answer.orig_msg_id)
    reportFeatureOk('artifact_live_subscribe', { yield_answer_late: true })
    try {
      pending.onLate?.({ ...outcome, lost: [...pending.lost.keys()], lostTo: [...pending.lost] })
    } catch (error) {
      reportInternalError(error)
    }
  }
  return true
}

/** `flr`. */
export function setArtifactHolder(holder: ArtifactHolder | null, reverter: ArtifactReverter | null = null): void {
  const state = artifactYieldState()
  state.holder = holder
  state.reverter = reverter
}

/** `mlr`. */
export function setArtifactReplySender(sendAnswer: ArtifactReplySender | null, ownAddress: string | null = null): void {
  const state = artifactYieldState()
  state.sendAnswer = sendAnswer
  state.ownAddress = ownAddress
}

/** `M`: apunta una entrega, y descarta la más vieja (o la del mismo pid) por encima de `MAX_TABLE_SIZE`. */
function recordDelivery(state: ArtifactYieldState, msgId: string, slugs: readonly string[], peer: { pid?: number; procStart?: string } | undefined): void {
  const previous = state.delivered.get(msgId)
  state.delivered.delete(msgId)
  const pid = peer?.pid ?? previous?.pid
  state.delivered.set(msgId, { slugs: new Set([...(previous?.slugs ?? []), ...slugs]), pid, procStart: peer?.procStart ?? previous?.procStart })
  const evict = (entry: DeliveredEntry, id: string) => {
    try {
      state.reverter?.(id, [...entry.slugs])
    } catch (error) {
      reportInternalError(error)
    }
  }
  while (state.delivered.size > MAX_TABLE_SIZE) {
    const samePid = [...state.delivered].find(([id, entry]) => id !== msgId && pid !== undefined && entry.pid === pid)
    if (samePid === undefined) break
    state.delivered.delete(samePid[0])
    evict(samePid[1], samePid[0])
  }
  evictOverflow(state.delivered, evict)
}

/** `C`: si ya no cabe una entrega más, salvo que `pid` ya tenga una entrada (y por tanto no crece la tabla). */
function deliveryTableFull(state: ArtifactYieldState, pid: number | undefined): boolean {
  if (state.delivered.size < MAX_TABLE_SIZE) return false
  if (pid === undefined) return true
  for (const entry of state.delivered.values()) if (entry.pid === pid) return false
  return true
}

/** `h`: quita `slugs` de la entrega `msgId` y avisa a quien las tenía prestadas. */
function releaseSlugs(state: ArtifactYieldState, msgId: string, slugs: readonly string[], options?: ArtifactReleaseOptions): string[] {
  const entry = state.delivered.get(msgId)
  if (entry === undefined) return []
  const removed = slugs.filter(slug => entry.slugs.delete(slug))
  if (entry.slugs.size === 0) state.delivered.delete(msgId)
  if (removed.length === 0) return []
  try {
    return state.reverter?.(msgId, removed, options) ?? []
  } catch (error) {
    reportInternalError(error)
    return []
  }
}

/** `D`: si el pid de una entrega arrancó de nuevo (mismo pid, otro proceso), se le retira lo entregado. */
async function pruneStaleHolders(state: ArtifactYieldState, verifiers: LivenessVerifiers): Promise<void> {
  for (const [msgId, entry] of [...state.delivered]) {
    if (entry.pid === undefined || entry.procStart === undefined) continue
    let stillSame: boolean | undefined
    try {
      stillSame = await verifiers.verifyStart(entry.pid, entry.procStart)
    } catch {
      stillSame = undefined
    }
    if (stillSame === false && state.delivered.get(msgId) === entry) {
      reportFeatureOk('artifact_comments_autoreact', { yield_taker_reused: true })
      releaseSlugs(state, msgId, [...entry.slugs])
    }
  }
}

/** `Y`: retira lo entregado a un pid que ya no existe, y de paso lanza `D` sin esperarlo. */
function reclaimFromGoneHolders(state: ArtifactYieldState, options: ArtifactReleaseOptions | undefined, verifiers: LivenessVerifiers): string[] {
  const handedBack: string[] = []
  for (const [msgId, entry] of [...state.delivered]) {
    if (entry.pid !== undefined && verifiers.isGone(entry.pid)) handedBack.push(...releaseSlugs(state, msgId, [...entry.slugs], options))
  }
  void pruneStaleHolders(state, verifiers)
  return handedBack
}

/** `yno`. */
export function reclaimGoneHolders(options?: ArtifactReleaseOptions, verifiers: LivenessVerifiers = defaultLivenessVerifiers): string[] {
  return reclaimFromGoneHolders(artifactYieldState(), options, verifiers)
}

/** `_no`: olvida un slug en cualquier entrega que lo tenga, sin avisar a nadie. */
export function forgetDeliveredSlug(slug: string): void {
  const state = artifactYieldState()
  for (const [msgId, entry] of [...state.delivered]) {
    if (entry.slugs.delete(slug) && entry.slugs.size === 0) state.delivered.delete(msgId)
  }
}

type Claim = { slugs: Set<string>; sentAt: number; lost: Map<string, string> }

/**
 * `E`: si una petición entrante compite por los mismos slugs que una
 * suscripción o una reclamación propia ya en curso. Empata por hora
 * (`claimed_at` o `sent_at`) y, si coincide, por la dirección: la nuestra
 * gana si es mayor que la de quien pide.
 */
function claimConflict(state: ArtifactYieldState, frame: { slugs: string[]; from: string; sent_at: number; claimed_at?: number }): 'refuse' | 'proceed' {
  const requestedAt = frame.claimed_at ?? frame.sent_at
  let conflicted = false
  const claims: Claim[] = [...state.pendingClaims.values()]
  for (const [, outstanding] of state.outstanding) {
    if (outstanding.resolve !== null) claims.push({ slugs: outstanding.asked, sentAt: outstanding.sentAt, lost: outstanding.lost })
  }
  for (const claim of claims) {
    if (!frame.slugs.some(slug => claim.slugs.has(slug))) continue
    if (requestedAt > claim.sentAt || (requestedAt === claim.sentAt && frame.from > (state.ownAddress ?? ''))) {
      for (const slug of frame.slugs) if (claim.slugs.has(slug)) claim.lost.set(slug, frame.from)
    } else {
      conflicted = true
    }
  }
  return conflicted ? 'refuse' : 'proceed'
}

export type YieldPeerInfo = { pid?: number; procStart?: string; verifiedProcStart?: string }
export type RespondToYieldRequestOptions = { refuse?: boolean }

export interface RespondToYieldRequestDeps {
  /** `cG`: si el error de envío prueba que la respuesta no llegó; sin equivalente portado. */
  isDefinitelyUndelivered: (error: unknown) => boolean
  verifiers?: LivenessVerifiers
}

/**
 * `glr`: responde una petición de cesión. Rechaza si es vieja, si compite con
 * una reclamación propia, si no hay quien las tenga o si la tabla de
 * entregas está llena; si no, pregunta al que las tiene (`holder`) y apunta
 * lo cedido antes de contestar. Si el envío de la respuesta falla de forma
 * ambigua, reintenta una vez y da la cesión por hecha; si falla de forma
 * definitiva, devuelve lo cedido a quien lo tenía.
 */
export function respondToYieldRequest(
  frame: YieldArtifactRepliesFrame,
  address: string,
  peer: YieldPeerInfo | undefined,
  now: number,
  options: RespondToYieldRequestOptions | undefined,
  deps: RespondToYieldRequestDeps,
): void {
  const verifiers = deps.verifiers ?? defaultLivenessVerifiers
  const pid = peer?.pid
  const verifiedProcStart = peer?.verifiedProcStart
  const state = artifactYieldState()
  const sendAnswer = state.sendAnswer
  if (sendAnswer === null) return
  let result: ArtifactHolderResult
  if (options?.refuse === true) {
    result = 'refused'
  } else if (now - frame.sent_at > ANSWER_TIMEOUT_MS - 500 || frame.sent_at > now + 1000 || (frame.claimed_at !== undefined && frame.claimed_at > frame.sent_at + 1000)) {
    reportFeatureSad('artifact_comments_autoreact', 'yield_request_stale')
    result = 'refused'
  } else if (claimConflict(state, frame) === 'refuse') {
    result = 'refused'
  } else if (state.holder === null) {
    result = { yielded: [], notHeld: [...frame.slugs] }
  } else {
    try {
      reclaimFromGoneHolders(state, { transferring: new Set(frame.slugs) }, verifiers)
      if (deliveryTableFull(state, pid)) {
        reportFeatureSad('artifact_comments_autoreact', 'yield_table_full')
        result = 'refused'
      } else {
        result = state.holder({ msgId: frame.msg_id, slugs: frame.slugs, reason: frame.reason, requester: { cwd: frame.requester?.cwd, tmux: frame.requester?.tmux } })
      }
    } catch (error) {
      reportInternalError(error)
      reportFeatureSad('artifact_comments_autoreact', 'yield_handler_threw')
      result = 'refused'
    }
  }
  const payload: ArtifactRepliesYieldedPayload =
    result === 'refused'
      ? { orig_msg_id: frame.msg_id, yielded: [], not_held: [], refused: true }
      : { orig_msg_id: frame.msg_id, yielded: result.yielded.slice(0, MAX_SLUGS), not_held: result.notHeld.slice(0, MAX_SLUGS) }
  const committed = result !== 'refused' && result.yielded.length > 0 ? result : null
  if (committed !== null) recordDelivery(state, frame.msg_id, committed.yielded, peer)
  sendAnswer(address, payload, pid, verifiedProcStart).then(
    () => committed?.onDelivered?.(),
    (error: unknown) => {
      logForDebugging(`[reply-yield] answer to ${withholdTokenText(address)} failed: ${redactLogFragment(String(error))}`)
      if (committed === null) return
      if (!deps.isDefinitelyUndelivered(error)) {
        reportFeatureSad('artifact_comments_autoreact', 'yield_answer_send_ambiguous')
        sendAnswer(address, payload, pid, verifiedProcStart).catch(() => {})
        committed.onDelivered?.()
        return
      }
      reportFeatureSad('artifact_comments_autoreact', 'yield_answer_undelivered')
      releaseSlugs(state, frame.msg_id, committed.yielded)
    },
  )
}

/** `bno`. */
export function unyieldArtifactReplies(frame: UnyieldArtifactRepliesFrame, pid: number | undefined, verifiers: LivenessVerifiers = defaultLivenessVerifiers): boolean {
  const state = artifactYieldState()
  const entry = state.delivered.get(frame.orig_msg_id)
  if (entry === undefined) return false
  if (entry.pid !== undefined && pid !== undefined && pid !== entry.pid) {
    reportFeatureSad('artifact_comments_autoreact', 'unyield_pid_mismatch')
    return false
  }
  const handedBack = releaseSlugs(state, frame.orig_msg_id, frame.slugs, frame.stopped === true ? { stopped: new Set(frame.slugs) } : undefined)
  handedBack.push(...reclaimFromGoneHolders(state, undefined, verifiers))
  reportFeatureOk('artifact_comments_autoreact', { yield_handed_back: handedBack.length })
  return true
}

// ---------------------------------------------------------------------------
// Los tres ramales de `be` (chunk-yg53q7yp.js) que despachan estas acciones.
// ---------------------------------------------------------------------------

type Message = Record<string, unknown> & { type: string }

export interface ArtifactReplyControlDeps {
  state: InboxState
  /** `Y`: el id de esta sesión. */
  sessionId: () => string
  /** `qOt`: la sesión viva registrada en esa dirección, si la hay. */
  findLiveSession: (address: string) => Promise<{ sessionId: string; pid: number; procStart: string | undefined } | undefined>
  /** `cG`. */
  isDefinitelyUndelivered: (error: unknown) => boolean
}

async function handleYieldArtifactReplies(message: Message, peer: PeerIdentity, deps: ArtifactReplyControlDeps): Promise<void> {
  const parsed = validateYieldArtifactRepliesFrame(message)
  if (!parsed.success) {
    logForDebugging('[uds-messaging] yield_artifact_replies dropped: malformed frame')
    reportFeatureSad('artifact_comments_autoreact', 'yield_malformed_frame')
    return
  }
  const frame = parsed.data
  const ownSocket = deps.state.activeSocketPath
  // replyableTarget exige un pid; sin él, isReplyableSocket ya lo trata como
  // ausente — mismo comportamiento que `aEn` con el pid sin verificar.
  const target = ownSocket === undefined ? undefined : replyableTarget(frame.from, ownSocket, peer.pid as number, deps.state)
  if (ownSocket === undefined || target === undefined) {
    logForDebugging(
      `[uds-messaging] yield_artifact_replies dropped: ${ownSocket === undefined ? 'own inbox not bound' : 'reply address unshaped or outside our socket namespace'} (${withholdTokenText(frame.from)})`,
    )
    reportFeatureSad('artifact_comments_autoreact', 'yield_unvettable_target')
    return
  }
  if (canonicalSocketAddress(target) === canonicalSocketAddress(ownSocket)) {
    logForDebugging('[uds-messaging] yield_artifact_replies dropped: reply target is this session')
    return
  }
  const session = await deps.findLiveSession(target)
  if (session === undefined || session.sessionId !== deps.sessionId() || (peer.pid !== undefined && session.pid !== peer.pid)) {
    logForDebugging(`[uds-messaging] yield_artifact_replies refused: requester is not a verified live session of this conversation (${withholdTokenText(frame.from)})`)
    reportFeatureSad('artifact_comments_autoreact', 'yield_requester_unverified')
    respondToYieldRequest(
      frame,
      target,
      peer.pid === undefined ? undefined : { pid: peer.pid, verifiedProcStart: peer.startToken },
      Date.now(),
      { refuse: true },
      { isDefinitelyUndelivered: deps.isDefinitelyUndelivered },
    )
    return
  }
  respondToYieldRequest(
    frame,
    target,
    {
      pid: peer.pid ?? session.pid,
      procStart: peer.startToken ?? (peer.pid === undefined || peer.pid === session.pid ? session.procStart : undefined),
      verifiedProcStart: peer.startToken,
    },
    Date.now(),
    undefined,
    { isDefinitelyUndelivered: deps.isDefinitelyUndelivered },
  )
}

function handleUnyieldArtifactReplies(message: Message, peer: PeerIdentity): void {
  const parsed = validateUnyieldArtifactRepliesFrame(message)
  if (!parsed.success || !unyieldArtifactReplies(parsed.data, peer.pid)) {
    logForDebugging('[uds-messaging] unyield_artifact_replies dropped: malformed, uncorrelated or already handed back')
  }
}

function handleArtifactRepliesYielded(message: Message, peer: PeerIdentity): void {
  const parsed = validateArtifactRepliesYieldedFrame(message)
  if (!parsed.success) {
    logForDebugging('[uds-messaging] artifact_replies_yielded dropped: malformed frame')
    reportFeatureSad('artifact_live_subscribe', 'yield_malformed_answer')
    return
  }
  if (!hasOutstandingYieldRequest(parsed.data.orig_msg_id)) {
    logForDebugging('[uds-messaging] artifact_replies_yielded dropped: uncorrelated or already settled')
    return
  }
  resolveYieldAnswer(parsed.data, peer.pid)
}

/** Los tres ramales de `be` que le corresponden a esta pieza. */
export function artifactReplyControlActions(deps: ArtifactReplyControlDeps) {
  return {
    yield_artifact_replies: (message: unknown, peer: PeerIdentity) => handleYieldArtifactReplies(message as Message, peer, deps),
    unyield_artifact_replies: (message: unknown, peer: PeerIdentity) => handleUnyieldArtifactReplies(message as Message, peer),
    artifact_replies_yielded: (message: unknown, peer: PeerIdentity) => handleArtifactRepliesYielded(message as Message, peer),
  } satisfies Record<'yield_artifact_replies' | 'unyield_artifact_replies' | 'artifact_replies_yielded', ControlActionHandler>
}
