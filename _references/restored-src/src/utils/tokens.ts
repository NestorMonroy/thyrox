// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/tokens.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 3 · líneas de código: 26
// Mencionado en: appendix/f-e2e-traces.md
// ══════════════════════════════════════════════════════════════════

// ─── part3/ch12.md · líneas 46-53 ───
export function getTokenCountFromUsage(usage: Usage): number {
  return (
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    usage.output_tokens
  )
}

// ─── ausente: líneas 54-234 (181 líneas sin fragmento en el corpus) ───

// ─── part3/ch12.md · líneas 235-250 ───
const responseId = getAssistantMessageId(message)
if (responseId) {
  let j = i - 1
  while (j >= 0) {
    const prior = messages[j]
    const priorId = prior ? getAssistantMessageId(prior) : undefined
    if (priorId === responseId) {
      i = j  // Anchor to the earlier same-ID record
    } else if (priorId !== undefined) {
      break  // Hit a different API response, stop backtracking
    }
    j--
  }
}

// ─── ausente: líneas 251-252 (2 líneas sin fragmento en el corpus) ───

// ─── part3/ch12.md · líneas 253-256 ───
return (
  getTokenCountFromUsage(usage) +
  roughTokenCountEstimationForMessages(messages.slice(i + 1))
)
