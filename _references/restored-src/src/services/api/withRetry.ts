// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/api/withRetry.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 10 · líneas de código: 84
// Mencionado en: part2/ch06b.md, part7/ch30.md
// ══════════════════════════════════════════════════════════════════

// ─── part7/ch30.md · líneas 52-54 ───
const DEFAULT_MAX_RETRIES = 10
const FLOOR_OUTPUT_TOKENS = 3000
const MAX_529_RETRIES = 3

// ─── ausente: líneas 55-56 (2 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 57-61 ───
// Foreground query sources where the user IS blocking on the result — these
// retry on 529. Everything else (summaries, titles, suggestions, classifiers)
// bails immediately: during a capacity cascade each retry is 3-10× gateway
// amplification, and the user never sees those fail anyway.

// ─── ausente: líneas 62-93 (32 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 94-95 ───
// TODO(ANT-344): the keep-alive via SystemAPIErrorMessage yields is a stopgap
// until there's a dedicated keep-alive channel.

// ─── ausente: líneas 96-274 (179 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 275-281 ───
const overageReason = error.headers?.get(
  'anthropic-ratelimit-unified-overage-disabled-reason',
)
if (overageReason !== null && overageReason !== undefined) {
  handleFastModeOverageRejection(overageReason)
  retryContext.fastMode = false
  continue
}

// ─── ausente: líneas 282-283 (2 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 284-304 ───
const retryAfterMs = getRetryAfterMs(error)
if (retryAfterMs !== null && retryAfterMs < SHORT_RETRY_THRESHOLD_MS) {
  // Short retry-after: wait and retry with fast mode still active
  // to preserve prompt cache (same model name on retry).
  await sleep(retryAfterMs, options.signal, { abortError })
  continue
}
// Long or unknown retry-after: enter cooldown (switches to standard
// speed model), with a minimum floor to avoid flip-flopping.
const cooldownMs = Math.max(
  retryAfterMs ?? DEFAULT_FAST_MODE_FALLBACK_HOLD_MS,
  MIN_COOLDOWN_MS,
)
const cooldownReason: CooldownReason = is529Error(error)
  ? 'overloaded'
  : 'rate_limit'
triggerFastModeCooldown(Date.now() + cooldownMs, cooldownReason)

// ─── ausente: líneas 305-326 (22 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 327-351 ───
if (is529Error(error) &&
    (process.env.FALLBACK_FOR_ALL_PRIMARY_MODELS ||
     (!isClaudeAISubscriber() && isNonCustomOpusModel(options.model)))
) {
  consecutive529Errors++
  if (consecutive529Errors >= MAX_529_RETRIES) {
    if (options.fallbackModel) {
      logEvent('tengu_api_opus_fallback_triggered', {
        original_model: options.model,
        fallback_model: options.fallbackModel,
        provider: getAPIProviderForStatsig(),
      })
      throw new FallbackTriggeredError(
        options.model,
        options.fallbackModel,
      )
    }
    // ...
  }
}

// ─── ausente: líneas 352-435 (84 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 436-447 ───
if (persistent && error instanceof APIError && error.status === 429) {
  persistentAttempt++
  const resetDelay = getRateLimitResetDelayMs(error)
  delayMs =
    resetDelay ??
    Math.min(
      getRetryDelay(persistentAttempt, retryAfter, PERSISTENT_MAX_BACKOFF_MS),
      PERSISTENT_RESET_CAP_MS,
    )
}

// ─── ausente: líneas 448-488 (41 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 489-503 ───
let remaining = delayMs
while (remaining > 0) {
  if (options.signal?.aborted) throw new APIUserAbortError()
  if (error instanceof APIError) {
    yield createSystemAPIErrorMessage(
      error,
      remaining,
      reportedAttempt,
      maxRetries,
    )
  }
  const chunk = Math.min(remaining, HEARTBEAT_INTERVAL_MS)
  await sleep(chunk, options.signal, { abortError })
  remaining -= chunk
}

// ─── ausente: líneas 504-504 (1 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 505-506 ───
// Clamp so the for-loop never terminates. Backoff uses the separate
// persistentAttempt counter which keeps growing to the 5-min cap.
if (attempt >= maxRetries) attempt = maxRetries

// ─── ausente: líneas 507-734 (228 líneas sin fragmento en el corpus) ───

// ─── part2/ch06b.md · líneas 735-736 ───
// For Max and Pro users, should-retry is true, but in several hours, so we shouldn't.
// Enterprise users can retry because they typically use PAYG instead of rate limits.
