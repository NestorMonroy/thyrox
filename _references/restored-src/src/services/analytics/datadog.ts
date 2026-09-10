// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/analytics/datadog.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 21
// Mencionado en: part7/ch29.md
// ══════════════════════════════════════════════════════════════════

// ─── part7/ch29.md · líneas 19-64 ───
// nota del libro: excerpt
const DATADOG_ALLOWED_EVENTS = new Set([
  'chrome_bridge_connection_succeeded',
  'chrome_bridge_connection_failed',
  // ... chrome_bridge_* events
  'tengu_api_error',
  'tengu_api_success',
  'tengu_cancel',
  'tengu_exit',
  'tengu_init',
  'tengu_started',
  'tengu_tool_use_error',
  'tengu_tool_use_success',
  'tengu_uncaught_exception',
  'tengu_unhandled_rejection',
  // ... approximately 38 events total
])

// ─── ausente: líneas 65-294 (230 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 295-298 ───
const getUserBucket = memoize((): number => {
  const userId = getOrCreateUserID()
  const hash = createHash('sha256').update(userId).digest('hex')
  return parseInt(hash.slice(0, 8), 16) % NUM_USER_BUCKETS
})
