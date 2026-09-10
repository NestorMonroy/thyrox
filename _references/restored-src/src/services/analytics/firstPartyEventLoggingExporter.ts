// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/analytics/firstPartyEventLoggingExporter.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 6 · líneas de código: 55
// Mencionado en: part7/ch29.md
// ══════════════════════════════════════════════════════════════════

// ─── part7/ch29.md · líneas 44-46 ───
function getStorageDir(): string {
  return path.join(getClaudeConfigHomeDir(), 'telemetry')
}

// ─── ausente: líneas 47-136 (90 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 137-138 ───
// Retry any failed events from previous runs of this session (in background)
void this.retryPreviousBatches()

// ─── ausente: líneas 139-378 (240 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 379-421 ───
private async sendEventsInBatches(
  events: FirstPartyEventLoggingEvent[],
): Promise<FirstPartyEventLoggingEvent[]> {
  const batches: FirstPartyEventLoggingEvent[][] = []
  for (let i = 0; i < events.length; i += this.maxBatchSize) {
    batches.push(events.slice(i, i + this.maxBatchSize))
  }
  // ...
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!
    try {
      await this.sendBatchWithRetry({ events: batch })
    } catch (error) {
      // Short-circuit all subsequent batches on first batch failure
      for (let j = i; j < batches.length; j++) {
        failedBatchEvents.push(...batches[j]!)
      }
      break
    }
    if (i < batches.length - 1 && this.batchDelayMs > 0) {
      await sleep(this.batchDelayMs)
    }
  }
  return failedBatchEvents
}

// ─── ausente: líneas 422-450 (29 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 451-455 ───
// Quadratic backoff (matching Statsig SDK): base * attempts²
const delay = Math.min(
  this.baseBackoffDelayMs * this.attempts * this.attempts,
  this.maxBackoffDelayMs,
)

// ─── ausente: líneas 456-592 (137 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 593-611 ───
if (
  useAuth &&
  axios.isAxiosError(error) &&
  error.response?.status === 401
) {
  // 401 auth error, retrying without auth
  const response = await axios.post(this.endpoint, payload, {
    timeout: this.timeout,
    headers: baseHeaders,
  })
  this.logSuccess(payload.events.length, false, response.data)
  return
}

// ─── ausente: líneas 612-718 (107 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 719-724 ───
const {
  _PROTO_skill_name,
  _PROTO_plugin_name,
  _PROTO_marketplace_name,
  ...rest
} = formatted.additional
const additionalMetadata = stripProtoFields(rest)
