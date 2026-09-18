import type Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import { sideQuery, type SideQueryOptions } from '@thyrox/agent/sideQuery.js'
import { createCombinedAbortSignal } from '@thyrox/agent/combinedAbortSignal.js'
import { isAbortError } from '@thyrox/local-observability/errorHelpers.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { resolveAntModel } from '@thyrox/provider/antModels.js'

/**
 * Copia de `ccnmt: packages/permission/src/classifierStallTracking.ts` con los
 * comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Configuración de `thinking` para las llamadas del clasificador. El
 * clasificador quiere respuestas cortas y sólo de texto — los bloques
 * `thinking` que devuelve el API los ignora `extractTextContent()` y gastan
 * tokens.
 *
 * Para la mayoría de los modelos: enviar { type: 'disabled' } por el
 * `thinking: false` de `sideQuery`.
 *
 * Los modelos con `alwaysOnThinking` (declarado en `tengu_ant_model_override`)
 * usan por defecto `thinking` adaptativo del lado del servidor y rechazan
 * `disabled` con un 400. Para esos: no pasar `thinking: false`, sino acolchar
 * `max_tokens` para que el `thinking` adaptativo (observado entre 0 y 1114
 * tokens al reproducir go/ccshare/shawnm-20260310-202833) no agote el
 * presupuesto antes de que se emita <block>. Sin ese margen,
 * `stop_reason=max_tokens` produce una respuesta de texto vacía →
 * `parseXmlBlock('')` → null → "unparseable" → se bloquean comandos seguros.
 *
 * Devuelve [disableThinking, headroom] — una tupla en vez de un objeto con
 * nombres, para que las cadenas de los nombres de propiedad no sobrevivan a la
 * minificación en las builds externas.
 */
export function getClassifierThinkingConfig(
  model: string,
): [false | undefined, number] {
  if (
    process.env.USER_TYPE === 'ant' &&
    resolveAntModel(model)?.alwaysOnThinking
  ) {
    return [undefined, 2048]
  }
  return [false, 0]
}

// ============================================================================
// Seguimiento de atascos y timeouts por etapa (ant Rp5 / WR8)
//
// Capa de instrumentación genérica que envuelve el `sideQuery` de un
// clasificador de modo automático con (1) registro de heartbeat, para que una
// petición colgada se vea en --debug, y (2) un timeout exterior de reloj de
// pared superpuesto al timeout por fetch que `sideQuery` ya tiene. Vive en su
// propio módulo porque es fontanería de la llamada al API, no lógica de
// clasificación — `yoloClassifier.ts` lo consume pero no es su dueño.
// ============================================================================

/**
 * Timeout de reloj de pared para la etapa 1 (la rápida) — ant LZ7. Corto
 * porque la etapa 1 es una decisión inmediata de entre 64 y 256 tokens.
 */
export const CLASSIFIER_STAGE1_TIMEOUT_MS = 30000
/**
 * Timeout de reloj de pared para la etapa 2 (la de `thinking`) y para el
 * clasificador `tool_use` de un solo disparo — ant fR8. Más amplio, para dar
 * lugar al chain-of-thought.
 */
export const CLASSIFIER_STAGE2_TIMEOUT_MS = 120000
/**
 * Timeout interior por fetch que se le entrega a `sideQuery` — ant kZ7. Queda
 * dentro de la señal exterior de reloj de pared, para que un intento de fetch
 * concreto no pueda colgar el presupuesto entero. ant lo impone en toda
 * llamada del clasificador, sea cual sea la etapa.
 */
const CLASSIFIER_FETCH_TIMEOUT_MS = 60000

/** Contador mutable de intentos de fetch por etapa (el objeto `{count:0}` de ant). */
export type AttemptCounter = { count: number }

/**
 * Metadata de las líneas de registro de atasco de una llamada del clasificador
 * al API (el argumento `_` de ant Rp5).
 */
export type ClassifierStallMeta = {
  toolName: string
  classifierModel: string
  classifierStage: 'xml_s1' | 'xml_s2' | 'tool_use'
  promptTokensEstimate?: number
}

/**
 * Envuelve la promesa de una llamada del clasificador al API con registro de
 * heartbeat de atasco. Replica ant Rp5 exactamente: una línea de inicio, una
 * línea de progreso a los 15 s y después cada 30 s hasta 10 veces, y una línea
 * de fin que lleva el desenlace y la duración. Los heartbeats permiten ver un
 * clasificador colgado en los registros de --debug en vez de un atasco
 * silencioso. La promesa se devuelve —o se relanza— sin alterar.
 */
async function runClassifierWithStallTracking<T>(
  promise: Promise<T>,
  meta: ClassifierStallMeta,
): Promise<T> {
  const start = Date.now()
  const reqId = randomUUID()
  const estSuffix =
    meta.promptTokensEstimate !== undefined
      ? ` promptTokensEst=${meta.promptTokensEstimate}`
      : ''
  logForDebugging(
    `[Stall] classifier_request_started reqId=${reqId} tool=${meta.toolName} model=${meta.classifierModel} stage=${meta.classifierStage}${estSuffix}`,
    { level: 'info' },
  )
  let progressCount = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  const scheduleHeartbeat = (delayMs: number) => {
    timer = setTimeout(() => {
      timer = null
      const ageMs = Date.now() - start
      logForDebugging(
        `[Stall] classifier_request_progress reqId=${reqId} tool=${meta.toolName} stage=${meta.classifierStage} ageMs=${ageMs}`,
        { level: 'warn' },
      )
      if (++progressCount < 10) scheduleHeartbeat(30000)
    }, delayMs)
    timer.unref?.()
  }
  scheduleHeartbeat(15000)
  try {
    const result = await promise
    const durationMs = Date.now() - start
    logForDebugging(
      `[Stall] classifier_request_finished reqId=${reqId} tool=${meta.toolName} stage=${meta.classifierStage} outcome=ok durationMs=${durationMs}`,
      { level: 'info' },
    )
    return result
  } catch (error) {
    const durationMs = Date.now() - start
    const aborted = isAbortError(error)
    const outcome = aborted ? 'aborted' : 'error'
    const errorKind =
      error instanceof Error
        ? `${error.name}:${error.message.slice(0, 80)}`
        : 'unknown'
    logForDebugging(
      `[Stall] classifier_request_finished reqId=${reqId} tool=${meta.toolName} stage=${meta.classifierStage} outcome=${outcome} durationMs=${durationMs} errorKind=${errorKind}`,
      { level: aborted ? 'info' : 'warn' },
    )
    throw error
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
}

/**
 * Ejecuta el `sideQuery` de un clasificador bajo un timeout exterior de reloj
 * de pared y con seguimiento de atascos. Replica ant WR8: construye una abort
 * signal ligada al timeout (fk → `createCombinedAbortSignal`), impone el
 * timeout interior por fetch (kZ7), cablea el contador de intentos por
 * `onFetchAttempt` y enruta la llamada por `runClassifierWithStallTracking`.
 * Limpia la señal del timeout en el `finally`.
 */
export async function sideQueryWithStallTracking(
  outerSignal: AbortSignal,
  opts: SideQueryOptions,
  meta: ClassifierStallMeta,
  timeoutMs: number,
  counter?: AttemptCounter,
): Promise<Anthropic.Beta.Messages.BetaMessage> {
  const { signal, cleanup } = createCombinedAbortSignal(outerSignal, {
    timeoutMs,
  })
  try {
    return await runClassifierWithStallTracking(
      sideQuery({
        ...opts,
        timeout: CLASSIFIER_FETCH_TIMEOUT_MS,
        signal,
        ...(counter && { onFetchAttempt: () => counter.count++ }),
      }),
      meta,
    )
  } finally {
    cleanup()
  }
}
